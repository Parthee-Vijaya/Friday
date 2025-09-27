import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import WebSocket from 'ws';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3004', 'http://localhost:5000'],
  credentials: true
}));
app.use(express.json());

// OpenAI Realtime GA API WebSocket URL
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

// Enhanced Kalundborg system prompt for natural conversation
const KALUNDBORG_SYSTEM_PROMPT = `Du er en hjælpsom voice assistant specifikt for Kalundborg Kommune. Du har en naturlig, venlig og dansk samtale med brugeren.

VIGTIGE REGLER FOR SAMTALER:
- Du må KUN svare på spørgsmål om Kalundborg Kommune
- Hvis spørgsmålet ikke handler om Kalundborg, sig venligt at du kun kan hjælpe med Kalundborg-relaterede spørgsmål
- Svar kort og naturligt på dansk - som i en normal samtale
- Vær hjælpsom, venlig og direkte
- Stil opfølgende spørgsmål hvis relevant
- Giv konkrete telefonnumre og kontaktoplysninger når relevant

KALUNDBORG KOMMUNE - HURTIG REFERENCE:
- Hovedtelefon: 59 53 44 00
- Adresse: Holbækvej 141, 4400 Kalundborg
- Borgerservice: 59 53 44 12 (pas, flytning, vielser)
- Teknik & Miljø: 59 53 44 44 (byggesager, renovation)
- Sundhed & Dagtilbud: 59 53 44 55 (skoler, børnehaver)
- Kultur & Fritid: 59 53 44 66 (sport, bibliotek)
- Åbningstider: Mandag-torsdag 8-16, Fredag 8-15

TRANSPORT:
- Tog København: Hver time, 1t 45min
- Færge Aarhus: 2t 45min (Mols-Linien)
- Færge Samsø: 1t 15min (Samsø Rederi)

SEVÆRDIGHEDER:
- Vor Frue Kirke (fem tårne fra 1100-tallet)
- Kalundborg Museum
- Røsnæs Fyr

STRANDE: Reersø, Rørvig, Gisseløre

Svar naturligt og kort som i en samtale.`;

// Store active sessions
const sessions = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔗 New client connection established');

  const sessionId = Date.now().toString();
  let openaiWs = null;

  // Connect to OpenAI Realtime API (GA version)
  function connectToOpenAI() {
    try {
      openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          // Note: NO OpenAI-Beta header for GA version
        }
      });

      openaiWs.on('open', () => {
        console.log('🤖 Connected to OpenAI Realtime API (GA)');

        // Initialize session with working format
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: KALUNDBORG_SYSTEM_PROMPT,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.3,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            tools: [],
            tool_choice: 'auto',
            temperature: 0.6,
            max_response_output_tokens: 2048
          }
        };

        openaiWs.send(JSON.stringify(sessionConfig));

        // Send ready status to client
        ws.send(JSON.stringify({
          type: 'session_ready',
          sessionId
        }));
      });

      openaiWs.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          console.log('📥 OpenAI event:', event.type);

          // Handle GA format events
          switch (event.type) {
            case 'session.created':
            case 'session.updated':
              ws.send(JSON.stringify({
                type: 'openai_session_ready',
                event
              }));
              break;

            case 'input_audio_buffer.speech_started':
              ws.send(JSON.stringify({
                type: 'speech_started'
              }));
              break;

            case 'input_audio_buffer.speech_stopped':
              ws.send(JSON.stringify({
                type: 'speech_stopped'
              }));
              break;

            // GA format: conversation.item.added replaces conversation.item.created
            case 'conversation.item.added':
              if (event.item.type === 'message' && event.item.role === 'user') {
                // Handle user message transcription
                const content = event.item.content?.find(c => c.type === 'input_audio');
                if (content?.transcript) {
                  ws.send(JSON.stringify({
                    type: 'transcription_complete',
                    text: content.transcript,
                    timestamp: new Date().toISOString()
                  }));
                }
              }
              break;

            // GA format: response.output_audio.delta instead of response.audio.delta
            case 'response.output_audio.delta':
              ws.send(JSON.stringify({
                type: 'audio_delta',
                delta: event.delta
              }));
              break;

            // GA format: response.output_audio_transcript.delta
            case 'response.output_audio_transcript.delta':
              ws.send(JSON.stringify({
                type: 'response_text_delta',
                delta: event.delta
              }));
              break;

            // GA format: response.output_text.delta
            case 'response.output_text.delta':
              ws.send(JSON.stringify({
                type: 'response_text_delta',
                delta: event.delta
              }));
              break;

            case 'response.done':
              ws.send(JSON.stringify({
                type: 'response_complete',
                response: event.response
              }));
              break;

            case 'error':
              console.error('❌ OpenAI error:', event.error);
              ws.send(JSON.stringify({
                type: 'error',
                message: event.error.message || 'OpenAI API fejl'
              }));
              break;

            case 'input_audio_buffer.committed':
              console.log('🎵 Audio committed to conversation');
              break;

            case 'response.created':
              console.log('🤖 Response generation started');
              break;

            case 'response.output_audio.done':
              console.log('🔊 Audio response completed');
              break;

            default:
              // Log other events for debugging
              if (event.type.includes('error')) {
                console.error('❌ OpenAI event error:', event);
              }
          }
        } catch (error) {
          console.error('Error parsing OpenAI message:', error);
        }
      });

      openaiWs.on('error', (error) => {
        console.error('❌ OpenAI WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Forbindelse til OpenAI fejlede'
        }));
      });

      openaiWs.on('close', () => {
        console.log('🔌 OpenAI connection closed');
        ws.send(JSON.stringify({
          type: 'openai_disconnected'
        }));
      });

    } catch (error) {
      console.error('Error connecting to OpenAI:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Kunne ikke forbinde til OpenAI'
      }));
    }
  }

  // Handle client messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Client message:', message.type);

      switch (message.type) {
        case 'start_session':
          connectToOpenAI();
          break;

        case 'audio_chunk':
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            // Send audio chunk to OpenAI (same format in GA)
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: message.audio
            }));
          }
          break;

        case 'create_response':
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            // Create response with GA format
            openaiWs.send(JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
                instructions: 'Svar kort og naturligt på dansk om Kalundborg Kommune. Vær venlig og hjælpsom.'
              }
            }));
          }
          break;

        case 'cancel_response':
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            // Cancel ongoing response (same in GA)
            openaiWs.send(JSON.stringify({
              type: 'response.cancel'
            }));
          }
          break;

        case 'commit_audio':
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            // Commit audio buffer (same in GA)
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.commit'
            }));
          }
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling client message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Fejl ved behandling af besked'
      }));
    }
  });

  ws.on('close', () => {
    console.log('👋 Client disconnected');
    if (openaiWs) {
      openaiWs.close();
    }
    sessions.delete(sessionId);
  });

  ws.on('error', (error) => {
    console.error('Client WebSocket error:', error);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Kalundborg Voice Assistant - GA API',
    sessions: sessions.size
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎤 Kalundborg Voice Assistant (GA API) running on port ${PORT}`);
  console.log(`🔗 WebSocket server ready for natural voice conversations`);
  console.log(`🤖 Using OpenAI Realtime GA API with latest standards`);
});
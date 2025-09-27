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
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));
app.use(express.json());

// OpenAI Realtime Voice API WebSocket URL
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

// Kalundborg system prompt
const KALUNDBORG_SYSTEM_PROMPT = `Du er en hjælpsom voice assistant specifikt for Kalundborg Kommune.

VIGTIGE REGLER:
- Du må KUN svare på spørgsmål om Kalundborg Kommune
- Hvis spørgsmålet ikke handler om Kalundborg, sig venligt at du kun kan hjælpe med Kalundborg-relaterede spørgsmål
- Svar altid på dansk i naturlig talesprog
- Vær hjælpsom, venlig og præcis
- Giv konkrete telefonnumre og kontaktoplysninger når relevant

KALUNDBORG KOMMUNE INFORMATION:
- Hovedtelefon: 59 53 44 00
- Adresse: Holbækvej 141, 4400 Kalundborg
- Email: kalundborg@kalundborg.dk
- Website: kalundborg.dk
- Borgerservice: 59 53 44 12 (pas, ID, flytning, vielser)
- Teknik & Miljø: 59 53 44 44 (byggesager, veje, renovation)
- Sundhed & Dagtilbud: 59 53 44 55 (skoler, dagtilbud)
- Kultur & Fritid: 59 53 44 66 (idræt, biblioteker)
- Åbningstider: Mandag-torsdag 8:00-16:00, Fredag 8:00-15:00

TRANSPORT:
- Tog til København: Hver time, 1 time 45 min
- Færge til Aarhus: 2 timer 45 min
- Færge til Samsø: 1 time 15 min

SEVÆRDIGHEDER:
- Vor Frue Kirke med fem tårne
- Kalundborg Museum
- Røsnæs Fyr

STRANDE:
- Reersø Strand, Rørvig Strand, Gisseløre Strand

Svar konkret og præcist på dansk.`;

// Store active sessions
const sessions = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔗 New client connection established');

  const sessionId = Date.now().toString();
  let openaiWs = null;

  // Connect to OpenAI Realtime API
  function connectToOpenAI() {
    try {
      openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      openaiWs.on('open', () => {
        console.log('🤖 Connected to OpenAI Realtime API');

        // Initialize session with Kalundborg context
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
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            },
            tools: [],
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 4096
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

          // Forward relevant events to client
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

            case 'conversation.item.input_audio_transcription.completed':
              ws.send(JSON.stringify({
                type: 'transcription_complete',
                text: event.transcript,
                timestamp: new Date().toISOString()
              }));
              break;

            case 'response.audio.delta':
              ws.send(JSON.stringify({
                type: 'audio_delta',
                delta: event.delta
              }));
              break;

            case 'response.audio_transcript.delta':
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

            default:
              // Forward other events for debugging
              ws.send(JSON.stringify({
                type: 'openai_event',
                event
              }));
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
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: message.audio
            }));
          }
          break;

        case 'create_response':
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
                instructions: 'Svar på dansk om Kalundborg Kommune.'
              }
            }));
          }
          break;

        case 'cancel_response':
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(JSON.stringify({
              type: 'response.cancel'
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
    service: 'Kalundborg Voice Assistant - OpenAI Realtime',
    sessions: sessions.size
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎤 Kalundborg Voice Assistant (OpenAI Realtime) running on port ${PORT}`);
  console.log(`🔗 WebSocket server ready for real-time voice connections`);
  console.log(`🤖 Using OpenAI Realtime API with Whisper + GPT-4o`);
});
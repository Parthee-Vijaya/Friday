import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import WebSocket from 'ws';
import https from 'https';

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

// OpenAI Realtime Voice API WebSocket URL
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

// Enhanced Kalundborg system prompt for natural conversation
const KALUNDBORG_SYSTEM_PROMPT = `Du er en voicebot der lytter og svarer på spørgsmål om Kalundborg Kommune og de services kommunen tilbyder. Du skal tale naturligt, venligt og altid i høflig tone. Hvis der er noget du ikke ved, må du søge efter viden på borger.dk eller kalundborg.dk.

VIGTIGE REGLER FOR SAMTALER:
- Lyt altid opmærksomt til brugerens spørgsmål
- Svar direkte på det brugeren spørger om
- Tal naturligt og i samtale-tone på dansk
- Vær hjælpsom, venlig og høflig
- Du må kun hjælpe med Kalundborg Kommune-relaterede spørgsmål
- Hvis du ikke ved svaret, søg efter viden eller henvis til rette kontakt
- Giv konkrete telefonnumre og kontaktoplysninger når relevant
- Start ikke med facts - svar på det brugeren spørger om

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

HYPPIGE SPØRGSMÅL OG SVAR:

1. Åbningstider:
   - Borgerservice: Man-tors 8-16, fre 8-15
   - Bibliotek: Man-tors 10-19, fre 10-16, lør 10-14
   - Genbrugsstation: Man-fre 13-18, lør-søn 9-16

2. Kontakt:
   - Generel henvendelse: 59 53 44 00
   - Akut: Ring 112 (brand, politi, ambulance)
   - Borgerservice.dk for digital selvbetjening

3. Børn og unge:
   - Dagplejeplads ansøgning via borger.dk
   - Skoleindskoling sker automatisk
   - SFO tilmelding gennem skolen
   - Ungdomsuddannelser: Handelsskolen, STX på Kalundborg Gymnasium

4. Trafik og parkering:
   - Gratis parkering i centrum (2 timer)
   - P-skiver påkrævet
   - Busparkering ved rutebilstationen

5. Affald og genbrug:
   - Haveaffald: Bringes til genbrugsstationen
   - Storskrald: Bestil afhentning på 59 53 44 44
   - Farligt affald: Hver første lørdag i måneden

6. Byggeri:
   - Byggetilladelse: Søg via byggesag.dk
   - Mindre byggerier: Se reglerne på kommunens hjemmeside
   - Kontakt Teknik & Miljø på 59 53 44 44

7. Svømning og sport:
   - Kalundborg Svømmehal: Korsgade
   - Fodboldbaner: Kalundborg Stadion
   - Tennis: Kalundborg Tennisklub

8. Kultur:
   - Kalundborg Museum: Åbningstider på hjemmesiden
   - Koncerter: Kalundborg Teater og Musikhus
   - Bibliotek har også kulturarrangementer

9. Transport til København:
   - Tog hver time fra Kalundborg Station
   - Rejsetid: 1 time 45 minutter
   - Billetter via DSB app eller i automater

10. Sundhed:
    - Lægevagt: Ring 1813 efter lukketid
    - Apotek: Flere i centrum, åbent til 17:30 hverdage
    - Sygehus: Holbæk Sygehus, 25 km væk

Svar naturligt og kort som i en samtale. Hvis brugeren spørger om noget specifikt, giv den relevante information ovenfor.

VIGTIG: Hvis du ikke har svar på et spørgsmål om Kalundborg Kommune, brug search_kalundborg funktionen til at finde opdateret information online.`;

// Simple search function for Kalundborg-related queries
async function searchKalundborg(query) {
  try {
    console.log(`🔍 Searching for: ${query}`);

    // Use DuckDuckGo instant answers API (no API key required)
    const searchQuery = `${query} site:kalundborg.dk OR Kalundborg Kommune`;
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;

    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            let searchResult = 'Ingen relevante resultater fundet.';

            if (result.Abstract) {
              searchResult = result.Abstract;
            } else if (result.RelatedTopics && result.RelatedTopics.length > 0) {
              searchResult = result.RelatedTopics[0].Text || searchResult;
            }

            console.log(`📋 Search result: ${searchResult.substring(0, 100)}...`);
            resolve(searchResult);
          } catch (error) {
            console.error('Error parsing search results:', error);
            resolve('Kunne ikke hente søgeresultater.');
          }
        });
      }).on('error', (error) => {
        console.error('Search request error:', error);
        reject('Kunne ikke udføre søgning.');
      });
    });
  } catch (error) {
    console.error('Search error:', error);
    return 'Kunne ikke udføre søgning.';
  }
}

// Store active sessions
const sessions = new Map();

// Audio buffer management
class AudioBufferQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.bufferTime = 100; // 100ms buffer
  }

  add(chunk) {
    this.queue.push({
      data: chunk,
      timestamp: Date.now()
    });
  }

  async process(callback) {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    // Process chunks with timing
    while (this.queue.length > 0) {
      const chunk = this.queue.shift();
      const delay = chunk.timestamp + this.bufferTime - Date.now();

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      await callback(chunk.data);
    }

    this.isProcessing = false;
  }

  clear() {
    this.queue = [];
    this.isProcessing = false;
  }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔗 New client connection established');

  const sessionId = Date.now().toString();
  let openaiWs = null;
  let reconnectAttempts = 0;
  let reconnectTimeout = null;
  const audioQueue = new AudioBufferQueue();
  const responseTimeout = 10000; // 10 seconds timeout
  let responseTimer = null;
  let audioChunksReceived = 0; // Track audio chunks for buffer validation

  sessions.set(sessionId, {
    sessionId,
    connectedAt: new Date().toISOString()
  });

  const formatMeta = (meta) => {
    if (!meta) return undefined;
    if (meta instanceof Error) {
      return meta.stack || meta.message;
    }
    if (typeof meta === 'string') return meta;
    try {
      return JSON.stringify(meta, null, 2);
    } catch (error) {
      return String(meta);
    }
  };

  const emitLog = (level, message, meta) => {
    if (ws.readyState !== WebSocket.OPEN) return;

    const logPayload = {
      type: 'log',
      level,
      message,
      timestamp: new Date().toISOString()
    };

    const formattedMeta = formatMeta(meta);
    if (formattedMeta) {
      logPayload.meta = formattedMeta;
    }

    ws.send(JSON.stringify(logPayload));
  };

  emitLog('info', 'Klientforbindelse etableret');

  // Connect to OpenAI Realtime API with auto-reconnect
  function connectToOpenAI(isReconnect = false) {
    if (isReconnect && reconnectAttempts > 5) {
      console.error('❌ Max reconnection attempts reached');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Kunne ikke genoprette forbindelse til OpenAI'
      }));
      return;
    }
    try {
      emitLog('info', `Opretter forbindelse til OpenAI Realtime (forsøg ${reconnectAttempts + 1})`);

      openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      openaiWs.on('open', () => {
        console.log('🤖 Connected to OpenAI Realtime API');
        reconnectAttempts = 0; // Reset on successful connection

        emitLog('success', 'Forbundet til OpenAI Realtime API');

        if (isReconnect) {
          ws.send(JSON.stringify({
            type: 'reconnected',
            message: 'Forbindelse genoprettet'
          }));
          emitLog('success', 'Realtidssession genoprettet');
        }

        // Initialize session with enhanced settings for conversation
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: KALUNDBORG_SYSTEM_PROMPT,
            voice: 'shimmer',  // Good for Danish - clear female voice
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: null,  // Disable automatic VAD - use manual control
            tools: [
              {
                type: 'function',
                name: 'search_kalundborg',
                description: 'Søg efter opdateret information om Kalundborg Kommune online. Brug denne funktion når du ikke har svar på spørgsmål.',
                parameters: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'Søgeord eller spørgsmål om Kalundborg Kommune'
                    }
                  },
                  required: ['query']
                }
              }
            ],
            tool_choice: 'auto',
            temperature: 0.6,  // Slightly lower for more consistent responses
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

      openaiWs.on('message', async (data) => {
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
              emitLog('info', 'OpenAI session opdateret');
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
              // Queue audio for smooth playback
              audioQueue.add(event.delta);
              audioQueue.process(async (delta) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'audio_delta',
                    delta: delta
                  }));
                }
              });
              break;

            case 'response.audio_transcript.delta':
              ws.send(JSON.stringify({
                type: 'response_text_delta',
                delta: event.delta
              }));
              break;

            case 'response.function_call_arguments.delta':
              // Handle function call arguments streaming
              console.log('🔧 Function call arguments delta:', event.delta);
              emitLog('debug', 'Modtog streaming funktion argumenter', event.delta);
              break;

            case 'response.function_call_arguments.done':
              // Handle completed function call
              console.log('🔧 Function call completed:', event.name, event.arguments);
              emitLog('info', `Funktion kald færdig: ${event.name}`);

              if (event.name === 'search_kalundborg') {
                try {
                  const args = JSON.parse(event.arguments);
                  console.log(`🔍 Executing search for: ${args.query}`);
                  emitLog('info', 'Udfører Kalundborg søgning', args.query);

                  // Execute search
                  const searchResult = await searchKalundborg(args.query);

                  // Send function result back to OpenAI
                  const functionResult = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: event.call_id,
                      output: JSON.stringify({
                        result: searchResult,
                        source: 'Kalundborg Kommune søgning'
                      })
                    }
                  };

                  openaiWs.send(JSON.stringify(functionResult));
                  emitLog('success', 'Søgeresultat returneret til OpenAI');

                  // Create response after function call
                  openaiWs.send(JSON.stringify({
                    type: 'response.create'
                  }));
                  emitLog('debug', 'Anmodede OpenAI om svar efter søgning');

                } catch (error) {
                  console.error('Error executing search:', error);
                  emitLog('error', 'Fejl under søgning', error);

                  // Send error result
                  const errorResult = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: event.call_id,
                      output: JSON.stringify({
                        error: 'Kunne ikke udføre søgning'
                      })
                    }
                  };

                  openaiWs.send(JSON.stringify(errorResult));
                }
              }
              break;

            case 'response.done':
              // Clear response timer
              if (responseTimer) {
                clearTimeout(responseTimer);
                responseTimer = null;
              }

              ws.send(JSON.stringify({
                type: 'response_complete',
                response: event.response
              }));
              emitLog('success', 'Svar færdigt');

              // Clear audio queue
              audioQueue.clear();
              break;

            case 'error':
              console.error('❌ OpenAI error:', event.error);
              ws.send(JSON.stringify({
                type: 'error',
                message: event.error.message || 'OpenAI API fejl'
              }));
              emitLog('error', 'OpenAI fejl', event.error);
              break;

            case 'input_audio_buffer.committed':
              // Audio committed, ready for response
              console.log('🎵 Audio committed to conversation');
              break;

            case 'response.created':
              console.log('🤖 Response generation started');
              ws.send(JSON.stringify({
                type: 'response_created'
              }));
              emitLog('debug', 'OpenAI er ved at generere svar');
              break;

            case 'response.audio.done':
              console.log('🔊 Audio response completed');
              emitLog('debug', 'Audio stream afsluttet');
              break;

            default:
              // Log other events for debugging
              if (event.type.includes('error')) {
                console.error('❌ OpenAI event error:', event);
              }
          }
        } catch (error) {
          console.error('Error parsing OpenAI message:', error);
          emitLog('error', 'Kunne ikke parse OpenAI besked', error);
        }
      });

      openaiWs.on('error', (error) => {
        console.error('❌ OpenAI WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Forbindelse til OpenAI fejlede'
        }));
        emitLog('error', 'OpenAI WebSocket fejl', error);
      });

      openaiWs.on('close', () => {
        console.log('🔌 OpenAI connection closed');
        emitLog('warning', 'OpenAI forbindelse lukket, forsøger at genoprette');

        // Attempt reconnection with exponential backoff
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

        console.log(`🔄 Attempting reconnect in ${delay}ms (attempt ${reconnectAttempts})`);

        ws.send(JSON.stringify({
          type: 'openai_disconnected',
          reconnecting: true,
          attempt: reconnectAttempts
        }));

        reconnectTimeout = setTimeout(() => {
          connectToOpenAI(true);
        }, delay);
      });

    } catch (error) {
      console.error('Error connecting to OpenAI:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Kunne ikke forbinde til OpenAI'
      }));
      emitLog('error', 'Kunne ikke forbinde til OpenAI', error);
    }
  }

  // Handle client messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Client message:', message.type);
      emitLog('debug', `Modtog klientbesked: ${message.type}`);

      switch (message.type) {
        case 'start_session':
          connectToOpenAI();
          emitLog('info', 'Starter realtime session');
          break;

        case 'audio_chunk':
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            // Send audio chunk to OpenAI
            console.log('📤 Received audio chunk from client, size:', message.audio?.length || 0);
            audioChunksReceived++; // Track audio chunks received for this session
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: message.audio
            }));
            emitLog('debug', 'Sendte audio chunk til OpenAI');
          } else {
            console.warn('⚠️ Cannot send audio chunk, OpenAI WebSocket not ready');
            emitLog('warning', 'Audio chunk blev ignoreret - OpenAI websocket ikke klar');
          }
          break;

        case 'create_response':
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            // Set response timeout
            if (responseTimer) {
              clearTimeout(responseTimer);
            }

            responseTimer = setTimeout(() => {
              console.error('⏱️ Response timeout');
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Response timeout - prøv igen'
              }));
              emitLog('error', 'Svar timeout - annullerer');

              // Cancel the response
              if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
                openaiWs.send(JSON.stringify({ type: 'response.cancel' }));
                emitLog('warning', 'Anmodede OpenAI om at annullere svar');
              }
            }, responseTimeout);

            // Commit the audio buffer before creating a response
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.commit'
            }));
            emitLog('debug', 'Audio buffer committed');

            // Create response with conversation context
            openaiWs.send(JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
                instructions: 'Svar kort og naturligt på dansk om Kalundborg Kommune. Vær venlig og hjælpsom.'
              }
            }));
            emitLog('info', 'Anmodede om svar fra OpenAI');
          }
          break;

        case 'cancel_response':
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            // Clear response timer
            if (responseTimer) {
              clearTimeout(responseTimer);
              responseTimer = null;
            }

            // Clear audio queue
            audioQueue.clear();
            emitLog('debug', 'Audio kø ryddet af klient');

            // Cancel ongoing response when user interrupts
            openaiWs.send(JSON.stringify({
              type: 'response.cancel'
            }));
            emitLog('info', 'Klienten annullerede svaret');
          }
          break;

        case 'commit_audio':
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            // Only commit if we have received audio chunks
            if (audioChunksReceived > 0) {
              openaiWs.send(JSON.stringify({
                type: 'input_audio_buffer.commit'
              }));
              emitLog('debug', `Audio buffer committed (${audioChunksReceived} chunks)`);
              audioChunksReceived = 0; // Reset counter for next recording
            } else {
              console.warn('⚠️ Ignoring commit request - no audio chunks received');
              emitLog('warning', 'Commit ignoreret - ingen audio chunks modtaget');
              // Send error to client instead of empty commit
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Ingen audio data modtaget - prøv igen'
              }));
            }
          }
          break;

        default:
          console.log('Unknown message type:', message.type);
          emitLog('warning', `Ukendt beskedtype: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling client message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Fejl ved behandling af besked'
      }));
      emitLog('error', 'Fejl under håndtering af klientbesked', error);
    }
  });

  ws.on('close', () => {
    console.log('👋 Client disconnected');
    emitLog('info', 'Klientforbindelse afsluttet');

    // Clean up timers
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (responseTimer) {
      clearTimeout(responseTimer);
    }

    // Clear audio queue
    audioQueue.clear();

    if (openaiWs) {
      openaiWs.close();
    }
    sessions.delete(sessionId);
  });

  ws.on('error', (error) => {
    console.error('Client WebSocket error:', error);
    emitLog('error', 'Klient WebSocket fejl', error);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Kalundborg Voice Assistant - Enhanced Conversation',
    sessions: sessions.size
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎤 Kalundborg Voice Assistant (Enhanced Conversation) running on port ${PORT}`);
  console.log(`🔗 WebSocket server ready for natural voice conversations`);
  console.log(`🤖 Using OpenAI Realtime API with improved Voice Activity Detection`);
});

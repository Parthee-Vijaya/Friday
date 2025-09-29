import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import WebSocket from 'ws';
import https from 'https';
import { kalundborgData, findAnswer } from './kalundborg-data.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3004', 'http://localhost:3200', 'http://localhost:5000'],
  credentials: true
}));
app.use(express.json());

// OpenAI Realtime Voice API WebSocket URL
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

// Enhanced Kalundborg system prompt with comprehensive data
const KALUNDBORG_SYSTEM_PROMPT = `Du er en venlig og hjælpsom stemmeassistent for Kalundborg Kommune. Du taler dansk og svarer kort og koncist på spørgsmål om kommunens services.

KRITISKE REGLER FOR STEMME:
- ALDRIG afbryd din tale eller cut audio af
- Tal hele sætninger til ende
- Hold pauser naturlige og korte
- Afslut altid dit svar komplet

SAMTALE REGLER:
- LYT AKTIVT til præcis hvad brugeren spørger om
- Svar DIREKTE på det specifikke spørgsmål - ikke tilfældige facts
- Hvis spørgsmålet er "hvad kan du hjælpe mig med", sig hvilke tjenester du kan hjælpe med
- Hvis spørgsmålet er om åbningstider, giv kun åbningstider
- Hvis spørgsmålet er om telefonnumre, giv relevante numre
- Vær venlig, hjælpsom og høflig
- Tal naturligt på dansk som i en normal samtale
- Hold svar under 2-3 sætninger når muligt

KALUNDBORG KOMMUNE - KOMPLET INFORMATION:

📞 KONTAKT:
- Hovedtelefon: 59 53 44 00
- Email: borgerservice@kalundborg.dk
- Adresse: Holbækvej 141B, 4400 Kalundborg
- Telefonvejledning: Man-ons 08:30-15:00, tors 08:30-17:00, fre 08:30-13:00

🏛️ BORGERSERVICE (Klostertorvet 2):
- Åbningstider: Mandag-fredag 08:30-14:30
- Services: Pas, ID-kort, flytning, vielser, begravelser
- VIGTIGT: Du skal bestille tid gennem kommunens hjemmeside

🗑️ AFFALD OG GENBRUG:
- Operatør: ARGO
- Kalundborg Genbrugsplads: Genvejen 5, tlf. 46 34 75 00
- Åben 24/7 (lukket 24.-26. dec, 31. dec, 1. jan)
- Gratis genbrugsområde åbnet juni 2024

🏥 SUNDHED:
- Nærklinik Kalundborg: Vestre Havneplads 10, tlf. 59 48 15 70
- Åben: Mandag-fredag 8:00-16:00
- Akutte henvendelser: Ring 8:00-9:00
- Tandlæger: ORIS (59 51 03 90), Kalundborg Tandlægecenter

🏫 SKOLER OG UDDANNELSE:
- 16 folkeskoler og 2 specialskoler
- 17 vuggestuer og 33 børnehaver
- Højere uddannelser: Professionshøjskolen Absalon, Teknika, Processkolen
- Programmer: Bioanalytiker, diplomingeniør i bioteknologi

🏗️ BYGGESAGER:
- Alle ansøgninger skal indsendes digitalt gennem "Byg og Miljø" portalen
- Telefonvejledning fra byggesagsbehandlere tilgængelig
- Ingen byggeri uden tilladelse (risiko for bøder og nedrivning)

🚌 TRANSPORT:
- Nordvestbanen: Terminal på Kalundborg Station
- Buslinjer: 430R, 520, 543, 551, 552, 553, 554, 577, 545, RE, RØD, 576
- Cykelstier: Netværksplan fra 2017, planlagt 4km rute Ubby-Ugerløse

🎭 KULTUR:
- 439 arrangementer månedligt (25 koncerter, 24 forestillinger, 36 foredrag)
- Biblioteker: Hovedbibliotek Klostertorvet 2, filialer i Høng, Gørlev, Ubby
- Børneaktiviteter: Bogklubber, 7 teaterforestillinger årligt, gratis film
- Nyt kulturhus ved havnen planlagt til 2026

💼 ERHVERV:
- Kalundborgegnens Erhvervsråd (kalundborgerhverv.dk)
- Erhvervshus Sjælland for vækstplaner
- Industrielle styrkepositioner: Biotek, farmaceutisk, verdens største insulinfabrik
- Over 1.200 nye job skabt sidste år

📊 STATISTIK:
- Indbyggere: 48.103
- Areal: 604 km²
- CVR: 29189374

🆘 NØDNUMRE:
- Alarmcentralen: 112
- Lægevagt: 1813
- Politiet (ikke-akut): 114`;

// Server configuration
const PORT = process.env.PORT || 3100;

// Track OpenAI WebSocket connections per client
const openaiConnections = new Map();

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔗 New client connected');
  let openaiWS = null;
  let audioChunksReceived = 0; // Track audio chunks for buffer validation

  // Create OpenAI WebSocket connection
  const connectToOpenAI = () => {
    try {
      console.log('🤖 Connecting to OpenAI Realtime API...');

      const headers = {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      };

      openaiWS = new WebSocket(OPENAI_REALTIME_URL, { headers });
      openaiConnections.set(ws, openaiWS);

      openaiWS.on('open', () => {
        console.log('✅ Connected to OpenAI Realtime API');
        ws.send(JSON.stringify({
          type: 'log',
          level: 'success',
          message: 'OpenAI forbindelse etableret'
        }));
      });

      openaiWS.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case 'session.created':
              console.log('🎯 OpenAI session created');

              // Configure session with enhanced Kalundborg prompt
              const sessionUpdate = {
                type: 'session.update',
                session: {
                  modalities: ['text', 'audio'],
                  instructions: KALUNDBORG_SYSTEM_PROMPT,
                  voice: 'shimmer',
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

              openaiWS.send(JSON.stringify(sessionUpdate));

              ws.send(JSON.stringify({
                type: 'session_ready',
                message: 'Kalundborg Voice Assistant er klar'
              }));
              break;

            case 'session.updated':
              console.log('🔧 Session konfigureret til Kalundborg Kommune');
              ws.send(JSON.stringify({
                type: 'openai_session_ready',
                message: 'OpenAI session opdateret med Kalundborg data'
              }));
              break;

            case 'input_audio_buffer.speech_started':
              console.log('🎤 Tale startet');
              ws.send(JSON.stringify({
                type: 'speech_started',
                message: 'Begynder at lytte...'
              }));
              break;

            case 'input_audio_buffer.speech_stopped':
              console.log('🔇 Tale stoppet');
              ws.send(JSON.stringify({
                type: 'speech_stopped',
                message: 'Tale stoppet, behandler...'
              }));
              break;

            case 'conversation.item.input_audio_transcription.completed':
              console.log('📝 Transskription:', message.transcript);
              ws.send(JSON.stringify({
                type: 'transcription_complete',
                text: message.transcript,
                timestamp: new Date().toISOString()
              }));
              break;

            case 'response.created':
              console.log('🧠 OpenAI genererer svar...');
              ws.send(JSON.stringify({
                type: 'response_created',
                message: 'Genererer svar...'
              }));
              break;

            case 'response.audio.delta':
              if (message.delta) {
                ws.send(JSON.stringify({
                  type: 'audio_delta',
                  delta: message.delta
                }));
              }
              break;

            case 'response.text.delta':
              if (message.delta) {
                ws.send(JSON.stringify({
                  type: 'response_text_delta',
                  delta: message.delta
                }));
              }
              break;

            case 'response.done':
              console.log('✅ OpenAI svar færdigt');
              ws.send(JSON.stringify({
                type: 'response_complete',
                message: 'Svar færdigt'
              }));
              break;

            case 'error':
              console.error('❌ OpenAI fejl:', message.error);
              ws.send(JSON.stringify({
                type: 'error',
                message: `OpenAI fejl: ${message.error.message || 'Ukendt fejl'}`
              }));
              break;

            default:
              // Log ukendte beskeder for debugging
              if (message.type) {
                console.log(`🔍 OpenAI besked: ${message.type}`);
              }
          }
        } catch (error) {
          console.error('❌ Fejl ved parsing af OpenAI besked:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Kunne ikke parse OpenAI svar'
          }));
        }
      });

      openaiWS.on('close', (code, reason) => {
        console.log(`🔌 OpenAI forbindelse lukket: ${code} ${reason}`);
        ws.send(JSON.stringify({
          type: 'openai_disconnected',
          message: 'OpenAI forbindelse afbrudt'
        }));
        openaiConnections.delete(ws);
      });

      openaiWS.on('error', (error) => {
        console.error('❌ OpenAI WebSocket fejl:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: `Forbindelsesejl: ${error.message}`
        }));
      });

    } catch (error) {
      console.error('❌ Kunne ikke oprette OpenAI forbindelse:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Kunne ikke forbinde til OpenAI'
      }));
    }
  };

  // Handle client messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'start_session':
          console.log('🚀 Starting Kalundborg voice session...');
          connectToOpenAI();
          break;

        case 'audio_chunk':
          audioChunksReceived++; // Track audio chunks received for this session
          if (openaiWS && openaiWS.readyState === WebSocket.OPEN) {
            openaiWS.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: message.audio
            }));
          }
          break;

        case 'commit_audio':
          if (audioChunksReceived > 2) { // Require at least 3 chunks for reasonable audio
            // Only commit if we have received sufficient audio chunks
            if (openaiWS && openaiWS.readyState === WebSocket.OPEN) {
              try {
                openaiWS.send(JSON.stringify({
                  type: 'input_audio_buffer.commit'
                }));
                console.log(`✅ Audio committed (${audioChunksReceived} chunks received)`);
              } catch (commitError) {
                console.error('❌ Audio commit fejl:', commitError);
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Kunne ikke sende audio - prøv igen'
                }));
              }
            }
          } else {
            console.warn(`⚠️ Ignoring commit request - insufficient audio chunks (${audioChunksReceived})`);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'For lidt audio data - tal lidt længere og højere'
            }));
          }
          break;

        case 'interrupt_response':
          console.log('🛑 Bruger afbryder - stopper AI respons');
          if (openaiWS && openaiWS.readyState === WebSocket.OPEN) {
            try {
              openaiWS.send(JSON.stringify({
                type: 'response.cancel'
              }));
            } catch (cancelError) {
              console.log('⚠️ Response cancel ikke mulig:', cancelError.message);
            }
          }
          ws.send(JSON.stringify({
            type: 'response_interrupted',
            message: 'AI-svar afbrudt'
          }));
          break;

        case 'create_response':
          if (openaiWS && openaiWS.readyState === WebSocket.OPEN) {
            openaiWS.send(JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
                instructions: 'Svar kort og hjælpsomt på dansk om Kalundborg Kommune services. Brug den information du har fået om kommunen.'
              }
            }));
          }
          break;

        default:
          console.log(`🔍 Ukendt klient besked: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Fejl ved parsing af klient besked:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Ugyldig besked format'
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('👋 Klient afbrudt');
    if (openaiWS) {
      openaiWS.close();
      openaiConnections.delete(ws);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Klient WebSocket fejl:', error);
    if (openaiWS) {
      openaiWS.close();
      openaiConnections.delete(ws);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Kalundborg Voice Assistant',
    timestamp: new Date().toISOString(),
    connections: openaiConnections.size
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🎙️ Kalundborg Voice Assistant server kører på port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🏛️ Klar til at hjælpe borgere i Kalundborg Kommune`);
});
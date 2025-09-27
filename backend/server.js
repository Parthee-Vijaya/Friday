import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { createServer } from 'http';
import axios from 'axios';
import { kalundborgData, commonQuestions, fallbackResponses } from './kalundborg-data.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced Kalundborg-specific system prompt with comprehensive data
const KALUNDBORG_SYSTEM_PROMPT = `
Du er en hjælpsom voice assistant specifikt for Kalundborg Kommune.

VIGTIGE REGLER:
- Du må KUN svare på spørgsmål om Kalundborg Kommune
- Hvis spørgsmålet ikke handler om Kalundborg, sig venligt at du kun kan hjælpe med Kalundborg-relaterede spørgsmål
- Svar altid på dansk i naturlig talesprog
- Vær hjælpsom, venlig og præcis
- Giv konkrete telefonnumre og kontaktoplysninger når relevant
- Hvis du ikke har præcis information, sig det ærligt og henvis til kommunens telefon

KALUNDBORG KOMMUNE - DETALJERET INFORMATION:

KONTAKT & ÅBNINGSTIDER:
- Hovedtelefon: 59 53 44 00
- Adresse: Holbækvej 141, 4400 Kalundborg
- Email: kalundborg@kalundborg.dk
- Website: kalundborg.dk
- Åbningstider: Mandag-torsdag 8:00-16:00, Fredag 8:00-15:00
- Borgerservice: Mandag-fredag 9:00-15:00

AFDELINGER OG TELEFONNUMRE:
- Borgerservice (pas, ID, flytning, vielser): 59 53 44 12
- Teknik & Miljø (byggesager, veje, renovation): 59 53 44 44
- Sundhed & Dagtilbud (skoler, dagtilbud, ældreområdet): 59 53 44 55
- Kultur & Fritid (idræt, biblioteker, kulturskole): 59 53 44 66
- Erhvervsservice: 59 53 44 77

TRANSPORT:
- Tog til København: Hver time, 1 time 45 min
- Færge til Aarhus (Mols-Linien): 2 timer 45 min
- Færge til Samsø (Samsø Rederi): 1 time 15 min
- Lokale Movia busser

SEVÆRDIGHEDER:
- Vor Frue Kirke: Historisk kirke med fem tårne fra 1100-tallet
- Kalundborg Museum: Adelgade 23
- Røsnæs Fyr: Fyrtårn med smuk udsigt

STRANDE:
- Reersø Strand: Populær sandstrand med faciliteter
- Rørvig Strand: Familievenlig med lavt vand
- Gisseløre Strand: Naturstrand

SKOLER:
- Kalundborg Gymnasium
- Raklev Skole, Vestervangskolen, Gørlev Skole, Ubby Skole

SUNDHED:
- Nærmeste sygehus: Holbæk Sygehus
- Akut: 112, Lægevagt: 1813
- Apoteker: Kalundborg Apotek (Kordilgade 9), Svane Apotek (Holbækvej 185)

STATISTIK:
- Indbyggere: 48.103
- Areal: 604 km²
- Arbejdsløshed: 3.2%

STORE VIRKSOMHEDER:
- Novo Nordisk, Novozymes, Equinor, Ørsted
- Kalundborg Industripark

Svar konkret og præcist på spørgsmål inden for disse områder.
`;

// Store for active conversations
const conversations = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');

  const conversationId = Date.now().toString();
  conversations.set(conversationId, {
    ws,
    messages: [
      { role: 'system', content: KALUNDBORG_SYSTEM_PROMPT }
    ]
  });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message.type);

      const conversation = conversations.get(conversationId);
      if (!conversation) return;

      switch (message.type) {
        case 'audio_input':
          await handleAudioInput(conversation, message.audio, ws);
          break;

        case 'text_input':
          await handleTextInput(conversation, message.text, ws);
          break;

        case 'start_conversation':
          ws.send(JSON.stringify({
            type: 'conversation_started',
            conversationId
          }));
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Fejl i behandling af besked'
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    conversations.delete(conversationId);
  });
});

// Handle audio input with Whisper transcription
async function handleAudioInput(conversation, audioData, ws) {
  try {
    // Send transcription status
    ws.send(JSON.stringify({
      type: 'transcription_started'
    }));

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Create a File-like object for Whisper
    const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'da',
    });

    const userText = transcription.text;
    console.log('Transcribed text:', userText);

    // Send transcription to client
    ws.send(JSON.stringify({
      type: 'transcription_complete',
      text: userText,
      timestamp: new Date().toISOString()
    }));

    // Process the transcribed text
    await handleTextInput(conversation, userText, ws);

  } catch (error) {
    console.error('Error transcribing audio:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Fejl ved transskription af audio'
    }));
  }
}

// Search for additional Kalundborg information if needed
async function searchKalundborgInfo(query) {
  try {
    // Simple mock search - in production this could use Google Search API or web scraping
    const searchTerms = query.toLowerCase();

    if (searchTerms.includes('vejr') || searchTerms.includes('weather')) {
      return "For aktuel vejrinformation i Kalundborg kan du checke DMI.dk eller ringe til 59 53 44 00 for lokale forhold.";
    }

    if (searchTerms.includes('event') || searchTerms.includes('arrangement') || searchTerms.includes('aktivitet')) {
      return "Aktuelle events og arrangementer i Kalundborg finder du på kalundborg.dk under 'Kultur og fritid' eller ring til 59 53 44 66.";
    }

    if (searchTerms.includes('renovation') || searchTerms.includes('affald') || searchTerms.includes('skrald')) {
      return "For information om renovation og affaldsordninger kontakt Teknik & Miljø på 59 53 44 44 eller check kalundborg.dk.";
    }

    return null;
  } catch (error) {
    console.error('Search error:', error);
    return null;
  }
}

// Handle text input with GPT-4 and fallback search
async function handleTextInput(conversation, text, ws) {
  try {
    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: text
    });

    // Send thinking status
    ws.send(JSON.stringify({
      type: 'assistant_thinking'
    }));

    // Try to get additional information through search if relevant
    const searchInfo = await searchKalundborgInfo(text);

    // Enhanced messages with search context if available
    let messages = [...conversation.messages];
    if (searchInfo) {
      messages.push({
        role: 'system',
        content: `Ekstra information fundet: ${searchInfo}`
      });
    }

    // Get response from GPT-4 with Danish optimization
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const assistantResponse = completion.choices[0].message.content;

    // Add assistant response to conversation (without system message)
    conversation.messages.push({
      role: 'assistant',
      content: assistantResponse
    });

    // Send text response
    ws.send(JSON.stringify({
      type: 'assistant_response',
      text: assistantResponse,
      timestamp: new Date().toISOString()
    }));

    // Generate speech using TTS
    await generateSpeech(assistantResponse, ws);

  } catch (error) {
    console.error('Error generating response:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Fejl ved generering af svar'
    }));
  }
}

// Generate speech from text
async function generateSpeech(text, ws) {
  try {
    ws.send(JSON.stringify({
      type: 'speech_generation_started'
    }));

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
      speed: 1.0,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const audioBase64 = buffer.toString('base64');

    ws.send(JSON.stringify({
      type: 'speech_ready',
      audio: audioBase64,
      format: 'mp3'
    }));

  } catch (error) {
    console.error('Error generating speech:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Fejl ved generering af tale'
    }));
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Kalundborg Voice Assistant Backend' });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎤 Kalundborg Voice Assistant Backend running on port ${PORT}`);
  console.log(`🔗 WebSocket server ready for connections`);
});
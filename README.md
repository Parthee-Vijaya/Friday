# Kalundborg Voice Assistant MVP 🎤

En voice assistant webapp der specifikt svarer på spørgsmål om Kalundborg Kommune. Bygget med OpenAI's gpt-4o og Whisper, med en Open WebUI-inspireret design.

## 🚀 Features

- **🎤 Voice Input:** Real-time optagelse med browser microphone
- **📝 Real-time Transcription:** Whisper transskription på dansk
- **🤖 AI Responses:** GPT-4o med Kalundborg-specifik viden
- **🔊 Text-to-Speech:** Natural danske talesvar
- **💬 Chat Interface:** Open WebUI-lignende design med timestamps
- **🔍 Intelligent Fallback:** Mock search for ekstra information
- **🇩🇰 Dansk Optimeret:** Fuldt optimeret til dansk sprog

## 📁 Projekt Struktur

```
kalundborg-voice-assistant/
├── backend/                 # Node.js server
│   ├── server.js           # Hovedserver med WebSocket og OpenAI
│   ├── kalundborg-data.js  # Kalundborg Kommune data
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment variabler
├── frontend/               # React webapp
│   ├── src/
│   │   ├── App.tsx         # Hovedkomponent med voice interface
│   │   ├── App.css         # Open WebUI-inspireret styling
│   │   ├── index.tsx       # React entry point
│   │   └── index.css       # Global styles
│   ├── public/
│   │   └── index.html      # HTML template
│   └── package.json        # Frontend dependencies
└── README.md
```

## 🛠️ Setup & Installation

### Forudsætninger
- Node.js 18+
- OpenAI API key

### 1. Clone/Download projekt
```bash
cd kalundborg-voice-assistant
```

### 2. Backend Setup
```bash
cd backend

# Installer dependencies
npm install

# Opret .env fil
cp .env.example .env

# Tilføj din OpenAI API key til .env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
NODE_ENV=development
```

### 3. Frontend Setup
```bash
cd ../frontend

# Installer dependencies
npm install
```

## 🚀 Kør Applikationen

### Start Backend (Terminal 1)
```bash
cd backend
npm start
# Eller for development med auto-reload:
npm run dev
```

Backend starter på `http://localhost:3001`

### Start Frontend (Terminal 2)
```bash
cd frontend
npm start
```

Frontend starter på `http://localhost:3000`

## 🎯 Hvordan man bruger det

1. **Åbn webapp:** Gå til `http://localhost:3000`
2. **Allow mikrofon:** Giv browser tilladelse til mikrofon adgang
3. **Klik 🎤 Tale:** Start voice recording
4. **Stil spørgsmål:** Spørg om Kalundborg Kommune (på dansk)
5. **Få svar:** Modtag transskription, tekst svar og tale svar

### 📝 Eksempler på spørgsmål:
- "Hvad er telefonnummeret til Kalundborg Kommune?"
- "Hvilke strande er der i Kalundborg?"
- "Hvordan kommer jeg til Samsø fra Kalundborg?"
- "Hvornår har borgerservice åbent?"
- "Hvilke skoler er der i kommunen?"

## 🧠 Kalundborg Knowledge Base

Voice assistenten har detaljeret viden om:

- **📞 Kontaktoplysninger:** Telefonnumre, adresser, åbningstider
- **🏛️ Afdelinger:** Borgerservice, Teknik & Miljø, Sundhed & Dagtilbud, Kultur & Fritid
- **🚆 Transport:** Tog, færger til Aarhus/Samsø, busser
- **🏰 Seværdigheder:** Vor Frue Kirke, museer, fyrtårn
- **🏖️ Strande:** Reersø, Rørvig, Gisseløre
- **🏫 Skoler:** Gymnasier og folkeskoler
- **🏥 Sundhed:** Sygehuse, apoteker, akut numre
- **🏭 Erhverv:** Store virksomheder, industripark

## 🔧 Teknisk Stack

- **Frontend:** React 18 + TypeScript + CSS3
- **Backend:** Node.js + Express + WebSocket
- **AI:** OpenAI GPT-4o + Whisper + TTS
- **Voice:** Browser Web Audio API + MediaRecorder
- **Communication:** WebSocket for real-time

## ⚙️ Konfiguration

### OpenAI Modeller
- **Chat:** `gpt-4o` (bedste danske support)
- **Transcription:** `whisper-1` med dansk språk
- **Text-to-Speech:** `tts-1` med `nova` voice

### Voice Settings
- **Audio Format:** WAV, 16kHz
- **Language:** Dansk (da)
- **Real-time Processing:** WebSocket streaming

## 🚧 MVP Status

✅ **Færdige Features:**
- [x] Projekt struktur og setup
- [x] OpenAI integration (GPT-4o + Whisper + TTS)
- [x] WebSocket real-time communication
- [x] Voice recording interface
- [x] Open WebUI-style chat design
- [x] Kalundborg knowledge base
- [x] Danish language optimization
- [x] Mock search fallback

⏳ **Næste Fase:**
- [ ] Telefoni integration (Twilio)
- [ ] Real web scraping af kalundborg.dk
- [ ] Advanced voice features
- [ ] Mobile app version

## 🔍 Troubleshooting

### Backend Issues
```bash
# Check if OpenAI API key is set
echo $OPENAI_API_KEY

# Check server logs
npm start
```

### Frontend Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check browser console for errors
```

### Voice Issues
- **Mikrofon ikke tilladt:** Check browser permissions
- **Ingen lyd:** Check browser audio settings
- **Dårlig kvalitet:** Prøv anden browser (Chrome anbefales)

## 📚 Udvikling

### Add new Kalundborg data
Rediger `backend/kalundborg-data.js` for at tilføje mere information.

### Customize voice settings
Rediger voice model settings i `backend/server.js`.

### Update UI design
Rediger `frontend/src/App.css` for styling changes.

## 🎯 Production Deployment

For production deployment:

1. **Environment:** Set `NODE_ENV=production`
2. **Security:** Use HTTPS for microphone access
3. **Scaling:** Consider load balancing for multiple users
4. **Monitoring:** Add logging and error tracking

---

**🎉 Din Kalundborg Voice Assistant MVP er nu klar til test!**

Spørg frit om Kalundborg Kommune og oplev fremtidens borgerbetjening.# Project-Friday

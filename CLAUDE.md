# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kalundborg Voice Assistant - Project Specifics

### Architecture Overview
**Full-stack real-time voice application** for Kalundborg Kommune with:
- **Frontend**: React 18 + TypeScript (port 3004)
- **Backend**: Node.js with Express + WebSocket (port 3003)
- **AI Integration**: OpenAI Realtime API for Danish voice interactions
- **Monorepo Structure**: NPM workspaces with frontend/backend separation

### Critical Development Commands
```bash
# Development
npm run dev              # Start both frontend and backend concurrently
npm run dev:backend      # Backend only (conversation-server.js)
npm run dev:frontend     # Frontend only (React app)

# Testing & Build
npm test                 # Run Jest tests in frontend
npm run build           # Production build (frontend)

# Workspace Management
npm install:all         # Install all dependencies
npm run clean           # Reset workspaces (fixes conflicts)
```

### Server Implementations
Multiple backend variants exist - **use conversation-server.js as primary**:
- `backend/conversation-server.js` - Main OpenAI Realtime API server
- `backend/ga-conversation-server.js` - Google Assistant integration
- `backend/realtime-server.js` - Alternative realtime implementation
- `backend/server.js` - Legacy implementation

### Key Technical Context
1. **WebSocket Communication**: Real-time bidirectional streaming between frontend and backend
2. **Danish Language**: All voice interactions optimized for Danish (da-DK)
3. **Municipal Data**: Kalundborg-specific information in `backend/kalundborg-data.js`
4. **Environment Setup**: Requires `.env` with `OPENAI_API_KEY`
5. **ES Modules**: Backend uses `"type": "module"` - use ES6 imports
6. **TypeScript**: Frontend is fully typed - maintain type safety

### Component Structure
- **ConversationApp.tsx**: Primary conversation interface with WebSocket
- **VoiceApp.tsx**: Alternative voice interface implementation
- **App.tsx**: Main routing component

### API & WebSocket Patterns
```javascript
// WebSocket connection pattern used
const ws = new WebSocket('ws://localhost:3003');
// Messages follow OpenAI Realtime API format
```

### Debugging Tips
- Check browser console for WebSocket connection issues
- Verify microphone permissions in browser
- Monitor backend console for OpenAI API responses
- Use `npm run clean` for workspace conflicts
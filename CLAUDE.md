# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kalundborg Voice Assistant

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
npm run install:all      # Install all dependencies
npm run clean           # Reset workspaces (fixes conflicts)
```

### High-Level Architecture

**WebSocket Communication Flow**:
1. Frontend (VoiceApp.tsx) captures audio via MediaRecorder API
2. Audio streams to backend via WebSocket (ws://localhost:3003)
3. Backend proxies to OpenAI Realtime API (wss://api.openai.com/v1/realtime)
4. Responses stream back through the same WebSocket connection
5. Frontend plays audio responses and displays visualizations

**Server Implementations**:
Multiple backend variants exist - **use conversation-server.js as primary**:
- `backend/conversation-server.js` - Main OpenAI Realtime API server
- `backend/ga-conversation-server.js` - Google Assistant integration
- `backend/realtime-server.js` - Alternative realtime implementation
- `backend/server.js` - Legacy implementation

**Danish Language Context**:
- All prompts optimized for Danish (da-DK) conversations
- Municipal data in `backend/kalundborg-data.js` contains local information
- Responses must relate to Kalundborg Kommune services and information

### Key Technical Patterns

**Audio Processing**:
- Int16Array buffers for real-time audio streaming
- WebAudio API for processing and visualization
- VU meter and audio visualizer components for feedback

**State Management**:
- React hooks for component state
- WebSocket connection state tracking
- Performance monitoring with metrics collection

**Error Handling**:
- Comprehensive logging system with multiple levels
- Connection fallback and retry mechanisms
- Debug mode for development troubleshooting

### Environment Requirements
```bash
# Required .env variables
OPENAI_API_KEY=your_api_key_here

# Backend uses ES modules
"type": "module" in backend/package.json
```

### Development Notes
- Frontend TypeScript - maintain type safety for all changes
- Backend ES6 modules - use import/export, not require()
- WebSocket messages follow OpenAI Realtime API format
- CORS configured for localhost:3001, 3002, 3004
- Use `npm run clean` to resolve workspace conflicts
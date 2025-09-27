import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceApp.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface VoiceState {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  error?: string;
}

function VoiceApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<VoiceState>({
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    isPlaying: false,
  });

  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioQueue = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  // Initialize audio context
  const initializeAudio = useCallback(async () => {
    try {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });

      if (audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
      }

      console.log('🎵 Audio context initialized');
    } catch (error) {
      console.error('Error initializing audio:', error);
      setState(prev => ({ ...prev, error: 'Kunne ikke initialisere audio' }));
    }
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      ws.current = new WebSocket('ws://localhost:3001');

      ws.current.onopen = () => {
        console.log('🔗 Connected to server');
        setState(prev => ({ ...prev, isConnected: true, error: undefined }));

        // Start OpenAI session
        ws.current?.send(JSON.stringify({ type: 'start_session' }));
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      };

      ws.current.onclose = () => {
        console.log('🔌 Disconnected from server');
        setState(prev => ({ ...prev, isConnected: false }));
        setTimeout(connectWebSocket, 3000); // Reconnect after 3 seconds
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'Forbindelse fejlede' }));
      };

    } catch (error) {
      console.error('Error connecting:', error);
      setState(prev => ({ ...prev, error: 'Kunne ikke forbinde' }));
    }
  }, []);

  // Handle server messages
  const handleServerMessage = (data: any) => {
    switch (data.type) {
      case 'session_ready':
        console.log('✅ Session ready');
        break;

      case 'openai_session_ready':
        console.log('🤖 OpenAI session ready');
        setState(prev => ({ ...prev, isProcessing: false }));
        break;

      case 'speech_started':
        console.log('🎤 Speech detected');
        setState(prev => ({ ...prev, isProcessing: true }));
        break;

      case 'speech_stopped':
        console.log('🔇 Speech stopped');
        break;

      case 'transcription_complete':
        console.log('📝 Transcription:', data.text);
        addMessage('user', data.text, data.timestamp);
        break;

      case 'audio_delta':
        if (data.delta) {
          playAudioDelta(data.delta);
        }
        break;

      case 'response_text_delta':
        // Handle streaming text response
        updateResponseText(data.delta);
        break;

      case 'response_complete':
        console.log('✅ Response complete');
        setState(prev => ({ ...prev, isProcessing: false }));
        break;

      case 'error':
        console.error('❌ Server error:', data.message);
        setState(prev => ({ ...prev, error: data.message, isProcessing: false }));
        break;

      default:
        console.log('📨 Server message:', data.type);
    }
  };

  // Add message to chat
  const addMessage = (role: 'user' | 'assistant', content: string, timestamp?: string) => {
    const message: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: timestamp || new Date().toISOString()
    };
    setMessages(prev => [...prev, message]);
  };

  // Update streaming response
  const updateResponseText = (delta: string) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        // Update existing assistant message
        return prev.map(msg =>
          msg.id === lastMessage.id
            ? { ...msg, content: msg.content + delta }
            : msg
        );
      } else {
        // Create new assistant message
        return [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: delta,
          timestamp: new Date().toISOString()
        }];
      }
    });
  };

  // Play audio delta from OpenAI
  const playAudioDelta = (base64Audio: string) => {
    try {
      if (!audioContext.current) return;

      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert to 16-bit PCM
      const pcm16 = new Int16Array(bytes.buffer);
      audioQueue.current.push(pcm16);

      if (!isPlayingRef.current) {
        playAudioQueue();
      }
    } catch (error) {
      console.error('Error playing audio delta:', error);
    }
  };

  // Play queued audio
  const playAudioQueue = async () => {
    if (!audioContext.current || audioQueue.current.length === 0) return;

    isPlayingRef.current = true;
    setState(prev => ({ ...prev, isPlaying: true }));

    try {
      while (audioQueue.current.length > 0) {
        const pcmData = audioQueue.current.shift()!;

        // Create audio buffer
        const audioBuffer = audioContext.current.createBuffer(1, pcmData.length, 24000);
        const channelData = audioBuffer.getChannelData(0);

        // Convert PCM16 to float32
        for (let i = 0; i < pcmData.length; i++) {
          channelData[i] = pcmData[i] / 32768;
        }

        // Play audio buffer
        const source = audioContext.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.current.destination);

        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      }
    } catch (error) {
      console.error('Error playing audio queue:', error);
    } finally {
      isPlayingRef.current = false;
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      if (!audioContext.current) {
        await initializeAudio();
      }

      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      microphone.current = audioContext.current!.createMediaStreamSource(stream.current);
      processor.current = audioContext.current!.createScriptProcessor(4096, 1, 1);

      processor.current.onaudioprocess = (event) => {
        if (!state.isRecording) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Convert float32 to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = sample * 32767;
        }

        // Convert to base64 and send
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'audio_chunk',
            audio: base64
          }));
        }
      };

      microphone.current.connect(processor.current);
      processor.current.connect(audioContext.current!.destination);

      setState(prev => ({ ...prev, isRecording: true }));
      console.log('🎤 Recording started');

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({ ...prev, error: 'Kunne ikke starte optagelse' }));
    }
  };

  // Stop recording
  const stopRecording = () => {
    setState(prev => ({ ...prev, isRecording: false }));

    if (processor.current) {
      processor.current.disconnect();
      processor.current = null;
    }

    if (microphone.current) {
      microphone.current.disconnect();
      microphone.current = null;
    }

    if (stream.current) {
      stream.current.getTracks().forEach(track => track.stop());
      stream.current = null;
    }

    // Trigger response generation
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'create_response' }));
    }

    console.log('🔇 Recording stopped');
  };

  // Initialize on mount
  useEffect(() => {
    initializeAudio();
    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [initializeAudio, connectWebSocket]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status text
  const getStatusText = () => {
    if (!state.isConnected) return 'Forbinder...';
    if (state.isRecording) return 'Optager...';
    if (state.isProcessing) return 'Behandler...';
    if (state.isPlaying) return 'Afspiller...';
    return 'Klar til at lytte';
  };

  return (
    <div className="voice-app">
      <header className="app-header">
        <h1>🎤 Kalundborg Voice Assistant</h1>
        <div className="status">
          <span className={`status-indicator ${state.isConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-text">{getStatusText()}</span>
        </div>
      </header>

      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h2>Velkommen til Kalundborg Voice Assistant</h2>
              <p>Tryk og hold mikrofon-knappen og spørg om Kalundborg Kommune</p>
              <p><strong>✨ OpenAI Realtime Voice API</strong></p>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-header">
                  <span className="role">{message.role === 'user' ? 'USER' : 'ASSISTANT'}</span>
                  <span className="timestamp">{formatTime(message.timestamp)}</span>
                </div>
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="voice-controls">
        <button
          className={`voice-button ${state.isRecording ? 'recording' : ''}`}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={!state.isConnected || state.isProcessing}
        >
          {state.isRecording ? '🔴 Slip for at sende' : '🎤 Hold for at tale'}
        </button>

        {state.error && (
          <div className="error-message">
            {state.error}
          </div>
        )}

        <div className="instructions">
          <p>Hold knappen nede mens du taler, slip for at sende til AI</p>
        </div>
      </div>
    </div>
  );
}

export default VoiceApp;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceApp.css';
// import AudioVisualizer from './AudioVisualizer';
// import VUMeter from './VUMeter';
// import PerformanceMonitor from './PerformanceMonitor';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationState {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  isTalking: boolean;
  hasActiveResponse: boolean;
  error?: string;
}

function ConversationApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<ConversationState>({
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    isPlaying: false,
    isTalking: false,
    hasActiveResponse: false,
  });

  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const currentAssistantMessage = useRef<Message | null>(null);
  const currentUserMessage = useRef<Message | null>(null);
  const isTalkingRef = useRef<boolean>(false);
  const audioBuffer = useRef<Int16Array[]>([]);
  const bufferCounter = useRef<number>(0);
  const totalAudioSamples = useRef<number>(0); // Track total audio samples
  const outputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTime = useRef<number>(0);
  const commitDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state); // For accurate state in callbacks
  const [showPerformance, setShowPerformance] = useState(false);

  // Utility function to emit performance events
  const emitPerformanceEvent = (type: string, data?: any) => {
    window.dispatchEvent(new CustomEvent('performance-metric', {
      detail: {
        type,
        timestamp: Date.now(),
        data
      }
    }));
  };

  // Update state ref when state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize audio context
  const initializeAudio = useCallback(async () => {
    try {
      console.log('🎵 Creating AudioContext...');
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });

      console.log('🎵 AudioContext state:', audioContext.current.state);

      if (audioContext.current.state === 'suspended') {
        console.log('🎵 Resuming suspended AudioContext...');
        await audioContext.current.resume();
        console.log('🎵 AudioContext resumed, new state:', audioContext.current.state);
      }

      console.log('✅ Audio context initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing audio:', error);
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
        emitPerformanceEvent('speech_started');

        // Add placeholder user message immediately when speech starts (only if none exists)
        if (!currentUserMessage.current) {
          const placeholderMessage = addMessage('user', '🎤 Behandler tale...', new Date().toISOString());
          currentUserMessage.current = placeholderMessage;
        }

        setState(prev => {
          // NEVER cancel ongoing responses - let assistant finish speaking completely
          console.log('🎤 Speech detected - queueing user input (not cancelling assistant)');
          return { ...prev, isRecording: true };
        });
        break;

      case 'speech_stopped':
        console.log('🔇 Speech stopped');

        // Debounce commit_audio to avoid rapid fire
        if (commitDebounceRef.current) {
          clearTimeout(commitDebounceRef.current);
        }

        commitDebounceRef.current = setTimeout(() => {
          // Only commit if we have enough audio (at least 100ms = 2400 samples at 24kHz)
          const minSamples = 2400; // 100ms at 24kHz
          const currentState = stateRef.current;

          // NEVER interrupt assistant - wait until assistant is completely done
          if (currentState.hasActiveResponse || currentState.isPlaying) {
            console.log('🚫 Assistant is speaking - delaying user input processing');
            totalAudioSamples.current = 0; // Clear audio samples to prevent buildup
            return;
          }

          if (totalAudioSamples.current >= minSamples && ws.current?.readyState === WebSocket.OPEN) {
            console.log(`🎵 Committing audio buffer with ${totalAudioSamples.current} samples (${(totalAudioSamples.current / 24000 * 1000).toFixed(1)}ms)`);

            ws.current.send(JSON.stringify({ type: 'commit_audio' }));

            // Only create response if no active response exists
            if (!currentState.hasActiveResponse &&
                !currentState.isProcessing &&
                !currentState.isPlaying) {

              console.log('🤖 Creating response - state clear');
              ws.current.send(JSON.stringify({ type: 'create_response' }));

              setState(prev => ({
                ...prev,
                isProcessing: true,
                hasActiveResponse: true
              }));
            } else {
              console.log('⏭️ Skipping response - active state:', {
                hasActiveResponse: currentState.hasActiveResponse,
                isProcessing: currentState.isProcessing,
                isPlaying: currentState.isPlaying
              });
            }
          } else {
            console.log(`⚠️ Not committing audio - insufficient samples: ${totalAudioSamples.current} (need ${minSamples})`);
          }

          commitDebounceRef.current = null;
        }, 300); // 300ms debounce
        break;

      case 'transcription_complete':
        console.log('📝 Transcription:', data.text);

        // Update the existing placeholder user message instead of adding a new one
        if (currentUserMessage.current) {
          setMessages(prev => prev.map(msg =>
            msg.id === currentUserMessage.current?.id
              ? { ...msg, content: data.text, timestamp: data.timestamp || msg.timestamp }
              : msg
          ));
          currentUserMessage.current = null;
        } else {
          // Fallback if no placeholder exists
          addMessage('user', data.text, data.timestamp);
        }
        break;

      case 'audio_delta':
        if (data.delta) {
          setState(prev => ({ ...prev, isPlaying: true, hasActiveResponse: true }));
          playAudioDelta(data.delta);
        }
        break;

      case 'response_text_delta':
        updateResponseText(data.delta);
        break;

      case 'response_created':
        console.log('🤖 Response generation started');
        emitPerformanceEvent('response_started');
        setState(prev => ({ ...prev, hasActiveResponse: true, isProcessing: true }));
        break;

      case 'response_complete':
        console.log('✅ Response complete');
        setState(prev => ({ ...prev, isProcessing: false, isPlaying: false, hasActiveResponse: false }));
        currentAssistantMessage.current = null;

        // Clean up placeholder user message if it wasn't replaced with actual transcription
        if (currentUserMessage.current) {
          const currentMsg = messages.find(msg => msg.id === currentUserMessage.current?.id);
          if (currentMsg && currentMsg.content === '🎤 Behandler tale...') {
            // Remove placeholder message that wasn't replaced
            setMessages(prev => prev.filter(msg => msg.id !== currentUserMessage.current?.id));
            currentUserMessage.current = null;
          }
        }
        break;

      case 'error':
        console.error('❌ Server error:', data.message);
        emitPerformanceEvent('error');
        setState(prev => ({ ...prev, error: data.message, isProcessing: false, hasActiveResponse: false }));
        break;

      case 'reconnected':
        console.log('🔄 Reconnected to server');
        setState(prev => ({ ...prev, error: undefined }));
        break;

      case 'openai_disconnected':
        console.log('🔌 OpenAI disconnected');
        if (data.reconnecting) {
          emitPerformanceEvent('reconnection');
          setState(prev => ({
            ...prev,
            error: `Genopretter forbindelse... (forsøg ${data.attempt})`
          }));
        }
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
    return message;
  };

  // Update streaming response
  const updateResponseText = (delta: string) => {
    if (!currentAssistantMessage.current) {
      currentAssistantMessage.current = addMessage('assistant', '', new Date().toISOString());
    }

    setMessages(prev => prev.map(msg =>
      msg.id === currentAssistantMessage.current?.id
        ? { ...msg, content: msg.content + delta }
        : msg
    ));
  };

  // Play audio delta from OpenAI with queue management
  const playAudioDelta = async (base64Audio: string) => {
    try {
      if (!audioContext.current) return;

      setState(prev => ({ ...prev, isPlaying: true }));

      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert to 16-bit PCM
      const pcm16 = new Int16Array(bytes.buffer);

      // Create audio buffer
      const audioBuffer = audioContext.current.createBuffer(1, pcm16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);

      // Convert PCM16 to float32
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768;
      }

      // Queue audio for seamless playback
      const source = audioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.current.destination);

      // Calculate when to play this chunk
      const currentTime = audioContext.current.currentTime;
      const startTime = Math.max(currentTime + 0.05, nextPlayTime.current); // Add 50ms buffer

      source.start(startTime);
      nextPlayTime.current = startTime + audioBuffer.duration;

      // Add to queue for cleanup
      audioQueueRef.current.push(source);

      // Clean up old sources
      source.onended = () => {
        const index = audioQueueRef.current.indexOf(source);
        if (index > -1) {
          audioQueueRef.current.splice(index, 1);
        }
        if (audioQueueRef.current.length === 0) {
          setState(prev => ({ ...prev, isPlaying: false }));
          nextPlayTime.current = 0;
        }
      };

    } catch (error) {
      console.error('Error playing audio delta:', error);
    }
  };

  // Toggle conversation mode
  const toggleConversation = async () => {
    if (state.isTalking) {
      // Stop talking
      stopRecording();
    } else {
      // Start talking
      await startRecording();
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording process...');

      if (!audioContext.current) {
        console.log('🎵 Initializing audio context...');
        await initializeAudio();
      }

      console.log('📹 Requesting microphone access...');
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('✅ Microphone access granted');
      console.log('🔗 Setting up audio processing...');

      microphone.current = audioContext.current!.createMediaStreamSource(stream.current);
      processor.current = audioContext.current!.createScriptProcessor(2048, 1, 1);

      processor.current.onaudioprocess = (event) => {
        if (!isTalkingRef.current) {
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);

        // Convert float32 to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = sample * 32767;
        }

        // Add to buffer
        audioBuffer.current.push(pcm16);
        bufferCounter.current++;
        totalAudioSamples.current += pcm16.length;

        // Send every 2 chunks to reduce frequency (approximately 85ms intervals)
        if (bufferCounter.current >= 2) {
          const combinedLength = audioBuffer.current.reduce((acc, arr) => acc + arr.length, 0);
          const combinedBuffer = new Int16Array(combinedLength);
          let offset = 0;

          for (const chunk of audioBuffer.current) {
            combinedBuffer.set(chunk, offset);
            offset += chunk.length;
          }

          // Convert to base64 and send
          const base64 = btoa(String.fromCharCode(...new Uint8Array(combinedBuffer.buffer)));

          if (ws.current?.readyState === WebSocket.OPEN) {
            console.log('📤 Sending buffered audio chunk, size:', base64.length, 'chunks combined:', audioBuffer.current.length);
            emitPerformanceEvent('message_sent');
            ws.current.send(JSON.stringify({
              type: 'audio_chunk',
              audio: base64
            }));
          }

          // Reset buffer
          audioBuffer.current = [];
          bufferCounter.current = 0;
        }
      };

      microphone.current.connect(processor.current);
      processor.current.connect(audioContext.current!.destination);

      // Update both state and ref
      isTalkingRef.current = true;
      totalAudioSamples.current = 0; // Reset sample counter
      setState(prev => ({
        ...prev,
        isTalking: true,
        isRecording: true
      }));

      console.log('🎤 Recording started successfully, isTalkingRef.current:', isTalkingRef.current);

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setState(prev => ({ ...prev, error: 'Kunne ikke starte optagelse' }));
    }
  };

  // Stop recording
  const stopRecording = () => {
    // Update ref first
    isTalkingRef.current = false;

    setState(prev => ({
      ...prev,
      isTalking: false,
      isRecording: false
    }));

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

    // Clear audio buffers
    audioBuffer.current = [];
    bufferCounter.current = 0;
    totalAudioSamples.current = 0;

    console.log('🔇 Recording stopped, isTalkingRef.current:', isTalkingRef.current);
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    currentAssistantMessage.current = null;
  };

  // Initialize on mount (WITHOUT audio - wait for user gesture)
  useEffect(() => {
    connectWebSocket();

    return () => {
      // Clean up debounce timer
      if (commitDebounceRef.current) {
        clearTimeout(commitDebounceRef.current);
      }

      // Clean up audio queue
      audioQueueRef.current.forEach(source => {
        try {
          source.stop();
          source.disconnect();
        } catch (e) {}
      });
      audioQueueRef.current = [];

      if (ws.current) {
        ws.current.close();
      }
      if (audioContext.current && audioContext.current.state !== 'closed') {
        audioContext.current.close();
      }
      stopRecording();
    };
  }, [connectWebSocket]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get status text with more detail
  const getStatusText = () => {
    if (!state.isConnected) return 'Forbinder...';
    if (state.error && state.error.includes('Genopretter')) return state.error;
    if (state.isTalking) return 'Du taler...';
    if (state.isProcessing && state.hasActiveResponse) return 'AI genererer svar...';
    if (state.isProcessing) return 'AI lytter...';
    if (state.isPlaying) return 'AI taler...';
    return 'Klar til samtale';
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
              <p>Klik <strong>"Start Samtale"</strong> og begynd at tale om Kalundborg Kommune</p>
              <p className="highlight">✨ Real-time voice conversation ✨</p>
              <p><strong>Eksempler:</strong> "Hvad er telefonnummeret til kommunen?" • "Hvordan kommer jeg til Samsø?" • "Hvilke strande er der?"</p>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-header">
                  <span className="role">{message.role === 'user' ? 'DIG' : 'KALUNDBORG AI'}</span>
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
        {/* Temporarily disabled for debugging
        {state.isTalking && (
          <VUMeter
            audioContext={audioContext.current}
            source={microphone.current}
            isActive={state.isTalking}
          />
        )}

        {state.isTalking && (
          <AudioVisualizer
            audioContext={audioContext.current}
            source={microphone.current}
            isActive={state.isTalking}
            mode="input"
          />
        )}

        {state.isPlaying && outputSourceRef.current && (
          <AudioVisualizer
            audioContext={audioContext.current}
            source={outputSourceRef.current}
            isActive={state.isPlaying}
            mode="output"
          />
        )}
        */}

        <div className="control-buttons">
          <button
            className={`voice-button ${state.isTalking ? 'recording' : ''}`}
            onClick={toggleConversation}
            disabled={!state.isConnected}
          >
            {state.isTalking ? '🔴 Stop Tale' : '🎤 Start Samtale'}
          </button>

          {messages.length > 0 && (
            <button
              className="clear-button"
              onClick={clearConversation}
            >
              🗑️ Ryd Chat
            </button>
          )}

          <button
            className="performance-button"
            onClick={() => setShowPerformance(!showPerformance)}
            style={{
              background: showPerformance ? '#44ff44' : '#2d2d44',
              color: showPerformance ? '#000' : '#fff',
              border: '1px solid #44ff44',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📈 Metrics
          </button>
        </div>

        {state.error && (
          <div className="error-message">
            {state.error}
          </div>
        )}

        <div className="instructions">
          <p>
            {state.isTalking
              ? "Du kan nu tale frit. AI'en lytter og vil svare automatisk når du holder pause."
              : "Klik 'Start Samtale' for at begynde en naturlig voice conversation."
            }
          </p>
        </div>
      </div>

      {/* Temporarily disabled for debugging
      <PerformanceMonitor
        isVisible={showPerformance}
        onMetricsUpdate={(metrics) => {
          // Could store metrics for analytics
          console.log('Performance metrics updated:', metrics);
        }}
      />
      */}
    </div>
  );
}

export default ConversationApp;
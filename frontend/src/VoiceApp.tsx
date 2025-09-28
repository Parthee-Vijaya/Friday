import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceApp.css';

type Role = 'user' | 'assistant';
type LogLevel = 'debug' | 'info' | 'success' | 'warning' | 'error';

interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
}

interface VoiceState {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  audioLevel: number;
  error?: string;
}

interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: string;
}

const MAX_LOG_ITEMS = 200;

function VoiceApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<VoiceState>({
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    isPlaying: false,
    audioLevel: 0,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioQueue = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const hasSentAudioRef = useRef(false);
  const recordingStartTime = useRef<number>(0);
  const audioChunkCount = useRef<number>(0);
  const currentAudioLevel = useRef<number>(0);
  const pendingUserMessageId = useRef<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const inspectorRef = useRef<HTMLDivElement | null>(null);

  const formatMeta = (meta: unknown) => {
    if (!meta) return undefined;
    if (typeof meta === 'string') return meta;
    if (meta instanceof Error) return meta.stack || meta.message;

    try {
      return JSON.stringify(meta, null, 2);
    } catch (error) {
      return String(meta);
    }
  };

  const pushLog = useCallback((level: LogLevel, message: string, meta?: unknown) => {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      id: `${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
      level,
      message,
      timestamp,
      meta: formatMeta(meta)
    };

    setLogs(prev => {
      const next = [...prev, entry];
      if (next.length > MAX_LOG_ITEMS) {
        return next.slice(next.length - MAX_LOG_ITEMS);
      }
      return next;
    });

    const logger: Record<LogLevel, (...args: unknown[]) => void> = {
      debug: console.debug,
      info: console.info,
      success: console.info,
      warning: console.warn,
      error: console.error
    };

    if (entry.meta) {
      logger[level](`[${entry.timestamp}] ${message}`, entry.meta);
    } else {
      logger[level](`[${entry.timestamp}] ${message}`);
    }
  }, []);

  const addMessage = useCallback((role: Role, content: string, timestamp?: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        content,
        timestamp: timestamp || new Date().toISOString()
      }
    ]);
  }, []);

  const addMessageWithId = useCallback((id: string, role: Role, content: string) => {
    setMessages(prev => [
      ...prev,
      {
        id,
        role,
        content,
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  const updateMessageContent = useCallback((id: string, content: string) => {
    setMessages(prev => prev.map(message => (
      message.id === id
        ? { ...message, content }
        : message
    )));
  }, []);

  const updateResponseText = useCallback((delta: string) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        return prev.map(message =>
          message.id === lastMessage.id
            ? { ...message, content: message.content + delta }
            : message
        );
      }

      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'assistant',
          content: delta,
          timestamp: new Date().toISOString()
        }
      ];
    });
  }, []);

  const initializeAudio = useCallback(async () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000
        });
        pushLog('info', 'Audio context initialiseret');
      }

      if (audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
        pushLog('info', 'Audio context genoptaget');
      }
    } catch (error) {
      pushLog('error', 'Kunne ikke initialisere audio', error);
      setState(prev => ({ ...prev, error: 'Kunne ikke initialisere audio' }));
    }
  }, [pushLog]);

  const loadAudioDevices = useCallback(async () => {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Mikrofon ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }));

      setAudioDevices(audioInputs);

      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }

      pushLog('info', `Fandt ${audioInputs.length} mikrofoner`);
    } catch (error) {
      pushLog('error', 'Kunne ikke indlæse audio-enheder', error);
    }
  }, [pushLog, selectedDeviceId]);

  const playAudioQueue = useCallback(async () => {
    if (!audioContext.current || audioQueue.current.length === 0) return;

    isPlayingRef.current = true;
    setState(prev => ({ ...prev, isPlaying: true }));

    try {
      while (audioQueue.current.length > 0) {
        const pcmData = audioQueue.current.shift();
        if (!pcmData) continue;

        const audioBuffer = audioContext.current.createBuffer(1, pcmData.length, 24000);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < pcmData.length; i += 1) {
          channelData[i] = pcmData[i] / 32768;
        }

        const source = audioContext.current.createBufferSource();
        const gainNode = audioContext.current.createGain();

        source.buffer = audioBuffer;
        gainNode.gain.setValueAtTime(0.7, audioContext.current.currentTime);  // Reduce volume to prevent clipping

        source.connect(gainNode);
        gainNode.connect(audioContext.current.destination);

        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      }
    } catch (error) {
      pushLog('error', 'Fejl under afspilning af AI-svar', error);
    } finally {
      isPlayingRef.current = false;
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [pushLog]);

  const playAudioDelta = useCallback((base64Audio: string) => {
    try {
      if (!audioContext.current) return;

      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      audioQueue.current.push(pcm16);

      if (!isPlayingRef.current) {
        void playAudioQueue();
      }
    } catch (error) {
      pushLog('error', 'Kunne ikke afkode lyd fra OpenAI', error);
    }
  }, [playAudioQueue, pushLog]);

  const handleServerMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'log':
        pushLog(data.level ?? 'info', data.message, data.meta);
        break;

      case 'session_ready':
        pushLog('success', 'Realtidssession initialiseret');
        break;

      case 'openai_session_ready':
        pushLog('info', 'OpenAI session klar');
        setState(prev => ({ ...prev, isProcessing: false }));
        break;

      case 'speech_started':
        pushLog('info', 'Tale registreret');
        setState(prev => ({ ...prev, isProcessing: true }));

        if (!pendingUserMessageId.current) {
          const placeholderId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          pendingUserMessageId.current = placeholderId;
          addMessageWithId(placeholderId, 'user', '… lytter');
        }
        break;

      case 'speech_stopped':
        pushLog('debug', 'Tale stoppet');
        if (pendingUserMessageId.current) {
          updateMessageContent(pendingUserMessageId.current, '… transskriberer');
        }
        break;

      case 'transcription_complete':
        pushLog('success', 'Transskription modtaget', data.text);
        if (pendingUserMessageId.current) {
          updateMessageContent(pendingUserMessageId.current, data.text);
          pendingUserMessageId.current = null;
        } else {
          addMessage('user', data.text, data.timestamp);
        }
        break;

      case 'audio_delta':
        if (data.delta) {
          playAudioDelta(data.delta);
        }
        break;

      case 'response_text_delta':
        updateResponseText(data.delta);
        break;

      case 'response_created':
        pushLog('debug', 'OpenAI genererer svar');
        break;

      case 'response_complete':
        pushLog('success', 'Svar færdigt');
        setState(prev => ({ ...prev, isProcessing: false }));
        break;

      case 'error':
        pushLog('error', data.message);
        setState(prev => ({ ...prev, error: data.message, isProcessing: false }));

        if (pendingUserMessageId.current) {
          updateMessageContent(pendingUserMessageId.current, 'Kunne ikke transskribere talte input');
          pendingUserMessageId.current = null;
        }
        break;

      case 'openai_disconnected':
        pushLog('warning', 'OpenAI afbrudt - forsøger at genoprette');
        if (pendingUserMessageId.current) {
          updateMessageContent(pendingUserMessageId.current, 'Forbindelse mistet – prøv igen');
          pendingUserMessageId.current = null;
        }
        break;

      default:
        pushLog('debug', `Ukendt serverbesked: ${data.type}`);
    }
  }, [
    addMessage,
    addMessageWithId,
    playAudioDelta,
    pushLog,
    updateMessageContent,
    updateResponseText
  ]);

  const resolveWebSocketUrl = useCallback(() => {
    if (process.env.REACT_APP_BACKEND_WS) {
      return process.env.REACT_APP_BACKEND_WS;
    }

    const { protocol, hostname, port } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss' : 'ws';
    const configuredHost = process.env.REACT_APP_BACKEND_HOST || hostname;
    const configuredPort = process.env.REACT_APP_BACKEND_PORT
      || (port === '3000' || port === '3004' || port === '3200' ? '3100' : port);

    return `${wsProtocol}://${configuredHost}${configuredPort ? `:${configuredPort}` : ''}`;
  }, []);

  const connectWebSocket = useCallback(() => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = resolveWebSocketUrl();

    try {
      pushLog('info', `Opretter WebSocket til ${url}`);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        pushLog('success', 'Forbundet til backend');
        setState(prev => ({ ...prev, isConnected: true, error: undefined }));
        ws.current?.send(JSON.stringify({ type: 'start_session' }));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerMessage(data);
        } catch (error) {
          pushLog('error', 'Kunne ikke parse serverbesked', error);
        }
      };

      ws.current.onclose = (event) => {
        pushLog('warning', `Forbindelse lukket - forsøger igen (${event.code})`);
        setState(prev => ({ ...prev, isConnected: false }));
        setTimeout(connectWebSocket, 2500);
      };

      ws.current.onerror = (event) => {
        pushLog('error', 'WebSocket fejl', event);
        setState(prev => ({ ...prev, error: 'Forbindelse fejlede' }));
      };
    } catch (error) {
      pushLog('error', 'Kunne ikke oprette WebSocket-forbindelse', error);
      setState(prev => ({ ...prev, error: 'Kunne ikke forbinde' }));
    }
  }, [handleServerMessage, pushLog, resolveWebSocketUrl]);

  const startRecording = useCallback(async () => {
    try {
      await initializeAudio();

      const audioConstraints: MediaTrackConstraints = {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      };

      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }

      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      // Set up audio processing with ScriptProcessor (but properly connected)
      microphone.current = audioContext.current!.createMediaStreamSource(stream.current);
      processor.current = audioContext.current!.createScriptProcessor(4096, 1, 1);

      hasSentAudioRef.current = false;
      audioChunkCount.current = 0;

      console.log('Setting up audio processing with proper connection...');

      processor.current.onaudioprocess = (event) => {
        if (!isRecordingRef.current) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Calculate audio level for visualization
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        currentAudioLevel.current = Math.min(rms * 10, 1); // Scale and clamp

        // Convert to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i += 1) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = sample * 32767;
        }

        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'audio_chunk',
            audio: base64
          }));
          hasSentAudioRef.current = true;
          audioChunkCount.current += 1;

          if (audioChunkCount.current % 20 === 0) {
            console.log(`Sent ${audioChunkCount.current} audio chunks, level: ${currentAudioLevel.current.toFixed(2)}`);
          }
        }
      };

      // Connect through gain node to control volume and prevent feedback
      const gainNode = audioContext.current!.createGain();
      gainNode.gain.setValueAtTime(0.1, audioContext.current!.currentTime); // Very low volume

      microphone.current.connect(processor.current);
      processor.current.connect(gainNode);
      gainNode.connect(audioContext.current!.destination);

      console.log('Audio processing connected and active');

      isRecordingRef.current = true;
      recordingStartTime.current = Date.now();
      setState(prev => ({ ...prev, isRecording: true, audioLevel: 0 }));
      pushLog('info', 'Optagelse startet - audio processing aktiveret');
      console.log('Recording started with ScriptProcessor');

      // Start audio level update timer
      const levelUpdateInterval = setInterval(() => {
        if (isRecordingRef.current) {
          setState(prev => ({ ...prev, audioLevel: currentAudioLevel.current }));
        } else {
          clearInterval(levelUpdateInterval);
        }
      }, 50); // Update 20 times per second
    } catch (error) {
      pushLog('error', 'Kunne ikke starte optagelse', error);
      setState(prev => ({ ...prev, error: 'Kunne ikke starte optagelse' }));
    }
  }, [initializeAudio, pushLog]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) {
      return;
    }

    isRecordingRef.current = false;
    currentAudioLevel.current = 0;
    setState(prev => ({ ...prev, isRecording: false, audioLevel: 0 }));

    console.log('Stopping audio recording...');

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

    if (ws.current?.readyState === WebSocket.OPEN) {
      const recordingDuration = Date.now() - recordingStartTime.current;
      const minRecordingTime = 250; // Minimum 250ms for at sikre nok audio data

      if (hasSentAudioRef.current && recordingDuration >= minRecordingTime) {
        ws.current.send(JSON.stringify({ type: 'commit_audio' }));
        ws.current.send(JSON.stringify({ type: 'create_response' }));
        pushLog('info', `Optagelse stoppet og sendt til AI (${recordingDuration}ms, ${audioChunkCount.current} chunks)`);
      } else if (recordingDuration < minRecordingTime) {
        pushLog('warning', `Optagelse for kort (${recordingDuration}ms) – hold knappen i mindst ${minRecordingTime}ms`);
      } else {
        pushLog('warning', `Ingen audio registreret – prøv igen (duration: ${recordingDuration}ms, chunks: ${audioChunkCount.current})`);

        if (pendingUserMessageId.current) {
          updateMessageContent(pendingUserMessageId.current, 'Ingen lyd registreret – prøv igen');
          pendingUserMessageId.current = null;
        }
      }
    }
  }, [pushLog, updateMessageContent]);

  const handleHoldStart = useCallback((event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    event.preventDefault();
    void startRecording();
  }, [startRecording]);

  const handleHoldEnd = useCallback((event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    event.preventDefault();
    stopRecording();
  }, [stopRecording]);

  useEffect(() => {
    connectWebSocket();
    loadAudioDevices();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [connectWebSocket, loadAudioDevices]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = () => {
    if (!state.isConnected) return 'Forbinder...';
    if (state.isRecording) return 'Optager...';
    if (state.isProcessing) return 'Behandler...';
    if (state.isPlaying) return 'Afspiller svar...';
    return 'Klar til at lytte';
  };

  const clearLogs = () => setLogs([]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  useEffect(() => {
    if (inspectorRef.current) {
      inspectorRef.current.scrollTo({
        top: inspectorRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  return (
    <div className="audio-playground">
      <header className="playground-header">
        <div className="brand">
          <span aria-hidden className="brand__icon">🎙️</span>
          <div>
            <h1>Kalundborg Voice Assistant</h1>
            <p>Realtime OpenAI voice sandbox til borgerservice</p>
          </div>
        </div>
        <div className="connection">
          <span className={`connection__dot ${state.isConnected ? 'is-online' : 'is-offline'}`}></span>
          <span className="connection__label">{getStatusText()}</span>
        </div>
      </header>

      <main className="playground-main">
        <section className="session-panel">
          <div className="panel-header">
            <div>
              <h2>Samtale</h2>
              <p>Assistant svarer på dansk og fokuserer på hjælp til Kalundborg Kommune.</p>
            </div>
            <div className="session-flags">
              <span className={`flag ${state.isProcessing ? 'is-active' : ''}`}>AI tænker</span>
              <span className={`flag ${state.isRecording ? 'is-active' : ''}`}>Optagelse</span>
              <span className={`flag ${state.isPlaying ? 'is-active' : ''}`}>Afspiller</span>
            </div>
          </div>

          <div className="transcript" ref={transcriptRef}>
            {messages.length === 0 ? (
              <div className="transcript__empty">
                <h3>Klar når du er</h3>
                <p>Hold mikrofonknappen nede, stil et spørgsmål om Kalundborg, og slip for at sende.</p>
              </div>
            ) : (
              messages.map(message => {
                const bubbleClasses = ['bubble', `bubble--${message.role}`];
                if (message.content.startsWith('…')) {
                  bubbleClasses.push('bubble--pending');
                }

                return (
                  <article key={message.id} className={bubbleClasses.join(' ')}>
                    <header>
                      <span className="bubble__role">{message.role === 'user' ? 'Dig' : 'Assistant'}</span>
                      <time>{formatTime(message.timestamp)}</time>
                    </header>
                    <p>{message.content}</p>
                  </article>
                );
              })
            )}
          </div>

          <div className="session-controls">
            {audioDevices.length > 1 && (
              <div className="microphone-selector">
                <label htmlFor="mic-select">Mikrofon:</label>
                <select
                  id="mic-select"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={state.isRecording}
                >
                  {audioDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              className={`mic ${state.isRecording ? 'is-recording' : ''}`}
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              onTouchCancel={handleHoldEnd}
              disabled={!state.isConnected || state.isProcessing}
            >
              {state.isRecording ? 'Slip for at sende' : 'Hold for at tale'}
            </button>

            {state.isRecording && (
              <div className="audio-visualizer">
                <div className="audio-level-meter">
                  <div
                    className="audio-level-bar"
                    style={{
                      width: `${(state.audioLevel * 100)}%`,
                      backgroundColor: state.audioLevel > 0.1 ? '#4CAF50' : '#666',
                      height: '6px',
                      borderRadius: '3px',
                      transition: 'width 0.1s ease'
                    }}
                  />
                </div>
                <span className="audio-level-text">
                  {state.audioLevel > 0.1 ? '🎤 Lytter...' : '🔇 Ingen lyd'}
                  <span style={{ marginLeft: '10px', fontSize: '12px', opacity: 0.7 }}>
                    Level: {Math.round(state.audioLevel * 100)}%
                  </span>
                </span>
              </div>
            )}
            <div className="session-controls__meta">
              <span>Node 18 · OpenAI realtime-2024-10-01 · PCM16</span>
              {state.error && <span className="session-error">{state.error}</span>}
            </div>
          </div>

          <div className="example-questions">
            <h3>💬 Eksempel spørgsmål du kan stille:</h3>
            <div className="questions-grid">
              <div className="question-category">
                <h4>📞 Kontakt & Åbningstider</h4>
                <ul>
                  <li>"Hvad er telefonnummeret til Kalundborg Kommune?"</li>
                  <li>"Hvornår har borgerservice åbent?"</li>
                  <li>"Hvor ligger borgerservice?"</li>
                </ul>
              </div>

              <div className="question-category">
                <h4>🗑️ Affald & Genbrug</h4>
                <ul>
                  <li>"Hvornår har genbrugspladsen åbent?"</li>
                  <li>"Hvor ligger genbrugspladsen?"</li>
                  <li>"Hvem står for affaldsindsamling?"</li>
                </ul>
              </div>

              <div className="question-category">
                <h4>🏥 Sundhed</h4>
                <ul>
                  <li>"Hvor kan jeg finde en læge?"</li>
                  <li>"Hvad er nummeret til nærklinikken?"</li>
                  <li>"Hvor er der tandlæger?"</li>
                </ul>
              </div>

              <div className="question-category">
                <h4>🏫 Uddannelse</h4>
                <ul>
                  <li>"Hvilke skoler er der i Kalundborg?"</li>
                  <li>"Hvor mange børnehaver er der?"</li>
                  <li>"Hvilke uddannelser kan man tage?"</li>
                </ul>
              </div>

              <div className="question-category">
                <h4>🏗️ Byggeri & Tilladelser</h4>
                <ul>
                  <li>"Hvordan ansøger jeg om byggetilladelse?"</li>
                  <li>"Hvor søger jeg byggetilladelse?"</li>
                  <li>"Hvem kontakter jeg ved byggesager?"</li>
                </ul>
              </div>

              <div className="question-category">
                <h4>🚌 Transport</h4>
                <ul>
                  <li>"Hvilke buslinjer kører i Kalundborg?"</li>
                  <li>"Hvordan kommer jeg til København?"</li>
                  <li>"Hvor er banegården?"</li>
                </ul>
              </div>

              <div className="question-category">
                <h4>🎭 Kultur & Fritid</h4>
                <ul>
                  <li>"Hvor mange kulturelle arrangementer er der?"</li>
                  <li>"Hvor ligger biblioteket?"</li>
                  <li>"Hvad sker der kulturelt i Kalundborg?"</li>
                </ul>
              </div>

              <div className="question-category">
                <h4>💼 Erhverv & Job</h4>
                <ul>
                  <li>"Hvor kan jeg få hjælp til jobsøgning?"</li>
                  <li>"Hvem hjælper med erhvervsudvikling?"</li>
                  <li>"Hvor mange indbyggere har Kalundborg?"</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <aside className="inspector-panel">
          <div className="inspector-header">
            <div>
              <h2>Diagnosticering</h2>
              <p>Streaming logs fra backend og klient (seneste {MAX_LOG_ITEMS}).</p>
            </div>
            <button type="button" onClick={clearLogs}>Ryd log</button>
          </div>
          <div className="inspector-body" ref={inspectorRef}>
            {logs.length === 0 ? (
              <p className="inspector-empty">Loggen er tom.</p>
            ) : (
              logs.map(entry => (
                <div key={entry.id} className={`log log--${entry.level}`}>
                  <div className="log__meta">
                    <span>{entry.level.toUpperCase()}</span>
                    <time>{formatTime(entry.timestamp)}</time>
                  </div>
                  <p className="log__message">{entry.message}</p>
                  {entry.meta && (
                    <pre className="log__detail">{entry.meta}</pre>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default VoiceApp;

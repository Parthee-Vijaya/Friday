import { useState, useEffect, useRef } from 'react';

interface PerformanceMetrics {
  audioLatency: number;
  responseTime: number;
  messageCount: number;
  reconnections: number;
  errorCount: number;
  avgResponseTime: number;
}

interface PerformanceMonitorProps {
  isVisible: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible,
  onMetricsUpdate
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    audioLatency: 0,
    responseTime: 0,
    messageCount: 0,
    reconnections: 0,
    errorCount: 0,
    avgResponseTime: 0
  });

  const responseTimes = useRef<number[]>([]);
  const lastSpeechTime = useRef<number>(0);
  const lastResponseTime = useRef<number>(0);

  // Listen for custom performance events
  useEffect(() => {
    const handlePerformanceEvent = (event: CustomEvent) => {
      const { type, timestamp, data } = event.detail;

      setMetrics(prev => {
        const newMetrics = { ...prev };

        switch (type) {
          case 'speech_started':
            lastSpeechTime.current = timestamp;
            break;

          case 'response_started':
            lastResponseTime.current = timestamp;
            if (lastSpeechTime.current > 0) {
              const responseTime = timestamp - lastSpeechTime.current;
              responseTimes.current.push(responseTime);

              // Keep only last 20 measurements
              if (responseTimes.current.length > 20) {
                responseTimes.current.shift();
              }

              const avgResponseTime = responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length;

              newMetrics.responseTime = responseTime;
              newMetrics.avgResponseTime = Math.round(avgResponseTime);
            }
            break;

          case 'audio_latency':
            newMetrics.audioLatency = data.latency;
            break;

          case 'message_sent':
            newMetrics.messageCount = prev.messageCount + 1;
            break;

          case 'reconnection':
            newMetrics.reconnections = prev.reconnections + 1;
            break;

          case 'error':
            newMetrics.errorCount = prev.errorCount + 1;
            break;
        }

        onMetricsUpdate?.(newMetrics);
        return newMetrics;
      });
    };

    window.addEventListener('performance-metric', handlePerformanceEvent);

    return () => {
      window.removeEventListener('performance-metric', handlePerformanceEvent);
    };
  }, [onMetricsUpdate]);

  // Utility function to format time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(26, 26, 46, 0.95)',
      color: '#e5e5e5',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #2d2d44',
      fontSize: '11px',
      fontFamily: 'monospace',
      minWidth: '200px',
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        fontWeight: 'bold',
        marginBottom: '8px',
        color: '#ffffff',
        borderBottom: '1px solid #2d2d44',
        paddingBottom: '4px'
      }}>
        Performance Metrics
      </div>

      <div style={{ display: 'grid', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Audio Latency:</span>
          <span style={{ color: metrics.audioLatency > 200 ? '#ff4444' : '#44ff44' }}>
            {formatTime(metrics.audioLatency)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Response Time:</span>
          <span style={{ color: metrics.responseTime > 3000 ? '#ff4444' : '#44ff44' }}>
            {formatTime(metrics.responseTime)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Avg Response:</span>
          <span style={{ color: metrics.avgResponseTime > 2000 ? '#ff8844' : '#44ff44' }}>
            {formatTime(metrics.avgResponseTime)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Messages:</span>
          <span>{metrics.messageCount}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Reconnects:</span>
          <span style={{ color: metrics.reconnections > 0 ? '#ff8844' : '#44ff44' }}>
            {metrics.reconnections}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Errors:</span>
          <span style={{ color: metrics.errorCount > 0 ? '#ff4444' : '#44ff44' }}>
            {metrics.errorCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
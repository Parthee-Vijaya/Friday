import { useEffect, useRef, useState } from 'react';

interface VUMeterProps {
  audioContext: AudioContext | null;
  source: MediaStreamAudioSourceNode | null;
  isActive: boolean;
}

const VUMeter: React.FC<VUMeterProps> = ({ audioContext, source, isActive }) => {
  const [level, setLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();
  const peakHoldRef = useRef<number>(0);
  const peakDecayRef = useRef<number>(0);

  useEffect(() => {
    if (!audioContext || !source || !isActive) {
      setLevel(0);
      setPeakLevel(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    // Create analyzer node
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.3;
    source.connect(analyzer);
    analyzerRef.current = analyzer;

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);

    const updateMeter = () => {
      animationRef.current = requestAnimationFrame(updateMeter);

      analyzer.getByteFrequencyData(dataArray);

      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedLevel = Math.min(rms / 128, 1); // Normalize to 0-1

      setLevel(normalizedLevel);

      // Update peak with hold and decay
      if (normalizedLevel > peakHoldRef.current) {
        peakHoldRef.current = normalizedLevel;
        peakDecayRef.current = Date.now() + 1000; // Hold for 1 second
      } else if (Date.now() > peakDecayRef.current) {
        peakHoldRef.current *= 0.95; // Slow decay
      }

      setPeakLevel(peakHoldRef.current);
    };

    updateMeter();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (analyzerRef.current) {
        analyzerRef.current.disconnect();
      }
    };
  }, [audioContext, source, isActive]);

  // Calculate color based on level
  const getColor = (value: number) => {
    if (value < 0.5) return '#44ff44'; // Green
    if (value < 0.75) return '#ffff44'; // Yellow
    if (value < 0.9) return '#ff8844'; // Orange
    return '#ff4444'; // Red
  };

  // Generate meter segments
  const segments = 20;
  const activeSegments = Math.floor(level * segments);
  const peakSegment = Math.floor(peakLevel * segments);

  return (
    <div className="vu-meter-container" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px',
      background: '#1a1a2e',
      borderRadius: '8px',
      border: '1px solid #2d2d44'
    }}>
      <span style={{
        color: '#a0a0a0',
        fontSize: '12px',
        width: '40px',
        textAlign: 'right'
      }}>
        {isActive ? 'LIVE' : 'OFF'}
      </span>

      <div className="vu-meter" style={{
        display: 'flex',
        gap: '2px',
        flex: 1,
        height: '20px',
        alignItems: 'center'
      }}>
        {Array.from({ length: segments }, (_, i) => {
          const segmentValue = (i + 1) / segments;
          const isActive = i < activeSegments;
          const isPeak = i === peakSegment - 1;

          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: isPeak ? '20px' : isActive ? '16px' : '8px',
                background: isPeak ? '#ffffff' : isActive ? getColor(segmentValue) : '#2d2d44',
                borderRadius: '2px',
                transition: 'all 0.05s ease',
                boxShadow: isActive ? `0 0 4px ${getColor(segmentValue)}` : 'none'
              }}
            />
          );
        })}
      </div>

      <div style={{
        color: '#a0a0a0',
        fontSize: '11px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        minWidth: '50px'
      }}>
        <span>{Math.round(level * 100)}%</span>
        <span style={{ color: '#666' }}>Peak: {Math.round(peakLevel * 100)}%</span>
      </div>
    </div>
  );
};

export default VUMeter;
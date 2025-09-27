import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioContext: AudioContext | null;
  source: MediaStreamAudioSourceNode | null;
  isActive: boolean;
  mode: 'input' | 'output';
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioContext,
  source,
  isActive,
  mode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioContext || !source || !isActive || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create analyzer node
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.8;
    source.connect(analyzer);
    analyzerRef.current = analyzer;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyzer.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.fillStyle = mode === 'input' ? '#1a1a2e' : '#0f0f23';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frequency bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height / 2;

        // Dynamic colors based on intensity
        const intensity = dataArray[i] / 255;
        const hue = mode === 'input' ? 200 : 280; // Blue for input, purple for output
        const saturation = 50 + intensity * 50;
        const lightness = 30 + intensity * 40;

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth, barHeight);

        x += barWidth + 1;
      }

      // Draw center line
      ctx.strokeStyle = '#2d2d44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (analyzerRef.current) {
        analyzerRef.current.disconnect();
      }
    };
  }, [audioContext, source, isActive, mode]);

  return (
    <canvas
      ref={canvasRef}
      className={`audio-visualizer ${mode}`}
      style={{
        width: '100%',
        height: mode === 'input' ? '60px' : '80px',
        borderRadius: '8px',
        marginTop: '10px',
        background: '#0f0f23',
        border: '1px solid #2d2d44'
      }}
    />
  );
};

export default AudioVisualizer;
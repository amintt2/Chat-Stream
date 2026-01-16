/**
 * Create a synthetic video stream using Canvas API
 * Generates SMPTE color bars with timestamp overlay
 */
export function createColorBarsStream(
  width: number = 1280,
  height: number = 720,
  fps: number = 30
): MediaStream & { _cleanup?: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }

  // SMPTE color bars (standard test pattern)
  const colors = [
    '#FFFFFF', // White
    '#FFFF00', // Yellow
    '#00FFFF', // Cyan
    '#00FF00', // Green
    '#FF00FF', // Magenta
    '#FF0000', // Red
    '#0000FF', // Blue
    '#000000', // Black
  ];

  let frameCount = 0;
  const startTime = Date.now();

  // Animation function to update canvas
  const drawFrame = () => {
    // Draw color bars
    const barWidth = width / colors.length;
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(i * barWidth, 0, barWidth, height * 0.75);
    });

    // Draw bottom section (black background for text)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, height * 0.75, width, height * 0.25);

    // Draw timestamp and info
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px monospace';
    ctx.textBaseline = 'top';

    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    ctx.fillText(`Time: ${timestamp}`, 20, height * 0.75 + 20);
    ctx.fillText(`Frame: ${frameCount}`, 20, height * 0.75 + 60);
    ctx.fillText(`FPS: ${fps} | Elapsed: ${elapsedSeconds}s`, 20, height * 0.75 + 100);

    // Draw resolution info
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${width}x${height}`, width - 200, height * 0.75 + 20);

    frameCount++;
  };

  // Start animation loop
  const interval = setInterval(drawFrame, 1000 / fps);

  // Initial frame
  drawFrame();

  // Capture stream from canvas
  const stream = canvas.captureStream(fps) as MediaStream & { _cleanup?: () => void };

  // Add cleanup function
  stream._cleanup = () => {
    clearInterval(interval);
  };

  return stream;
}

/**
 * Stop and cleanup a synthetic video stream
 */
export function stopSyntheticStream(stream: MediaStream & { _cleanup?: () => void }) {
  // Stop all tracks
  stream.getTracks().forEach((track) => track.stop());

  // Call custom cleanup if available
  if (stream._cleanup) {
    stream._cleanup();
  }
}

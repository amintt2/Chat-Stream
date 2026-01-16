export class BandwidthEstimator {
  private samples: Array<{ bytes: number; duration: number }> = [];
  private maxSamples = 20;

  addSample(bytes: number, durationMs: number) {
    this.samples.push({ bytes, duration: durationMs });

    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  // Returns estimated bandwidth in kbps
  getEstimate(): number {
    if (this.samples.length === 0) return 0;

    const totalBytes = this.samples.reduce((sum, s) => sum + s.bytes, 0);
    const totalDuration = this.samples.reduce((sum, s) => sum + s.duration, 0);

    if (totalDuration === 0) return 0;

    // bytes per ms -> kbps
    const bytesPerMs = totalBytes / totalDuration;
    return Math.round(bytesPerMs * 8); // kbps
  }

  // Estimate if we can handle a certain bitrate
  canHandle(requiredKbps: number): boolean {
    const available = this.getEstimate();
    return available >= requiredKbps * 1.2; // 20% margin
  }

  clear() {
    this.samples = [];
  }
}

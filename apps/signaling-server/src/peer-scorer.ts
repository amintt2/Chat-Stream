interface PeerStats {
  uploadBandwidth: number;
  downloadBandwidth: number;
  latency: number;
  packetsLost: number;
  lastUpdated: number;
}

export class PeerScorer {
  private stats: Map<string, PeerStats> = new Map();

  updateStats(peerId: string, stats: Partial<PeerStats>) {
    const existing = this.stats.get(peerId) || {
      uploadBandwidth: 0,
      downloadBandwidth: 0,
      latency: 100,
      packetsLost: 0,
      lastUpdated: 0,
    };

    this.stats.set(peerId, {
      ...existing,
      ...stats,
      lastUpdated: Date.now(),
    });
  }

  getScore(peerId: string): number {
    const stats = this.stats.get(peerId);
    if (!stats) return 50; // Default score

    // Simple scoring algorithm
    const bandwidthScore = Math.min(100, (stats.uploadBandwidth / 1000) * 50);
    const latencyScore = Math.max(0, 100 - stats.latency);
    const lossScore = Math.max(0, 100 - stats.packetsLost * 10);

    return Math.round((bandwidthScore + latencyScore + lossScore) / 3);
  }

  getStats(peerId: string): PeerStats | undefined {
    return this.stats.get(peerId);
  }

  cleanup() {
    const now = Date.now();
    const timeout = 60000; // 1 minute

    this.stats.forEach((stats, peerId) => {
      if (now - stats.lastUpdated > timeout) {
        this.stats.delete(peerId);
      }
    });
  }
}

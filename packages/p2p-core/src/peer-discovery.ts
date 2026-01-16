import type { PeerInfo, PeerScore } from '@p2p-stream/types';

export class PeerDiscovery {
  // Calculate peer score (0-100)
  static calculateScore(peer: PeerInfo): PeerScore {
    // Bandwidth score (assume 1000 kbps is "excellent")
    const bandwidthScore = Math.min(100, (peer.uploadBandwidth / 1000) * 100);

    // Stability score (connected for 5+ minutes = max score)
    const connectedMinutes = (Date.now() - peer.connectedAt) / 60000;
    const stabilityScore = Math.min(100, connectedMinutes * 20);

    // Latency score (inverse, 50ms = 100, 500ms = 0)
    const latencyScore = Math.max(0, 100 - (peer.latency / 5));

    // Capacity score (fewer connections = more capacity)
    const maxConnections = 10;
    const capacityScore = Math.max(0, ((maxConnections - peer.connections.length) / maxConnections) * 100);

    // Weighted total
    const total =
      bandwidthScore * 0.35 +
      stabilityScore * 0.25 +
      latencyScore * 0.25 +
      capacityScore * 0.15;

    return {
      peerId: peer.id,
      bandwidth: Math.round(bandwidthScore),
      stability: Math.round(stabilityScore),
      latency: Math.round(latencyScore),
      capacity: Math.round(capacityScore),
      total: Math.round(total),
    };
  }

  // Select best peers to connect to
  static selectPeers(
    availablePeers: PeerInfo[],
    currentConnections: string[],
    maxConnections: number
  ): PeerInfo[] {
    // Filter out already connected peers
    const candidates = availablePeers.filter(
      p => !currentConnections.includes(p.id)
    );

    // Score and sort
    const scored = candidates
      .map(p => ({ peer: p, score: this.calculateScore(p) }))
      .sort((a, b) => b.score.total - a.score.total);

    // Select top N
    const slotsAvailable = maxConnections - currentConnections.length;
    return scored.slice(0, slotsAvailable).map(s => s.peer);
  }

  // Determine peer role based on score
  static assignRole(score: PeerScore): 'super-seed' | 'relay' | 'leaf' {
    if (score.total >= 75 && score.bandwidth >= 70) {
      return 'super-seed';
    } else if (score.total >= 50) {
      return 'relay';
    } else {
      return 'leaf';
    }
  }
}

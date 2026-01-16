export interface PeerInfo {
  id: string;
  streamId: string;
  score: number;
  uploadBandwidth: number; // kbps
  downloadBandwidth: number;
  latency: number; // ms
  connectedAt: number;
  isStreamer: boolean;
  isSuperSeed: boolean;
  chunksAvailable: number[];
  connections: string[]; // peer IDs this peer is connected to
}

export interface PeerScore {
  peerId: string;
  bandwidth: number; // 0-100
  stability: number; // 0-100 (time connected)
  latency: number; // 0-100 (inverse)
  capacity: number; // 0-100 (CPU/available slots)
  total: number; // weighted average
}

export type PeerRole = 'streamer' | 'super-seed' | 'relay' | 'leaf';

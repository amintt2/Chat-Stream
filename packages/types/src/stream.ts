export interface Stream {
  id: string;
  title: string;
  streamerId: string;
  streamerName: string;
  viewerCount: number;
  startedAt: number;
  thumbnail?: string;
  isLive: boolean;
}

export interface StreamConfig {
  chunkDuration: number; // seconds (default: 2)
  bufferSize: number; // seconds (default: 10)
  maxPeerConnections: number; // default: 5
  targetLatency: number; // seconds (default: 5)
}

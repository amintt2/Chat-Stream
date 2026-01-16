export interface Chunk {
  index: number;
  streamId: string;
  data: ArrayBuffer;
  timestamp: number;
  duration: number; // ms
  isKeyframe: boolean;
}

export interface ChunkMap {
  streamId: string;
  peerId: string;
  availableChunks: number[]; // chunk indices
  lastChunk: number;
}

export interface ChunkRequest {
  streamId: string;
  chunkIndex: number;
  requesterId: string;
}

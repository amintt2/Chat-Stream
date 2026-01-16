import { EventEmitter } from 'events';
import type { Chunk } from '@p2p-stream/types';

export interface BufferManagerConfig {
  bufferDuration: number; // seconds (default: 10)
  chunkDuration: number; // seconds (default: 2)
}

export class BufferManager extends EventEmitter {
  private chunks: Map<number, Chunk> = new Map();
  private bufferDuration: number;
  private chunkDuration: number;
  private currentPlayIndex: number = 0;
  private latestChunkIndex: number = -1;

  constructor(config: BufferManagerConfig) {
    super();
    this.bufferDuration = config.bufferDuration;
    this.chunkDuration = config.chunkDuration;
  }

  addChunk(chunk: Chunk) {
    this.chunks.set(chunk.index, chunk);

    if (chunk.index > this.latestChunkIndex) {
      this.latestChunkIndex = chunk.index;
    }

    // Clean old chunks (keep buffer + some extra)
    const maxChunksToKeep = Math.ceil((this.bufferDuration * 2) / this.chunkDuration);
    const oldestToKeep = this.latestChunkIndex - maxChunksToKeep;

    this.chunks.forEach((_, index) => {
      if (index < oldestToKeep) {
        this.chunks.delete(index);
      }
    });

    this.emit('chunk-added', chunk.index);
    this.checkBufferHealth();
  }

  getChunk(index: number): Chunk | undefined {
    return this.chunks.get(index);
  }

  hasChunk(index: number): boolean {
    return this.chunks.has(index);
  }

  getAvailableChunkIndices(): number[] {
    return Array.from(this.chunks.keys()).sort((a, b) => a - b);
  }

  getMissingChunks(): number[] {
    const missing: number[] = [];
    const targetBufferChunks = Math.ceil(this.bufferDuration / this.chunkDuration);

    for (let i = this.currentPlayIndex; i < this.currentPlayIndex + targetBufferChunks; i++) {
      if (!this.chunks.has(i) && i <= this.latestChunkIndex) {
        missing.push(i);
      }
    }

    return missing;
  }

  getNextChunkToPlay(): Chunk | null {
    const chunk = this.chunks.get(this.currentPlayIndex);
    if (chunk) {
      this.currentPlayIndex++;
      return chunk;
    }
    return null;
  }

  getBufferHealth(): {
    bufferedSeconds: number;
    targetSeconds: number;
    percentage: number;
    missingChunks: number[];
  } {
    const bufferedChunks = this.getAvailableChunkIndices()
      .filter(i => i >= this.currentPlayIndex)
      .length;
    const bufferedSeconds = bufferedChunks * this.chunkDuration;
    const percentage = Math.min(100, (bufferedSeconds / this.bufferDuration) * 100);

    return {
      bufferedSeconds,
      targetSeconds: this.bufferDuration,
      percentage,
      missingChunks: this.getMissingChunks(),
    };
  }

  private checkBufferHealth() {
    const health = this.getBufferHealth();

    if (health.percentage < 50) {
      this.emit('buffer-low', health);
    } else if (health.percentage >= 90) {
      this.emit('buffer-healthy', health);
    }

    if (health.missingChunks.length > 0) {
      this.emit('chunks-needed', health.missingChunks);
    }
  }

  setPlayPosition(chunkIndex: number) {
    this.currentPlayIndex = chunkIndex;
  }

  clear() {
    this.chunks.clear();
    this.currentPlayIndex = 0;
    this.latestChunkIndex = -1;
  }
}

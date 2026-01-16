import { EventEmitter } from 'events';
import type { Chunk } from '@p2p-stream/types';

export class ChunkManager extends EventEmitter {
  private mediaRecorder: MediaRecorder | null = null;
  private chunkIndex: number = 0;
  private streamId: string;
  private chunkDuration: number;

  constructor(streamId: string, chunkDuration: number = 2000) {
    super();
    this.streamId = streamId;
    this.chunkDuration = chunkDuration;
  }

  // For streamer: start capturing from MediaStream
  startCapturing(stream: MediaStream) {
    const options = { mimeType: 'video/webm;codecs=vp8,opus' };

    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      // Fallback
      options.mimeType = 'video/webm';
    }

    this.mediaRecorder = new MediaRecorder(stream, options);

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const arrayBuffer = await event.data.arrayBuffer();

        const chunk: Chunk = {
          index: this.chunkIndex++,
          streamId: this.streamId,
          data: arrayBuffer,
          timestamp: Date.now(),
          duration: this.chunkDuration,
          isKeyframe: this.chunkIndex % 5 === 0, // Every 5th chunk (simplified)
        };

        this.emit('chunk-created', chunk);
      }
    };

    this.mediaRecorder.start(this.chunkDuration);
  }

  stopCapturing() {
    this.mediaRecorder?.stop();
    this.mediaRecorder = null;
  }

  // For viewers: reassemble chunks into playable stream
  static chunksToBlob(chunks: Chunk[]): Blob {
    const sortedChunks = chunks.sort((a, b) => a.index - b.index);
    const buffers = sortedChunks.map(c => c.data);
    return new Blob(buffers, { type: 'video/webm' });
  }
}

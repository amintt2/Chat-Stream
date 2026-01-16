import SimplePeer, { Instance as PeerInstance, SignalData } from 'simple-peer';
import { EventEmitter } from 'events';
import type { Chunk, SignalingMessage } from '@p2p-stream/types';

export interface PeerConnectionConfig {
  initiator: boolean;
  peerId: string;
  localPeerId: string;
  streamId: string;
  onSignal: (signal: SignalingMessage) => void;
}

export class PeerConnection extends EventEmitter {
  private peer: PeerInstance | null = null;
  private peerId: string;
  private localPeerId: string;
  private streamId: string;
  private connected = false;
  private onSignal: (signal: SignalingMessage) => void;

  constructor(config: PeerConnectionConfig) {
    super();
    this.peerId = config.peerId;
    this.localPeerId = config.localPeerId;
    this.streamId = config.streamId;
    this.onSignal = config.onSignal;

    this.peer = new SimplePeer({
      initiator: config.initiator,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    this.setupPeerEvents();
  }

  private setupPeerEvents() {
    if (!this.peer) return;

    this.peer.on('signal', (data) => {
      this.onSignal({
        type: data.type === 'offer' ? 'offer' : data.type === 'answer' ? 'answer' : 'ice-candidate',
        payload: { sdp: data, targetPeerId: this.peerId },
        from: this.localPeerId,
        to: this.peerId,
        streamId: this.streamId,
        timestamp: Date.now(),
      });
    });

    this.peer.on('connect', () => {
      this.connected = true;
      this.emit('connected', this.peerId);
    });

    this.peer.on('data', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.emit('data', message);
      } catch {
        // Binary data (chunk)
        this.emit('chunk', data);
      }
    });

    this.peer.on('close', () => {
      this.connected = false;
      this.emit('disconnected', this.peerId);
    });

    this.peer.on('error', (err) => {
      this.emit('error', err);
    });
  }

  signal(data: SignalData) {
    this.peer?.signal(data);
  }

  send(data: string | Buffer | Chunk) {
    if (!this.connected || !this.peer) return false;

    if (typeof data === 'string') {
      this.peer.send(data);
    } else if (Buffer.isBuffer(data)) {
      this.peer.send(data);
    } else {
      this.peer.send(JSON.stringify(data));
    }
    return true;
  }

  sendChunk(chunk: Chunk) {
    if (!this.connected || !this.peer) return false;
    // Send metadata first
    this.peer.send(JSON.stringify({
      type: 'chunk-meta',
      index: chunk.index,
      timestamp: chunk.timestamp,
      duration: chunk.duration,
      isKeyframe: chunk.isKeyframe,
    }));
    // Then send binary data
    this.peer.send(Buffer.from(chunk.data));
    return true;
  }

  isConnected() {
    return this.connected;
  }

  getPeerId() {
    return this.peerId;
  }

  destroy() {
    this.peer?.destroy();
    this.peer = null;
    this.connected = false;
  }
}

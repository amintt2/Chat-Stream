import { EventEmitter } from 'events';
import { PeerConnection } from './peer-connection';
import type { SignalingMessage, Chunk } from '@p2p-stream/types';

export interface MeshNetworkConfig {
  localPeerId: string;
  streamId: string;
  isStreamer: boolean;
  maxConnections: number;
  onSignal: (message: SignalingMessage) => void;
}

export class MeshNetwork extends EventEmitter {
  private peers: Map<string, PeerConnection> = new Map();
  private peerScores: Map<string, number> = new Map();
  private localPeerId: string;
  private streamId: string;
  private isStreamer: boolean;
  private maxConnections: number;
  private onSignal: (message: SignalingMessage) => void;
  private chunkMap: Map<string, number[]> = new Map(); // peerId -> chunks they have

  constructor(config: MeshNetworkConfig) {
    super();
    this.localPeerId = config.localPeerId;
    this.streamId = config.streamId;
    this.isStreamer = config.isStreamer;
    this.maxConnections = config.maxConnections;
    this.onSignal = config.onSignal;
  }

  // Connect to a new peer
  connectToPeer(peerId: string, initiator: boolean = true): PeerConnection {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId)!;
    }

    const connection = new PeerConnection({
      initiator,
      peerId,
      localPeerId: this.localPeerId,
      streamId: this.streamId,
      onSignal: this.onSignal,
    });

    connection.on('connected', () => {
      this.emit('peer-connected', peerId);
      // Request their chunk map
      connection.send(JSON.stringify({ type: 'request-chunk-map' }));
    });

    connection.on('disconnected', () => {
      this.peers.delete(peerId);
      this.peerScores.delete(peerId);
      this.chunkMap.delete(peerId);
      this.emit('peer-disconnected', peerId);
    });

    connection.on('data', (message: any) => {
      this.handlePeerMessage(peerId, message);
    });

    connection.on('chunk', (data: Buffer) => {
      this.emit('chunk-received', { peerId, data });
    });

    this.peers.set(peerId, connection);
    return connection;
  }

  // Handle incoming signaling message
  handleSignal(message: SignalingMessage) {
    const { from, payload } = message;

    if (message.type === 'offer') {
      // Someone wants to connect to us
      const connection = this.connectToPeer(from, false);
      connection.signal((payload as any).sdp);
    } else if (message.type === 'answer' || message.type === 'ice-candidate') {
      const connection = this.peers.get(from);
      connection?.signal((payload as any).sdp || (payload as any).candidate);
    }
  }

  private handlePeerMessage(peerId: string, message: any) {
    switch (message.type) {
      case 'chunk-map':
        this.chunkMap.set(peerId, message.chunks);
        this.emit('chunk-map-updated', { peerId, chunks: message.chunks });
        break;

      case 'request-chunk-map':
        const myChunks = this.emit('get-local-chunks');
        this.sendToPeer(peerId, { type: 'chunk-map', chunks: myChunks });
        break;

      case 'request-chunk':
        this.emit('chunk-requested', { peerId, chunkIndex: message.chunkIndex });
        break;

      case 'chunk-meta':
        this.emit('chunk-meta-received', { peerId, meta: message });
        break;

      default:
        this.emit('message', { peerId, message });
    }
  }

  // Send to specific peer
  sendToPeer(peerId: string, data: any) {
    const connection = this.peers.get(peerId);
    return connection?.send(JSON.stringify(data)) ?? false;
  }

  // Broadcast to all connected peers
  broadcast(data: any) {
    const message = JSON.stringify(data);
    this.peers.forEach((connection) => {
      connection.send(message);
    });
  }

  // Send chunk to specific peer
  sendChunkToPeer(peerId: string, chunk: Chunk) {
    const connection = this.peers.get(peerId);
    return connection?.sendChunk(chunk) ?? false;
  }

  // Broadcast chunk to all peers (for streamer/super-seeds)
  broadcastChunk(chunk: Chunk) {
    this.peers.forEach((connection) => {
      connection.sendChunk(chunk);
    });
  }

  // Get best peers to request chunks from
  getBestPeersForChunk(chunkIndex: number, count: number = 3): string[] {
    const peersWithChunk: Array<{ peerId: string; score: number }> = [];

    this.chunkMap.forEach((chunks, peerId) => {
      if (chunks.includes(chunkIndex)) {
        peersWithChunk.push({
          peerId,
          score: this.peerScores.get(peerId) ?? 50,
        });
      }
    });

    return peersWithChunk
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((p) => p.peerId);
  }

  // Request chunk from best available peer
  requestChunk(chunkIndex: number): boolean {
    const bestPeers = this.getBestPeersForChunk(chunkIndex);
    if (bestPeers.length === 0) return false;

    // Request from top peer, keep others as backup
    this.sendToPeer(bestPeers[0], { type: 'request-chunk', chunkIndex });
    return true;
  }

  updatePeerScore(peerId: string, score: number) {
    this.peerScores.set(peerId, score);
  }

  getConnectedPeerCount(): number {
    return this.peers.size;
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  destroy() {
    this.peers.forEach((connection) => connection.destroy());
    this.peers.clear();
    this.peerScores.clear();
    this.chunkMap.clear();
  }
}

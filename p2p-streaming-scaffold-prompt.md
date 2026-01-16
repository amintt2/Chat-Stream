# P2P Streaming Platform - Complete Scaffold Prompt

## Project Overview

Create a P2P live streaming platform (like a simplified Twitch) where viewers act as relays to distribute the stream, minimizing server costs. The architecture uses WebRTC for peer-to-peer connections and HLS for chunked video delivery.

---

## Technical Stack

- **Monorepo**: Turborepo
- **Web App**: Next.js 14 (App Router) with PWA support
- **Styling**: Tailwind CSS + shadcn/ui
- **P2P**: simple-peer (WebRTC) + custom mesh logic
- **Signaling**: Socket.io (or PartyKit for serverless)
- **Video**: HLS.js + MediaRecorder API for streaming
- **Language**: TypeScript throughout
- **Package Manager**: pnpm

---

## Directory Structure to Create

```
p2p-stream/
├── apps/
│   ├── web/                          # Next.js 14 application
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Homepage - list of live streams
│   │   │   ├── globals.css
│   │   │   ├── watch/
│   │   │   │   └── [streamId]/
│   │   │   │       └── page.tsx      # Viewer page
│   │   │   ├── broadcast/
│   │   │   │   └── page.tsx          # Streamer page
│   │   │   └── api/
│   │   │       └── signaling/
│   │   │           └── route.ts      # WebSocket upgrade endpoint (if not using external)
│   │   ├── components/
│   │   │   ├── video-player.tsx      # P2P-enabled video player
│   │   │   ├── broadcaster.tsx       # Capture & stream component
│   │   │   ├── peer-stats.tsx        # Debug: show P2P connections
│   │   │   ├── stream-card.tsx       # Stream preview card
│   │   │   └── chat.tsx              # Simple P2P chat (bonus)
│   │   ├── hooks/
│   │   │   ├── use-p2p-viewer.ts     # Hook for viewers
│   │   │   ├── use-p2p-broadcaster.ts # Hook for streamers
│   │   │   └── use-signaling.ts      # WebSocket connection hook
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── public/
│   │   │   └── manifest.json         # PWA manifest
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── signaling-server/             # Standalone signaling server
│       ├── src/
│       │   ├── index.ts              # Entry point
│       │   ├── tracker.ts            # Track peers, streams, chunks
│       │   ├── room-manager.ts       # Manage stream rooms
│       │   └── peer-scorer.ts        # Score peers for optimal routing
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── p2p-core/                     # Core P2P logic (shared)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── mesh-network.ts       # Mesh topology management
│   │   │   ├── peer-connection.ts    # WebRTC wrapper
│   │   │   ├── chunk-manager.ts      # HLS chunk distribution
│   │   │   ├── buffer-manager.ts     # 10s buffer management
│   │   │   ├── peer-discovery.ts     # Find optimal peers
│   │   │   ├── bandwidth-estimator.ts # Measure peer capacity
│   │   │   └── types.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                           # Shared UI components
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ... (shadcn components)
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── peer.ts
│   │   │   ├── stream.ts
│   │   │   ├── signaling.ts
│   │   │   └── chunk.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── config/                       # Shared configs
│       ├── eslint/
│       │   └── index.js
│       ├── typescript/
│       │   └── base.json
│       └── package.json
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
├── .npmrc
└── README.md
```

---

## Step-by-Step Instructions

### Step 1: Initialize Monorepo Root

Create the root `package.json`:

```json
{
  "name": "p2p-stream",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "dev:web": "turbo dev --filter=web",
    "dev:server": "turbo dev --filter=signaling-server"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    }
  }
}
```

Create `.npmrc`:

```
auto-install-peers=true
strict-peer-dependencies=false
```

---

### Step 2: Create packages/types

`packages/types/package.json`:

```json
{
  "name": "@p2p-stream/types",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/"
  }
}
```

`packages/types/src/index.ts`:

```typescript
export * from './peer';
export * from './stream';
export * from './signaling';
export * from './chunk';
```

`packages/types/src/peer.ts`:

```typescript
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
```

`packages/types/src/stream.ts`:

```typescript
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
```

`packages/types/src/signaling.ts`:

```typescript
export type SignalingMessageType =
  | 'join-stream'
  | 'leave-stream'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'peer-list'
  | 'chunk-map'
  | 'request-chunk'
  | 'peer-disconnected'
  | 'stream-ended'
  | 'heartbeat';

export interface SignalingMessage {
  type: SignalingMessageType;
  payload: unknown;
  from: string;
  to?: string; // undefined = broadcast
  streamId: string;
  timestamp: number;
}

export interface JoinStreamPayload {
  streamId: string;
  peerId: string;
  isStreamer: boolean;
}

export interface PeerListPayload {
  peers: Array<{
    id: string;
    score: number;
    chunksAvailable: number[];
  }>;
}

export interface OfferAnswerPayload {
  sdp: RTCSessionDescriptionInit;
  targetPeerId: string;
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
  targetPeerId: string;
}
```

`packages/types/src/chunk.ts`:

```typescript
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
```

---

### Step 3: Create packages/p2p-core

`packages/p2p-core/package.json`:

```json
{
  "name": "@p2p-stream/p2p-core",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@p2p-stream/types": "workspace:*",
    "simple-peer": "^9.11.1",
    "events": "^3.3.0"
  },
  "devDependencies": {
    "@types/simple-peer": "^9.11.8"
  }
}
```

`packages/p2p-core/src/index.ts`:

```typescript
export * from './mesh-network';
export * from './peer-connection';
export * from './chunk-manager';
export * from './buffer-manager';
export * from './peer-discovery';
export * from './bandwidth-estimator';
```

`packages/p2p-core/src/peer-connection.ts`:

```typescript
import SimplePeer, { Instance as PeerInstance } from 'simple-peer';
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

  signal(data: RTCSessionDescriptionInit | RTCIceCandidateInit) {
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
```

`packages/p2p-core/src/mesh-network.ts`:

```typescript
import { EventEmitter } from 'events';
import { PeerConnection } from './peer-connection';
import type { PeerInfo, SignalingMessage, Chunk, ChunkMap } from '@p2p-stream/types';

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
```

`packages/p2p-core/src/buffer-manager.ts`:

```typescript
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
```

`packages/p2p-core/src/chunk-manager.ts`:

```typescript
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
```

`packages/p2p-core/src/bandwidth-estimator.ts`:

```typescript
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
```

`packages/p2p-core/src/peer-discovery.ts`:

```typescript
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
```

---

### Step 4: Create apps/signaling-server

`apps/signaling-server/package.json`:

```json
{
  "name": "signaling-server",
  "version": "0.0.1",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@p2p-stream/types": "workspace:*",
    "socket.io": "^4.7.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  }
}
```

`apps/signaling-server/src/index.ts`:

```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './room-manager';
import { PeerScorer } from './peer-scorer';
import type { SignalingMessage, JoinStreamPayload } from '@p2p-stream/types';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
const peerScorer = new PeerScorer();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  let currentStreamId: string | null = null;
  let currentPeerId: string | null = null;

  socket.on('join-stream', (payload: JoinStreamPayload) => {
    const { streamId, peerId, isStreamer } = payload;
    currentStreamId = streamId;
    currentPeerId = peerId;

    // Join socket.io room
    socket.join(streamId);

    // Register with room manager
    roomManager.addPeer(streamId, {
      id: peerId,
      socketId: socket.id,
      isStreamer,
      joinedAt: Date.now(),
    });

    // If streamer, mark stream as live
    if (isStreamer) {
      roomManager.setStreamLive(streamId, true);
    }

    // Send current peer list to new peer
    const peers = roomManager.getPeers(streamId);
    const peerList = peers
      .filter(p => p.id !== peerId)
      .map(p => ({
        id: p.id,
        score: peerScorer.getScore(p.id),
        isStreamer: p.isStreamer,
      }));

    socket.emit('peer-list', { peers: peerList });

    // Notify others
    socket.to(streamId).emit('peer-joined', { peerId, isStreamer });

    console.log(`Peer ${peerId} joined stream ${streamId} (streamer: ${isStreamer})`);
  });

  socket.on('signal', (message: SignalingMessage) => {
    if (message.to) {
      // Direct message to specific peer
      const targetPeer = roomManager.getPeerByPeerId(message.streamId, message.to);
      if (targetPeer) {
        io.to(targetPeer.socketId).emit('signal', message);
      }
    } else {
      // Broadcast to room
      socket.to(message.streamId).emit('signal', message);
    }
  });

  socket.on('heartbeat', (data: { peerId: string; streamId: string; stats: any }) => {
    peerScorer.updateStats(data.peerId, data.stats);
  });

  socket.on('get-streams', () => {
    const streams = roomManager.getLiveStreams();
    socket.emit('streams-list', streams);
  });

  socket.on('disconnect', () => {
    if (currentStreamId && currentPeerId) {
      const wasStreamer = roomManager.isStreamer(currentStreamId, currentPeerId);
      roomManager.removePeer(currentStreamId, currentPeerId);

      // Notify room
      io.to(currentStreamId).emit('peer-left', { peerId: currentPeerId });

      // If streamer left, end stream
      if (wasStreamer) {
        roomManager.setStreamLive(currentStreamId, false);
        io.to(currentStreamId).emit('stream-ended');
      }

      console.log(`Peer ${currentPeerId} left stream ${currentStreamId}`);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
```

`apps/signaling-server/src/room-manager.ts`:

```typescript
interface PeerRecord {
  id: string;
  socketId: string;
  isStreamer: boolean;
  joinedAt: number;
}

interface StreamRoom {
  id: string;
  isLive: boolean;
  startedAt: number | null;
  peers: Map<string, PeerRecord>;
}

export class RoomManager {
  private rooms: Map<string, StreamRoom> = new Map();

  getOrCreateRoom(streamId: string): StreamRoom {
    if (!this.rooms.has(streamId)) {
      this.rooms.set(streamId, {
        id: streamId,
        isLive: false,
        startedAt: null,
        peers: new Map(),
      });
    }
    return this.rooms.get(streamId)!;
  }

  addPeer(streamId: string, peer: PeerRecord) {
    const room = this.getOrCreateRoom(streamId);
    room.peers.set(peer.id, peer);
  }

  removePeer(streamId: string, peerId: string) {
    const room = this.rooms.get(streamId);
    if (room) {
      room.peers.delete(peerId);
      
      // Clean up empty rooms
      if (room.peers.size === 0) {
        this.rooms.delete(streamId);
      }
    }
  }

  getPeers(streamId: string): PeerRecord[] {
    const room = this.rooms.get(streamId);
    return room ? Array.from(room.peers.values()) : [];
  }

  getPeerByPeerId(streamId: string, peerId: string): PeerRecord | undefined {
    return this.rooms.get(streamId)?.peers.get(peerId);
  }

  isStreamer(streamId: string, peerId: string): boolean {
    return this.rooms.get(streamId)?.peers.get(peerId)?.isStreamer ?? false;
  }

  setStreamLive(streamId: string, isLive: boolean) {
    const room = this.getOrCreateRoom(streamId);
    room.isLive = isLive;
    room.startedAt = isLive ? Date.now() : null;
  }

  getLiveStreams(): Array<{ id: string; viewerCount: number; startedAt: number }> {
    const liveStreams: Array<{ id: string; viewerCount: number; startedAt: number }> = [];
    
    this.rooms.forEach((room) => {
      if (room.isLive && room.startedAt) {
        liveStreams.push({
          id: room.id,
          viewerCount: room.peers.size - 1, // Exclude streamer
          startedAt: room.startedAt,
        });
      }
    });

    return liveStreams;
  }
}
```

`apps/signaling-server/src/peer-scorer.ts`:

```typescript
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
```

---

### Step 5: Create apps/web (Next.js)

`apps/web/package.json`:

```json
{
  "name": "web",
  "version": "0.0.1",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@p2p-stream/p2p-core": "workspace:*",
    "@p2p-stream/types": "workspace:*",
    "next": "14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "socket.io-client": "^4.7.0",
    "uuid": "^9.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/uuid": "^9.0.8",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

`apps/web/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@p2p-stream/p2p-core', '@p2p-stream/types'],
};

module.exports = nextConfig;
```

`apps/web/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

`apps/web/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

`apps/web/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'P2P Stream',
  description: 'Decentralized live streaming platform',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-white">{children}</body>
    </html>
  );
}
```

`apps/web/app/page.tsx`:

```typescript
import Link from 'next/link';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">P2P Stream</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-12">
        {/* Stream cards will be dynamically loaded */}
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No live streams yet</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/broadcast"
          className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition"
        >
          Start Streaming
        </Link>
      </div>
    </main>
  );
}
```

`apps/web/app/broadcast/page.tsx`:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Broadcaster } from '@/components/broadcaster';
import { PeerStats } from '@/components/peer-stats';

export default function BroadcastPage() {
  const [streamId] = useState(() => uuidv4());
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Stream</h1>
        {isLive && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span>LIVE</span>
            <span className="text-gray-400 ml-4">{viewerCount} viewers</span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Broadcaster
            streamId={streamId}
            onLiveChange={setIsLive}
            onViewerCountChange={setViewerCount}
          />
        </div>
        <div>
          <PeerStats streamId={streamId} />
        </div>
      </div>

      {!isLive && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <p className="text-gray-400 mb-2">Stream URL (share with viewers):</p>
          <code className="bg-gray-900 px-3 py-2 rounded block">
            {typeof window !== 'undefined' ? `${window.location.origin}/watch/${streamId}` : ''}
          </code>
        </div>
      )}
    </main>
  );
}
```

`apps/web/app/watch/[streamId]/page.tsx`:

```typescript
'use client';

import { useParams } from 'next/navigation';
import { VideoPlayer } from '@/components/video-player';
import { PeerStats } from '@/components/peer-stats';

export default function WatchPage() {
  const params = useParams();
  const streamId = params.streamId as string;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VideoPlayer streamId={streamId} />
        </div>
        <div>
          <PeerStats streamId={streamId} />
        </div>
      </div>
    </main>
  );
}
```

`apps/web/hooks/use-signaling.ts`:

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SignalingMessage, PeerInfo } from '@p2p-stream/types';

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:3001';

export function useSignaling(streamId: string, peerId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<Array<{ id: string; score: number }>>([]);
  const handlersRef = useRef<{
    onSignal?: (message: SignalingMessage) => void;
    onPeerJoined?: (peerId: string) => void;
    onPeerLeft?: (peerId: string) => void;
    onStreamEnded?: () => void;
  }>({});

  useEffect(() => {
    const socket = io(SIGNALING_URL, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('peer-list', (data: { peers: Array<{ id: string; score: number }> }) => {
      setPeers(data.peers);
    });

    socket.on('peer-joined', (data: { peerId: string }) => {
      handlersRef.current.onPeerJoined?.(data.peerId);
    });

    socket.on('peer-left', (data: { peerId: string }) => {
      setPeers(prev => prev.filter(p => p.id !== data.peerId));
      handlersRef.current.onPeerLeft?.(data.peerId);
    });

    socket.on('signal', (message: SignalingMessage) => {
      handlersRef.current.onSignal?.(message);
    });

    socket.on('stream-ended', () => {
      handlersRef.current.onStreamEnded?.();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinStream = useCallback((isStreamer: boolean) => {
    socketRef.current?.emit('join-stream', {
      streamId,
      peerId,
      isStreamer,
    });
  }, [streamId, peerId]);

  const sendSignal = useCallback((message: Omit<SignalingMessage, 'from' | 'streamId' | 'timestamp'>) => {
    socketRef.current?.emit('signal', {
      ...message,
      from: peerId,
      streamId,
      timestamp: Date.now(),
    });
  }, [streamId, peerId]);

  const setHandlers = useCallback((handlers: typeof handlersRef.current) => {
    handlersRef.current = handlers;
  }, []);

  return {
    connected,
    peers,
    joinStream,
    sendSignal,
    setHandlers,
  };
}
```

`apps/web/hooks/use-p2p-broadcaster.ts`:

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MeshNetwork, ChunkManager } from '@p2p-stream/p2p-core';
import { useSignaling } from './use-signaling';

export function useP2PBroadcaster(streamId: string) {
  const peerId = useRef(uuidv4()).current;
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const meshRef = useRef<MeshNetwork | null>(null);
  const chunkManagerRef = useRef<ChunkManager | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { connected, peers, joinStream, sendSignal, setHandlers } = useSignaling(streamId, peerId);

  // Initialize mesh network
  useEffect(() => {
    const mesh = new MeshNetwork({
      localPeerId: peerId,
      streamId,
      isStreamer: true,
      maxConnections: 20, // Streamer can handle more
      onSignal: sendSignal,
    });

    meshRef.current = mesh;

    mesh.on('peer-connected', () => {
      setViewerCount(mesh.getConnectedPeerCount());
    });

    mesh.on('peer-disconnected', () => {
      setViewerCount(mesh.getConnectedPeerCount());
    });

    mesh.on('chunk-requested', ({ peerId, chunkIndex }) => {
      // Handle chunk request from peer
      // In real implementation, send the requested chunk
    });

    return () => {
      mesh.destroy();
    };
  }, [streamId, peerId, sendSignal]);

  // Set up signaling handlers
  useEffect(() => {
    setHandlers({
      onSignal: (message) => {
        meshRef.current?.handleSignal(message);
      },
      onPeerJoined: (newPeerId) => {
        // New viewer joined, initiate connection
        meshRef.current?.connectToPeer(newPeerId, true);
      },
      onPeerLeft: (leftPeerId) => {
        // Peer left, mesh handles cleanup
      },
    });
  }, [setHandlers]);

  // Connect to initial peers when they arrive
  useEffect(() => {
    peers.forEach((peer) => {
      if (!meshRef.current?.getConnectedPeerIds().includes(peer.id)) {
        meshRef.current?.connectToPeer(peer.id, true);
      }
    });
  }, [peers]);

  const startBroadcast = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Prevent echo
        await videoRef.current.play();
      }

      // Start chunking
      const chunkManager = new ChunkManager(streamId, 2000);
      chunkManagerRef.current = chunkManager;

      chunkManager.on('chunk-created', (chunk) => {
        // Broadcast chunk to all connected peers
        meshRef.current?.broadcastChunk(chunk);
      });

      chunkManager.startCapturing(stream);

      // Join signaling as streamer
      joinStream(true);
      setIsLive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start broadcast');
    }
  }, [streamId, joinStream]);

  const stopBroadcast = useCallback(() => {
    chunkManagerRef.current?.stopCapturing();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setIsLive(false);
  }, []);

  return {
    peerId,
    isLive,
    viewerCount,
    error,
    connected,
    videoRef,
    startBroadcast,
    stopBroadcast,
  };
}
```

`apps/web/hooks/use-p2p-viewer.ts`:

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MeshNetwork, BufferManager } from '@p2p-stream/p2p-core';
import { useSignaling } from './use-signaling';
import type { Chunk } from '@p2p-stream/types';

export function useP2PViewer(streamId: string) {
  const peerId = useRef(uuidv4()).current;
  const [isPlaying, setIsPlaying] = useState(false);
  const [bufferHealth, setBufferHealth] = useState(0);
  const [peerCount, setPeerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [streamEnded, setStreamEnded] = useState(false);

  const meshRef = useRef<MeshNetwork | null>(null);
  const bufferRef = useRef<BufferManager | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);

  const { connected, peers, joinStream, sendSignal, setHandlers } = useSignaling(streamId, peerId);

  // Initialize mesh and buffer
  useEffect(() => {
    const mesh = new MeshNetwork({
      localPeerId: peerId,
      streamId,
      isStreamer: false,
      maxConnections: 5,
      onSignal: sendSignal,
    });

    const buffer = new BufferManager({
      bufferDuration: 10,
      chunkDuration: 2,
    });

    meshRef.current = mesh;
    bufferRef.current = buffer;

    mesh.on('peer-connected', () => {
      setPeerCount(mesh.getConnectedPeerCount());
    });

    mesh.on('peer-disconnected', () => {
      setPeerCount(mesh.getConnectedPeerCount());
    });

    mesh.on('chunk-received', ({ peerId, data }) => {
      // Parse chunk and add to buffer
      // Simplified: in reality, handle chunk metadata separately
    });

    buffer.on('buffer-healthy', (health) => {
      setBufferHealth(health.percentage);
    });

    buffer.on('buffer-low', (health) => {
      setBufferHealth(health.percentage);
      // Request missing chunks
      health.missingChunks.forEach((index) => {
        mesh.requestChunk(index);
      });
    });

    buffer.on('chunks-needed', (indices: number[]) => {
      indices.forEach((index) => {
        mesh.requestChunk(index);
      });
    });

    return () => {
      mesh.destroy();
      buffer.clear();
    };
  }, [streamId, peerId, sendSignal]);

  // Set up signaling handlers
  useEffect(() => {
    setHandlers({
      onSignal: (message) => {
        meshRef.current?.handleSignal(message);
      },
      onPeerJoined: (newPeerId) => {
        // Could connect to new peer as potential source
      },
      onPeerLeft: () => {},
      onStreamEnded: () => {
        setStreamEnded(true);
        setIsPlaying(false);
      },
    });
  }, [setHandlers]);

  // Connect to peers when available
  useEffect(() => {
    // Sort by score and connect to top peers
    const sortedPeers = [...peers].sort((a, b) => b.score - a.score);
    const topPeers = sortedPeers.slice(0, 3);

    topPeers.forEach((peer) => {
      if (!meshRef.current?.getConnectedPeerIds().includes(peer.id)) {
        meshRef.current?.connectToPeer(peer.id, true);
      }
    });
  }, [peers]);

  const startWatching = useCallback(() => {
    joinStream(false);
    setIsPlaying(true);

    // Set up MediaSource for playback
    if (videoRef.current && 'MediaSource' in window) {
      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      videoRef.current.src = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener('sourceopen', () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('video/webm;codecs=vp8,opus');
          sourceBufferRef.current = sourceBuffer;
        } catch (e) {
          setError('Failed to initialize video playback');
        }
      });
    }
  }, [joinStream]);

  const stopWatching = useCallback(() => {
    setIsPlaying(false);
    meshRef.current?.destroy();
  }, []);

  return {
    peerId,
    isPlaying,
    bufferHealth,
    peerCount,
    error,
    connected,
    streamEnded,
    videoRef,
    startWatching,
    stopWatching,
  };
}
```

`apps/web/components/broadcaster.tsx`:

```typescript
'use client';

import { useP2PBroadcaster } from '@/hooks/use-p2p-broadcaster';

interface BroadcasterProps {
  streamId: string;
  onLiveChange?: (isLive: boolean) => void;
  onViewerCountChange?: (count: number) => void;
}

export function Broadcaster({ streamId, onLiveChange, onViewerCountChange }: BroadcasterProps) {
  const {
    isLive,
    viewerCount,
    error,
    connected,
    videoRef,
    startBroadcast,
    stopBroadcast,
  } = useP2PBroadcaster(streamId);

  // Sync state to parent
  if (onLiveChange) onLiveChange(isLive);
  if (onViewerCountChange) onViewerCountChange(viewerCount);

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
        />
        
        {!isLive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500">Camera preview will appear here</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-200 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        {!isLive ? (
          <button
            onClick={startBroadcast}
            disabled={!connected}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-semibold transition"
          >
            {connected ? 'Go Live' : 'Connecting...'}
          </button>
        ) : (
          <button
            onClick={stopBroadcast}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-semibold transition"
          >
            End Stream
          </button>
        )}

        <span className="text-gray-400">
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>
    </div>
  );
}
```

`apps/web/components/video-player.tsx`:

```typescript
'use client';

import { useP2PViewer } from '@/hooks/use-p2p-viewer';

interface VideoPlayerProps {
  streamId: string;
}

export function VideoPlayer({ streamId }: VideoPlayerProps) {
  const {
    isPlaying,
    bufferHealth,
    peerCount,
    error,
    connected,
    streamEnded,
    videoRef,
    startWatching,
    stopWatching,
  } = useP2PViewer(streamId);

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
        />

        {streamEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-xl">Stream has ended</p>
          </div>
        )}

        {!isPlaying && !streamEnded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startWatching}
              disabled={!connected}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 px-8 py-4 rounded-lg font-semibold text-xl transition"
            >
              {connected ? '▶ Watch Stream' : 'Connecting...'}
            </button>
          </div>
        )}

        {/* Buffer indicator */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
            <div
              className="h-full bg-red-600 transition-all duration-300"
              style={{ width: `${bufferHealth}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-200 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Connected to {peerCount} peers</span>
        <span>Buffer: {Math.round(bufferHealth)}%</span>
      </div>
    </div>
  );
}
```

`apps/web/components/peer-stats.tsx`:

```typescript
'use client';

interface PeerStatsProps {
  streamId: string;
}

export function PeerStats({ streamId }: PeerStatsProps) {
  // This would connect to the mesh network and display real stats
  // Simplified for the scaffold

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="font-semibold text-lg">Network Stats</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Stream ID</span>
          <span className="font-mono text-xs">{streamId.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Protocol</span>
          <span>WebRTC P2P</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Connected Peers</span>
          <span>--</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Chunks Cached</span>
          <span>--</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Upload</span>
          <span>-- kbps</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Download</span>
          <span>-- kbps</span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-700">
        <h4 className="font-medium mb-2">Peer Connections</h4>
        <div className="text-gray-500 text-sm">
          No peers connected yet
        </div>
      </div>
    </div>
  );
}
```

`apps/web/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`apps/web/public/manifest.json`:

```json
{
  "name": "P2P Stream",
  "short_name": "P2PStream",
  "description": "Decentralized live streaming platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#dc2626",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

### Step 6: TypeScript Configs

`packages/config/typescript/base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  }
}
```

`apps/web/tsconfig.json`:

```json
{
  "extends": "@p2p-stream/config/typescript/base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/signaling-server/tsconfig.json`:

```json
{
  "extends": "@p2p-stream/config/typescript/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false
  },
  "include": ["src/**/*"]
}
```

`packages/types/tsconfig.json`:

```json
{
  "extends": "@p2p-stream/config/typescript/base.json",
  "include": ["src/**/*"]
}
```

`packages/p2p-core/tsconfig.json`:

```json
{
  "extends": "@p2p-stream/config/typescript/base.json",
  "include": ["src/**/*"]
}
```

---

## Setup Commands

Run these commands in order after creating all files:

```bash
# 1. Initialize monorepo
pnpm install

# 2. Build packages in order
pnpm --filter @p2p-stream/types build
pnpm --filter @p2p-stream/p2p-core build

# 3. Start development
# Terminal 1: Signaling server
pnpm dev:server

# Terminal 2: Web app
pnpm dev:web
```

---

## Environment Variables

Create `apps/web/.env.local`:

```
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3001
```

---

## Testing the Setup

1. Open `http://localhost:3000/broadcast` in browser tab 1
2. Click "Go Live" to start streaming
3. Copy the stream URL
4. Open `http://localhost:3000/watch/{streamId}` in browser tab 2
5. Click "Watch Stream"
6. Open more tabs to test P2P mesh scaling

---

## Future Enhancements (not in initial scaffold)

- [ ] Add TURN server support for symmetric NAT traversal
- [ ] Implement adaptive bitrate based on peer bandwidth
- [ ] Add stream recording/VOD
- [ ] Implement chat system (also P2P)
- [ ] Add authentication
- [ ] Implement proper HLS with .m3u8 manifests
- [ ] Add stream thumbnails
- [ ] Mobile-optimized UI
- [ ] PWA offline support for cached streams

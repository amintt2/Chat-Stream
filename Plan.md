# P2P Streaming Platform - Architecture & Development Plan

## Overview

A decentralized live streaming platform where viewers act as relays to distribute streams, minimizing server costs. Built with WebRTC for peer-to-peer connections and chunked video delivery.

---

## Architecture

### High-Level System Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                              SIGNALING SERVER                          │
│                         (Socket.io - Coordination Only)                │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐ ┌─────────────┐  │
│  │ Room Manager│  │ Peer Scorer │  │ Stream Registry│ │ Heartbeat   │  │
│  └─────────────┘  └─────────────┘  └────────────────┘ └─────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │ WebSocket     │               │ WebSocket
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │ STREAMER  │   │  VIEWER 1 │   │  VIEWER 2 │
            │           │   │ (Relay)   │   │  (Leaf)   │
            └───────────┘   └───────────┘   └───────────┘
                    │               │               │
                    └───────┬───────┴───────┬───────┘
                            │  WebRTC P2P   │
                            │  Data Channels│
                            ▼               ▼
                    ┌─────────────────────────────┐
                    │     P2P MESH NETWORK        │
                    │  (Video chunks distributed  │
                    │   peer-to-peer directly)    │
                    └─────────────────────────────┘
```

### Data Flow

```
STREAMER                    SIGNALING                 VIEWERS
   │                           │                         │
   │ 1. Create Stream          │                         │
   │──────────────────────────>│                         │
   │                           │                         │
   │ 2. Capture Video          │                         │
   │ (MediaRecorder API)       │                         │
   │                           │                         │
   │ 3. Chunk Video (2s)       │                         │
   │                           │                         │
   │                           │  4. Join Stream Request │
   │                           │<────────────────────────│
   │                           │                         │
   │                           │  5. Peer List + Scores  │
   │                           │────────────────────────>│
   │                           │                         │
   │ 6. WebRTC Offer/Answer    │                         │
   │<──────────────────────────┼────────────────────────>│
   │                           │                         │
   │ 7. P2P Connection Established                       │
   │<═══════════════════════════════════════════════════>│
   │                           │                         │
   │ 8. Stream chunks directly via WebRTC DataChannel    │
   │════════════════════════════════════════════════════>│
```

### Peer Roles & Hierarchy

```
                    ┌─────────────┐
                    │  STREAMER   │  Score: 100
                    │  (Source)   │  Max connections: 20
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │ SUPER-SEED  │ │ SUPER-SEED  │ │ SUPER-SEED  │  Score: 75+
    │  (Relay)    │ │  (Relay)    │ │  (Relay)    │  Bandwidth: 70+
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
    ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
    │   RELAY     │ │   RELAY     │ │   RELAY     │  Score: 50-74
    │  (Forward)  │ │  (Forward)  │ │  (Forward)  │  Can upload
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │    LEAF     │ │    LEAF     │ │    LEAF     │  Score: <50
    │  (Receive)  │ │  (Receive)  │ │  (Receive)  │  Limited bandwidth
    └─────────────┘ └─────────────┘ └─────────────┘
```

### Chunk Distribution Strategy

```
Time ──────────────────────────────────────────────────────────────>

Chunk:    [C1][C2][C3][C4][C5][C6][C7][C8][C9][C10]...
           │   │   │   │   │   │   │   │   │    │
           │   │   │   │   │   │   │   │   │    │
Streamer:  ████████████████████████████████████████  (all chunks)
           │   │   │   │   │
           ▼   ▼   ▼   ▼   ▼
Super-Seed:████████████████████████████  (recent chunks)
           │   │   │   │
           ▼   ▼   ▼   ▼
Relay:     ████████████████  (buffer window)
           │   │   │
           ▼   ▼   ▼
Leaf:      ████████  (playback + small buffer)

Buffer Target: 10 seconds (5 chunks at 2s each)
```

---

## Monorepo Structure

```
p2p-stream/
├── apps/
│   ├── web/                          # Next.js 15 Frontend
│   │   ├── app/                      # App Router pages
│   │   │   ├── page.tsx              # Homepage - stream discovery
│   │   │   ├── broadcast/page.tsx    # Streamer interface
│   │   │   ├── watch/[id]/page.tsx   # Viewer interface
│   │   │   └── debug/page.tsx        # Debug/testing interface
│   │   ├── components/               # React components
│   │   ├── hooks/                    # Custom React hooks
│   │   └── lib/                      # Utilities
│   │
│   └── signaling-server/             # Node.js + Socket.io
│       └── src/
│           ├── index.ts              # Server entry
│           ├── room-manager.ts       # Stream room management
│           ├── peer-scorer.ts        # Peer quality scoring
│           └── tracker.ts            # Peer/chunk tracking
│
├── packages/
│   ├── p2p-core/                     # Core P2P networking
│   │   └── src/
│   │       ├── mesh-network.ts       # Mesh topology
│   │       ├── peer-connection.ts    # WebRTC wrapper
│   │       ├── chunk-manager.ts      # Video chunking
│   │       ├── buffer-manager.ts     # Playback buffer
│   │       ├── peer-discovery.ts     # Peer selection
│   │       └── bandwidth-estimator.ts
│   │
│   ├── types/                        # Shared TypeScript types
│   └── config/                       # Shared configurations
│
├── turbo.json                        # Turborepo config
├── pnpm-workspace.yaml
└── package.json
```

---

## Current Implementation Status

### ✅ Completed

- [x] Monorepo setup (Turborepo + pnpm)
- [x] Shared TypeScript types package
- [x] P2P Core library with:
  - [x] PeerConnection (WebRTC wrapper using simple-peer)
  - [x] MeshNetwork (peer topology management)
  - [x] BufferManager (chunk buffering)
  - [x] ChunkManager (video chunking with MediaRecorder)
  - [x] BandwidthEstimator
  - [x] PeerDiscovery (peer scoring/selection)
- [x] Signaling server with:
  - [x] Room management
  - [x] Peer scoring
  - [x] WebSocket events
- [x] Web app with:
  - [x] Homepage
  - [x] Broadcast page
  - [x] Watch page
  - [x] Basic components (Broadcaster, VideoPlayer, PeerStats)
  - [x] P2P hooks (useSignaling, useP2PBroadcaster, useP2PViewer)

---

## TODO - Features to Implement

### 🔴 Priority 1: Core Functionality

- [ ] **Screen Sharing Support**
  - Add `getDisplayMedia()` option in broadcaster
  - Allow switching between camera and screen mid-stream
  - Support screen + camera picture-in-picture mode
  - File: `apps/web/hooks/use-p2p-broadcaster.ts`

- [ ] **Debug/Test Mode**
  - Create `/debug` page with fake stream generation
  - Generate test video pattern (color bars, timestamp overlay)
  - Simulate multiple viewers locally
  - Network condition simulation (latency, packet loss)
  - File: `apps/web/app/debug/page.tsx`

- [ ] **Stream Discovery & Listing**
  - Real-time stream list on homepage
  - Stream thumbnails (capture frame periodically)
  - Viewer count display
  - Stream categories/tags
  - File: `apps/web/app/page.tsx`

- [ ] **Proper Video Playback Pipeline**
  - Fix MediaSource Extension integration
  - Implement proper chunk reassembly
  - Handle codec negotiation
  - Smooth playback with buffer monitoring
  - File: `apps/web/hooks/use-p2p-viewer.ts`

### 🟡 Priority 2: Reliability & Performance

- [ ] **TURN Server Integration**
  - Add TURN server configuration for symmetric NAT traversal
  - Fallback when direct P2P fails
  - Config in: `packages/p2p-core/src/peer-connection.ts`

- [ ] **Adaptive Bitrate (ABR)**
  - Multiple quality levels (1080p, 720p, 480p, 360p)
  - Dynamic switching based on peer bandwidth
  - Quality indicators in UI
  - File: `packages/p2p-core/src/adaptive-bitrate.ts` (new)

- [ ] **Connection Recovery**
  - Auto-reconnect on disconnect
  - Graceful peer handoff
  - Buffer preservation during reconnection
  - File: `packages/p2p-core/src/mesh-network.ts`

- [ ] **Chunk Verification**
  - Hash-based integrity checking
  - Retry mechanism for corrupted chunks
  - File: `packages/p2p-core/src/chunk-manager.ts`

### 🟢 Priority 3: User Experience

- [ ] **Chat System (P2P)**
  - Real-time chat over WebRTC DataChannel
  - Chat message propagation through mesh
  - Emotes/reactions support
  - File: `apps/web/components/chat.tsx` (new)

- [ ] **Stream Controls**
  - Volume control
  - Fullscreen mode
  - Picture-in-picture
  - Playback quality selector
  - Latency mode (low-latency vs buffered)
  - File: `apps/web/components/video-controls.tsx` (new)

- [ ] **Streamer Dashboard**
  - Real-time viewer analytics
  - Bandwidth usage graphs
  - Peer distribution visualization
  - Stream health indicators
  - File: `apps/web/components/streamer-dashboard.tsx` (new)

- [ ] **Mobile Optimization**
  - Touch-friendly controls
  - Responsive layouts
  - Battery-efficient mode for mobile viewers
  - File: Various component updates

### 🔵 Priority 4: Infrastructure & DevOps

- [ ] **Authentication System**
  - User accounts (streamer vs viewer)
  - Stream keys for broadcasting
  - OAuth integration (Google, GitHub, Twitch)
  - File: `apps/web/lib/auth.ts` (new)

- [ ] **Stream Recording/VOD**
  - Server-side recording option
  - Chunk storage (S3/R2)
  - VOD playback page
  - File: `apps/signaling-server/src/recorder.ts` (new)

- [ ] **Analytics & Monitoring**
  - Viewer metrics (watch time, buffer events)
  - Network quality metrics
  - Error tracking
  - File: `packages/p2p-core/src/analytics.ts` (new)

- [ ] **Rate Limiting & Abuse Prevention**
  - Connection rate limiting
  - Bandwidth abuse detection
  - Stream moderation tools
  - File: `apps/signaling-server/src/rate-limiter.ts` (new)

### ⚪ Priority 5: Nice to Have

- [ ] **Co-streaming**
  - Multiple streamers in one session
  - Audio mixing
  - Split-screen layouts

- [ ] **Clips & Highlights**
  - Viewer clipping (last 30s)
  - Clip sharing

- [ ] **Stream Scheduling**
  - Schedule future streams
  - Reminder notifications

- [ ] **Custom RTMP Ingest**
  - Accept RTMP from OBS/Streamlabs
  - Transcode to WebRTC

- [ ] **CDN Fallback**
  - Hybrid P2P + CDN mode
  - Automatic fallback for low-peer scenarios

---

## Technical Debt & Improvements

- [ ] Add comprehensive error handling throughout
- [ ] Implement proper TypeScript strict mode compliance
- [ ] Add unit tests for p2p-core package
- [ ] Add E2E tests for streaming flow
- [ ] Improve logging and debugging tools
- [ ] Document all public APIs
- [ ] Performance profiling and optimization
- [ ] Memory leak detection and fixes
- [ ] WebRTC stats collection and reporting

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Development (both servers)
pnpm dev

# Development (web only)
pnpm dev:web

# Development (signaling server only)
pnpm dev:server

# Build all packages
pnpm build

# Type checking
pnpm type-check

# Linting
pnpm lint
```

---

## Environment Variables

### Web App (`apps/web/.env.local`)
```env
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3001
NEXT_PUBLIC_TURN_SERVER_URL=
NEXT_PUBLIC_TURN_USERNAME=
NEXT_PUBLIC_TURN_CREDENTIAL=
```

### Signaling Server (`apps/signaling-server/.env`)
```env
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
```

---

## Next Steps (Recommended Order)

1. **Update to Next.js 15** ✅ (package.json updated, needs `pnpm install`)
2. **Add Debug Mode** - Essential for development
3. **Fix Video Playback** - Core functionality
4. **Add Screen Sharing** - User-requested feature
5. **Add Chat System** - Engagement feature
6. **Add TURN Server** - Production readiness
7. **Add Authentication** - Before public launch

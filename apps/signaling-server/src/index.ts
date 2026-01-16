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

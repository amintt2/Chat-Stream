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

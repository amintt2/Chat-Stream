'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MeshNetwork, ChunkManager } from '@p2p-stream/p2p-core';
import { useSignaling } from './use-signaling';

export function useP2PBroadcaster(streamId: string) {
  // Generate peerId only on client to avoid hydration mismatch
  const [peerId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return uuidv4();
  });
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

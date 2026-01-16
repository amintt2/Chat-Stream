'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MeshNetwork, BufferManager } from '@p2p-stream/p2p-core';
import { useSignaling } from './use-signaling';

interface BufferHealth {
  bufferedSeconds: number;
  targetSeconds: number;
  percentage: number;
  missingChunks: number[];
}

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

    buffer.on('buffer-healthy', (health: BufferHealth) => {
      setBufferHealth(health.percentage);
    });

    buffer.on('buffer-low', (health: BufferHealth) => {
      setBufferHealth(health.percentage);
      // Request missing chunks
      health.missingChunks.forEach((index: number) => {
        mesh.requestChunk(index);
      });
    });

    buffer.on('chunks-needed', (indices: number[]) => {
      indices.forEach((index: number) => {
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

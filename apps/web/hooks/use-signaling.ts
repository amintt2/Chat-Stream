'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SignalingMessage } from '@p2p-stream/types';

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

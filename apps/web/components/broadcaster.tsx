'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    onLiveChange?.(isLive);
  }, [isLive, onLiveChange]);

  useEffect(() => {
    onViewerCountChange?.(viewerCount);
  }, [viewerCount, onViewerCountChange]);

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
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}

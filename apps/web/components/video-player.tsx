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
              {connected ? 'Watch Stream' : 'Connecting...'}
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

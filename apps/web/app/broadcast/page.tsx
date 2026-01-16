'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Broadcaster } from '@/components/broadcaster';
import { PeerStats } from '@/components/peer-stats';

export default function BroadcastPage() {
  const [streamId, setStreamId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  // Generate UUID only on client to avoid hydration mismatch
  useEffect(() => {
    setStreamId(uuidv4());
  }, []);

  // Show loading state until streamId is generated
  if (!streamId) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Initializing stream...</div>
        </div>
      </main>
    );
  }

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
            {`${window.location.origin}/watch/${streamId}`}
          </code>
        </div>
      )}
    </main>
  );
}

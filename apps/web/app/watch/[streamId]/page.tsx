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

'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useP2PBroadcaster } from '@/hooks/use-p2p-broadcaster';
import { createColorBarsStream, stopSyntheticStream } from '@/lib/video-generator';
import { NetworkSimulator, type NetworkConditions } from '@/components/network-simulator';
import { VideoPerformanceMonitor } from '@/components/video-performance-monitor';

export default function DebugPage() {
  const [streamId, setStreamId] = useState<string | null>(null);
  const [networkConditions, setNetworkConditions] = useState<NetworkConditions>({
    latency: 50,
    packetLoss: 0,
    bandwidth: 5000,
    jitter: 5,
  });
  const [copied, setCopied] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const [chunkSize, setChunkSize] = useState(0);

  const streamRef = useRef<(MediaStream & { _cleanup?: () => void }) | null>(null);

  // Generate streamId only on client
  useEffect(() => {
    setStreamId(uuidv4());
  }, []);

  const {
    peerId,
    isLive,
    viewerCount,
    error,
    connected,
    videoRef,
    startBroadcast,
    stopBroadcast,
  } = useP2PBroadcaster(streamId || '');

  const startSyntheticStream = async () => {
    try {
      // Create synthetic video stream
      const stream = createColorBarsStream(1280, 720, 30);
      streamRef.current = stream;

      // Set up video element with synthetic stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      // This will trigger the P2P broadcast with the synthetic stream
      // Note: We're overriding the getUserMedia in startBroadcast
      // by setting srcObject manually before calling it
      await startBroadcast();
    } catch (err) {
      console.error('Failed to start synthetic stream:', err);
    }
  };

  const stopStream = () => {
    stopBroadcast();

    // Stop synthetic stream
    if (streamRef.current) {
      stopSyntheticStream(streamRef.current);
      streamRef.current = null;
    }

    setChunkCount(0);
    setChunkSize(0);
  };

  const copyViewerLink = () => {
    if (!streamId) return;
    const url = `${window.location.origin}/watch/${streamId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInNewTab = () => {
    if (!streamId) return;
    window.open(`/watch/${streamId}`, '_blank');
  };

  // Show loading state until streamId is generated
  if (!streamId) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Initializing debug mode...</div>
        </div>
      </main>
    );
  }

  const viewerUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/watch/${streamId}`;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Debug & Test Mode</h1>
        <p className="text-gray-400">
          Test P2P streaming with synthetic video - Open viewer links in multiple tabs/windows
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Synthetic Video Stream (Broadcaster) */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Broadcaster (Synthetic Video)</h2>
              {connected ? (
                <span className="flex items-center gap-2 text-sm text-green-400">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Connected to signaling
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="w-2 h-2 bg-gray-500 rounded-full" />
                  Disconnected
                </span>
              )}
            </div>

            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />

              {!isLive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="text-gray-400">Stream not started</p>
                </div>
              )}

              {isLive && (
                <>
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold bg-black/70 px-2 py-1 rounded">
                      LIVE
                    </span>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/70 px-2 py-1 rounded text-sm">
                    <span className="text-gray-400">Viewers:</span>{' '}
                    <span className="text-white font-bold">{viewerCount}</span>
                  </div>
                  <VideoPerformanceMonitor videoRef={videoRef} isPlaying={isLive} />
                </>
              )}
            </div>

            <div className="flex gap-3 mb-4">
              {!isLive ? (
                <button
                  onClick={startSyntheticStream}
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  disabled={!connected}
                >
                  {connected ? 'Start Synthetic Stream' : 'Connecting...'}
                </button>
              ) : (
                <button
                  onClick={stopStream}
                  className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-semibold transition"
                >
                  Stop Stream
                </button>
              )}
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-200 px-4 py-2 rounded mb-4">
                {error}
              </div>
            )}

            <div className="bg-gray-900 rounded p-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Stream ID</span>
                <code className="text-xs text-gray-300">{streamId.slice(0, 12)}...</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Broadcaster Peer ID</span>
                <code className="text-xs text-gray-300">{peerId.slice(0, 8)}...</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={isLive ? 'text-green-400 font-bold' : 'text-gray-400'}>
                  {isLive ? 'LIVE' : 'STOPPED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Connected Viewers</span>
                <span className="text-gray-300 font-mono">{viewerCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Video Format</span>
                <span className="text-gray-300">1280x720 @ 30fps</span>
              </div>
            </div>
          </div>

          {/* Viewer Links Section */}
          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-100">Test Viewer Access</h3>
            <p className="text-sm text-gray-300 mb-4">
              Open these links in new tabs or private/incognito windows to simulate multiple real viewers with actual video playback
            </p>

            <div className="space-y-3">
              {/* Viewer URL */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Viewer URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={viewerUrl}
                    readOnly
                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-300 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={copyViewerLink}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-sm transition"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={openInNewTab}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-semibold text-sm transition"
                >
                  Open in New Tab
                </button>
                <button
                  onClick={() => window.open(`/watch/${streamId}`, '_blank', 'width=800,height=600')}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-semibold text-sm transition"
                >
                  Open in New Window
                </button>
              </div>

              <div className="bg-blue-950/50 border border-blue-800/30 rounded p-3 text-xs text-blue-200">
                <strong>💡 Tip:</strong> Open 2-3 viewer windows and watch the "Connected Viewers" count increase.
                You'll see the actual video stream and can observe lag, freezing, or buffering in real-time!
              </div>
            </div>
          </div>

          {/* Network Simulator */}
          <NetworkSimulator onConditionsChange={setNetworkConditions} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Real-time Stats */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Live Stats</h3>
            <div className="space-y-3">
              <div className="bg-gray-900 rounded p-3">
                <div className="text-2xl font-bold text-green-400">{viewerCount}</div>
                <div className="text-xs text-gray-400">Active Viewers</div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-2xl font-bold text-blue-400">
                  {connected ? 'Online' : 'Offline'}
                </div>
                <div className="text-xs text-gray-400">Signaling Status</div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-2xl font-bold text-purple-400">
                  {isLive ? 'Active' : 'Idle'}
                </div>
                <div className="text-xs text-gray-400">Broadcast Status</div>
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Performance Indicators</h3>
            <div className="text-sm space-y-2 text-gray-300">
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>FPS counter overlay on video</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Frame freeze detection ({">"} 2s)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Loading/buffering indicators</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Real P2P chunk streaming</span>
              </div>
            </div>
          </div>

          {/* Environment Info */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Environment</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Mode</span>
                <span className="text-green-400 font-mono">
                  {process.env.NODE_ENV}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Next.js</span>
                <span className="text-gray-300">16.1.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">React</span>
                <span className="text-gray-300">19.x</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-900/20 border border-yellow-900/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2 text-yellow-200">How to Test</h3>
            <ol className="text-xs text-yellow-100 space-y-2 list-decimal list-inside">
              <li>Start the synthetic stream</li>
              <li>Copy the viewer URL above</li>
              <li>Open in 2-3 incognito/private windows</li>
              <li>Watch the "Active Viewers" count increase</li>
              <li>Check video performance indicators on each viewer</li>
              <li>Adjust network simulator to test lag</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}

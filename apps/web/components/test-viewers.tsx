'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface TestViewerSimulator {
  peerId: string;
  connected: boolean;
  bufferHealth: number;     // 0-100%
  downloadSpeed: string;    // "X.X Mbps"
  latency: number;          // ms
  peerCount: number;
  chunksCached: number;
}

export function TestViewersPanel() {
  const [viewers, setViewers] = useState<TestViewerSimulator[]>([]);

  // Simulate buffer fluctuation and stats updates
  useEffect(() => {
    if (viewers.length === 0) return;

    const interval = setInterval(() => {
      setViewers((prev) =>
        prev.map((v) => ({
          ...v,
          bufferHealth: Math.max(
            20,
            Math.min(100, v.bufferHealth + (Math.random() - 0.4) * 15)
          ),
          downloadSpeed: `${(Math.random() * 4 + 1).toFixed(1)} Mbps`,
          latency: Math.floor(Math.random() * 100 + 20),
          chunksCached: Math.floor(Math.random() * 10 + 5),
        }))
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [viewers.length]);

  const addViewer = () => {
    const newViewer: TestViewerSimulator = {
      peerId: uuidv4().slice(0, 8),
      connected: true,
      bufferHealth: Math.floor(Math.random() * 30 + 60),
      downloadSpeed: `${(Math.random() * 4 + 1).toFixed(1)} Mbps`,
      latency: Math.floor(Math.random() * 100 + 20),
      peerCount: Math.floor(Math.random() * 3 + 1),
      chunksCached: Math.floor(Math.random() * 10 + 5),
    };
    setViewers((prev) => [...prev, newViewer]);
  };

  const removeViewer = (peerId: string) => {
    setViewers((prev) => prev.filter((v) => v.peerId !== peerId));
  };

  const removeAllViewers = () => {
    setViewers([]);
  };

  const getBufferColor = (health: number) => {
    if (health >= 70) return 'bg-green-600';
    if (health >= 40) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getBufferTextColor = (health: number) => {
    if (health >= 70) return 'text-green-400';
    if (health >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Simulated Viewers</h3>
          <p className="text-xs text-gray-400 mt-1">
            {viewers.length} viewer{viewers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {viewers.length > 0 && (
            <button
              onClick={removeAllViewers}
              className="bg-red-900/50 hover:bg-red-900/70 text-red-200 px-3 py-1 rounded text-sm transition"
            >
              Clear All
            </button>
          )}
          <button
            onClick={addViewer}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded text-sm font-semibold transition"
          >
            + Add Viewer
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {viewers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No simulated viewers</p>
            <p className="text-xs mt-1">Click "Add Viewer" to start</p>
          </div>
        ) : (
          viewers.map((viewer) => (
            <div
              key={viewer.peerId}
              className="bg-gray-900 rounded-lg p-3 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        viewer.connected ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    />
                    <span className="font-mono text-sm text-gray-300">
                      {viewer.peerId}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeViewer(viewer.peerId)}
                  className="text-gray-500 hover:text-red-400 text-xs transition"
                >
                  Remove
                </button>
              </div>

              {/* Buffer Health */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">Buffer Health</span>
                  <span
                    className={`text-xs font-mono ${getBufferTextColor(
                      viewer.bufferHealth
                    )}`}
                  >
                    {Math.round(viewer.bufferHealth)}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getBufferColor(
                      viewer.bufferHealth
                    )}`}
                    style={{ width: `${viewer.bufferHealth}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Peers:</span>{' '}
                  <span className="text-gray-300">{viewer.peerCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Latency:</span>{' '}
                  <span className="text-gray-300">{viewer.latency}ms</span>
                </div>
                <div>
                  <span className="text-gray-500">Download:</span>{' '}
                  <span className="text-gray-300">{viewer.downloadSpeed}</span>
                </div>
                <div>
                  <span className="text-gray-500">Chunks:</span>{' '}
                  <span className="text-gray-300">{viewer.chunksCached}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

'use client';

interface PeerStatsProps {
  streamId: string;
}

export function PeerStats({ streamId }: PeerStatsProps) {
  // This would connect to the mesh network and display real stats
  // Simplified for the scaffold

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="font-semibold text-lg">Network Stats</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Stream ID</span>
          <span className="font-mono text-xs">{streamId.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Protocol</span>
          <span>WebRTC P2P</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Connected Peers</span>
          <span>--</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Chunks Cached</span>
          <span>--</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Upload</span>
          <span>-- kbps</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Download</span>
          <span>-- kbps</span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-700">
        <h4 className="font-medium mb-2">Peer Connections</h4>
        <div className="text-gray-500 text-sm">
          No peers connected yet
        </div>
      </div>
    </div>
  );
}

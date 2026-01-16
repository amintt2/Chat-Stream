'use client';

import { useState } from 'react';

export interface NetworkConditions {
  latency: number;      // milliseconds
  packetLoss: number;   // percentage (0-100)
  bandwidth: number;    // kbps
  jitter: number;       // milliseconds
}

interface NetworkSimulatorProps {
  onConditionsChange?: (conditions: NetworkConditions) => void;
}

export function NetworkSimulator({ onConditionsChange }: NetworkSimulatorProps) {
  const [conditions, setConditions] = useState<NetworkConditions>({
    latency: 50,
    packetLoss: 0,
    bandwidth: 5000,
    jitter: 5,
  });

  const updateCondition = (key: keyof NetworkConditions, value: number) => {
    const newConditions = { ...conditions, [key]: value };
    setConditions(newConditions);
    onConditionsChange?.(newConditions);
  };

  // Helper to get severity color
  const getLatencyColor = () => {
    if (conditions.latency < 100) return 'text-green-400';
    if (conditions.latency < 250) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPacketLossColor = () => {
    if (conditions.packetLoss === 0) return 'text-green-400';
    if (conditions.packetLoss < 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Network Simulator</h3>

      <div className="space-y-4">
        {/* Latency */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-400">Latency</label>
            <span className={`text-sm font-mono ${getLatencyColor()}`}>
              {conditions.latency}ms
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            value={conditions.latency}
            onChange={(e) => updateCondition('latency', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0ms</span>
            <span>500ms</span>
          </div>
        </div>

        {/* Packet Loss */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-400">Packet Loss</label>
            <span className={`text-sm font-mono ${getPacketLossColor()}`}>
              {conditions.packetLoss}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={conditions.packetLoss}
            onChange={(e) => updateCondition('packetLoss', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>

        {/* Bandwidth */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-400">Bandwidth</label>
            <span className="text-sm font-mono text-blue-400">
              {(conditions.bandwidth / 1000).toFixed(1)} Mbps
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="10000"
            step="100"
            value={conditions.bandwidth}
            onChange={(e) => updateCondition('bandwidth', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.1 Mbps</span>
            <span>10 Mbps</span>
          </div>
        </div>

        {/* Jitter */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-400">Jitter</label>
            <span className="text-sm font-mono text-purple-400">
              {conditions.jitter}ms
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={conditions.jitter}
            onChange={(e) => updateCondition('jitter', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0ms</span>
            <span>100ms</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-gray-900 rounded text-xs space-y-1">
        <div className="text-gray-400">Network Summary:</div>
        <div className="text-gray-300">
          Avg Delay: {(conditions.latency + conditions.jitter / 2).toFixed(0)}ms
        </div>
        <div className="text-gray-300">
          Packet Drop Rate: {conditions.packetLoss}%
        </div>
        <div className="text-gray-300">
          Max Throughput: {(conditions.bandwidth / 1000).toFixed(1)} Mbps
        </div>
      </div>
    </div>
  );
}

// Helper functions for applying network conditions
export const shouldDropPacket = (conditions: NetworkConditions): boolean => {
  return Math.random() * 100 < conditions.packetLoss;
};

export const simulateLatency = (
  conditions: NetworkConditions,
  callback: () => void
) => {
  const delay =
    conditions.latency + (Math.random() - 0.5) * 2 * conditions.jitter;
  setTimeout(callback, Math.max(0, delay));
};

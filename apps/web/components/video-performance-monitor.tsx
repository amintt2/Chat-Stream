'use client';

import { useEffect, useState, useRef } from 'react';

interface VideoPerformanceProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
}

export function VideoPerformanceMonitor({ videoRef, isPlaying }: VideoPerformanceProps) {
  const [fps, setFps] = useState<number>(0);
  const [timeSinceLastFrame, setTimeSinceLastFrame] = useState<number>(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const lastFrameTimeRef = useRef<number>(Date.now());
  const frameCountRef = useRef<number>(0);
  const lastCheckTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!videoRef.current || !isPlaying) {
      setFps(0);
      setTimeSinceLastFrame(0);
      setIsFrozen(false);
      return;
    }

    const video = videoRef.current;
    let animationId: number;

    // Monitor for loading/waiting states
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);

    // Track frames using requestAnimationFrame
    const checkFrame = () => {
      const now = Date.now();
      const video = videoRef.current;

      if (video && !video.paused) {
        // Check if video is actually progressing
        const currentTime = video.currentTime;

        // Count frame
        frameCountRef.current++;

        // Calculate FPS every second
        const timeSinceLastCheck = now - lastCheckTimeRef.current;
        if (timeSinceLastCheck >= 1000) {
          const calculatedFps = Math.round((frameCountRef.current / timeSinceLastCheck) * 1000);
          setFps(calculatedFps);
          frameCountRef.current = 0;
          lastCheckTimeRef.current = now;
        }

        // Update last frame time
        lastFrameTimeRef.current = now;
        setTimeSinceLastFrame(0);
        setIsFrozen(false);
      } else {
        // Video is paused or not playing, update freeze counter
        const frozenTime = now - lastFrameTimeRef.current;
        setTimeSinceLastFrame(frozenTime);
        setIsFrozen(frozenTime > 2000); // Consider frozen after 2 seconds
      }

      animationId = requestAnimationFrame(checkFrame);
    };

    animationId = requestAnimationFrame(checkFrame);

    return () => {
      cancelAnimationFrame(animationId);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoRef, isPlaying]);

  if (!isPlaying) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 space-y-2">
      {/* Loading Indicator */}
      {isLoading && (
        <div className="bg-yellow-900/90 text-yellow-100 px-3 py-2 rounded text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-yellow-100 border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      )}

      {/* Freeze Warning */}
      {isFrozen && (
        <div className="bg-red-900/90 text-red-100 px-3 py-2 rounded text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span>Video Frozen - {(timeSinceLastFrame / 1000).toFixed(1)}s ago</span>
        </div>
      )}

      {/* Performance Stats */}
      <div className="bg-black/80 text-white px-3 py-2 rounded text-xs space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">FPS:</span>
          <span className={`font-mono font-bold ${fps > 25 ? 'text-green-400' : fps > 15 ? 'text-yellow-400' : 'text-red-400'}`}>
            {fps}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Last Frame:</span>
          <span className="font-mono">{(timeSinceLastFrame / 1000).toFixed(2)}s ago</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Status:</span>
          <span className={`font-bold ${isLoading ? 'text-yellow-400' : isFrozen ? 'text-red-400' : 'text-green-400'}`}>
            {isLoading ? 'BUFFERING' : isFrozen ? 'FROZEN' : 'PLAYING'}
          </span>
        </div>
      </div>
    </div>
  );
}

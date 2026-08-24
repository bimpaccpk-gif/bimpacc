"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WATERMARK_VISIBLE_DURATION_MS = 8_000;
const WATERMARK_MIN_INTERVAL_MS = 2 * 60 * 1_000;
const WATERMARK_MAX_INTERVAL_MS = 3 * 60 * 1_000;

function getNextWatermarkInterval() {
  return (
    WATERMARK_MIN_INTERVAL_MS +
    Math.floor(Math.random() * (WATERMARK_MAX_INTERVAL_MS - WATERMARK_MIN_INTERVAL_MS + 1))
  );
}

/**
 * Shows a watermark on the first play and then periodically while playback is active.
 * Paused time does not count toward the next periodic appearance.
 */
export function usePeriodicWatermark(isPlaying: boolean, videoId: string) {
  const [visibleVideoId, setVisibleVideoId] = useState<string | null>(null);
  const hasStartedRef = useRef(false);
  const nextShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextShowStartedAtRef = useRef(0);
  const remainingUntilNextShowRef = useRef(getNextWatermarkInterval());

  const showWatermark = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    setVisibleVideoId(videoId);
    hideTimerRef.current = setTimeout(() => {
      setVisibleVideoId(null);
      hideTimerRef.current = null;
    }, WATERMARK_VISIBLE_DURATION_MS);
  }, [videoId]);

  useEffect(() => {
    hasStartedRef.current = false;
    remainingUntilNextShowRef.current = getNextWatermarkInterval();

    if (nextShowTimerRef.current) {
      clearTimeout(nextShowTimerRef.current);
      nextShowTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    return () => {
      if (nextShowTimerRef.current) clearTimeout(nextShowTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [videoId]);

  useEffect(() => {
    if (!isPlaying) return;

    let initialShowTimer: ReturnType<typeof setTimeout> | null = null;

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      initialShowTimer = setTimeout(showWatermark, 0);
    }

    let isCancelled = false;

    const scheduleNextWatermark = () => {
      nextShowStartedAtRef.current = Date.now();
      nextShowTimerRef.current = setTimeout(() => {
        nextShowTimerRef.current = null;
        if (isCancelled) return;

        showWatermark();
        remainingUntilNextShowRef.current = getNextWatermarkInterval();
        scheduleNextWatermark();
      }, remainingUntilNextShowRef.current);
    };

    scheduleNextWatermark();

    return () => {
      isCancelled = true;
      if (initialShowTimer) clearTimeout(initialShowTimer);

      if (nextShowTimerRef.current) {
        const elapsed = Date.now() - nextShowStartedAtRef.current;
        remainingUntilNextShowRef.current = Math.max(
          0,
          remainingUntilNextShowRef.current - elapsed
        );
        clearTimeout(nextShowTimerRef.current);
        nextShowTimerRef.current = null;
      }
    };
  }, [isPlaying, showWatermark, videoId]);

  return visibleVideoId === videoId;
}

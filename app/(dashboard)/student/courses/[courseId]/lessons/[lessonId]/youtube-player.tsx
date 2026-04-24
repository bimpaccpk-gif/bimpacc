"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
  SkipForward,
  SkipBack,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoWatermark } from "@/components/ui/video-watermark";

// ─── YouTube IFrame API types ─────────────────────────────

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  isMuted: () => boolean;
  mute: () => void;
  unMute: () => void;
  getPlayerState: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  getAvailablePlaybackRates: () => number[];
  destroy: () => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement | string, config: Record<string, unknown>) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

// ─── Props ────────────────────────────────────────────────

interface YouTubeVideoPlayerProps {
  videoId: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  watermark?: {
    fullName: string;
    email: string;
    cnicNumber: string | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────

export function YouTubeVideoPlayer({
  videoId,
  title,
  description,
  durationMinutes,
  onReady,
  onStateChange,
  watermark,
}: YouTubeVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [availableRates, setAvailableRates] = useState<number[]>([1]);
  const [isSeeking] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState(0);

  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suppressNativeMediaMenu = useCallback(
    (event: { preventDefault: () => void; stopPropagation: () => void }) => {
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  // ── Load YouTube IFrame API ──────────────────────────

  useEffect(() => {
    if (document.getElementById("youtube-iframe-api")) {
      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
      }
      return;
    }

    const tag = document.createElement("script");
    tag.id = "youtube-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);

    window.onYouTubeIframeAPIReady = initPlayer;

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      window.onYouTubeIframeAPIReady = () => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const initPlayer = useCallback(() => {
    if (!playerDivRef.current || !window.YT || !window.YT.Player) return;

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }

    playerRef.current = new window.YT.Player(playerDivRef.current, {
      videoId,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        controls: 0,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        disablekb: 1,
        fs: 0,
        cc_load_policy: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: { target: YTPlayer }) => {
          const player = event.target;
          setDuration(player.getDuration());
          setVolume(player.getVolume());
          setIsMuted(player.isMuted());
          setPlaybackRate(player.getPlaybackRate());
          setAvailableRates(player.getAvailablePlaybackRates());
          setIsPlayerReady(true);
          onReady?.();
          startProgressTracker();
        },
        onStateChange: (event: { data: number }) => {
          const state = event.data;
          setIsPlaying(state === window.YT.PlayerState.PLAYING);
          setBuffering(state === window.YT.PlayerState.BUFFERING);
          onStateChange?.(state);
          if (state === window.YT.PlayerState.PLAYING) {
            startProgressTracker();
          } else if (progressInterval.current) {
            clearInterval(progressInterval.current);
            progressInterval.current = null;
          }
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const startProgressTracker = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (playerRef.current && !isSeeking) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 250);
  }, [isSeeking]);

  // ── Playback controls ───────────────────────────────

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const seekTo = useCallback((seconds: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(seconds, true);
    setCurrentTime(seconds);
  }, []);

  const skipForward = useCallback(() => {
    if (!playerRef.current) return;
    const newTime = Math.min(playerRef.current.getCurrentTime() + 10, duration);
    seekTo(newTime);
  }, [duration, seekTo]);

  const skipBackward = useCallback(() => {
    if (!playerRef.current) return;
    const newTime = Math.max(playerRef.current.getCurrentTime() - 10, 0);
    seekTo(newTime);
  }, [seekTo]);

  const changeVolume = useCallback(
    (newVol: number) => {
      if (!playerRef.current) return;
      playerRef.current.setVolume(newVol);
      setVolume(newVol);
      if (newVol === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!playerRef.current) return;
    playerRef.current.setPlaybackRate(rate);
    setPlaybackRate(rate);
  }, []);

  // ── Fullscreen ──────────────────────────────────────

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    const el = containerRef.current as HTMLElement & {
      mozRequestFullScreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    const doc = document as Document & {
      mozFullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      msFullscreenElement?: Element;
      mozExitFullscreen?: () => Promise<void>;
      webkitExitFullscreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    };
    try {
      const currentFullscreen =
        doc.fullscreenElement ??
        doc.mozFullscreenElement ??
        doc.webkitFullscreenElement ??
        doc.msFullscreenElement;
      if (!currentFullscreen) {
        const requestFS =
          el.requestFullscreen ??
          el.mozRequestFullScreen ??
          el.webkitRequestFullscreen ??
          el.msRequestFullscreen;
        if (requestFS) await requestFS.call(el);
        setIsFullscreen(true);
      } else {
        const exitFS =
          doc.exitFullscreen ??
          doc.mozExitFullscreen ??
          doc.webkitExitFullscreen ??
          doc.msExitFullscreen;
        if (exitFS) await exitFS.call(document);
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not supported
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const doc = document as Document & {
        mozFullscreenElement?: Element;
        webkitFullscreenElement?: Element;
        msFullscreenElement?: Element;
      };
      const isFS = !!(
        doc.fullscreenElement ??
        doc.mozFullscreenElement ??
        doc.webkitFullscreenElement ??
        doc.msFullscreenElement
      );
      setIsFullscreen(isFS);
    };
    const events = [
      "fullscreenchange",
      "mozfullscreenchange",
      "webkitfullscreenchange",
      "MSFullscreenChange",
    ];
    events.forEach((ev) => document.addEventListener(ev, handler));
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handler));
    };
  }, []);

  useEffect(() => {
    const iframe = playerDivRef.current?.querySelector("iframe");
    if (!(iframe instanceof HTMLIFrameElement)) return;

    // Force all mobile interaction through our shield layer so long-press
    // cannot reach the embed and reveal the source URL.
    iframe.tabIndex = -1;
    iframe.draggable = false;
    iframe.style.pointerEvents = "none";
    iframe.style.userSelect = "none";
    iframe.style.setProperty("-webkit-user-select", "none");
    iframe.style.setProperty("-webkit-touch-callout", "none");
  }, [isPlayerReady, videoId]);

  // ── Auto-hide controls ─────────────────────────────

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 1000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) setShowControls(true);
  }, [isPlaying]);

  // ── Touch handling for mobile ──────────────────────

  const handleTouchStart = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 4000);
    }
  }, [isPlaying]);

  // ── Keyboard shortcuts ─────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          skipForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipBackward();
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(Math.min(volume + 5, 100));
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(Math.max(volume - 5, 0));
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, skipForward, skipBackward, changeVolume, volume, toggleMute, toggleFullscreen]);

  // ── Timeline progress percentage ────────────────────

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("bg-background flex flex-col lg:flex-row", isFullscreen && "!flex-col")}>
      {/* ─── Video Container ─────────────────────────────── */}
      <div
        ref={containerRef}
        className="group relative flex min-w-0 flex-1 flex-col select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        {/* 16:9 aspect-ratio wrapper */}
        <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
          {/* YouTube player mount point */}
          <div ref={playerDivRef} className="absolute inset-0 h-full w-full" />

          {/* Transparent overlay to block direct iframe interaction */}
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={suppressNativeMediaMenu}
            onClick={() => {
              if (!showControls || !isPlaying) {
                togglePlay();
              }
              handleMouseMove();
            }}
            onTouchStart={(e) => {
              suppressNativeMediaMenu(e);
              handleTouchStart();
            }}
            onTouchMove={suppressNativeMediaMenu}
            onTouchEnd={(e) => {
              suppressNativeMediaMenu(e);
              if (!showControls || !isPlaying) {
                togglePlay();
              }
              handleMouseMove();
            }}
            style={{
              WebkitTouchCallout: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
              touchAction: "manipulation",
            }}
          />

          {/* Moving watermark with user identity */}
          {watermark && isPlayerReady && (
            <VideoWatermark
              fullName={watermark.fullName}
              email={watermark.email}
              cnicNumber={watermark.cnicNumber}
            />
          )}

          {/* Loading / Buffering overlay */}
          {buffering && (
            <div className="bg-background/20 pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="border-primary/30 border-t-primary h-10 w-10 animate-spin rounded-full border-[3px] sm:h-12 sm:w-12 sm:border-4" />
            </div>
          )}

          {/* Big play button overlay when paused */}
          {!isPlaying && !buffering && isPlayerReady && (
            <button
              onClick={togglePlay}
              onTouchEnd={(e) => {
                e.preventDefault();
                togglePlay();
              }}
              className="bg-background/30 absolute inset-0 z-10 flex items-center justify-center transition-opacity"
              aria-label="Play video"
            >
              <div className="bg-primary/90 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-110 sm:h-20 sm:w-20">
                <Play className="text-primary-foreground ml-0.5 h-6 w-6 sm:h-9 sm:w-9" />
              </div>
            </button>
          )}

          {/* ─── Controls Overlay ─────────────────────────── */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300",
              showControls ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            {/* Timeline Scrubber */}
            <div
              className="group/timeline relative cursor-pointer px-2 pb-0.5 sm:px-3 sm:pb-1"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                seekTo(pct * duration);
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setHoverTime(pct * duration);
                setHoverPos(e.clientX - rect.left);
              }}
              onMouseLeave={() => setHoverTime(null)}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
                setHoverTime(pct * duration);
                setHoverPos(touch.clientX - rect.left);
              }}
              onTouchEnd={() => {
                if (hoverTime !== null) seekTo(hoverTime);
                setHoverTime(null);
              }}
            >
              {/* Hover time tooltip */}
              {hoverTime !== null && (
                <div
                  className="pointer-events-none absolute bottom-5 z-30 -translate-x-1/2 sm:bottom-6"
                  style={{ left: hoverPos }}
                >
                  <div className="bg-background/90 text-primary-foreground rounded px-1.5 py-0.5 text-[10px] whitespace-nowrap shadow-lg sm:px-2 sm:py-1 sm:text-xs">
                    {formatTime(hoverTime)}
                  </div>
                </div>
              )}

              {/* Track */}
              <div className="bg-primary-foreground/20 relative h-1 overflow-hidden rounded-full transition-all group-hover/timeline:h-1.5 sm:h-1.5 sm:group-hover/timeline:h-2.5">
                {/* Progress bar */}
                <div
                  className="bg-primary absolute inset-y-0 left-0 rounded-full transition-none"
                  style={{ width: `${progressPercent}%` }}
                />
                {/* Scrubber thumb */}
                <div
                  className="bg-primary absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 shadow-md transition-opacity group-hover/timeline:opacity-100 sm:h-4 sm:w-4"
                  style={{ left: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Bottom control bar */}
            <div className="flex items-center gap-0.5 px-2 pt-0.5 pb-2 sm:gap-1 sm:px-3 sm:pt-1 sm:pb-3">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full p-1.5 transition-colors sm:p-2"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>

              {/* Skip Back / Forward — hidden on very small screens */}
              <button
                onClick={skipBackward}
                className="text-primary-foreground hover:bg-primary-foreground/10 hidden rounded-full p-1.5 transition-colors sm:p-2 md:flex"
                aria-label="Skip back 10 seconds"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={skipForward}
                className="text-primary-foreground hover:bg-primary-foreground/10 hidden rounded-full p-1.5 transition-colors sm:p-2 md:flex"
                aria-label="Skip forward 10 seconds"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              {/* Volume — collapsible on mobile */}
              <div className="group/vol flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={toggleMute}
                  className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full p-1.5 transition-colors sm:p-2"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
                <div className="w-0 overflow-hidden transition-all duration-200 group-hover/vol:w-14 sm:group-hover/vol:w-20">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => changeVolume(parseInt(e.target.value))}
                    className="h-1 w-14 cursor-pointer accent-primary sm:h-1 sm:w-20"
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* Time display */}
              <span className="px-1 font-mono text-[10px] whitespace-nowrap text-foreground sm:px-2 sm:text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Playback speed — hidden on small screens */}
              <div className="group/speed relative hidden md:block">
                <button
                  className="rounded px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-foreground/10"
                  aria-label="Playback speed"
                >
                  {playbackRate}x
                </button>
                <div className="invisible absolute right-0 bottom-full z-30 mb-2 min-w-[80px] rounded-lg bg-background/95 p-1 opacity-0 shadow-xl transition-all group-hover/speed:visible group-hover/speed:opacity-100">
                  {availableRates.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={cn(
                        "block w-full rounded px-3 py-1.5 text-left text-xs transition-colors",
                        rate === playbackRate
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/80 hover:bg-foreground/10"
                      )}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Info sidebar toggle */}
              <button
                onClick={() => setShowInfoSidebar((v) => !v)}
                className={cn(
                  "rounded-full p-1.5 text-foreground transition-colors hover:bg-foreground/10 sm:p-2",
                  showInfoSidebar && "bg-foreground/10"
                )}
                aria-label="Toggle video info"
              >
                <Info className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="rounded-full p-1.5 text-foreground transition-colors hover:bg-foreground/10 sm:p-2"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Popup Info Sidebar ──────────────────────────── */}
      <div
        className={cn(
          "bg-background border-border flex-shrink-0 overflow-hidden transition-all duration-300",
          showInfoSidebar
            ? "max-h-[50vh] w-full border-t lg:max-h-none lg:w-80 lg:border-t-0 lg:border-l xl:w-96"
            : "max-h-0 w-0 border-t-0 lg:border-l-0"
        )}
      >
        <div className="flex h-full min-w-[260px] flex-col">
          {/* Sidebar header */}
          <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
            <h3 className="text-foreground text-sm font-semibold">Video Info</h3>
            <button
              onClick={() => setShowInfoSidebar(false)}
              className="hover:bg-muted rounded-md p-1.5 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="text-muted-foreground h-4 w-4" />
            </button>
          </div>

          {/* Sidebar content */}
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {/* Title */}
            <div>
              <label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Title
              </label>
              <p className="text-foreground mt-1 leading-snug font-medium">{title}</p>
            </div>

            {/* Description */}
            {description && (
              <div>
                <label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Description
                </label>
                <p className="text-foreground/80 mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              </div>
            )}

            {/* Duration */}
            {durationMinutes && (
              <div>
                <label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Duration
                </label>
                <p className="text-foreground mt-1">{durationMinutes} minutes</p>
              </div>
            )}

            {/* Current time */}
            <div>
              <label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Current Position
              </label>
              <p className="text-foreground mt-1 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>

            {/* Playback speed control */}
            <div>
              <label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Playback Speed
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableRates.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      rate === playbackRate
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Volume control */}
            <div>
              <label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Volume
              </label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  className="hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => changeVolume(parseInt(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer accent-primary"
                  aria-label="Volume slider"
                />
                <span className="text-muted-foreground w-8 text-right font-mono text-xs">
                  {isMuted ? 0 : volume}
                </span>
              </div>
            </div>

            {/* Keyboard shortcuts */}
            <div>
              <label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Keyboard Shortcuts
              </label>
              <div className="mt-2 space-y-1.5">
                {[
                  { key: "Space / K", action: "Play / Pause" },
                  { key: "← / →", action: "Skip 10s" },
                  { key: "↑ / ↓", action: "Volume" },
                  { key: "M", action: "Mute" },
                  { key: "F", action: "Fullscreen" },
                ].map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{shortcut.action}</span>
                    <kbd className="bg-muted text-foreground rounded px-2 py-0.5 font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

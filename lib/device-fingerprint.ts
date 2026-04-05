"use client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeviceComponents {
  // Platform (normalized: "mac", "win", "linux", "android", "ios", "unknown")
  platform: string;
  platformVersion: string | null;

  // Display
  screenResolution: string;
  availableScreenSize: string;
  colorDepth: number;
  devicePixelRatio: number;

  // Hardware
  deviceMemory: number | null; // null on Safari — excluded from hash
  hardwareConcurrency: number | null;
  maxTouchPoints: number;

  // GPU (normalized: ANGLE wrapper stripped, lowercased)
  webglRenderer: string | null;
  webglVendor: string | null;

  // Raw GPU strings (for admin forensic display, NOT used in hash)
  webglRendererRaw: string | null;
  webglVendorRaw: string | null;

  // Rendering hashes (browser-dependent — NOT used in hash)
  canvasFingerprint: string;
  audioFingerprint: string;
}

export interface DeviceFingerprints {
  visitorId: string;
  hardwareFingerprint: string;
  components: DeviceComponents;
  generatedAt: number;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export async function generateDeviceFingerprints(): Promise<DeviceFingerprints | null> {
  try {
    const FingerprintJS = (await import("@fingerprintjs/fingerprintjs")).default;
    const fp = await FingerprintJS.load();
    const result = await fp.get();

    const components = await collectComponents();
    const hardwareFingerprint = await generateHardwareHash(components);
    const generatedAt = Date.now();

    console.log("[Device Fingerprint] Generated:", {
      visitorId: result.visitorId,
      hardwareFingerprint,
      platform: components.platform,
      gpu: components.webglRenderer,
      gpuRaw: components.webglRendererRaw,
      screen: components.screenResolution,
      cores: components.hardwareConcurrency,
    });

    return {
      visitorId: result.visitorId,
      hardwareFingerprint,
      components,
      generatedAt,
    };
  } catch (error) {
    console.error("Failed to generate fingerprints:", error);
    return null;
  }
}

// ─── Component Collection ───────────────────────────────────────────────────

async function collectComponents(): Promise<DeviceComponents> {
  const [canvasFingerprint, audioFingerprint] = await Promise.all([
    getCanvasFingerprint(),
    getAudioFingerprint(),
  ]);

  const webglInfo = getWebGLInfo();

  return {
    // Normalized platform (consistent across all browsers on same OS)
    platform: normalizePlatform(),
    platformVersion: getPlatformVersion(),

    // Display (OS-level, consistent across browsers)
    screenResolution: `${screen.width}x${screen.height}`,
    availableScreenSize: `${screen.availWidth}x${screen.availHeight}`,
    colorDepth: screen.colorDepth,
    devicePixelRatio: Math.round(window.devicePixelRatio * 100) / 100,

    // Hardware
    deviceMemory: (navigator as any).deviceMemory ?? null,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,

    // Normalized GPU (ANGLE wrapper stripped for cross-browser consistency)
    webglRenderer: normalizeGpuRenderer(webglInfo.renderer),
    webglVendor: normalizeGpuVendor(webglInfo.vendor),

    // Raw GPU (for admin forensic display only)
    webglRendererRaw: webglInfo.renderer,
    webglVendorRaw: webglInfo.vendor,

    // Browser-dependent rendering hashes (NOT used in hash)
    canvasFingerprint,
    audioFingerprint,
  };
}

// ─── Platform Normalization ─────────────────────────────────────────────────
// Chrome returns "macOS" via userAgentData, Safari returns "MacIntel" via
// navigator.platform. We normalize to a single short string per OS.

function normalizePlatform(): string {
  // Gather all available platform indicators
  const uaData = (navigator as any).userAgentData;
  const uaPlatform = uaData?.platform?.toLowerCase() ?? "";
  const navPlatform = (navigator.platform ?? "").toLowerCase();
  const ua = navigator.userAgent.toLowerCase();

  // Combine all signals and check
  const all = `${uaPlatform}|${navPlatform}|${ua}`;

  if (all.includes("iphone") || all.includes("ipad") || all.includes("ipod")) {
    return "ios";
  }
  if (all.includes("android")) {
    return "android";
  }
  if (uaPlatform.includes("mac") || navPlatform.includes("mac") || ua.includes("macintosh")) {
    return "mac";
  }
  if (uaPlatform.includes("win") || navPlatform.includes("win") || ua.includes("windows")) {
    return "win";
  }
  if (uaPlatform.includes("linux") || navPlatform.includes("linux")) {
    return "linux";
  }
  if (uaPlatform.includes("chrome") || navPlatform.includes("cros")) {
    return "chromeos";
  }
  return "unknown";
}

function getPlatformVersion(): string | null {
  const uaData = (navigator as any).userAgentData;
  if (uaData?.platformVersion) {
    return uaData.platformVersion;
  }
  return null;
}

// ─── GPU Normalization ──────────────────────────────────────────────────────
// Chrome wraps GPU info in ANGLE: "ANGLE (Apple, Apple M2, OpenGL 4.1)"
// Safari returns raw: "Apple M2"
// We strip the ANGLE wrapper and normalize to just the GPU model.

function normalizeGpuRenderer(raw: string | null): string | null {
  if (!raw) return null;

  // Chrome/Edge ANGLE format: "ANGLE (Vendor, GPU Model, API version)"
  // Extract the GPU model (second segment)
  const angleMatch = raw.match(/ANGLE\s*\([^,]*,\s*([^,)]+)/i);
  if (angleMatch) {
    return angleMatch[1].trim().toLowerCase();
  }

  // Firefox format: might include "Mesa" prefix or other wrappers
  // Just lowercase and trim
  return raw.trim().toLowerCase();
}

function normalizeGpuVendor(raw: string | null): string | null {
  if (!raw) return null;

  // Chrome: "Google Inc. (Apple)" → extract "apple" from parenthetical
  const parenthetical = raw.match(/\(([^)]+)\)/);
  if (parenthetical) {
    return parenthetical[1].trim().toLowerCase();
  }

  // Safari: "Apple Inc." → strip Inc/Corp suffixes
  return raw
    .replace(/\s*(inc\.?|corporation|corp\.?|ltd\.?)\s*/gi, "")
    .trim()
    .toLowerCase();
}

// ─── WebGL GPU Fingerprinting ───────────────────────────────────────────────

function getWebGLInfo(): { renderer: string | null; vendor: string | null } {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!gl) return { renderer: null, vendor: null };

    const glCtx = gl as WebGLRenderingContext;
    const debugInfo = glCtx.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return { renderer: null, vendor: null };

    return {
      renderer: glCtx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || null,
      vendor: glCtx.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || null,
    };
  } catch {
    return { renderer: null, vendor: null };
  }
}

// ─── Canvas Fingerprinting ──────────────────────────────────────────────────
// NOTE: Canvas output varies between browsers (Chrome/Skia vs Safari/CoreGraphics).
// Collected for forensic logging only, NOT used in hardware hash.

async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "unsupported";

    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#333333";
    ctx.font = "18px Arial";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("BIMPAcc LMS fp", 4, 22);

    ctx.font = "14px 'Times New Roman'";
    ctx.fillStyle = "rgba(20, 83, 187, 0.7)";
    ctx.fillText("Canvas@2025", 4, 44);

    ctx.beginPath();
    ctx.arc(200, 30, 20, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 100, 50, 0.5)";
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, 0, 280, 0);
    gradient.addColorStop(0, "rgba(255,0,0,0.3)");
    gradient.addColorStop(0.5, "rgba(0,255,0,0.3)");
    gradient.addColorStop(1, "rgba(0,0,255,0.3)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 50, 280, 10);

    const dataUrl = canvas.toDataURL("image/png");
    return await sha256Short(dataUrl);
  } catch {
    return "error";
  }
}

// ─── Audio Fingerprinting ───────────────────────────────────────────────────
// NOTE: Audio processing varies between browsers.
// Collected for forensic logging only, NOT used in hardware hash.

async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return "unsupported";

    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const compressor = context.createDynamicsCompressor();
    const analyser = context.createAnalyser();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(10000, context.currentTime);

    compressor.threshold.setValueAtTime(-50, context.currentTime);
    compressor.knee.setValueAtTime(40, context.currentTime);
    compressor.ratio.setValueAtTime(12, context.currentTime);
    compressor.attack.setValueAtTime(0, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);

    oscillator.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(context.destination);

    oscillator.start(0);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(frequencyData);

    oscillator.stop();
    await context.close();

    const sample = Array.from(frequencyData.slice(0, 64))
      .map((v) => (isFinite(v) ? v.toFixed(4) : "0"))
      .join(",");

    return await sha256Short(sample);
  } catch {
    return "error";
  }
}

// ─── SHA-256 Hashing ────────────────────────────────────────────────────────

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Short(input: string): Promise<string> {
  const full = await sha256(input);
  return full.slice(0, 16);
}

// ─── Hardware Hash Generation ───────────────────────────────────────────────
// Uses ONLY OS-level signals that are GUARANTEED identical across ALL browsers.
// GPU, canvas, audio, deviceMemory are ALL excluded from matching.
// They are collected and stored in components for admin forensic display ONLY.

async function generateHardwareHash(
  components: DeviceComponents
): Promise<string> {
  // These 6 signals are OS-level properties, read from the same system APIs
  // by every browser. They are NEVER affected by rendering engine differences.
  const signals = [
    components.platform,                                  // normalized: "mac", "win", etc.
    components.screenResolution,                          // screen.width x screen.height
    components.colorDepth.toString(),                     // screen.colorDepth
    components.devicePixelRatio.toString(),               // window.devicePixelRatio
    components.hardwareConcurrency?.toString() ?? "na",   // navigator.hardwareConcurrency (CPU cores)
    components.maxTouchPoints.toString(),                 // navigator.maxTouchPoints
  ].join("|");

  // Log the exact signals going into the hash for debugging
  console.log("[Device Hash] Input signals:", signals);

  const fullHash = await sha256(signals);

  // Human-readable prefix for admin identification
  const platformPrefix = components.platform.slice(0, 4);
  const screenSuffix = components.screenResolution.replace("x", "");

  const result = `${platformPrefix}-${fullHash.slice(0, 16)}-${screenSuffix}`;
  console.log("[Device Hash] Generated:", result);

  return result;
}


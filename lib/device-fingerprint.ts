"use client";

export interface DeviceFingerprints {
  visitorId: string;
  hardwareFingerprint: string;
  components: {
    platform: string;
    os: string;
    screenResolution: string;
    deviceMemory: number | null;
    hardwareConcurrency: number | null;
    timezone: string;
    touchSupport: string;
    colorDepth: number;
    pixelRatio: number;
  };
}

export async function generateDeviceFingerprints(): Promise<DeviceFingerprints | null> {
  try {
    const FingerprintJS = (await import("@fingerprintjs/fingerprintjs")).default;
    const fp = await FingerprintJS.load();
    const result = await fp.get();

    const platformComponent = result.components.platform;
    const vendorComponent = result.components.vendorFlavors;
    const screenComponent = result.components.screenResolution;

    const components = {
      platform:
        typeof platformComponent === "object" && "value" in platformComponent
          ? platformComponent.value
          : (navigator.platform ?? "unknown"),
      os:
        typeof vendorComponent === "object" && "value" in vendorComponent
          ? ((vendorComponent.value as string[])?.join(",") ?? "unknown")
          : "unknown",
      screenResolution:
        typeof screenComponent === "object" && "value" in screenComponent
          ? ((screenComponent.value as [number, number] | undefined)?.join("x") ?? "unknown")
          : `${screen.width}x${screen.height}`,
      deviceMemory: (navigator as any).deviceMemory ?? null,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      touchSupport: getTouchSupport(),
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
    };

    const hardwareFingerprint = generateHardwareHash(components);

    return {
      visitorId: result.visitorId,
      hardwareFingerprint,
      components,
    };
  } catch (error) {
    console.error("Failed to generate fingerprints:", error);
    return null;
  }
}

function getTouchSupport(): string {
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const touchEvent = "ontouchstart" in window;
  return `${maxTouchPoints}-${touchEvent}`;
}

function generateHardwareHash(components: DeviceFingerprints["components"]): string {
  const hardwareSignals = [
    components.platform,
    components.screenResolution,
    components.deviceMemory?.toString() ?? "null",
    components.hardwareConcurrency?.toString() ?? "null",
    components.timezone,
    components.touchSupport,
    components.colorDepth.toString(),
    components.pixelRatio.toString(),
  ].join("|");

  let hash = 0;
  for (let i = 0; i < hardwareSignals.length; i++) {
    const char = hardwareSignals.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hashHex = Math.abs(hash).toString(16).padStart(8, "0");
  const prefix = btoa(components.platform).slice(0, 4).toLowerCase();
  const suffix = components.screenResolution.replace("x", "");

  return `${prefix}-${hashHex}-${suffix}`;
}

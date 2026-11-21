import { describe, expect, it } from "vitest";
import {
  DEFAULT_SESSION_MAX_HOURS,
  getSessionMaxSeconds,
  isSessionExpired,
  sessionStartedAt,
} from "@/lib/session-policy";

const HOUR = 3600;
const NOW = 1_800_000_000;

describe("getSessionMaxSeconds", () => {
  it("defaults to 7 hours", () => {
    expect(DEFAULT_SESSION_MAX_HOURS).toBe(7);
    expect(getSessionMaxSeconds(undefined)).toBe(7 * HOUR);
  });

  it("accepts a valid override", () => {
    expect(getSessionMaxSeconds("2")).toBe(2 * HOUR);
    expect(getSessionMaxSeconds("0.5")).toBe(HOUR / 2);
  });

  it("never disables the limit via a bad value", () => {
    for (const bad of ["", "0", "-3", "abc", "Infinity", "NaN"]) {
      expect(getSessionMaxSeconds(bad), bad).toBe(7 * HOUR);
    }
  });
});

describe("sessionStartedAt", () => {
  it("uses the oldest amr timestamp (a later TOTP step must not reset the clock)", () => {
    const claims = {
      amr: [
        { method: "totp", timestamp: NOW - 100 },
        { method: "oauth", timestamp: NOW - 5 * HOUR },
      ],
    };
    expect(sessionStartedAt(claims)).toBe(NOW - 5 * HOUR);
  });

  it("returns null for missing, malformed or unusable claims", () => {
    expect(sessionStartedAt(null)).toBeNull();
    expect(sessionStartedAt({})).toBeNull();
    expect(sessionStartedAt({ amr: "oauth" })).toBeNull();
    expect(sessionStartedAt({ amr: [] })).toBeNull();
    expect(sessionStartedAt({ amr: [{ method: "oauth" }, null, 5, { timestamp: "x" }] })).toBeNull();
    expect(sessionStartedAt({ amr: [{ timestamp: -1 }, { timestamp: 0 }] })).toBeNull();
  });
});

describe("isSessionExpired", () => {
  const session = (agoSeconds: number) => ({
    amr: [{ method: "oauth", timestamp: NOW - agoSeconds }],
  });

  it("is valid before 7 hours and expired from 7 hours on", () => {
    expect(isSessionExpired(session(6 * HOUR + 59 * 60), NOW, 7 * HOUR)).toBe(false);
    expect(isSessionExpired(session(7 * HOUR), NOW, 7 * HOUR)).toBe(true);
    expect(isSessionExpired(session(30 * HOUR), NOW, 7 * HOUR)).toBe(true);
  });

  it("is not affected by activity or token refresh (only the login time counts)", () => {
    // A user who has been active constantly for 8 hours still expires.
    expect(isSessionExpired(session(8 * HOUR), NOW, 7 * HOUR)).toBe(true);
  });

  it("does not log anyone out when the start time is unknown", () => {
    expect(isSessionExpired({}, NOW, 7 * HOUR)).toBe(false);
    expect(isSessionExpired(null, NOW, 7 * HOUR)).toBe(false);
  });

  it("uses the 7 hour default", () => {
    expect(isSessionExpired(session(7 * HOUR + 1), NOW)).toBe(true);
    expect(isSessionExpired(session(HOUR), NOW)).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_STUDENT_MAX_SESSIONS,
  describeUserAgent,
  getSessionLimit,
  sessionsToRevoke,
} from "@/lib/session-limit";

const read = (f: string) => readFileSync(path.resolve(__dirname, "../..", f), "utf8");

describe("getSessionLimit", () => {
  it("limits students to 2 devices by default", () => {
    expect(getSessionLimit("student", {})).toBe(DEFAULT_STUDENT_MAX_SESSIONS);
    expect(DEFAULT_STUDENT_MAX_SESSIONS).toBe(2);
  });

  it("does not limit admins or instructors", () => {
    expect(getSessionLimit("admin", {})).toBeNull();
    expect(getSessionLimit("instructor", {})).toBeNull();
    expect(getSessionLimit(null, {})).toBeNull();
  });

  it("reads STUDENT_MAX_SESSIONS and clamps it to 1..10", () => {
    expect(getSessionLimit("student", { STUDENT_MAX_SESSIONS: "1" })).toBe(1);
    expect(getSessionLimit("student", { STUDENT_MAX_SESSIONS: "3" })).toBe(3);
    expect(getSessionLimit("student", { STUDENT_MAX_SESSIONS: "0" })).toBe(1);
    expect(getSessionLimit("student", { STUDENT_MAX_SESSIONS: "99" })).toBe(10);
    expect(getSessionLimit("student", { STUDENT_MAX_SESSIONS: "abc" })).toBe(2);
  });

  it("SESSION_LIMIT_ENFORCEMENT=off is the kill switch", () => {
    expect(getSessionLimit("student", { SESSION_LIMIT_ENFORCEMENT: "off" })).toBeNull();
    expect(getSessionLimit("student", { SESSION_LIMIT_ENFORCEMENT: " OFF " })).toBeNull();
    expect(getSessionLimit("student", { SESSION_LIMIT_ENFORCEMENT: "on" })).toBe(2);
  });
});

describe("sessionsToRevoke", () => {
  const s = (id: string, minutesAgo: number) => ({
    session_id: id,
    created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  });

  it("keeps the current session plus the newest others, revokes the oldest", () => {
    const active = [s("old", 300), s("mid", 100), s("new", 1)];
    expect(sessionsToRevoke(active, 2, "new")).toEqual(["old"]);
  });

  it("always keeps the current session even if it sorts as oldest", () => {
    const active = [s("current", 500), s("a", 10), s("b", 5)];
    expect(sessionsToRevoke(active, 2, "current")).toEqual(["a"]);
  });

  it("revokes every other session when the limit is 1", () => {
    expect(sessionsToRevoke([s("x", 3), s("y", 2), s("me", 1)], 1, "me").sort()).toEqual(["x", "y"]);
  });

  it("revokes nothing when within the limit", () => {
    expect(sessionsToRevoke([s("me", 1), s("other", 50)], 2, "me")).toEqual([]);
    expect(sessionsToRevoke([], 2, "me")).toEqual([]);
  });
});

describe("describeUserAgent", () => {
  it("names common browser / OS pairs", () => {
    expect(
      describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36")
    ).toBe("Chrome on Windows");
    expect(
      describeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
    ).toBe("Safari on iOS");
    expect(describeUserAgent(null)).toBe("Unknown device");
  });
});

describe("session limit wiring (static)", () => {
  it("every successful OAuth sign-in registers its session", () => {
    const cb = read("app/auth/callback/route.ts");
    expect(cb).toContain("registerSession(");
    expect(cb.match(/await completeLogin\(/g)?.length).toBe(3);
    expect(cb).not.toMatch(/logLogin\(googleAuthId, "success"\);\s*return/);
  });

  it("the proxy refuses revoked sessions", () => {
    const proxy = read("proxy.ts");
    expect(proxy).toContain('from("user_sessions")');
    expect(proxy).toContain('endSession("session_revoked")');
  });

  it("sign-out ends only this device", () => {
    const auth = read("app/actions/auth.ts");
    const fn = auth.slice(auth.indexOf("export async function signOut("), auth.indexOf("export async function signInWithGoogle("));
    expect(fn).toContain('signOut({ scope: "local" })');
    expect(fn).not.toMatch(/auth\.signOut\(\)/);
  });

  it("admin device sign-out is authorized, protected and audited", () => {
    const admin = read("app/actions/admin.ts");
    const fn = admin.slice(admin.indexOf("export async function signOutUserDevices("));
    expect(fn).toContain("verifyAdmin()");
    expect(fn).toContain("userId === session.userId");
    expect(fn).toContain("targetSuper");
    expect(fn).toContain("failClosed: true");
    expect(fn).toContain('"user.sessions_revoked"');
  });

  it("the migration gives clients read-only access and keeps the revoke RPC server-only", () => {
    const sql = read("supabase/migrations/20261124120000_user_sessions_limit.sql").toLowerCase();
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("grant select on public.user_sessions to authenticated");
    expect(sql).not.toMatch(/grant (insert|update|delete|all)[^;]*user_sessions[^;]*authenticated/);
    expect(sql).toMatch(/revoke all on function public\.revoke_auth_sessions\(uuid\[\]\) from public, anon, authenticated/);
    expect(sql).toContain("grant execute on function public.revoke_auth_sessions(uuid[]) to service_role");
  });
});

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard: every exported server action that uses the service-role client
 * (createAdminClient, which BYPASSES RLS) must authorize the caller inside the
 * same function. This is a static heuristic; it catches "forgot the check
 * entirely" (which is how adminCreateUser/bulkApproveStudents shipped), not a
 * check placed in the wrong order. Review ordering in code review.
 */

const root = path.resolve(__dirname, "../..");

const AUTHZ =
  /verifyAdmin\(|verifySuperAdmin\(|verifyAdminOrInstructor\(|verifyAttendanceAccess\(|verifyInstructor\(|canAccessLesson\(|role\s*!==?\s*["']admin["']/;

/** Public / self-scoped actions that legitimately use the service role. Keep this list SHORT. */
const ALLOWED: Record<string, string> = {
  "app/actions/auth.ts#signIn": "pre-authentication; writes login_history for the attempt",
  "app/actions/auth.ts#reportScreenRecordingViolation":
    "acts only on the caller's own session user (auth.getUser)",
};

function sourceFiles(): string[] {
  const actions = readdirSync(path.join(root, "app/actions"))
    .filter((f) => f.endsWith(".ts"))
    .map((f) => `app/actions/${f}`);
  return [...actions, "lib/supabase/actions.ts"];
}

function exportedFunctions(src: string): { name: string; body: string }[] {
  const parts = src.split(/\n(?=export async function )/);
  return parts.slice(1).map((p) => ({
    name: /export async function (\w+)/.exec(p)![1],
    body: p,
  }));
}

describe("service-role client authorization", () => {
  const offenders: string[] = [];
  let checked = 0;

  for (const file of sourceFiles()) {
    const src = readFileSync(path.join(root, file), "utf8");
    for (const fn of exportedFunctions(src)) {
      if (!/createAdminClient\(/.test(fn.body)) continue;
      checked++;
      const key = `${file}#${fn.name}`;
      if (ALLOWED[key]) continue;
      if (!AUTHZ.test(fn.body)) offenders.push(key);
    }
  }

  it("inspects a meaningful number of functions", () => {
    expect(checked).toBeGreaterThan(30);
  });

  it("has no service-role action without an authorization check", () => {
    expect(offenders).toEqual([]);
  });

  it("keeps the allowlist honest (every entry still exists)", () => {
    for (const key of Object.keys(ALLOWED)) {
      const [file, name] = key.split("#");
      const src = readFileSync(path.join(root, file), "utf8");
      expect(src, key).toContain(`export async function ${name}`);
    }
  });
});

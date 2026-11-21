import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static RLS regression guard. Replays supabase/migrations in order and checks
 * the *effective* policy set. It cannot see changes made in the dashboard, so
 * also run supabase/diagnostics/list_rls_policies.sql against the live project.
 */

interface Policy {
  table: string;
  name: string;
  cmd: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "ALL";
  restrictive: boolean;
  expr: string;
}

const dir = path.resolve(__dirname, "../../supabase/migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

function strip(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

function replay(): Policy[] {
  const policies = new Map<string, Policy>();
  const re =
    /\b(create\s+policy|drop\s+policy(?:\s+if\s+exists)?)\s+("[^"]+"|\w+)\s+on\s+([\w."]+)([^;]*)/gi;
  for (const f of files) {
    const sql = strip(readFileSync(path.join(dir, f), "utf8"));
    for (const m of sql.matchAll(re)) {
      const table = m[3].replace(/"/g, "").replace(/^public\./, "");
      const name = m[2].replace(/"/g, "");
      const key = `${table}::${name}`;
      if (/^drop/i.test(m[1])) {
        policies.delete(key);
        continue;
      }
      const body = m[4].replace(/\s+/g, " ").trim();
      const cmd = (/\bfor\s+(select|insert|update|delete|all)\b/i.exec(body)?.[1] ?? "all")
        .toUpperCase() as Policy["cmd"];
      policies.set(key, {
        table,
        name,
        cmd,
        restrictive: /\bas\s+restrictive\b/i.test(body),
        expr: body.toLowerCase(),
      });
    }
  }
  return [...policies.values()];
}

const policies = replay();
const writes = (p: Policy) => p.cmd !== "SELECT";

describe("effective RLS policies (from migrations)", () => {
  it("replays a non-trivial policy set", () => {
    expect(policies.length).toBeGreaterThan(40);
  });

  it("has no unconditionally-open write policy", () => {
    const open = policies.filter(
      (p) =>
        !p.restrictive &&
        writes(p) &&
        (/with check \(?\s*true\s*\)?/.test(p.expr) ||
          /using \(?\s*true\s*\)?/.test(p.expr) ||
          /(using|with check)\s*\(\s*auth\.uid\(\) is not null\s*\)(?!\s*and\b)/.test(p.expr))
    );
    expect(open.map((p) => `${p.table}: ${p.name}`)).toEqual([]);
  });

  it("allows no client-side INSERT into audit_log or login_history", () => {
    const bad = policies.filter(
      (p) =>
        ["audit_log", "login_history"].includes(p.table) &&
        (p.cmd === "INSERT" || p.cmd === "ALL")
    );
    expect(bad.map((p) => p.name)).toEqual([]);
  });

  it("only lets admins insert enrollments", () => {
    const bad = policies.filter(
      (p) =>
        p.table === "enrollments" &&
        (p.cmd === "INSERT" || p.cmd === "ALL") &&
        !p.expr.includes("is_admin()")
    );
    expect(bad.map((p) => p.name)).toEqual([]);
  });

  it("does not let arbitrary logged-in users update or delete users", () => {
    const bad = policies.filter(
      (p) =>
        p.table === "users" &&
        !p.restrictive &&
        (p.cmd === "UPDATE" || p.cmd === "DELETE") &&
        /auth\.uid\(\) is not null/.test(p.expr)
    );
    expect(bad.map((p) => p.name)).toEqual([]);
  });

  it("constrains self-insert on users", () => {
    const inserts = policies.filter(
      (p) => p.table === "users" && p.cmd === "INSERT" && !p.restrictive
    );
    expect(inserts.length).toBeGreaterThan(0);
    for (const p of inserts) expect(p.expr).toMatch(/role = 'student'/);
  });
});

describe("users privileged-column protection", () => {
  const sql = files.map((f) => strip(readFileSync(path.join(dir, f), "utf8"))).join("\n");

  it("installs the privileged-column trigger", () => {
    expect(sql).toMatch(/create trigger protect_user_privileged_columns/i);
  });

  it("never lets owners edit role/approval/pause/lock/fingerprint columns", () => {
    const fn = /function public\.protect_user_privileged_columns[\s\S]*?\$\$;/i.exec(sql)?.[0] ?? "";
    const allowed = /allowed text\[\] := ARRAY\[([\s\S]*?)\];/i.exec(fn)?.[1] ?? "";
    for (const col of [
      "role",
      "is_approved",
      "is_paused",
      "is_locked",
      "onboarding_bypassed",
      "device_fingerprint",
      "hardware_fingerprint",
      "device_components",
      "email",
      "id",
    ]) {
      expect(allowed, col).not.toContain(`'${col}'`);
    }
  });
});

describe("lesson_comments", () => {
  it("binds inserted comments to the caller (no impersonation)", () => {
    const inserts = policies.filter(
      (p) => p.table === "lesson_comments" && p.cmd === "INSERT" && !p.restrictive
    );
    expect(inserts.length).toBeGreaterThan(0);
    for (const p of inserts) expect(p.expr).toMatch(/user_id\s*=\s*auth\.uid\(\)/);
  });
});

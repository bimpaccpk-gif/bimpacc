import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const read = (f: string) => readFileSync(path.join(root, f), "utf8");

function fn(src: string, name: string): string {
  const start = src.indexOf(`export async function ${name}(`);
  expect(start, name).toBeGreaterThan(-1);
  const next = src.indexOf("\nexport async function ", start + 10);
  return src.slice(start, next === -1 ? undefined : next);
}

describe("auth actions (static checks)", () => {
  const auth = read("app/actions/auth.ts");

  it("signIn never echoes Supabase's raw error message (account enumeration)", () => {
    expect(fn(auth, "signIn")).not.toMatch(/error:\s*error\.message/);
  });

  it("signUp never echoes Supabase's raw error message", () => {
    expect(fn(auth, "signUp")).not.toMatch(/error:\s*error\.message/);
  });

  it("signIn throttles by email AND by IP", () => {
    const body = fn(auth, "signIn");
    expect(body).toContain("signin:");
    expect(body).toContain("signin-ip:");
  });

  it("signUp throttles by IP and fails closed", () => {
    const body = fn(auth, "signUp");
    expect(body).toContain("signup-ip:");
    expect(body).toContain("failClosed: true");
  });
});

describe("bulk user creation", () => {
  const src = read("lib/supabase/actions.ts");

  it("does not use a shared default password", () => {
    expect(src).not.toMatch(/TempPass/);
    // no hard-coded password literal (plain string or interpolation-free template string)
    expect(src).not.toMatch(/password\s*=\s*["'][^"']+["']/);
    expect(src).not.toMatch(/password\s*=\s*`[^$`]*`/);
    expect(read("components/admin/bulk-user-form.tsx")).not.toContain("TempPass");
  });

  it("throttles destructive/bulk admin actions", () => {
    for (const a of ["bulk-create-users", "bulk-delete-users", "bulk-approve-students"]) {
      expect(src).toContain(`"${a}"`);
    }
  });
});

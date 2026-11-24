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

describe("Google-only production", () => {
  const auth = read("app/actions/auth.ts");

  it("signIn and signUp refuse password auth outside development", () => {
    for (const name of ["signIn", "signUp"]) {
      expect(fn(auth, name), name).toContain("isPasswordAuthEnabled()");
    }
  });

  it("the OAuth callback only honours a course that is open for registration", () => {
    const cb = read("app/auth/callback/route.ts");
    expect(cb).toContain('.eq("registration_open", true)');
  });
});

describe("bulk user creation", () => {
  const src = [read("app/actions/user-management.ts"), read("app/actions/approval.ts")].join("\n");

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

describe("MFA recovery", () => {
  const admin = read("app/actions/admin.ts");

  it("resetUserMfa authorizes, forbids self and super-admin resets, and is audited", () => {
    const body = fn(admin, "resetUserMfa");
    expect(body).toContain("verifyAdmin()");
    expect(body).toContain("userId === session.userId");
    expect(body).toContain("targetSuper");
    expect(body).toContain('"user.mfa_reset"');
    expect(body).toContain("failClosed: true");
  });

  it("the MFA screen does not itself require completed MFA (no redirect loop)", () => {
    expect(read("app/mfa/page.tsx")).toContain("getMfaSessionUser()");
    expect(read("app/mfa/page.tsx")).not.toContain("getCurrentUser");
  });
});

describe("quiz answers stay on the server", () => {
  it("the browser-side quiz component never references the correct answer field", () => {
    expect(read("components/student/lesson-quiz.tsx")).not.toContain("correct_option");
  });

  it("the quiz action never uses select(*) on questions", () => {
    expect(read("app/actions/quiz.ts")).not.toMatch(/from\("quiz_questions"\)\s*\.select\("\*"\)/);
  });
});

describe("login error messages and paused accounts", () => {
  it("every ?error= code the app redirects to /login with has a message on the login page", () => {
    const files = ["proxy.ts", "lib/dal.ts", "app/auth/callback/route.ts", "app/actions/auth.ts"];
    const codes = new Set<string>();
    for (const f of files) {
      for (const m of read(f).matchAll(/login\?error=([a-z_]+)/g)) codes.add(m[1]);
      for (const m of read(f).matchAll(/searchParams\.set\("error",\s*"([a-z_]+)"\)/g)) codes.add(m[1]);
      for (const m of read(f).matchAll(/endSession\("([a-z_]+)"\)/g)) codes.add(m[1]);
    }
    expect(codes.size).toBeGreaterThan(2);
    const page = read("app/(auth)/login/page.tsx");
    for (const code of codes) expect(page, code).toContain(`${code}:`);
  });

  it("the proxy signs paused or revoked sessions out instead of bouncing them between /login and the dashboard", () => {
    const proxy = read("proxy.ts");
    const helper = proxy.slice(proxy.indexOf("const endSession"), proxy.indexOf("const endSession") + 700);
    expect(helper).toContain('signOut({ scope: "local" })');
    expect(helper).toContain("user = null");
    expect(helper).toContain("if (isAuthRoute) return null");
    expect(proxy).toContain('endSession("account_paused")');
    expect(proxy).toContain('endSession("session_revoked")');
  });
});

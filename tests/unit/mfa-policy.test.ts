import { describe, expect, it } from "vitest";
import { getMfaEnforcement, isMfaExemptPath, mfaGate } from "@/lib/mfa-policy";

describe("getMfaEnforcement", () => {
  it("is off unless explicitly set to enforce", () => {
    expect(getMfaEnforcement(undefined)).toBe("off");
    expect(getMfaEnforcement("")).toBe("off");
    expect(getMfaEnforcement("true")).toBe("off");
    expect(getMfaEnforcement("enforce")).toBe("enforce");
  });
});

describe("isMfaExemptPath", () => {
  it("exempts only the MFA screen and OAuth callback", () => {
    expect(isMfaExemptPath("/mfa")).toBe(true);
    expect(isMfaExemptPath("/auth/callback")).toBe(true);
    expect(isMfaExemptPath("/mfa-evil")).toBe(false);
    expect(isMfaExemptPath("/admin")).toBe(false);
    expect(isMfaExemptPath("/")).toBe(false);
  });
});

describe("mfaGate (applies to every signed-in user)", () => {
  const base = { enforcement: "enforce", aal: "aal1", pathname: "/student" } as const;

  it("sends a user without completed MFA to /mfa from every other path", () => {
    expect(mfaGate(base)).toBe("redirect-to-mfa");
    expect(mfaGate({ ...base, pathname: "/admin/users" })).toBe("redirect-to-mfa");
    expect(mfaGate({ ...base, pathname: "/instructor" })).toBe("redirect-to-mfa");
    // Server Actions can be POSTed to any path, so unrelated paths must be gated too.
    expect(mfaGate({ ...base, pathname: "/" })).toBe("redirect-to-mfa");
    expect(mfaGate({ ...base, pathname: "/login" })).toBe("redirect-to-mfa");
  });

  it("lets the user reach the MFA screen to complete setup", () => {
    expect(mfaGate({ ...base, pathname: "/mfa" })).toBe("allow");
    expect(mfaGate({ ...base, pathname: "/auth/callback" })).toBe("allow");
  });

  it("treats a missing or unexpected aal claim as not verified (fail closed)", () => {
    expect(mfaGate({ ...base, aal: undefined })).toBe("redirect-to-mfa");
    expect(mfaGate({ ...base, aal: null })).toBe("redirect-to-mfa");
    expect(mfaGate({ ...base, aal: "aal3" })).toBe("redirect-to-mfa");
  });

  it("allows anyone who completed MFA, normal use resumes", () => {
    expect(mfaGate({ ...base, aal: "aal2" })).toBe("allow");
    expect(mfaGate({ ...base, aal: "aal2", pathname: "/admin" })).toBe("allow");
  });

  it("does nothing while enforcement is off", () => {
    expect(mfaGate({ ...base, enforcement: "off" })).toBe("allow");
  });
});

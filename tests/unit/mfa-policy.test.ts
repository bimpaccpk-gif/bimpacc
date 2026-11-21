import { describe, expect, it } from "vitest";
import { getMfaEnforcement, isMfaExemptPath, mfaGate, roleRequiresMfa } from "@/lib/mfa-policy";

describe("getMfaEnforcement", () => {
  it("is off unless explicitly set to enforce", () => {
    expect(getMfaEnforcement(undefined)).toBe("off");
    expect(getMfaEnforcement("")).toBe("off");
    expect(getMfaEnforcement("true")).toBe("off");
    expect(getMfaEnforcement("enforce")).toBe("enforce");
  });
});

describe("roleRequiresMfa", () => {
  it("covers admin and instructor only", () => {
    expect(roleRequiresMfa("admin")).toBe(true);
    expect(roleRequiresMfa("instructor")).toBe(true);
    expect(roleRequiresMfa("student")).toBe(false);
    expect(roleRequiresMfa(null)).toBe(false);
    expect(roleRequiresMfa(undefined)).toBe(false);
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

describe("mfaGate", () => {
  const base = { enforcement: "enforce", role: "admin", aal: "aal1", pathname: "/admin" } as const;

  it("redirects staff at aal1 everywhere except the MFA screen", () => {
    expect(mfaGate(base)).toBe("redirect-to-mfa");
    expect(mfaGate({ ...base, role: "instructor", pathname: "/student" })).toBe("redirect-to-mfa");
    // Server Actions can be POSTed to any path, so unrelated paths must be gated too.
    expect(mfaGate({ ...base, pathname: "/" })).toBe("redirect-to-mfa");
    expect(mfaGate({ ...base, pathname: "/login" })).toBe("redirect-to-mfa");
    expect(mfaGate({ ...base, pathname: "/mfa" })).toBe("allow");
  });

  it("treats a missing aal claim as not verified", () => {
    expect(mfaGate({ ...base, aal: undefined })).toBe("redirect-to-mfa");
  });

  it("allows staff who completed MFA", () => {
    expect(mfaGate({ ...base, aal: "aal2" })).toBe("allow");
  });

  it("never gates students or unknown roles", () => {
    expect(mfaGate({ ...base, role: "student" })).toBe("allow");
    expect(mfaGate({ ...base, role: null })).toBe("allow");
  });

  it("does nothing while enforcement is off", () => {
    expect(mfaGate({ ...base, enforcement: "off" })).toBe("allow");
  });
});

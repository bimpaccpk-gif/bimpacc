import { describe, expect, it } from "vitest";
import {
  adminCreateUserSchema,
  changeRoleSchema,
  onboardingSchema,
  signInSchema,
  validateFormData,
} from "@/lib/validations";

describe("signInSchema", () => {
  it("accepts a gmail address with a valid password", () => {
    expect(signInSchema.safeParse({ email: "a@gmail.com", password: "12345678" }).success).toBe(
      true
    );
  });

  it("rejects non-gmail, malformed email and short passwords", () => {
    expect(signInSchema.safeParse({ email: "a@yahoo.com", password: "12345678" }).success).toBe(
      false
    );
    expect(signInSchema.safeParse({ email: "nope", password: "12345678" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@gmail.com", password: "123" }).success).toBe(false);
  });
});

describe("adminCreateUserSchema", () => {
  const valid = { fullName: "Ali Khan", email: "ali@gmail.com", password: "Strong#123" };

  it("applies defaults", () => {
    const r = adminCreateUserSchema.parse(valid);
    expect(r.role).toBe("student");
    expect(r.bypassOnboarding).toBe(false);
  });

  it.each([
    ["no uppercase", "strong#123"],
    ["no number", "Strong#abc"],
    ["no special char", "Strong1234"],
  ])("rejects a password with %s", (_n, password) => {
    expect(adminCreateUserSchema.safeParse({ ...valid, password }).success).toBe(false);
  });

  it("rejects unknown roles", () => {
    expect(adminCreateUserSchema.safeParse({ ...valid, role: "root" }).success).toBe(false);
  });
});

describe("changeRoleSchema", () => {
  it("requires a uuid and a known role", () => {
    expect(changeRoleSchema.safeParse({ userId: "1", role: "admin" }).success).toBe(false);
    expect(
      changeRoleSchema.safeParse({
        userId: "6f1c1c1e-2d3f-4a5b-8c9d-0e1f2a3b4c5d",
        role: "instructor",
      }).success
    ).toBe(true);
  });
});

describe("validateFormData", () => {
  it("returns the first error message on failure", () => {
    const r = validateFormData(changeRoleSchema, { userId: "x", role: "admin" });
    expect(r).toEqual({ success: false, error: "Invalid user ID" });
  });
});

describe("onboardingSchema declaration", () => {
  it("surfaces the custom message when the declaration is not accepted", () => {
    const r = onboardingSchema.safeParse({ declarationAccepted: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === "declarationAccepted");
      expect(issue?.message).toBe("You must accept the declaration");
    }
  });
});

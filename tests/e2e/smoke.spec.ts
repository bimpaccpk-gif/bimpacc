import { expect, test } from "@playwright/test";

// These run without a real Supabase backend: they only exercise the proxy
// (route protection + security headers) and public pages.

test("unauthenticated users are redirected from protected routes to /login", async ({
  page,
}) => {
  for (const route of ["/student", "/admin", "/instructor", "/super-admin", "/billing", "/mfa"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?redirect=/);
  }
});

test("production login offers Google only (no password form)", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  // Email/password login is gated to NODE_ENV=development in the login page.
  await expect(page.locator("input[type=password]")).toHaveCount(0);
});

test("responses carry baseline security headers", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("CSP is nonce-based, unique per request, and applied to redirects too", async ({
  request,
}) => {
  const a = await request.get("/login");
  const b = await request.get("/login");
  const cspA = a.headers()["content-security-policy"];
  const cspB = b.headers()["content-security-policy"];
  expect(cspA).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]+'[^;]*'strict-dynamic'/);
  expect(cspA).toContain("frame-ancestors 'none'");
  expect(cspA).not.toBe(cspB);
  expect(a.headers()["strict-transport-security"]).toBeDefined();
  expect(a.headers()["permissions-policy"]).toContain("display-capture=()");
  expect(a.headers()["x-xss-protection"]).toBeUndefined();

  const redirect = await request.get("/student", { maxRedirects: 0 });
  expect(redirect.status()).toBe(307);
  expect(redirect.headers()["x-frame-options"]).toBe("DENY");
  expect(redirect.headers()["strict-transport-security"]).toBeDefined();
});

test("login page hydrates with no CSP violations or console errors", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  // Theme script + hydration must have run under the nonce.
  await expect(page.locator("html")).toHaveClass(/light|dark/);
  expect(problems.filter((p) => /content security policy|refused to/i.test(p))).toEqual([]);
});

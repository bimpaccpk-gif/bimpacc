import { expect, test } from "@playwright/test";

// These run without a real Supabase backend: they only exercise the proxy
// (route protection + security headers) and public pages.

test("unauthenticated users are redirected from protected routes to /login", async ({
  page,
}) => {
  for (const route of ["/student", "/admin", "/instructor", "/super-admin", "/billing"]) {
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

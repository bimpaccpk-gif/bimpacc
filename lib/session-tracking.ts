import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getSessionLimit, sessionsToRevoke } from "@/lib/session-limit";
import { getSessionMaxSeconds } from "@/lib/session-policy";

export type RevokeReason = "limit" | "admin" | "signed_out";

/** Reads the Supabase session id from a JWT access token (already verified by Supabase). */
export function sessionIdFromAccessToken(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
    const sid = payload?.session_id;
    return typeof sid === "string" && /^[0-9a-f-]{36}$/i.test(sid) ? sid : null;
  } catch {
    return null;
  }
}

/**
 * Marks sessions revoked and ends them in Supabase Auth (refresh tokens stop working).
 * The proxy also refuses a revoked session on its next request.
 */
export async function revokeSessions(sessionIds: string[], reason: RevokeReason): Promise<number> {
  if (sessionIds.length === 0) return 0;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason } as never)
    .in("session_id", sessionIds)
    .is("revoked_at", null)
    .select("session_id");
  if (error) throw new Error(`revoke sessions: ${error.message}`);

  const { error: rpcError } = await admin.rpc("revoke_auth_sessions" as never, {
    p_session_ids: sessionIds,
  } as never);
  if (rpcError) console.error("[sessions] auth session revoke failed:", rpcError.message);

  return data?.length ?? 0;
}

/**
 * Called after every successful sign-in. Records the session, then enforces the per-role limit
 * by revoking the oldest active sessions. Fails open (logs) so a tracking problem never blocks
 * sign-in, e.g. before the migration is applied.
 */
export async function registerSession(input: {
  userId: string;
  role: string;
  sessionId: string | null;
  userAgent: string | null;
  ip: string | null;
}): Promise<void> {
  const { userId, role, sessionId } = input;
  if (!sessionId) return;

  try {
    const admin = createAdminClient();
    const { error: insertError } = await admin.from("user_sessions").upsert(
      {
        session_id: sessionId,
        user_id: userId,
        user_agent: input.userAgent?.slice(0, 400) ?? null,
        ip_address: input.ip && input.ip !== "unknown" ? input.ip : null,
      } as never,
      { onConflict: "session_id", ignoreDuplicates: true }
    );
    if (insertError) throw new Error(`register session: ${insertError.message}`);

    const limit = getSessionLimit(role);
    if (limit === null) return;

    // Sessions older than the maximum session lifetime have expired anyway; don't count them.
    const since = new Date(Date.now() - getSessionMaxSeconds() * 1000).toISOString();
    const { data: active, error } = await admin
      .from("user_sessions")
      .select("session_id, created_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .gt("created_at", since);
    if (error) throw new Error(`list sessions: ${error.message}`);

    const toRevoke = sessionsToRevoke(
      (active ?? []) as { session_id: string; created_at: string }[],
      limit,
      sessionId
    );
    await revokeSessions(toRevoke, "limit");
  } catch (err) {
    console.error("[sessions] tracking failed (sign-in allowed):", err instanceof Error ? err.message : err);
  }
}

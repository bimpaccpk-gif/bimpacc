import { MonitorSmartphone } from "lucide-react";

import { SignOutDevicesButton } from "@/components/admin/sign-out-devices-button";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { describeUserAgent, getSessionLimit } from "@/lib/session-limit";
import type { UserSessionEntry } from "@/types";

import { formatDateTime } from "./formatters";

const REVOKE_LABELS: Record<string, string> = {
  limit: "Signed out (newer device)",
  admin: "Signed out by admin",
  signed_out: "Signed out",
};

interface DevicesPanelProps {
  userId: string;
  role: string;
  sessions: UserSessionEntry[];
  /** Hide sign-out controls (e.g. for protected super-admin accounts). */
  readOnly?: boolean;
}

/**
 * "Devices" tab: sessions this account is (or was) signed in with. Server-compatible.
 * Sessions older than the maximum session lifetime have expired even without a revoke.
 */
function DevicesPanel({ userId, role, sessions, readOnly = false }: DevicesPanelProps) {
  const active = sessions.filter((s) => s.is_active);
  const limit = getSessionLimit(role);

  return (
    <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Devices</h3>
          <p className="text-muted-foreground text-xs">
            {active.length} active
            {limit !== null ? ` · limit ${limit} at a time; a new sign-in signs out the oldest` : " · no device limit for this role"}
          </p>
        </div>
        {!readOnly && active.length > 0 && <SignOutDevicesButton userId={userId} label="Sign out all devices" />}
      </div>

      {sessions.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={MonitorSmartphone}
            title="No devices recorded yet."
            description="Devices appear here after the user's next sign-in."
          />
        </div>
      ) : (
        <ul className="divide-border divide-y">
          {sessions.map((s) => {
            const live = s.is_active;
            return (
              <li key={s.session_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <MonitorSmartphone className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{describeUserAgent(s.user_agent)}</p>
                  <p className="text-muted-foreground text-xs">
                    Signed in {formatDateTime(s.created_at)}
                    {s.ip_address ? ` · ${s.ip_address}` : ""}
                  </p>
                </div>
                {live ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="secondary">
                    {s.revoked_reason ? (REVOKE_LABELS[s.revoked_reason] ?? "Signed out") : "Expired"}
                  </Badge>
                )}
                {live && !readOnly && (
                  <SignOutDevicesButton userId={userId} sessionId={s.session_id} label="Sign out" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { DevicesPanel };
export type { DevicesPanelProps };

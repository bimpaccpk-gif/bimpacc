import { AlertTriangle, CheckCircle2, LogIn, ShieldAlert, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LoginHistoryEntry } from "@/types";

import { formatDateTime } from "./formatters";

interface SecurityPanelProps {
  loginHistory: LoginHistoryEntry[];
}

/** Outcome badge for a single login attempt. */
function LoginStatusBadge({ status }: { status: LoginHistoryEntry["status"] }) {
  if (status === "success") {
    return (
      <Badge variant="success" className="font-semibold">
        <CheckCircle2 aria-hidden="true" />
        Success
      </Badge>
    );
  }

  if (status === "failed_device") {
    return (
      <Badge variant="warning" className="font-semibold">
        <Smartphone aria-hidden="true" />
        Device Blocked
      </Badge>
    );
  }

  if (status === "failed_screen_record") {
    return (
      <Badge variant="destructive" className="font-semibold">
        <ShieldAlert aria-hidden="true" />
        Lockout
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="font-semibold">
      <AlertTriangle aria-hidden="true" />
      Wrong Credentials
    </Badge>
  );
}

/**
 * "Login History" tab: auth attempts with device fingerprints and hardware
 * context. Server-compatible — no hooks, no state.
 */
function SecurityPanel({ loginHistory }: SecurityPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogIn className="h-5 w-5" aria-hidden="true" />
          Login History ({loginHistory.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loginHistory.length === 0 ? (
          <EmptyState
            icon={LogIn}
            title="No login history recorded yet."
            description="Successful and failed sign-in attempts for this account will appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Hardware FP</TableHead>
                <TableHead>Device Info</TableHead>
                <TableHead>User Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginHistory.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <LoginStatusBadge status={entry.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground font-mono text-xs">
                      {entry.hardware_fingerprint
                        ? entry.hardware_fingerprint.slice(0, 20) + "..."
                        : entry.device_fingerprint
                          ? entry.device_fingerprint.slice(0, 12) + "..."
                          : "N/A"}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {entry.device_components ? (
                      <div className="space-y-0.5">
                        <p className="max-w-[180px] truncate text-xs font-medium">
                          {entry.device_components.webglRenderer ??
                            entry.device_components.platform}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {entry.device_components.screenResolution} ·{" "}
                          {entry.device_components.hardwareConcurrency ?? "?"}c ·{" "}
                          {entry.device_components.deviceMemory
                            ? `${entry.device_components.deviceMemory}GB`
                            : "?"}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate text-xs whitespace-normal">
                    {entry.user_agent || "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export { SecurityPanel };
export type { SecurityPanelProps };

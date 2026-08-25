import { Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import type { AuditLogEntry } from "@/types";

import { formatDateTime, getAuditActionLabel } from "./formatters";

interface ActivityPanelProps {
  auditLog: AuditLogEntry[];
}

/** Extra context appended to the action label for detail-bearing entries. */
function AuditEntryDetail({ entry }: { entry: AuditLogEntry }) {
  if (entry.action === "user.role_changed" && entry.details?.old_role) {
    return (
      <span className="text-muted-foreground">
        {" "}
        from <span className="font-medium">{entry.details.old_role}</span> to{" "}
        <span className="font-medium">{entry.details.new_role}</span>
      </span>
    );
  }

  if (entry.action === "enrollment.created" && entry.details?.course_title) {
    return (
      <span className="text-muted-foreground">
        {" "}
        — <span className="font-medium">{entry.details.course_title}</span>
      </span>
    );
  }

  if (
    (entry.action === "content_access.paused" || entry.action === "content_access.unpaused") &&
    entry.details?.content_type
  ) {
    return (
      <span className="text-muted-foreground">
        {" "}
        — <span className="font-medium capitalize">{entry.details.content_type}</span>
        {entry.details?.cascade && <span className="text-xs"> (cascade)</span>}
      </span>
    );
  }

  if (entry.action === "content_access.bulk_update") {
    return (
      <span className="text-muted-foreground">
        {" "}
        — <span className="font-medium capitalize">{entry.details?.content_type}</span>
        {entry.details?.student_count && (
          <span className="text-xs"> ({entry.details.student_count} students)</span>
        )}
      </span>
    );
  }

  return null;
}

/**
 * "Activity" tab: admin actions recorded against this user, newest first.
 * Server-compatible — no hooks, no state.
 */
function ActivityPanel({ auditLog }: ActivityPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" aria-hidden="true" />
          Activity Log ({auditLog.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {auditLog.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity recorded yet."
            description="Admin actions taken on this account will appear here."
          />
        ) : (
          <div className="space-y-0">
            {auditLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 [&:not(:last-child)]:border-b"
              >
                <div className="bg-muted mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                  <Activity className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm">
                    <span className="font-medium">{getAuditActionLabel(entry.action)}</span>
                    <AuditEntryDetail entry={entry} />
                  </p>
                  <p className="text-muted-foreground text-xs">
                    by {entry.admin_name} &middot; {formatDateTime(entry.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { ActivityPanel };
export type { ActivityPanelProps };

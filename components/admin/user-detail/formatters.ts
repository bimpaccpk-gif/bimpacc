/**
 * Display helpers shared by the user detail panels. Pure functions — safe in
 * server components.
 */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.created": "Account created",
  "user.deleted": "Account deleted",
  "user.role_changed": "Role changed",
  "user.approved": "Student approved",
  "user.unapproved": "Approval revoked",
  "user.paused": "Account paused",
  "user.unpaused": "Account unpaused",
  "user.onboarding_bypassed": "Onboarding bypassed",
  "user.onboarding_restored": "Onboarding restored",
  "enrollment.created": "Enrolled in course",
  "content_access.paused": "Content paused for student",
  "content_access.unpaused": "Content resumed for student",
  "content_access.bulk_update": "Bulk content access update",
  "content_access.override_removed": "Content access override removed",
};

function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export { getInitials, formatDate, formatDateTime, getAuditActionLabel };

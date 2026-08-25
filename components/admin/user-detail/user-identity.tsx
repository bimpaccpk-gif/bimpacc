import {
  CheckCircle2,
  Clock,
  Shield,
  Smartphone,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

import { getInitials } from "./formatters";
import type { UserDetailUser } from "./types";

/** Badge treatment per role; admin has no stock soft-tint variant. */
const ROLE_BADGE: Record<UserRole, { variant: BadgeProps["variant"]; className?: string }> = {
  admin: {
    variant: "outline",
    className: "border-transparent bg-primary/10 text-primary",
  },
  instructor: { variant: "warning" },
  student: { variant: "info" },
};

/**
 * Identity row rendered above the tabs: avatar plus the full status badge set
 * (role, approval, onboarding state, pause state, device binding).
 * Server-compatible — no hooks, no state.
 */
function UserIdentity({ user }: { user: UserDetailUser }) {
  const avatarUrl = user.avatar_file_url ?? user.avatar_url;

  return (
    <div data-slot="user-identity" className="flex items-center gap-4">
      <Avatar size="lg" className="size-16 text-lg">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={user.full_name} /> : null}
        <AvatarFallback className="bg-primary/10 font-medium text-primary">
          {getInitials(user.full_name)}
        </AvatarFallback>
      </Avatar>

      <div data-slot="user-identity-badges" className="flex flex-wrap items-center gap-2">
        <Badge
          variant={ROLE_BADGE[user.role].variant}
          className={cn("font-semibold capitalize", ROLE_BADGE[user.role].className)}
        >
          {user.is_super_admin ? "super admin" : user.role}
        </Badge>

        {user.is_approved && (
          <Badge variant="success" className="font-semibold">
            <CheckCircle2 aria-hidden="true" />
            Approved
          </Badge>
        )}

        {!user.is_approved && user.onboarding_completed && (
          <Badge variant="warning" className="font-semibold">
            <Clock aria-hidden="true" />
            Pending Review
          </Badge>
        )}

        {user.onboarding_bypassed && (
          <Badge variant="info" className="font-semibold">
            <Shield aria-hidden="true" />
            Onboarding Bypassed
          </Badge>
        )}

        {user.is_paused && (
          <Badge variant="destructive" className="font-semibold">
            <XCircle aria-hidden="true" />
            Paused
          </Badge>
        )}

        {user.role === "student" && user.device_fingerprint && (
          <Badge variant="success" className="font-semibold">
            <Smartphone aria-hidden="true" />
            Device Bound
          </Badge>
        )}
      </div>
    </div>
  );
}

export { UserIdentity };

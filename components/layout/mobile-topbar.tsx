"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { getNavSections } from "@/lib/navigation";
import type { SessionUser } from "@/lib/dal";
import type { UserRole } from "@/types";
import { signOut } from "@/app/actions/auth";
import type { Notification } from "@/app/actions/notifications";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NotificationBell } from "./notification-bell";
import { SidebarSectionList, SidebarUserMenu, getRoleLabel } from "./app-sidebar";

interface MobileTopbarProps {
  role: UserRole;
  user: SessionUser;
  notifications?: Notification[];
}

/**
 * Phone / tablet chrome (< lg). Restores bell + account menu reachability
 * while the desktop rail is hidden, and hosts the slide-out navigation.
 */
export function MobileTopbar({ role, user, notifications = [] }: MobileTopbarProps) {
  const [open, setOpen] = React.useState(false);
  const sections = getNavSections(role, user.is_super_admin);
  const roleLabel = getRoleLabel(role, user.is_super_admin);
  // Stable identity so the bell's sync effect doesn't reset on local re-renders.
  const bellNotifications = React.useMemo(() => notifications ?? [], [notifications]);

  return (
    <header
      data-slot="mobile-topbar"
      className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
    >
      {/* Left: hamburger + brand */}
      <div className="flex min-w-0 items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open navigation menu"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/80 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Dashboard navigation links and account actions
            </SheetDescription>
            <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <span className="bg-primary text-primary-foreground grid h-8 w-8 place-items-center rounded-lg text-sm font-bold">
                B
              </span>
              <span className="truncate text-sm font-semibold">{APP_NAME}</span>
            </div>
            <nav
              aria-label="Dashboard"
              className="flex-1 overflow-y-auto px-3 pb-3"
            >
              <SidebarSectionList
                sections={sections}
                onNavigate={() => setOpen(false)}
              />
            </nav>
            <div className="shrink-0 border-t p-3">
              <button
                type="button"
                onClick={() => signOut()}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  "text-destructive hover:bg-destructive/10 outline-none focus-visible:ring-3 focus-visible:ring-destructive/20"
                )}
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="bg-primary text-primary-foreground grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold">
            B
          </span>
          <span className="truncate text-sm font-semibold">{APP_NAME}</span>
        </Link>
      </div>

      {/* Right: notifications + account */}
      <div className="flex items-center gap-1.5">
        <NotificationBell notifications={bellNotifications} />
        <SidebarUserMenu user={user} roleLabel={roleLabel} showDetails={false} />
      </div>
    </header>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  User as UserIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import {
  getNavSections,
  isActiveNavItem,
  type NavItem,
  type NavSection,
} from "@/lib/navigation";
import type { SessionUser } from "@/lib/dal";
import type { UserRole } from "@/types";
import { signOut } from "@/app/actions/auth";
import type { Notification } from "@/app/actions/notifications";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

const SIDEBAR_COLLAPSED_COOKIE = "sidebar-collapsed";

function persistCollapsed(collapsed: boolean) {
  if (typeof document === "undefined") return;
  // Read back by app/(dashboard)/layout.tsx to hydrate initialCollapsed.
  document.cookie = collapsed
    ? `${SIDEBAR_COLLAPSED_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
    : `${SIDEBAR_COLLAPSED_COOKIE}=; path=/; max-age=0`;
}

export interface SidebarUser {
  full_name: string;
  avatar_url: string | null;
  email: string;
}

interface AppSidebarProps {
  role: UserRole;
  user: SessionUser;
  notifications?: Notification[];
  /** Hydrated from the `sidebar-collapsed` cookie so first paint matches storage. */
  initialCollapsed?: boolean;
}

export function getRoleLabel(role: UserRole, isSuperAdmin: boolean): string {
  if (isSuperAdmin) return "Super Admin";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function getInitials(user: SidebarUser): string {
  if (user.full_name) {
    return user.full_name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return user.email[0]?.toUpperCase() ?? "U";
}

/* ------------------------------------------------------------------ */
/* Shared pieces (also consumed by mobile-topbar)                      */
/* ------------------------------------------------------------------ */

const navLinkClasses = cn(
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
  "outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
);

const navLinkActiveClasses = "bg-sidebar-accent text-sidebar-primary";
const navLinkInactiveClasses =
  "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground";

interface SidebarNavLinkProps {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNavLink({ item, active, collapsed = false, onNavigate }: SidebarNavLinkProps) {
  // The tooltip stays mounted in both modes (disabled while expanded) so the
  // label can fade through transition-opacity instead of remounting.
  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger
        render={
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              navLinkClasses,
              active ? navLinkActiveClasses : navLinkInactiveClasses,
              collapsed && "justify-center gap-0 overflow-hidden px-2"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span
              className={cn(
                "min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-200",
                collapsed ? "opacity-0" : "opacity-100"
              )}
            >
              {item.label}
            </span>
          </Link>
        }
      />
      {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
    </Tooltip>
  );
}

interface SidebarSectionListProps {
  sections: NavSection[];
  collapsed?: boolean;
  onNavigate?: () => void;
}

/** Renders NAV_SECTIONS vertically; used by the desktop rail and the mobile sheet. */
export function SidebarSectionList({ sections, collapsed = false, onNavigate }: SidebarSectionListProps) {
  const pathname = usePathname();

  return (
    <>
      {sections.map((section, index) => (
        <div key={section.title ?? index}>
          {!collapsed && index > 0 && <div className="mx-3 my-1 h-px bg-sidebar-border" />}
          {collapsed && index > 0 && <div className="mx-3 my-2 h-px bg-sidebar-border" />}
          {section.title && !collapsed && (
            <p className="px-3 pt-4 pb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {section.title}
            </p>
          )}
          <div className="flex flex-col gap-0.5 py-1">
            {section.items.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                active={isActiveNavItem(pathname, item)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

interface SidebarUserMenuProps {
  user: SidebarUser;
  roleLabel: string;
  /** Hide the name/role block (icon-only rails and phone topbars). */
  showDetails?: boolean;
}

export function SidebarUserMenu({ user, roleLabel, showDetails = true }: SidebarUserMenuProps) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="User menu"
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-left transition-colors outline-none",
          "hover:bg-sidebar-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50",
          !showDetails && "w-9 justify-center"
        )}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 text-xs font-semibold">
            {getInitials(user)}
          </AvatarFallback>
        </Avatar>
        {showDetails && (
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="w-full truncate text-sm font-medium text-sidebar-foreground">
              {user.full_name || "User"}
            </span>
            <span className="text-muted-foreground truncate text-xs">{roleLabel}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">
            {user.full_name || user.email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <UserIcon className="mr-2 size-4" />
          Profile
        </DropdownMenuItem>
        {/* closeOnClick={false} keeps the menu open while flipping the theme */}
        <DropdownMenuItem closeOnClick={false} className="gap-2">
          <span className="text-sm">Theme</span>
          <span className="ml-auto">
            <ThemeToggle />
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop sidebar                                                     */
/* ------------------------------------------------------------------ */

function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none",
        "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      )}
    >
      {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
    </button>
  );
}

export function AppSidebar({
  role,
  user,
  notifications = [],
  initialCollapsed = false,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = React.useState(initialCollapsed);
  const sections = getNavSections(role, user.is_super_admin);
  const roleLabel = getRoleLabel(role, user.is_super_admin);
  // Stable identity so the bell's sync effect doesn't reset on local re-renders.
  const bellNotifications = React.useMemo(() => notifications ?? [], [notifications]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    persistCollapsed(next);
  }

  return (
    <aside
      data-slot="app-sidebar"
      data-collapsed={collapsed}
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-sidebar text-sidebar-foreground lg:flex",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header: brand + collapse toggle (stacked when collapsed) */}
      {collapsed ? (
        <div className="flex min-h-16 shrink-0 flex-col items-center justify-center gap-1 border-b border-sidebar-border px-2 py-2">
          <Link
            href="/"
            aria-label={APP_NAME}
            className="grid h-8 w-8 place-items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="bg-primary text-primary-foreground grid h-8 w-8 place-items-center rounded-lg text-sm font-bold">
              B
            </span>
          </Link>
          <CollapseToggle collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>
      ) : (
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="bg-primary text-primary-foreground grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold">
              B
            </span>
            <span className="min-w-0 truncate text-sm font-semibold">{APP_NAME}</span>
          </Link>
          <CollapseToggle collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>
      )}

      {/* Navigation sections */}
      <nav aria-label="Dashboard" className="flex-1 overflow-x-hidden overflow-y-auto px-3 pb-2">
        <SidebarSectionList sections={sections} collapsed={collapsed} />
      </nav>

      {/* Footer: notifications + account */}
      <div
        className={cn(
          "mt-auto flex shrink-0 flex-col gap-1 border-t border-sidebar-border p-3",
          collapsed && "items-center"
        )}
      >
        <NotificationBell notifications={bellNotifications} />
        <SidebarUserMenu user={user} roleLabel={roleLabel} showDetails={!collapsed} />
      </div>
    </aside>
  );
}

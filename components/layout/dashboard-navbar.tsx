"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { APP_NAME, DASHBOARD_SIDEBAR_LINKS } from "@/lib/constants";
import { ThemeToggle } from "@/components/theme-toggle";
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
import type { UserRole } from "@/types";
import { signOut } from "@/app/actions/auth";
import { useMemo, useState } from "react";
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import type { Notification } from "@/app/actions/notifications";

interface NavbarUser {
  full_name: string;
  avatar_url: string | null;
  email: string;
}

interface DashboardNavbarProps {
  role: UserRole;
  user: NavbarUser;
  isSuperAdmin: boolean;
  notifications: Notification[];
}

export function DashboardNavbar({ role, user, isSuperAdmin, notifications }: DashboardNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = useMemo(
    () =>
      isSuperAdmin
        ? DASHBOARD_SIDEBAR_LINKS.superAdmin
        : DASHBOARD_SIDEBAR_LINKS[role] || DASHBOARD_SIDEBAR_LINKS.student,
    [isSuperAdmin, role]
  );

  const roleLabel = isSuperAdmin ? "Super Admin" : role.charAt(0).toUpperCase() + role.slice(1);
  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.email[0]?.toUpperCase() ?? "U");

  return (
    <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg font-bold">
              B
            </div>
            <span className="text-foreground hidden text-lg font-semibold sm:block">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Theme + Notifications + User */}
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <NotificationBell notifications={notifications} />

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="User menu"
              className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors outline-none"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden flex-col items-start text-left sm:flex">
                <span className="text-sm font-medium">{user.full_name || "User"}</span>
                <span className="text-muted-foreground text-xs">{roleLabel}</span>
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile: Theme + Hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="hover:bg-muted inline-flex h-9 w-9 items-center justify-center rounded-lg"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="text-foreground/80 h-5 w-5" />
            ) : (
              <Menu className="text-foreground/80 h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="bg-background border-t px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <hr className="border-border my-2" />
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-3 py-2.5 text-sm font-medium"
            >
              Back to Site
            </Link>
            <button
              onClick={() => signOut()}
              className="text-destructive hover:bg-destructive/10 rounded-lg px-3 py-2.5 text-left text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

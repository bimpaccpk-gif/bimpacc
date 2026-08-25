import type { LucideIcon } from "lucide-react";

import type { UserRole } from "@/types";

import {
  LayoutDashboard,
  Users,
  BookOpen,
  Receipt,
  ShieldCheck,
  ClipboardCheck,
  GraduationCap,
  Award,
  User,
} from "lucide-react";

/**
 * Typed navigation config for the dashboard sidebar / mobile nav.
 *
 * Replaces the flat `DASHBOARD_SIDEBAR_LINKS` map that used to live in
 * `lib/constants.ts` (that export is now derived from this file for
 * backwards compatibility during the cutover).
 */

export type NavRole = "superAdmin" | "admin" | "instructor" | "student";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Match only when pathname === href. When omitted (default) the item is
   * also active on child routes (pathname === href || startsWith(href + "/")).
   */
  exact?: boolean;
}

export interface NavSection {
  /** Optional section heading, rendered above the section items. */
  title?: string;
  items: NavItem[];
}

/**
 * Whether `pathname` should highlight `item` in the nav.
 */
export function isActiveNavItem(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export const NAV_SECTIONS: Record<NavRole, NavSection[]> = {
  superAdmin: [
    {
      title: "Platform",
      items: [{ href: "/super-admin", label: "Platform", icon: ShieldCheck }],
    },
    {
      title: "Administration",
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/admin/users", label: "People", icon: Users },
        { href: "/admin/courses", label: "Content", icon: BookOpen },
        { href: "/billing", label: "Billing", icon: Receipt },
      ],
    },
  ],
  admin: [
    {
      title: "Workspace",
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/admin/users", label: "People", icon: Users },
        { href: "/admin/courses", label: "Content", icon: BookOpen },
        { href: "/billing", label: "Billing", icon: Receipt },
      ],
    },
  ],
  instructor: [
    {
      title: "Workspace",
      items: [
        { href: "/instructor", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/instructor/attendance", label: "Attendance", icon: ClipboardCheck },
        { href: "/billing", label: "Billing", icon: Receipt },
      ],
    },
  ],
  student: [
    {
      title: "Learning",
      items: [
        { href: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: "/student/my-courses", label: "My Courses", icon: GraduationCap },
        { href: "/student/certificates", label: "Certificates", icon: Award },
      ],
    },
    {
      title: "Account",
      items: [{ href: "/profile", label: "Profile", icon: User, exact: true }],
    },
  ],
};

/** Sections for a user, honouring the super-admin override like the old links map. */
export function getNavSections(role: UserRole, isSuperAdmin: boolean): NavSection[] {
  if (isSuperAdmin) return NAV_SECTIONS.superAdmin;
  return NAV_SECTIONS[role as NavRole] ?? NAV_SECTIONS.student;
}

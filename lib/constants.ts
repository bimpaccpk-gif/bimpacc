import { NAV_SECTIONS, type NavItem, type NavRole } from "@/lib/navigation";

export const APP_NAME = "BIMPACC LMS";
export const APP_DESCRIPTION = "A modern learning management system for engineers";

/**
 * @deprecated Flat sidebar links are superseded by `NAV_SECTIONS` in
 * `lib/navigation.ts`. This export is derived from it and kept only for
 * backwards compatibility during the sidebar cutover — prefer `NAV_SECTIONS`.
 */
export type DashboardSidebarLink = Pick<NavItem, "href" | "label" | "icon">;

export const DASHBOARD_SIDEBAR_LINKS: Record<NavRole, DashboardSidebarLink[]> =
  Object.fromEntries(
    Object.entries(NAV_SECTIONS).map(([role, sections]) => [
      role,
      sections.flatMap((section) =>
        section.items.map(({ href, label, icon }) => ({ href, label, icon }))
      ),
    ])
  ) as Record<NavRole, DashboardSidebarLink[]>;

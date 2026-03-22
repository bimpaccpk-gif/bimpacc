export const APP_NAME = "BIMPACC LMS";
export const APP_DESCRIPTION = "A modern learning management system";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
] as const;

export const DASHBOARD_SIDEBAR_LINKS = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/courses", label: "Courses", icon: "BookOpen" },
    { href: "/admin/users", label: "Users", icon: "Users" },
    { href: "/admin/settings", label: "Settings", icon: "Settings" },
  ],
  instructor: [
    { href: "/instructor", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/courses", label: "My Courses", icon: "BookOpen" },
    { href: "/instructor/students", label: "Students", icon: "Users" },
    { href: "/instructor/analytics", label: "Analytics", icon: "BarChart" },
  ],
  student: [
    { href: "/student", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/courses", label: "Browse Courses", icon: "BookOpen" },
    { href: "/student/my-courses", label: "My Courses", icon: "GraduationCap" },
    { href: "/student/progress", label: "Progress", icon: "TrendingUp" },
  ],
} as const;

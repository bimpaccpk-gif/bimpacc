export const APP_NAME = "BIMPACC LMS";
export const APP_DESCRIPTION = "A modern learning management system";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard/courses", label: "Courses" },
] as const;

export const DASHBOARD_SIDEBAR_LINKS = {
  admin: [
    { href: "/dashboard/admin", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/dashboard/courses", label: "Courses", icon: "BookOpen" },
    { href: "/dashboard/admin/users", label: "Users", icon: "Users" },
    { href: "/dashboard/admin/settings", label: "Settings", icon: "Settings" },
  ],
  instructor: [
    { href: "/dashboard/instructor", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/dashboard/courses", label: "My Courses", icon: "BookOpen" },
    { href: "/dashboard/instructor/students", label: "Students", icon: "Users" },
    { href: "/dashboard/instructor/analytics", label: "Analytics", icon: "BarChart" },
  ],
  student: [
    { href: "/dashboard/student", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/dashboard/courses", label: "Browse Courses", icon: "BookOpen" },
    { href: "/dashboard/student/my-courses", label: "My Courses", icon: "GraduationCap" },
    { href: "/dashboard/student/progress", label: "Progress", icon: "TrendingUp" },
  ],
} as const;

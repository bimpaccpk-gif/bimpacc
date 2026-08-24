export const APP_NAME = "BIMPACC LMS";
export const APP_DESCRIPTION = "A modern learning management system for engineers";

export const DASHBOARD_SIDEBAR_LINKS = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/admin/courses", label: "Courses", icon: "BookOpen" },
    { href: "/admin/users", label: "Users", icon: "Users" },
  ],
  instructor: [
    { href: "/instructor", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/admin/courses", label: "Courses", icon: "BookOpen" },
    { href: "/admin/users", label: "Students", icon: "Users" },
  ],
  student: [
    { href: "/student", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/student/courses", label: "Available Courses", icon: "BookOpen" },
    { href: "/student/my-courses", label: "My Courses", icon: "GraduationCap" },
    { href: "/student/certificates", label: "Certificates", icon: "Award" },
  ],
} as const;

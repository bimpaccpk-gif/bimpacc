export const APP_NAME = "BIMPACC LMS";
export const APP_DESCRIPTION = "A modern learning management system for engineers";

export const DASHBOARD_SIDEBAR_LINKS = {
  superAdmin: [
    { href: "/super-admin", label: "Super Admin", icon: "ShieldCheck" },
    { href: "/admin", label: "Admin Dashboard", icon: "LayoutDashboard" },
    { href: "/admin/courses", label: "Courses", icon: "BookOpen" },
    { href: "/admin/users", label: "Users", icon: "Users" },
    { href: "/billing", label: "Billing Summary", icon: "ReceiptText" },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/admin/courses", label: "Courses", icon: "BookOpen" },
    { href: "/admin/users", label: "Users", icon: "Users" },
    { href: "/billing", label: "Service Billing", icon: "ReceiptText" },
  ],
  instructor: [
    { href: "/instructor", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/admin/courses", label: "Courses", icon: "BookOpen" },
    { href: "/admin/users", label: "Students", icon: "Users" },
  ],
  student: [
    { href: "/student", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/student/certificates", label: "Certificates", icon: "Award" },
  ],
} as const;

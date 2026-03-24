export const APP_NAME = "BIMPACC LMS";
export const APP_DESCRIPTION = "A modern learning management system for engineers";
export const APP_TAGLINE = "Learn Without Limits";

export const NAV_LINKS: { href: string; label: string }[] = [];

export const DASHBOARD_SIDEBAR_LINKS = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/admin/courses", label: "Courses", icon: "BookOpen" },
    { href: "/admin/users", label: "Users", icon: "Users" },
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

export const STATS = [
  { value: "10K+", label: "Active Students" },
  { value: "200+", label: "Expert Courses" },
  { value: "50+", label: "Instructors" },
  { value: "4.8", label: "Average Rating" },
] as const;

export const TESTIMONIALS = [
  {
    name: "Ahmed Khan",
    role: "BIM Coordinator",
    avatar: "AK",
    content:
      "BIMPACC LMS transformed my career in BIM. The courses are well-structured and helped me master Revit and Navisworks. Now I'm leading projects at a top construction firm in Karachi.",
  },
  {
    name: "Muhammad Ali",
    role: "Senior Architect",
    avatar: "MA",
    content:
      "The BIM courses helped me transition from traditional drafting to full 3D modeling. I completed my certification in just four months and doubled my salary.",
  },
  {
    name: "Fatima Rizvi",
    role: "Construction Manager",
    avatar: "FR",
    content:
      "Learning BIM through BIMPACC gave me the competitive edge I needed. The hands-on projects and industry-relevant curriculum made all the difference in my career.",
  },
] as const;

export const FOOTER_LINKS = [
  {
    title: "Platform",
    links: [
      { label: "For Business", href: "/business" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Contact Us", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
] as const;

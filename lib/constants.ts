export const APP_NAME = "BIMPACC LMS";
export const APP_DESCRIPTION = "A modern learning management system";
export const APP_TAGLINE = "Learn Without Limits";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
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

export const STATS = [
  { value: "10K+", label: "Active Students" },
  { value: "200+", label: "Expert Courses" },
  { value: "50+", label: "Instructors" },
  { value: "4.8", label: "Average Rating" },
] as const;

export const TESTIMONIALS = [
  {
    name: "Sarah Johnson",
    role: "Software Developer",
    avatar: "SJ",
    content:
      "BIMPACC LMS transformed my career. The courses are well-structured and the instructors are incredibly knowledgeable.",
  },
  {
    name: "Michael Chen",
    role: "Data Scientist",
    avatar: "MC",
    content:
      "The platform's flexibility allowed me to learn at my own pace. I completed three certifications in just six months.",
  },
  {
    name: "Emily Rodriguez",
    role: "UX Designer",
    avatar: "ER",
    content:
      "Interactive content and community support made learning enjoyable. Best investment I've made in my professional development.",
  },
] as const;

export const FOOTER_LINKS = [
  {
    title: "Platform",
    links: [
      { label: "Pricing", href: "/pricing" },
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

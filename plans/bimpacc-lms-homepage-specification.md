# BIMPACC LMS Homepage Redesign - UI/UX Design Specification

**Version:** 1.0  
**Date:** March 2026  
**Target:** Professional LMS for Engineers  
**Author:** UI/UX Design Specification

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color Palette & Typography](#2-color-palette--typography)
3. [Layout Sections](#3-layout-sections)
4. [UX Improvements](#4-ux-improvements)
5. [Visual Design Guidelines](#5-visual-design-guidelines)
6. [Engineer-Specific Elements](#6-engineer-specific-elements)
7. [Component Specifications](#7-component-specifications)
8. [Responsive Breakpoints](#8-responsive-breakpoints)
9. [Animation Specifications](#9-animation-specifications)
10. [Accessibility Requirements](#10-accessibility-requirements)

---

## 1. Design Philosophy

### Core Principles
- **Engineering Precision**: Clean lines, structured layouts, and data-driven visual elements
- **Professional Trust**: Convey credibility through consistent, polished UI
- **Engineer-Centric**: Focus on technical skills, certifications, and career advancement
- **Progressive Disclosure**: Layer information to avoid cognitive overload

### Design Language
- Modern, minimalist aesthetic with purposeful visual hierarchy
- Emphasis on content over decoration
- Data visualization for progress tracking
- Technical/industrial visual metaphors

---

## 2. Color Palette & Typography

### 2.1 CSS Variables (Use from globals.css)

```css
/* Primary - Deep Blue (Engineering Trust) */
--primary: oklch(0.488 0.243 264.376);        /* #6366f1 - Indigo */
--primary-foreground: oklch(0.985 0 0);

/* Background */
--background: oklch(1 0 0);                    /* White */
--foreground: oklch(0.145 0 0);                /* Near black */

/* Card & Surface */
--card: oklch(1 0 0);
--card-foreground: oklch(0.145 0 0);
--muted: oklch(0.97 0 0);
--muted-foreground: oklch(0.556 0 0);

/* Semantic Colors */
--success: oklch(0.627 0.194 149.214);        /* Emerald */
--warning: oklch(0.769 0.188 85.28);          /* Amber */
--destructive: oklch(0.577 0.245 27.325);    /* Red */

/* Border */
--border: oklch(0.922 0 0);
--input: oklch(0.922 0 0);
--ring: oklch(0.488 0.243 264.376);
```

### 2.2 Extended Color Palette (Add to globals.css)

```css
/* Engineering Accent Colors */
--accent-blue: oklch(0.55 0.2 245);           /* Technical blue */
--accent-cyan: oklch(0.6 0.18 190);           /* Innovation cyan */
--accent-teal: oklch(0.55 0.18 170);          /* Engineering teal */

/* Gradient Presets */
--gradient-hero: linear-gradient(135deg, oklch(0.95 0.02 264) 0%, oklch(0.9 0.05 264) 100%);
--gradient-card: linear-gradient(180deg, oklch(1 0 0) 0%, oklch(0.98 0 0) 100%);
--gradient-cta: linear-gradient(135deg, var(--primary) 0%, oklch(0.4 0.2 264) 100%);

/* Glassmorphism */
--glass-bg: oklch(1 0 0 / 70%);
--glass-border: oklch(1 0 0 / 20%);
--glass-blur: blur(12px);
```

### 2.3 Typography

**Font Stack (from globals.css):**
- Primary: `var(--font-sans)` - Inter or system sans-serif
- Mono: `var(--font-mono)` - For code/technical content

**Recommended Type Scale:**

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 (Hero) | 56px / 3.5rem | 800 (extrabolde) | 1.1 |
| H2 (Section) | 40px / 2.5rem | 700 (bold) | 1.2 |
| H3 (Card Title) | 24px / 1.5rem | 600 (semibold) | 1.3 |
| H4 (Subtitle) | 20px / 1.25rem | 600 (semibold) | 1.4 |
| Body Large | 18px / 1.125rem | 400 (regular) | 1.6 |
| Body | 16px / 1rem | 400 (regular) | 1.6 |
| Small | 14px / 0.875rem | 400 (regular) | 1.5 |
| Caption | 12px / 0.75rem | 500 (medium) | 1.4 |

**Typography Improvements:**
- Use tighter line-height for headings (1.1-1.3)
- Increase body text line-height to 1.6 for readability
- Add tracking (letter-spacing) to uppercase labels: `tracking-wide`
- Use font-weight 500-600 for better readability at small sizes

---

## 3. Layout Sections

### 3.1 Enhanced Navigation

**Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] BIMPACC LMS    [Home] [Courses] [Paths] [Pricing]   │
│                              [Theme] [Sign In] [Get Started]│
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- **Sticky Behavior**: `position: sticky; top: 0; z-index: 50`
- **Backdrop Blur**: `backdrop-filter: blur(12px)`
- **Background**: `bg-background/80` (semi-transparent)
- **Border**: Subtle bottom border `border-b border-border/50`
- **Height**: 64px (h-16)
- **Shadow on Scroll**: Add `shadow-sm` when scrolled past 50px

**Navigation Links (Add to constants.ts):**
```typescript
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/paths", label: "Learning Paths" },
  { href: "/pricing", label: "Pricing" },
] as const;
```

**Mobile Menu:**
- Hamburger icon on mobile (< 768px)
- Slide-in drawer from right
- Full-height overlay with blur background

### 3.2 Refined Hero Section

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────────────────────────┐  ┌────────────────────────┐ │
│  │ 🎯 Badge                     │  │                        │ │
│  │                              │  │   [Course Card]        │ │
│  │ H1: Master Engineering      │  │    with Progress       │ │
│  │    Skills & Advance         │  │                        │ │
│  │    Your Career              │  │   [Floating Badges]    │ │
│  │                              │  │    • Completed         │ │
│  │ Description text...         │  │    • XP Earned         │ │
│  │                              │  │                        │ │
│  │ [Get Started] [Browse]      │  │                        │ │
│  │                              │  │                        │ │
│  │ 👥 50K+ Students  ★ 4.9     │  │                        │ │
│  └──────────────────────────────┘  └────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Specifications:**

| Element | Details |
|---------|---------|
| **Badge** | Rounded pill, `bg-primary/10`, `text-primary`, icon: Sparkles |
| **H1** | 56px desktop, 36px mobile, font-weight 800 |
| **Gradient Text** | `bg-gradient-to-r from-primary to-primary/60` |
| **Description** | 18px, max-width 540px, text-muted-foreground |
| **CTA Buttons** | Primary: "Get Started Free", Secondary: "Browse Courses" |
| **Trust Indicators** | Avatar stack + Star rating |
| **Hero Card** | 3D perspective tilt, progress visualization |
| **Floating Badges** | Glassmorphism effect, subtle animation |

**Value Proposition (Engineer-Focused):**
- "Master engineering skills with industry-recognized certifications"
- "Build real-world projects with hands-on learning"
- "Track your progress toward career milestones"

### 3.3 Expanded Stats Section

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │   50K   │  │  200+   │  │  95%    │  │  4.9    │        │
│  │  Active │  │ Expert  │  │ Success │  │ Average │        │
│  │Students │  │ Courses │  │  Rate   │  │ Rating  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**

| Stat | Value | Visual Treatment |
|------|-------|------------------|
| Active Students | 50K+ | Animated counter, icon: Users |
| Expert Courses | 200+ | Icon: BookOpen with gradient |
| Success Rate | 95% | Circular progress ring |
| Average Rating | 4.9 | Star icons + number |

**Visual Enhancements:**
- Add subtle background pattern (grid dots)
- Each stat in a card with hover lift effect
- Icon with colored background circle
- Animated number counting on scroll into view

### 3.4 Featured Courses Section (NEW - Critical for LMS)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Section Title                                             │
│  ─────────────────────────────────────────────────────────  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ [Thumbnail] │  │ [Thumbnail] │  │ [Thumbnail] │        │
│  │             │  │             │  │             │        │
│  │ Course Name │  │ Course Name │  │ Course Name │        │
│  │ Instructor  │  │ Instructor  │  │ Instructor  │        │
│  │ ★★★★☆      │  │ ★★★★★      │  │ ★★★★☆      │        │
│  │ $49 • 12h   │  │ $79 • 24h   │  │ $59 • 18h   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                               
│  [View All Courses →]                                       
└─────────────────────────────────────────────────────────────┘
```

**Course Card Specifications:**

| Element | Details |
|---------|---------|
| **Thumbnail** | 16:9 aspect ratio, gradient overlay |
| **Category Badge** | Top-left, colored pill |
| **Title** | H4, max 2 lines, truncate |
| **Instructor** | Avatar + name, small text |
| **Rating** | Star icons + count |
| **Meta** | Price + duration |
| **Progress Bar** | For enrolled courses |
| **Hover** | Scale 1.02, shadow increase |

**Sample Course Data:**
```typescript
const featuredCourses = [
  {
    title: "Advanced Machine Learning",
    category: "AI/ML",
    instructor: "Dr. Sarah Chen",
    rating: 4.9,
    students: 2500,
    duration: "24 hours",
    level: "Advanced",
    thumbnail: "/courses/ml.jpg",
  },
  {
    title: "Cloud Architecture with AWS",
    category: "Cloud",
    instructor: "Michael Torres",
    rating: 4.8,
    students: 3200,
    duration: "18 hours",
    level: "Intermediate",
    thumbnail: "/courses/aws.jpg",
  },
  {
    title: "Full-Stack Development",
    category: "Web Dev",
    instructor: "Emily Rodriguez",
    rating: 4.9,
    students: 5100,
    duration: "40 hours",
    level: "Beginner",
    thumbnail: "/courses/fullstack.jpg",
  },
];
```

### 3.5 Testimonials Section (Currently Unused - Add)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Trusted by Engineers Worldwide                             │
│  ─────────────────────────────────────────────────────────  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │             │  │             │  │             │        │
│  │ "Quote..."  │  │ "Quote..."  │  │ "Quote..."  │        │
│  │             │  │             │  │             │        │
│  │ ─────────── │  │ ─────────── │  │ ─────────── │        │
│  │ [Avatar]    │  │ [Avatar]    │  │ [Avatar]    │        │
│  │ Name        │  │ Name        │  │ Name        │        │
│  │ Role        │  │ Role        │  │ Role        │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Use existing `TESTIMONIALS` from constants.ts
- Add company logos below (optional)
- Auto-scroll carousel on mobile
- Quote icon as decorative element

### 3.6 Enhanced Features Section

**Current 6 Features (Enhance):**

| Feature | Icon | Color | Enhancement |
|---------|------|-------|-------------|
| Expert Instructors | GraduationCap | Blue | Add "Verified" badge |
| Flexible Learning | Clock | Emerald | Add "24/7 Access" label |
| Verified Certificates | Award | Amber | Add "Industry Recognized" |
| Interactive Content | Code | Purple | Add "Hands-on Projects" |
| Community Support | Users | Pink | Add "Discord/Forum" |
| Progress Analytics | BarChart3 | Indigo | Add "Real-time" |

**Visual Hierarchy:**
- 3-column grid on desktop
- Icon in colored circle (48px)
- Title + description
- Hover: border glow + slight lift

### 3.7 Learning Path/Roadmap Section (NEW - Engineer-Specific)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Your Engineering Career Path                               │
│  ─────────────────────────────────────────────────────────  │
│                                                               
│  ○──────────○──────────○──────────○──────────○             │
│  │          │          │          │          │             │
│  │ Junior   │ Mid-Level│ Senior   │ Lead     │ Expert     │
│  │ Engineer │ Engineer │ Engineer │ Engineer │             │
│  │          │          │          │          │             │
│  │ 3 Courses│ 4 Courses│ 5 Courses│ 3 Courses│ 2 Courses  │
│  │ 6 months │ 8 months │ 10 months│ 6 months │ 4 months   │
│                                                               
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Horizontal timeline on desktop
- Vertical on mobile
- Each node: icon + title + course count
- Completed nodes: filled with checkmark
- Current node: highlighted with pulse
- Locked nodes: grayed out

**Career Tracks:**
```typescript
const careerPaths = [
  {
    title: "Software Engineer",
    levels: ["Junior", "Mid-Level", "Senior", "Lead", "Staff"],
    totalCourses: 17,
    duration: "34 months",
  },
  {
    title: "Data Engineer",
    levels: ["Associate", "Engineer", "Senior", "Architect"],
    totalCourses: 14,
    duration: "28 months",
  },
  {
    title: "DevOps Engineer",
    levels: ["Junior", "Mid-Level", "Senior", "Platform Lead"],
    totalCourses: 12,
    duration: "24 months",
  },
];
```

### 3.8 CTA Section Improvements

**Current (Enhance):**
- Gradient background (primary to primary/80)
- Add subtle pattern overlay
- Add floating geometric shapes
- Include trust badges

**Enhanced Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Ready to Accelerate Your Engineering Career?     │   │
│  │                                                     │   │
│  │  Join 50,000+ engineers who have advanced         │   │
│  │  their careers with BIMPACC LMS                   │   │
│  │                                                     │   │
│  │  [Create Free Account]  [View Pricing]            │   │
│  │                                                     │   │
│  │  ✓ No credit card required  ✓ 7-day free trial   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.9 Professional Footer

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] BIMPACC LMS                                         │
│  Empowering engineers with                                  │
│  industry-relevant skills                                   │
│                                                             │
│  Platform    Company     Support      Legal                │
│  ────────    ───────     ───────      ──────               │
│  Courses     About Us     Help Center  Privacy             │
│  Paths       Careers      Contact      Terms               │
│  Pricing     Blog         FAQ          Cookies             │
│  Enterprise  Press                       Accessibility      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  © 2026 BIMPACC LMS. All rights reserved.                  │
│  [Social Icons]                      [Theme Toggle]        │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- 4-column grid on desktop
- Logo + tagline in first column
- Newsletter signup (optional)
- Social media icons
- Back to top button

---

## 4. UX Improvements

### 4.1 Micro-interactions

| Element | Interaction | Duration | Easing |
|---------|-------------|----------|--------|
| Button hover | Scale 1.02, shadow | 200ms | ease-out |
| Button click | Scale 0.98 | 100ms | ease-in |
| Card hover | Y translate -4px, shadow | 300ms | ease-out |
| Link hover | Color transition | 150ms | ease |
| Navbar scroll | Shadow fade in | 200ms | ease |
| Stats appear | Fade + slide up | 500ms | ease-out |

### 4.2 Smooth Scroll Behavior

```css
html {
  scroll-behavior: smooth;
}

/* For anchor links */
section[id] {
  scroll-margin-top: 80px; /* Offset for sticky header */
}
```

### 4.3 Better Mobile Responsiveness

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Optimizations:**
- Touch-friendly tap targets (min 44px)
- Swipeable carousels
- Collapsible sections
- Bottom navigation (optional)
- Larger text on mobile

### 4.4 Loading States

| State | Implementation |
|-------|----------------|
| Initial load | Skeleton screens for all sections |
| Images | Blur placeholder + fade in |
| Buttons | Spinner on async actions |
| Cards | Shimmer effect |
| Stats | Animated number counter |

### 4.5 Accessibility Improvements

```html
<!-- Skip to main content -->
<a href="#main" class="skip-link">Skip to content</a>

<!-- Proper heading hierarchy -->
<h1> → <h2> → <h3> → <h4>

<!-- Focus states -->
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

<!-- ARIA labels -->
<button aria-label="Close menu">
<nav aria-label="Main navigation">
```

---

## 5. Visual Design Guidelines

### 5.1 Spacing System

**Base unit:** 4px

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Tight spacing |
| space-2 | 8px | Icon padding |
| space-3 | 12px | Component internal |
| space-4 | 16px | Default gap |
| space-6 | 24px | Section padding |
| space-8 | 32px | Section gaps |
| space-12 | 48px | Large sections |
| space-16 | 64px | Hero section |

### 5.2 Visual Effects

**Shadows:**
```css
--shadow-sm: 0 1px 2px oklch(0 0 0 / 0.05);
--shadow-md: 0 4px 6px oklch(0 0 0 / 0.07), 0 2px 4px oklch(0 0 0 / 0.06);
--shadow-lg: 0 10px 15px oklch(0 0 0 / 0.1), 0 4px 6px oklch(0 0 0 / 0.05);
--shadow-xl: 0 20px 25px oklch(0 0 0 / 0.1), 0 8px 10px oklch(0 0 0 / 0.04);
--shadow-glow: 0 0 20px oklch(0.488 0.243 264.376 / 0.3);
```

**Glassmorphism:**
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
}
```

**Gradients:**
- Hero: `linear-gradient(135deg, var(--primary) 0%, oklch(0.4 0.2 264) 100%)`
- Cards: `linear-gradient(180deg, oklch(1 0 0) 0%, oklch(0.98 0 0) 100%)`
- Text: `bg-gradient-to-r from-primary to-primary/60`

### 5.3 Iconography

**Icon Set:** Lucide React (already in use)

**Icon Sizing:**
- Small: 16px (navigation, badges)
- Default: 20px (body text)
- Large: 24px (headings)
- XL: 32px (hero sections)

**Icon Treatment:**
- Colored background circle for feature icons
- Gradient fill for hero icons
- Consistent stroke width (1.5px or 2px)

---

## 6. Engineer-Specific Elements

### 6.1 Technical Focus Areas

| Category | Courses | Icon |
|----------|---------|------|
| Software Development | 45+ | Code |
| Data Science/ML | 30+ | Brain |
| Cloud/DevOps | 25+ | Cloud |
| Cybersecurity | 20+ | Shield |
| Systems Design | 15+ | Cpu |
| Robotics/IoT | 10+ | Robot |

### 6.2 Progress Tracking Visualization

**Elements:**
- Circular progress rings
- Linear progress bars with percentage
- Milestone markers
- XP/points system display
- Streak counters
- Completion badges

### 6.3 Career-Focused Messaging

**Taglines:**
- "From learner to leader in your engineering career"
- "Industry-recognized certifications for professional growth"
- "Build the skills employers are looking for"
- "Your career path, visualized"

### 6.4 Industry-Relevant Features

- Certification badges (shareable)
- Project portfolios
- Skill assessment tests
- Career counseling integration
- Job board connections
- Professional network building

---

## 7. Component Specifications

### 7.1 Course Card Component

```tsx
interface CourseCardProps {
  title: string;
  category: string;
  instructor: {
    name: string;
    avatar?: string;
  };
  thumbnail: string;
  rating: number;
  reviewCount: number;
  price: number;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  progress?: number; // For enrolled courses
  isFeatured?: boolean;
}
```

**Visual:**
- Rounded corners: 16px
- Shadow: shadow-md, hover: shadow-lg
- Overflow: hidden for image
- Transition: all 0.3s ease

### 7.2 Stats Card Component

```tsx
interface StatsCardProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
}
```

### 7.3 Testimonial Card Component

```tsx
interface TestimonialProps {
  quote: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  company?: string;
  rating?: number;
}
```

### 7.4 Learning Path Node Component

```tsx
interface PathNodeProps {
  title: string;
  level: number;
  courses: number;
  duration: string;
  status: "completed" | "current" | "locked";
}
```

---

## 8. Responsive Breakpoints

### 8.1 Tailwind Breakpoints

```css
/* Default (mobile-first) */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### 8.2 Section-Specific Responsiveness

| Section | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Navbar | Hamburger | Full | Full |
| Hero | Stacked | Stacked | Two-column |
| Stats | 2x2 grid | 4x1 row | 4x1 row |
| Courses | 1 column | 2 columns | 3 columns |
| Features | 1 column | 2 columns | 3 columns |
| Roadmap | Vertical | Horizontal | Horizontal |
| Testimonials | 1 column | 2 columns | 3 columns |
| Footer | Stacked | 2x2 grid | 4 columns |

---

## 9. Animation Specifications

### 9.1 Entrance Animations

```css
/* Fade in up */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Stagger children */
.stagger-children > * {
  animation: fadeInUp 0.5s ease-out forwards;
  opacity: 0;
}
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 100ms; }
.stagger-children > *:nth-child(3) { animation-delay: 200ms; }
.stagger-children > *:nth-child(4) { animation-delay: 300ms; }
.stagger-children > *:nth-child(5) { animation-delay: 400ms; }
.stagger-children > *:nth-child(6) { animation-delay: 500ms; }
```

### 9.2 Micro-interactions

```css
/* Button hover */
.btn-hover {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px oklch(0.488 0.243 264.376 / 0.2);
}

/* Card hover */
.card-hover {
  transition: all 0.3s ease;
}
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px oklch(0 0 0 / 0.1);
}

/* Pulse animation for current path node */
@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 oklch(0.488 0.243 264.376 / 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px oklch(0.488 0.243 264.376 / 0);
  }
  100% {
    box-shadow: 0 0 0 0 oklch(0.488 0.243 264.376 / 0);
  }
}
```

### 9.3 Scroll Animations

Use Intersection Observer for scroll-triggered animations:

```tsx
// Example with CSS
.scroll-animate {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease-out;
}

.scroll-animate.visible {
  opacity: 1;
  transform: translateY(0);
}
```

---

## 10. Accessibility Requirements

### 10.1 WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|----------------|
| Color contrast | Minimum 4.5:1 for text, 3:1 for large text |
| Focus indicators | Visible focus rings on all interactive elements |
| Keyboard navigation | Full keyboard support, logical tab order |
| Screen reader | Proper ARIA labels, semantic HTML |
| Reduced motion | Respect `prefers-reduced-motion` |
| Text scaling | Support up to 200% zoom |

### 10.2 ARIA Implementation

```html
<!-- Navigation -->
<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="/" aria-current="page">Home</a></li>
  </ul>
</nav>

<!-- Buttons with icons -->
<button aria-label="Close menu">
  <X aria-hidden="true" />
</button>

<!-- Stats with descriptions -->
<div role="group" aria-label="Platform statistics">
  <div aria-label="50,000 active students">...</div>
</div>
```

### 10.3 Focus States

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary);
  color: var(--primary-foreground);
  padding: 8px 16px;
  z-index: 100;
}
.skip-link:focus {
  top: 0;
}
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Update globals.css with new CSS variables
- [ ] Enhance navbar with sticky behavior and smooth scroll
- [ ] Implement skip-to-content link

### Phase 2: Core Sections
- [ ] Redesign hero section with engineer-focused messaging
- [ ] Expand stats section with visual enhancements
- [ ] Add Featured Courses section
- [ ] Add Testimonials section (use existing data)
- [ ] Enhance Features section

### Phase 3: Engineer-Specific
- [ ] Add Learning Path/Roadmap section
- [ ] Implement progress visualization components
- [ ] Add career-focused CTAs

### Phase 4: Polish
- [ ] Add micro-interactions and animations
- [ ] Implement loading states
- [ ] Ensure mobile responsiveness
- [ ] Complete accessibility implementation

---

## File Structure for Implementation

```
app/
├── page.tsx                    # Main homepage (redesign)
├── globals.css                 # Add new CSS variables
└── layout.tsx                  # Add skip link

components/
├── layout/
│   └── navbar.tsx              # Enhanced navbar
├── home/
│   ├── hero.tsx                # Hero section component
│   ├── stats.tsx               # Stats section component
│   ├── featured-courses.tsx    # NEW: Featured courses
│   ├── testimonials.tsx        # NEW: Testimonials
│   ├── features.tsx            # Enhanced features
│   ├── learning-path.tsx       # NEW: Learning roadmap
│   ├── cta.tsx                 # Enhanced CTA
│   └── footer.tsx              # Enhanced footer
└── ui/
    ├── course-card.tsx         # NEW: Course card
    ├── stats-card.tsx          # NEW: Stats card
    └── path-node.tsx           # NEW: Path node
```

---

## Summary

This specification provides a comprehensive blueprint for redesigning the BIMPACC LMS homepage with:

1. **Professional engineering-focused design** using the existing color palette
2. **Complete section coverage** including new Featured Courses and Learning Path
3. **Engineer-specific elements** for career advancement and technical skills
4. **Modern UX patterns** including micro-interactions and smooth animations
5. **Full accessibility compliance** with proper ARIA and focus states
6. **Responsive design** for all device sizes

The specification is ready for implementation in Code mode.

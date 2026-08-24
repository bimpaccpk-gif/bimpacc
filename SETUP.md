# BIMPACC LMS — Setup Guide

## Prerequisites

- **Node.js** v20 or later ([download](https://nodejs.org/))
- **npm** v10+ (comes with Node.js)
- **Git** ([download](https://git-scm.com/))
- A [Supabase](https://supabase.com/) account (for backend integration)

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd bimpacc-lms
npm install
```

---

## 2. Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Then fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Where to find these:**
> Go to [Supabase Dashboard](https://supabase.com/dashboard) → select your project → **Settings** → **API** → copy the **Project URL** and **anon/public** key.

---

## 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint checks |

---

## 5. Project Structure

```
bimpacc-lms/
├── app/
│   ├── (auth)/                    # Auth route group
│   │   ├── layout.tsx             # Centered auth layout
│   │   ├── login/page.tsx         # Login page
│   │   └── register/page.tsx      # Registration page
│   ├── (dashboard)/               # Dashboard route group
│   │   ├── layout.tsx             # Dashboard layout with auth guard
│   │   ├── admin/page.tsx         # Admin dashboard
│   │   ├── instructor/page.tsx    # Instructor dashboard
│   │   ├── student/page.tsx       # Student dashboard
│   │   └── courses/page.tsx       # Course catalog
│   ├── layout.tsx                 # Root layout (fonts, metadata)
│   ├── page.tsx                   # Redirects the home route to login
│   └── globals.css                # Tailwind + CSS variables
├── components/
│   ├── ui/                        # Reusable UI primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── index.ts
│   ├── layout/                    # Layout components
│   │   ├── navbar.tsx             # Top navigation bar
│   │   ├── dashboard-navbar.tsx   # Dashboard top nav
│   │   └── dashboard-shell.tsx    # Dashboard wrapper
│   │   └── index.ts
│   └── index.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   └── server.ts              # Server Supabase client
│   ├── constants.ts               # App constants & nav links
│   └── utils.ts                   # cn() utility function
├── types/
│   ├── index.ts                   # User, Course, Lesson types
│   └── supabase.ts                # Database type definitions
├── hooks/                         # Custom React hooks (placeholder)
├── utils/                         # General utilities (placeholder)
├── .env.local.example             # Environment template
├── .prettierrc                    # Prettier config
├── next.config.ts                 # Next.js config
├── postcss.config.mjs             # PostCSS + Tailwind
├── tsconfig.json                  # TypeScript config
└── eslint.config.mjs              # ESLint flat config
```

---

## 6. Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.2.1 | Framework (App Router) |
| React | 19.2.4 | UI library |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Styling |
| Supabase | ^2.99.3 | Auth, DB, storage |
| ESLint | ^9 | Linting |
| Prettier | ^3.8.1 | Code formatting |

---

## 7. Adding Supabase Auth (Next Steps)

### 7.1 Install Supabase CLI (optional)

```bash
npm install -g supabase
```

### 7.2 Create auth middleware

Create `middleware.ts` in the project root:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/register") &&
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

### 7.3 Run Supabase locally (optional)

```bash
supabase start
supabase db push
```

---

## 8. Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your repository
4. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
5. Deploy

### Docker

```dockerfile
FROM node:20-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| `Module not found` errors | Run `npm install` again |
| Tailwind classes not applying | Restart dev server |
| Supabase connection fails | Check `.env.local` values |
| Build fails on TypeScript | Run `npm run lint` to see errors |

---

## 10. Scripts Reference

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm start            # Start production server

# Quality
npm run lint         # Run ESLint
npx prettier --write .   # Format all files
```

# BIMPACC LMS

A modern Learning Management System built with Next.js, TypeScript, and Tailwind CSS. Supabase-ready for auth, database, and storage.

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # add your Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **App Router** with route groups for auth and dashboard
- **Role-based dashboards** — admin, instructor, student
- **Reusable components** — Button, Input, Card
- **Responsive** — mobile menu, adaptive grids
- **Dark mode** ready
- **Supabase integration** prepared (browser + server clients)

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Next.js 16 | Framework |
| React 19 | UI |
| TypeScript | Type safety |
| Tailwind CSS 4 | Styling |
| Supabase | Auth, DB, storage |
| ESLint + Prettier | Code quality |

## Documentation

See **[SETUP.md](./SETUP.md)** for full setup instructions, project structure, deployment guide, and auth middleware setup.

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Production server
npm run lint     # Lint check
```

## License

Private — BIMPACC LMS.

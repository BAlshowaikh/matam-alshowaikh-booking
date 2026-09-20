# 🕌 Matam Al-Showaikh Booking System

🌐 **Deployed Application**: _Will be done soon_

---

# 📑 Table of Contents
- [🎯 Project Overview](#-project-overview)
- [🧱 System Highlights](#-system-highlights)
- [🗂️ Project Architecture](#-project-architecture)
- [🛠️ Tech Stack](#-tech-stack)
- [⚙️ Environment Variables](#️-environment-variables)
- [🧪 Getting Started](#-getting-started)
- [🔗 Project References](#-project-references)
- [📄 Credits](#-credits)
- [🚀 Future Enhancements](#-future-enhancements)

---

## 🎯 Project Overview

Matam Al-Showaikh Booking System is a booking platform for a Husseiniya (Shia Islamic community hall) in Bahrain. The public site lets visitors pick a day and one or more periods (morning/afternoon/evening) on a dual Hijri/Gregorian calendar and submit a booking request without needing an account. Administrators review, approve, or reject requests through a protected, session-authenticated dashboard.

The backend follows a clear routes/services split — Fastify routes handle HTTP concerns and validation, services own the database queries and business logic.

---

## 🧱 System Highlights

- pnpm monorepo with clean app/package boundaries
- Bilingual public site (Arabic-first/RTL, English toggle) via react-i18next
- Dual Hijri/Gregorian calendar with per-period, per-day availability
- Multi-period booking requests, with database-enforced protection against double-booking
- Session-cookie admin authentication with multi-admin account management (create/activate/deactivate)
- Full admin dashboard: booking review, blocked periods, Hijri date corrections, system settings, and audit history

---

## 🗂️ Project Architecture

```
matam-alshowaikh/
├── apps/
│   ├── api/            # Fastify REST API (routes + services)
│   └── web/            # React + Vite public site and admin dashboard
├── packages/
│   ├── db/             # Drizzle ORM schema and migrations
│   └── shared/         # Domain constants/types shared by api and web
├── scripts/            # Build/production helper scripts
├── docker-compose.yml  # Local PostgreSQL
└── start-app.ps1       # One-command local dev startup
```

---

## 🛠️ Tech Stack

- TypeScript (Node.js 22+)
- Fastify + TypeBox (API, request validation)
- Drizzle ORM + PostgreSQL (database)
- React + Vite + Tailwind CSS (frontend)
- react-i18next (Arabic/English localization)
- pnpm workspaces (monorepo tooling)

---

## ⚙️ Environment Variables

```
DB_USER=
DB_PASSWORD=
DB_NAME=
DATABASE_URL=postgresql://<user>:<password>@localhost:54321/<db_name>
```

---

## 🧪 Getting Started

```bash
git clone https://github.com/BAlshowaikh/matam-alshowaikh-booking.git
cd matam-alshowaikh-booking
pnpm install
docker compose up -d
pnpm --filter @matam/db migrate
pnpm dev
```

Or run `./start-app.ps1`, which starts PostgreSQL, applies migrations, and launches the API and web app together in one step (the first admin still needs to be seeded separately via `pnpm --filter @matam/api seed:admin`).

---

## 🔗 Project References

- https://github.com/BAlshowaikh/matam-alshowaikh-booking
- [Fastify](https://fastify.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [React](https://react.dev/)

---

## 📄 Credits

Developed by **BAlshowaikh**

---

## 🚀 Future Enhancements

- Deploy the system to production and configure backups
- Automated test coverage
- Password reset for admin accounts

# Matam Al-Showaikh Booking System

A bilingual booking platform for Matam Al-Showaikh in Bahrain. Visitors can check availability on a dual Hijri/Gregorian calendar and submit booking requests without an account. Administrators can review bookings, block periods, manage Hijri corrections, configure the booking horizon, manage administrator accounts, and inspect the audit history.

Deployment status: not published yet.

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [First-time development setup](#first-time-development-setup)
- [Starting the project later](#starting-the-project-later)
- [Application URLs](#application-urls)
- [Database access](#database-access)
- [Common commands](#common-commands)
- [Production setup](#production-setup)
- [Troubleshooting](#troubleshooting)
- [Project references](#project-references)
- [Future enhancements](#future-enhancements)

## Features

- Arabic-first RTL interface with an English language option
- Hijri and Gregorian calendar views
- Morning, afternoon, evening, and whole-day booking support
- Database-enforced protection against overlapping active bookings
- Session-based administrator authentication
- Booking approval, rejection, notes, filtering, and pagination
- Blocked-period and Hijri-correction management
- Multiple administrator accounts with activation controls
- Administrative dashboard and audit history

## Architecture

```text
matam-alshowaikh/
|-- apps/
|   |-- api/            Fastify REST API
|   `-- web/            React and Vite frontend
|-- packages/
|   |-- db/             Drizzle schema and migrations
|   `-- shared/         Shared domain constants and utilities
|-- scripts/            Build and production helpers
|-- docker-compose.yml  Local PostgreSQL service
`-- start-app.ps1       Windows development startup script
```

The project is a pnpm workspace. Fastify routes handle HTTP validation and responses, while service modules contain database operations and business logic.

## Prerequisites

Install the following before setting up the repository:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 22 or newer
- pnpm 11.25.0
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Docker Compose

The required pnpm version can be enabled through Corepack:

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
```

Confirm the tools are available:

```bash
node --version
pnpm --version
docker --version
docker compose version
```

## First-time development setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/BAlshowaikh/matam-alshowaikh-booking.git
cd matam-alshowaikh-booking
pnpm install
```

### 2. Create the local environment file

Copy `.env.example` to `.env`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS or Linux:

```bash
cp .env.example .env
```

Configure the local database values. The username, password, and database name in `DATABASE_URL` must match the three values above it:

```env
DB_USER=matam_app
DB_PASSWORD=choose_a_local_password
DB_NAME=matam_booking
DATABASE_URL=postgresql://matam_app:choose_a_local_password@localhost:54321/matam_booking
ADMIN_USERNAME=
ADMIN_PASSWORD=
```

Do not commit `.env`. It is already excluded by `.gitignore`.

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

The database is exposed locally on port `54321`, and its files are persisted in the Docker volume named `postgres_data`.

### 4. Apply database migrations

```bash
pnpm --filter @matam/db migrate
```

### 5. Create the first administrator

This step is required only for a new or empty database. Temporarily set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`, then run:

```bash
pnpm --filter @matam/api seed:admin
```

After the account is created, remove `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env`. The password hash is stored in PostgreSQL, and additional accounts can be created from the Administrators page.

The seed command is safe to run again for the same username; it will not reset an existing password.

### 6. Start the application

```bash
pnpm dev
```

Keep this terminal open while developing. Press `Ctrl+C` to stop the API and frontend.

## Starting the project later

After the first-time setup, use:

```bash
docker compose up -d postgres
pnpm dev
```

On Windows, the helper script starts PostgreSQL, waits for it, applies pending migrations, and launches both development servers:

```powershell
.\start-app.ps1
```

The helper does not install dependencies or create the first administrator.

To stop only PostgreSQL:

```bash
docker compose stop postgres
```

Stopping the container does not delete its data.

## Application URLs

While `pnpm dev` is running:

- Public application: <http://localhost:5173>
- Administration login: <http://localhost:5173/admin>
- API: <http://localhost:3000>

Vite proxies browser requests under `/api` to the Fastify server during development.

## Database access

### pgAdmin

Register a server using:

- Host: `localhost`
- Port: `54321`
- Maintenance database: the value of `DB_NAME`
- Username: the value of `DB_USER`
- Password: the value of `DB_PASSWORD`

Application tables are located under:

```text
Databases > DB_NAME > Schemas > public > Tables
```

The separate `drizzle` schema stores migration history and should not be manually edited or deleted.

### Drizzle Studio

With PostgreSQL running, the database can also be inspected through:

```bash
pnpm --filter @matam/db studio
```

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the API and frontend in development mode |
| `pnpm dev:api` | Start only the API |
| `pnpm dev:web` | Start only the frontend |
| `pnpm build` | Build all workspace packages and applications |
| `pnpm --filter @matam/db migrate` | Apply pending database migrations |
| `pnpm --filter @matam/db generate` | Generate a migration after changing the database schema |
| `pnpm --filter @matam/db studio` | Open Drizzle Studio |
| `pnpm --filter @matam/api seed:admin` | Create the initial administrator from temporary environment variables |
| `docker compose up -d postgres` | Start the local PostgreSQL container |
| `docker compose logs -f postgres` | Follow PostgreSQL logs |
| `docker compose stop postgres` | Stop PostgreSQL without deleting data |

## Production setup

Use a dedicated production PostgreSQL database. Prefer the deployment provider's secret manager instead of uploading the local `.env` file.

Required runtime variable:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
```

Optional runtime variable:

```env
PORT=3000
```

`DB_USER`, `DB_PASSWORD`, and `DB_NAME` are additionally required only when production PostgreSQL is created through this repository's `docker-compose.yml`.

Install, migrate, build, and start:

```bash
pnpm install --frozen-lockfile
pnpm migrate:prod
pnpm build
pnpm start
```

For a new production database, temporarily provide `ADMIN_USERNAME` and `ADMIN_PASSWORD`, run the seed command once, verify the account can sign in, and then remove those two variables.

In production, Fastify serves the compiled frontend and API from the same origin. Place the service behind HTTPS so the secure administrator session cookie works correctly.

## Troubleshooting

### PostgreSQL is unavailable

Check whether the container is running:

```bash
docker compose ps
docker compose logs postgres
```

Start it if necessary:

```bash
docker compose up -d postgres
```

### Database authentication fails

Confirm that `DB_USER`, `DB_PASSWORD`, and `DB_NAME` match the credentials embedded in `DATABASE_URL`. If the Docker volume was created with older credentials, changing `.env` does not update the existing PostgreSQL user automatically.

### A port is already in use

The project uses these local ports:

- `5173` for Vite
- `3000` for Fastify
- `54321` for PostgreSQL

Stop the conflicting process or change the relevant configuration before restarting.

### Resetting the local database

The following command permanently deletes the local PostgreSQL volume and all development data:

```bash
docker compose down -v
```

Only run it when a complete local reset is intentional. Start PostgreSQL, rerun migrations, and seed the initial administrator afterward.

## Technology

- TypeScript and Node.js
- Fastify and TypeBox
- Drizzle ORM and PostgreSQL
- React, Vite, and Tailwind CSS
- react-i18next
- pnpm workspaces

## Project references

- [Project repository](https://github.com/BAlshowaikh/matam-alshowaikh-booking)
- [Fastify](https://fastify.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [React](https://react.dev/)

## Future enhancements

- Deploy the system and configure automated backups
- Add automated test coverage
- Add an administrator password-reset workflow

## License and credits

Developed by BAlshowaikh.

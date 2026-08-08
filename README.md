# MSAA Event Management Agency — ERP

A multi-company ERP system built for an event management agency, covering accounting, sales/CRM, inventory & procurement, HR, and executive reporting — with self-service portals for suppliers and customers.

## Features

- **Accounting** — chart of accounts, journal vouchers, ZATCA-style bilingual tax invoices with sequential numbering, accounts receivable/payable, VAT & Zakat reporting, month-end period close, PDF export.
- **Sales & CRM** — leads, customers, proposals with document checklists, sales orders, customer statements, a self-service customer portal.
- **Inventory & Procurement** — products, warehouses, stock movements, suppliers, purchase orders, and a self-service supplier portal.
- **HR** — employees, departments, attendance, payroll, leave requests with an approval workflow.
- **Multi-company** — every record is tenant-scoped; admins/accountants can switch between companies, other roles are locked to one.
- **Security** — email/password + admin-assigned login codes, forced password rotation (first login and every 90 days), TOTP two-factor authentication, per-identifier login rate limiting/lockout, password reset via email, a company-scoped audit log, and account suspension for users/customers/suppliers.
- **Operations** — in-app notifications, an approvals inbox, personal task lists, soft-delete/archive with restore for customers/leads/products, and one-click data backups.
- **Testing** — a Playwright end-to-end smoke suite covering the core flows above.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, Server Actions) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [NeDB](https://github.com/seald/nedb) (`@seald-io/nedb`) — an embedded, file-based database (no external DB server required)
- [Auth.js / NextAuth](https://authjs.dev) v5 (Credentials provider, JWT sessions) + `bcryptjs` + `otpauth` (TOTP)
- `puppeteer-core` for server-rendered PDF export
- `nodemailer` for outgoing notification/reset emails
- [Playwright](https://playwright.dev) for end-to-end testing

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in AUTH_SECRET (see below)
npm run seed                        # creates the default company + admin user
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the default admin printed by the seed script (`admin@erp.local` / `admin123` — change this immediately in a real deployment).

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | Yes | Signs NextAuth session tokens. Generate with `openssl rand -base64 32`. |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | No | Gmail SMTP for outgoing emails (password resets, notifications). Email sending is a no-op with a console warning if unset. |

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm run start` | Production build / start |
| `npm run seed` | Seed the database with a default company, chart of accounts, and admin user |
| `npm run backup` | Copy the `data/` directory to a timestamped backup folder |
| `npm run test:e2e` | Run the Playwright end-to-end suite (expects a dev server on `localhost:3000`) |
| `npm run lint` | Lint the codebase |

## Data storage

Application data lives in `.db` files under `data/`, managed by NeDB — no external database server to install or configure. Take backups seriously, since the same file-based simplicity has no built-in replication: run `npm run backup` regularly, or use the in-app **Settings → Backups** page.

## Deployment

This is a full server application — it needs a persistent Node.js process (Server Actions, file-based storage, session auth, and headless-Chrome PDF export all require server-side execution), not a static host. Suitable targets include a VPS, Docker host, Railway, Fly.io, Render, or DigitalOcean App Platform. Static/serverless hosts with an ephemeral filesystem (e.g. Vercel's default serverless functions, GitHub Pages) are **not** compatible with the NeDB file store as-is.

## Project structure

```
src/app/            Next.js App Router routes (staff app, plus /supplier, /customer portals, /print PDF views)
src/lib/actions/     Server Actions — the primary business logic layer, organized by module
src/lib/             Shared server-side helpers (db access, auth, rate limiting, TOTP, email, PDF numbering, ...)
src/components/      Shared UI components
scripts/             Seed, backup, and migration scripts
tests/e2e/           Playwright end-to-end smoke tests
data/                NeDB data files (gitignored)
```

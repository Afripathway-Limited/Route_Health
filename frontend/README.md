<div align="center">

<img src="public/next.svg" alt="RouteHealth" width="60" />

# RouteHealth

### Last-Mile Medical Logistics Platform for Africa

**Replacing WhatsApp-based dispatch with intelligent, accountable, offline-capable routing.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![Laravel](https://img.shields.io/badge/Laravel-11-red?style=flat-square&logo=laravel)](https://laravel.com)
[![License](https://img.shields.io/badge/License-Proprietary-lightgrey?style=flat-square)](LICENSE)

</div>

---

## The Problem

In Sub-Saharan Africa, diagnostic labs depend on riders to collect medical samples from clinics and deliver them on time. Today, this entire operation runs through WhatsApp group chats — no accountability, no live visibility, no audit trail, and no way to know if a sample arrived safely.

A delayed sample is not a logistics problem. It is a patient outcome problem.

**RouteHealth fixes this.**

---

## What RouteHealth Does

RouteHealth is a multi-tenant SaaS platform that gives logistics companies full operational control over their medical courier fleets, and gives their clients — labs and hospitals — full visibility into every sample in transit.

| For the Dispatcher | For the Rider | For the Lab |
|---|---|---|
| Plan and optimise routes in seconds | Receive routes on mobile, mark stops offline | See exactly when samples arrive |
| Track every rider on a live map | Upload chain-of-custody photos | Confirm or dispute receipts directly |
| Get alerted on delays and anomalies | Sync automatically when signal returns | Download proof-of-delivery PDF |
| Send WhatsApp notifications automatically | No app install required (PWA) | Full pickup history and audit trail |

---

## Platform Roles

```
Super Admin          → manages all organisations on the platform
Org Admin            → manages their company's riders, facilities, and settings
Dispatcher           → plans routes, tracks riders, manages daily operations
Lab Manager          → views incoming pickups, confirms receipts
Rider                → mobile-only, marks stops, uploads photos, works offline
```

---

## Tech Stack

### Frontend (this repository)
| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework — server and client components |
| TypeScript | Type safety across the entire codebase |
| Tailwind CSS | Utility-first styling with custom design tokens |
| Leaflet + OpenStreetMap | Maps — free, no API cost, works offline |
| Recharts | Analytics charts and data visualisation |
| React Hot Toast | Non-intrusive user notifications |

### Backend (Laravel 11)
| Technology | Purpose |
|---|---|
| Laravel 11 | REST API — no Blade views |
| PostgreSQL | Primary database |
| Laravel Sanctum + Spatie | Authentication and role-based permissions |
| Twilio WhatsApp API | Dispatch and delivery notifications |
| AWS S3 | Chain-of-custody photo storage |
| Laravel Echo + Pusher | Real-time live tracking events |
| Redis + Laravel Queue | Background jobs and offline sync |
| OSRM | Open-source route optimisation engine |

---

## Project Structure

```
routehealth-backend/
├── app/                        ← Laravel application (Phase 2)
├── routes/api.php              ← All API endpoint definitions
├── database/migrations/        ← PostgreSQL schema
├── database/seeders/           ← Demo data for PathCare Diagnostics Kenya
└── frontend/                   ← Next.js application (Phase 1 — complete)
    └── src/
        ├── app/
        │   ├── (auth)/         ← Login, forgot password, reset password
        │   └── (dashboard)/
        │       ├── super-admin/    ← Platform management
        │       ├── admin/          ← Organisation operations
        │       ├── dispatcher/     ← Daily routing and tracking
        │       └── lab-manager/    ← Pickup confirmation portal
        ├── components/
        │   ├── ui/             ← Base component library
        │   ├── layout/         ← Sidebar, header, shell
        │   └── maps/           ← Leaflet map components
        ├── contexts/           ← Auth, sidebar, theme providers
        ├── lib/                ← API client, mock data, utilities
        └── types/              ← TypeScript interfaces
```

---

## Screens Built (Phase 1 — Frontend Complete)

### Authentication
- Login with role-based redirect after authentication
- Forgot password and reset password flows

### Super Admin
- Platform overview with organisation stats
- Organisation management — create, edit, suspend, activate
- Platform settings — WhatsApp API, routing engine, system health

### Org Admin
- Operations dashboard with live alert panel and 7-day chart
- Facilities management — full CRUD with pickup history per facility
- Riders management — add/edit, performance metrics, on-time rate tracking
- User management — invite dispatchers and lab managers, manage roles
- Analytics — KPI cards, completion trends, rider rankings, delay heatmap
- Organisation settings — branding, logo, WhatsApp config, notifications

### Dispatcher
- Daily operations hub with alert strip and route planning entry
- Task management — create, filter, assign with time windows and priority
- Route planning — select riders and tasks, run optimisation, dispatch
- Live tracking — Leaflet map with rider positions and stop progress
- Route history — all dispatched routes with stop-level detail
- Dispatcher analytics — TAT trends and rider performance comparison

### Lab Manager
- Today's pickups with ETA, rider info, and confirm/dispute buttons
- Pickup history — chain of custody records, photo viewer, PDF download

### All Roles
- Profile — personal info, password change, notification preferences

---

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Install and run

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo credentials (Phase 1 — mock data)

| Role | Email | Password |
|---|---|---|
| Super Admin | super@routehealth.com | RouteHealth@2024 |
| Org Admin | admin@pathcare.ke | RouteHealth@2024 |
| Dispatcher | dispatch@pathcare.ke | RouteHealth@2024 |
| Lab Manager | lab@pathcare.ke | RouteHealth@2024 |

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable — production-ready code only |
| `dev` | Integration — all tested features merged here |
| `phase/1-frontend-mvp` | Phase 1 — complete frontend, all 21 screens |
| `phase/2-backend-api` | Phase 2 — Laravel API, database, WhatsApp *(coming)* |
| `phase/3-offline-pwa` | Phase 3 — offline sync, service worker, PWA *(coming)* |

---

## Roadmap

### Phase 1 — Frontend MVP ✅ Complete
All screens built across all four user roles. Clean commit history. Ready for backend integration.

### Phase 2 — Backend API 🔄 In Progress
- Laravel 11 REST API with full multi-tenancy
- PostgreSQL migrations and demo seeders
- Sanctum authentication with Spatie role management
- Five WhatsApp notification flows via Twilio
- Driver GPS location endpoint
- Chain-of-custody photo upload to S3
- OSRM route optimisation integration
- Anomaly detection — stationary riders, overdue stops, route deviation
- Smart ETA prediction from historical data

### Phase 3 — Offline and Mobile
- Progressive Web App for riders — installable, no app store
- IndexedDB local queue for offline stop marking and photo uploads
- Background sync when connectivity is restored
- Designed specifically for low-bandwidth environments across Africa

---

## Why This Matters

Africa processes millions of diagnostic samples every week. A significant number are delayed, lost, or arrive compromised because the chain of custody is invisible. RouteHealth makes every handoff accountable, every delay visible, and every sample traceable from clinic to lab.

This is not a logistics tool. It is a healthcare infrastructure tool.

---

## Contributing

This is a proprietary project owned by **Afripathway Limited**. Access is restricted to authorised collaborators only.

---

<div align="center">

Built with care for the African healthcare supply chain.

**Afripathway Limited © 2026**

</div>

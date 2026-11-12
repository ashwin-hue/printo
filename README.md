# Prinrox ✻ Digital Campus Printing Network

An ultra-fast, grab-and-go digital campus printing network powered by **Nhost** (PostgreSQL + Hasura GraphQL + Auth).

---

## 📁 Repository Architecture

This repository is organized into independent portals:

- **[`customer/`](./customer)**: Customer & Student Portal (order upload, 30s queue jump, instant print passes).
- **[`shops/`](./shops)**: Shop Owner & Operator Portal (station onboarding, pricing configuration, live order dispatch).
- **[`nhost/`](./nhost)**: Database schema (15 tables), Hasura metadata, CLI migrations, and sample campus seed data.
- **[`scripts/`](./scripts)**: Automated database migration and Hasura GraphQL tracking runners.

---

## 🚀 Quick Start

### 1. Install & Run Customer Portal
```bash
cd customer
npm install
npm run dev
```

### 2. Install & Run Shop Owner Hub
```bash
cd shops
npm install
npm run dev
```

### 3. Apply Nhost Database Schema & GraphQL Metadata
```bash
npm run nhost:db:apply
```

---

## 🗄️ Database Tables (15 Tables)

- **Core MVP**: `profiles`, `shops`, `shop_operating_hours`, `shop_services`, `shop_pricing`, `documents`, `orders`, `order_documents`, `order_status_history`, `notifications`, `payments`.
- **Growth**: `shop_staff`, `reviews`, `support_tickets`, `document_access_logs`.

---

## 🌐 Branch Structure for Multi-Domain Hosting

- **`main`**: Full monorepo containing both portals and backend tooling.
- **`customer`**: Dedicated branch for hosting the Customer Portal.
- **`shops`**: Dedicated branch for hosting the Shop Owner Portal.


# Printo Nhost Database Automation & Schema Guide

This directory contains the complete database configuration, automated migrations, Hasura GraphQL metadata tracking, and seed data for **Printo**.

---

## 🗄️ Database Architecture (15 Tables)

### Core MVP Tables (1–11)
1. **`profiles`**: User profiles for customers, shop owners, and admins. Linked to `auth.users(id)` with auto-sync trigger on signup.
2. **`shops`**: Campus printing shops with owner reference, geo-coordinates, address, and availability status.
3. **`shop_operating_hours`**: Day-of-week operating schedule (0–6), opening/closing times, and holiday flags.
4. **`shop_services`**: Available printing services (laser printing, scanning, spiral binding, hardcover thesis).
5. **`shop_pricing`**: Granular pricing per shop based on service type, paper size (`A4`, `A3`), color mode (`B&W`, `Color`), and sides (`Single`, `Double`).
6. **`documents`**: Metadata for uploaded files (filename, private storage path, size, MIME type, page count).
7. **`orders`**: Core order ledger with status lifecycle (`pending`, `accepted`, `rejected`, `printing`, `ready_for_collection`, `completed`, `cancelled`).
8. **`order_documents`**: Connects multiple documents to an order with specific print configurations (copies, page range, binding, color).
9. **`order_status_history`**: Audit trail automatically populated via PostgreSQL trigger whenever an order status updates.
10. **`notifications`**: Real-time customer and shop notifications (in-app alerts, order updates).
11. **`payments`**: Payment records separated from orders with gateway transaction IDs, payment methods (`UPI`, `Card`, `Cash`), and payment status.

### Recommended Growth Tables (12–15)
12. **`shop_staff`**: Allows shop owners to delegate processing permissions to employees.
13. **`reviews`**: Ratings (1–5) and customer feedback for completed orders.
14. **`support_tickets`**: Customer service and order issue ticketing with priority levels.
15. **`document_access_logs`**: Privacy audit log recording who viewed, printed, or downloaded customer documents.

---

## 🚀 How to Run the Automated Database Creation

### Method 1: Automated Script (1-Click)
Run the automated runner from the project root:

```bash
npm run nhost:db:apply
```

Or pass your Nhost project credentials directly as CLI flags:
```bash
node scripts/apply-nhost-schema.mjs --subdomain=<your-subdomain> --region=<your-region> --secret=<your-admin-secret>
```

To also insert sample campus shops, pricing tiers, and operating hours:
```bash
npm run nhost:db:seed
# or
node scripts/apply-nhost-schema.mjs --seed
```

What the script automates:
- ✅ Creates all custom PostgreSQL ENUMs (`user_role`, `order_status`, `payment_status`) and extensions (`uuid-ossp`, `pgcrypto`).
- ✅ Creates all 15 tables with foreign keys, constraints, and performance indexes.
- ✅ Installs PostgreSQL triggers for automatic `updated_at`, `auth.users` sync to `profiles`, and `order_status_history` tracking.
- ✅ Calls Hasura Metadata API to auto-track all 15 tables in Hasura GraphQL Engine.
- ✅ Automatically tracks foreign key Object & Array relationships for GraphQL nesting (`order.customer`, `order.shop`, `order.order_documents`, `shop.pricing`, etc.).

---

### Method 2: Nhost Web Dashboard (SQL Editor)
If you prefer running via the browser:
1. Open your [Nhost Cloud Dashboard](https://app.nhost.io).
2. Select your project and navigate to **Database** -> **SQL Editor**.
3. Copy the entire contents of [`nhost/schema.sql`](./schema.sql) and click **Run**.
4. (Optional) To populate demo shops and pricing, copy and run [`nhost/seeds/01_sample_data.sql`](./seeds/01_sample_data.sql).
5. Navigate to **Hasura** -> **Data** -> Click **Track All** on untracked tables and foreign keys.

---

### Method 3: Nhost CLI (Local or CI/CD)
If you have the Nhost CLI installed:
```bash
# Push schema migrations to remote Nhost project
nhost db push

# Or start a local Nhost environment
nhost up
```
The migration files are stored in [`nhost/migrations/default/1710000000000_init_printo_schema/up.sql`](./migrations/default/1710000000000_init_printo_schema/up.sql).

---

## 💻 Frontend Integration (Customer & Shop Portals)

Both portal applications include ready-to-use TypeScript interfaces and GraphQL query helpers:

- **Type definitions**:
  - `customer/src/types/database.ts`
  - `shops/src/types/database.ts`
- **GraphQL Helpers**:
  - `customer/src/services/nhostDb.ts` (`fetchShops`, `fetchUserProfile`, `fetchCustomerOrders`, `createPrintOrder`)
  - `shops/src/services/nhostDb.ts` (`fetchShopByOwner`, `fetchShopOrders`, `updateOrderStatus`)


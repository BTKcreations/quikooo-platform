# QUIKOOO Production Database Architecture & Operations Guide
**PostgreSQL + PostGIS Schema, Managed Provisioning, Mock Removal & Production Launch Checklist** | Version 1.0.0 | October 2026

---

## 1. Executive Summary & Source of Truth

The QUIKOOO Hyperlocal Commerce Platform operates on an authoritative **PostgreSQL 14+** engine equipped with the **PostGIS** spatial extension and double-entry bookkeeping ledgers. Silent mock fallbacks have been eliminated across all frontend portal clients: on any backend communication failure, real errors are thrown and surfaced to users via UI toasts.

To support resilient edge operations under intermittent connectivity, two explicit queues are preserved and labeled as `OFFLINE-QUEUE`:
1. **Customer Cart Offline Outbox** (`localStorage` backed) with automatic network resynchronization.
2. **Driver GPS Memory Cache** (buffered telemetry coordinates for dead-zone route tracking).

---

## 2. Where Data Lives: Database Schema & Tables

All platform entities reside in normalized relational tables with UUIDv4 primary keys and `NUMERIC(12, 2)` monetary precision.

| Table Name | Primary Responsibility | Key Columns & Indexes |
|---|---|---|
| `system_config` | Dynamic pricing constants, cutoff rules, GST rates | `config_key` (UNIQUE), `config_value`, `description` |
| `users` | Unified authentication, passwords, roles, contacts | `id` (UUID), `phone` (UNIQUE), `email` (UNIQUE), `role` (`user_role_enum`), `metadata` (JSONB) |
| `zones` | Operational territory polygons and delivery boundaries | `id`, `code` (UNIQUE), `zone_type` (`URBAN`, `SUB_URBAN`, `RURAL`), `center_latitude`, `center_longitude`, `radius_km` |
| `agents` | Local franchise managers & commission splits | `id`, `user_id` (FK), `zone_id` (FK), `agent_code` (UNIQUE), `commission_share_percent` (60.00%) |
| `customers` | Customer profiles and referral links | `id`, `user_id` (FK), `default_zone_id` (FK), `referral_code` |
| `customer_addresses` | Geocoded delivery destinations | `id`, `customer_id` (FK), `zone_id` (FK), `latitude`, `longitude`, `is_default` |
| `vendor_categories` | Store catalog taxonomy (Restaurant, Grocery, etc.) | `id`, `slug` (UNIQUE), `name`, `is_active` |
| `vendors` | Store outlets, geofences, commission snapshots | `id`, `user_id` (FK), `zone_id` (FK), `latitude`, `longitude`, `menu_adjustment_percent` (5%), `commission_percent` (10%) |
| `vendor_products` | Store products, original wholesale & menu prices | `id`, `vendor_id` (FK), `original_price`, `customer_menu_price` (original + 5%), `is_available` |
| `delivery_partners` | Fleet couriers, vehicles, payout tracking | `id`, `user_id` (FK), `zone_id` (FK), `payout_per_delivery` (₹25.00), `is_online` |
| `orders` | Immutable order contracts with financial snapshots | `id`, `order_number` (UNIQUE), `vendor_id`, `customer_id`, `zone_id`, `total_amount` (₹135 for ₹100 base), `status` |
| `order_items` | Order item snapshots | `id`, `order_id` (FK), `product_id` (FK), `original_unit_price`, `customer_menu_price`, `quantity` |
| `order_status_history` | Audit trail of lifecycle transitions | `id`, `order_id` (FK), `from_status`, `to_status`, `changed_by` (FK), `created_at` |
| `payments` | Gateway charges, transaction references | `id`, `order_id` (FK), `payment_gateway_ref`, `amount`, `status`, `gateway_response` (JSONB) |
| `refunds` | Payment reversals and cancellations | `id`, `order_id` (FK), `payment_id` (FK), `amount`, `status`, `gateway_refund_ref` |
| `delivery_assignments`| Courier dispatch offers and acceptances | `id`, `order_id` (FK), `delivery_partner_id` (FK), `status`, `payout_amount` (₹25.00) |
| `delivery_tracking` | GPS breadcrumbs during active delivery | `id`, `delivery_assignment_id` (FK), `latitude`, `longitude`, `speed`, `recorded_at` |
| `financial_ledger` | Double-entry accounting ledger (DEBIT == CREDIT) | `id`, `order_id` (FK), `account`, `entry_type` (`DEBIT`/`CREDIT`), `amount`, `entity_type` |
| `settlements` | Vendor, Agent, and Driver disbursements | `id`, `settlement_type`, `recipient_id`, `net_payout`, `status` (`PENDING`/`PAID`), `transaction_ref` |
| `support_tickets` | Issue tracking & conflict resolution | `id`, `user_id` (FK), `order_id` (FK), `subject`, `priority`, `status` |
| `notifications` | In-app alerts and webhook dispatches | `id`, `user_id` (FK), `title`, `body`, `channel`, `is_read` |
| `audit_logs` | Administrative and configuration changes | `id`, `user_id` (FK), `action`, `resource_type`, `changes` (JSONB), `ip_address` |

---

## 3. Managed Database Provisioning (Supabase, Neon, AWS RDS)

### 3.1 Supabase Provisioning
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Database** -> **Extensions**.
3. Search for and enable **`postgis`**, **`pgcrypto`**, and **`uuid-ossp`**.
4. Retrieve your connection string from **Project Settings** -> **Database** -> **Connection string** (URI mode with pooling on port 6543 or direct on port 5432).
5. Set `DATABASE_URL` in your production environment.

### 3.2 Neon Provisioning
1. Create a project at [neon.tech](https://neon.tech).
2. In the Neon SQL Console, execute:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   CREATE EXTENSION IF NOT EXISTS "postgis";
   ```
3. Copy the pooled connection string (`postgres://...sslmode=require`) and assign to `DATABASE_URL`.

### 3.3 AWS RDS / Aurora PostgreSQL
1. Create a PostgreSQL 14+ instance.
2. In the DB parameter group, ensure:
   ```
   shared_preload_libraries = 'postgis'
   ```
3. Connect as the master user and enable the extensions:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   CREATE EXTENSION IF NOT EXISTS "postgis";
   ```
4. Configure RDS security group to permit incoming traffic from your backend ECS/EKS/EC2 cluster on port 5432.

---

## 4. Production Environment Configuration (`backend/.env`)

| Variable Name | Required | Default / Example Value | Description |
|---|:---:|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/quikooo_db?sslmode=require` | Primary PostgreSQL connection URI |
| `REQUIRE_DB` | **Yes** | `true` | When `true`, server exits immediately (code 1) on DB connection failure |
| `PORT` | No | `5000` | Express server HTTP listen port |
| `NODE_ENV` | **Yes** | `production` | Environment mode (`production`, `development`, `test`) |
| `JWT_SECRET` | **Yes** | `[cryptographically random 64-char string]` | Secret key used for signing authentication tokens |
| `JWT_EXPIRES_IN` | No | `7d` | Authentication token validity duration |
| `RESTAURANT_MENU_ADJUSTMENT_PERCENT` | **Yes** | `5` | Restaurant menu markup added to wholesale price (5%) |
| `RESTAURANT_PLATFORM_COMMISSION_PERCENT`| **Yes** | `10` | Platform commission charged strictly on original price (10%) |
| `CUSTOMER_PLATFORM_FEE` | **Yes** | `5.00` | Fixed customer platform fee per order in INR (₹5.00) |
| `CUSTOMER_DELIVERY_FEE` | **Yes** | `25.00` | Fixed customer delivery fee per order in INR (₹25.00) |
| `DELIVERY_PARTNER_PAYOUT` | **Yes** | `25.00` | Driver partner delivery compensation in INR (100% pass-through) |
| `AGENT_SHARE_PERCENT` | **Yes** | `60` | Zone agent franchise share of net platform margin (60%) |
| `QUIKOOO_SHARE_PERCENT` | **Yes** | `40` | Platform HQ revenue share of net platform margin (40%) |
| `TAX_RATE` | **Yes** | `0.18` | Statutory GST rate on platform gross margin (18%) |
| `DEFAULT_RADIUS_KM` | **Yes** | `2` | Hyperlocal geofence discovery radius in kilometers |
| `RURAL_CUTOFF` | **Yes** | `21:00` | Evening order cutoff time for rural morning dispatch |
| `RURAL_DELIVERY_WINDOW_START` | **Yes** | `05:00` | Rural morning delivery dispatch window start time |
| `RURAL_DELIVERY_WINDOW_END` | **Yes** | `08:00` | Rural morning delivery dispatch window end time |
| `TIMEZONE` | **Yes** | `Asia/Kolkata` | Operational timezone for scheduling and cutoff evaluation |

---

## 5. Migration & Seed Operations

### 5.1 Run Migrations
Applies all pending SQL migration files in `backend/migrations/` sequentially, checks extensions, and verifies table schemas:
```bash
# From workspace root
npm run db:migrate

# Or directly in backend
npm run db:migrate --workspace=backend
```
*Script source: `backend/scripts/migrate.js`*

### 5.2 Seed Production Baseline
Seeds canonical `system_config` parameters, creates one initial demo zone (Bengaluru Indiranagar, 2km URBAN, `Asia/Kolkata`), and registers the SUPER_ADMIN setup guideline:
```bash
# From workspace root
npm run db:seed

# Or directly in backend
npm run db:seed --workspace=backend
```
*Script source: `backend/scripts/seed.js`*

> [!IMPORTANT]
> **Production Hygiene Rule:** The seed script NEVER inserts fake merchants or simulated customer orders. Initial administrators must be provisioned through secure invitation links or command-line bootstrap scripts.

---

## 6. Elimination of Silent Mocks & Preserved Offline Queues

### 6.1 Silent Mock Removal Across Frontends
In earlier development iterations, client API fetch wrappers silently caught network exceptions and substituted hardcoded mock data. In production:
- **`apps/customer-web/src/api.js`**: Throws real `Error` instances and dispatches `quikooo:toast` events on any HTTP or network error. The default `'mock-address-1'` has been deleted; valid `vendorId` and `addressId` are strictly required. The demo login button on `LoginPage.jsx` is clearly labeled `[DEMO]`.
- **`apps/agent-app/src/api.js`**: `getAgentAnalytics`, `getAgentPayouts`, and `getZones` execute real backend API queries and propagate errors without returning simulated fallback records.
- **`apps/admin-console/src/api.js`**: `fetchOverviewKPIs`, `fetchZones`, `fetchLedgerEntries`, and `fetchSettlements` fail loudly with toasts if the backend API is unreachable. The fallback identifier `'ord-mock-100'` was deleted from `calculateOrderLedger`.
- **`apps/driver-fleet/src/api.js`**: Dispatch assignments, task acceptances, and OTP handshakes require backend confirmation and reject failures with explicit UI alerts.

### 6.2 Preserved Explicit Offline Queues (`OFFLINE-QUEUE`)
To prevent data loss in rural or spotty connectivity areas, two explicit offline buffers are preserved:
1. **Customer Cart Offline Outbox (`quikooo_cart_offline_outbox` in `localStorage`)**:
   - If a customer places an order while connection drops, the order payload is enqueued into `OFFLINE-QUEUE`.
   - The user is notified with an explicit message: *"OFFLINE-QUEUE: Order queued in offline outbox for automatic resync."*
   - When the browser fires `window.addEventListener('online')`, `resyncCartOfflineOutbox()` automatically submits pending orders.
2. **Driver GPS Memory Cache (`driverGpsOfflineQueue`)**:
   - When couriers drive through cellular dead zones, location pings (`updateDriverLocation`) are captured in an in-memory queue labeled `OFFLINE-QUEUE`.
   - Buffered breadcrumbs are replayed once cellular reception is restored, guaranteeing complete audit trails.

---

## 7. Production Launch Checklist

Before flipping traffic to the production cluster, verify every item:

- [ ] **Database Connectivity:** PostgreSQL 14+ database is reachable with SSL enabled.
- [ ] **PostGIS Extension:** Verified via `/health` returning `{ db: 'live', postgis: true }`.
- [ ] **Fail-Fast Flag:** `REQUIRE_DB=true` set in production environment variables to fail fast on startup if the database is unreachable.
- [ ] **Migrations & Seed:** Ran `npm run db:migrate` and `npm run db:seed`.
- [ ] **Super Admin Provisioning:** Created the primary `SUPER_ADMIN` user with a unique, high-entropy password.
- [ ] **Payment Gateway Webhook:** Configured webhook URL in payment gateway dashboard pointing to `POST /api/v1/payments/webhook`, set `PAYMENT_WEBHOOK_SECRET`, and verified HMAC-SHA256 signature enforcement.
- [ ] **Geocoding & Nominatim Compliance:**
  - Nominatim requests include compliant `User-Agent: QuikoooPlatform/1.0.0 (ops@quikooo.com)`.
  - Client-side reverse geocoding is rate-limited and cached.
  - *Optional Google Swap:* If scale exceeds 1 request/second, configure `GOOGLE_MAPS_API_KEY` to route requests to the Google Maps Geocoding API.
- [ ] **Automated Backups & Recovery:**
  - Enabled automated daily snapshots with 30-day retention.
  - Enabled continuous Write-Ahead Log (WAL) archiving for Point-in-Time Recovery (PITR).
  - Tested database restore process into an isolated staging environment.
- [ ] **Test Certification:** Monorepo test suite passes 100% (`npm test`).

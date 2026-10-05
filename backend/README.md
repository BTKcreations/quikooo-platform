# QUIKOOO Hyperlocal Commerce Platform - Backend (Phase 1 Foundation)

Node.js + Express REST API (`/api/v1`) with PostgreSQL + PostGIS database migrations, Socket.IO real-time pipeline placeholder, and Jest test suite.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Tests
```bash
npm test
```
Runs 23+ unit and integration tests across pricing math, zone boundaries, order state machine, and API endpoints.

### 4. Start Server
```bash
npm start
```
*Note: The server is designed to boot gracefully even without a live PostgreSQL database instance (operating in mock-ready offline mode).*

---

## 💰 Official Phase 1 Pricing & Revenue Model

> **IMPORTANT**: The legacy 12% commission model is deprecated. QUIKOOO Phase 1 strictly implements the **Official 5% Adjustment + 10% Commission Model**.

### 1. Restaurant Pricing Engine (`PricingService.js`)
For a food item with **Original Price = ₹100.00**:
* **Menu Adjustment (5%)**: `₹100.00 * 0.05 = ₹5.00`
* **Customer Menu Price (Subtotal)**: `₹100.00 + ₹5.00 = ₹105.00` *(Customer sees and pays this price per item)*
* **Platform Commission (10%)**: `₹100.00 * 0.10 = ₹10.00` *(Calculated on **ORIGINAL** price only, NEVER on ₹105.00)*
* **Vendor Settlement**: `₹100.00 - ₹10.00 = ₹90.00`
* **QUIKOOO Gross Revenue**: `₹5.00 (Markup) + ₹10.00 (Commission) = ₹15.00`

### 2. Order Totals Calculation
* **Food Subtotal**: `₹105.00`
* **Customer Platform Fee**: `₹5.00`
* **Customer Delivery Fee**: `₹25.00`
* **Customer Total Payable**: `₹105.00 + ₹5.00 + ₹25.00 = ₹135.00`
* **Delivery Partner Payout**: `₹25.00`

### 3. Tax & Agent Revenue Share (`FinancialLedgerService.js`)
* **Tax Rate**: Configurable (e.g. 18% GST via `TaxService.js`)
* **Gross Platform Revenue**: e.g., `₹17.00`
* **GST / Tax (18%)**: `₹17.00 * 0.18 = ₹3.06`
* **Net Adjusted Revenue Pool**: `₹17.00 - ₹3.06 = ₹13.94`
* **Agent Share (60%)**: `₹13.94 * 0.60 = ₹8.36`
* **QUIKOOO Platform Share (40%)**: `₹13.94 * 0.40 = ₹5.58`

---

## 🗺️ Zone Management & Rural Logistics (`ZoneService.js`)

* **Zone Types**: `URBAN`, `SUB_URBAN`, `RURAL`.
* **Default Discovery Radius**: `2.0 km` (Calculated using Haversine formula).
* **PostGIS ST_DWithin Reference**:
  ```sql
  SELECT id, name, location
  FROM vendors
  WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
    2000 -- 2km in meters
  );
  ```
* **Rural Cutoff & Batching**:
  * **Daily Cutoff Time**: `21:00 Asia/Kolkata`.
  * Orders placed before `21:00` (e.g., `20:30`) are eligible for next-day dispatch.
  * Orders placed at or after `21:00` (e.g., `21:00`, `21:01`) are closed for the next morning batch.
  * **Morning Dispatch Window**: `05:00 - 08:00 Asia/Kolkata`.

---

## 🔄 Order Lifecycle & State Machine (`OrderService.js`)

Strict state transitions with validation:

```
[ORDER_PLACED] ──> [PAYMENT_CONFIRMED] ──> [VENDOR_ACCEPTED] ──> [PREPARING] ──> [READY_FOR_PICKUP]
       │                    │                                                           │
       │                    ▼ (Rural)                                                   ▼
       │         [SCHEDULED_FOR_NEXT_DAY]                                      [DELIVERY_ASSIGNED]
       │                    │                                                           │
       │                    ▼                                                           ▼
       │       [READY_FOR_MORNING_DISPATCH]                                    [DELIVERY_ACCEPTED]
       │                    │                                                           │
       │                    └───────────────────────────────────────────────────────────┤
       │                                                                                ▼
       │                                                                           [PICKED_UP]
       │                                                                                │
       │                                                                                ▼
       │                                                                       [OUT_FOR_DELIVERY]
       │                                                                                │
       │                                                                                ▼
       ▼ (Cancellation)                                                            [DELIVERED]
  [CANCELLED] ──> [REFUND_INITIATED] ──> [REFUNDED]
```

### Immutable Snapshots
At order creation, financial and operational metrics are permanently snapshotted:
`zone_id`, `agent_id`, `commission_percent`, `menu_adjustment_percent`, `platform_fee`, `delivery_fee`, `subtotal`, `total_amount`, `vendor_payout`, `tax_rate`, `tax_amount`, `agent_commission_share`, `quikooo_revenue_share`.

---

## 🔒 Security & Role-Based Access Control (RBAC)

Supported Roles:
1. `SUPER_ADMIN`
2. `ADMIN`
3. `AGENT`
4. `VENDOR`
5. `DELIVERY_PARTNER`
6. `CUSTOMER`

### Agent Boundary Restrictions:
* Local Zone Agents **cannot** edit platform commission rates.
* Local Zone Agents **cannot** write to or modify the financial ledger.
* Local Zone Agents **cannot** view or modify zones or data outside their assigned zone.

---

## 📡 Key API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | System health and connectivity | Public |
| `POST` | `/api/v1/orders/calculate` | Server-calculated authoritative cart pricing | Public / Customer |
| `POST` | `/api/v1/orders` | Create an order with snapshot | Customer |
| `GET` | `/api/v1/orders/:id` | Fetch order details | Authenticated |
| `POST` | `/api/v1/orders/:id/transition` | Execute order state machine transition | Authenticated |
| `POST` | `/api/v1/auth/login` | Phone / password authentication | Public |
| `POST` | `/api/v1/auth/register` | User registration | Public |
| `GET` | `/api/v1/zones` | List delivery zones | Public |
| `POST` | `/api/v1/zones/check-eligibility` | Check rural 21:00 cutoff eligibility | Public |
| `GET` | `/api/v1/finance/ledger` | Double-entry bookkeeping ledger | Admin / Agent (read-only) |
| `GET` | `/api/v1/finance/summary` | Financial revenue & tax summary | Admin / Agent |
| `GET` | `/api/v1/reports/sales` | Aggregated sales metrics | Admin |

# QUIKOOO Architecture, Monorepo & API Reference
**System Topology, Domain Modules, Key Endpoints & Realtime Multiplexing** | Version 2.0.0 | October 2026

---

### 1. Monorepo Directory Tree
QUIKOOO is architected as an integrated npm workspace monorepo uniting all services, interfaces, and shared packages:

```
quikooo-platform/
├── apps/
│   ├── admin-console/        # HQ operations, zones, finance, audits (Vite PWA, Port 3004)
│   ├── agent-app/            # Franchise territory & rural batch manager (Vite PWA, Port 3003)
│   ├── customer-web/         # Consumer marketplace & live tracking (Vite PWA, Port 3000)
│   ├── driver-fleet/         # Rider cockpit, duty shifts, 2-step OTP (Vite PWA, Port 3002)
│   └── merchant-studio/      # Kitchen POS, menu stock, settlements (Vite PWA, Port 3001)
├── backend/                  # REST API & Socket.IO WebSocket server (Port 5000/5001)
│   └── src/
│       ├── db/               # PostgreSQL 14 + PostGIS connection pool & spatial queries
│       ├── middleware/       # JWT auth, role RBAC, agent guardrails, audit logging
│       ├── modules/          # 14 modular business domain controllers & services
│       └── realtime.js       # Low-latency Socket.IO room routing and GPS telemetry
├── frontend/
│   └── design-system/        # Shared UI components, theme tokens (@quikooo/design-system)
├── docs/                     # Executive board documentation, plans & workflows
└── ux/                       # UI/UX design specifications, tokens & brand assets
```

---

### 2. Technology Stack

| Layer | Technologies Selected | Strategic Operational Justification |
|---|---|---|
| **Backend API** | Node.js 18+ LTS, Express 4.x | Non-blocking high-throughput I/O suited for concurrent order processing |
| **Spatial Database** | PostgreSQL 14 + PostGIS 3.x | Sub-millisecond `ST_DWithin` spatial indexing for strict 2.0 km geofencing |
| **Realtime Pipeline** | Socket.IO 4.x WebSocket | Bi-directional, low-overhead GPS coordinate push and POS audio chimes |
| **Frontend Clients** | React 18, Vite 5, PWA Workbox | Instant initial paint (<1.2s), app-like offline handling, single codebase |
| **Security & Auth** | Helmet, JWT (HMAC-SHA256), Webhook HMAC | Zero-trust authentication, defense-in-depth against payload spoofing |

---

### 3. Core Backend Domain Modules (14 Modules)
The backend decouples business concerns into 14 domain modules located in `backend/src/modules/`:

| Module | Core Responsibility |
|---|---|
| `auth` | JWT issuance, credential hashing (bcrypt), token validation, profile retrieval |
| `users` | Multi-role user accounts, verified addresses, contact telephone verification |
| `zones` | PostGIS spatial boundaries, operating tier classification (Urban, Sub-Urban, Rural) |
| `vendors` | Store profiles, operational operating hours, food prep buffer, KYC records |
| `products` | Merchant menu catalogs, item pricing baseline, stock on/off switches |
| `orders` | Single-vendor cart calculation (`/calculate`), order lifecycle state transitions |
| `payments` | Gateway intent creation, signature verification, HMAC webhook intake, refunds |
| `finance` | Double-entry ledger engine, debit/credit balancing, automated 60/40 profit pool split |
| `delivery` | Algorithmic driver dispatch, 2-step OTP handshake, real-time GPS coordinate stream |
| `agents` | Franchise territory metrics, KYC approval queue, rural batch aggregations |
| `settlements` | Idempotent merchant/driver/agent payout runs, no-edit-after-paid immutable ledger |
| `admin` | Global configuration parameters, system health probes, immutable audit trail |
| `notifications` | In-app alerts, driver dispatch announcements, order status webhooks |
| `reports` | Daily GMV, platform revenue reports, rural morning batch delivery manifests |

---

### 4. Key Authoritative API Endpoints

| Method | Endpoint Path | Primary Purpose | Authorized Roles |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate credentials; return JWT with role & zoneId | Public |
| `POST` | `/api/v1/auth/register` | Register new customer, merchant, or driver account | Public |
| `GET` | `/api/v1/auth/me` | Fetch active session profile, permissions & zone | Authenticated |
| `GET` | `/api/v1/zones` | List all operating zones with tier tags | Public / All |
| `POST` | `/api/v1/zones/check-eligibility` | Validate customer GPS coordinate against 2.0 km geofence | Public / All |
| `GET` | `/api/v1/vendors` | Retrieve open merchants filtered by zone or radius | Public / All |
| `POST` | `/api/v1/orders/calculate` | **Server-side cart math**: returns ₹105 subtotal, ₹5 fee, ₹25 delivery | Public / Customer |
| `POST` | `/api/v1/orders` | Create draft order linked to single vendor | `CUSTOMER` |
| `POST` | `/api/v1/orders/:id/transition` | Execute state machine step (e.g. `PREPARING` → `READY_FOR_PICKUP`) | `VENDOR`, `DRIVER`, `ADMIN` |
| `POST` | `/api/v1/payments/webhook` | **Gateway HMAC intake**: transitions order to `PAYMENT_CONFIRMED` | Gateway Signature |
| `POST` | `/api/v1/delivery/assign` | Algorithmic dispatch: pair ready order with nearest on-duty driver | `AGENT`, `ADMIN` |
| `POST` | `/api/v1/delivery/:id/location` | Ingest driver GPS coordinates (lat, lng, bearing, speed) | `DELIVERY_PARTNER` |
| `GET` | `/api/v1/delivery/:id/track` | Fetch latest telemetry and estimated delivery arrival time | Authenticated |
| `PATCH` | `/api/v1/delivery/status` | Submit pickup OTP or delivery OTP to step delivery state | `DELIVERY_PARTNER` |
| `GET` | `/api/v1/agents/:id/analytics` | Territory performance KPIs, order velocity, agent commission | `AGENT`, `ADMIN` |
| `GET` | `/api/v1/reports/sales` | Platform-wide financial reporting, GMV, and tax breakdown | `ADMIN`, `SUPER_ADMIN` |
| `PATCH` | `/api/v1/admin/config` | Update global settings; automatically writes to audit trail | `SUPER_ADMIN` |

---

### 5. Realtime Socket Rooms & Event Multiplexing
QUIKOOO utilizes room-based WebSocket multiplexing (`backend/src/realtime.js`) to isolate broadcast traffic:

```
[ Socket.IO Pipeline ]
       │
       ├── room: 'order:{id}'   ──> Emits 'order.status' and 'delivery.location' to Customer & Store
       ├── room: 'zone:{id}'    ──> Emits 'batch.update' and dispatch broadcasts to Zone Agents & Riders
       └── room: 'driver:{id}'  ──> Emits 1:1 direct task dispatches, OTP alerts, and route changes
```

---

### 6. Non-Negotiable Core Security Rules

```
+-----------------------------------------------------------------------------------+
|  SECURITY RULE 1: ZERO TRUST IN CLIENT PRICING                                    |
|  * The client NEVER transmits subtotal, tax, markup, or total amounts.            |
|  * The client submits ONLY productId and quantity array.                          |
|  * Backend orders.service recalculates all pricing from DB baseline catalogs.    |
+-----------------------------------------------------------------------------------+
|  SECURITY RULE 2: WEBHOOK-ONLY PAYMENT CONFIRMATION                               |
|  * Client applications CANNOT transition an order to PAYMENT_CONFIRMED.           |
|  * Transitions occur EXCLUSIVELY via POST /api/v1/payments/webhook.               |
|  * Webhook requires valid HMAC-SHA256 signature matching the gateway secret.      |
+-----------------------------------------------------------------------------------+
```

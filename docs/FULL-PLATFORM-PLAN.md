# QUIKOOO FULL PLATFORM BUILD PLAN
**Version:** 2.0.0  
**Status:** Approved Architecture & Phase 2 Kickoff Specification  
**Platform Target:** Hyperlocal Commerce & Delivery Ecosystem (Urban, Semi-Urban, Rural)  
**Workspace:** `/root/quikooo-platform`

---

## 1. Vision & MVP Theme Tokens

### 1.1 Platform Vision
QUIKOOO is an India-first hyperlocal quick-commerce and fresh meal delivery platform built to connect local merchants, customers, delivery partners, and local franchise agents across three distinct operating tiers:
1. **Urban Clusters:** 10–15 minute express delivery within a strict 2.0 km geofenced radius.
2. **Semi-Urban Clusters:** 15–25 minute standard delivery within a 2.0 km geofenced radius.
3. **Rural Clusters:** Daily aggregated scheduled deliveries with a strict **21:00 Asia/Kolkata cutoff** and next-morning **05:00 – 08:00 dispatch window**.

### 1.2 The Official Business Model Math (Single Source of Truth)
Every transaction across all portals and backend services strictly adheres to the official Phase 1 economic model:

| Parameter | Configuration Key | Rate / Value | Calculation Rule |
|---|---|---|---|
| **Restaurant Menu Markup** | `RESTAURANT_MENU_ADJUSTMENT_PERCENT` | `5.0%` | Added to vendor original listed price to yield customer menu price |
| **Platform Commission** | `RESTAURANT_PLATFORM_COMMISSION_PERCENT` | `10.0%` | Charged **strictly on original price** (never on marked-up price) |
| **Customer Platform Fee** | `CUSTOMER_PLATFORM_FEE` | `₹5.00` | Fixed convenience charge added to customer invoice |
| **Customer Delivery Fee** | `CUSTOMER_DELIVERY_FEE` | `₹25.00` | Fixed customer logistics fee |
| **Delivery Partner Payout** | `DELIVERY_PARTNER_PAYOUT` | `₹25.00` | 100% of delivery fee passed to delivery partner |
| **Vendor Settlement** | N/A | `Original - 10%` | Net payout credited to merchant |
| **Quikooo Gross Revenue** | N/A | `Markup (5%) + Comm (10%)` | Combined margin earned per order |
| **Agent Franchise Share** | `AGENT_SHARE_PERCENT` | `60.0%` | Allocated from net platform pool after GST |
| **Quikooo Retained Share**| `QUIKOOO_SHARE_PERCENT` | `40.0%` | Retained corporate revenue share after GST |

#### Canonical Math Example (Original Price = ₹100.00):
```
1. Original Listed Price:          ₹100.00
2. Menu Adjustment (+5%):          + ₹5.00
3. Customer Menu Price (Subtotal):  ₹105.00
4. Platform Commission (10% of 100):- ₹10.00 (calculated on ₹100, NOT ₹105)
5. Vendor Settlement:               ₹90.00 (₹100.00 - ₹10.00)
6. Platform Fee:                   + ₹5.00
7. Delivery Fee:                  + ₹25.00
8. Customer Total Payable:         ₹135.00 (₹105.00 subtotal + ₹5.00 platform + ₹25.00 delivery)
9. Delivery Partner Earnings:      ₹25.00
10. Quikooo Gross Margin:           ₹15.00 (₹5.00 markup + ₹10.00 commission)
11. GST on Margin (18% on ₹17.00*):  ₹3.06 -> Net Revenue Pool = ₹13.94
12. Agent 60% Share:                ₹8.36
13. Quikooo 40% Share:              ₹5.58
```
*\*Note: Base margin calculation per TaxService specifications.*

---

### 1.3 MVP Theme Tokens & Asset Directory
The live MVP at `quikooo.com` establishes the visual identity, UI tokens, and PWA assets. All 5 portals must strictly adhere to these design primitives.

#### Color Tokens
```css
/* Core Brand Colors */
--color-brand-primary:      #059669; /* Tailwind emerald-600 */
--color-brand-hover:        #047857; /* Tailwind emerald-700 */
--color-brand-active:       #065f46; /* Tailwind emerald-800 */
--color-brand-dark:         #064e3b; /* Tailwind emerald-900 */
--color-brand-deepest:      #022c22; /* Tailwind emerald-950 */

/* Background & Canvas */
--color-canvas-bg:          #FBFBF9; /* Warm neutral cream/ivory */
--color-surface-card:       #FFFFFF; /* Pure white card surface */
--color-surface-subtle:     #F3F4F0; /* Soft border/separator */

/* Accent & Tints */
--color-brand-light-50:     #ecfdf5; /* Emerald 50 - Alert / highlight backgrounds */
--color-brand-light-100:    #d1fae5; /* Emerald 100 - Badges & tag backgrounds */
--color-brand-light-200:    #a7f3d0; /* Emerald 200 - Borders */

/* Typography & States */
--color-text-primary:       #111827; /* Gray 900 */
--color-text-secondary:     #4B5563; /* Gray 600 */
--color-text-muted:         #9CA3AF; /* Gray 400 */
--color-status-success:     #10B981; /* Emerald 500 */
--color-status-warning:     #F59E0B; /* Amber 500 */
--color-status-danger:      #EF4444; /* Red 500 */
```

#### Typography
* **Display / Brand / Headings:** `'Outfit', sans-serif` (`weights: 500, 600, 700, 800`)
* **Body / Form Controls / Data / UI:** `'Plus Jakarta Sans', sans-serif` (`weights: 400, 500, 600, 700`)
* **Google Fonts Import:**
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```

#### PWA Asset Directory (`ux/theme/`)
All frontend apps link directly to the validated assets located in `ux/theme/`:
* `ux/theme/manifest.json`: Web app manifest configured with `#059669` theme and `#FBFBF9` background.
* `ux/theme/favicon.ico`: 32x32 multi-resolution browser icon.
* `ux/theme/apple-touch-icon.png`: 180x180 iOS home-screen icon.
* `ux/theme/pwa-192x192.png`: Android standard launcher icon.
* `ux/theme/pwa-512x512.png`: High-resolution splash & launcher icon.
* `ux/theme/pwa-maskable-512x512.png`: Adaptive maskable Android icon.

#### PWA Architecture Strategy
* **Installability:** Every portal is a standalone Progressive Web App with service worker caching.
* **Display Mode:** `standalone` with full-screen feel, hiding browser navigation bars.
* **Caching Strategy:**
  * Static Shell & Assets: Stale-While-Revalidate.
  * API Requests (`/api/v1/*`): Network-first with IndexedDB cache fallback for offline resilience.
  * Critical Real-Time Data (Orders, Driver GPS): Network-only with instant retry and WebSocket reconnect.

---

## 2. Monorepo Target Structure

The platform uses an npm workspaces monorepo structure separating the backend foundation, shared design system, and the 5 portal applications.

```
/root/quikooo-platform/
├── package.json                         # Monorepo root workspace configuration
├── package-lock.json
├── .gitignore
├── README.md
├── docs/
│   └── FULL-PLATFORM-PLAN.md            # This specification document
├── ux/
│   └── theme/                           # Master PWA icons & manifest assets
│       ├── MVP-INVENTORY.md
│       ├── manifest.json
│       ├── favicon.ico
│       ├── apple-touch-icon.png
│       ├── pwa-192x192.png
│       ├── pwa-512x512.png
│       └── pwa-maskable-512x512.png
│
├── backend/                             # [PHASE 1 COMPLETE] Express /api/v1 API
│   ├── .env.example
│   ├── package.json
│   ├── README.md
│   ├── migrations/
│   │   └── 001_init.sql                 # PostgreSQL + PostGIS schema & seeds
│   ├── src/
│   │   ├── index.js                     # Express server & Socket.IO initialization
│   │   ├── config.js                    # Official business parameters
│   │   ├── db.js                        # pg Pool with offline graceful fallback
│   │   ├── middleware/
│   │   │   ├── auth.js                  # JWT & RBAC (6 roles + Agent guard)
│   │   │   ├── validate.js              # Joi validation wrapper
│   │   │   └── error.js                 # Centralized error handler
│   │   ├── services/
│   │   │   ├── PricingService.js        # 5% markup + 10% commission engine
│   │   │   ├── ZoneService.js           # Haversine 2km radius + 21:00 rural cutoff
│   │   │   ├── OrderService.js          # Order state machine & immutable snapshot
│   │   │   ├── TaxService.js            # GST tax calculation
│   │   │   └── FinancialLedgerService.js# Double-entry ledger (60/40 revenue split)
│   │   └── modules/                     # 14 modular controllers & services
│   │       ├── auth/
│   │       ├── users/
│   │       ├── zones/
│   │       ├── vendors/
│   │       ├── products/
│   │       ├── orders/                  # POST /api/v1/orders/calculate
│   │       ├── payments/
│   │       ├── finance/
│   │       ├── delivery/
│   │       ├── agents/
│   │       ├── settlements/
│   │       ├── admin/
│   │       ├── notifications/
│   │       └── reports/
│   └── tests/
│       ├── pricing.test.js              # 23 Jest tests passing
│       ├── zone.test.js
│       └── order.test.js
│
├── frontend/
│   └── design-system/                   # Shared UI primitives, Tailwind preset & hooks
│       ├── package.json
│       ├── index.js                     # Entry point exporting components & hooks
│       ├── tailwind.preset.js           # Shared Tailwind config (#059669, #FBFBF9)
│       ├── styles/
│       │   └── globals.css              # Font definitions & utility classes
│       ├── components/
│       │   ├── Button.jsx
│       │   ├── Input.jsx
│       │   ├── Modal.jsx
│       │   ├── Badge.jsx
│       │   ├── CurrencyDisplay.jsx      # Canonical ₹ formatting
│       │   ├── CartDrawer.jsx           # Single-vendor cart drawer
│       │   ├── OrderStatusTimeline.jsx  # State machine progress bar
│       │   └── PwaInstallBanner.jsx     # PWA prompt banner
│       └── hooks/
│           ├── useAuth.js               # JWT & user session management
│           ├── useCart.js               # Single-vendor cart state
│           ├── useLocation.js           # Geolocation & 2km zone matching
│           └── useSocket.js             # Socket.IO connection manager
│
└── apps/
    ├── customer-web/                    # [PHASE 2 TARGET] Customer PWA
    │   ├── package.json
    │   ├── vite.config.js               # vite-plugin-pwa configuration
    │   ├── index.html
    │   ├── public/                      # Symlinked or copied from ux/theme/
    │   └── src/
    │       ├── App.jsx
    │       ├── routes/
    │       │   ├── CustomerHome.jsx     # /customer - Store & category discovery
    │       │   ├── StoreMenu.jsx        # /store/:id - Restaurant menu (+5% price)
    │       │   ├── CartCheckout.jsx     # /checkout - Single vendor cart + /calculate
    │       │   └── OrderTracker.jsx     # /orders/:id - Live status & tracking
    │       └── api/
    │           └── client.js            # Axios client pointing to /api/v1
    │
    ├── merchant-studio/                 # [PHASE 3] Vendor Kitchen & Store POS
    │   ├── package.json
    │   ├── vite.config.js
    │   ├── index.html
    │   ├── public/
    │   └── src/
    │       ├── routes/
    │       │   ├── MerchantDashboard.jsx# /merchant - Live order terminal + audio
    │       │   ├── MenuManager.jsx      # /merchant/menu - Catalog & pricing preview
    │       │   └── MerchantPayout.jsx   # /merchant/payout - Net settlement (90%)
    │       └── components/
    │           └── IncomingOrderModal.jsx
    │
    ├── driver-fleet/                    # [PHASE 3] Delivery Partner Cockpit PWA
    │   ├── package.json
    │   ├── vite.config.js
    │   ├── index.html
    │   ├── public/
    │   └── src/
    │       ├── routes/
    │       │   ├── DriverDashboard.jsx  # /driver - Duty toggle & available tasks
    │       │   ├── ActiveTask.jsx       # /driver/tasks - Pickup/Delivery + OTP
    │       │   ├── DriverDuty.jsx       # /driver/duty - Online status & shifts
    │       │   └── DriverPayout.jsx     # /driver/payout - ₹25 per delivery tally
    │       └── services/
    │           └── gpsTracker.js        # High-accuracy GPS position broadcaster
    │
    ├── agent-app/                       # [PHASE 4 - NEW BUILD] Local Zone Agent Portal
    │   ├── package.json
    │   ├── vite.config.js
    │   ├── index.html
    │   ├── public/
    │   └── src/
    │       ├── routes/
    │       │   ├── AgentDashboard.jsx   # /agent - Zone GMV & 60% revenue share
    │       │   ├── VendorOnboarding.jsx # /agent/vendors - KYC verification
    │       │   ├── DriverRoster.jsx     # /agent/drivers - Rider approvals
    │       │   ├── RuralBatchOps.jsx    # /agent/rural-batches - 21:00 cutoff & dispatch
    │       │   └── AgentSettlement.jsx  # /agent/settlements - Franchise bank payouts
    │       └── components/
    │           └── RevenueSplitCard.jsx # 60% Agent vs 40% Platform breakdown
    │
    └── admin-console/                   # [PHASE 6] Super Admin & Operations Backoffice
        ├── package.json
        ├── vite.config.js
        ├── index.html
        ├── public/
        └── src/
            ├── routes/
            │   ├── AdminOverview.jsx    # /admin/overview - Real-time metrics
            │   ├── UserManager.jsx      # /admin/users - RBAC & staff controls
            │   ├── ZoneGeofencing.jsx   # /admin/zones - Urban/Sub-Urban/Rural polygons
            │   ├── LedgerExplorer.jsx   # /admin/audit - Double-entry ledger audit
            │   └── SystemConfig.jsx     # /admin/config - Dynamic fee/markup editor
            └── api/
                └── adminApi.js
```

---

## 3. Portal-by-Portal Feature Matrix & MVP Route Reuse

| Portal | Target App Directory | Live MVP Routes Reused | Backend Modules Mapped | Core Features & Business Logic |
|---|---|---|---|---|
| **Customer App** | `apps/customer-web` | `/customer`<br>`/store`<br>`/orders`<br>`/login` | `zones`<br>`vendors`<br>`products`<br>`orders`<br>`payments`<br>`delivery` | • Geo-detection & 2km vendor filtering.<br>• Single-Vendor Cart validation.<br>• Real-time price breakdown via `POST /api/v1/orders/calculate`.<br>• Menu displays customer price (+5% markup).<br>• Razorpay & UPI checkout.<br>• Live order tracking with status updates. |
| **Merchant Studio** | `apps/merchant-studio` | `/merchant`<br>`/merchant/payout`<br>`/login` | `vendors`<br>`products`<br>`orders`<br>`settlements` | • Incoming order terminal with audio chime.<br>• State transitions (`VENDOR_ACCEPTED`, `PREPARING`, `READY_FOR_PICKUP`).<br>• Menu catalog: Enter original price ₹100, displays customer price ₹105.<br>• Settlement view: Original ₹100 - 10% commission = ₹90 net settlement. |
| **Driver Fleet** | `apps/driver-fleet` | `/driver`<br>`/driver/tasks`<br>`/driver/duty`<br>`/driver/payout`<br>`/login` | `delivery`<br>`orders`<br>`settlements` | • Duty toggle (`is_online`).<br>• Auto-assignment offers within 2km radius.<br>• Turn-by-turn navigation redirect.<br>• Two-step OTP verification (Pickup from vendor, Delivery to customer).<br>• Flat ₹25.00 credited per delivered order.<br>• Daily payout settlement requests. |
| **Agent App** *(NEW)* | `apps/agent-app` | *New Routes:*<br>`/agent`<br>`/agent/vendors`<br>`/agent/drivers`<br>`/agent/rural-batches`<br>`/agent/settlements` | `agents`<br>`zones`<br>`vendors`<br>`delivery`<br>`settlements`<br>`finance`<br>`reports` | • Territory performance dashboard (Urban/Rural GMV, active stores).<br>• Local merchant KYC & store profile validation.<br>• Local driver onboarding & document verification.<br>• Rural 21:00 cutoff monitor & morning 05:00-08:00 dispatch batch manifests.<br>• 60% franchise net commission ledger and withdrawal ledger. |
| **Admin Console** | `apps/admin-console` | `/admin`<br>`/admin/overview`<br>`/admin/users`<br>`/admin/audit`<br>`/login` | `admin`<br>`users`<br>`zones`<br>`finance`<br>`settlements`<br>`reports` | • Platform-wide GMV, active deliveries, and revenue overview.<br>• User directory with RBAC assignment.<br>• Zone management (URBAN, SUB_URBAN, RURAL boundary configuration).<br>• System config editor (`RESTAURANT_MENU_ADJUSTMENT_PERCENT`, commission, fees).<br>• Double-entry financial ledger auditing and tax reconciliation. |

---

## 4. Gap Analysis (MVP vs. Manual Specifications)

A thorough comparison between the current frontend MVP (routes found in `ux/theme/MVP-INVENTORY.md`), the backend Phase 1 foundation, and the product requirements manual highlights five critical operational gaps:

### Gap 1: Agent Portal Completely Missing
* **Current State:** No Agent App exists in the codebase or in the live MVP routes.
* **Manual Requirement:** The platform requires an independent portal for Local Zone Agents (franchisees) who manage local merchant acquisition, driver recruitment, rural aggregation, and receive **60% of the platform's net revenue pool**.
* **Remediation:** Scaffold `apps/agent-app` as a dedicated Vite React PWA sharing the `#059669` / `#FBFBF9` theme.

### Gap 2: Settlements & Double-Entry Ledger UI Missing
* **Current State:** Backend migration `001_init.sql` provides the `financial_ledger` and `settlements` tables, and `FinancialLedgerService.js` creates balanced double-entry records. However, neither Merchant Studio nor Admin Console has reconciliation interfaces.
* **Manual Requirement:** Merchants require line-item settlement transparency showing `Original Listed Price (₹100) - 10% Commission (₹10) = Net Payout (₹90)`. Admins require a debit/credit ledger viewer verifying balanced entries and 60/40 revenue allocations.
* **Remediation:** Build `/merchant/payout` settlement breakdown in `apps/merchant-studio` and `/admin/audit` ledger viewer in `apps/admin-console`.

### Gap 3: Rural Cluster Batch Operations UI Missing
* **Current State:** `ZoneService.js` provides `isRuralOrderEligible(time)` with the 21:00 cutoff and `getDeliveryBatch(date)` returning `05:00 - 08:00`. However, no UI exists to manage rural batches.
* **Manual Requirement:** At 21:00 Asia/Kolkata, rural orders must lock into next-morning batches (`SCHEDULED_FOR_NEXT_DAY`). Agents and drivers require batch manifests showing consolidated pickup items from urban/semi-urban wholesale hubs for early morning dispatch.
* **Remediation:** Add `/agent/rural-batches` in `apps/agent-app` and rural batch dispatch views in `apps/driver-fleet`.

### Gap 4: Two-Step OTP Verification & Live GPS Driver Tracking
* **Current State:** Backend `delivery.routes.js` provides endpoints for assign, track, and status update, but frontend MVP only displays mock status labels.
* **Manual Requirement:**
  1. **Pickup Handshake:** Vendor generates 4-digit OTP; Driver inputs OTP to transition order to `PICKED_UP`.
  2. **Delivery Handshake:** Customer receives 4-digit OTP; Driver inputs OTP to transition order to `DELIVERED`.
  3. **Live GPS:** Driver PWA continuously broadcasts coordinates via Socket.IO, rendered as a live moving marker on the Customer tracking map.
* **Remediation:** Implement OTP verification modals in `apps/driver-fleet`, `apps/merchant-studio`, and `apps/customer-web` backed by Socket.IO event streaming.

### Gap 5: Strict Single-Vendor Cart & Server Pricing Wiring
* **Current State:** Frontend MVP permitted mixing items from different vendors and calculated totals client-side using legacy percentages.
* **Manual Requirement:** Cart must reject items from multiple vendors (`"MVP cart only supports items from a single vendor"`), and all monetary totals must be calculated server-authoritatively via `POST /api/v1/orders/calculate`.
* **Remediation:** Implement `useCart` hook in `frontend/design-system` enforcing single-vendor constraints and invoking `POST /api/v1/orders/calculate` on every quantity change.

---

## 5. Build Phases (2–6) with Antigravity Tasks & Section 31 Acceptance

### Phase 1: Foundation (COMPLETED)
* Express REST API (`/api/v1`), 14 modular domains, PostgreSQL 14+ with PostGIS migrations (`001_init.sql`).
* Official Pricing Engine (`PricingService.js`): 5% markup, 10% commission on original, ₹5 platform fee, ₹25 delivery fee, ₹25 payout.
* 23 Jest tests passing across pricing, zones, and orders.

---

### Phase 2: Customer Web PWA & Core Pricing Engine Wiring
**Objective:** Deliver an installable, mobile-responsive Customer PWA that mirrors `quikooo.com` styling, enforces single-vendor cart rules, and binds directly to the backend calculation engine.

#### Antigravity Execution Tasks
1. **Task 2.1 - Design System Scaffolding:** Create `frontend/design-system` containing Tailwind presets, typography (`Outfit` + `Plus Jakarta Sans`), colors (`#059669`, `#FBFBF9`), and common components (`Button`, `Modal`, `CurrencyDisplay`).
2. **Task 2.2 - Customer Web App Scaffolding:** Initialize `apps/customer-web` with Vite, React, and `vite-plugin-pwa`. Copy PWA icons and manifest from `ux/theme/` into `apps/customer-web/public/`.
3. **Task 2.3 - Cart & Single-Vendor Guard:** Build `useCart` hook with localStorage persistence. When adding an item from a different vendor, show a modal prompt: *"Your cart contains items from another store. Reset cart to add this item?"*.
4. **Task 2.4 - API Calculation Integration:** Connect the cart checkout view to `POST /api/v1/orders/calculate`. Display itemized subtotal (+5% menu markup), ₹5.00 platform fee, ₹25.00 delivery fee, and customer payable.
5. **Task 2.5 - Order Creation & Status View:** Connect order placement to `POST /api/v1/orders` and build order tracking screen `/orders/:id` polling `GET /api/v1/orders/:id`.

#### Section 31 Acceptance Criteria
* [ ] Adding ₹100 item results in Subtotal = ₹105.00, Platform Fee = ₹5.00, Delivery Fee = ₹25.00, Customer Payable = ₹135.00.
* [ ] Attempting to add an item from a second vendor triggers an explicit warning modal blocking mixed carts.
* [ ] PWA audit in Chrome DevTools shows 100% PWA installability with `#059669` theme color, `#FBFBF9` background, and icons loaded.
* [ ] Responsive viewport renders seamlessly on mobile devices (max-w-md centered container on desktop).

---

### Phase 3: Merchant Studio & Driver Fleet Full Operationalization
**Objective:** Enable live kitchen/store order management and delivery dispatch with audio alerts, OTP handshakes, and wallet ledger updates.

#### Antigravity Execution Tasks
1. **Task 3.1 - Merchant Studio Live Terminal:** Scaffold `apps/merchant-studio` with real-time polling or Socket.IO room `vendor_{vendorId}`. Add HTML5 audio chime on new orders.
2. **Task 3.2 - Merchant Order Action Controls:** Implement transition buttons calling `POST /api/v1/orders/:id/transition` (`VENDOR_ACCEPTED` -> `PREPARING` -> `READY_FOR_PICKUP`).
3. **Task 3.3 - Merchant Settlement Ledger UI:** Build `/merchant/payout` showing order-level breakdown: Original ₹100, 10% Commission ₹10, Net Payable ₹90.
4. **Task 3.4 - Driver Fleet Cockpit App:** Scaffold `apps/driver-fleet` with Duty Switch (`is_online`). Poll available tasks within 2.0 km radius.
5. **Task 3.5 - Driver OTP Handshake Modals:** Implement pickup OTP verification modal (Vendor verifies Driver) and delivery OTP completion modal (Customer provides 4-digit code).
6. **Task 3.6 - Driver Earnings & Wallet:** Build `/driver/payout` displaying ₹25.00 credited per delivered order with withdrawal request button.

#### Section 31 Acceptance Criteria
* [ ] Merchant receives audible alert within 3 seconds of customer placing an order.
* [ ] Merchant menu manager displays both Original Price and Customer (+5%) Price with exact rounding.
* [ ] Orders cannot jump states out of order (e.g. `ORDER_PLACED` cannot jump directly to `DELIVERED`).
* [ ] Completing delivery credits exactly ₹25.00 to driver wallet and creates double-entry record.

---

### Phase 4: Agent Portal (NEW) & Rural Batch Logistics
**Objective:** Construct the franchise management portal and activate the rural 21:00 cutoff and morning dispatch pipeline.

#### Antigravity Execution Tasks
1. **Task 4.1 - Agent Portal Scaffolding:** Create `apps/agent-app` PWA using shared design tokens. Implement role-protected login for `AGENT`.
2. **Task 4.2 - Zone Analytics & Revenue Dashboard:** Connect `/agent` dashboard to `GET /api/v1/agents/:id` and `GET /api/v1/agents/:id/payouts`. Render 60% franchise revenue share versus 40% Quikooo share.
3. **Task 4.3 - Local Merchant & Driver KYC:** Build `/agent/vendors` and `/agent/drivers` permitting agents to approve or suspend partners within their assigned zone.
4. **Task 4.4 - Rural Cutoff & Batching Service Integration:** Build `/agent/rural-batches`. At 21:00 Asia/Kolkata, automatically group rural orders into next-morning dispatch batches (`05:00 - 08:00`).
5. **Task 4.5 - Batch Manifest Generator:** Provide a printable and mobile-friendly manifest view for rural bulk pickup and distribution.

#### Section 31 Acceptance Criteria
* [ ] Agent sees only merchants, drivers, and orders mapped to their assigned `zone_id`.
* [ ] Franchise net revenue share displays exactly 60% of net margin after GST.
* [ ] Rural orders submitted after 21:00 Asia/Kolkata are marked `SCHEDULED_FOR_NEXT_DAY` with clear UI warnings.
* [ ] Morning dispatch batch manifest correctly sums item quantities across rural orders for bulk vendor pickup.

---

### Phase 5: Real-Time Dispatch, OTP & Payment Webhooks
**Objective:** Complete the production real-time communication pipeline, GPS broadcasting, and Razorpay payment integration.

#### Antigravity Execution Tasks
1. **Task 5.1 - Razorpay Integration & Webhook Handler:** Implement `POST /api/v1/payments/create` and `POST /api/v1/payments/verify` with HMAC SHA256 signature verification.
2. **Task 5.2 - Automated Double-Entry Ledger Posting:** On verified payment, invoke `FinancialLedgerService.buildLedgerEntry()` to write all 6 balanced debit/credit lines into `financial_ledger`.
3. **Task 5.3 - Socket.IO Driver GPS Broadcast:** Wire `navigator.geolocation.watchPosition` in `apps/driver-fleet` to emit `driver_location` events. Broadcast to `order_{orderId}` room.
4. **Task 5.4 - Customer Live Tracking Map:** Integrate Leaflet / Mapbox in `apps/customer-web` `/orders/:id` rendering store location, delivery address, and moving driver pin.

#### Section 31 Acceptance Criteria
* [ ] Payment webhook creates balanced debit and credit entries totaling `customerPayable`.
* [ ] Driver location updates smoothly on customer map at least once every 5 seconds.
* [ ] Simulated payment failure marks order `CANCELLED` and does not commit merchant settlement.

---

### Phase 6: Admin Operations Console, Ledger Auditing & Production Hardening
**Objective:** Deliver full platform governance, dynamic configuration, double-entry audit tools, and production deployment scripts.

#### Antigravity Execution Tasks
1. **Task 6.1 - Admin Overview & System Metrics:** Build `apps/admin-console` `/admin/overview` displaying real-time GMV, active deliveries, platform revenue, and agent payouts.
2. **Task 6.2 - RBAC & User Management:** Build `/admin/users` supporting role assignment and activation toggles for all 6 user roles.
3. **Task 6.3 - Financial Ledger Explorer:** Build `/admin/audit` with search and filtering over `financial_ledger`. Verify total debits equal total credits for any filtered window.
4. **Task 6.4 - Dynamic System Config Editor:** Build `/admin/config` allowing live editing of `RESTAURANT_MENU_ADJUSTMENT_PERCENT`, commission, platform fees, and cutoff times.
5. **Task 6.5 - Production Containerization & CI:** Write `Dockerfile` and `docker-compose.yml` for unified production deployment with PostgreSQL 14 PostGIS and Nginx reverse proxy.

#### Section 31 Acceptance Criteria
* [ ] Financial ledger audit interface highlights any unbalanced debit/credit anomaly (0 anomalies allowed).
* [ ] System config changes in Admin Console take immediate effect across calculation APIs without service reboot.
* [ ] End-to-end test executes full lifecycle: Customer order -> Merchant prep -> Driver deliver -> Agent commission -> Admin ledger.

---

## 6. Design System Reuse Rules

To preserve brand consistency across all 5 portals, developers and agents must strictly adhere to the following rules:

### Rule 1: Master Palette & Color Discipline
* **Never use arbitrary green shades:** Always use Tailwind `emerald` tokens. Primary interactive color is `#059669` (`emerald-600`), hover is `#047857` (`emerald-700`).
* **Never use pure white (#FFFFFF) for the page background:** The canvas background must always be `#FBFBF9`. Pure `#FFFFFF` is strictly reserved for cards, sheets, inputs, and modal dialogs.
* **Border Colors:** Subtle card borders must use `border-emerald-950/5` or `border-gray-200`. Never use harsh black borders.

### Rule 2: Typography Stacks
* **Headings, Metrics & Logos:** Apply `font-display` (`font-family: 'Outfit', sans-serif`).
  * Example: Hero store titles, pricing figures (`₹135.00`), portal header banners.
* **Body, Forms & Data Tables:** Apply `font-body` (`font-family: 'Plus Jakarta Sans', sans-serif`).
  * Example: Item descriptions, form inputs, timestamps, button labels.

### Rule 3: Mobile-First Shell Constraint
* Customer App (`apps/customer-web`) and Driver Fleet (`apps/driver-fleet`) must use a mobile-first constraint when rendered on wide screens:
  ```jsx
  // Default Mobile Shell Wrapper
  <div className="min-h-screen bg-[#FBFBF9] text-gray-900 flex justify-center">
    <div className="w-full max-w-md min-h-screen bg-white shadow-xl flex flex-col relative pb-20">
      {/* Portal Views */}
    </div>
  </div>
  ```
* Merchant Studio, Agent App, and Admin Console can utilize full-width responsive desktop grid layouts with collateral mobile responsiveness.

### Rule 4: Canonical Currency Display
* All currency figures must render using the standard Indian Rupee symbol (`₹`) formatted with exactly two decimal places when non-zero, or standard integer format for flat amounts:
  ```jsx
  export const formatINR = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  ```

### Rule 5: PWA Manifest Consistency
Every portal must include the standard meta tags in `index.html`:
```html
<meta name="theme-color" content="#059669" />
<meta name="background-color" content="#FBFBF9" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.json" />
```

---

## 7. API Contract Table

All endpoints are prefixed with `/api/v1` and communicate via JSON.

### 7.1 Cart & Pricing Engine
* **Endpoint:** `POST /api/v1/orders/calculate`
* **Access:** Public / Customer
* **Purpose:** Authoritative money breakdown for cart items prior to checkout.
* **Request Payload:**
  ```json
  {
    "vendorId": "uuid-vendor-001",
    "items": [
      {
        "productId": "uuid-prod-101",
        "name": "Chicken Biryani",
        "originalPrice": 100.00,
        "quantity": 2
      }
    ],
    "addressId": "uuid-addr-901",
    "zoneType": "URBAN"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "vendorId": "uuid-vendor-001",
      "totalOriginalPrice": 200.00,
      "menuAdjustmentPercent": 5,
      "menuAdjustmentAmount": 10.00,
      "subtotal": 210.00,
      "platformFee": 5.00,
      "deliveryFee": 25.00,
      "customerPayable": 240.00,
      "vendorSettlement": 180.00,
      "commissionPercent": 10,
      "commissionAmount": 20.00,
      "quikoooGrossRevenue": 30.00,
      "deliveryPartnerPayout": 25.00,
      "items": [
        {
          "productId": "uuid-prod-101",
          "name": "Chicken Biryani",
          "quantity": 2,
          "originalPrice": 100.00,
          "customerMenuPrice": 105.00,
          "itemTotalOriginal": 200.00,
          "itemTotalCustomer": 210.00
        }
      ]
    }
  }
  ```
* **Error Response (400 Bad Request - Multi-Vendor):**
  ```json
  {
    "success": false,
    "message": "MVP cart only supports items from a single vendor"
  }
  ```

---

### 7.2 Order Placement & Lifecycle
* **Endpoint:** `POST /api/v1/orders`
* **Access:** Authenticated Customer
* **Purpose:** Create order record and generate immutable pricing snapshot.
* **Request Payload:**
  ```json
  {
    "vendorId": "uuid-vendor-001",
    "items": [
      {
        "productId": "uuid-prod-101",
        "name": "Chicken Biryani",
        "originalPrice": 100.00,
        "quantity": 1
      }
    ],
    "addressId": "uuid-addr-901",
    "paymentMethod": "UPI"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-order-555",
      "orderNumber": "QK-20261005-7890",
      "status": "ORDER_PLACED",
      "originalFoodTotal": 100.00,
      "subtotal": 105.00,
      "platformFee": 5.00,
      "deliveryFee": 25.00,
      "customerPayable": 135.00,
      "vendorSettlement": 90.00,
      "quikoooGrossRevenue": 15.00,
      "deliveryPartnerPayout": 25.00,
      "taxAmount": 3.06,
      "agentCommissionShare": 8.36,
      "quikoooRevenueShare": 5.58
    }
  }
  ```

---

### 7.3 Order State Transitions
* **Endpoint:** `POST /api/v1/orders/:id/transition`
* **Access:** Vendor / Delivery Partner / Admin
* **Purpose:** Advance order state machine with validation.
* **Request Payload:**
  ```json
  {
    "currentStatus": "ORDER_PLACED",
    "nextStatus": "VENDOR_ACCEPTED",
    "notes": "Kitchen acknowledged order"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "orderId": "uuid-order-555",
      "previousStatus": "ORDER_PLACED",
      "currentStatus": "VENDOR_ACCEPTED",
      "timestamp": "2026-10-05T07:30:00.000Z"
    }
  }
  ```

---

### 7.4 Payments & Webhooks
* **Endpoint:** `POST /api/v1/payments/verify`
* **Access:** Authenticated / Payment Gateway Webhook
* **Purpose:** Validate payment signature, mark order `PAYMENT_CONFIRMED`, and post double-entry ledger entries.
* **Request Payload:**
  ```json
  {
    "orderId": "uuid-order-555",
    "razorpayPaymentId": "pay_987654321",
    "razorpayOrderId": "order_razor_123",
    "razorpaySignature": "sha256_hex_hash"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "paymentStatus": "CAPTURED",
      "orderStatus": "PAYMENT_CONFIRMED",
      "ledgerRecorded": true
    }
  }
  ```

---

### 7.5 Delivery Dispatch & OTP Verification
* **Endpoint:** `POST /api/v1/delivery/assign`
* **Access:** Admin / Agent / Dispatch Engine
* **Purpose:** Offer order to delivery partner within 2.0 km.
* **Request Payload:**
  ```json
  {
    "orderId": "uuid-order-555",
    "deliveryPartnerId": "uuid-driver-333"
  }
  ```

* **Endpoint:** `PATCH /api/v1/delivery/status`
* **Access:** Delivery Partner
* **Purpose:** Driver status updates with OTP validation for pickup and delivery.
* **Request Payload (Pickup):**
  ```json
  {
    "orderId": "uuid-order-555",
    "deliveryPartnerId": "uuid-driver-333",
    "step": "PICKED_UP",
    "otp": "4512"
  }
  ```
* **Request Payload (Delivery Completion):**
  ```json
  {
    "orderId": "uuid-order-555",
    "deliveryPartnerId": "uuid-driver-333",
    "step": "DELIVERED",
    "otp": "8934"
  }
  ```

---

### 7.6 Agent Analytics & Zone Ledger
* **Endpoint:** `GET /api/v1/agents/:id/payouts`
* **Access:** Agent (own ID only) / Admin / Super Admin
* **Purpose:** Fetch agent franchise revenue share breakdown.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "agentId": "uuid-agent-777",
      "agentCode": "AG-ZN-BLR-01",
      "zoneId": "uuid-zone-urban-1",
      "commissionSharePercent": 60.00,
      "totalEarned": 8360.00,
      "totalPaid": 6000.00,
      "pendingPayout": 2360.00,
      "currency": "INR"
    }
  }
  ```

---

## 8. Next Immediate Step: Phase 2 Execution Runbook

The immediate milestone is executing **Phase 2: Customer Web PWA matching quikooo.com theme wired to the backend calculate API**.

### Actionable Implementation Steps:
1. **Initialize Shared Design System:**
   * Create `frontend/design-system/package.json` and export Tailwind preset containing `#059669` and `#FBFBF9`.
   * Export base components: `Button.jsx`, `Modal.jsx`, `CurrencyDisplay.jsx`, and `useCart.js`.
2. **Scaffold `apps/customer-web`:**
   * Run Vite React scaffold in `apps/customer-web`.
   * Install `vite-plugin-pwa`, `lucide-react`, and `axios`.
   * Copy icons and manifest from `ux/theme/` to `apps/customer-web/public/`.
   * Add Google Font links for `Outfit` and `Plus Jakarta Sans` in `apps/customer-web/index.html`.
3. **Build the Single-Vendor Cart Context (`useCart.js`):**
   * Guard `addItem(item)`: If `cart.vendorId && cart.vendorId !== item.vendorId`, throw conflict event prompting user confirmation.
   * Debounce calls to `POST http://localhost:5000/api/v1/orders/calculate` on quantity change.
4. **Implement Store Menu & Checkout UI:**
   * Render store items showing customer menu price (+5% markup over original).
   * Render Checkout Summary Box:
     ```
     Food Subtotal:     ₹105.00
     Platform Fee:        ₹5.00
     Delivery Fee:       ₹25.00
     --------------------------
     Total to Pay:      ₹135.00
     ```
5. **End-to-End Verification:**
   * Start backend (`cd backend && npm start`).
   * Start Customer App (`cd apps/customer-web && npm run dev`).
   * Verify that an item with original listed price ₹100 produces an exact ₹135 customer payable amount verified via `/api/v1/orders/calculate`.

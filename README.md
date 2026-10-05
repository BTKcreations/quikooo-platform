# QUIKOOO - Hyperlocal Commerce Platform

**QUIKOOO** is a next-generation hyperlocal commerce ecosystem designed to empower local merchants, local zone franchise agents, and delivery partners across Urban, Semi-Urban, and Rural clusters in India.

---

## 🏗️ Platform Roadmap & Phases

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Foundation (Current)                                          │
│ - Express REST API (/api/v1) & CommonJS Module Architecture            │
│ - Official Pricing Engine (5% Markup, 10% Original Commission)         │
│ - Centralized Money Math & NUMERIC(12,2) Database Schema               │
│ - PostgreSQL + PostGIS Spatial Migrations (001_init.sql)               │
│ - Order State Machine & Snapshotting                                   │
│ - Double-Entry Financial Ledger (60/40 Agent-Quikooo Split)           │
│ - Rural Cutoff (21:00) & Morning Dispatch Window (05:00 - 08:00)       │
│ - RBAC (Super Admin, Admin, Agent, Vendor, Delivery Partner, Customer) │
│ - Jest Test Suite (23 Tests) & Graceful Offline Boot                   │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Vendor & Local Agent Portals                                  │
│ - Vendor catalog, menu markup overrides, and incoming order terminal   │
│ - Agent zone analytics, vendor onboarding, and settlement approvals    │
│ - Automated invoice generation & GST accounting breakdown              │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Delivery Partner App & Real-time Dispatch                     │
│ - WebSocket / Socket.IO live driver GPS broadcast                      │
│ - 2km radius auto-assignment algorithm                                 │
│ - Delivery partner wallet & immediate payout dispatch                  │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Customer Experience (Web & Mobile Apps)                       │
│ - Geolocation-based merchant discovery & single-vendor cart            │
│ - Razorpay / UPI payment gateway integration                           │
│ - Real-time order progress tracking and push notifications             │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Rural Cluster Logistics & Agri-Commerce                       │
│ - 21:00 automated order aggregation engine                             │
│ - 05:00 - 08:00 bulk dispatch route optimization                       │
│ - Cross-zone transport from urban wholesale hubs to rural hubs         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Tech Stack

* **Runtime**: Node.js (v18+)
* **Framework**: Express.js REST API
* **Database**: PostgreSQL 14+ with PostGIS spatial extension
* **Real-time Pipeline**: Socket.IO placeholder
* **Validation & Security**: Joi, JWT, Helmet, CORS
* **Testing**: Jest, Supertest
* **Precision Math**: All monetary amounts computed with 2-decimal rounding (`NUMERIC(12,2)`)

---

## 💎 The Official QUIKOOO Business Model

| Parameter | Value | Details |
|---|---|---|
| **Restaurant Menu Markup** | `5%` | Added to original price to produce customer menu price |
| **Platform Commission** | `10%` | Charged strictly on **original** price (never on marked up price) |
| **Customer Platform Fee** | `₹5.00` | Flat convenience fee charged per order |
| **Customer Delivery Fee** | `₹25.00` | Flat delivery fee charged to customer |
| **Delivery Partner Payout** | `₹25.00` | Direct payout credited to driver for delivery |
| **Local Agent Share** | `60%` | Allocated from net platform revenue pool after taxes |
| **QUIKOOO Share** | `40%` | Platform retained revenue |
| **Hyperlocal Radius** | `2.0 km` | Urban and Semi-Urban discovery radius |
| **Rural Daily Cutoff** | `21:00` | Asia/Kolkata cutoff for next-day morning batch |
| **Rural Delivery Window** | `05:00 - 08:00` | Asia/Kolkata morning delivery batch |

### Formula Example:
For an item with original listed price **₹100**:
1. `Menu Adjustment (5%)` = ₹5.00
2. `Customer Menu Price (Subtotal)` = ₹105.00
3. `Platform Commission (10%)` = ₹10.00 *(10% of ₹100, NOT of ₹105)*
4. `Vendor Settlement` = ₹90.00 (`100 - 10`)
5. `Customer Total Payable` = ₹135.00 (`105 + 5 + 25`)
6. `QUIKOOO Gross Revenue` = ₹15.00 (`5 + 10`)
7. `GST / Tax (18% on ₹17 example)` = ₹3.06, Net = ₹13.94
8. `Agent Share (60%)` = ₹8.36, `Quikooo Share (40%)` = ₹5.58

---

## 📂 Project Directory Structure

```
quikooo-platform/
├── backend/
│   ├── migrations/
│   │   └── 001_init.sql             # Full PostgreSQL + PostGIS schema & seeds
│   ├── src/
│   │   ├── index.js                 # Express server & Socket.IO bootstrap
│   │   ├── config.js                # Environment configuration & business defaults
│   │   ├── db.js                    # pg Pool with offline graceful fallback
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT & RBAC + Agent permission boundary
│   │   │   ├── validate.js          # Joi request schema validation
│   │   │   └── error.js             # 404 & centralized error handlers
│   │   ├── services/
│   │   │   ├── PricingService.js    # Official 5% markup & 10% commission engine
│   │   │   ├── ZoneService.js       # Haversine distance, PostGIS docs & rural cutoff
│   │   │   ├── OrderService.js      # Complete state machine & snapshot builder
│   │   │   ├── TaxService.js        # Configurable tax calculation (GST)
│   │   │   └── FinancialLedgerService.js # Double-entry bookkeeping & 60/40 splits
│   │   └── modules/                 # 14 modular domain components
│   │       ├── auth/                # routes, controller, service
│   │       ├── users/
│   │       ├── zones/
│   │       ├── vendors/
│   │       ├── products/
│   │       ├── orders/              # Includes POST /api/v1/orders/calculate
│   │       ├── payments/
│   │       ├── finance/
│   │       ├── delivery/
│   │       ├── agents/
│   │       ├── settlements/
│   │       ├── admin/
│   │       ├── notifications/
│   │       └── reports/
│   ├── tests/
│   │   ├── pricing.test.js          # Pricing math, ledger splits, rural cutoff
│   │   ├── zone.test.js             # Zone proximity & batching tests
│   │   └── order.test.js            # State machine & calculate API tests
│   ├── .env.example
│   ├── package.json
│   └── README.md
├── .gitignore
└── README.md
```

---

## 🏃 Verification & Testing

To run the verification suite:
```bash
cd backend
npm test
```

To run the backend server:
```bash
cd backend
npm start
```

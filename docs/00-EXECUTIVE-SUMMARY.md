# QUIKOOO Executive Summary
**Platform Overview & Board Briefing** | Version 2.0.0 | October 2026

---

### 1. What is QUIKOOO?
QUIKOOO is an India-first hyperlocal quick-commerce and fresh meal logistics ecosystem. It unites local merchants, consumers, delivery partners, and local franchise agents under an asset-light, zone-governed operating model tailored for Indian urban density and rural aggregation.

```
+----------------------------------------------------------------------------+
|                        QUIKOOO HYPERLOCAL ECOSYSTEM                        |
|                                                                            |
|  [ Urban / Sub-Urban: 10-25m ]             [ Rural: Next-Day Batch ]       |
|    - 2.0 km geofenced radius                 - Daily 21:00 IST Cutoff      |
|    - Instant on-demand dispatch              - 05:00 - 08:00 Morning Run   |
|                                                                            |
|  [ 5 Progressive Web Apps (PWAs) ]         [ Franchise Zone-Agent Core ]   |
|    Customer | Merchant | Driver | Agent | Admin    60% Local / 40% Platform Pool   |
+----------------------------------------------------------------------------+
```

---

### 2. Operating Tiers & SLA Matrix
QUIKOOO delivers speed in urban centers and density efficiency in rural markets:

| Tier | Service Radius | Delivery SLA | Dispatch Mechanism | Target Operational Focus |
|---|---|---|---|---|
| **URBAN** | 2.0 km geofence | 10–15 Minutes | Instant point-to-point | High-density fresh food, groceries |
| **SUB_URBAN** | 2.0 km geofence | 15–25 Minutes | Dynamic pooled dispatch | Neighborhood convenience retail |
| **RURAL** | Cluster hubs | 05:00–08:00 AM | Consolidated morning batch | 21:00 IST cutoff aggregation |

---

### 3. Canonical Unit Economics (Original Listed Price = ₹100.00)
All platform transactions follow an authoritative, transparent pricing formula. Quikooo never charges commission on marked-up prices:

| Component | Amount (₹) | Economic Rule & Attribution |
|---|---|---|
| **Original Vendor Price** | **₹100.00** | Listed merchant baseline price |
| **Menu Markup (+5%)** | + ₹5.00 | Customer-facing menu adjustment (`customerMenuPrice` = ₹105.00) |
| **Platform Convenience Fee** | + ₹5.00 | Customer checkout platform fee |
| **Delivery Fee (Pass-Through)**| + ₹25.00 | Fixed customer logistics charge (100% passed to driver) |
| **Total Customer Payable** | **₹135.00** | **Invoice subtotal (₹105) + Platform (₹5) + Delivery (₹25)** |
| **Vendor Platform Commission** | - ₹10.00 | **10% charged on original price (₹100), NEVER on ₹105** |
| **Net Vendor Settlement** | **₹90.00** | Merchant payout (Original ₹100.00 - 10% Commission ₹10.00) |
| **Delivery Partner Payout** | **₹25.00** | 100% delivery fee disbursed to rider |
| **Quikooo Gross Platform Margin**| **₹15.00** | ₹5.00 menu markup + ₹10.00 platform commission |
| **GST / Government Tax (18%)** | - ₹3.06 | Applicable tax on gross margin base |
| **Net Platform Revenue Pool** | **₹13.94** | Adjusted revenue distributed between Agent and HQ |
| **Local Zone Agent Share (60%)**| **₹8.36** | Franchisee commission for territory management |
| **QUIKOOO HQ Share (40%)** | **₹5.58** | Platform corporate operating margin |

---

### 4. The 5 Portals
QUIKOOO is deployed as five independent, mobile-first Progressive Web Apps (PWAs):

1. **Customer Web (`apps/customer-web`):** Instant store browsing, single-vendor cart guard, dynamic price calculation (`POST /api/v1/orders/calculate`), Razorpay/UPI checkout, live GPS tracking.
2. **Merchant Studio (`apps/merchant-studio`):** Real-time kitchen terminal with audio chimes, catalog pricing, lifecycle order transitions, transparent ₹90 net settlement breakdown.
3. **Driver Fleet (`apps/driver-fleet`):** On-duty dispatch toggle, 2-step OTP handshake (pickup from vendor, delivery to customer), turn-by-turn map links, ₹25/order earnings tracker.
4. **Agent App (`apps/agent-app`):** Franchise command center, territory merchant KYC, driver roster, rural 21:00 batch monitor, 60% revenue share wallet.
5. **Admin Console (`apps/admin-console`):** Executive overview, PostGIS zone geofencing, double-entry financial ledger explorer, dynamic fee configuration.

---

### 5. Technical Build Status & Platform Verification
The platform codebase is fully implemented, verified, and hardened:

| Domain | Specification & Metric | Status |
|---|---|---|
| **Backend Architecture** | Node.js/Express, PostgreSQL 14 PostGIS, Socket.IO, HMAC payments | **Production Ready** |
| **Frontend Applications** | 5 Standalone Vite React PWAs with shared `@quikooo/design-system` | **5/5 Builds Passing** |
| **Automated Test Suite** | 133 comprehensive unit and integration tests across all workspaces | **133/133 Passing (100%)** |
| **Financial Ledger** | Balanced double-entry accounting with no-edit-after-paid lock | **Verified Balanced** |
| **Repository Remote** | `https://github.com/BTKcreations/quikooo-platform.git` | **Main Branch Synced** |

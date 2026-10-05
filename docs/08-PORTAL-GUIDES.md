# QUIKOOO Portal Guides & Daily Operational Workflows
**The 5 Progressive Web Apps, User Runbooks & Responsive Architecture** | Version 2.0.0 | October 2026

---

### 1. Responsive Architecture & UX Standards
All five QUIKOOO portals are built as standalone Progressive Web Apps (PWAs) sharing common UX foundations:

- **Mobile Viewports (< 1024px):** Fixed bottom navigation bar with minimum 44px touch targets, full-screen sheets, and thumb-friendly controls.
- **Desktop / Tablet Viewports (≥ 1024px):** Persistent left sidebar navigation, multi-column data grids, and keyboard accessibility.
- **Zero-Lag Routing:** Route pages split via `React.lazy()` with route prefetching on hover via `<PrefetchLink>`.
- **Offline Resilience:** Non-blocking `<OfflineBanner>` preserves navigation state and notifies users during intermittent connectivity.

```
+-----------------------------------------------------------------------------------+
|  PORTAL ADAPTIVE SHELL                                                            |
|                                                                                   |
|  [ Desktop / Tablet (>= 1024px) ]                 [ Mobile (< 1024px) ]           |
|  +--------+----------------------------+          +----------------------------+  |
|  | Brand  | Top App Bar                |          | Top App Bar / Location     |  |
|  |--------|----------------------------|          +----------------------------+  |
|  | Nav 1  |                            |          | Page Body Content          |  |
|  | Nav 2  | Page Content Canvas        |          | (Thumb-friendly cards)     |  |
|  | Nav 3  |                            |          +----------------------------+  |
|  | Footer |                            |          | [Nav 1] [Nav 2] [Nav 3]    |  |
|  +--------+----------------------------+          +----------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

### 2. Portal Directory & Responsibilities

| Application | Target Users | Routes Mounted | Key Operational Responsibilities |
|---|---|---|---|
| **Customer Web**<br>`apps/customer-web` | End consumers (Urban & Rural) | `/customer`, `/store/:id`, `/cart`, `/orders`, `/login` | Geofenced store discovery, single-vendor cart, dynamic ₹135 price check, live tracking |
| **Merchant Studio**<br>`apps/merchant-studio` | Kitchen managers, store cashiers | `/merchant`, `/merchant/orders`, `/merchant/payout` | Real-time POS audio chimes, order lifecycle dispatch, menu stock toggles, ₹90 net ledger |
| **Driver Fleet**<br>`apps/driver-fleet` | Delivery partners & riders | `/driver/tasks`, `/driver/duty`, `/driver/payout` | Duty shift toggle, 2-step OTP pickup/delivery handshake, turn-by-turn maps, ₹25/drop wallet |
| **Agent App**<br>`apps/agent-app` | Territory franchise partners | `/agent`, `/agent/vendors`, `/agent/drivers`, `/agent/batch`, `/agent/earnings` | Merchant/driver KYC, 21:00 rural cutoff manifest monitor, 60% franchise earnings wallet |
| **Admin Console**<br>`apps/admin-console` | HQ executive operations & finance | `/admin/overview`, `/admin/zones`, `/admin/finance`, `/admin/settlements`, `/admin/users`, `/admin/audit` | PostGIS boundary manager, double-entry ledger audits, automated settlement releases |

---

### 3. Step-by-Step Daily Runbooks

#### A. Customer: Order Placement in 5 Steps
1. **Set Geolocation:** Open app; GPS or manual pin validates inclusion within active 2.0 km geofence.
2. **Select Merchant & Items:** Browse local menu; add items under the single-vendor cart guardrail.
3. **Review Cart Breakdown:** Confirm transparent calculation: Menu ₹105 + Platform ₹5 + Delivery ₹25 = Total ₹135.
4. **Checkout & Pay:** Complete transaction via Razorpay UPI / card payment.
5. **Live Tracking:** Track order lifecycle updates via Socket.IO from kitchen preparation to driver doorstep arrival.

#### B. Merchant: Order Processing in 3 Taps
1. **Tap 1 (Accept):** Audio chime triggers on incoming order card → Tap **"Accept Order"** (`VENDOR_ACCEPTED`).
2. **Tap 2 (Kitchen Prep):** Kitchen prepares meal → Tap **"Start Preparing"** (`PREPARING`) to start prep timer.
3. **Tap 3 (Dispatch):** Pack order into tamper-evident bag → Tap **"Mark Ready"** (`READY_FOR_PICKUP`). Engine dispatches rider.

#### C. Driver: On-Duty Shift to Completed Delivery
1. **Shift Activation:** Open Rider Cockpit, toggle switch to **"On Duty"** (`/driver/duty`).
2. **Accept Task:** Receive nearby pickup broadcast notification; tap **"Accept Task"** within 45 seconds.
3. **Store Pickup (OTP #1):** Navigate to store, inspect package seal, obtain 4-digit pickup OTP from merchant.
4. **Customer Delivery (OTP #2):** Ride to customer doorstep, hand over package, obtain 4-digit customer delivery OTP.
5. **Instant Credit:** Status moves to `DELIVERED`; ₹25.00 delivery fee immediately credited to driver balance (`/driver/payout`).

#### D. Agent: Rural Daily Batch Close
1. **Intraday Monitoring:** Monitor incoming rural village orders on `/agent/batch` prior to 21:00 IST cutoff.
2. **Cutoff Lock (21:00 IST):** Backend locks ordering window; orders transition to `SCHEDULED_FOR_NEXT_DAY`.
3. **Manifest Review:** Review aggregated wholesale manifest (e.g. bulk produce, milk crates, pharmacy drops).
4. **Morning Fleet Allocation:** Confirm scheduled morning delivery drivers for the 05:00–08:00 AM dispatch run.
5. **Franchise Accrual:** Verify 60% franchise pool share (`₹8.36` per canonical ₹100 order) posted to earnings balance.

#### E. Admin: Settlement Approval & Disbursement
1. **Period Close Inspection:** Navigate to `/admin/settlements` at daily/weekly payout reconciliation cutoff.
2. **Double-Entry Balance Verification:** Inspect `/admin/finance`; verify total debits strictly equal total credits.
3. **Review Entitlements:** Validate vendor net payouts (₹90), driver fees (₹25 × count), and agent splits (60%).
4. **Authorize Batch:** Select pending settlement batch, verify generated idempotent batch key, click **"Approve & Disburse"**.
5. **Audit Trail Review:** Check `/admin/audit` to confirm automated logging of actor timestamp, payout total, and banking batch ID.

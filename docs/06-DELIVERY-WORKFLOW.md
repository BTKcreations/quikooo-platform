# QUIKOOO Delivery Fleet Logistics & Dispatch Engine
**Driver Assignment, Two-Step Handshake OTP & Fleet Settlements** | Version 2.0.0 | October 2026

---

### 1. Delivery Partner Assignment Algorithm
When a merchant marks an order `READY_FOR_PICKUP` (or when a rural morning batch is generated), the dispatch engine executes a 4-tier filtering hierarchy:

```
[ New Ready Order ]
        │
        ▼ Tier 1: Duty Status Filter
   [ Is Driver Online & On-Duty? ] ──────> No ──> Exclude
        │ Yes
        ▼ Tier 2: Territory Zone Filter
   [ Driver Registered / Inside Zone? ] ──> No ──> Exclude
        │ Yes
        ▼ Tier 3: Proximity Filter (Haversine)
   [ Distance to Store <= 2.0 km? ] ─────> No ──> Exclude
        │ Yes
        ▼ Tier 4: Workload Optimization
   [ Rank by Active Task Count ] ────────> Lowest active tasks assigned first
        │
        ▼
   [ Dispatch Offer Sent to Driver Cockpit ]
```

| Hierarchy Stage | Filter Attribute | Evaluation Logic | System Safeguard |
|---|---|---|---|
| **1. Duty Status** | `is_online == true` & `on_duty == true` | Driver active on Cockpit app | Never pings inactive or sleeping drivers |
| **2. Zone Territory** | `driver.zone_id == order.zone_id` | Aligned with local franchise agent | Preserves zone franchisee fleet balance |
| **3. Proximity Radius**| `Haversine(driver, vendor) <= 2.0 km` | Great-circle distance check | Prevents excessive deadhead pickup travel |
| **4. Workload Balance**| `active_orders_count` | Ascending order (0 tasks preferred)| Mitigates driver overload and delivery delays |

---

### 2. Two-Step Handshake OTP Architecture
To prevent wrong package pickups and fraudulent delivery claims, QUIKOOO enforces a cryptographically randomized 4-digit Two-Step Handshake:

```
[ HANDSHAKE 1: VENDOR PICKUP ]                 [ HANDSHAKE 2: CUSTOMER DELIVERY ]
  Vendor POS displays: [ OTP: 7391 ]             Customer App displays: [ OTP: 4182 ]
           │                                              │
  Driver collects physical food package          Driver arrives at customer doorstep
           │                                              │
  Driver inputs "7391" in Driver App             Driver inputs "4182" in Driver App
           │                                              │
  State Advances: PICKED_UP                      State Advances: DELIVERED
  (Custody transfers from Merchant to Driver)    (Custody transfers from Driver to Customer)
```

1. **Pickup Handshake:** The vendor POS generates a dynamic 4-digit code. The driver must physically inspect the order ticket and enter this code into the Driver Fleet app. This guarantees the driver is physically at the kitchen and picked up the correct bag.
2. **Delivery Handshake:** The customer app displays a private 4-digit code upon payment. When the driver delivers the order, the customer reveals the code. Verifying this code transitions the order to `DELIVERED` and releases driver payout.

---

### 3. GPS Tracking Pipeline, Throttling & Data Retention
- **Broadcasting Engine:** Driver coordinates are captured using HTML5 Geolocation API (`watchPosition`) and streamed via WebSockets / Socket.IO to room `order:{orderId}`.
- **Throttling Policy:** Updates are throttled to a minimum interval of **5 seconds** or **10 meters of movement**. Rapid successive pings within 5 seconds are coalesced in memory to prevent database write amplification and battery drain.
- **Data Retention & Privacy:** Live breadcrumb coordinates are retained in Redis for active tracking and archived in PostgreSQL for **7 days** to resolve customer disputes, after which location trails are purged in compliance with privacy guidelines.

---

### 4. Delivery Partner Economics & Settlement
QUIKOOO respects delivery partner labor through a 100% transparent, pass-through payout structure:

```
Customer Delivery Fee Paid:     ₹25.00
Platform Commission Deducted:  - ₹0.00 (Zero Retention)
───────────────────────────────────────
Driver Net Earnings Credited:   ₹25.00 PER COMPLETED ORDER
```

| Dimension | Policy Specification | Accounting Rule |
|---|---|---|
| **Base Payout Per Drop** | **₹25.00 Flat** | Credited immediately upon `DELIVERED` status |
| **Platform Deduction** | **₹0.00** | 100% of customer delivery fee passed to rider |
| **Ledger Credit Account** | `DELIVERY_PARTNER_PAYABLE` | Written as credit entry in double-entry ledger |
| **Disbursement Formula** | $\text{Net Payout} = 25 \times n$ ($n = \text{delivered drops}$) | Deterministic daily or weekly bank transfer |
| **Idempotent Payout Key**| `SETTLE_DELIVERY_PARTNER_{ID}_{START}_{END}` | Protects against duplicate bank disbursements |

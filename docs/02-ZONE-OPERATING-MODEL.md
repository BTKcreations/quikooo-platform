# QUIKOOO Zone Operating Model
**Territory Geofencing, Franchising & Snapshot Architecture** | Version 2.0.0 | October 2026

---

### 1. Operating Tiers & Operational Specifications
QUIKOOO structures geographic operations into three standardized tiers to serve diverse demographic densities across India:

| Dimension | URBAN Tier | SUB_URBAN Tier | RURAL Tier |
|---|---|---|---|
| **Target Density** | Metros & Tier-1 commercial centers | Tier-2/3 towns & outer suburbs | Village clusters & peri-urban hubs |
| **Delivery SLA** | **10–15 Minutes** (Express) | **15–25 Minutes** (Standard) | **Next-Morning (05:00–08:00 AM)** |
| **Operational Radius** | **Strict 2.0 km geofence** | **Strict 2.0 km geofence** | Aggregation cluster / Hub route |
| **Cutoff Time** | Continuous on-demand | Continuous on-demand | **Strict 21:00 IST Cutoff** |
| **Dispatch Model** | 1:1 Instant algorithmic assign | Point-to-point dynamic assign | Bulk morning manifest run |
| **Primary Fleet Type**| 2-Wheelers (EV & ICE scooters) | 2-Wheelers & bicycles | Mini-vans & utility 2-wheelers |

---

### 2. 2.0 km Geofencing & Spatial Architecture
Urban and Sub-Urban operations are strictly bounded by a 2.0 km radius from the vendor location:

```
                    +------------------------------------+
                    |        2.0 KM GEOFENCED ZONE       |
                    |                                    |
                    |            [ CUSTOMER ]            |
                    |                 ^                  |
                    |                 |  <= 2.0 km       |
                    |                 v                  |
                    |        [ VENDOR RESTAURANT ]       |
                    |                 ^                  |
                    |                 | Proximity Search |
                    |                 v                  |
                    |          [ DRIVER FLEET ]          |
                    +------------------------------------+
```

- **Haversine Algorithmic Guard:** In memory, distance $d$ between customer $(lat_1, lon_1)$ and merchant $(lat_2, lon_2)$ must satisfy $d \le 2.0\text{ km}$.
- **PostgreSQL / PostGIS Engine:** In the database, stores spatial geography points indexed with GiST:
  `ST_DWithin(vendor.coordinates, ST_SetSRID(ST_MakePoint(cust_lon, cust_lat), 4326)::geography, 2000)`.
- **Zero Leakage:** Customers cannot place orders to merchants beyond 2.0 km in urban zones, preserving hot food quality and rapid delivery SLAs.

---

### 3. Operational Timezone Standard
- **Universal Standard:** `Asia/Kolkata` (Indian Standard Time, UTC+05:30) is enforced across backend microservices, database servers, and scheduled cron jobs.
- **Why Timezone Matters:** Rural cutoffs at **21:00 IST** and morning delivery windows (**05:00–08:00 IST**) are sensitive to calendar boundaries. Enforcing `Asia/Kolkata` across the stack eliminates UTC date rollover bugs during midnight batch processing.

---

### 4. Zone Data Schema & Configuration
Every territory is defined in the `zones` entity with clear boundaries and operational ownership:

| Zone Entity Field | Type | Description | Example Value |
|---|---|---|---|
| `id` | `UUID` | Primary key | `zn_blr_koramangala_01` |
| `name` | `VARCHAR(100)` | Human-readable territory label | `Koramangala 4th Block` |
| `type` | `ENUM` | `URBAN`, `SUB_URBAN`, or `RURAL` | `URBAN` |
| `center_lat` / `center_lng` | `NUMERIC(9,6)` | Geographic epicenter | `12.935242, 77.624462` |
| `radius_km` | `NUMERIC(4,2)` | Geofenced coverage boundary | `2.00` |
| `agent_id` | `UUID` | Assigned local franchise owner | `usr_agent_sharma_98` |
| `cutoff_time` | `TIME` | Daily ordering cutoff (rural) | `21:00:00` |
| `delivery_window_start` | `TIME` | Scheduled dispatch start | `05:00:00` |
| `delivery_window_end` | `TIME` | Scheduled dispatch end | `08:00:00` |
| `is_active` | `BOOLEAN` | Operational availability toggle | `true` |

---

### 5. Zone-Agent Franchise Ownership & Immutable Snapshots
QUIKOOO operates a decentralized franchise structure where an exclusive Agent owns each territory:

```
[ SuperAdmin ] ── Assigns Territory ──> [ Zone Agent Franchisee ]
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
    [ Merchant Operations ]                                         [ Rider Fleet Operations ]
    - Onboard local stores                                          - Onboard & verify riders
    - Inspect food safety & hygiene                                 - Manage active duty roster
    - Resolve merchant disputes                                     - Supervise rural morning run
```

#### The Immutable Order Snapshot Invariant
To prevent accounting chaos during agent reassignments or territory boundary updates, the platform enforces an **immutable snapshot rule**:
1. When an order is created, the system snapshots the active `zone_id`, `agent_id`, and `zone_type` onto the `orders` record.
2. Even if an agent resigns or is reassigned tomorrow, all in-flight orders, customer refunds, and commission payouts remain permanently credited to the stamped `agent_id`.
3. **Outcome:** Zero race conditions, no retro-credit leakage, and 100% tamper-evident audit trails.

# QUIKOOO Roles & Role-Based Access Control (RBAC)
**Security Governance, Operational Boundaries & Middleware Enforcement** | Version 2.0.0 | October 2026

---

### 1. The 6 Platform Roles Matrix
QUIKOOO enforces strict separation of privileges across six platform actors to guarantee operational integrity, customer privacy, and fraud-free financial settlement:

| Role Identifier | Description & Primary Function | Allowed Actions | Explicit Prohibitions |
|---|---|---|---|
| `SUPER_ADMIN` | Executive HQ technology & operations authority | Global parameter config, audit log review, zone geometry, user provisioning, manual settlement overrides | Tampering with paid ledger entries |
| `ADMIN` | Platform day-to-day operations and logistics team | Zone monitoring, support escalations, driver approval, batch settlement reviews, vendor onboarding review | Editing platform fee constants without audit log |
| `AGENT` | Local territory franchise partner | Merchant KYC verification, driver roster oversight, rural 21:00 batch monitor, territory analytics | Modifying ledger, editing commission %, accessing other zones |
| `VENDOR` | Cloud kitchen or local store operator | Catalog item availability/pricing, accept/prepare orders, track net settlement (90%), view store ratings | Assigning drivers, modifying platform fees, mutating completed orders |
| `DELIVERY_PARTNER` | On-demand or scheduled logistics rider | Toggle duty (online/offline), accept delivery dispatches, submit pickup & delivery OTPs, track earnings | Viewing customer contact info post-delivery, editing payouts |
| `CUSTOMER` | Hyperlocal consumer browsing stores | Geolocation search, browse menus, manage single-vendor cart, execute payments, live tracking, ratings | Directly mutating order statuses, accessing driver/merchant personal info |

---

### 2. Functional Permissions Grid

| Resource / Action | `SUPER_ADMIN` | `ADMIN` | `AGENT` | `VENDOR` | `DELIVERY_PARTNER` | `CUSTOMER` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Browse Stores & Calculate Cart** | Yes | Yes | Yes | Own store | No | Yes |
| **Create Order & Execute Payment** | No | No | No | No | No | Yes |
| **Accept Order & Mark Prepared** | Override | Override | No | Yes (Own) | No | No |
| **Accept Task & Submit Delivery OTP** | Override | Override | No | No | Yes (Assigned) | No |
| **Inspect Rural Cutoff Batch Manifest**| Yes | Yes | Yes (Zone) | No | Assigned Batch | No |
| **Onboard Merchants & Drivers (KYC)** | Yes | Yes | Yes (Zone) | Self-signup | Self-signup | No |
| **View Double-Entry Ledger Summary** | Yes | Yes | Read-only | No | No | No |
| **Create Manual Ledger Adjustment** | Yes (Audited) | No | No | No | No | No |
| **Approve & Execute Bank Settlements**| Yes | Yes | No | No | No | No |
| **Configure System Fees & Zones** | Yes | Read-only | No | No | No | No |

---

### 3. Strict Franchise Agent Boundaries & Guardrails
Franchise Agents are local entrepreneurs who operate designated territories. While they possess administrative oversight of their local territory, strict boundary guardrails are enforced at the API layer:

```
+---------------------------------------------------------------------------------+
|                       AGENT PERMISSION ENFORCEMENT BOX                          |
|                                                                                 |
|  [ PERMITTED IN ASSIGNED ZONE ]              [ STRICTLY PROHIBITED ]            |
|  * Review merchant KYC applications          * Cannot modify platform commission|
|  * Monitor driver attendance & shifts        * Cannot create/edit ledger entries|
|  * Monitor 21:00 rural cutoff manifest       * Cannot view or modify other zones|
|  * View territory 60% franchise earnings     * Cannot approve bank payouts      |
+---------------------------------------------------------------------------------+
```

- **No Commission Rate Tampering:** Agents cannot edit `commissionPercent` or `restaurantPlatformCommissionPercent`. Commission calculations are hardcoded on the backend.
- **Ledger Write Immunity:** Agents have zero write permissions to `/api/v1/finance/entry` or any settlement reconciliation tables.
- **Zero Cross-Zone Access:** Every agent request with `zoneId` is validated against `req.user.assignedZoneId`. Any attempt to inspect or modify external zones returns HTTP 403 Forbidden.

---

### 4. Admin-Only Controls & Executive Safeguards
To prevent financial drift and operational abuse, critical controls require elevated administrative credentials:

1. **System Configuration Updates (`PATCH /api/v1/admin/config`):**
   - Strictly reserved for `SUPER_ADMIN`.
   - Modifies default radius, platform markup %, convenience fees, or rural cutoffs.
   - Automatically writes an immutable audit record via `auditMiddleware`.
2. **Settlement Processing (`POST /api/v1/settlements/process`):**
   - Restricted to `SUPER_ADMIN` and `ADMIN`.
   - Freezes verified period amounts, generates deterministic idempotency keys, and dispatches automated payout instructions.
3. **Audit Trail Inspection (`GET /api/v1/admin/audit-logs`):**
   - Read-only historical ledger capturing actor ID, target entity, timestamp, and field-level diffs (`oldValue` vs `newValue`).

---

### 5. Backend Middleware Enforcement Architecture
Access control is implemented in `backend/src/middleware/auth.js` and mounted across all API routes:

```
[ Incoming HTTP Request ]
          │
          ▼
   1. authenticate()        ──> Verifies Bearer JWT token; populates req.user
          │
          ▼
   2. authorize(...roles)   ──> Validates req.user.role against required role whitelist
          │
          ▼
   3. checkAgentRestrictions()──> Intercepts AGENT role requests:
          │                      - Blocks POST/PUT/PATCH/DELETE on /finance or /ledger
          │                      - Rejects payloads containing commissionPercent
          │                      - Blocks zoneId mismatch with req.user.assignedZoneId
          ▼
   [ Controller Execution ]
```

- **Fail-Closed Security:** Requests missing tokens or presenting expired signatures receive HTTP 401 Unauthorized immediately.
- **Explicit Role Matching:** Route decorators explicitly declare authorized roles (e.g., `authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN)`).
- **Audit Logging Decorator:** Sensitive mutations trigger `auditMiddleware(action, entity)`, ensuring complete operational accountability.

# QUIKOOO Production Readiness & Operational Hardening Checklist
**Version:** 1.0.0  
**Target:** QUIKOOO Hyperlocal Commerce & Delivery Ecosystem  
**Scope:** Backend Services, PostgreSQL 14 Database, Payment Gateways, Double-Entry Financial Ledger, and 5 Frontend Portals  

---

## 1. Environment Configuration Audit (`envs`)

- [ ] **Secret Isolation & Zero Defaults:**
  - `JWT_SECRET` must be generated using high-entropy crypto random bytes (minimum 256 bits):
    ```bash
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
    ```
  - Prohibit default development secrets (`quikooo-secret-key-change-in-prod`) in staging and production.
  - Razorpay / payment gateway production keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) strictly stored in secret managers (e.g. AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault).
- [ ] **Fail-Fast Environment Validation on Boot:**
  - Automated startup schema validation using `joi` or `dotenv-safe`.
  - Process exits immediately with exit code 1 if any mandatory environment variable (`DATABASE_URL`, `JWT_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) is missing or invalid.
- [ ] **Standard Production Environment Variables:**
  - `NODE_ENV=production`
  - `PORT=5000`
  - `TZ=Asia/Kolkata` (Enforces Indian Standard Time for the 21:00 rural cutoff and 05:00–08:00 dispatch window)
  - `DATABASE_URL=postgres://user:password@pg-host:5432/quikooo?sslmode=require`
  - `REDIS_URL=redis://:password@redis-host:6379/0`
  - `CORS_ALLOWED_ORIGINS=https://quikooo.com,https://admin.quikooo.com,https://merchant.quikooo.com,https://agent.quikooo.com`
- [ ] **Client Bundle Hygiene:**
  - All Vite applications (`customer-web`, `merchant-studio`, `driver-fleet`, `agent-app`, `admin-console`) audited to ensure only public `VITE_*` variables are bundled into build artifacts. Private server keys must never appear in frontend bundles.

---

## 2. Database Schema, Migrations & Connection Pooling (`migrations`)

- [ ] **PostgreSQL 14+ & PostGIS Extension:**
  - Verify `uuid-ossp`, `pgcrypto`, and `postgis` extensions are operational:
    ```sql
    SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'postgis');
    ```
- [ ] **Monetary Data Integrity:**
  - All financial fields strictly defined as `NUMERIC(12, 2)` (never `FLOAT`, `REAL`, or `DOUBLE PRECISION`):
    - Orders: `original_food_total`, `subtotal`, `platform_fee`, `delivery_fee`, `total_amount`, `vendor_settlement`, `delivery_partner_payout`
    - Financial Ledger: `amount`
    - Settlements: `gross_amount`, `deductions`, `net_payout`
- [ ] **Zero-Downtime Migration Pattern (Expand / Contract):**
  - **Phase A (Expand):** Add new nullable columns or tables; deploy dual-writing application code.
  - **Phase B (Backfill):** Run batch backfill script on historical rows.
  - **Phase C (Contract):** Switch reads to new structure; drop old columns/tables in subsequent maintenance window.
- [ ] **Migration Rollback Scripts:**
  - Every migration file in `backend/migrations/` has a corresponding verified `.down.sql` rollback script tested in pre-production staging.
- [ ] **Connection Pool Configuration:**
  - Max pool connections tuned to database instance size: `max: 20` per container.
  - Connection timeout: `connectionTimeoutMillis: 5000`.
  - Idle client timeout: `idleTimeoutMillis: 30000`.
  - Enforce `ssl: { rejectUnauthorized: true }` in production.

---

## 3. Disaster Recovery & Automated Backups (`backups`)

- [ ] **Continuous WAL Archiving (Point-In-Time Recovery):**
  - Continuous Write-Ahead Log (WAL) streaming to secure object storage (AWS S3 or GCS) with server-side encryption (`AES-256`).
  - Recovery Point Objective (RPO): < 5 minutes of data loss window.
- [ ] **Automated Daily Logical Dumps (`pg_dump`):**
  - Nightly compressed dumps scheduled at 02:00 IST (low traffic period):
    ```bash
    pg_dump -Fc --no-acl --no-owner "$DATABASE_URL" > /backup/quikooo_$(date +%Y%m%d_%H%M%S).dump
    ```
  - Automated transfer to secondary geographic cloud region with 30-day retention lifecycle policy.
- [ ] **Recovery Time Objective (RTO):**
  - RTO < 30 minutes to restore full platform operational readiness from snapshot.
- [ ] **Quarterly Recovery Drills:**
  - Periodic disaster drill: Restore latest backup dump to an isolated staging environment and execute full end-to-end integration test suite (`npm test`).

---

## 4. Webhook Replay & Payment Gateway Hardening (`webhook replay`)

- [ ] **HMAC-SHA256 Signature Verification:**
  - All incoming webhook payloads from Razorpay / payment gateways cryptographically validated using raw unparsed request buffer:
    ```javascript
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    ```
  - Unsigned or mismatching payloads immediately rejected with HTTP 401 Unauthorized.
- [ ] **Replay Attack Mitigation (Idempotency Cache):**
  - Gateways retry webhook deliveries upon transient network delays.
  - Unique transaction identifier (`payload.event_id` or `payment.id`) verified against an atomic Redis key with 7-day TTL or PostgreSQL `payments` table unique constraint (`payment_gateway_ref`).
  - If event ID has already been recorded as `CAPTURED`, acknowledge HTTP 200 OK immediately without double-posting ledger entries.
- [ ] **Order State Machine Authority:**
  - Client applications cannot transition an order to `PAYMENT_CONFIRMED` or `VENDOR_ACCEPTED` directly without verified gateway capture or authorized admin override.

---

## 5. Concurrency & Race Condition Safeguards (`concurrency`)

### 5.1 Stock Race / Inventory Depletion
- **Vulnerability:** Simultaneous orders placed for the last remaining stock item.
- **Safeguard:**
  - Atomic database decrement with inventory check:
    ```sql
    UPDATE products 
    SET stock_quantity = stock_quantity - $requested_qty, updated_at = CURRENT_TIMESTAMP
    WHERE id = $product_id AND stock_quantity >= $requested_qty
    RETURNING id, stock_quantity;
    ```
  - If row count returned is 0, transaction rolls back and aborts with `409 Conflict: INSUFFICIENT_STOCK`.

### 5.2 Double Webhook Concurrency
- **Vulnerability:** Two duplicate webhook requests arrive within milliseconds of each other.
- **Safeguard:**
  - PostgreSQL advisory lock scoped to order ID:
    ```sql
    SELECT pg_advisory_xact_lock(hashtext('order_webhook_' || $order_id));
    ```
  - The second concurrent request blocks until the first completes, then observes order status already at `PAYMENT_CONFIRMED` and terminates cleanly.

### 5.3 Double Complete Delivery (Driver Handshake)
- **Vulnerability:** Driver or flaky connection submits completion request twice, potentially crediting duplicate delivery payouts.
- **Safeguard:**
  - Atomic status transition with strict precondition check:
    ```sql
    UPDATE orders
    SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP
    WHERE id = $order_id AND status = 'OUT_FOR_DELIVERY'
    RETURNING id;
    ```
  - Mandatory 4-digit customer delivery OTP verification.
  - Delivery partner payout of ₹25.00 credited exactly once via `DELIVERY_PARTNER_PAYABLE` account.

### 5.4 Agent Reassignment Race Condition
- **Vulnerability:** Zone franchise agent reassigned while orders are actively in flight.
- **Safeguard:**
  - **Immutable Order Snapshot:** When an order is created, the active `agent_id` is stamped directly onto the `orders` record.
  - Ongoing orders credit the stamped agent ID. Reassigned agent only inherits subsequent orders created post-reassignment.

---

## 6. Financial Hardening & Settlement Dry Run (`settlement dry run`)

- [ ] **Canonical Unit Economics Audit (Original Food = ₹100.00):**
  - Customer Subtotal: **₹105.00** (5% menu markup added to original ₹100.00)
  - Platform Fee: **₹5.00**
  - Customer Delivery Fee: **₹25.00**
  - Total Customer Payable: **₹135.00**
  - Merchant Settlement: **₹90.00** (Original ₹100.00 - 10% commission ₹10.00)
  - Quikooo Gross Margin: **₹15.00** (₹5.00 markup + ₹10.00 commission)
  - GST on Margin (18%): **₹3.06**
  - Net Revenue Pool: **₹13.94**
  - Agent 60% Share: **₹8.36**
  - Quikooo 40% Share: **₹5.58**
  - Delivery Partner Payout: **₹25.00** (100% pass-through)
- [ ] **Double-Entry Ledger Balancing Verification:**
  - Prior to initiating weekly banking dispatches, execute automated trial balance check:
    ```sql
    SELECT 
      SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) AS total_debits,
      SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) AS total_credits,
      SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END) AS net_imbalance
    FROM financial_ledger;
    ```
  - Total Debits must strictly equal Total Credits (`net_imbalance == 0.00`).
- [ ] **Deterministic Settlement Idempotency Keys:**
  - Payout batches must generate deterministic keys: `SETTLE_{TYPE}_{ENTITY_ID}_{PERIOD_START}_{PERIOD_END}`.
  - Submitting the same batch twice produces 0 duplicate bank transfers.
- [ ] **No Edit-After-Paid Invariant:**
  - Direct updates (`UPDATE settlements SET net_payout = ... WHERE status = 'PAID'`) are blocked by service logic and database triggers.
  - Post-disbursement corrections require explicit `REVERSAL` adjustment records with compensating entries and audit justification.

---

## 7. Production Security Review (`security review`)

- [ ] **OWASP Top 10 Mitigation:**
  - **Injection:** 100% parameterized SQL queries (`$1, $2, ...`) via `pg` library; zero string concatenation.
  - **Broken Authentication:** JWT tokens with short expiry (15m access token + 7d rotating refresh token), verified on every private endpoint.
  - **Security Misconfiguration:** Disabled `X-Powered-By: Express` header via Helmet.
- [ ] **Rate Limiting & DDoS Defense:**
  - General API: 100 requests per 15 minutes per IP.
  - Authentication (`/api/v1/auth/*`): 10 requests per 15 minutes per IP.
  - Webhooks (`/api/v1/payments/webhook`): Verified HMAC-only with IP throttling.
- [ ] **Helmet Security Headers:**
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] **CORS Restriction:**
  - Whitelist strictly enforced. Wildcard `origin: *` prohibited in production.
- [ ] **Log Sanitization & Secrets Redaction:**
  - Passwords, hashes, OTPs, auth tokens, and gateway secrets stripped from application logs and error responses via `redactSecrets()` utility in `backend/src/security.js`.

---

## 8. Pre-Flight Verification Sign-Off

| Verification Item | Command / Check | Result | Sign-Off Date |
|---|---|---|---|
| Monorepo Build | `npm run build` | Passed across all 5 apps | 2026-10-05 |
| Full Test Suite | `npm test` | Passed (Backend, Design System, 5 Portals) | 2026-10-05 |
| Canonical Order 100 Math | `calculateOrderLedger()` | 13.94 net pool -> 8.36 Agent + 5.58 Quikooo | 2026-10-05 |
| Vendor Settlement 90 | `calculateVendorSettlement()` | 100 food - 10% comm = 90.00 | 2026-10-05 |
| Idempotency & Paid Lock | `SettlementService.assertSettlementMutable()` | Throws error on paid edit attempts | 2026-10-05 |
| Audit Trail Integrity | `validateAuditEntry()` | Actor, entity, old, new, time validated | 2026-10-05 |

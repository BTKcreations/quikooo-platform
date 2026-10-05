# QUIKOOO Financial Workflow & Double-Entry Accounting
**Monetary Flow, Ledger Mechanics & Settlement Safeguards** | Version 2.0.0 | October 2026

---

### 1. Step-by-Step Money Flow Walkthrough (Canonical ₹100 Order)
When a customer purchases a food item with a merchant list price of ₹100.00:

```
Step 1: Customer Pays ₹135.00
  ├── Menu Subtotal:     ₹105.00  (₹100.00 Original + ₹5.00 Menu Markup)
  ├── Platform Fee:        ₹5.00  (Convenience fee)
  └── Delivery Fee:       ₹25.00  (100% Pass-Through)
                                  
Step 2: Instant Custody Allocation
  ├── Vendor Settlement:  ₹90.00  (Original ₹100.00 - 10% Commission ₹10.00)
  ├── Delivery Partner:   ₹25.00  (100% of Delivery Fee credited to rider)
  └── Quikooo Gross Pool: ₹15.00  (₹5.00 Markup + ₹10.00 Commission)
                                  
Step 3: Tax & Franchise Revenue Split
  ├── Quikooo Gross:      ₹15.00
  ├── GST (18% on Taxable):-₹3.06  (Government Tax Payable)
  ├── Net Adjusted Pool:  ₹13.94
  ├── Zone Agent (60%):    ₹8.36  (Franchisee territory earnings)
  └── Quikooo HQ (40%):    ₹5.58  (Platform retained corporate margin)
```

---

### 2. Double-Entry Balanced Ledger Entries
Upon verified payment confirmation (`PAYMENT_CONFIRMED`), the system writes exactly 6 balanced entries to `financial_ledger`. Total Debits must equal Total Credits:

| # | Ledger Account Name | Entry Type | Amount (₹) | Beneficiary Entity | Accounting Purpose |
|---|---|---|---|---|---|
| 1 | `ESCROW_CUSTOMER_RECEIVABLE` | **DEBIT** | **₹135.00** | Customer / Order | Cash inflow captured in platform escrow |
| 2 | `VENDOR_PAYABLE` | **CREDIT**| **₹90.00** | Merchant | Net payable to vendor (100 - 10 comm) |
| 3 | `DELIVERY_PARTNER_PAYABLE` | **CREDIT**| **₹25.00** | Driver | Pass-through delivery fee owed to rider |
| 4 | `TAX_PAYABLE` | **CREDIT**| **₹3.06** | Government | GST liability owed to tax authorities |
| 5 | `AGENT_COMMISSION_PAYABLE` | **CREDIT**| **₹8.36** | Franchise Agent | 60% share of net post-tax revenue |
| 6 | `QUIKOOO_PLATFORM_REVENUE` | **CREDIT**| **₹5.58** | QUIKOOO HQ | 40% corporate retained earnings |
| **SUM** | **Total Balanced Ledger** | **BALANCED**| **Debit: ₹135.00** | **Credit: ₹135.00** | **Net Imbalance: ₹0.00** |

---

### 3. Immutable Order Snapshot & Strict NUMERIC Rule
- **The NUMERIC(12,2) Rule:** Floating-point data types (`FLOAT`, `DOUBLE`, `REAL`) are strictly banned across all financial database columns and calculations. All monetary fields use exact fixed-point `NUMERIC(12, 2)` to eliminate IEEE-754 decimal rounding drift.
- **Order Financial Snapshot Fields:** Every order permanently records its pricing terms at time of purchase:
  - `original_food_total`: Merchant listed price baseline (e.g. ₹100.00)
  - `subtotal`: Customer food price after 5% adjustment (e.g. ₹105.00)
  - `platform_fee`: Convenience charge (e.g. ₹5.00)
  - `delivery_fee`: Logistics fee (e.g. ₹25.00)
  - `total_amount`: Total invoice amount (e.g. ₹135.00)
  - `vendor_payout`: Net vendor entitlement (e.g. ₹90.00)
  - `quikooo_gross_revenue`: Margin pool (e.g. ₹15.00)
  - `tax_rate` / `tax_amount`: Applied GST parameters (e.g. 0.18 / ₹3.06)
  - `agent_commission_share`: Franchise share amount (e.g. ₹8.36)
  - `quikooo_revenue_share`: Corporate margin amount (e.g. ₹5.58)

---

### 4. Settlement Models & Disbursement Cycles

```
[ Financial Ledger (Accruals) ] ──> Weekly Cycle ──> [ Bank Payout Batches ]
```

| Entity Type | Settlement Formula | Canonical (₹100 Order) | Settlement Schedule |
|---|---|---|---|
| **Vendor** | $\text{Food Total} - \text{Commission (10\%)} - \text{Deductions}$ | **₹90.00** | T+2 Rolling or Weekly Batch |
| **Zone Agent** | $\text{Net Adjusted Margin Pool} \times 60\%$ | **₹8.36** | Weekly (Every Monday 09:00 IST) |
| **Delivery Partner**| $\text{Completed Deliveries} \times ₹25.00$ | **₹25.00 / drop** | Daily Instant or Weekly Batch |

---

### 5. Financial Safeguards & Anti-Fraud Invariants
1. **Deterministic Idempotency Keys:** Every disbursement batch generates a strict key: `SETTLE_{TYPE}_{ENTITY_ID}_{PERIOD_START}_{PERIOD_END}`. Retrying a payout request will never cause duplicate bank transfers.
2. **No Edit-After-Paid Safeguard:** Once a settlement record enters status `PAID` or `PROCESSED`, it is **cryptographically immutable**. Database triggers and application guards throw fatal errors on update attempts.
3. **Compensating Reversals:** If an error occurs on a paid settlement, accounting standards require issuing a signed `REVERSAL` record with negative net payout and mandatory audit rationale rather than altering history.
4. **Refund & Promotion Funding:** Customer refunds reverse the escrow hold. Platform discount promotions are strictly funded from Quikooo marketing budgets, never deducted from merchant baseline payouts.

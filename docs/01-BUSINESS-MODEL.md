# QUIKOOO Business Model & Revenue Architecture
**Executive Economics & Franchise Structure** | Version 2.0.0 | October 2026

---

### 1. Product Categories & Single-Vendor Cart MVP
QUIKOOO focuses on four high-frequency hyperlocal categories:
1. **Fresh Meals & Dining:** Cloud kitchens and local restaurants.
2. **Fresh Produce & Dairy:** Milk, fruits, and vegetables harvested locally.
3. **Hyperlocal Grocery:** Daily pantry essentials and dry goods.
4. **Convenience & Pharmacy:** Emergency essentials delivered rapidly.

#### Single-Vendor Cart Constraint (MVP Guardrail)
To ensure reliable SLA adherence and zero order confusion, the MVP enforces a **strict single-vendor cart rule**:
- Customers can only add items from one merchant per checkout.
- If a customer selects an item from a new merchant, the app prompts to replace the current cart.
- **Operational Rationale:** Eliminates split-trip routing, multiple driver dispatches for a single order, thermal food degradation, and double delivery cost penalties.

---

### 2. Revenue Streams Breakdown
QUIKOOO generates revenue through a four-part fee structure designed for trust and partner alignment:

| Revenue Component | Rate / Amount | Paid By | Flow / Allocation |
|---|---|---|---|
| **Menu Markup** | **5.0%** | Customer | Added to original list price; forms gross margin |
| **Merchant Commission** | **10.0%** | Vendor | Charged **strictly on original price**; forms gross margin |
| **Platform Convenience Fee** | **₹5.00** | Customer | Fixed checkout service fee; platform operational pool |
| **Delivery Fee (Pass-Through)** | **₹25.00** | Customer | **100% passed to delivery partner** (zero platform retention) |

```
                       CUSTOMER INVOICE (₹135.00)
    +------------------------------+---------------------------+
    | Food Subtotal: ₹105.00       | Platform Fee: ₹5.00       |
    | (₹100 Orig + ₹5 Markup)      | Delivery Fee: ₹25.00      |
    +------------------------------+---------------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
   VENDOR SETTLEMENT (₹90.00)                        DELIVERY PARTNER (₹25.00)
   (₹100 Original - ₹10 Comm)                        (100% Pass-Through Fee)
         |
         +-------------------------+
                                   v
                      QUIKOOO GROSS POOL (₹15.00)
                      [ ₹5 Markup + ₹10 Commission ]
                                   |
                                   v Less GST (18% on Taxable Pool): -₹3.06
                                   |
                      NET REVENUE POOL (₹13.94)
                     /                         \
                    / 60%                       \ 40%
                   v                             v
          ZONE AGENT: ₹8.36              QUIKOOO HQ: ₹5.58
```

---

### 3. Agent Franchise Partnership (60 / 40 Split)
QUIKOOO scales via localized franchise agents who own and operate designated zones:
- **Agent Franchisee (60%):** Responsible for merchant acquisition, local rider recruitment, and rural aggregation. Receives 60% of the net post-tax platform revenue pool.
- **QUIKOOO HQ (40%):** Provides cloud software, payment gateways, product updates, and brand marketing. Retains 40% of the net pool.

---

### 4. Worked Economics: 1 Order vs. 1,000 Orders

| Dimension | 1 Order (₹100 Original) | 1,000 Orders (₹100 Avg Basket) |
|---|---|---|
| **Merchant Original Sales (GMV)** | ₹100.00 | ₹100,000.00 |
| **Customer Menu Markup (+5%)** | ₹5.00 | ₹5,000.00 |
| **Customer Food Subtotal** | ₹105.00 | ₹105,000.00 |
| **Platform Convenience Fee** | ₹5.00 | ₹5,000.00 |
| **Customer Delivery Inflow** | ₹25.00 | ₹25,000.00 |
| **Gross Customer Invoiced (Collection)**| **₹135.00** | **₹135,000.00** |
| **Merchant Settlement Payout** | **₹90.00** (₹100 - ₹10) | **₹90,000.00** |
| **Delivery Partner Payout (Pass-Through)**| **₹25.00** | **₹25,000.00** |
| **Quikooo Gross Revenue** | **₹15.00** | **₹15,000.00** |
| **GST / Tax Deduction (18%)** | ₹3.06 | ₹3,060.00 |
| **Net Revenue Pool** | **₹13.94** | **₹13,940.00** |
| **Local Zone Agent Share (60%)** | **₹8.36** | **₹8,364.00** |
| **QUIKOOO Corporate Share (40%)** | **₹5.58** | **₹5,576.00** |

---

### 5. Why the Old 12% Model Was Rejected (Strict Prohibition)

```
[ FORBIDDEN OLD MODEL ]                     [ APPROVED QUIKOOO MODEL ]
Original:  ₹100.00                         Original:  ₹100.00
Markup 5%: ₹105.00                         Markup 5%: ₹105.00
Comm 12%:  ₹105.00 × 12% = ₹12.60          Comm 10%:  ₹100.00 × 10% = ₹10.00
Vendor:    ₹100.00 - ₹12.60 = ₹87.40       Vendor:    ₹100.00 - ₹10.00 = ₹90.00
  ❌ Penalizes merchant on markup             ✅ Clean, predictable merchant math
  ❌ Causes merchant churn & distrust         ✅ Guaranteed ₹90 return on ₹100 item
```

1. **Double Penalization:** In legacy aggregator models, applying commission on marked-up prices (`₹105 × 12% = ₹12.60`) unfairly extracts margin from the merchant's list price, leaving them with only ₹87.40.
2. **Merchant Trust & Onboarding Velocity:** In the Indian hyperlocal market, merchants reject variable deduction models. Quikooo guarantees: **On a ₹100 item, the merchant always receives exactly ₹90.00 net.**
3. **Audit Compliance:** Calculating commission strictly on the merchant's original baseline provides clean tax invoices and eliminates disputes during reconciliation.

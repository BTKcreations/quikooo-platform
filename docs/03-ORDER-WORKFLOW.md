# QUIKOOO Order Lifecycle & State Machine Workflow
**State Transition Architecture, Actors & Audit Traceability** | Version 2.0.0 | October 2026

---

### 1. Full Order Lifecycle State Machine
QUIKOOO enforces a deterministic state machine across urban on-demand deliveries, rural overnight batches, and cancellation exceptions:

```
                    [ 1. ORDER_PLACED ]
                            │
               Payment Gateway Webhook (HMAC)
                            ▼
                  [ 2. PAYMENT_CONFIRMED ] ─────────────────────────┐
                            │                                       │ (Rural Zone)
        +-------------------+-------------------+                   ▼
        │ (Urban / Sub-Urban)                   │         [ SCHEDULED_FOR_NEXT_DAY ]
        ▼                                       │ (Cancel)          │
[ 3. VENDOR_ACCEPTED ]                          │           21:00 Cutoff Passed
        │                                       │                   ▼
        ▼                                       │      [ READY_FOR_MORNING_DISPATCH ]
  [ 4. PREPARING ]                              │                   │
        │                                       │                   │
        ▼                                       │                   │
[ 5. READY_FOR_PICKUP ] ◄───────────────────────┼───────────────────┘
        │                                       │
        ▼                                       │
[ 6. DELIVERY_ASSIGNED ]                        │
        │                                       │
        ▼                                       │
[ 7. DELIVERY_ACCEPTED ]                        │
        │                                       │
  Pickup OTP Handshake                          ▼
        ▼                               [ CANCELLED ]
  [ 8. PICKED_UP ]                              │
        │                                       ▼
        ▼                               [ REFUND_INITIATED ]
[ 9. OUT_FOR_DELIVERY ]                         │
        │                                       ▼
  Delivery OTP Handshake                  [ REFUNDED ]
        ▼                               (Terminal State)
 [ 10. DELIVERED ]
 (Terminal State)
```

---

### 2. State-by-State Actor Responsibilities
Every state transition is initiated by an explicit actor with specific system validations:

| State | Primary Actor | Action Taken | System Preconditions & Validation |
|---|---|---|---|
| `ORDER_PLACED` | **Customer** | Submits single-vendor cart checkout | Validates items, merchant open status, within 2km |
| `PAYMENT_CONFIRMED`| **System** | Payment gateway HMAC webhook verified | Client transitions blocked; creates ledger entries |
| `SCHEDULED_FOR_NEXT_DAY`| **System** | Routed to tomorrow's rural batch | Order placed in RURAL zone prior to 21:00 IST |
| `READY_FOR_MORNING_DISPATCH`| **Agent / System** | Locks order into morning delivery run | 21:00 IST cutoff passed; batch manifest created |
| `VENDOR_ACCEPTED` | **Vendor** | Kitchen acknowledges ticket on POS | Audio chime triggered; prep time estimated |
| `PREPARING` | **Vendor** | Kitchen begins meal preparation | Order items cannot be edited |
| `READY_FOR_PICKUP` | **Vendor** | Marks order packed; generates Pickup OTP| System triggers driver assignment engine |
| `DELIVERY_ASSIGNED`| **System / Driver**| Offers order to closest online rider | Rider within 2km; status `is_online = true` |
| `DELIVERY_ACCEPTED`| **Driver** | Driver accepts delivery assignment | Rider navigates to merchant location |
| `PICKED_UP` | **Driver & Vendor**| Driver enters 4-digit Vendor Pickup OTP| Validates matching OTP before custody handoff |
| `OUT_FOR_DELIVERY` | **Driver** | Driver begins transit to customer | Live GPS stream active via Socket.IO |
| `DELIVERED` | **Driver & Cust.**| Driver enters 4-digit Customer Delivery OTP| Final state; ₹25 payout credited to driver |
| `CANCELLED` | **Cust. / Vendor** | Cancels unfulfilled order | Only allowed before driver custody handoff |
| `REFUND_INITIATED` | **System** | Initiates reverse payment transfer | Validates cancellation cause & ledger status |
| `REFUNDED` | **System** | Gateway confirms credit to source account| Terminal refund state; reversal ledger posted |

---

### 3. Transition Rules & Security Guards
1. **Zero Client Authority on Money:** A client application can never set `PAYMENT_CONFIRMED` or `DELIVERED` directly. Only cryptographically verified payment webhooks can confirm payment, and only a verified OTP handshake can complete delivery.
2. **Strict Forward Progression:** Orders cannot skip lifecycle steps (e.g. `ORDER_PLACED` cannot transition directly to `PICKED_UP` or `DELIVERED`).
3. **Immutability of Terminal States:** Once an order reaches `DELIVERED` or `REFUNDED`, its status is permanently locked. No further transitions are permitted.

---

### 4. Audit Trail: `order_status_history`
Every state change creates an unalterable, chronological log entry for audit and compliance:

| Field | Purpose | Example |
|---|---|---|
| `order_id` | Foreign key linking to target order | `ord_blr_883921` |
| `from_status` | Pre-existing order state | `READY_FOR_PICKUP` |
| `to_status` | Newly assumed order state | `PICKED_UP` |
| `actor_type` | Role of user or automated worker | `DELIVERY_PARTNER` |
| `actor_id` | Identifier of person making the change | `usr_driver_kumar_12` |
| `metadata` | Context (OTP validation, notes, coordinates) | `{"otp_verified": true, "lat": 12.935, "lng": 77.624}` |
| `created_at` | High-precision ISO timestamp | `2026-10-05T10:14:22.184Z` |

# QUIKOOO Board Documentation Index
**Authoritative Documentation Suite & Executive Reading Roadmap** | Version 2.0.0 | October 2026

---

### 1. Master Documentation Index (00 – 10 + Operational Artifacts)

| Document | File Path | Focus & Executive Summary |
|---|---|---|
| **00. Executive Summary** | [`docs/00-EXECUTIVE-SUMMARY.md`](file:///root/quikooo-platform/docs/00-EXECUTIVE-SUMMARY.md) | High-level platform briefing, canonical ₹100 unit economics snapshot, and operating tiers. |
| **01. Business Model** | [`docs/01-BUSINESS-MODEL.md`](file:///root/quikooo-platform/docs/01-BUSINESS-MODEL.md) | Authoritative revenue math (5% markup, 10% commission on base, ₹5 fee, ₹25 delivery) and single-vendor cart rule. |
| **02. Zone Operating Model** | [`docs/02-ZONE-OPERATING-MODEL.md`](file:///root/quikooo-platform/docs/02-ZONE-OPERATING-MODEL.md) | Urban/Sub-Urban 2.0 km PostGIS geofencing, territory franchising, and zone snapshot architecture. |
| **03. Order Workflow** | [`docs/03-ORDER-WORKFLOW.md`](file:///root/quikooo-platform/docs/03-ORDER-WORKFLOW.md) | Deterministic 10-state lifecycle state machine, actor transitions, and audit traceability. |
| **04. Financial Workflow** | [`docs/04-FINANCIAL-WORKFLOW.md`](file:///root/quikooo-platform/docs/04-FINANCIAL-WORKFLOW.md) | Double-entry balanced accounting ledger, 60/40 franchise profit split, and automated settlement safeguards. |
| **05. Rural Batch Workflow** | [`docs/05-RURAL-BATCH-WORKFLOW.md`](file:///root/quikooo-platform/docs/05-RURAL-BATCH-WORKFLOW.md) | Rural village cluster model with 21:00 IST cutoff lock, overnight aggregation, and 05:00–08:00 AM morning dispatch. |
| **06. Delivery Workflow** | [`docs/06-DELIVERY-WORKFLOW.md`](file:///root/quikooo-platform/docs/06-DELIVERY-WORKFLOW.md) | 4-tier proximity dispatch algorithm, 2-step OTP handshake (pickup & delivery), and ₹25 logistics pass-through. |
| **07. Roles & RBAC** | [`docs/07-ROLES-RBAC.md`](file:///root/quikooo-platform/docs/07-ROLES-RBAC.md) | 6-role permission matrix, strict franchise agent boundaries (no ledger/commission edits), and middleware enforcement. |
| **08. Portal Guides** | [`docs/08-PORTAL-GUIDES.md`](file:///root/quikooo-platform/docs/08-PORTAL-GUIDES.md) | Operational guides for all 5 Vite PWAs, responsive adaptive layouts, and step-by-step daily runbooks. |
| **09. Architecture & API** | [`docs/09-ARCHITECTURE-AND-API.md`](file:///root/quikooo-platform/docs/09-ARCHITECTURE-AND-API.md) | Monorepo layout, Node/PostGIS/Socket.IO stack, 14 domain modules, key API table, and zero-trust security rules. |
| **10. Implementation Status**| [`docs/10-IMPLEMENTATION-STATUS.md`](file:///root/quikooo-platform/docs/10-IMPLEMENTATION-STATUS.md)| Phase 1–6 build scorecard, 133/133 tests passing, production bundle metrics, theme reuse, and launch gaps. |
| **Full Platform Plan** | [`docs/FULL-PLATFORM-PLAN.md`](file:///root/quikooo-platform/docs/FULL-PLATFORM-PLAN.md) | Comprehensive master architectural specification, component breakdown, and technical blueprint. |
| **Production Checklist** | [`docs/PRODUCTION-CHECKLIST.md`](file:///root/quikooo-platform/docs/PRODUCTION-CHECKLIST.md) | Pre-flight operational hardening checklist covering secrets isolation, fail-fast boot, and security defenses. |
| **Self-Test Guide** | [`docs/SELF-TEST-GUIDE.md`](file:///root/quikooo-platform/docs/SELF-TEST-GUIDE.md) | 5-minute operational smoke-testing runbook for backend APIs, pricing formulas, and portal interfaces. |

---

### 2. Recommended Reading Paths for Stakeholders

```
                                  [ START HERE ]
                                         │
                                         ▼
                            [ 00-EXECUTIVE-SUMMARY.md ]
                                         │
             ┌───────────────────────────┼───────────────────────────┐
             ▼                           ▼                           ▼
    [ BOARD & INVESTORS ]        [ OPERATIONS & FRANCHISE ]   [ ENGINEERING & AUDIT ]
             │                           │                           │
             ▼                           ▼                           ▼
    01-BUSINESS-MODEL.md        02-ZONE-OPERATING-MODEL.md  03-ORDER-WORKFLOW.md
             │                           │                           │
             ▼                           ▼                           ▼
   04-FINANCIAL-WORKFLOW.md     05-RURAL-BATCH-WORKFLOW.md  06-DELIVERY-WORKFLOW.md
             │                           │                           │
             ▼                           ▼                           ▼
 10-IMPLEMENTATION-STATUS.md    08-PORTAL-GUIDES.md         07-ROLES-RBAC.md
                                                                     │
                                                                     ▼
                                                            09-ARCHITECTURE-AND-API.md
                                                                     │
                                                                     ▼
                                                            PRODUCTION-CHECKLIST.md
```

#### Path A: Board Members, Directors & Investors (15-Minute Briefing)
> **Recommended Sequence:** `00` → `01` → `04` → `10`
1. **00-EXECUTIVE-SUMMARY.md**: Rapid orientation on business tiers and ecosystem vision.
2. **01-BUSINESS-MODEL.md**: Clear unit economics, transparent 5% markup + 10% commission, and single-vendor cart constraint.
3. **04-FINANCIAL-WORKFLOW.md**: Double-entry accounting integrity and 60% franchise / 40% HQ split mechanics.
4. **10-IMPLEMENTATION-STATUS.md**: Certified build progress, 133/133 tests passing, and go-live launch requirements.

#### Path B: Territory Franchisees & Zone Operations
> **Recommended Sequence:** `00` → `02` → `05` → `08`
- Explains territory boundaries, rural 21:00 batch cutoff mechanics, and step-by-step portal daily runbooks for merchants, drivers, and agents.

#### Path C: Engineering, Infrastructure & Compliance Auditors
> **Recommended Sequence:** `03` → `06` → `07` → `09` → `PRODUCTION-CHECKLIST.md`
- Audits deterministic state machines, two-step OTP handshake, fail-closed RBAC middleware, 14 API modules, and pre-flight security hardening.

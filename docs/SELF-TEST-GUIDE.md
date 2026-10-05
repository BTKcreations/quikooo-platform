# QUIKOOO Self-Test Guide (5 min)

## 1. Backend API (no DB needed, mock mode)
```bash
npm --prefix backend start
# open http://localhost:5001/health (or 5000)
curl -s http://localhost:5001/health
curl -s -X POST http://localhost:5001/api/v1/orders/calculate \
 -H 'Content-Type: application/json' \
 -d '{"vendorId":"v1","items":[{"productId":"p1","quantity":1}],"addressId":"a1"}'
# expect subtotal 105, platformFee 5, deliveryFee 25, payable 135 (for 100 base)
```

## 2. Pricing check (new 5%+10% model)
```bash
npm --prefix backend test
# 45/45 pass: 100 → adjust 5, price 105, commission 10 (on 100 NOT 105), settlement 90, gross 15
```

## 3. Portals (each Vite PWA, theme #059669)
```bash
npm run build  # builds all 5
npx vite preview --port 4173 --project apps/customer-web  # or:
npm run dev --workspace=customer-web     # :3000 /customer /store/:id /cart /orders
npm run dev --workspace=merchant-studio  # :3001 /merchant orders board
npm run dev --workspace=driver-fleet     # :3002 /driver tasks + OTP + ₹25 payout
npm run dev --workspace=agent-app        # :3003 /agent batch cutoff 21:00, earnings 60/40
npm run dev --workspace=admin-console    # :3004 /admin finance ledger 90/15/3.06/8.36/5.58
```

## 4. Rural cutoff manual test
- Agent App → /agent/batch: 20:30 shows eligible, 21:00 shows CLOSED, window 05:00–08:00.

## 5. Full suite
```bash
npm test  # expect 113/113 across backend + 6 frontend workspaces
```

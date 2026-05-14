```
─────────────────────────────────────
  Pre-Deploy Check Results
─────────────────────────────────────
  ~ Build             SKIP  (shell execution not permitted in this agent context)
  ✓ Tenant ID         PASS
  ✓ isBookingExpired  PASS
  ✓ 60s expiry        PASS
  ✓ Client amount     PASS
─────────────────────────────────────
  4 checks passed. 1 check skipped (Build — needs shell permission).
─────────────────────────────────────
```

**Check 2 — Tenant ID:** `'court_001'` appears only in `src/constants.js:1`. No regressions.

**Check 3 — isBookingExpired:** Zero matches for `this.isBookingExpired` in `src/`. The imported function is used correctly everywhere.

**Check 4 — 60-second expiry:** Two `60` matches in `src/views/PaymentView.vue:92-93` are display-only math (`/ 60`, `% 60`) for formatting `timeLeft` (initialized to `900`) as MM:SS — not expiry logic. One match in `functions/index.js:48` is `15 * 60 * 1000` (15-minute Omise charge window). Neither is a regression.

**Check 5 — Client amount:** `createCharge` destructures `request.data` without `amount` (`source, token, courtId, date, hours, phone, tenantId, userId, displayName`). Amount is computed server-side from Firestore settings. Security fix is intact.

**Build check:** Requires running `npm run build` — the Bash/PowerShell tools were denied permission in this agent context. You should run `npm run build` manually before deploying to catch any import errors or broken references.

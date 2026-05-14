# Pre-Deploy Sanity Check — Tennis Booking

**Date:** 2026-05-14
**Project:** `C:\Storage\Antigravity\appx\tennis-booking`
**Stack:** Vue 3 + Vite (frontend) | Firebase Cloud Functions v2 (backend)

Note: Shell command execution was sandboxed during this check. No `npm run build` was executed; all findings are from static code analysis + the existing `dist/` artifact.

---

### 1. Build Status

A prior `dist/` exists with the expected chunked output:

| Chunk | Size |
|---|---|
| `index-BpPQNia1.js` (app code) | 40 KB |
| `vendor-firebase-D7NMyMMb.js` | 340 KB |
| `vendor-liff-Cqlzii0j.js` | 118 KB |
| `vendor-misc-BLJXy8wI.js` (date-fns + pinia + vue-router) | 121 KB |
| Admin lazy chunks (8 files: 4 JS + 4 CSS) | per route |

Structure looks valid. Manual chunks match `vite.config.js`. Admin views are correctly lazy-loaded. The `dist/index.html` references hashed assets correctly and includes the Omise CDN script tag.

**Action:** Run `npm run build` fresh before deploying — the existing `dist/` may be stale.

---

### 2. Environment Variables

`.env` is fully populated. All 9 `VITE_*` keys are set. Firebase project is `tennis-booking-2325d`, region `asia-southeast1` — consistent across `src/firebase.js` and `functions/index.js`.

**Warning:** `VITE_OMISE_PUBLIC_KEY` is still a **test key** (`pkey_test_63bghetmlex6v6n314d`). Switch to `pkey_live_...` before going live.

---

### 3. Cloud Functions

Three functions in `functions/index.js` (Node 22, region `asia-southeast1`):

| Function | Type | Required Secret |
|---|---|---|
| `createCharge` | `onCall` | `OMISE_SECRET_KEY` |
| `checkBookingStatus` | `onCall` | `OMISE_SECRET_KEY` |
| `omiseWebhook` | `onRequest` | `OMISE_WEBHOOK_SECRET` |

Both secrets must be provisioned in GCP Secret Manager before deployment.

Server-side price calculation is correct — the client-supplied `amount` is ignored; the server recalculates from Firestore settings.

`return_uri` uses `process.env.GCLOUD_PROJECT` to build the `.web.app` URL — valid GCP runtime env var.

**Minor:** `functions/index.js:192` logs the full Omise webhook payload with `JSON.stringify(event)`. Consider redacting in production.

---

### 4. Code Bugs and Issues Found

**Bug (runtime crash): `this.isBookingExpired()` in AdminSchedule.vue**

`src/views/admin/AdminSchedule.vue` line 301 calls `this.isBookingExpired(b)` inside the `slotsMap` computed property. `isBookingExpired` is imported as a plain module-level utility — it is not a Vue method, so `this.isBookingExpired` is `undefined` at runtime. This throws `TypeError: this.isBookingExpired is not a function` whenever the admin schedule grid renders.

Fix: Change `this.isBookingExpired(b)` to `isBookingExpired(b)`.

**Security: No admin role restriction**

`AdminLogin.vue` signs in with Google but does not check the user's email or UID against any allowlist. Any Google account can authenticate and access all admin routes. Add an email allowlist check or Firestore-based role document for production.

**Minor: Hardcoded stat in AdminDashboard**

`AdminDashboard.vue` line 29 shows "สนามที่ว่างตอนนี้: 3 / 4" as a hardcoded literal string, not computed data.

**Minor: Unimplemented button**

`AdminDashboard.vue` line 37 has a "+ เพิ่มการจอง (Manual)" button with no `@click` handler.

---

### 5. Firebase Configuration Gaps

**No `hosting` block in `firebase.json`**: The file only configures functions. If the frontend is deployed via Firebase Hosting (implied by the `.web.app` `return_uri` in `createCharge`), a `hosting` section pointing to `dist/` is required.

**No Firestore security rules**: No `firestore.rules` file exists. Without rules, all Firestore collections are unprotected. Rules must be written and deployed alongside the app.

**No `.firebaserc`**: Confirm `firebase use tennis-booking-2325d` has been run before deploying.

---

### 6. Summary of Action Items

| Priority | Item |
|---|---|
| HIGH | Fix `this.isBookingExpired(b)` in `AdminSchedule.vue:301` — call `isBookingExpired(b)` directly |
| HIGH | Add Firestore security rules (`firestore.rules`) and deploy them |
| HIGH | Provision `OMISE_SECRET_KEY` and `OMISE_WEBHOOK_SECRET` in GCP Secret Manager |
| HIGH | Add `hosting` block to `firebase.json` (or confirm a different frontend hosting path) |
| MEDIUM | Switch `VITE_OMISE_PUBLIC_KEY` from `pkey_test_...` to `pkey_live_...` |
| MEDIUM | Add admin role restriction (email allowlist) in `AdminLogin.vue` |
| LOW | Remove verbose webhook payload `console.log` from `functions/index.js:192` |
| LOW | Replace hardcoded "3 / 4" stat in `AdminDashboard.vue` with computed data |
| LOW | Implement the Manual Booking button in `AdminDashboard.vue` |
| INFO | Run `npm run build` fresh before deploying (existing `dist/` may be stale) |

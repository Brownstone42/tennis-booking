# Pre-Deploy Sanity Check Report

**Project:** Tennis Booking (Vue 3 + Firebase)
**Date:** 2026-05-14

---

## Summary

The codebase is functionally solid. The payment flow, admin tooling, and real-time slot tracking are well-implemented. Two issues must be fixed before deploying to production. Several additional medium/low items are documented below.

---

## CRITICAL — Must Fix Before Deploy

### 1. `.env` is NOT in `.gitignore` — credentials will be exposed on any push

The `.gitignore` has no `.env` entry. The `.env` file contains real credentials: all 6 Firebase config keys, the LIFF ID, and `VITE_OMISE_PUBLIC_KEY=pkey_test_63bghetmlex6v6n314d`. If the repo is ever pushed to GitHub or another remote, these are public.

**Fix:** Add `.env` to `.gitignore`.

The Omise public key is currently a test key (`pkey_test_`). Before going live, swap it for the production key (`pkey_`). Also confirm that `OMISE_SECRET_KEY` and `OMISE_WEBHOOK_SECRET` in Firebase Secret Manager are production values, not test values.

### 2. `firebase.json` has no `hosting` block — SPA will 404 on direct URL access

`firebase.json` only has a `functions` block. Without a `hosting` entry (with `"rewrites": [{ "source": "**", "destination": "/index.html" }]`), direct navigation to `/payment`, `/success`, `/checkout`, etc. returns a 404. The `return_uri` in `createCharge` — `https://${process.env.GCLOUD_PROJECT}.web.app/success` — also depends on Firebase Hosting being active.

**Fix:** Add a hosting block to `firebase.json`:
```json
"hosting": {
  "public": "dist",
  "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
  "rewrites": [{ "source": "**", "destination": "/index.html" }]
}
```
If the frontend deploys elsewhere (Cloudflare, etc.), confirm the `return_uri` in `functions/index.js` line 54 points to the actual live domain.

---

## MEDIUM — Should Review Before Deploy

### 3. Omise public key is a test key

`VITE_OMISE_PUBLIC_KEY=pkey_test_63bghetmlex6v6n314d` — real payments will not be processed in production until this is swapped for a live key.

### 4. Admin login has no email allowlist — any Google account can access admin

`AdminLogin.vue` signs in via `signInWithPopup` and immediately redirects to the dashboard. There is no email check. The `requireAdminAuth` route guard only checks that a Firebase session exists, not whose session it is.

Any Google account that reaches `/admin/login` can take full control of venue settings, slots, and all booking records.

**Fix:** After sign-in, check `user.email` against an allowlist and call `signOut(auth)` if not allowed.

### 5. Admin dashboard fetches ALL bookings with no limit or date filter

`AdminDashboard.vue` runs `query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))` with no `limit()`. This grows unbounded as the venue accumulates data, increasing Firestore read costs.

### 6. Webhook logs full raw payload to Cloud Functions logs

`functions/index.js` line 192: logs the full payload (amounts, metadata, customer references) to GCP logs. In production, log only `event.key` and `event.data.id`.

---

## LOW — Nice to Fix

### 7. `generateSlots` single batch will exceed Firestore's 500-doc limit at 7+ days

4 courts × 16 hours × 8 days = 512 documents — over the hard limit. For ranges beyond 7 days the `writeBatch.commit()` will throw. Chunk writes at 400 documents per batch.

### 8. `proceedToBooking` is not gated on `isLoggedIn`

A user who bypasses LIFF login can reach checkout. `userId` will be `undefined`, creating orphaned bookings. A guard on `isLoggedIn` before `proceedToBooking` would prevent this.

### 9. Credit card expiry year parsing produces silent `NaN`

`parseInt(expYear)` on a non-numeric string gives `NaN`, which Omise rejects with an opaque error. A simple `isNaN` check with a Thai-language message would improve UX.

### 10. `CLAUDE.md` documents tenant ID location as `App.vue:58` — it has moved to `src/constants.js`

Minor stale documentation; no functional impact.

---

## What Looks Good

- Server-side price calculation in `createCharge` — never trusts client-supplied amount.
- Webhook HMAC verification uses `crypto.timingSafeEqual`.
- Omise secret key is a Cloud Function secret, not in `.env` or source.
- `requireAdminAuth` uses `onAuthStateChanged` to avoid cold-load false redirects.
- All `onSnapshot` listeners and `setInterval` timers are cleaned up in `beforeUnmount` across every view.
- `PENDING_EXPIRY_SECONDS = 900` is a shared constant used identically on client and server — no drift.
- `checkSlotAvailability()` fires right before payment to catch races between selection and checkout.
- `vueDevTools` is correctly excluded from production builds in `vite.config.js`.
- Firebase, LIFF, and misc vendor code is split into separate chunks, keeping the initial bundle lean for mobile LIFF context.

---

## Pre-Deploy Checklist

- [ ] **CRITICAL:** Add `.env` to `.gitignore`
- [ ] **CRITICAL:** Add hosting block with SPA rewrite to `firebase.json` (or fix `return_uri` if deploying frontend elsewhere)
- [ ] Swap Omise test keys for live keys (`.env` + Firebase Secret Manager)
- [ ] Add admin email allowlist in `AdminLogin.vue`
- [ ] Optionally: add `limit()` to admin dashboard bookings query
- [ ] Optionally: chunk slot generation writes at 400 docs per batch
- [ ] Optionally: reduce webhook log verbosity

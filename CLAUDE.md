# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend (root)**

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run format    # Format with Prettier
npm run tunnel    # Expose via Cloudflare tunnel
npm run ngrok     # Expose via ngrok tunnel (or: npx ngrok http 5173 --url=semiboiled-befittingly-buster.ngrok-free.dev)
```

**Firebase Cloud Functions (`functions/` directory)**

```bash
npm run serve     # Start Firebase function emulators
npm run deploy    # Deploy functions to Firebase
npm run logs      # Tail live function logs
```

No test runner is configured. No linting tool (Prettier only).

Node version: `>=22` required for functions; `^20.19.0 || >=22.12.0` for root.

## Architecture

Vue 3 SPA + Firebase backend for a Thai tennis court booking system. Delivered as a LINE LIFF mini-app (accessed through the LINE chat app).

**User flow**: LINE login (via LIFF) → browse court slots → select hours → Omise payment → booking confirmed.

**Frontend** (`src/`): Vue 3 + Pinia + Vue Router + Vite + **Tailwind CSS v4**. Path alias `@/` resolves to `./src/`. No TypeScript.

**Backend** (`functions/index.js`): Three Firebase Cloud Functions:

- `createCharge` — creates an Omise charge (credit card or PromptPay QR), writes a `pending` booking to Firestore
- `checkBookingStatus` — client polls this to sync payment state
- `omiseWebhook` — Omise calls this on payment events; updates booking status to `paid`/`failed`

**Database**: Firestore (schemaless). Key collections:

- `settings` — per-tenant venue config (courts, pricing tiers, operating hours, refund policy)
- `bookings` — reservation records with payment status lifecycle: `pending → paid / expired / failed`

**Auth**: LINE LIFF SDK (`@line/liff`) is the primary auth path; Firebase Auth with Google is also configured. `useLiffStore` (Pinia) holds LINE profile and login state.

**Payment**: Omise (Thai payment processor). Public key in `.env`; secret key is a Cloud Function secret. PromptPay QR code and credit card flows are both supported.

**State management** (`src/stores/`):

- `config.js` (`useConfigStore`) — venue settings, pricing, courts; also contains `seedInitialData()` for Firestore seed
- `liff.js` (`useLiffStore`) — LINE LIFF login state and user profile

## Environment Variables

Stored in `.env` (Vite reads these as `import.meta.env.VITE_*` at build time):

- `VITE_LIFF_ID` — LINE LIFF app ID
- `VITE_FIREBASE_*` (6 keys) — Firebase project credentials
- `VITE_OMISE_PUBLIC_KEY` — Omise public key (safe to expose client-side)

Omise secret key is stored as a Firebase Cloud Function secret (not in `.env`).

## Styling — Tailwind CSS v4

**Setup**: `@tailwindcss/vite` plugin in `vite.config.js`. Global entry point is `src/style.css` (imported in `main.js`).

**Custom theme tokens** (defined in `src/style.css` `@theme {}` block, usable as `bg-line-green`, `text-ant-blue`, etc.):

- `--color-line-green`: `#00b900` — LINE brand green, primary CTA color
- `--color-ant-blue`: `#1890ff` — Ant Design blue, admin UI accent
- `--color-ant-navy`: `#001529` — dark sidebar background
- `--color-promptpay`: `#003764` — PromptPay brand blue
- Slot status colors: `slot-available-*`, `slot-booked-*`, `slot-closed-*`, `slot-locked-*` (bg/border/text variants)

**Scoped styles with `@apply`**: Any `<style scoped>` block that uses `@apply` must start with `@reference "../../style.css"` (adjust path relative to the Vue file). Without it, Tailwind v4 won't resolve utility classes inside `@apply`. This is a v4 requirement — not needed in v3.

**Patterns**:

- Complex conditional class logic (e.g., slot status colors, booking state) lives in computed methods returning class strings, not inline `:class` bindings.
- Pseudo-elements (`::before`, `::after`) and custom toggle switches stay in scoped `<style>` using `@apply`. Everything else is inline Tailwind utilities.
- Global animations (`.animate-fade`, `.animate-slide-up`) are defined as `@layer utilities` in `src/style.css`.

## Code Style

Prettier config (`.prettierrc`): 4-space indent, single quotes, 100-char line width.

Tenant ID is currently hardcoded as `'court_001'` in `App.vue:58` — the app is single-tenant.

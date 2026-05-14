---
name: deploy
description: Deploy the tennis-booking app. Use this skill whenever the user says "deploy", "push to prod", "release", "ship", "update the app", or anything suggesting they want to publish changes. Handles both frontend build and Firebase Cloud Functions deployment in the correct order, reports each step, and reminds the user to verify the live LIFF URL.
---

# Deploy: Tennis Booking App

This project has two deployment targets:

1. **Frontend** — Vite build (`npm run build` in project root). Produces `dist/`. The built files must be deployed to your static hosting manually (no Firebase Hosting is configured).
2. **Firebase Cloud Functions** — `firebase deploy --only functions` via `npm run deploy` inside `functions/`.

## Steps

### 1. Build the frontend

Run from the project root:

```bash
npm run build
```

If this fails, stop and report the error. Common causes: missing `.env` variables, TypeScript/lint errors (there are none — this is JS-only, but Vite can still fail on import errors).

### 2. Deploy Cloud Functions

Run from the `functions/` directory:

```bash
cd functions && npm run deploy
```

This runs `firebase deploy --only functions` targeting the `tennis-booking-2325d` Firebase project.

If this fails, common causes are:
- Not logged in to Firebase (`firebase login`)
- Functions secret not set (Omise secret key)
- Node version mismatch (requires Node 22)

### 3. Report results

After each step, clearly state whether it succeeded or failed. Example format:

```
✓ Frontend build — success (dist/ updated)
✓ Cloud Functions — deployed to asia-southeast1

Next: verify the live LIFF URL in the LINE app to confirm the update is live.
```

If a step fails, show the relevant error output and stop — don't attempt the next step.

### 4. Remind about LIFF verification

After a successful deploy, always remind the user to open the LINE mini-app and do a quick smoke test:
- Can they see the booking screen?
- Are court slots loading?
- Does the date selector show correct dates?

The LIFF URL is configured in the LINE Developers console and points to wherever the `dist/` files are hosted.

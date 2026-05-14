---
name: check
description: Run a full pre-deploy sanity check on the tennis-booking project. Use this skill whenever the user says "check", "run checks", "sanity check", "pre-deploy check", "is the code clean", "ready to deploy?", or anything that implies verifying the project is in a healthy state before shipping. Runs the Vite build plus five targeted regression checks that catch the most common ways things break in this codebase.
---

# Pre-Deploy Check: Tennis Booking

Run these six checks in order. Each is independent — run them all even if an earlier one fails.

## Check 1: Vite build

```bash
npm run build
```

Run from the project root (`C:\Storage\Antigravity\appx\tennis-booking`). A clean build means no import errors, undefined variables, or broken references. Capture stdout+stderr. **PASS** if exit code is 0, **FAIL** otherwise — show the full error output.

## Check 2: Hardcoded tenant ID regression

Search `src/` for the string `'court_001'` (including the quotes). It should appear **only** in `src/constants.js`. Any other file is a regression — someone bypassed the shared constant.

```bash
grep -rn "'court_001'" src/
```

**PASS** if the only match is `src/constants.js`. **FAIL** with file:line for every extra match.

## Check 3: Component-local isBookingExpired

Search `src/` for `this.isBookingExpired`. This method was removed from all components — it should now only be called as the imported function `isBookingExpired(...)`. A `this.` call means someone added a local copy that won't respect `PENDING_EXPIRY_SECONDS`.

```bash
grep -rn "this\.isBookingExpired" src/
```

**PASS** if zero matches. **FAIL** with file:line for each match.

## Check 4: Hardcoded 60-second expiry

Search for patterns that look like the old 60-second pending booking window being reintroduced. The canonical value is `PENDING_EXPIRY_SECONDS = 900` in `src/utils/booking.js`. Look for `> 60` or `< 60` appearing near words like `booking`, `pending`, `expir`, or `createdAt` in any file under `src/` or `functions/`.

```bash
grep -rn "\b60\b" src/ functions/index.js
```

Filter the results — only flag lines where `60` appears alongside booking/expiry/pending logic (e.g. `diffInSeconds > 60`, `< 60 *`, `60 * 1000` in a booking context). The `PENDING_EXPIRY_SECONDS` definition line itself (`= 900`) is fine. Use judgment — a CSS `60px` or unrelated `60` is not a problem.

**PASS** if no booking-related 60-second literals found. **FAIL** with file:line and the matching line for each suspect.

## Check 5: Client-controlled amount security regression

Search `functions/index.js` for any use of `request.data.amount` or destructuring `amount` from `request.data`. The charge amount must always be calculated server-side from Firestore settings — trusting the client's amount is a critical security hole that was explicitly fixed.

```bash
grep -n "request\.data\.amount\|{ *amount\b.*} *= *request\.data\|\bconst.*amount.*=.*request\.data" functions/index.js
```

Also check that the destructuring line at the top of `createCharge` does **not** include `amount` in the extracted fields.

**PASS** if `amount` is not pulled from `request.data`. **FAIL** with line number and the offending line.

## Report format

After all five checks, print a summary like this:

```
─────────────────────────────────────
  Pre-Deploy Check Results
─────────────────────────────────────
  ✓ Build             PASS
  ✗ Tenant ID         FAIL  src/views/HomeView.vue:265
  ✓ isBookingExpired  PASS
  ✓ 60s expiry        PASS
  ✓ Client amount     PASS
─────────────────────────────────────
  1 check failed. Fix before deploying.
─────────────────────────────────────
```

For any FAIL, show the file:line and the matching line so the user can jump straight to it. If everything passes, say "All checks passed — safe to deploy." Keep the tone direct; no preamble.

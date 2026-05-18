# Next Plan Options

## Option A — Complete Admin Booking Actions (recommended first)

### A1. Booking Detail Drawer
- Clicking the eye button opens a right-side drawer showing full booking info: date, court, hours, customer name, phone, payment type, amount, status, Omise charge ID, createdAt/paidAt
- Drawer slides in from the right, closes on backdrop click or × button
- No edit — read-only view for now

### A2. Manual Booking Modal
- Wire up the "+ เพิ่มการจอง (Manual)" button in AdminDashboard
- Form fields: date, court (dropdown from config), hours (multi-select from operating hours), customer name, phone, amount
- Writes directly to Firestore as `status: 'paid'` (manual bookings skip payment)
- After save, table updates via existing `onSnapshot`

### A3. Replace `confirm()` in removeCourt (AdminSettings)
- `removeCourt` still uses a native `confirm()` dialog
- Replace with an inline confirmation: clicking "ลบ" turns the row red + shows "ยืนยัน / ยกเลิก" buttons in-place

---

## Option B — User-Facing UX Pass

### B1. HomeView slot picker polish
- Date picker as a horizontal scrollable strip (not a native `<input type="date">`)
- Court tabs as pill toggles
- Slot grid with cleaner status colors and price shown inside each slot cell

### B2. CheckoutView redesign
- Summary card (selected slots, total price) at the top
- Payment method as icon cards (PromptPay / Credit Card), not a plain select
- Form validation with inline error messages instead of toast

### B3. PaymentView — PromptPay countdown
- Circular countdown timer (not just a text number)
- QR code larger, with a "บันทึก QR" save button
- Auto-copy bank reference on tap

### B4. Success / Fail pages
- Success: booking summary card + "แชร์ให้เพื่อน" LINE share button
- Fail: clear reason + prominent "ลองใหม่" retry button back to checkout

---

## Option C — Reliability & Correctness

### C1. Fix `return_uri` in createCharge (Cloud Function)
- `process.env.GCLOUD_PROJECT` resolves to the GCP project ID, not the LIFF URL
- Replace with a `LIFF_HOST_URL` Firebase Function config/secret

### C2. Bookings table pagination
- Currently loads all bookings with no limit — will degrade as data grows
- Add `limit(50)` + "โหลดเพิ่ม" load-more button using Firestore cursor (`startAfter`)

### C3. TOCTOU slot availability race
- Two users can book the same slot if they both pass the availability check before either writes
- Fix with a Firestore transaction in `createCharge`: read slot + check + write atomically

---

## Suggested Order

1. **Option A** — makes the admin panel fully functional
2. **Option B** — improves the customer experience every user sees
3. **Option C** — reliability hardening before scaling

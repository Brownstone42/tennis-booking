# Admin UX/UI Improvement Plan

## Implementation Order

### 1. Toast Notification Component (replaces all `alert()`)
- Create `src/components/ToastNotification.vue` — slide-in from top-right, auto-dismiss 3s
- Add to `App.vue` globally, expose via Pinia store or provide/inject
- Replace every `alert(...)` call across: `AdminSchedule.vue`, `AdminSettings.vue`, `AdminDashboard.vue`, `CheckoutView.vue`, `PaymentView.vue`

### 2. Dashboard Stat Cards — dynamic + color + icons
- Fix hardcoded `3 / 4` court availability — read from `useConfigStore` courts + real slot data
- Add color-coded left border accent per card
- Add icon per stat (booking count, revenue, courts available)
- Add trend indicator (vs. yesterday) as a stretch goal

### 3. Bookings Table — filter + search
- Add a filter bar above the table: date range picker, status dropdown (`paid / pending / expired`), name/phone search input
- Filter is client-side against the `bookings` array
- Replace emoji action buttons (`👁️ ✏️`) with SVG icon buttons + tooltip on hover

### 4. Sidebar — SVG icons + active left-border
- Replace `📊 📅 ⚙️` emojis with inline SVG icons
- Add `3px left border bg-ant-blue` on the active router-link (instead of full `bg-ant-blue` background)
- Move logged-in user email into the sidebar footer (currently only shown in dashboard header)

### 5. Skeleton Loading States
- Replace the text overlay "กำลังโหลดข้อมูล..." in `AdminSchedule.vue` with pulsing skeleton rows
- Add skeleton to `AdminDashboard.vue` bookings table initial load

### 6. Settings — Unsaved Changes Guard
- Add `beforeRouteLeave` navigation guard: warn if `localConfig` differs from store state
- Show a subtle `● unsaved changes` pill in the page header when dirty

### 7. Generate Modal — Slot Count Preview
- Compute and display: `"จะสร้าง X slots (N วัน × M คอร์ท × H ชั่วโมง)"` before confirming
- Dynamically updates as the user changes the date range

---

## Other Notes

- All pages already use Tailwind CSS v4 — new components should follow the same pattern
- Custom theme tokens: `bg-ant-blue` (#1890ff), `bg-ant-navy` (#001529), `bg-line-green` (#00b900)
- Scoped `<style>` blocks using `@apply` must start with `@reference "../../style.css"`
- No test runner — verify changes visually with `npm run dev`

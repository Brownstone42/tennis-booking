<template>
    <div class="booking-container">
        <router-link to="/admin/login" class="admin-login-button">เข้าสู่ระบบแอดมิน</router-link>
        <!-- 1. เลือกวันที่ -->
        <section class="date-selector">
            <h3>เลือกวันที่</h3>
            <div class="date-list">
                <button
                    v-for="date in availableDates"
                    :key="date.toISOString()"
                    class="date-item"
                    :class="{ active: isSameDay(date, selectedDate) }"
                    @click="selectDate(date)"
                >
                    <span class="day-name">{{ format(date, 'EEE') }}</span>
                    <span class="day-num">{{ format(date, 'd') }}</span>
                    <span class="month-name">{{ format(date, 'MMM') }}</span>
                </button>
            </div>
        </section>

        <!-- 2. เลือกคอร์ท + เลือกเวลา + สรุปการจอง (แสดงเมื่อมีวันเปิด) -->
        <template v-if="availableDates.length > 0">
            <!-- 2. เลือกคอร์ท -->
            <section class="court-selector">
                <h3>เลือกสนาม</h3>
                <div class="court-list">
                    <button
                        v-for="court in courts"
                        :key="court.id"
                        class="court-item"
                        :class="{
                            active: selectedCourtId === court.id,
                            'is-full': isCourtFull(court.id)
                        }"
                        @click="selectCourt(court.id)"
                    >
                        <div class="court-badge" v-if="isCourtFull(court.id)">เต็ม</div>
                        <div class="court-name">{{ court.name }}</div>
                        <div class="court-type">{{ court.type }}</div>
                    </button>
                </div>
            </section>

            <!-- 3. เลือกเวลา -->
            <section class="time-selector">
                <div class="section-header">
                    <h3>เลือกเวลา</h3>
                    <span class="price-hint" v-if="!isLoading">*ราคาต่อชั่วโมง</span>
                </div>

                <div class="time-grid-wrapper">
                    <transition name="fade">
                        <div v-if="isLoading" class="loading-overlay">
                            <div class="spinner"></div>
                            <span>กำลังอัปเดตข้อมูล...</span>
                        </div>
                    </transition>

                    <div class="time-grid" :class="{ 'content-loading': isLoading }">
                        <button
                            v-for="hour in timeSlots"
                            :key="hour"
                            class="time-slot"
                            :class="{
                                selected: selectedHours.includes(hour),
                                booked: isBooked(hour),
                                'my-booking': isMyBooking(hour)
                            }"
                            :disabled="isBooked(hour) || isLoading"
                            @click="toggleHour(hour)"
                        >
                            <span class="time-text"
                                >{{ formatTime(hour) }} - {{ formatTime(hour + 1) }}</span
                            >
                            <span v-if="isBooked(hour)" class="price-text booked-label">
                                {{ getSlotStatusLabel(hour) || 'ไม่ว่าง' }}
                            </span>
                            <span v-else class="price-text"
                                >฿{{ getPrice(hour).toLocaleString() }}</span
                            >
                        </button>
                    </div>
                </div>
            </section>

            <!-- 4. สรุปการจอง -->
            <transition name="slide-up">
                <footer v-if="selectedHours.length > 0" class="booking-footer">
                    <div class="summary-content">
                        <div class="summary-details">
                            <div class="summary-court">{{ currentCourt?.name }}</div>
                            <div class="summary-time">
                                {{ format(selectedDate, 'd MMM yyyy') }} | {{ timeRangeString }}
                            </div>
                            <div class="summary-count">{{ selectedHours.length }} ชั่วโมง</div>
                        </div>
                        <div class="summary-action">
                            <div class="summary-total">
                                <span class="total-label">รวมทั้งหมด</span>
                                <span class="total-amount"
                                    >฿{{ totalPrice.toLocaleString() }}</span
                                >
                            </div>
                            <button class="confirm-btn" @click="proceedToBooking">จองเลย</button>
                        </div>
                    </div>
                </footer>
            </transition>
        </template>

        <!-- แสดงเมื่อยังไม่มีวันเปิดให้บริการ -->
        <div v-else class="empty-booking-state">
            <div class="empty-icon">🎾</div>
            <h3>ขออภัยครับ ยังไม่เปิดให้บริการจอง</h3>
            <p>กรุณากลับมาตรวจสอบอีกครั้งในภายหลังครับ</p>
        </div>
    </div>
</template>

<script>
import { format, addDays, isSameDay, startOfDay, parseISO } from 'date-fns'
import { mapState } from 'pinia'
import { useConfigStore } from '../stores/config'
import { useLiffStore } from '../stores/liff'
import { db } from '../firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

export default {
    data() {
        return {
            selectedDate: startOfDay(new Date()),
            selectedCourtId: 1,
            selectedHours: [],
            isLoadingBookings: false,
            isLoadingSlots: false,
            unsubscribe: null,
            slotsUnsubscribe: null,
            format,
            isSameDay,
            currentTime: new Date(),
            refreshTimer: null,
            allBookings: [],
            allSlots: [],
            activeDates: [], // Days that admin has generated slots for
            datesUnsubscribe: null
        }
    },
    computed: {
        ...mapState(useConfigStore, [
            'courts',
            'operatingHours',
            'defaultPricing',
            'bookingAdvanceDays'
        ]),
        ...mapState(useLiffStore, ['profile']),
        isLoading() {
            return this.isLoadingBookings || this.isLoadingSlots
        },
        currentCourtSlots() {
            return this.allSlots.filter(s => Number(s.courtId) === Number(this.selectedCourtId))
        },
        currentCourtBookings() {
            return this.allBookings.filter(b => Number(b.courtId) === Number(this.selectedCourtId))
        },
        currentCourtBookedHours() {
            const hours = []
            this.currentCourtBookings.forEach(b => {
                if (b.status === 'paid' || (b.status === 'pending' && !this.isBookingExpired(b))) {
                    hours.push(...b.hours)
                }
            })
            return hours
        },
        currentCourt() {
            return this.courts.find((c) => c.id === Number(this.selectedCourtId))
        },
        availableDates() {
            // Sort by date string and convert to Date objects
            return [...this.activeDates]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((d) => parseISO(d.date))
        },
        timeSlots() {
            const slots = []
            if (this.operatingHours) {
                for (let h = this.operatingHours.open; h < this.operatingHours.close; h++) {
                    slots.push(h)
                }
            }
            return slots
        },
        timeRangeString() {
            if (this.selectedHours.length === 0) return ''
            const min = Math.min(...this.selectedHours)
            const max = Math.max(...this.selectedHours) + 1
            return `${this.formatTime(min)} - ${this.formatTime(max)}`
        },
        totalPrice() {
            return this.selectedHours.reduce((total, hr) => total + this.getPrice(hr), 0)
        }
    },
    watch: {
        selectedDate: {
            handler: 'fetchAvailability',
            immediate: true
        },
        selectedCourtId: {
            handler: 'fetchAvailability'
        }
    },
    methods: {
        formatTime(h) {
            return `${String(h).padStart(2, '0')}:00`
        },
        isPast(hour) {
            const now = this.currentTime
            const selectedDate = startOfDay(this.selectedDate)
            const today = startOfDay(now)

            // 1. If selected date is in the past
            if (selectedDate < today) return true

            // 2. If selected date is today, check if hour is passed
            if (isSameDay(selectedDate, today)) {
                return hour <= now.getHours()
            }

            return false
        },
        getPrice(hour) {
            // Check if there's a price from slot metadata first
            const slot = this.currentCourtSlots.find(s => Number(s.hour) === Number(hour))
            if (slot && slot.price !== undefined) {
                return slot.price
            }

            if (!this.currentCourt) return 0
            const courtPricing = this.currentCourt.pricing
            if (courtPricing && courtPricing.length > 0) {
                const priceRule = courtPricing.find((p) => hour >= p.start && hour < p.end)
                if (priceRule) return priceRule.rate
            }
            const defaultRule = this.defaultPricing.find((p) => hour >= p.start && hour < p.end)
            return defaultRule ? defaultRule.rate : 0
        },
        isBookingExpired(booking) {
            if (booking.status !== 'pending' || !booking.createdAt) return false
            const diffInSeconds = (new Date() - booking.createdAt.toDate()) / 1000
            return diffInSeconds > 60
        },
        async fetchAvailability() {
            // Clean up existing listeners
            if (this.unsubscribe) this.unsubscribe()
            if (this.slotsUnsubscribe) this.slotsUnsubscribe()

            this.isLoadingBookings = true
            this.isLoadingSlots = true
            const dateStr = format(this.selectedDate, 'yyyy-MM-dd')

            // 1. Fetch ALL bookings for the date
            const bQuery = query(
                collection(db, 'bookings'),
                where('tenantId', '==', 'court_001'),
                where('date', '==', dateStr),
                where('status', 'in', ['paid', 'pending'])
            )
            this.unsubscribe = onSnapshot(bQuery, (snapshot) => {
                this.allBookings = snapshot.docs.map(doc => doc.data())
                this.isLoadingBookings = false
            })

            // 2. Fetch ALL slots for the date
            const sQuery = query(
                collection(db, 'slots'),
                where('tenantId', '==', 'court_001'),
                where('date', '==', dateStr)
            )
            this.slotsUnsubscribe = onSnapshot(sQuery, (snapshot) => {
                this.allSlots = snapshot.docs.map(doc => doc.data())
                this.isLoadingSlots = false
            })
        },
        async fetchActiveDays() {
            if (this.datesUnsubscribe) this.datesUnsubscribe()

            const todayStr = format(new Date(), 'yyyy-MM-dd')
            const q = query(
                collection(db, 'active_days'),
                where('tenantId', '==', 'court_001'),
                where('date', '>=', todayStr)
            )

            this.datesUnsubscribe = onSnapshot(q, (snapshot) => {
                this.activeDates = snapshot.docs.map((doc) => doc.data())

                // Auto-select the first available date if nothing is selected or current selection is invalid
                if (this.activeDates.length > 0) {
                    const availableDateStrings = this.activeDates.map((d) => d.date)
                    const currentSelectedStr = format(this.selectedDate, 'yyyy-MM-dd')

                    if (!availableDateStrings.includes(currentSelectedStr)) {
                        const firstDate = parseISO(availableDateStrings.sort()[0])
                        this.selectedDate = firstDate
                    }
                }
            })
        },
        selectDate(date) {
            this.selectedDate = date
            this.selectedHours = []
        },
        selectCourt(id) {
            this.selectedCourtId = id
            this.selectedHours = []
        },
        toggleHour(hour) {
            const index = this.selectedHours.indexOf(hour)
            if (index > -1) {
                this.selectedHours.splice(index, 1)
            } else {
                this.selectedHours.push(hour)
                this.selectedHours.sort((a, b) => a - b)
            }
        },
        isBooked(hour) {
            // 0. Hour is in the past
            if (this.isPast(hour)) return true

            // 1. Check if ANY booking exists for this hour and current court
            const isBookedViaBooking = this.currentCourtBookings.some(b => 
                b.hours.includes(hour) && 
                (b.status === 'paid' || (b.status === 'pending' && !this.isBookingExpired(b)))
            )
            if (isBookedViaBooking) return true

            // 2. Check admin status in 'slots'
            const slot = this.currentCourtSlots.find(s => Number(s.hour) === Number(hour))
            if (slot) {
                return slot.status !== 'available'
            }

            return false
        },
        isCourtFull(courtId) {
            // A court is full if NO future slots have 'available' status
            const courtSlots = this.allSlots.filter(s => Number(s.courtId) === Number(courtId))
            
            // If no slots are generated yet for this court on this date, we don't count it as 'full' 
            // but rather as 'not open' (or just show it as empty). 
            // Based on user: "slot ที่ยังไม่สร้าง ... จะยังไม่นับ"
            if (courtSlots.length === 0) return false

            const hasAnyAvailable = courtSlots.some(s => {
                const hour = Number(s.hour)
                if (this.isPast(hour)) return false
                if (s.status !== 'available') return false
                
                // Also check if this available slot is currently being booked
                const isBeingBooked = this.allBookings.some(b => 
                    Number(b.courtId) === Number(courtId) && 
                    b.hours.includes(hour) && 
                    (b.status === 'paid' || (b.status === 'pending' && !this.isBookingExpired(b)))
                )
                return !isBeingBooked
            })

            return !hasAnyAvailable
        },
        isMyBooking(hour) {
            if (!this.profile?.userId) return false
            const myBooking = this.currentCourtBookings.find(b => 
                b.userId === this.profile.userId && 
                b.hours.includes(hour) &&
                (b.status === 'paid' || (b.status === 'pending' && !this.isBookingExpired(b)))
            )
            return !!myBooking
        },
        getSlotStatusLabel(hour) {
            if (this.isPast(hour)) return 'หมดเวลา'

            // Check if it's my booking
            const myBooking = this.currentCourtBookings.find(b => 
                b.userId === this.profile.userId && 
                b.hours.includes(hour) &&
                (b.status === 'paid' || (b.status === 'pending' && !this.isBookingExpired(b)))
            )
            if (myBooking) {
                return myBooking.status === 'pending' ? 'รอชำระเงิน' : 'จองแล้ว'
            }

            // Check shared bookings
            const otherBooking = this.currentCourtBookings.find(b => 
                b.hours.includes(hour) &&
                (b.status === 'paid' || (b.status === 'pending' && !this.isBookingExpired(b)))
            )
            if (otherBooking) {
                return otherBooking.status === 'paid' ? 'เต็มแล้ว' : 'รอชำระเงิน'
            }

            // Admin metadata
            const slot = this.currentCourtSlots.find(s => Number(s.hour) === Number(hour))
            if (slot) {
                if (slot.status === 'closed') return 'ปิดสนาม'
                if (slot.status === 'locked') return 'ไม่ว่าง'
                if (slot.status === 'pending') return 'ยังไม่เปิด'
            }
            return null
        },
        proceedToBooking() {
            this.$router.push({
                name: 'checkout',
                query: {
                    courtId: this.selectedCourtId,
                    date: format(this.selectedDate, 'yyyy-MM-dd'),
                    hours: this.selectedHours.join(',')
                }
            })
        }
    },
    mounted() {
        this.fetchActiveDays()
        // Update current time every minute to refresh "past" slots automatically
        this.refreshTimer = setInterval(() => {
            this.currentTime = new Date()
        }, 60000)
    },
    beforeUnmount() {
        if (this.unsubscribe) this.unsubscribe()
        if (this.slotsUnsubscribe) this.slotsUnsubscribe()
        if (this.datesUnsubscribe) this.datesUnsubscribe()
        if (this.refreshTimer) clearInterval(this.refreshTimer)
    }
}
</script>

<style scoped>
.admin-login-button {
    display: block;
    margin-bottom: 16px;
    padding: 10px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 8px;
    text-align: center;
    color: #333;
    text-decoration: none;
}
.booking-container {
    padding: 16px;
    padding-bottom: 140px;
}
h3 {
    font-size: 1.1rem;
    margin-bottom: 12px;
    color: #333;
    font-weight: 600;
}
section {
    margin-bottom: 28px;
}
.date-list {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 12px;
}
.date-item {
    flex: 0 0 70px;
    padding: 12px 8px;
    border: 1px solid #eee;
    border-radius: 12px;
    background: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
}
.date-item.active {
    background: #00b900;
    color: white;
    border-color: #00b900;
}
.day-name {
    font-size: 0.75rem;
    text-transform: uppercase;
}
.day-num {
    font-size: 1.4rem;
    font-weight: 800;
}
.month-name {
    font-size: 0.7rem;
    opacity: 0.8;
}
.court-list {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-top: 8px;
    padding-bottom: 8px;
}
.court-item {
    flex: 0 0 100px;
    padding: 12px;
    border: 1px solid #eee;
    border-radius: 12px;
    background: white;
    text-align: center;
    cursor: pointer;
    position: relative;
    transition: all 0.2s;
}
.court-item.active {
    background: #333;
    color: white;
    border-color: #333;
}
.court-item.is-full {
    background: #fdf2f2;
    border-color: #fee2e2;
}
.court-item.is-full.active {
    background: #333; /* Keep active color but show badge */
}
.court-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ef4444;
    color: white;
    font-size: 0.65rem;
    padding: 2px 8px;
    border-radius: 20px;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}
.court-name {
    font-weight: bold;
    font-size: 0.9rem;
}
.court-type {
    font-size: 0.7rem;
    opacity: 0.7;
    margin-top: 2px;
}
.time-grid-wrapper {
    position: relative;
    min-height: 200px;
}

.loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(2px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 5;
    border-radius: 12px;
    gap: 12px;
    color: #00b900;
    font-weight: 600;
    font-size: 0.9rem;
}

.spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #00b900;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.content-loading {
    filter: grayscale(0.5);
    opacity: 0.6;
    pointer-events: none;
    transition: all 0.3s ease;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.time-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
}

.time-slot {
    padding: 18px 12px;
    border: 1.5px solid #f0f3f5;
    border-radius: 16px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.time-slot:hover:not(:disabled) {
    border-color: #00b90044;
    background: #fdfdfd;
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 185, 0, 0.08);
}

.time-text {
    font-size: 0.95rem;
    font-weight: 600;
    color: #444;
    margin-bottom: 6px;
}

.price-text {
    font-size: 0.85rem;
    font-weight: 700;
    color: #00b900;
    padding: 4px 10px;
    background: #f0fff0;
    border-radius: 20px;
    transition: all 0.2s;
}

.time-slot.selected {
    background: #00b900;
    border-color: #00b900;
    box-shadow: 0 8px 16px rgba(0, 185, 0, 0.2);
}

.time-slot.selected .time-text {
    color: #ffffff;
}

.time-slot.selected .price-text {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
}

.time-slot.booked {
    background: #f9fbfc;
    color: #cbd5e0;
    cursor: not-allowed;
    border-color: #edf2f7;
    box-shadow: none;
}

.time-slot.booked .time-text {
    color: #a0aec0;
}

.booked-label {
    background: #fff5f5 !important;
    color: #f56565 !important;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
}

/* My Booking Styles */
.time-slot.my-booking {
    background: #f0f7ff;
    border-color: #007aff44;
}
.time-slot.my-booking .time-text {
    color: #0056b3;
}
.time-slot.my-booking .booked-label {
    background: #e1effe !important;
    color: #1a56db !important;
}
.booking-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 20px 16px 30px 16px;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
}
.summary-content {
    max-width: 568px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
}
.summary-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.summary-court {
    font-size: 1.1rem;
    font-weight: 800;
    color: #333;
}
.summary-time {
    font-size: 0.9rem;
    color: #666;
}
.summary-count {
    font-size: 0.85rem;
    color: #00b900;
    font-weight: 600;
}
.summary-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
}
.summary-total {
    display: flex;
    flex-direction: column;
}
.total-label {
    font-size: 0.8rem;
    color: #999;
}
.total-amount {
    font-size: 1.6rem;
    font-weight: 900;
    color: #00b900;
}
.confirm-btn {
    background: #00b900;
    color: white;
    border: none;
    padding: 14px 40px;
    border-radius: 14px;
    font-weight: bold;
    font-size: 1.1rem;
    cursor: pointer;
}
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
}

/* Empty Booking State */
.empty-booking-state {
    padding: 60px 20px;
    text-align: center;
    background: white;
    border-radius: 24px;
    margin-top: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}
.empty-icon {
    font-size: 3rem;
    margin-bottom: 20px;
}
.empty-booking-state h3 {
    margin-bottom: 8px;
    color: #333;
}
.empty-booking-state p {
    color: #888;
    font-size: 0.9rem;
}
</style>

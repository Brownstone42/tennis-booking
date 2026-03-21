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

        <!-- 2. เลือกคอร์ท -->
        <section class="court-selector">
            <h3>เลือกสนาม</h3>
            <div class="court-list">
                <button
                    v-for="court in courts"
                    :key="court.id"
                    class="court-item"
                    :class="{ active: selectedCourtId === court.id }"
                    @click="selectCourt(court.id)"
                >
                    <div class="court-name">{{ court.name }}</div>
                    <div class="court-type">{{ court.type }}</div>
                </button>
            </div>
        </section>

        <!-- 3. เลือกเวลา -->
        <section class="time-selector">
            <div class="section-header">
                <h3>เลือกเวลา</h3>
                <span class="price-hint" v-if="!isLoadingBookings">*ราคาต่อชั่วโมง</span>
                <span class="price-hint" v-else>กำลังเช็คสถานะสนาม...</span>
            </div>
            <div class="time-grid">
                <button
                    v-for="hour in timeSlots"
                    :key="hour"
                    class="time-slot"
                    :class="{
                        selected: selectedHours.includes(hour),
                        booked: isBooked(hour)
                    }"
                    :disabled="isBooked(hour) || isLoadingBookings"
                    @click="toggleHour(hour)"
                >
                    <span class="time-text">{{ formatTime(hour) }} - {{ formatTime(hour + 1) }}</span>
                    <span v-if="isBooked(hour)" class="price-text booked-label">เต็มแล้ว</span>
                    <span v-else class="price-text">฿{{ getPrice(hour).toLocaleString() }}</span>
                </button>
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
                            <span class="total-amount">฿{{ totalPrice.toLocaleString() }}</span>
                        </div>
                        <button class="confirm-btn" @click="proceedToBooking">จองเลย</button>
                    </div>
                </div>
            </footer>
        </transition>
    </div>
</template>

<script>
import { format, addDays, isSameDay, startOfDay } from 'date-fns'
import { mapState } from 'pinia'
import { useConfigStore } from '../stores/config'
import { db } from '../firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

export default {
    data() {
        return {
            selectedDate: startOfDay(new Date()),
            selectedCourtId: 1,
            selectedHours: [],
            bookedHours: [],
            isLoadingBookings: false,
            unsubscribe: null,
            format,
            isSameDay
        }
    },
    computed: {
        ...mapState(useConfigStore, [
            'courts',
            'operatingHours',
            'defaultPricing',
            'bookingAdvanceDays'
        ]),
        currentCourt() {
            return this.courts.find((c) => c.id === this.selectedCourtId)
        },
        availableDates() {
            const days = this.bookingAdvanceDays || 30
            return Array.from({ length: days }, (_, i) => addDays(new Date(), i))
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
            handler: 'fetchBookedSlots',
            immediate: true
        },
        selectedCourtId: {
            handler: 'fetchBookedSlots'
        }
    },
    methods: {
        formatTime(h) {
            return `${String(h).padStart(2, '0')}:00`
        },
        getPrice(hour) {
            if (!this.currentCourt) return 0
            const courtPricing = this.currentCourt.pricing
            if (courtPricing && courtPricing.length > 0) {
                const priceRule = courtPricing.find((p) => hour >= p.start && hour < p.end)
                if (priceRule) return priceRule.rate
            }
            const defaultRule = this.defaultPricing.find((p) => hour >= p.start && hour < p.end)
            return defaultRule ? defaultRule.rate : 0
        },
        async fetchBookedSlots() {
            if (this.unsubscribe) this.unsubscribe()
            this.isLoadingBookings = true
            const dateStr = format(this.selectedDate, 'yyyy-MM-dd')
            const q = query(
                collection(db, 'bookings'),
                where('tenantId', '==', 'court_001'),
                where('date', '==', dateStr),
                where('courtId', '==', Number(this.selectedCourtId)),
                where('status', '==', 'paid')
            )
            this.unsubscribe = onSnapshot(q, (snapshot) => {
                let booked = []
                snapshot.forEach((doc) => {
                    const data = doc.data()
                    if (data.hours) booked = [...booked, ...data.hours]
                })
                this.bookedHours = booked
                this.isLoadingBookings = false
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
            return this.bookedHours.includes(hour)
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
    beforeUnmount() {
        if (this.unsubscribe) this.unsubscribe()
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
.booking-container { padding: 16px; padding-bottom: 140px; }
h3 { font-size: 1.1rem; margin-bottom: 12px; color: #333; font-weight: 600; }
section { margin-bottom: 28px; }
.date-list { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; }
.date-item { flex: 0 0 70px; padding: 12px 8px; border: 1px solid #eee; border-radius: 12px; background: white; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.date-item.active { background: #00b900; color: white; border-color: #00b900; }
.day-name { font-size: 0.75rem; text-transform: uppercase; }
.day-num { font-size: 1.4rem; font-weight: 800; }
.month-name { font-size: 0.7rem; opacity: 0.8; }
.court-list { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; }
.court-item { flex: 0 0 100px; padding: 12px; border: 1px solid #eee; border-radius: 12px; background: white; text-align: center; cursor: pointer; }
.court-item.active { background: #333; color: white; border-color: #333; }
.court-name { font-weight: bold; font-size: 0.9rem; }
.court-type { font-size: 0.7rem; opacity: 0.7; margin-top: 2px; }
.time-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.time-slot { padding: 16px 8px; border: 1px solid #f0f0f0; border-radius: 12px; background: #fff; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.time-slot.selected { background: #e6f7ff; border-color: #1890ff; color: #1890ff; }
.time-slot.booked { background: #f5f5f5; color: #d9d9d9; cursor: not-allowed; border-color: #f0f0f0; }
.booked-label { color: #f5222d !important; font-weight: 600; }
.booking-footer { position: fixed; bottom: 0; left: 0; right: 0; background: white; padding: 20px 16px 30px 16px; box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.1); z-index: 1000; border-top-left-radius: 24px; border-top-right-radius: 24px; }
.summary-content { max-width: 568px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.summary-details { display: flex; flex-direction: column; gap: 4px; }
.summary-court { font-size: 1.1rem; font-weight: 800; color: #333; }
.summary-time { font-size: 0.9rem; color: #666; }
.summary-count { font-size: 0.85rem; color: #00b900; font-weight: 600; }
.summary-action { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f0f0f0; }
.summary-total { display: flex; flex-direction: column; }
.total-label { font-size: 0.8rem; color: #999; }
.total-amount { font-size: 1.6rem; font-weight: 900; color: #00b900; }
.confirm-btn { background: #00b900; color: white; border: none; padding: 14px 40px; border-radius: 14px; font-weight: bold; font-size: 1.1rem; cursor: pointer; }
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>

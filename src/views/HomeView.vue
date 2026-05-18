<template>
    <div class="px-4 pt-4 pb-36">
        <router-link
            to="/admin/login"
            class="block mb-4 px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-center text-gray-700 no-underline text-sm"
        >เข้าสู่ระบบแอดมิน</router-link>

        <!-- 1. Date selector -->
        <section class="mb-7">
            <h3 class="text-lg font-semibold mb-3 text-gray-800">เลือกวันที่</h3>
            <div class="flex gap-3 overflow-x-auto pb-3">
                <button
                    v-for="date in availableDates"
                    :key="date.toISOString()"
                    class="shrink-0 w-[70px] px-2 py-3 border rounded-xl flex flex-col items-center cursor-pointer transition-all duration-200"
                    :class="isSameDay(date, selectedDate) ? 'bg-line-green border-line-green text-white' : 'bg-white border-gray-200 text-gray-800'"
                    @click="selectDate(date)"
                >
                    <span class="text-xs uppercase">{{ format(date, 'EEE') }}</span>
                    <span class="text-2xl font-extrabold">{{ format(date, 'd') }}</span>
                    <span class="text-[0.7rem] opacity-80">{{ format(date, 'MMM') }}</span>
                </button>
            </div>
        </section>

        <template v-if="availableDates.length > 0">
            <!-- 2. Court selector -->
            <section class="mb-7">
                <h3 class="text-lg font-semibold mb-3 text-gray-800">เลือกสนาม</h3>
                <div class="flex gap-2.5 overflow-x-auto py-2">
                    <button
                        v-for="court in courts"
                        :key="court.id"
                        class="shrink-0 w-[100px] px-3 py-3 border rounded-xl text-center cursor-pointer relative transition-all duration-200"
                        :class="[
                            selectedCourtId === court.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-800',
                            isCourtFull(court.id) && selectedCourtId !== court.id ? 'bg-red-50 border-red-100' : ''
                        ]"
                        @click="selectCourt(court.id)"
                    >
                        <div v-if="isCourtFull(court.id)"
                            class="absolute -top-2 -right-2 bg-red-500 text-white text-[0.65rem] px-2 py-0.5 rounded-full font-bold shadow-sm">
                            เต็ม
                        </div>
                        <div class="font-bold text-sm">{{ court.name }}</div>
                        <div class="text-[0.7rem] opacity-70 mt-0.5">{{ court.type }}</div>
                    </button>
                </div>
            </section>

            <!-- 3. Time slots -->
            <section class="mb-7">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-semibold text-gray-800 m-0">เลือกเวลา</h3>
                    <span v-if="!isLoading" class="text-xs text-gray-400">*ราคาต่อชั่วโมง</span>
                </div>

                <div class="relative min-h-[200px]">
                    <transition name="fade">
                        <div v-if="isLoading" class="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-[5] rounded-xl gap-3 text-line-green font-semibold text-sm">
                            <div class="spinner-green"></div>
                            <span>กำลังอัปเดตข้อมูล...</span>
                        </div>
                    </transition>

                    <div class="grid grid-cols-2 gap-3.5" :class="{ 'grayscale-[50%] opacity-60 pointer-events-none transition-all duration-300': isLoading }">
                        <button
                            v-for="hour in timeSlots"
                            :key="hour"
                            class="px-3 py-[18px] border-[1.5px] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-[250ms] relative shadow-sm"
                            :class="timeSlotClass(hour)"
                            :disabled="isBooked(hour) || isLoading"
                            @click="toggleHour(hour)"
                        >
                            <span class="text-[0.95rem] font-semibold mb-1.5" :class="selectedHours.includes(hour) ? 'text-white' : 'text-gray-600'">
                                {{ formatTime(hour) }} - {{ formatTime(hour + 1) }}
                            </span>
                            <span v-if="isBooked(hour)"
                                class="text-xs font-semibold px-2.5 py-1 rounded-full"
                                :class="isMyBooking(hour) ? 'bg-blue-100 text-blue-700' : 'bg-red-50 text-red-500'"
                            >
                                {{ getSlotStatusLabel(hour) || 'ไม่ว่าง' }}
                            </span>
                            <span v-else
                                class="text-sm font-bold px-2.5 py-1 rounded-full transition-all duration-200"
                                :class="selectedHours.includes(hour) ? 'bg-white/20 text-white' : 'bg-[#f0fff0] text-line-green'"
                            >
                                ฿{{ getPrice(hour).toLocaleString() }}
                            </span>
                        </button>
                    </div>
                </div>
            </section>

            <!-- 4. Booking footer -->
            <transition name="slide-up">
                <footer v-if="selectedHours.length > 0"
                    class="fixed bottom-0 left-0 right-0 bg-white px-4 pt-5 pb-8 shadow-[0_-8px_24px_rgba(0,0,0,0.1)] z-[1000] rounded-t-3xl"
                >
                    <div class="max-w-[568px] mx-auto flex flex-col gap-4">
                        <div class="flex flex-col gap-1">
                            <div class="text-lg font-extrabold text-gray-800">{{ currentCourt?.name }}</div>
                            <div class="text-sm text-gray-500">{{ format(selectedDate, 'd MMM yyyy') }} | {{ timeRangeString }}</div>
                            <div class="text-sm text-line-green font-semibold">{{ selectedHours.length }} ชั่วโมง</div>
                        </div>
                        <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                            <div class="flex flex-col">
                                <span class="text-xs text-gray-400">รวมทั้งหมด</span>
                                <span class="text-[1.6rem] font-black text-line-green">฿{{ totalPrice.toLocaleString() }}</span>
                            </div>
                            <button
                                class="bg-line-green text-white border-0 px-10 py-3.5 rounded-2xl font-bold text-lg cursor-pointer"
                                @click="proceedToBooking"
                            >จองเลย</button>
                        </div>
                    </div>
                </footer>
            </transition>
        </template>

        <!-- Empty state -->
        <div v-else class="px-5 py-16 text-center bg-white rounded-3xl mt-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <div class="text-5xl mb-5">🎾</div>
            <h3 class="text-lg font-semibold mb-2 text-gray-800">ขออภัยครับ ยังไม่เปิดให้บริการจอง</h3>
            <p class="text-gray-400 text-sm">กรุณากลับมาตรวจสอบอีกครั้งในภายหลังครับ</p>
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
import { TENANT_ID } from '../constants'
import { isBookingExpired, getPriceForHour } from '../utils/booking'

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
            activeDates: [],
            datesUnsubscribe: null
        }
    },
    computed: {
        ...mapState(useConfigStore, ['courts', 'operatingHours', 'defaultPricing', 'bookingAdvanceDays']),
        ...mapState(useLiffStore, ['profile']),
        isLoading() { return this.isLoadingBookings || this.isLoadingSlots },
        currentCourtSlots() { return this.allSlots.filter(s => Number(s.courtId) === Number(this.selectedCourtId)) },
        currentCourtBookings() { return this.allBookings.filter(b => Number(b.courtId) === Number(this.selectedCourtId)) },
        currentCourtSlotsMap() {
            const map = new Map()
            this.currentCourtSlots.forEach(s => map.set(Number(s.hour), s))
            return map
        },
        bookedHoursSet() {
            const set = new Set()
            this.currentCourtBookings.forEach(b => {
                if (b.status === 'paid' || (b.status === 'pending' && !isBookingExpired(b))) b.hours.forEach(h => set.add(h))
            })
            return set
        },
        myBookedHoursSet() {
            const set = new Set()
            if (!this.profile?.userId) return set
            this.currentCourtBookings.forEach(b => {
                if (b.userId === this.profile.userId && (b.status === 'paid' || (b.status === 'pending' && !isBookingExpired(b)))) b.hours.forEach(h => set.add(h))
            })
            return set
        },
        courtFullMap() {
            const map = new Map()
            const bookedHoursByCourtId = new Map()
            this.allBookings.forEach(b => {
                if (b.status === 'paid' || (b.status === 'pending' && !isBookingExpired(b))) {
                    const id = Number(b.courtId)
                    if (!bookedHoursByCourtId.has(id)) bookedHoursByCourtId.set(id, new Set())
                    b.hours.forEach(h => bookedHoursByCourtId.get(id).add(h))
                }
            })
            for (const court of this.courts) {
                const courtSlots = this.allSlots.filter(s => Number(s.courtId) === Number(court.id))
                if (courtSlots.length === 0) { map.set(court.id, false); continue }
                const booked = bookedHoursByCourtId.get(court.id) || new Set()
                const hasAvailable = courtSlots.some(s => {
                    const hour = Number(s.hour)
                    return !this.isPast(hour) && s.status === 'available' && !booked.has(hour)
                })
                map.set(court.id, !hasAvailable)
            }
            return map
        },
        currentCourt() { return this.courts.find((c) => c.id === Number(this.selectedCourtId)) },
        availableDates() {
            return [...this.activeDates].sort((a, b) => a.date.localeCompare(b.date)).map((d) => parseISO(d.date))
        },
        timeSlots() {
            const slots = []
            if (this.operatingHours) for (let h = this.operatingHours.open; h < this.operatingHours.close; h++) slots.push(h)
            return slots
        },
        timeRangeString() {
            if (this.selectedHours.length === 0) return ''
            return `${this.formatTime(this.selectedHours[0])} - ${this.formatTime(this.selectedHours[this.selectedHours.length - 1] + 1)}`
        },
        totalPrice() { return this.selectedHours.reduce((total, hr) => total + this.getPrice(hr), 0) }
    },
    watch: {
        selectedDate: { handler: 'fetchAvailability', immediate: true },
        selectedCourtId() { this.selectedHours = [] }
    },
    methods: {
        formatTime(h) { return `${String(h).padStart(2, '0')}:00` },
        isPast(hour) {
            const now = this.currentTime
            const selectedDate = startOfDay(this.selectedDate)
            const today = startOfDay(now)
            if (selectedDate < today) return true
            if (isSameDay(selectedDate, today)) return hour <= now.getHours()
            return false
        },
        getPrice(hour) {
            const slot = this.currentCourtSlotsMap.get(hour)
            if (slot && slot.price !== undefined) return slot.price
            return getPriceForHour(hour, this.currentCourt, this.defaultPricing)
        },
        timeSlotClass(hour) {
            if (this.selectedHours.includes(hour)) return 'bg-line-green border-line-green shadow-[0_8px_16px_rgba(0,185,0,0.2)]'
            if (this.isMyBooking(hour)) return 'bg-blue-50 border-blue-200 cursor-not-allowed'
            if (this.isBooked(hour)) return 'bg-gray-50 border-gray-100 cursor-not-allowed shadow-none text-gray-300'
            return 'bg-white border-[#f0f3f5] hover:border-[#00b90044] hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-[0_6px_12px_rgba(0,185,0,0.08)]'
        },
        async fetchAvailability() {
            if (this.unsubscribe) this.unsubscribe()
            if (this.slotsUnsubscribe) this.slotsUnsubscribe()
            this.isLoadingBookings = true
            this.isLoadingSlots = true
            const dateStr = format(this.selectedDate, 'yyyy-MM-dd')
            this.unsubscribe = onSnapshot(
                query(collection(db, 'bookings'), where('tenantId', '==', TENANT_ID), where('date', '==', dateStr), where('status', 'in', ['paid', 'pending'])),
                (snapshot) => { this.allBookings = snapshot.docs.map(doc => doc.data()); this.isLoadingBookings = false }
            )
            this.slotsUnsubscribe = onSnapshot(
                query(collection(db, 'slots'), where('tenantId', '==', TENANT_ID), where('date', '==', dateStr)),
                (snapshot) => { this.allSlots = snapshot.docs.map(doc => doc.data()); this.isLoadingSlots = false }
            )
        },
        async fetchActiveDays() {
            if (this.datesUnsubscribe) this.datesUnsubscribe()
            const todayStr = format(new Date(), 'yyyy-MM-dd')
            this.datesUnsubscribe = onSnapshot(
                query(collection(db, 'active_days'), where('tenantId', '==', TENANT_ID), where('date', '>=', todayStr)),
                (snapshot) => {
                    this.activeDates = snapshot.docs.map((doc) => doc.data())
                    if (this.activeDates.length > 0) {
                        const availableDateStrings = this.activeDates.map((d) => d.date)
                        const currentSelectedStr = format(this.selectedDate, 'yyyy-MM-dd')
                        if (!availableDateStrings.includes(currentSelectedStr)) {
                            this.selectedDate = parseISO(availableDateStrings.sort()[0])
                        }
                    }
                }
            )
        },
        selectDate(date) { this.selectedDate = date; this.selectedHours = [] },
        selectCourt(id) { this.selectedCourtId = id; this.selectedHours = [] },
        toggleHour(hour) {
            const index = this.selectedHours.indexOf(hour)
            if (index > -1) { this.selectedHours.splice(index, 1) }
            else { this.selectedHours.push(hour); this.selectedHours.sort((a, b) => a - b) }
        },
        isBooked(hour) {
            if (this.isPast(hour)) return true
            if (this.bookedHoursSet.has(hour)) return true
            const slot = this.currentCourtSlotsMap.get(hour)
            return slot ? slot.status !== 'available' : false
        },
        isCourtFull(courtId) { return this.courtFullMap.get(courtId) ?? false },
        isMyBooking(hour) { return this.myBookedHoursSet.has(hour) },
        getSlotStatusLabel(hour) {
            if (this.isPast(hour)) return 'หมดเวลา'
            const myBooking = this.currentCourtBookings.find(b =>
                b.userId === this.profile?.userId && b.hours.includes(hour) &&
                (b.status === 'paid' || (b.status === 'pending' && !isBookingExpired(b)))
            )
            if (myBooking) return myBooking.status === 'pending' ? 'รอชำระเงิน' : 'จองแล้ว'
            const otherBooking = this.currentCourtBookings.find(b =>
                b.hours.includes(hour) && (b.status === 'paid' || (b.status === 'pending' && !isBookingExpired(b)))
            )
            if (otherBooking) return otherBooking.status === 'paid' ? 'เต็มแล้ว' : 'รอชำระเงิน'
            const slot = this.currentCourtSlotsMap.get(hour)
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
                query: { courtId: this.selectedCourtId, date: format(this.selectedDate, 'yyyy-MM-dd'), hours: this.selectedHours.join(',') }
            })
        }
    },
    mounted() {
        this.fetchActiveDays()
        this.refreshTimer = setInterval(() => { this.currentTime = new Date() }, 60000)
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
.spinner-green {
    width: 30px;
    height: 30px;
    border: 3px solid #e5e7eb;
    border-top-color: #00b900;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

/* Vue transition classes */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active {
    transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>

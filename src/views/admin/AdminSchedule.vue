<template>
    <div class="flex min-h-screen bg-[#f4f7f9]">
        <AdminSidebar />

        <main class="flex-1">
            <header class="bg-white px-8 py-6 flex justify-between items-center shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                <h1 class="m-0 text-2xl font-bold text-gray-900">จัดการตารางเวลา (Schedule Management)</h1>
                <button class="bg-ant-blue text-white border-0 px-6 py-2.5 rounded-lg cursor-pointer font-semibold" @click="showGenerateModal = true">
                    + สร้าง Slot
                </button>
            </header>

            <div class="p-6 pb-28">
                <!-- Filters bar -->
                <div class="flex justify-between items-center mb-6 bg-white px-6 py-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                    <div class="flex gap-2">
                        <button
                            class="px-4 py-2 border rounded-md cursor-pointer font-medium transition-all duration-200"
                            :class="currentView === 'daily' ? 'bg-ant-blue text-white border-ant-blue' : 'bg-white border-gray-200'"
                            @click="currentView = 'daily'"
                        >ดูรายวัน (ทุกคอร์ท)</button>
                        <button
                            class="px-4 py-2 border rounded-md cursor-pointer font-medium transition-all duration-200"
                            :class="currentView === 'weekly' ? 'bg-ant-blue text-white border-ant-blue' : 'bg-white border-gray-200'"
                            @click="currentView = 'weekly'"
                        >ดูรายสัปดาห์ (1 คอร์ท)</button>
                    </div>

                    <div class="flex gap-3 items-center">
                        <!-- Toggle switch -->
                        <div class="flex items-center gap-3 mr-5">
                            <label class="toggle-switch">
                                <input type="checkbox" v-model="isSelectionMode" @change="clearSelection" class="sr-only" />
                                <span class="toggle-track"></span>
                            </label>
                            <span class="text-sm font-semibold text-gray-600">
                                {{ isSelectionMode ? 'โหมดเลือกหลายรายการ ON' : 'โหมดเลือกหลายรายการ OFF' }}
                            </span>
                        </div>
                        <input type="date" v-model="selectedDate" class="px-3 py-2 border border-gray-200 rounded-md" />
                        <select v-if="currentView === 'weekly'" v-model="selectedCourtId" class="px-3 py-2 border border-gray-200 rounded-md">
                            <option v-for="court in courts" :key="court.id" :value="court.id">{{ court.name }}</option>
                        </select>
                    </div>
                </div>

                <!-- Schedule grid -->
                <div class="bg-white rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative">
                    <div v-if="isLoading" class="absolute inset-0 bg-white/70 flex items-center justify-center z-10 font-bold">
                        กำลังโหลดข้อมูล...
                    </div>

                    <!-- Daily view -->
                    <table v-if="currentView === 'daily'" class="w-full border-collapse" style="table-layout: fixed">
                        <thead>
                            <tr>
                                <th class="bg-gray-50 px-3 py-3 text-center border-b-2 border-r border-gray-100 text-sm text-gray-500 w-[120px]">เวลา</th>
                                <th v-for="court in courts" :key="court.id" class="bg-gray-50 px-3 py-3 text-center border-b-2 border-r border-gray-100 text-sm text-gray-500">
                                    <div class="flex items-center justify-center gap-2">
                                        {{ court.name }}
                                        <button v-if="isSelectionMode" class="sel-all-btn" @click="selectAllInCourt(court.id)" title="เลือกทั้งคอร์ท">↓</button>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="hour in operatingHoursList" :key="hour">
                                <td class="w-[120px] text-center text-sm text-gray-400 bg-gray-50 border-b border-r border-gray-100 align-middle px-3 py-2">
                                    <div class="flex items-center justify-center gap-2">
                                        <button v-if="isSelectionMode" class="sel-all-btn" @click="selectAllInRow(hour)" title="เลือกทั้งแถว">→</button>
                                        {{ formatTime(hour) }}
                                    </div>
                                </td>
                                <td v-for="court in courts" :key="court.id" class="border-b border-r border-gray-100 p-1">
                                    <SlotItem
                                        :slot="getSlot(selectedDate, court.id, hour)"
                                        :isSelectionMode="isSelectionMode"
                                        :isSelected="isSelected(getSlot(selectedDate, court.id, hour)?.id)"
                                        @update="updateSlotStatus"
                                        @toggle-selection="toggleSelection"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Weekly view -->
                    <table v-else class="w-full border-collapse" style="table-layout: fixed">
                        <thead>
                            <tr>
                                <th class="bg-gray-50 px-3 py-3 text-center border-b-2 border-r border-gray-100 text-sm text-gray-500 w-[120px]">เวลา</th>
                                <th v-for="day in weekDays" :key="day.dateStr" class="bg-gray-50 px-3 py-3 text-center border-b-2 border-r border-gray-100 text-sm text-gray-500">
                                    <div class="flex flex-col items-center gap-1">
                                        <div class="flex items-center gap-2">
                                            {{ day.label }}<br /><small>{{ day.dateStr }}</small>
                                            <button v-if="isSelectionMode" class="sel-all-btn" @click="selectAllInDay(day.dateStr)" title="เลือกทั้งวัน">↓</button>
                                        </div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="hour in operatingHoursList" :key="hour">
                                <td class="w-[120px] text-center text-sm text-gray-400 bg-gray-50 border-b border-r border-gray-100 align-middle px-3 py-2">
                                    <div class="flex items-center justify-center gap-2">
                                        <button v-if="isSelectionMode" class="sel-all-btn" @click="selectAllInRow(hour)" title="เลือกทั้งแถว">→</button>
                                        {{ formatTime(hour) }}
                                    </div>
                                </td>
                                <td v-for="day in weekDays" :key="day.dateStr" class="border-b border-r border-gray-100 p-1">
                                    <SlotItem
                                        :slot="getSlot(day.dateStr, selectedCourtId, hour)"
                                        :isSelectionMode="isSelectionMode"
                                        :isSelected="isSelected(getSlot(day.dateStr, selectedCourtId, hour)?.id)"
                                        @update="updateSlotStatus"
                                        @toggle-selection="toggleSelection"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Generate Modal -->
            <div v-if="showGenerateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
                <div class="bg-white p-8 rounded-2xl w-[400px] shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
                    <h3 class="mt-0 mb-6 text-lg font-bold">สร้าง Slot อัตโนมัติ</h3>
                    <div class="mb-5">
                        <label class="block mb-2 font-medium">ตั้งแต่วันที่</label>
                        <input type="date" v-model="genStart" class="w-full px-3 py-3 border border-gray-200 rounded-lg" />
                    </div>
                    <div class="mb-5">
                        <label class="block mb-2 font-medium">ถึงวันที่</label>
                        <input type="date" v-model="genEnd" class="w-full px-3 py-3 border border-gray-200 rounded-lg" />
                    </div>
                    <p class="text-xs text-gray-400 mb-6 leading-relaxed">
                        * ระบบจะสร้าง Slot โดยใช้เวลาเปิด-ปิด และราคาที่ตั้งไว้ในหน้า Settings โดยให้สถานะเป็น 'pending'
                    </p>
                    <div class="flex justify-end gap-3">
                        <button class="px-6 py-2.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg cursor-pointer" @click="showGenerateModal = false">ยกเลิก</button>
                        <button class="px-6 py-2.5 bg-ant-blue text-white border-0 rounded-lg cursor-pointer font-semibold disabled:opacity-50" :disabled="isGenerating" @click="handleGenerate">
                            {{ isGenerating ? 'กำลังสร้าง...' : 'ตกลง' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Floating bulk action bar -->
            <div v-if="isSelectionMode && selectedSlotIds.length > 0" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
                <div class="bg-ant-navy text-white px-6 py-3 rounded-full flex items-center gap-6 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                    <div class="font-bold pr-5 border-r border-white/20">เลือกอยู่ {{ selectedSlotIds.length }} รายการ</div>
                    <div class="flex items-center gap-2.5">
                        <button class="px-4 py-1.5 rounded-full border-0 text-sm font-semibold cursor-pointer bg-[#52c41a] text-white hover:opacity-90 hover:scale-105 transition-all" @click="bulkUpdateStatus('available')">Available</button>
                        <button class="px-4 py-1.5 rounded-full border-0 text-sm font-semibold cursor-pointer bg-[#ff4d4f] text-white hover:opacity-90 hover:scale-105 transition-all" @click="bulkUpdateStatus('closed')">Closed</button>
                        <button class="px-4 py-1.5 rounded-full border-0 text-sm font-semibold cursor-pointer bg-gray-500 text-white hover:opacity-90 hover:scale-105 transition-all" @click="bulkUpdateStatus('pending')">Pending</button>
                        <button class="px-4 py-1.5 rounded-full border-0 text-sm font-semibold cursor-pointer bg-[#faad14] text-white hover:opacity-90 hover:scale-105 transition-all" @click="bulkUpdateStatus('locked')">Locked</button>
                        <div class="w-px h-5 bg-white/20 mx-1"></div>
                        <button class="px-4 py-1.5 rounded-full border border-gray-500 text-sm font-semibold cursor-pointer bg-transparent text-gray-300 hover:opacity-90 transition-all" @click="clearSelection">ยกเลิก</button>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script>
import AdminSidebar from '../../components/AdminSidebar.vue'
import SlotItem from '../../components/SlotItem.vue'
import { mapState } from 'pinia'
import { useConfigStore } from '../../stores/config'
import { db } from '../../firebase'
import { TENANT_ID } from '../../constants'
import { isBookingExpired, getPriceForHour } from '../../utils/booking'
import { collection, query, where, getDocs, writeBatch, doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { format, addDays, eachDayOfInterval, parseISO } from 'date-fns'

export default {
    components: { AdminSidebar, SlotItem },
    data() {
        return {
            currentView: 'daily',
            selectedDate: format(new Date(), 'yyyy-MM-dd'),
            selectedCourtId: null,
            showGenerateModal: false,
            isGenerating: false,
            isLoading: false,
            slots: [],
            bookings: [],
            unsubscribe: null,
            bookingsUnsubscribe: null,
            genStart: format(new Date(), 'yyyy-MM-dd'),
            genEnd: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
            isSelectionMode: false,
            selectedSlotIds: []
        }
    },
    computed: {
        ...mapState(useConfigStore, ['courts', 'operatingHours', 'defaultPricing']),
        operatingHoursList() {
            const list = []
            for (let i = this.operatingHours.open; i < this.operatingHours.close; i++) list.push(i)
            return list
        },
        weekDays() {
            const start = parseISO(this.selectedDate)
            const end = addDays(start, 6)
            return eachDayOfInterval({ start, end }).map((d) => ({
                dateStr: format(d, 'yyyy-MM-dd'),
                label: format(d, 'EEE')
            }))
        },
        slotsMap() {
            const map = new Map()
            this.slots.forEach((s) => {
                const key = `${s.date}_${s.courtId}_${s.hour}`
                const booking = this.bookings.find(
                    (b) => b.date === s.date && Number(b.courtId) === Number(s.courtId) &&
                        b.hours.includes(Number(s.hour)) &&
                        (b.status === 'paid' || (b.status === 'pending' && !isBookingExpired(b)))
                )
                map.set(key, booking ? { ...s, booking } : s)
            })
            return map
        }
    },
    methods: {
        formatTime(h) { return `${String(h).padStart(2, '0')}:00` },
        getSlot(date, courtId, hour) { return this.slotsMap.get(`${date}_${courtId}_${hour}`) },
        async handleGenerate() {
            this.isGenerating = true
            const batch = writeBatch(db)
            const days = eachDayOfInterval({ start: parseISO(this.genStart), end: parseISO(this.genEnd) })
            try {
                this.isLoading = true
                for (const day of days) {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    batch.set(doc(db, 'active_days', dateStr), { date: dateStr, tenantId: TENANT_ID, updatedAt: new Date() }, { merge: true })
                    for (const court of this.courts) {
                        for (let hour = this.operatingHours.open; hour < this.operatingHours.close; hour++) {
                            const slotId = `${dateStr}_${court.id}_${hour}`
                            batch.set(doc(db, 'slots', slotId), {
                                id: slotId, date: dateStr, courtId: court.id, hour,
                                status: 'pending', price: getPriceForHour(hour, court, this.defaultPricing),
                                tenantId: TENANT_ID, createdAt: new Date()
                            }, { merge: false })
                        }
                    }
                }
                await batch.commit()
                this.showGenerateModal = false
                this.fetchSlots()
                alert('Generate Slots สำเร็จ!')
            } catch (error) {
                console.error(error)
                alert('เกิดข้อผิดพลาด: ' + error.message)
            } finally {
                this.isGenerating = false
                this.isLoading = false
            }
        },
        async updateSlotStatus({ id, status }) {
            try {
                await updateDoc(doc(db, 'slots', id), { status })
            } catch (error) {
                alert('ไม่สามารถอัปเดตสถานะได้')
            }
        },
        fetchSlots() {
            if (this.unsubscribe) this.unsubscribe()
            this.isLoading = true
            this.slots = []
            let q
            if (this.currentView === 'daily') {
                q = query(collection(db, 'slots'), where('tenantId', '==', TENANT_ID), where('date', '==', this.selectedDate))
            } else {
                q = query(collection(db, 'slots'), where('tenantId', '==', TENANT_ID), where('courtId', '==', Number(this.selectedCourtId)), where('date', 'in', this.weekDays.map((d) => d.dateStr)))
            }
            this.unsubscribe = onSnapshot(q, (snapshot) => {
                this.slots = snapshot.docs.map((doc) => doc.data())
                this.isLoading = false
            }, (error) => {
                console.error('Firestore error:', error)
                alert('Error loading slots: ' + error.message)
                this.isLoading = false
            })
            let bq
            if (this.currentView === 'daily') {
                bq = query(collection(db, 'bookings'), where('tenantId', '==', TENANT_ID), where('date', '==', this.selectedDate), where('status', 'in', ['paid', 'pending']))
            } else {
                bq = query(collection(db, 'bookings'), where('tenantId', '==', TENANT_ID), where('courtId', '==', Number(this.selectedCourtId)), where('date', 'in', this.weekDays.map((d) => d.dateStr)), where('status', 'in', ['paid', 'pending']))
            }
            if (this.bookingsUnsubscribe) this.bookingsUnsubscribe()
            this.bookingsUnsubscribe = onSnapshot(bq, (snapshot) => {
                this.bookings = snapshot.docs.map((doc) => doc.data())
            })
        },
        toggleSelection(slotId) {
            const index = this.selectedSlotIds.indexOf(slotId)
            if (index > -1) { this.selectedSlotIds.splice(index, 1) } else { this.selectedSlotIds.push(slotId) }
        },
        isSelected(slotId) { return this.selectedSlotIds.includes(slotId) },
        clearSelection() { this.selectedSlotIds = [] },
        selectAllInCourt(courtId) {
            this.addManyToSelection(Array.from(this.slotsMap.values()).filter((s) => String(s.courtId) == String(courtId) && !s.booking).map((s) => s.id))
        },
        selectAllInRow(hour) {
            this.addManyToSelection(Array.from(this.slotsMap.values()).filter((s) => Number(s.hour) == Number(hour) && !s.booking).map((s) => s.id))
        },
        selectAllInDay(date) {
            this.addManyToSelection(Array.from(this.slotsMap.values()).filter((s) => s.date == date && !s.booking).map((s) => s.id))
        },
        addManyToSelection(ids) {
            ids.forEach((id) => { if (!this.selectedSlotIds.includes(id)) this.selectedSlotIds.push(id) })
        },
        async bulkUpdateStatus(status) {
            if (this.selectedSlotIds.length === 0) return
            this.isLoading = true
            const batch = writeBatch(db)
            try {
                this.selectedSlotIds.forEach((id) => batch.update(doc(db, 'slots', id), { status }))
                await batch.commit()
                const count = this.selectedSlotIds.length
                this.clearSelection()
                this.isSelectionMode = false
                alert(`อัปเดต ${count} รายการสำเร็จ!`)
            } catch (error) {
                console.error('Bulk update error:', error)
                alert('เกิดข้อผิดพลาดในการอัปเดตแบบกลุ่ม: ' + error.message)
            } finally {
                this.isLoading = false
            }
        }
    },
    watch: {
        selectedDate: 'fetchSlots',
        selectedCourtId: 'fetchSlots',
        currentView: 'fetchSlots',
        courts: {
            handler(newCourts) {
                if (newCourts.length > 0 && !this.selectedCourtId) this.selectedCourtId = newCourts[0].id
            },
            immediate: true
        }
    },
    mounted() { this.fetchSlots() },
    beforeUnmount() {
        if (this.unsubscribe) this.unsubscribe()
        if (this.bookingsUnsubscribe) this.bookingsUnsubscribe()
    }
}
</script>

<style scoped>
@reference "../../style.css";

/* Toggle switch */
.toggle-switch { @apply relative inline-block w-11 h-[22px]; }
.toggle-track {
    @apply absolute inset-0 bg-gray-300 rounded-full cursor-pointer transition-all duration-300;
}
.toggle-track::before {
    content: '';
    @apply absolute w-4 h-4 bg-white rounded-full left-[3px] bottom-[3px] transition-all duration-300;
}
input:checked ~ .toggle-track { @apply bg-ant-blue; }
input:checked ~ .toggle-track::before { @apply translate-x-[22px]; }

/* Select-all mini button */
.sel-all-btn {
    @apply bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 cursor-pointer text-[10px] text-gray-500 transition-all duration-200 hover:bg-ant-blue hover:text-white hover:border-ant-blue;
}
</style>

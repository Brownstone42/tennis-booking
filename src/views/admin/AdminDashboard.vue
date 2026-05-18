<template>
    <div class="flex min-h-screen bg-[#f4f7f9]">
        <AdminSidebar />

        <div class="flex-1">
            <header class="bg-white px-8 py-4 flex justify-between items-center shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                <div>
                    <h1 class="m-0 text-2xl font-bold text-gray-800">Dashboard</h1>
                    <span class="text-sm text-gray-400">{{ todayStr }}</span>
                </div>
            </header>

            <div class="p-8">
                <!-- Stats -->
                <section class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 mb-8">
                    <!-- Booking count -->
                    <div class="bg-white p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col border-l-4 border-ant-blue">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                <svg class="w-5 h-5 text-ant-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </span>
                            <span class="text-gray-400 text-sm">การจองวันนี้</span>
                        </div>
                        <span v-if="!bookingsLoaded" class="h-9 w-20 bg-gray-200 rounded-lg animate-pulse mt-1"></span>
                        <span v-else class="text-[1.8rem] font-extrabold text-gray-900">{{ todayBookingsCount }}</span>
                    </div>

                    <!-- Revenue -->
                    <div class="bg-white p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col border-l-4 border-[#52c41a]">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                <svg class="w-5 h-5 text-[#52c41a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </span>
                            <span class="text-gray-400 text-sm">รายได้วันนี้</span>
                        </div>
                        <span v-if="!bookingsLoaded" class="h-9 w-28 bg-gray-200 rounded-lg animate-pulse mt-1"></span>
                        <span v-else class="text-[1.8rem] font-extrabold text-gray-900">฿{{ todayRevenue }}</span>
                    </div>

                    <!-- Courts available -->
                    <div class="bg-white p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col border-l-4 border-[#faad14]">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                                <svg class="w-5 h-5 text-[#faad14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                </svg>
                            </span>
                            <span class="text-gray-400 text-sm">สนามที่ว่างตอนนี้</span>
                        </div>
                        <span v-if="!bookingsLoaded" class="h-9 w-16 bg-gray-200 rounded-lg animate-pulse mt-1"></span>
                        <span v-else class="text-[1.8rem] font-extrabold text-gray-900">{{ availableCourtsNow }}</span>
                    </div>
                </section>

                <!-- Bookings table -->
                <section class="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                    <div class="flex justify-between items-center mb-5">
                        <h2 class="m-0 text-lg font-bold text-gray-800">รายการจองทั้งหมด</h2>
                    </div>

                    <!-- Filter bar -->
                    <div class="flex flex-wrap gap-3 mb-5 pb-5 border-b border-gray-100">
                        <input
                            type="date"
                            v-model="filterDate"
                            class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ant-blue"
                        />
                        <select v-model="filterStatus" class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ant-blue">
                            <option value="">ทุกสถานะ</option>
                            <option value="paid">สำเร็จ</option>
                            <option value="pending">รอดำเนินการ</option>
                            <option value="expired">หมดเวลา</option>
                            <option value="failed">ล้มเหลว</option>
                        </select>
                        <input
                            type="text"
                            v-model="filterSearch"
                            placeholder="ค้นหาชื่อ / เบอร์โทร"
                            class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ant-blue min-w-[200px]"
                        />
                        <button v-if="filterDate || filterStatus || filterSearch" class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 underline" @click="clearFilters">ล้างตัวกรอง</button>
                    </div>

                    <table class="w-full border-collapse">
                        <thead>
                            <tr>
                                <th class="text-left p-4 bg-gray-50 text-gray-500 text-sm border-b border-gray-100" v-for="h in ['วันที่จอง','เวลา','สนาม','ชื่อลูกค้า','เบอร์โทร','ราคา','สถานะ','ดำเนินการ']" :key="h">{{ h }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Skeleton rows -->
                            <template v-if="!bookingsLoaded">
                                <tr v-for="n in 5" :key="'sk-' + n">
                                    <td v-for="c in 8" :key="c" class="p-4 border-b border-gray-100">
                                        <div class="h-4 bg-gray-200 rounded animate-pulse" :style="{ width: c === 8 ? '60px' : '80%' }"></div>
                                    </td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr v-for="booking in filteredBookings" :key="booking.id">
                                    <td class="p-4 border-b border-gray-100 text-sm">{{ booking.date }}</td>
                                    <td class="p-4 border-b border-gray-100 text-sm">{{ booking.hours?.join(', ') }}:00</td>
                                    <td class="p-4 border-b border-gray-100 text-sm">คอร์ท {{ booking.courtId }}</td>
                                    <td class="p-4 border-b border-gray-100 text-sm">{{ booking.displayName }}</td>
                                    <td class="p-4 border-b border-gray-100 text-sm">{{ booking.phone }}</td>
                                    <td class="p-4 border-b border-gray-100 text-sm">฿{{ booking.amount }}</td>
                                    <td class="p-4 border-b border-gray-100 text-sm">
                                        <span :class="statusTagClass(booking.status)">
                                            {{ statusLabel(booking.status) }}
                                        </span>
                                    </td>
                                    <td class="p-4 border-b border-gray-100 text-sm">
                                        <button class="p-1.5 rounded-md text-gray-400 hover:text-ant-blue hover:bg-blue-50 transition-colors mr-1" title="ดูรายละเอียด">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                        </button>
                                        <button class="p-1.5 rounded-md text-gray-400 hover:text-ant-blue hover:bg-blue-50 transition-colors" title="แก้ไข">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                                <tr v-if="filteredBookings.length === 0">
                                    <td colspan="8" class="text-center py-16 text-gray-400">ไม่พบรายการที่ตรงกับเงื่อนไข</td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    </div>
</template>

<script>
import AdminSidebar from '../../components/AdminSidebar.vue'
import { mapState } from 'pinia'
import { useConfigStore } from '../../stores/config'
import { auth, db } from '../../firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export default {
    components: { AdminSidebar },
    data() {
        return {
            bookings: [],
            bookingsLoaded: false,
            unsubscribe: null,
            todayStr: format(new Date(), 'EEEE d MMMM yyyy', { locale: th }),
            filterDate: '',
            filterStatus: '',
            filterSearch: ''
        }
    },
    computed: {
        ...mapState(useConfigStore, ['courts']),
        todayBookingsCount() {
            const today = format(new Date(), 'yyyy-MM-dd')
            return this.bookings.filter((b) => b.date === today && b.status === 'paid').length
        },
        todayRevenue() {
            const today = format(new Date(), 'yyyy-MM-dd')
            return this.bookings
                .filter((b) => b.date === today && b.status === 'paid')
                .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
                .toLocaleString()
        },
        availableCourtsNow() {
            const today = format(new Date(), 'yyyy-MM-dd')
            const currentHour = new Date().getHours()
            const total = this.courts.length
            const bookedCourtIds = new Set(
                this.bookings
                    .filter((b) => b.date === today && b.hours?.includes(currentHour) && (b.status === 'paid' || b.status === 'pending'))
                    .map((b) => b.courtId)
            )
            return `${total - bookedCourtIds.size} / ${total}`
        },
        filteredBookings() {
            return this.bookings.filter((b) => {
                if (this.filterDate && b.date !== this.filterDate) return false
                if (this.filterStatus && b.status !== this.filterStatus) return false
                if (this.filterSearch) {
                    const q = this.filterSearch.toLowerCase()
                    const nameMatch = b.displayName?.toLowerCase().includes(q)
                    const phoneMatch = b.phone?.includes(q)
                    if (!nameMatch && !phoneMatch) return false
                }
                return true
            })
        }
    },
    methods: {
        clearFilters() {
            this.filterDate = ''
            this.filterStatus = ''
            this.filterSearch = ''
        },
        fetchBookings() {
            const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
            this.unsubscribe = onSnapshot(q, (snapshot) => {
                this.bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
                this.bookingsLoaded = true
            })
        },
        statusLabel(status) {
            if (status === 'paid') return 'สำเร็จ'
            if (status === 'expired') return 'หมดเวลา'
            if (status === 'failed') return 'ล้มเหลว'
            return 'รอดำเนินการ'
        },
        statusTagClass(status) {
            const base = 'px-2.5 py-1 rounded-md text-xs font-bold'
            if (status === 'paid') return `${base} bg-[#f6ffed] text-[#52c41a]`
            if (status === 'pending') return `${base} bg-[#fff7e6] text-[#faad14]`
            if (status === 'failed') return `${base} bg-[#fff2f0] text-[#ff4d4f]`
            return `${base} bg-gray-100 text-gray-400 border border-gray-200`
        }
    },
    created() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.fetchBookings()
            } else {
                this.$router.push({ name: 'admin-login' })
            }
        })
    },
    beforeUnmount() {
        if (this.unsubscribe) this.unsubscribe()
    }
}
</script>

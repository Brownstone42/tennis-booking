<template>
    <div class="flex min-h-screen bg-[#f4f7f9]">
        <AdminSidebar />

        <div class="flex-1">
            <header class="bg-white px-8 py-4 flex justify-between items-center shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                <div>
                    <h1 class="m-0 text-2xl font-bold text-gray-800">Dashboard</h1>
                    <span class="text-sm text-gray-400">{{ todayStr }}</span>
                </div>
                <div class="text-sm text-gray-600">{{ user?.email }}</div>
            </header>

            <div class="p-8">
                <!-- Stats -->
                <section class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 mb-8">
                    <div class="bg-white p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col">
                        <span class="text-gray-400 text-sm mb-2">การจองวันนี้</span>
                        <span class="text-[1.8rem] font-extrabold text-gray-900">{{ todayBookingsCount }}</span>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col">
                        <span class="text-gray-400 text-sm mb-2">รายได้วันนี้</span>
                        <span class="text-[1.8rem] font-extrabold text-gray-900">฿{{ todayRevenue }}</span>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col">
                        <span class="text-gray-400 text-sm mb-2">สนามที่ว่างตอนนี้</span>
                        <span class="text-[1.8rem] font-extrabold text-gray-900">3 / 4</span>
                    </div>
                </section>

                <!-- Bookings table -->
                <section class="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="m-0 text-lg font-bold text-gray-800">รายการจองทั้งหมด</h2>
                        <button class="bg-ant-blue text-white border-0 px-5 py-2.5 rounded-lg font-semibold cursor-pointer">
                            + เพิ่มการจอง (Manual)
                        </button>
                    </div>

                    <table class="w-full border-collapse">
                        <thead>
                            <tr>
                                <th class="text-left p-4 bg-gray-50 text-gray-500 text-sm border-b border-gray-100" v-for="h in ['วันที่จอง','เวลา','สนาม','ชื่อลูกค้า','เบอร์โทร','ราคา','สถานะ','ดำเนินการ']" :key="h">{{ h }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="booking in bookings" :key="booking.id">
                                <td class="p-4 border-b border-gray-100 text-sm">{{ booking.date }}</td>
                                <td class="p-4 border-b border-gray-100 text-sm">{{ booking.hours?.join(', ') }}:00</td>
                                <td class="p-4 border-b border-gray-100 text-sm">คอร์ท {{ booking.courtId }}</td>
                                <td class="p-4 border-b border-gray-100 text-sm">{{ booking.displayName }}</td>
                                <td class="p-4 border-b border-gray-100 text-sm">{{ booking.phone }}</td>
                                <td class="p-4 border-b border-gray-100 text-sm">฿{{ booking.amount }}</td>
                                <td class="p-4 border-b border-gray-100 text-sm">
                                    <span :class="statusTagClass(booking.status)">
                                        {{ booking.status === 'paid' ? 'สำเร็จ' : booking.status === 'expired' ? 'หมดเวลา' : 'รอดำเนินการ' }}
                                    </span>
                                </td>
                                <td class="p-4 border-b border-gray-100 text-sm">
                                    <button class="bg-transparent border-0 cursor-pointer mr-2 text-base">👁️</button>
                                    <button class="bg-transparent border-0 cursor-pointer text-base">✏️</button>
                                </td>
                            </tr>
                            <tr v-if="bookings.length === 0">
                                <td colspan="8" class="text-center py-16 text-gray-400">ยังไม่มีข้อมูลการจองในระบบ</td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    </div>
</template>

<script>
import AdminSidebar from '../../components/AdminSidebar.vue'
import { auth, db } from '../../firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export default {
    components: { AdminSidebar },
    data() {
        return {
            user: null,
            bookings: [],
            unsubscribe: null,
            todayStr: format(new Date(), 'EEEE d MMMM yyyy', { locale: th })
        }
    },
    computed: {
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
        }
    },
    methods: {
        fetchBookings() {
            const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
            this.unsubscribe = onSnapshot(q, (snapshot) => {
                this.bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            })
        },
        statusTagClass(status) {
            const base = 'px-2.5 py-1 rounded-md text-xs font-bold'
            if (status === 'paid') return `${base} bg-[#f6ffed] text-[#52c41a]`
            if (status === 'pending') return `${base} bg-[#fff7e6] text-[#faad14]`
            return `${base} bg-gray-100 text-gray-400 border border-gray-200`
        }
    },
    created() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user = user
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

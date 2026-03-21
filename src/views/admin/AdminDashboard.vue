<template>
    <div class="admin-layout">
        <AdminSidebar />

        <div class="main-body">
            <header class="top-bar">
                <div class="page-title">
                    <h1>Dashboard</h1>
                    <span class="date-today">{{ todayStr }}</span>
                </div>
                <div class="admin-user">
                    <span>{{ user?.email }}</span>
                </div>
            </header>

            <div class="dashboard-content">
                <section class="stats-row">
                    <div class="stat-card">
                        <span class="stat-label">การจองวันนี้</span>
                        <span class="stat-value">{{ todayBookingsCount }}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">รายได้วันนี้</span>
                        <span class="stat-value">฿{{ todayRevenue }}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">สนามที่ว่างตอนนี้</span>
                        <span class="stat-value">3 / 4</span>
                    </div>
                </section>

                <section class="data-section">
                    <div class="section-header">
                        <h2>รายการจองทั้งหมด</h2>
                        <div class="table-actions">
                            <button class="btn-primary">+ เพิ่มการจอง (Manual)</button>
                        </div>
                    </div>
                    
                    <div class="table-card">
                        <table>
                            <thead>
                                <tr>
                                    <th>วันที่จอง</th>
                                    <th>เวลา</th>
                                    <th>สนาม</th>
                                    <th>ชื่อลูกค้า</th>
                                    <th>เบอร์โทร</th>
                                    <th>ราคา</th>
                                    <th>สถานะ</th>
                                    <th>ดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="booking in bookings" :key="booking.id">
                                    <td>{{ booking.date }}</td>
                                    <td>{{ booking.hours?.join(', ') }}:00</td>
                                    <td>คอร์ท {{ booking.courtId }}</td>
                                    <td>{{ booking.displayName }}</td>
                                    <td>{{ booking.phone }}</td>
                                    <td>฿{{ booking.amount }}</td>
                                    <td>
                                        <span :class="['status-tag', booking.status]">
                                            {{ booking.status === 'paid' ? 'สำเร็จ' : 'รอดำเนินการ' }}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn-icon">👁️</button>
                                        <button class="btn-icon">✏️</button>
                                    </td>
                                </tr>
                                <tr v-if="bookings.length === 0">
                                    <td colspan="8" class="empty-row">ยังไม่มีข้อมูลการจองในระบบ</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
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
            return this.bookings.filter(b => b.date === today && b.status === 'paid').length
        },
        todayRevenue() {
            const today = format(new Date(), 'yyyy-MM-dd')
            return this.bookings
                .filter(b => b.date === today && b.status === 'paid')
                .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
                .toLocaleString()
        }
    },
    methods: {
        fetchBookings() {
            const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
            this.unsubscribe = onSnapshot(q, (snapshot) => {
                this.bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            })
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

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: #f4f7f9; }
.main-body { flex-grow: 1; }
.top-bar { background: white; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.page-title h1 { margin: 0; font-size: 1.4rem; color: #333; }
.date-today { font-size: 0.85rem; color: #999; }
.dashboard-content { padding: 32px; }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 32px; }
.stat-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); display: flex; flex-direction: column; }
.stat-label { color: #888; font-size: 0.9rem; margin-bottom: 8px; }
.stat-value { font-size: 1.8rem; font-weight: 800; color: #1a1a1a; }

.data-section { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.btn-primary { background: #1890ff; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }

table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 16px; background: #fafafa; color: #555; font-size: 0.85rem; border-bottom: 1px solid #f0f0f0; }
td { padding: 16px; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
.status-tag { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: bold; }
.status-tag.paid { background: #f6ffed; color: #52c41a; }
.status-tag.pending { background: #fff7e6; color: #faad14; }
.btn-icon { background: none; border: none; cursor: pointer; margin-right: 8px; font-size: 1rem; }
.empty-row { text-align: center; padding: 60px !important; color: #999; }
</style>

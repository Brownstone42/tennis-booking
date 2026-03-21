<template>
    <div class="admin-layout">
        <AdminSidebar />

        <main class="main-body">
            <header class="top-bar">
                <h1>จัดการตารางเวลา (Schedule Management)</h1>
                <div class="top-actions">
                    <button class="btn-primary" @click="showGenerateModal = true">+ สร้าง Slot</button>
                </div>
            </header>

            <div class="dashboard-content">
                <!-- Navigation Tabs & Filters -->
                <div class="schedule-filters">
                    <div class="view-tabs">
                        <button 
                            :class="{ active: currentView === 'daily' }" 
                            @click="currentView = 'daily'"
                        >ดูรายวัน (ทุกคอร์ท)</button>
                        <button 
                            :class="{ active: currentView === 'weekly' }" 
                            @click="currentView = 'weekly'"
                        >ดูรายสัปดาห์ (1 คอร์ท)</button>
                    </div>

                    <div class="date-court-picker">
                        <input type="date" v-model="selectedDate" class="form-input-sm" />
                        <select v-if="currentView === 'weekly'" v-model="selectedCourtId" class="form-input-sm">
                            <option v-for="court in courts" :key="court.id" :value="court.id">
                                {{ court.name }}
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Schedule Grid Display -->
                <div class="schedule-grid-container">
                    <div v-if="isLoading" class="loading-overlay">กำลังโหลดข้อมูล...</div>
                    
                    <!-- Daily View: Courts as columns, Hours as rows -->
                    <table v-if="currentView === 'daily'" class="schedule-table">
                        <thead>
                            <tr>
                                <th>เวลา</th>
                                <th v-for="court in courts" :key="court.id">{{ court.name }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="hour in operatingHoursList" :key="hour">
                                <td class="time-cell">{{ formatTime(hour) }} - {{ formatTime(hour+1) }}</td>
                                <td v-for="court in courts" :key="court.id" class="slot-cell">
                                    <SlotItem 
                                        :slot="getSlot(selectedDate, court.id, hour)" 
                                        @update="updateSlotStatus"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Weekly View: Days as columns, Hours as rows -->
                    <table v-else class="schedule-table">
                        <thead>
                            <tr>
                                <th>เวลา</th>
                                <th v-for="day in weekDays" :key="day.dateStr">
                                    {{ day.label }}<br><small>{{ day.dateStr }}</small>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="hour in operatingHoursList" :key="hour">
                                <td class="time-cell">{{ formatTime(hour) }} - {{ formatTime(hour+1) }}</td>
                                <td v-for="day in weekDays" :key="day.dateStr" class="slot-cell">
                                    <SlotItem 
                                        :slot="getSlot(day.dateStr, selectedCourtId, hour)" 
                                        @update="updateSlotStatus"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Generate Modal -->
            <div v-if="showGenerateModal" class="modal-overlay">
                <div class="modal-content">
                    <h3>สร้าง Slot อัตโนมัติ</h3>
                    <div class="form-group">
                        <label>ตั้งแต่วันที่</label>
                        <input type="date" v-model="genStart" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label>ถึงวันที่</label>
                        <input type="date" v-model="genEnd" class="form-input" />
                    </div>
                    <p class="hint">* ระบบจะสร้าง Slot โดยใช้เวลาเปิด-ปิด และราคาที่ตั้งไว้ในหน้า Settings โดยให้สถานะเป็น 'pending'</p>
                    <div class="modal-actions">
                        <button class="btn-secondary" @click="showGenerateModal = false">ยกเลิก</button>
                        <button class="btn-primary" :disabled="isGenerating" @click="handleGenerate">
                            {{ isGenerating ? 'กำลังสร้าง...' : 'ตกลง' }}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script>
import AdminSidebar from '../../components/AdminSidebar.vue'
import { mapState } from 'pinia'
import { useConfigStore } from '../../stores/config'
import { db } from '../../firebase'
import { collection, query, where, getDocs, writeBatch, doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns'

// Inline component for each Slot item for better management
const SlotItem = {
    props: ['slot'],
    template: `
        <div v-if="slot" class="slot-item" :class="slot.status" @click="toggleStatus">
            <div class="slot-status-dot"></div>
            <div class="slot-price">฿{{ slot.price }}</div>
            <div class="slot-status-text">{{ statusLabel }}</div>
        </div>
        <div v-else class="slot-empty">ไม่มีข้อมูล</div>
    `,
    computed: {
        statusLabel() {
            const labels = {
                'pending': 'Pending',
                'available': 'Available',
                'closed': 'Closed',
                'locked': 'Locked',
                'booked': 'Booked'
            }
            return labels[this.slot.status] || this.slot.status
        }
    },
    methods: {
        toggleStatus() {
            if (this.slot.status === 'booked') return; // Don't toggle booked slots easily
            
            const states = ['pending', 'available', 'closed', 'locked'];
            const currentIndex = states.indexOf(this.slot.status);
            const nextIndex = (currentIndex + 1) % states.length;
            this.$emit('update', { id: this.slot.id, status: states[nextIndex] });
        }
    }
}

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
            slots: [], // Local cache of slots
            unsubscribe: null,
            genStart: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            genEnd: format(addDays(new Date(), 7), 'yyyy-MM-dd')
        }
    },
    computed: {
        ...mapState(useConfigStore, ['courts', 'operatingHours', 'defaultPricing']),
        operatingHoursList() {
            const list = []
            for (let i = this.operatingHours.open; i < this.operatingHours.close; i++) {
                list.push(i)
            }
            return list
        },
        weekDays() {
            const current = parseISO(this.selectedDate)
            const start = startOfWeek(current, { weekStartsOn: 1 })
            const end = endOfWeek(current, { weekStartsOn: 1 })
            const days = eachDayOfInterval({ start, end })
            return days.map(d => ({
                dateStr: format(d, 'yyyy-MM-dd'),
                label: format(d, 'EEE')
            }))
        }
    },
    methods: {
        formatTime(h) {
            return `${String(h).padStart(2, '0')}:00`
        },
        getSlot(date, courtId, hour) {
            return this.slots.find(s => s.date === date && s.courtId === Number(courtId) && s.hour === hour)
        },
        getPriceForHour(court, hour) {
            // Check court specific pricing first
            if (court.pricing && court.pricing.length > 0) {
                const rule = court.pricing.find(p => hour >= p.start && hour < p.end)
                if (rule) return rule.rate
            }
            // Fallback to default pricing
            const defaultRule = this.defaultPricing.find(p => hour >= p.start && hour < p.end)
            return defaultRule ? defaultRule.rate : 0
        },
        async handleGenerate() {
            this.isGenerating = true
            const batch = writeBatch(db)
            const startDate = parseISO(this.genStart)
            const endDate = parseISO(this.genEnd)
            const days = eachDayOfInterval({ start: startDate, end: endDate })

            try {
                for (const day of days) {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    for (const court of this.courts) {
                        for (let hour = this.operatingHours.open; hour < this.operatingHours.close; hour++) {
                            const slotId = `${dateStr}_${court.id}_${hour}`
                            const docRef = doc(db, 'slots', slotId)
                            
                            batch.set(docRef, {
                                id: slotId,
                                date: dateStr,
                                courtId: court.id,
                                hour: hour,
                                status: 'pending',
                                price: this.getPriceForHour(court, hour),
                                tenantId: 'court_001',
                                createdAt: new Date()
                            }, { merge: false }) // Overwrite if exists to reset
                        }
                    }
                }
                await batch.commit()
                alert('Generate Slots สำเร็จ!')
                this.showGenerateModal = false
            } catch (error) {
                console.error(error)
                alert('เกิดข้อผิดพลาด: ' + error.message)
            } finally {
                this.isGenerating = false
            }
        },
        async updateSlotStatus({ id, status }) {
            try {
                const docRef = doc(db, 'slots', id)
                await updateDoc(docRef, { status })
            } catch (error) {
                alert('ไม่สามารถอัปเดตสถานะได้')
            }
        },
        fetchSlots() {
            if (this.unsubscribe) this.unsubscribe()
            this.isLoading = true
            
            let q;
            if (this.currentView === 'daily') {
                q = query(
                    collection(db, 'slots'),
                    where('tenantId', '==', 'court_001'),
                    where('date', '==', this.selectedDate)
                )
            } else {
                const weekDates = this.weekDays.map(d => d.dateStr)
                q = query(
                    collection(db, 'slots'),
                    where('tenantId', '==', 'court_001'),
                    where('courtId', '==', Number(this.selectedCourtId)),
                    where('date', 'in', weekDates)
                )
            }

            this.unsubscribe = onSnapshot(q, (snapshot) => {
                this.slots = snapshot.docs.map(doc => doc.data())
                this.isLoading = false
            })
        }
    },
    watch: {
        selectedDate: 'fetchSlots',
        selectedCourtId: 'fetchSlots',
        currentView: 'fetchSlots',
        courts: {
            handler(newCourts) {
                if (newCourts.length > 0 && !this.selectedCourtId) {
                    this.selectedCourtId = newCourts[0].id
                }
            },
            immediate: true
        }
    },
    mounted() {
        this.fetchSlots()
    },
    beforeUnmount() {
        if (this.unsubscribe) this.unsubscribe()
    }
}
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: #f4f7f9; }
.main-body { flex-grow: 1; }
.top-bar { background: white; padding: 24px 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
.top-bar h1 { margin: 0; font-size: 1.5rem; color: #1a1a1a; }
.dashboard-content { padding: 24px; }

.schedule-filters { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; background: white; padding: 16px 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
.view-tabs { display: flex; gap: 8px; }
.view-tabs button { padding: 8px 16px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; font-weight: 500; }
.view-tabs button.active { background: #1890ff; color: white; border-color: #1890ff; }

.date-court-picker { display: flex; gap: 12px; }
.form-input-sm { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; }

.schedule-grid-container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); position: relative; }
.loading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; z-index: 10; font-weight: bold; }

.schedule-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.schedule-table th { background: #fafafa; padding: 12px; text-align: center; border-bottom: 2px solid #f0f0f0; border-right: 1px solid #f0f0f0; font-size: 0.9rem; color: #555; }
.schedule-table td { border-bottom: 1px solid #f0f0f0; border-right: 1px solid #f0f0f0; vertical-align: top; }
.time-cell { width: 120px; text-align: center; font-size: 0.85rem; color: #888; background: #fafafa; vertical-align: middle !important; }

/* Slot Item Styling */
.slot-cell { padding: 4px; height: 70px; }
.slot-item { height: 100%; border-radius: 6px; padding: 6px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s; position: relative; overflow: hidden; }
.slot-item:hover { transform: scale(1.02); z-index: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

.slot-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #ccc; margin-bottom: 4px; }
.slot-price { font-size: 0.85rem; font-weight: bold; }
.slot-status-text { font-size: 0.7rem; text-transform: uppercase; opacity: 0.8; }

/* Status Colors */
.pending { background-color: #f5f5f5; color: #8c8c8c; border: 1px dashed #d9d9d9; }
.pending .slot-status-dot { background: #bfbfbf; }

.available { background-color: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; }
.available .slot-status-dot { background: #52c41a; }

.closed { background-color: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; }
.closed .slot-status-dot { background: #f5222d; }

.locked { background-color: #fff7e6; color: #d46b08; border: 1px solid #ffd591; }
.locked .slot-status-dot { background: #faad14; }

.booked { background-color: #e6f7ff; color: #096dd9; border: 1px solid #91d5ff; cursor: not-allowed; }
.booked .slot-status-dot { background: #1890ff; }

.slot-empty { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: #ccc; font-style: italic; }

/* Modal Styling */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; padding: 32px; border-radius: 16px; width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.modal-content h3 { margin-top: 0; margin-bottom: 24px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.form-input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
.hint { font-size: 0.8rem; color: #888; margin-bottom: 24px; line-height: 1.4; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; }

.btn-primary { background: #1890ff; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; }
.btn-secondary { background: #f5f5f5; color: #333; border: 1px solid #d9d9d9; padding: 10px 24px; border-radius: 8px; cursor: pointer; }
</style>

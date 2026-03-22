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
                        <div class="selection-toggle">
                            <label class="switch">
                                <input type="checkbox" v-model="isSelectionMode" @change="clearSelection">
                                <span class="slider round"></span>
                            </label>
                            <span class="toggle-label">{{ isSelectionMode ? 'โหมดเลือกหลายรายการ ON' : 'โหมดเลือกหลายรายการ OFF' }}</span>
                        </div>
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
                                <th v-for="court in courts" :key="court.id">
                                    <div class="header-with-action">
                                        {{ court.name }}
                                        <button v-if="isSelectionMode" class="btn-select-all" @click="selectAllInCourt(court.id)" title="เลือกทั้งคอร์ท">
                                            <span class="icon">↓</span>
                                        </button>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="hour in operatingHoursList" :key="hour">
                                <td class="time-cell">
                                    <div class="header-with-action">
                                        <button v-if="isSelectionMode" class="btn-select-all horizontal" @click="selectAllInRow(hour)" title="เลือกทั้งแถว">
                                            <span class="icon">→</span>
                                        </button>
                                        {{ formatTime(hour) }}
                                    </div>
                                </td>
                                <td v-for="court in courts" :key="court.id" class="slot-cell">
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

                    <!-- Weekly View: Days as columns, Hours as rows -->
                    <table v-else class="schedule-table">
                        <thead>
                            <tr>
                                <th>เวลา</th>
                                <th v-for="day in weekDays" :key="day.dateStr">
                                    <div class="header-with-action">
                                        {{ day.label }}<br><small>{{ day.dateStr }}</small>
                                        <button v-if="isSelectionMode" class="btn-select-all" @click="selectAllInDay(day.dateStr)" title="เลือกทั้งวัน">
                                            <span class="icon">↓</span>
                                        </button>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="hour in operatingHoursList" :key="hour">
                                <td class="time-cell">
                                    <div class="header-with-action">
                                        <button v-if="isSelectionMode" class="btn-select-all horizontal" @click="selectAllInRow(hour)" title="เลือกทั้งแถว">
                                            <span class="icon">→</span>
                                        </button>
                                        {{ formatTime(hour) }}
                                    </div>
                                </td>
                                <td v-for="day in weekDays" :key="day.dateStr" class="slot-cell">
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
            <div v-if="showGenerateModal" class="modal-overlay">
                <!-- ... existing modal content ... -->
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

            <!-- Status Action Bar -->
            <div v-if="isSelectionMode && selectedSlotIds.length > 0" class="status-action-bar-container">
                <div class="status-action-bar">
                    <div class="selection-count">เลือกอยู่ {{ selectedSlotIds.length }} รายการ</div>
                    <div class="action-buttons">
                        <button class="btn-action available" @click="bulkUpdateStatus('available')">Available</button>
                        <button class="btn-action closed" @click="bulkUpdateStatus('closed')">Closed</button>
                        <button class="btn-action pending" @click="bulkUpdateStatus('pending')">Pending</button>
                        <button class="btn-action locked" @click="bulkUpdateStatus('locked')">Locked</button>
                        <div class="divider"></div>
                        <button class="btn-action clear" @click="clearSelection">ยกเลิก</button>
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
import { collection, query, where, getDocs, writeBatch, doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns'

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
            for (let i = this.operatingHours.open; i < this.operatingHours.close; i++) {
                list.push(i)
            }
            return list
        },
        weekDays() {
            const start = parseISO(this.selectedDate)
            const end = addDays(start, 6)
            const days = eachDayOfInterval({ start, end })
            return days.map(d => ({
                dateStr: format(d, 'yyyy-MM-dd'),
                label: format(d, 'EEE')
            }))
        },
        slotsMap() {
            // Create a Map for O(1) lookup and better reactivity
            const map = new Map()
            this.slots.forEach(s => {
                const key = `${s.date}_${s.courtId}_${s.hour}`
                map.set(key, s)
            })
            return map
        }
    },
    methods: {
        formatTime(h) {
            return `${String(h).padStart(2, '0')}:00`
        },
        getSlot(date, courtId, hour) {
            // Use the map for lookup
            const key = `${date}_${courtId}_${hour}`
            return this.slotsMap.get(key)
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
                this.isLoading = true
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
                this.showGenerateModal = false
                
                // Manually trigger fetch to ensure UI is in sync
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
                const docRef = doc(db, 'slots', id)
                await updateDoc(docRef, { status })
            } catch (error) {
                alert('ไม่สามารถอัปเดตสถานะได้')
            }
        },
        fetchSlots() {
            if (this.unsubscribe) this.unsubscribe()
            this.isLoading = true
            this.slots = [] // Clear existing slots to avoid stale view
            
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

            this.unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    this.slots = snapshot.docs.map(doc => doc.data())
                    this.isLoading = false
                    console.log(`Fetched ${this.slots.length} slots`)
                    console.log("Courts:", this.courts)
                    console.log("Operating Hours:", this.operatingHours)
                },
                (error) => {
                    console.error("Firestore error:", error)
                    alert("Error loading slots: " + error.message)
                    this.isLoading = false
                }
            )
        },
        toggleSelection(slotId) {
            const index = this.selectedSlotIds.indexOf(slotId);
            if (index > -1) {
                this.selectedSlotIds.splice(index, 1);
            } else {
                this.selectedSlotIds.push(slotId);
            }
        },
        isSelected(slotId) {
            return this.selectedSlotIds.includes(slotId);
        },
        clearSelection() {
            this.selectedSlotIds = [];
        },
        selectAllInCourt(courtId) {
            // Find all slots currently displayed for this court
            const courtSlots = this.slots
                .filter(s => String(s.courtId) == String(courtId))
                .map(s => s.id);
            this.addManyToSelection(courtSlots);
        },
        selectAllInRow(hour) {
            // Find all slots currently displayed for this hour
            const rowSlots = this.slots
                .filter(s => Number(s.hour) == Number(hour))
                .map(s => s.id);
            this.addManyToSelection(rowSlots);
        },
        selectAllInDay(date) {
            // Find all slots currently displayed for this date
            const daySlots = this.slots
                .filter(s => s.date == date)
                .map(s => s.id);
            this.addManyToSelection(daySlots);
        },
        addManyToSelection(ids) {
            ids.forEach(id => {
                if (!this.selectedSlotIds.includes(id)) {
                    this.selectedSlotIds.push(id);
                }
            });
        },
        async bulkUpdateStatus(status) {
            if (this.selectedSlotIds.length === 0) return;
            
            this.isLoading = true;
            const batch = writeBatch(db);
            
            try {
                this.selectedSlotIds.forEach(id => {
                    // Note: id in our case is the docId which is "dateStr_courtId_hour"
                    const docRef = doc(db, 'slots', id);
                    batch.update(docRef, { status });
                });
                
                await batch.commit();
                const count = this.selectedSlotIds.length;
                this.clearSelection();
                this.isSelectionMode = false;
                alert(`อัปเดต ${count} รายการสำเร็จ!`);
            } catch (error) {
                console.error("Bulk update error:", error);
                alert("เกิดข้อผิดพลาดในการอัปเดตแบบกลุ่ม: " + error.message);
            } finally {
                this.isLoading = false;
            }
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

/* Slot Item Styling moved to SlotItem.vue */

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

/* Injected Selection Styles */
.selection-toggle { display: flex; align-items: center; gap: 12px; margin-right: 20px; }
.toggle-label { font-size: 0.85rem; font-weight: 600; color: #555; }

/* Switch Toggle CSS */
.switch { position: relative; display: inline-block; width: 44px; height: 22px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
input:checked + .slider { background-color: #1890ff; }
input:checked + .slider:before { transform: translateX(22px); }
.slider.round { border-radius: 22px; }
.slider.round:before { border-radius: 50%; }

/* Header with action */
.header-with-action { display: flex; align-items: center; justify-content: center; gap: 8px; position: relative; }
.btn-select-all { background: #f0f0f0; border: 1px solid #d9d9d9; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 10px; color: #666; transition: all 0.2s; }
.btn-select-all:hover { background: #1890ff; color: white; border-color: #1890ff; }
.btn-select-all.horizontal { margin-right: 4px; }

/* Status Action Bar */
.status-action-bar-container { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; width: auto; }
.status-action-bar { background: #001529; color: white; padding: 12px 24px; border-radius: 50px; display: flex; align-items: center; gap: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.selection-count { font-weight: bold; border-right: 1px solid rgba(255,255,255,0.2); padding-right: 20px; }
.action-buttons { display: flex; align-items: center; gap: 10px; }
.btn-action { padding: 6px 16px; border-radius: 20px; border: none; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-action:hover { opacity: 0.9; transform: scale(1.05); }

.btn-action.available { background: #52c41a; color: white; }
.btn-action.closed { background: #ff4d4f; color: white; }
.btn-action.pending { background: #8c8c8c; color: white; }
.btn-action.locked { background: #faad14; color: white; }
.btn-action.clear { background: transparent; color: #aaa; border: 1px solid #444; }
.divider { width: 1px; height: 20px; background: rgba(255,255,255,0.2); margin: 0 4px; }
</style>

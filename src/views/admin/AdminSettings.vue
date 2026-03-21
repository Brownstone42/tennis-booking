<template>
    <div class="admin-layout">
        <AdminSidebar />

        <main class="main-body">
            <header class="top-bar">
                <h1>ตั้งค่าสนาม (SaaS Configuration)</h1>
            </header>

            <div class="dashboard-content">
                <div v-if="isLoading" class="loading-state">กำลังโหลดข้อมูล...</div>
                
                <div v-else class="settings-grid animate-fade">
                    <!-- 1. ข้อมูลพื้นฐาน -->
                    <section class="settings-card">
                        <h3>ข้อมูลพื้นฐาน</h3>
                        <div class="form-group">
                            <label>ชื่อสนาม</label>
                            <input type="text" v-model="localConfig.courtName" class="form-input" />
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>เวลาเปิดสนาม</label>
                                <select v-model.number="localConfig.operatingHours.open" class="form-input">
                                    <option v-for="h in hourOptions" :key="h" :value="h">
                                        {{ formatTime(h) }}
                                    </option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>เวลาปิดสนาม</label>
                                <select v-model.number="localConfig.operatingHours.close" class="form-input">
                                    <option v-for="h in hourOptions" :key="h" :value="h">
                                        {{ formatTime(h) }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <!-- 2. จัดการสนาม (Courts) -->
                    <section class="settings-card">
                        <div class="card-header">
                            <h3>รายการคอร์ท</h3>
                            <button class="btn-sm" @click="addCourt">+ เพิ่มคอร์ท</button>
                        </div>
                        <div class="court-editor-list">
                            <div v-for="(court, index) in localConfig.courts" :key="index" class="court-edit-item">
                                <input v-model="court.name" placeholder="ชื่อคอร์ท" class="form-input-sm" />
                                <input v-model="court.type" placeholder="ลักษณะคอร์ท" class="form-input-sm" />
                                <button class="btn-danger-sm" @click="removeCourt(index)">ลบ</button>
                            </div>
                        </div>
                    </section>

                    <!-- 3. กำหนดราคา (Pricing) -->
                    <section class="settings-card full-width">
                        <h3>กำหนดราคาตามช่วงเวลา</h3>
                        
                        <div class="pricing-tabs">
                            <button 
                                class="tab-btn" 
                                :class="{ active: activePricingTab === 'default' }"
                                @click="activePricingTab = 'default'"
                            >
                                ราคากลาง (Default)
                            </button>
                            <button 
                                v-for="court in localConfig.courts" 
                                :key="court.id"
                                class="tab-btn"
                                :class="{ active: activePricingTab === court.id }"
                                @click="activePricingTab = court.id"
                            >
                                ราคาเฉพาะ: {{ court.name }}
                            </button>
                        </div>

                        <div class="pricing-content">
                            <div class="pricing-header">
                                <h4>
                                    {{ activePricingTab === 'default' ? 'ราคากลาง (ใช้กับทุกคอร์ทที่ไม่ได้กำหนดราคาแยก)' : `ราคาเฉพาะสำหรับ ${activeCourtName}` }}
                                </h4>
                                <button class="btn-sm outline" @click="addPricingRow">+ เพิ่มช่วงราคา</button>
                            </div>

                            <div class="pricing-grid">
                                <div v-for="(price, index) in currentPricingList" :key="index" class="price-edit-row">
                                    <span class="label">เริ่ม:</span>
                                    <select v-model.number="price.start" class="form-input-inline">
                                        <option v-for="h in hourOptions" :key="h" :value="h">{{ formatTime(h) }}</option>
                                    </select>
                                    <span class="label">สิ้นสุด:</span>
                                    <select v-model.number="price.end" class="form-input-inline">
                                        <option v-for="h in hourOptions" :key="h" :value="h">{{ formatTime(h) }}</option>
                                    </select>
                                    <span class="label">ราคา:</span>
                                    <div class="price-input-wrapper">
                                        <span class="currency">฿</span>
                                        <input type="number" v-model.number="price.rate" class="form-input-inline price-field" />
                                    </div>
                                    <button class="btn-danger-sm" @click="removePricingRow(index)">ลบ</button>
                                </div>
                                <div v-if="currentPricingList.length === 0" class="empty-state">
                                    ยังไม่มีการกำหนดราคาช่วงเวลา
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div class="action-footer">
                    <button class="btn-save" :disabled="isSaving" @click="saveSettings">
                        {{ isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั้งหมด' }}
                    </button>
                </div>
            </div>
        </main>
    </div>
</template>

<script>
import AdminSidebar from '../../components/AdminSidebar.vue'
import { mapState, mapActions } from 'pinia'
import { useConfigStore } from '../../stores/config'
import { auth } from '../../firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default {
    components: { AdminSidebar },
    data() {
        return {
            localConfig: {
                courtName: '',
                operatingHours: { open: 6, close: 22 },
                bookingAdvanceDays: 30,
                courts: [],
                defaultPricing: []
            },
            activePricingTab: 'default',
            isSaving: false,
            hourOptions: Array.from({ length: 25 }, (_, i) => i) // 0-24
        }
    },
    computed: {
        ...mapState(useConfigStore, ['courtName', 'operatingHours', 'bookingAdvanceDays', 'courts', 'defaultPricing', 'isLoading']),
        currentPricingList() {
            if (this.activePricingTab === 'default') {
                return this.localConfig.defaultPricing
            }
            const court = this.localConfig.courts.find(c => c.id === this.activePricingTab)
            if (court) {
                if (!court.pricing) court.pricing = []
                return court.pricing
            }
            return []
        },
        activeCourtName() {
            const court = this.localConfig.courts.find(c => c.id === this.activePricingTab)
            return court ? court.name : ''
        }
    },
    methods: {
        ...mapActions(useConfigStore, ['saveConfig']),
        formatTime(h) {
            return `${String(h).padStart(2, '0')}:00`
        },
        addCourt() {
            this.localConfig.courts.push({
                id: Date.now(),
                name: `คอร์ท ${this.localConfig.courts.length + 1}`,
                type: '',
                pricing: []
            })
        },
        removeCourt(index) {
            if (confirm('ยืนยันการลบคอร์ท?')) {
                const court = this.localConfig.courts[index]
                if (this.activePricingTab === court.id) {
                    this.activePricingTab = 'default'
                }
                this.localConfig.courts.splice(index, 1)
            }
        },
        addPricingRow() {
            this.currentPricingList.push({ start: 6, end: 18, rate: 450 })
        },
        removePricingRow(index) {
            this.currentPricingList.splice(index, 1)
        },
        async saveSettings() {
            this.isSaving = true
            try {
                const dataToSave = {
                    name: this.localConfig.courtName,
                    operatingHours: this.localConfig.operatingHours,
                    bookingAdvanceDays: this.localConfig.bookingAdvanceDays,
                    courts: this.localConfig.courts,
                    defaultPricing: this.localConfig.defaultPricing
                }
                await this.saveConfig('court_001', dataToSave)
                alert('บันทึกการตั้งค่าสำเร็จ!')
            } catch (error) {
                alert('เกิดข้อผิดพลาด: ' + error.message)
            } finally {
                this.isSaving = false
            }
        },
        syncLocalData() {
            this.localConfig = {
                courtName: this.courtName,
                operatingHours: JSON.parse(JSON.stringify(this.operatingHours)),
                bookingAdvanceDays: this.bookingAdvanceDays,
                courts: JSON.parse(JSON.stringify(this.courts)),
                defaultPricing: JSON.parse(JSON.stringify(this.defaultPricing))
            }
        }
    },
    watch: {
        isLoading(newVal) {
            if (!newVal) this.syncLocalData()
        }
    },
    created() {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                this.$router.push({ name: 'admin-login' })
            } else {
                if (!this.isLoading) this.syncLocalData()
            }
        })
    }
}
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: #f4f7f9; }
.main-body { flex-grow: 1; }
.top-bar { background: white; padding: 24px 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.top-bar h1 { margin: 0; font-size: 1.5rem; color: #1a1a1a; }
.dashboard-content { padding: 32px; max-width: 1100px; margin: 0 auto; }

.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.full-width { grid-column: span 2; }

.settings-card { background: white; padding: 28px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); border: 1px solid #edf2f7; }
h3 { margin-top: 0; margin-bottom: 24px; font-size: 1.1rem; color: #2d3748; display: flex; align-items: center; gap: 8px; }
h3::before { content: ''; width: 4px; height: 18px; background: #1890ff; border-radius: 2px; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-size: 0.9rem; color: #4a5568; font-weight: 500; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.form-input { width: 100%; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 1rem; transition: border-color 0.2s; }
.form-input:focus { outline: none; border-color: #1890ff; }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.btn-sm { padding: 8px 16px; background: #1890ff; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
.btn-sm.outline { background: white; border: 1.5px dashed #cbd5e0; color: #4a5568; padding: 6px 16px; font-size: 0.8rem; }
.btn-sm.outline:hover { border-color: #1890ff; color: #1890ff; }
.btn-danger-sm { padding: 8px 12px; background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7; border-radius: 8px; cursor: pointer; }
.btn-danger-sm:hover { background: #feb2b2; color: #fff; }

.court-edit-item { display: flex; gap: 12px; margin-bottom: 12px; align-items: center; }
.form-input-sm { padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; flex-grow: 1; }

/* Pricing Tabs */
.pricing-tabs { display: flex; gap: 8px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 8px; }
.tab-btn { padding: 10px 20px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; cursor: pointer; white-space: nowrap; font-size: 0.9rem; transition: all 0.2s; }
.tab-btn.active { background: #1890ff; color: white; border-color: #1890ff; }

.pricing-content { background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; }
.pricing-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.pricing-header h4 { margin: 0; color: #2d3748; font-size: 1rem; }

.pricing-grid { display: flex; flex-direction: column; gap: 12px; }
.price-edit-row { display: grid; grid-template-columns: auto 120px auto 120px auto 1fr auto; align-items: center; gap: 12px; background: white; padding: 12px 16px; border-radius: 10px; border: 1px solid #edf2f7; }
.price-edit-row .label { font-size: 0.85rem; color: #718096; font-weight: 600; }
.form-input-inline { padding: 8px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; background: white; width: 100%; }

.price-input-wrapper { display: flex; align-items: center; background: white; border: 1.5px solid #e2e8f0; border-radius: 8px; padding-left: 12px; }
.price-field { border: none !important; width: 100% !important; padding-left: 4px !important; }
.currency { color: #a0aec0; font-weight: bold; }

.empty-state { text-align: center; color: #a0aec0; padding: 20px; font-style: italic; }

.action-footer { margin-top: 48px; text-align: right; background: white; padding: 24px; border-radius: 16px; box-shadow: 0 -4px 12px rgba(0,0,0,0.02); }
.btn-save { padding: 16px 48px; background: #38a169; color: white; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: 0 4px 14px rgba(56,161,105,0.3); transition: transform 0.2s; }
.btn-save:hover { transform: translateY(-2px); }
.btn-save:disabled { background: #cbd5e0; cursor: not-allowed; box-shadow: none; transform: none; }

.loading-state { text-align: center; padding: 100px; color: #718096; font-size: 1.2rem; }
.animate-fade { animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>

<template>
    <div class="flex min-h-screen bg-[#f4f7f9]">
        <AdminSidebar />

        <main class="flex-1">
            <header class="bg-white px-8 py-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                <h1 class="m-0 text-2xl font-bold text-gray-900">ตั้งค่าสนาม (SaaS Configuration)</h1>
            </header>

            <div class="p-8 max-w-[1100px] mx-auto">
                <div v-if="isLoading" class="text-center py-24 text-gray-400 text-xl">กำลังโหลดข้อมูล...</div>

                <div v-else class="animate-fade grid grid-cols-2 gap-6">
                    <!-- 1. Basic Info -->
                    <section class="settings-card">
                        <h3 class="section-heading">ข้อมูลพื้นฐาน</h3>
                        <div class="mb-5">
                            <label class="block mb-2 text-sm font-medium text-gray-600">ชื่อสนาม</label>
                            <input type="text" v-model="localConfig.courtName" class="settings-input" />
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block mb-2 text-sm font-medium text-gray-600">เวลาเปิดสนาม</label>
                                <select v-model.number="localConfig.operatingHours.open" class="settings-input">
                                    <option v-for="h in hourOptions" :key="h" :value="h">{{ formatTime(h) }}</option>
                                </select>
                            </div>
                            <div>
                                <label class="block mb-2 text-sm font-medium text-gray-600">เวลาปิดสนาม</label>
                                <select v-model.number="localConfig.operatingHours.close" class="settings-input">
                                    <option v-for="h in hourOptions" :key="h" :value="h">{{ formatTime(h) }}</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <!-- 2. Courts -->
                    <section class="settings-card">
                        <div class="flex justify-between items-center mb-5">
                            <h3 class="section-heading !mb-0">รายการคอร์ท</h3>
                            <button class="px-4 py-2 bg-ant-blue text-white border-0 rounded-lg cursor-pointer text-sm font-semibold" @click="addCourt">
                                + เพิ่มคอร์ท
                            </button>
                        </div>
                        <div class="flex flex-col gap-3">
                            <div v-for="(court, index) in localConfig.courts" :key="index" class="flex gap-3 items-center">
                                <input v-model="court.name" placeholder="ชื่อคอร์ท" class="settings-input-sm flex-1" />
                                <input v-model="court.type" placeholder="ลักษณะคอร์ท" class="settings-input-sm flex-1" />
                                <button class="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg cursor-pointer text-sm hover:bg-red-200 hover:text-white" @click="removeCourt(index)">ลบ</button>
                            </div>
                        </div>
                    </section>

                    <!-- 3. Pricing (full width) -->
                    <section class="settings-card col-span-2">
                        <h3 class="section-heading">กำหนดราคาตามช่วงเวลา</h3>

                        <!-- Pricing tabs -->
                        <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
                            <button
                                class="px-5 py-2.5 rounded-lg border cursor-pointer whitespace-nowrap text-sm transition-all duration-200"
                                :class="activePricingTab === 'default' ? 'bg-ant-blue text-white border-ant-blue' : 'bg-white border-gray-200'"
                                @click="activePricingTab = 'default'"
                            >ราคากลาง (Default)</button>
                            <button
                                v-for="court in localConfig.courts" :key="court.id"
                                class="px-5 py-2.5 rounded-lg border cursor-pointer whitespace-nowrap text-sm transition-all duration-200"
                                :class="activePricingTab === court.id ? 'bg-ant-blue text-white border-ant-blue' : 'bg-white border-gray-200'"
                                @click="activePricingTab = court.id"
                            >ราคาเฉพาะ: {{ court.name }}</button>
                        </div>

                        <div class="bg-[#f8fafc] p-6 rounded-xl border border-gray-200">
                            <div class="flex justify-between items-center mb-5">
                                <h4 class="m-0 text-gray-700 text-base font-semibold">
                                    {{ activePricingTab === 'default' ? 'ราคากลาง (ใช้กับทุกคอร์ทที่ไม่ได้กำหนดราคาแยก)' : `ราคาเฉพาะสำหรับ ${activeCourtName}` }}
                                </h4>
                                <button
                                    class="px-4 py-1.5 bg-white border-[1.5px] border-dashed border-gray-300 text-gray-600 rounded-lg cursor-pointer text-sm hover:border-ant-blue hover:text-ant-blue"
                                    @click="addPricingRow"
                                >+ เพิ่มช่วงราคา</button>
                            </div>

                            <div class="flex flex-col gap-3">
                                <div
                                    v-for="(price, index) in currentPricingList" :key="index"
                                    class="grid items-center gap-3 bg-white px-4 py-3 rounded-xl border border-gray-100"
                                    style="grid-template-columns: auto 120px auto 120px auto 1fr auto"
                                >
                                    <span class="text-sm text-gray-400 font-semibold">เริ่ม:</span>
                                    <select v-model.number="price.start" class="settings-input-inline">
                                        <option v-for="h in hourOptions" :key="h" :value="h">{{ formatTime(h) }}</option>
                                    </select>
                                    <span class="text-sm text-gray-400 font-semibold">สิ้นสุด:</span>
                                    <select v-model.number="price.end" class="settings-input-inline">
                                        <option v-for="h in hourOptions" :key="h" :value="h">{{ formatTime(h) }}</option>
                                    </select>
                                    <span class="text-sm text-gray-400 font-semibold">ราคา:</span>
                                    <div class="flex items-center bg-white border-[1.5px] border-gray-200 rounded-lg pl-3">
                                        <span class="text-gray-400 font-bold">฿</span>
                                        <input type="number" v-model.number="price.rate" class="border-0 w-full pl-1 py-2 focus:outline-none bg-transparent" />
                                    </div>
                                    <button class="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg cursor-pointer text-sm hover:bg-red-200 hover:text-white" @click="removePricingRow(index)">ลบ</button>
                                </div>
                                <div v-if="currentPricingList.length === 0" class="text-center text-gray-400 py-5 italic">
                                    ยังไม่มีการกำหนดราคาช่วงเวลา
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- Save footer -->
                <div class="mt-12 text-right bg-white px-6 py-6 rounded-2xl shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                    <button
                        class="px-12 py-4 bg-[#38a169] text-white border-0 rounded-xl text-lg font-bold cursor-pointer shadow-[0_4px_14px_rgba(56,161,105,0.3)] transition-transform duration-200 hover:-translate-y-0.5 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
                        :disabled="isSaving"
                        @click="saveSettings"
                    >
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
import { TENANT_ID } from '../../constants'

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
            hourOptions: Array.from({ length: 25 }, (_, i) => i)
        }
    },
    computed: {
        ...mapState(useConfigStore, ['courtName', 'operatingHours', 'bookingAdvanceDays', 'courts', 'defaultPricing', 'isLoading']),
        currentPricingList() {
            if (this.activePricingTab === 'default') return this.localConfig.defaultPricing
            const court = this.localConfig.courts.find((c) => c.id === this.activePricingTab)
            if (court) {
                if (!court.pricing) court.pricing = []
                return court.pricing
            }
            return []
        },
        activeCourtName() {
            const court = this.localConfig.courts.find((c) => c.id === this.activePricingTab)
            return court ? court.name : ''
        }
    },
    methods: {
        ...mapActions(useConfigStore, ['saveConfig']),
        formatTime(h) { return `${String(h).padStart(2, '0')}:00` },
        addCourt() {
            this.localConfig.courts.push({ id: Date.now(), name: `คอร์ท ${this.localConfig.courts.length + 1}`, type: '', pricing: [] })
        },
        removeCourt(index) {
            if (confirm('ยืนยันการลบคอร์ท?')) {
                const court = this.localConfig.courts[index]
                if (this.activePricingTab === court.id) this.activePricingTab = 'default'
                this.localConfig.courts.splice(index, 1)
            }
        },
        addPricingRow() { this.currentPricingList.push({ start: 6, end: 18, rate: 450 }) },
        removePricingRow(index) { this.currentPricingList.splice(index, 1) },
        async saveSettings() {
            this.isSaving = true
            try {
                await this.saveConfig(TENANT_ID, {
                    name: this.localConfig.courtName,
                    operatingHours: this.localConfig.operatingHours,
                    bookingAdvanceDays: this.localConfig.bookingAdvanceDays,
                    courts: this.localConfig.courts,
                    defaultPricing: this.localConfig.defaultPricing
                })
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
        isLoading(newVal) { if (!newVal) this.syncLocalData() }
    },
    created() {
        onAuthStateChanged(auth, (user) => {
            if (!user) { this.$router.push({ name: 'admin-login' }) }
            else { if (!this.isLoading) this.syncLocalData() }
        })
    }
}
</script>

<style scoped>
@reference "../../style.css";

.settings-card {
    @apply bg-white p-7 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-gray-100;
}
.section-heading {
    @apply mt-0 mb-6 text-lg text-gray-700 font-semibold flex items-center gap-2;
}
.section-heading::before {
    content: '';
    @apply w-1 h-[18px] bg-ant-blue rounded-sm shrink-0;
}
.settings-input {
    @apply w-full px-3 py-3 border-[1.5px] border-gray-200 rounded-lg text-base transition-colors duration-200 focus:outline-none focus:border-ant-blue;
}
.settings-input-sm {
    @apply px-2.5 py-2.5 border-[1.5px] border-gray-200 rounded-lg;
}
.settings-input-inline {
    @apply px-3 py-2 border-[1.5px] border-gray-200 rounded-lg bg-white w-full;
}
</style>

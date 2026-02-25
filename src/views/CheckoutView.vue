<template>
    <div class="checkout-container">
        <header class="checkout-header">
            <button class="back-btn" @click="$router.back()">←</button>
            <h2>ยืนยันการจอง</h2>
        </header>

        <main class="checkout-content">
            <!-- 1. สรุปรายละเอียด -->
            <section class="summary-card">
                <div class="court-header">
                    <span class="court-title">{{ currentCourt?.name }}</span>
                    <span class="court-type-tag">{{ currentCourt?.type }}</span>
                </div>
                <div class="booking-details">
                    <div class="detail-item">
                        <span class="label">วันที่:</span>
                        <span class="value">{{ formatDate(date) }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">เวลา:</span>
                        <span class="value">{{ timeString }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">จำนวน:</span>
                        <span class="value">{{ hoursArray.length }} ชั่วโมง</span>
                    </div>
                </div>
                <div class="price-breakdown">
                    <div v-for="hr in hoursArray" :key="hr" class="price-row">
                        <span>{{ hr }}:00 - {{ hr + 1 }}:00</span>
                        <span>฿{{ getPrice(hr).toLocaleString() }}</span>
                    </div>
                    <div class="total-row">
                        <span>ยอดรวมสุทธิ</span>
                        <span class="total-amount">฿{{ totalPrice.toLocaleString() }}</span>
                    </div>
                </div>
            </section>

            <!-- 2. ข้อมูลผู้ติดต่อ -->
            <section class="contact-form">
                <h3>ข้อมูลผู้ติดต่อ</h3>
                <div class="form-group">
                    <label>เบอร์โทรศัพท์</label>
                    <input 
                        type="tel" 
                        v-model="phone" 
                        placeholder="08X-XXX-XXXX"
                        maxlength="10"
                        @input="validatePhone"
                    />
                    <small v-if="phoneError" class="error-text">{{ phoneError }}</small>
                </div>
            </section>

            <!-- 3. นโยบายการคืนเงิน -->
            <section class="policy-info">
                <h3>นโยบายการคืนเงิน</h3>
                <ul class="policy-list">
                    <li v-for="policy in refundPolicy" :key="policy.hoursBefore">
                        ยกเลิกก่อน {{ policy.hoursBefore }} ชม. คืนเงิน {{ policy.refundPercent }}%
                    </li>
                </ul>
            </section>
        </main>

        <footer class="checkout-footer">
            <p class="disclaimer">เมื่อกดชำระเงิน ถือว่าคุณยอมรับเงื่อนไขการใช้บริการ</p>
            <button 
                class="pay-btn" 
                :disabled="!isValid || isSubmitting"
                @click="handlePayment"
            >
                {{ isSubmitting ? 'กำลังดำเนินการ...' : `ชำระเงิน ฿${totalPrice.toLocaleString()}` }}
            </button>
        </footer>
    </div>
</template>

<script>
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { mapState } from 'pinia'
import { useConfigStore } from '../stores/config'

export default {
    data() {
        return {
            courtId: null,
            date: '',
            hours: '',
            phone: '',
            phoneError: '',
            isSubmitting: false
        }
    },
    computed: {
        ...mapState(useConfigStore, ['courts', 'defaultPricing', 'refundPolicy']),
        hoursArray() {
            return this.hours ? this.hours.split(',').map(Number).sort((a, b) => a - b) : []
        },
        currentCourt() {
            return this.courts.find(c => c.id === Number(this.courtId))
        },
        timeString() {
            if (this.hoursArray.length === 0) return ''
            const start = Math.min(...this.hoursArray)
            const end = Math.max(...this.hoursArray) + 1
            return `${start}:00 - ${end}:00`
        },
        totalPrice() {
            return this.hoursArray.reduce((total, hr) => total + this.getPrice(hr), 0)
        },
        isValid() {
            return this.phone.length === 10 && !this.phoneError
        }
    },
    methods: {
        formatDate(dateStr) {
            if (!dateStr) return ''
            return format(parseISO(dateStr), 'EEEE d MMMM yyyy', { locale: th })
        },
        getPrice(hour) {
            if (!this.currentCourt) return 0
            const courtPricing = this.currentCourt.pricing
            if (courtPricing && courtPricing.length > 0) {
                const priceRule = courtPricing.find(p => hour >= p.start && hour < p.end)
                if (priceRule) return priceRule.rate
            }
            const defaultRule = this.defaultPricing.find(p => hour >= p.start && hour < p.end)
            return defaultRule ? defaultRule.rate : 0
        },
        validatePhone() {
            this.phone = this.phone.replace(/\D/g, '')
            if (this.phone && !this.phone.startsWith('0')) {
                this.phoneError = 'เบอร์โทรศัพท์ต้องเริ่มต้นด้วย 0'
            } else if (this.phone.length > 0 && this.phone.length < 10) {
                this.phoneError = 'เบอร์โทรศัพท์ต้องมี 10 หลัก'
            } else {
                this.phoneError = ''
            }
        },
        async handlePayment() {
            this.isSubmitting = true
            // TODO: เชื่อมต่อ Omise SDK
            // 1. Create Source/Token
            // 2. Call Backend to Create Charge
            // 3. Save Booking to Firestore
            alert('กำลังเชื่อมต่อระบบชำระเงิน Omise...')
            this.isSubmitting = false
        }
    },
    created() {
        // รับค่าจาก Query Parameters
        this.courtId = this.$route.query.courtId
        this.date = this.$route.query.date
        this.hours = this.$route.query.hours

        if (!this.courtId || !this.date || !this.hours) {
            this.$router.push('/')
        }
    }
}
</script>

<style scoped>
.checkout-container {
    min-height: 100vh;
    background-color: #f8f9fa;
    padding-bottom: 120px;
}

.checkout-header {
    background: white;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.back-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #333;
}

.checkout-header h2 {
    font-size: 1.2rem;
    margin: 0;
}

.checkout-content {
    padding: 16px;
}

.summary-card {
    background: white;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.court-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
}

.court-title { font-size: 1.2rem; font-weight: bold; color: #333; }
.court-type-tag {
    background: #f5f5f5;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    color: #666;
}

.booking-details {
    margin-bottom: 20px;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}

.detail-item .label { color: #888; }
.detail-item .value { font-weight: 500; }

.price-breakdown {
    background: #fafafa;
    padding: 16px;
    border-radius: 12px;
}

.price-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 8px;
}

.total-row {
    display: flex;
    justify-content: space-between;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #ddd;
    font-weight: bold;
    color: #333;
}

.total-amount { font-size: 1.3rem; color: #00b900; }

.contact-form, .policy-info {
    background: white;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
}

h3 { font-size: 1rem; margin-top: 0; margin-bottom: 16px; }

.form-group label {
    display: block;
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 8px;
}

.form-group input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 10px;
    font-size: 1.1rem;
}

.error-text { color: #ff4d4f; font-size: 0.8rem; margin-top: 4px; display: block; }

.policy-list {
    padding-left: 20px;
    font-size: 0.85rem;
    color: #888;
    margin: 0;
}

.policy-list li { margin-bottom: 6px; }

.checkout-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 16px;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
    max-width: 600px;
    margin: 0 auto;
}

.disclaimer {
    font-size: 0.75rem;
    color: #999;
    text-align: center;
    margin-bottom: 12px;
}

.pay-btn {
    width: 100%;
    background: #00b900;
    color: white;
    border: none;
    padding: 16px;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
}

.pay-btn:disabled { background: #ccc; cursor: not-allowed; }
</style>

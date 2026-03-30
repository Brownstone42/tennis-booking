<template>
    <div class="checkout-container">
        <header class="checkout-header">
            <button class="back-btn" @click="$router.back()">←</button>
            <h2>ชำระเงิน</h2>
        </header>

        <main class="checkout-content">
            <!-- 1. สรุปรายละเอียด -->
            <section class="summary-mini">
                <div class="summary-row">
                    <strong>{{ currentCourt?.name }}</strong>
                    <span class="total-price">฿{{ totalPrice.toLocaleString() }}</span>
                </div>
                <div class="summary-sub">{{ formatDate(date) }} | {{ timeString }}</div>
            </section>

            <!-- 2. ข้อมูลผู้ติดต่อ -->
            <section class="checkout-section">
                <h3>เบอร์โทรศัพท์สำหรับติดต่อ</h3>
                <input
                    type="tel"
                    v-model="phone"
                    placeholder="08X-XXX-XXXX"
                    maxlength="10"
                    class="form-input"
                    @input="validatePhone"
                />
            </section>

            <!-- 3. เลือกช่องทางชำระเงิน -->
            <section class="checkout-section">
                <h3>เลือกช่องทางชำระเงิน</h3>
                <div class="payment-methods">
                    <button
                        class="method-item"
                        :class="{ active: paymentMethod === 'promptpay' }"
                        @click="paymentMethod = 'promptpay'"
                    >
                        <div class="method-icon">QR</div>
                        <span>PromptPay</span>
                    </button>
                    <button
                        class="method-item"
                        :class="{ active: paymentMethod === 'credit_card' }"
                        @click="paymentMethod = 'credit_card'"
                    >
                        <div class="method-icon">💳</div>
                        <span>บัตรเครดิต</span>
                    </button>
                </div>
            </section>

            <!-- 4. แบบฟอร์มบัตรเครดิต -->
            <section v-if="paymentMethod === 'credit_card'" class="card-form animate-fade">
                <div class="form-group">
                    <label>หมายเลขบัตร</label>
                    <input
                        type="text"
                        v-model="card.number"
                        placeholder="XXXX XXXX XXXX XXXX"
                        class="form-input"
                    />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>วันหมดอายุ (MM/YY)</label>
                        <input
                            type="text"
                            v-model="card.expiry"
                            placeholder="MM/YY"
                            class="form-input"
                        />
                    </div>
                    <div class="form-group">
                        <label>CVV</label>
                        <input
                            type="password"
                            v-model="card.cvv"
                            placeholder="XXX"
                            class="form-input"
                        />
                    </div>
                </div>
            </section>
        </main>

        <footer class="checkout-footer">
            <button class="pay-btn" :disabled="!isValid || isSubmitting" @click="startPaymentFlow">
                <span v-if="isSubmitting">กำลังดำเนินการ...</span>
                <span v-else>ยืนยันและชำระเงิน ฿{{ totalPrice.toLocaleString() }}</span>
            </button>
        </footer>
    </div>
</template>

<script>
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { mapState } from 'pinia'
import { useConfigStore } from '../stores/config'
import { useLiffStore } from '../stores/liff'
import { functions } from '../firebase'
import { httpsCallable } from 'firebase/functions'

export default {
    data() {
        return {
            courtId: null,
            date: '',
            hours: '',
            phone: '',
            paymentMethod: 'promptpay',
            card: { number: '', expiry: '', cvv: '', name: '' },
            isSubmitting: false
        }
    },
    computed: {
        ...mapState(useConfigStore, ['courts', 'defaultPricing']),
        ...mapState(useLiffStore, ['profile']),
        hoursArray() {
            return this.hours
                ? this.hours
                      .split(',')
                      .map(Number)
                      .sort((a, b) => a - b)
                : []
        },
        currentCourt() {
            return this.courts.find((c) => c.id === Number(this.courtId))
        },
        timeString() {
            if (this.hoursArray.length === 0) return ''
            return `${Math.min(...this.hoursArray)}:00 - ${Math.max(...this.hoursArray) + 1}:00`
        },
        totalPrice() {
            return this.hoursArray.reduce((total, hr) => total + this.getPrice(hr), 0)
        },
        isValid() {
            const isPhoneValid = this.phone.length === 10
            if (this.paymentMethod === 'credit_card') {
                return isPhoneValid && this.card.number && this.card.expiry && this.card.cvv
            }
            return isPhoneValid
        }
    },
    methods: {
        formatDate(dateStr) {
            if (!dateStr) return ''
            return format(parseISO(dateStr), 'd MMM yyyy', { locale: th })
        },
        getPrice(hour) {
            if (!this.currentCourt) return 0
            const cp = this.currentCourt.pricing
            if (cp && cp.length > 0) {
                const rule = cp.find((p) => hour >= p.start && hour < p.end)
                if (rule) return rule.rate
            }
            const dr = this.defaultPricing.find((p) => hour >= p.start && hour < p.end)
            return dr ? dr.rate : 0
        },
        validatePhone() {
            this.phone = this.phone.replace(/\D/g, '')
        },
        async startPaymentFlow() {
            this.isSubmitting = true
            const publicKey = import.meta.env.VITE_OMISE_PUBLIC_KEY
            if (!publicKey || publicKey === 'pkey_test_xxxxxxxxxxxxxx') {
                alert('กรุณาตั้งค่า OMISE_PUBLIC_KEY ใน .env ให้ถูกต้องก่อนครับ')
                this.isSubmitting = false
                return
            }
            window.Omise.setPublicKey(publicKey)

            try {
                if (this.paymentMethod === 'promptpay') {
                    window.Omise.createSource(
                        'promptpay',
                        {
                            amount: this.totalPrice * 100,
                            currency: 'THB'
                        },
                        (statusCode, response) => {
                            if (statusCode === 200) {
                                this.handleBackendCharge({ source: response.id })
                            } else {
                                alert('ไม่สามารถสร้างรายการชำระเงินได้: ' + response.message)
                                this.isSubmitting = false
                            }
                        }
                    )
                } else {
                    const [expMonth, expYear] = this.card.expiry.split('/')
                    window.Omise.createToken(
                        'card',
                        {
                            name: this.profile?.displayName || 'Customer',
                            number: this.card.number.replace(/\s/g, ''),
                            expiration_month: parseInt(expMonth),
                            expiration_year: parseInt(expYear),
                            security_code: parseInt(this.card.cvv)
                        },
                        (statusCode, response) => {
                            if (statusCode === 200) {
                                this.handleBackendCharge({ token: response.id })
                            } else {
                                alert('ข้อมูลบัตรไม่ถูกต้อง: ' + response.message)
                                this.isSubmitting = false
                            }
                        }
                    )
                }
            } catch (error) {
                console.error(error)
                alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Omise')
                this.isSubmitting = false
            }
        },
        async handleBackendCharge(paymentData) {
            try {
                const createCharge = httpsCallable(functions, 'createCharge')
                const result = await createCharge({
                    amount: this.totalPrice * 100,
                    courtId: this.courtId,
                    date: this.date,
                    hours: this.hours,
                    phone: this.phone,
                    tenantId: 'court_001',
                    userId: this.profile?.userId,
                    displayName: this.profile?.displayName,
                    ...paymentData
                })

                if (result.data.success) {
                    this.$router.push({
                        name: 'payment',
                        query: {
                            bookingId: result.data.bookingId,
                            authorizeUri: result.data.authorizeUri,
                            qrImage: result.data.qrImage, // เพิ่มบรรทัดนี้ครับ!
                            amount: this.totalPrice
                        }
                    })
                }
            } catch (error) {
                console.error('Charge Error:', error)
                alert('การชำระเงินไม่สำเร็จ: ' + error.message)
            } finally {
                this.isSubmitting = false
            }
        }
    },
    created() {
        this.courtId = this.$route.query.courtId
        this.date = this.$route.query.date
        this.hours = this.$route.query.hours
        if (!this.courtId || !this.date || !this.hours) this.$router.push('/')
    }
}
</script>

<style scoped>
.checkout-container {
    min-height: 100vh;
    background-color: #fcfcfc;
    padding-bottom: 120px;
}
.checkout-header {
    background: white;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.back-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
}
.summary-mini {
    background: #333;
    color: white;
    padding: 20px;
    margin: 16px;
    border-radius: 16px;
}
.summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.2rem;
}
.total-price {
    font-weight: 900;
    color: #00b900;
}
.summary-sub {
    font-size: 0.9rem;
    opacity: 0.7;
    margin-top: 4px;
}
.checkout-section {
    padding: 0 16px;
    margin-bottom: 24px;
}
h3 {
    font-size: 1rem;
    color: #333;
    margin-bottom: 12px;
}
.form-input {
    width: 100%;
    padding: 14px;
    border: 1px solid #eee;
    border-radius: 12px;
    font-size: 1rem;
    background: white;
    box-sizing: border-box;
}
.payment-methods {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
.method-item {
    padding: 16px;
    border: 1.5px solid #eee;
    border-radius: 16px;
    background: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
}
.method-item.active {
    border-color: #00b900;
    background: #f6ffed;
    color: #00b900;
}
.method-icon {
    font-size: 1.5rem;
}
.card-form {
    padding: 0 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
.form-group label {
    display: block;
    font-size: 0.8rem;
    color: #999;
    margin-bottom: 4px;
}
.checkout-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20px;
    background: white;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
    max-width: 600px;
    margin: 0 auto;
}
.pay-btn {
    width: 100%;
    background: #00b900;
    color: white;
    border: none;
    padding: 18px;
    border-radius: 16px;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
}
.pay-btn:disabled {
    background: #eee;
    color: #999;
    cursor: not-allowed;
}
.animate-fade {
    animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>

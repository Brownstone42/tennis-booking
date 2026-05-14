<template>
    <div class="min-h-screen bg-[#fcfcfc] pb-32">
        <header class="bg-white px-4 py-4 flex items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <button class="bg-transparent border-0 text-2xl cursor-pointer" @click="$router.back()">←</button>
            <h2 class="m-0 text-xl font-semibold text-gray-800">ชำระเงิน</h2>
        </header>

        <main class="checkout-content">
            <!-- Summary banner -->
            <section class="bg-gray-800 text-white px-5 py-5 mx-4 mt-4 rounded-2xl">
                <div class="flex justify-between items-center text-xl">
                    <strong>{{ currentCourt?.name }}</strong>
                    <span class="font-black text-line-green">฿{{ totalPrice.toLocaleString() }}</span>
                </div>
                <div class="text-sm opacity-70 mt-1">{{ formatDate(date) }} | {{ timeString }}</div>
            </section>

            <!-- Phone -->
            <section class="px-4 mt-6 mb-6">
                <h3 class="text-base font-semibold text-gray-700 mb-3">เบอร์โทรศัพท์สำหรับติดต่อ</h3>
                <input
                    type="tel"
                    v-model="phone"
                    placeholder="08X-XXX-XXXX"
                    maxlength="10"
                    class="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-base bg-white box-border focus:border-ant-blue focus:outline-none"
                    @input="validatePhone"
                />
            </section>

            <!-- Payment method -->
            <section class="px-4 mb-6">
                <h3 class="text-base font-semibold text-gray-700 mb-3">เลือกช่องทางชำระเงิน</h3>
                <div class="grid grid-cols-2 gap-3">
                    <button
                        class="px-4 py-4 border-[1.5px] rounded-2xl bg-white flex flex-col items-center gap-2 cursor-pointer transition-all duration-200"
                        :class="paymentMethod === 'promptpay' ? 'border-line-green bg-[#f6ffed] text-line-green' : 'border-gray-200'"
                        @click="paymentMethod = 'promptpay'"
                    >
                        <div class="text-2xl">QR</div>
                        <span class="text-sm font-medium">PromptPay</span>
                    </button>
                    <button
                        class="px-4 py-4 border-[1.5px] rounded-2xl bg-white flex flex-col items-center gap-2 cursor-pointer transition-all duration-200"
                        :class="paymentMethod === 'credit_card' ? 'border-line-green bg-[#f6ffed] text-line-green' : 'border-gray-200'"
                        @click="paymentMethod = 'credit_card'"
                    >
                        <div class="text-2xl">💳</div>
                        <span class="text-sm font-medium">บัตรเครดิต</span>
                    </button>
                </div>
            </section>

            <!-- Card form -->
            <section v-if="paymentMethod === 'credit_card'" class="animate-fade px-4 flex flex-col gap-3">
                <div>
                    <label class="block text-xs text-gray-400 mb-1">หมายเลขบัตร</label>
                    <input type="text" v-model="card.number" placeholder="XXXX XXXX XXXX XXXX"
                        class="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-base bg-white box-border focus:border-ant-blue focus:outline-none" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs text-gray-400 mb-1">วันหมดอายุ (MM/YY)</label>
                        <input type="text" v-model="card.expiry" placeholder="MM/YY"
                            class="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-base bg-white box-border focus:border-ant-blue focus:outline-none" />
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 mb-1">CVV</label>
                        <input type="password" v-model="card.cvv" placeholder="XXX"
                            class="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-base bg-white box-border focus:border-ant-blue focus:outline-none" />
                    </div>
                </div>
            </section>
        </main>

        <!-- Fixed footer -->
        <footer class="fixed bottom-0 left-0 right-0 px-5 py-5 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.05)] max-w-[600px] mx-auto">
            <button
                class="w-full bg-line-green text-white border-0 py-[18px] rounded-2xl text-lg font-bold cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                :disabled="!isValid || isSubmitting"
                @click="startPaymentFlow"
            >
                <span v-if="isSubmitting">กำลังดำเนินการ...</span>
                <span v-else>ยืนยันและชำระเงิน ฿{{ totalPrice.toLocaleString() }}</span>
            </button>
        </footer>
    </div>
</template>

<script>
import { format, parseISO, isSameDay, startOfDay } from 'date-fns'
import { th } from 'date-fns/locale'
import { mapState } from 'pinia'
import { useConfigStore } from '../stores/config'
import { useLiffStore } from '../stores/liff'
import { db, functions } from '../firebase'
import { httpsCallable } from 'firebase/functions'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { TENANT_ID } from '../constants'
import { PENDING_EXPIRY_SECONDS, getPriceForHour } from '../utils/booking'

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
            return this.hours ? this.hours.split(',').map(Number).sort((a, b) => a - b) : []
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
            return getPriceForHour(hour, this.currentCourt, this.defaultPricing)
        },
        validatePhone() {
            this.phone = this.phone.replace(/\D/g, '')
        },
        async checkSlotAvailability() {
            const bQuery = query(
                collection(db, 'bookings'),
                where('tenantId', '==', TENANT_ID),
                where('date', '==', this.date),
                where('courtId', '==', Number(this.courtId)),
                where('status', 'in', ['paid', 'pending'])
            )
            const snapshot = await getDocs(bQuery)
            const now = new Date()
            return !snapshot.docs.some((doc) => {
                const data = doc.data()
                const isActive =
                    data.status === 'paid' ||
                    (data.status === 'pending' &&
                        data.createdAt &&
                        (now - data.createdAt.toDate()) / 1000 < PENDING_EXPIRY_SECONDS)
                return isActive && data.hours.some((h) => this.hoursArray.includes(h))
            })
        },
        async startPaymentFlow() {
            const now = new Date()
            const selectedDate = startOfDay(parseISO(this.date))
            const today = startOfDay(now)
            const isAnyPast =
                selectedDate < today ||
                (isSameDay(selectedDate, today) && this.hoursArray.some((h) => h <= now.getHours()))
            if (isAnyPast) {
                alert('ขออภัยครับ มีบางช่วงเวลาที่เลือกหมดเวลาจองไปแล้ว กรุณาเลือกเวลาใหม่อีกครั้ง')
                this.$router.push('/')
                return
            }
            this.isSubmitting = true
            try {
                const isAvailable = await this.checkSlotAvailability()
                if (!isAvailable) {
                    alert('ขออภัยครับ มีบางช่วงเวลาที่เลือกถูกจองไปแล้ว (หรือกำลังรอคนอื่นชำระเงิน) กรุณาเลือกเวลาใหม่อีกครั้ง')
                    this.isSubmitting = false
                    this.$router.push('/')
                    return
                }
            } catch (err) {
                console.error('Error checking availability:', err)
                this.isSubmitting = false
                return
            }
            const publicKey = import.meta.env.VITE_OMISE_PUBLIC_KEY
            if (!publicKey || publicKey === 'pkey_test_xxxxxxxxxxxxxx') {
                alert('กรุณาตั้งค่า OMISE_PUBLIC_KEY ใน .env ให้ถูกต้องก่อนครับ')
                this.isSubmitting = false
                return
            }
            window.Omise.setPublicKey(publicKey)
            try {
                if (this.paymentMethod === 'promptpay') {
                    window.Omise.createSource('promptpay', { amount: this.totalPrice * 100, currency: 'THB' }, (statusCode, response) => {
                        if (statusCode === 200) {
                            this.handleBackendCharge({ source: response.id })
                        } else {
                            alert('ไม่สามารถสร้างรายการชำระเงินได้: ' + response.message)
                            this.isSubmitting = false
                        }
                    })
                } else {
                    const [expMonth, expYear] = this.card.expiry.split('/')
                    const parsedYear = parseInt(expYear)
                    window.Omise.createToken('card', {
                        name: this.profile?.displayName || 'Customer',
                        number: this.card.number.replace(/\s/g, ''),
                        expiration_month: parseInt(expMonth),
                        expiration_year: parsedYear < 100 ? 2000 + parsedYear : parsedYear,
                        security_code: parseInt(this.card.cvv)
                    }, (statusCode, response) => {
                        if (statusCode === 200) {
                            this.handleBackendCharge({ token: response.id })
                        } else {
                            alert('ข้อมูลบัตรไม่ถูกต้อง: ' + response.message)
                            this.isSubmitting = false
                        }
                    })
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
                    courtId: Number(this.courtId),
                    date: this.date,
                    hours: this.hours,
                    phone: this.phone,
                    tenantId: TENANT_ID,
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
                            qrImage: result.data.qrImage,
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

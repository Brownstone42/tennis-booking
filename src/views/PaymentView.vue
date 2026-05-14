<template>
    <div class="min-h-screen bg-[#f4f7f6] pb-10">
        <header class="bg-white px-4 py-4 text-center border-b border-gray-100">
            <h2 class="text-xl m-0 font-semibold text-gray-800">
                {{ authorizeUri ? 'ยืนยันการชำระเงิน' : 'ชำระเงินผ่าน PromptPay' }}
            </h2>
        </header>

        <main class="px-4 py-6 max-w-sm mx-auto">
            <div v-if="loading" class="text-center py-12">
                <p class="text-gray-500 mb-4">กำลังเตรียมรายการ...</p>
                <div class="spinner-sm mx-auto"></div>
            </div>

            <div v-else class="animate-fade">
                <!-- QR Card -->
                <div class="bg-white rounded-3xl shadow-[0_10px_25px_rgba(0,0,0,0.08)] mb-6 overflow-hidden">
                    <div class="bg-promptpay px-3 py-3 text-center">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png"
                            alt="PromptPay"
                            class="h-7 inline"
                        />
                    </div>

                    <!-- QR image + timer -->
                    <div v-if="qrImage && bookingStatus === 'pending'" class="px-6 py-6 text-center bg-white">
                        <div
                            class="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center"
                            :class="{ 'bg-red-100 [animation:pulse-opacity_1s_infinite]': timeLeft < 20 }"
                        >
                            <span class="text-xs text-red-500 font-semibold">สแกนจ่ายภายใน:</span>
                            <span class="text-2xl font-extrabold text-red-700 font-mono">{{ formattedTime }}</span>
                        </div>
                        <img
                            :src="qrImage"
                            alt="QR Code"
                            class="w-full max-w-[250px] h-auto border border-gray-100 rounded-xl mx-auto"
                        />
                    </div>

                    <!-- Expired state -->
                    <div v-else-if="bookingStatus === 'expired'" class="animate-fade px-5 py-10 text-center">
                        <div class="text-5xl mb-4">⏳</div>
                        <h3 class="text-gray-800 mb-2">หมดเวลาชำระเงิน</h3>
                        <p class="text-gray-500 text-sm">กรุณากลับไปเลือกเวลาใหม่อีกครั้งครับ</p>
                    </div>

                    <!-- Error state -->
                    <div v-else class="px-6 py-6 text-center">
                        <p v-if="!qrImage" class="text-gray-500">ไม่สามารถโหลด QR Code ได้ กรุณาลองใหม่</p>
                    </div>

                    <!-- Amount -->
                    <div class="bg-gray-50 px-4 py-4 border-t border-dashed border-gray-200 flex flex-col items-center">
                        <span class="text-gray-400 text-xs">ยอดชำระ</span>
                        <span class="text-[1.8rem] font-black text-gray-800">฿{{ amount?.toLocaleString() }}</span>
                    </div>
                </div>

                <!-- Status -->
                <div class="text-center mb-5">
                    <p class="text-gray-500 text-sm mb-4">กรุณาสแกน QR Code ด้านบนด้วยแอปธนาคาร</p>
                    <div class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold" :class="statusBadgeClass">
                        <div v-if="bookingStatus === 'pending'" class="spinner-tiny-amber"></div>
                        {{ statusText }}
                    </div>
                </div>

                <p v-if="bookingStatus === 'pending'" class="text-center text-gray-400 text-sm">
                    ระบบกำลังรอรับยอดเงิน...
                </p>
            </div>
        </main>

        <footer class="px-5 text-center">
            <button
                v-if="bookingStatus === 'pending' || bookingStatus === 'expired'"
                class="bg-transparent border-0 text-gray-400 underline text-sm cursor-pointer"
                @click="$router.push('/')"
            >
                {{ bookingStatus === 'expired' ? 'กลับหน้าแรก' : 'ยกเลิกรายการและกลับหน้าแรก' }}
            </button>
        </footer>
    </div>
</template>

<script>
import { db, functions } from '../firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

export default {
    data() {
        return {
            bookingId: '',
            qrImage: '',
            authorizeUri: '',
            amount: 0,
            bookingStatus: 'pending',
            loading: true,
            unsubscribe: null,
            timeLeft: 900,
            timerInterval: null
        }
    },
    computed: {
        formattedTime() {
            const mins = Math.floor(this.timeLeft / 60)
            const secs = this.timeLeft % 60
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        },
        statusText() {
            if (this.bookingStatus === 'paid') return 'ชำระเงินสำเร็จ!'
            if (this.bookingStatus === 'failed') return 'การชำระเงินไม่สำเร็จ'
            if (this.bookingStatus === 'expired') return 'หมดเวลาชำระเงิน'
            return 'รอการชำระเงิน...'
        },
        statusBadgeClass() {
            if (this.bookingStatus === 'paid') return 'bg-[#f6ffed] text-line-green'
            if (this.bookingStatus === 'failed') return 'bg-[#fff1f0] text-red-600'
            if (this.bookingStatus === 'expired') return 'bg-gray-100 text-gray-400'
            return 'bg-[#fff7e6] text-[#faad14]'
        }
    },
    methods: {
        startTimer(createdAt) {
            if (this.timerInterval) clearInterval(this.timerInterval)
            const updateTimer = () => {
                const now = new Date()
                const diff = Math.floor((now - createdAt) / 1000)
                this.timeLeft = Math.max(0, 900 - diff)
                if (this.timeLeft <= 0) {
                    clearInterval(this.timerInterval)
                    this.timerInterval = null
                    setTimeout(() => { this.executeCheckStatus() }, 3000)
                }
            }
            updateTimer()
            this.timerInterval = setInterval(updateTimer, 1000)
        },
        listenToBookingStatus() {
            if (!this.bookingId) return
            const docRef = doc(db, 'bookings', this.bookingId)
            this.unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data()
                    this.bookingStatus = data.status
                    if (data.createdAt && !this.timerInterval) {
                        this.startTimer(data.createdAt.toDate())
                    }
                    if (this.bookingStatus === 'paid' || this.bookingStatus === 'failed') {
                        if (this.unsubscribe) { this.unsubscribe(); this.unsubscribe = null }
                        const dest = this.bookingStatus === 'paid' ? 'success' : 'fail'
                        setTimeout(() => this.$router.push({ name: dest }), 1500)
                    }
                }
            })
        },
        async executeCheckStatus() {
            try {
                const checkBookingStatus = httpsCallable(functions, 'checkBookingStatus')
                await checkBookingStatus({ bookingId: this.bookingId })
            } catch (error) {
                console.error('Error calling checkBookingStatus:', error)
            }
        }
    },
    created() {
        this.bookingId = this.$route.query.bookingId
        this.qrImage = this.$route.query.qrImage
        this.authorizeUri = this.$route.query.authorizeUri || ''
        this.amount = Number(this.$route.query.amount)
        if (!this.bookingId) {
            this.$router.push('/')
            return
        }
        if (this.authorizeUri) {
            window.location.href = this.authorizeUri
            return
        }
        this.loading = false
        this.listenToBookingStatus()
    },
    beforeUnmount() {
        if (this.unsubscribe) this.unsubscribe()
        if (this.timerInterval) clearInterval(this.timerInterval)
    }
}
</script>

<style scoped>
.spinner-sm {
    border: 3px solid #e5e7eb;
    border-top-color: #6b7280;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    animation: spin 1s linear infinite;
}
.spinner-tiny-amber {
    border: 2px solid rgba(250, 173, 20, 0.2);
    border-top-color: #faad14;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    animation: spin 1s linear infinite;
    flex-shrink: 0;
}
</style>

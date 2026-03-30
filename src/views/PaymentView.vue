<template>
    <div class="payment-view">
        <header class="payment-header">
            <h2>ชำระเงินผ่าน PromptPay</h2>
        </header>

        <main class="payment-content">
            <div v-if="loading" class="loading-box">
                <p>กำลังเตรียมรายการ...</p>
                <div class="spinner-small"></div>
            </div>

            <div v-else class="qr-container animate-fade">
                <div class="qr-card">
                    <div class="qr-header">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png"
                            alt="PromptPay"
                            class="pp-logo"
                        />
                    </div>

                    <div class="qr-image-box" v-if="qrImage">
                        <img :src="qrImage" alt="QR Code" class="qr-img" />
                    </div>
                    <div v-else class="error-box">
                        <p>ไม่สามารถโหลด QR Code ได้ กรุณาลองใหม่</p>
                    </div>

                    <div class="payment-amount">
                        <span class="label">ยอดชำระ</span>
                        <span class="amount">฿{{ amount?.toLocaleString() }}</span>
                    </div>
                </div>

                <div class="payment-info">
                    <p class="instruction">กรุณาสแกน QR Code ด้านบนด้วยแอปธนาคาร</p>
                    <div class="status-badge" :class="statusClass">
                        <div class="spinner-tiny" v-if="bookingStatus === 'pending'"></div>
                        {{ statusText }}
                    </div>
                </div>

                <button
                    v-if="bookingStatus === 'pending'"
                    class="check-status-btn"
                    @click="manualCheckStatus"
                >
                    ฉันชำระเงินเรียบร้อยแล้ว
                </button>
            </div>
        </main>

        <footer class="payment-footer">
            <button
                class="cancel-btn"
                @click="$router.push('/')"
                v-if="bookingStatus === 'pending'"
            >
                ยกเลิกรายการและกลับหน้าแรก
            </button>
        </footer>
    </div>
</template>

<script>
import { db } from '../firebase'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'

export default {
    data() {
        return {
            bookingId: '',
            qrImage: '',
            amount: 0,
            bookingStatus: 'pending',
            loading: true,
            unsubscribe: null
        }
    },
    computed: {
        statusText() {
            if (this.bookingStatus === 'paid') return 'ชำระเงินสำเร็จ!'
            if (this.bookingStatus === 'failed') return 'การชำระเงินไม่สำเร็จ'
            return 'รอการชำระเงิน...'
        },
        statusClass() {
            return {
                'status-paid': this.bookingStatus === 'paid',
                'status-failed': this.bookingStatus === 'failed',
                'status-pending': this.bookingStatus === 'pending'
            }
        }
    },
    methods: {
        listenToBookingStatus() {
            if (!this.bookingId) return
            const docRef = doc(db, 'bookings', this.bookingId)
            this.unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data()
                    this.bookingStatus = data.status

                    if (this.bookingStatus === 'paid') {
                        setTimeout(() => this.$router.push({ name: 'success' }), 1500)
                    } else if (this.bookingStatus === 'failed') {
                        setTimeout(() => this.$router.push({ name: 'fail' }), 1500)
                    }
                }
            })
        },
        async manualCheckStatus() {
            const docRef = doc(db, 'bookings', this.bookingId)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                const data = docSnap.data()
                this.bookingStatus = data.status
                if (this.bookingStatus === 'paid') {
                    this.$router.push({ name: 'success' })
                } else if (this.bookingStatus === 'failed') {
                    this.$router.push({ name: 'fail' })
                } else {
                    alert('ระบบยังไม่ได้รับยอดเงิน กรุณารอสักครู่ครับ')
                }
            }
        }
    },
    created() {
        this.bookingId = this.$route.query.bookingId
        this.qrImage = this.$route.query.qrImage
        this.amount = Number(this.$route.query.amount)
        if (!this.bookingId) {
            this.$router.push('/')
            return
        }
        this.loading = false
        this.listenToBookingStatus()
    },
    beforeUnmount() {
        if (this.unsubscribe) this.unsubscribe()
    }
}
</script>

<style scoped>
.payment-view {
    min-height: 100vh;
    background-color: #f4f7f6;
    padding-bottom: 40px;
}
.payment-header {
    background: #fff;
    padding: 16px;
    text-align: center;
    border-bottom: 1px solid #eee;
}
.payment-header h2 {
    font-size: 1.2rem;
    margin: 0;
    color: #333;
}
.payment-content {
    padding: 24px 16px;
    max-width: 400px;
    margin: 0 auto;
}
.qr-card {
    background: #fff;
    border-radius: 24px;
    padding: 0;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
    margin-bottom: 24px;
    overflow: hidden;
}
.qr-header {
    background: #003764;
    padding: 12px;
    text-align: center;
}
.pp-logo {
    height: 30px;
}
.qr-image-box {
    padding: 24px;
    text-align: center;
    background: #fff;
}
.qr-img {
    width: 100%;
    max-width: 250px;
    height: auto;
    border: 1px solid #eee;
    border-radius: 12px;
}
.payment-amount {
    background: #fcfcfc;
    padding: 16px;
    border-top: 1px dashed #eee;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.payment-amount .label {
    color: #888;
    font-size: 0.8rem;
}
.payment-amount .amount {
    font-size: 1.8rem;
    font-weight: 900;
    color: #333;
}
.payment-info {
    text-align: center;
    margin-bottom: 20px;
}
.instruction {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 16px;
}
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    border-radius: 50px;
    font-weight: 700;
    margin-bottom: 20px;
}
.status-pending {
    background: #fff7e6;
    color: #faad14;
}
.status-paid {
    background: #f6ffed;
    color: #00b900;
}
.status-failed {
    background: #fff1f0;
    color: #f5222d;
}
.check-status-btn {
    width: 100%;
    padding: 14px;
    background-color: #333;
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
}
.payment-footer {
    padding: 20px;
    text-align: center;
}
.cancel-btn {
    background: none;
    border: none;
    color: #999;
    text-decoration: underline;
    font-size: 0.85rem;
}
.spinner-tiny {
    border: 2px solid rgba(250, 173, 20, 0.2);
    border-top: 2px solid #faad14;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    animation: spin 1s linear infinite;
}
@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}
.animate-fade {
    animation: fadeIn 0.4s ease;
}
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}
</style>

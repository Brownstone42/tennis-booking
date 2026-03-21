<template>
    <div class="fail-view animate-fade">
        <main class="fail-content">
            <div class="fail-icon">❌</div>
            <h1>การชำระเงินไม่สำเร็จ</h1>
            <p>{{ errorMessage || 'เกิดข้อผิดพลาดในการดำเนินการชำระเงิน กรุณาลองใหม่อีกครั้ง' }}</p>
            
            <section class="error-card">
                <p>หากคุณถูกตัดเงินแล้วแต่สถานะไม่เปลี่ยน กรุณาติดต่อเจ้าหน้าที่สนามพร้อมหลักฐานการโอนเงิน</p>
            </section>

            <div class="button-group">
                <button class="retry-btn" @click="$router.push('/')">กลับหน้าหลักเพื่อลองใหม่</button>
                <button class="close-btn" @click="closeLiff">ปิดหน้าต่าง</button>
            </div>
        </main>
    </div>
</template>

<script>
import liff from '@line/liff'

export default {
    data() {
        return {
            errorMessage: ''
        }
    },
    methods: {
        closeLiff() {
            if (liff.isInClient()) {
                liff.closeWindow()
            } else {
                this.$router.push('/')
            }
        }
    },
    created() {
        this.errorMessage = this.$route.query.message || ''
    }
}
</script>

<style scoped>
.fail-view {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #fff;
    padding: 20px;
    text-align: center;
}

.fail-icon {
    font-size: 5rem;
    color: #ff4d4f;
    margin-bottom: 24px;
}

h1 { font-size: 1.8rem; margin-bottom: 12px; color: #333; }
p { color: #666; margin-bottom: 30px; }

.error-card {
    background: #fff1f0;
    padding: 24px;
    border-radius: 20px;
    margin-bottom: 40px;
    border: 1px solid #ffa39e;
    font-size: 0.9rem;
}

.button-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.retry-btn {
    background: #333;
    color: white;
    border: none;
    padding: 16px 40px;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
}

.close-btn {
    background: none;
    color: #999;
    border: none;
    padding: 10px;
    font-size: 0.9rem;
    text-decoration: underline;
    cursor: pointer;
}

.animate-fade {
    animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>

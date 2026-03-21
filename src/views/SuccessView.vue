<template>
    <div class="success-view animate-fade">
        <main class="success-content">
            <div class="success-icon">✔️</div>
            <h1>จองสนามสำเร็จ!</h1>
            <p>เราได้รับข้อมูลการชำระเงินของคุณเรียบร้อยแล้ว</p>
            
            <section class="booking-card">
                <p>เราส่งข้อความยืนยันการจองไปที่แชท LINE ของคุณแล้ว</p>
                <div class="hint-text">(คุณสามารถปิดหน้าต่างนี้ได้ทันที)</div>
            </section>

            <button class="close-btn" @click="closeLiff">ปิดหน้าต่าง</button>
        </main>
    </div>
</template>

<script>
import liff from '@line/liff'

export default {
    methods: {
        closeLiff() {
            if (liff.isInClient()) {
                liff.closeWindow()
            } else {
                this.$router.push('/')
            }
        }
    }
}
</script>

<style scoped>
.success-view {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #fff;
    padding: 20px;
    text-align: center;
}

.success-icon {
    font-size: 5rem;
    color: #00b900;
    margin-bottom: 24px;
}

h1 { font-size: 1.8rem; margin-bottom: 12px; color: #333; }
p { color: #666; margin-bottom: 30px; }

.booking-card {
    background: #f6ffed;
    padding: 24px;
    border-radius: 20px;
    margin-bottom: 40px;
    border: 1px solid #b7eb8f;
}

.hint-text { font-size: 0.85rem; color: #888; margin-top: 10px; }

.close-btn {
    background: #00b900;
    color: white;
    border: none;
    padding: 16px 40px;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,185,0,0.2);
}

.animate-fade {
    animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>

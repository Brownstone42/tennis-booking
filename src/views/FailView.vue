<template>
    <div class="animate-fade min-h-screen flex justify-center items-center bg-white p-5 text-center">
        <main>
            <div class="text-8xl mb-6">❌</div>
            <h1 class="text-3xl font-bold mb-3 text-gray-800">การชำระเงินไม่สำเร็จ</h1>
            <p class="text-gray-500 mb-8">
                {{ errorMessage || 'เกิดข้อผิดพลาดในการดำเนินการชำระเงิน กรุณาลองใหม่อีกครั้ง' }}
            </p>

            <section class="bg-[#fff1f0] border border-[#ffa39e] rounded-2xl p-6 mb-10 text-sm text-gray-600">
                <p>
                    หากคุณถูกตัดเงินแล้วแต่สถานะไม่เปลี่ยน
                    กรุณาติดต่อเจ้าหน้าที่สนามพร้อมหลักฐานการโอนเงิน
                </p>
            </section>

            <div class="flex flex-col gap-3">
                <button
                    class="bg-gray-800 text-white border-0 px-10 py-4 rounded-xl text-lg font-bold cursor-pointer"
                    @click="$router.push('/')"
                >
                    กลับหน้าหลักเพื่อลองใหม่
                </button>
                <button
                    class="bg-transparent text-gray-400 border-0 py-2.5 text-sm underline cursor-pointer"
                    @click="closeLiff"
                >
                    ปิดหน้าต่าง
                </button>
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

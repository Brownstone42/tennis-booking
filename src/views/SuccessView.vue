<template>
    <div class="animate-fade min-h-screen flex justify-center items-center bg-white p-5 text-center">
        <main>
            <div class="text-8xl mb-6">✔️</div>
            <h1 class="text-3xl font-bold mb-3 text-gray-800">จองสนามสำเร็จ!</h1>
            <p class="text-gray-500 mb-8">เราได้รับข้อมูลการชำระเงินของคุณเรียบร้อยแล้ว</p>

            <section class="bg-[#f6ffed] border border-[#b7eb8f] rounded-2xl p-6 mb-10">
                <p class="text-gray-600 mb-0">เราส่งข้อความยืนยันการจองไปที่แชท LINE ของคุณแล้ว</p>
                <div class="text-sm text-gray-400 mt-2">(คุณสามารถปิดหน้าต่างนี้ได้ทันที)</div>
            </section>

            <button
                class="bg-line-green text-white border-0 px-10 py-4 rounded-xl text-lg font-bold cursor-pointer shadow-[0_4px_12px_rgba(0,185,0,0.2)]"
                @click="closeLiff"
            >
                ปิดหน้าต่าง
            </button>
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

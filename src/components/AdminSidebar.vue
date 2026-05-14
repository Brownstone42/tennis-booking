<template>
    <aside class="w-[260px] bg-ant-navy text-white flex flex-col sticky top-0 h-screen shrink-0">
        <div class="px-6 py-6 flex items-center gap-3 text-xl font-bold border-b border-white/10">
            <img src="/favicon.ico" alt="Logo" class="w-8" />
            <span>Tennis Admin</span>
        </div>
        <nav class="flex-1 py-5">
            <router-link
                :to="{ name: 'admin-dashboard' }"
                active-class="!bg-ant-blue !text-white"
                class="block px-6 py-3.5 text-white/70 no-underline transition-all duration-200 hover:bg-ant-blue hover:text-white"
            >📊 แดชบอร์ด</router-link>
            <router-link
                :to="{ name: 'admin-schedule' }"
                active-class="!bg-ant-blue !text-white"
                class="block px-6 py-3.5 text-white/70 no-underline transition-all duration-200 hover:bg-ant-blue hover:text-white"
            >📅 จัดการตารางเวลา</router-link>
            <router-link
                :to="{ name: 'admin-settings' }"
                active-class="!bg-ant-blue !text-white"
                class="block px-6 py-3.5 text-white/70 no-underline transition-all duration-200 hover:bg-ant-blue hover:text-white"
            >⚙️ ตั้งค่าสนาม</router-link>
        </nav>
        <div class="p-5 border-t border-white/10">
            <button
                class="w-full py-2.5 bg-white/10 border border-white/20 rounded-md text-white cursor-pointer transition-all duration-200 font-semibold hover:bg-white/20"
                @click="logout"
            >
                Log Out
            </button>
        </div>
    </aside>
</template>

<script>
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'

export default {
    methods: {
        async logout() {
            await signOut(auth)
            this.$router.push({ name: 'admin-login' })
        }
    }
}
</script>

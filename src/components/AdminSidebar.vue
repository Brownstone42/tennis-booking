<template>
    <aside class="w-[260px] bg-ant-navy text-white flex flex-col sticky top-0 h-screen shrink-0">
        <div class="px-6 py-6 flex items-center gap-3 text-xl font-bold border-b border-white/10">
            <img src="/favicon.ico" alt="Logo" class="w-8" />
            <span>Tennis Admin</span>
        </div>

        <nav class="flex-1 py-5">
            <router-link
                :to="{ name: 'admin-dashboard' }"
                custom
                v-slot="{ isActive, navigate }"
            >
                <a
                    @click="navigate"
                    class="sidebar-link"
                    :class="isActive ? 'sidebar-link-active' : ''"
                >
                    <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <span>แดชบอร์ด</span>
                </a>
            </router-link>

            <router-link
                :to="{ name: 'admin-schedule' }"
                custom
                v-slot="{ isActive, navigate }"
            >
                <a
                    @click="navigate"
                    class="sidebar-link"
                    :class="isActive ? 'sidebar-link-active' : ''"
                >
                    <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span>จัดการตารางเวลา</span>
                </a>
            </router-link>

            <router-link
                :to="{ name: 'admin-settings' }"
                custom
                v-slot="{ isActive, navigate }"
            >
                <a
                    @click="navigate"
                    class="sidebar-link"
                    :class="isActive ? 'sidebar-link-active' : ''"
                >
                    <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span>ตั้งค่าสนาม</span>
                </a>
            </router-link>
        </nav>

        <div class="p-5 border-t border-white/10 flex flex-col gap-3">
            <div v-if="userEmail" class="text-xs text-white/50 truncate px-1">{{ userEmail }}</div>
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
import { signOut, onAuthStateChanged } from 'firebase/auth'

export default {
    data() {
        return { userEmail: '' }
    },
    created() {
        onAuthStateChanged(auth, (user) => {
            this.userEmail = user?.email || ''
        })
    },
    methods: {
        async logout() {
            await signOut(auth)
            this.$router.push({ name: 'admin-login' })
        }
    }
}
</script>

<style scoped>
@reference "../style.css";

.sidebar-link {
    @apply flex items-center gap-3 px-6 py-3.5 text-white/70 no-underline transition-all duration-200 cursor-pointer border-l-[3px] border-transparent hover:bg-white/10 hover:text-white;
}

.sidebar-link-active {
    @apply border-l-[3px] border-ant-blue text-white bg-white/10;
}
</style>

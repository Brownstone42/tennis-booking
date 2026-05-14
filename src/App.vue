<template>
    <div id="app">
        <!-- User header -->
        <header
            v-if="!isAdminRoute && isLoggedIn"
            class="max-w-[600px] mx-auto bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sticky top-0 z-[100]"
        >
            <div v-if="profile" class="flex items-center gap-3">
                <img
                    :src="profile.pictureUrl"
                    :alt="profile.displayName"
                    class="w-10 h-10 rounded-full border-2 border-line-green"
                />
                <span class="font-semibold text-gray-800 flex-1">{{ profile.displayName }}</span>
                <button
                    class="px-4 py-2 rounded-lg border-0 cursor-pointer font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    @click="logout"
                >Logout</button>
            </div>
        </header>

        <!-- User login gate -->
        <div
            v-if="!isAdminRoute && !isLoggedIn"
            class="max-w-[600px] mx-auto flex justify-center items-center h-screen px-5 bg-white"
        >
            <div class="text-center w-full">
                <img src="/favicon.ico" alt="Logo" class="w-20 mx-auto mb-5" />
                <h1 class="text-2xl font-bold mb-2 text-gray-800">Tennis Booking</h1>
                <p class="text-gray-500 mb-6">กรุณาเข้าสู่ระบบเพื่อจองสนาม</p>
                <button
                    class="w-full bg-line-green text-white border-0 py-4 rounded-xl font-semibold text-base cursor-pointer"
                    @click="login"
                >Login with LINE</button>
            </div>
        </div>

        <!-- Main content -->
        <main :class="contentClass">
            <RouterView />
        </main>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import { useLiffStore } from './stores/liff'
import { useConfigStore } from './stores/config'
import { TENANT_ID } from './constants'

export default {
    computed: {
        ...mapState(useLiffStore, ['profile', 'isLoggedIn']),
        isAdminRoute() {
            return this.$route.path.startsWith('/admin')
        },
        contentClass() {
            if (this.isAdminRoute) return 'w-full bg-[#f0f2f5]'
            return 'max-w-[600px] mx-auto bg-white min-h-screen shadow-[0_0_20px_rgba(0,0,0,0.05)]'
        }
    },
    methods: {
        ...mapActions(useLiffStore, ['initLiff', 'login', 'logout']),
        ...mapActions(useConfigStore, ['fetchConfig'])
    },
    async mounted() {
        const liffId = import.meta.env.VITE_LIFF_ID
        if (liffId && !this.isAdminRoute) {
            await this.initLiff(liffId)
        }
        await this.fetchConfig(TENANT_ID)
    }
}
</script>

<template>
    <div id="app" :class="{ 'admin-mode': isAdminRoute }">
        <!-- ฝั่ง User (LIFF) แสดง Header แบบเดิม -->
        <header v-if="!isAdminRoute && isLoggedIn" class="app-header">
            <div class="user-profile" v-if="profile">
                <img :src="profile.pictureUrl" :alt="profile.displayName" />
                <span class="user-name">{{ profile.displayName }}</span>
                <button class="btn logout-btn" @click="logout">Logout</button>
            </div>
        </header>

        <!-- หน้า Login สำหรับ User -->
        <div v-if="!isAdminRoute && !isLoggedIn" class="user-login-container">
            <div class="welcome-box">
                <img src="/favicon.ico" alt="Logo" class="app-logo" />
                <h1>Tennis Booking</h1>
                <p>กรุณาเข้าสู่ระบบเพื่อจองสนาม</p>
                <button class="btn login-btn" @click="login">Login with LINE</button>
            </div>
        </div>

        <!-- พื้นที่แสดงเนื้อหาหลัก -->
        <main :class="contentClass">
            <RouterView />
        </main>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import { useLiffStore } from './stores/liff'
import { useConfigStore } from './stores/config'

export default {
    computed: {
        ...mapState(useLiffStore, ['profile', 'isLoggedIn']),
        isAdminRoute() {
            return this.$route.path.startsWith('/admin')
        },
        contentClass() {
            return {
                'content-user': !this.isAdminRoute,
                'content-admin': this.isAdminRoute
            }
        }
    },
    methods: {
        ...mapActions(useLiffStore, ['initLiff', 'login', 'logout']),
        ...mapActions(useConfigStore, ['fetchConfig'])
    },
    async mounted() {
        // Init LIFF เฉพาะเมื่อไม่ได้อยู่หน้า Admin หรือถ้าจำเป็นต้องใช้
        const liffId = import.meta.env.VITE_LIFF_ID
        if (liffId && !this.isAdminRoute) {
            await this.initLiff(liffId)
        }

        const tenantId = 'court_001'
        await this.fetchConfig(tenantId)
    }
}
</script>

<style>
/* Global Reset */
body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    background-color: #fcfcfc;
}

#app {
    min-height: 100vh;
}

/* User Layout (Max-width 600px) */
.content-user {
    max-width: 600px;
    margin: 0 auto;
    background-color: #fff;
    min-height: 100vh;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
}

.app-header {
    max-width: 600px;
    margin: 0 auto;
    background-color: #fff;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    position: sticky;
    top: 0;
    z-index: 100;
}

/* Admin Layout (Full Width) */
.content-admin {
    width: 100%;
    margin: 0;
    background-color: #f0f2f5;
}

.user-profile {
    display: flex;
    align-items: center;
    gap: 12px;
}

.user-profile img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid #00b900;
}

.btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 600;
}

.login-btn {
    background-color: #00b900;
    color: white;
    width: 100%;
    padding: 16px;
}

.user-login-container {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    padding: 20px;
    background-color: #fff;
}

.welcome-box {
    text-align: center;
    width: 100%;
}
.app-logo {
    width: 80px;
    margin-bottom: 20px;
}
</style>

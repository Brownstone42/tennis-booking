<template>
    <div id="app">
        <header v-if="isLoggedIn" class="app-header">
            <div class="user-profile" v-if="profile">
                <img :src="profile.pictureUrl" :alt="profile.displayName" />
                <span class="user-name" @dblclick="showAdmin = !showAdmin">{{ profile.displayName }}</span>
                <button class="btn logout-btn" @click="logout">Logout</button>
            </div>
        </header>

        <div v-else-if="!isLoggedIn" class="login-container">
            <button class="btn login-btn" @click="login">Login with LINE</button>
        </div>

        <main class="content">
            <!-- โชว์ปุ่มถ้าไม่มี courts (โครงสร้างใหม่) หรือถ้ากด dblclick ที่ชื่อโปรไฟล์ -->
            <div v-if="isLoggedIn && (!courts || courts.length === 0 || showAdmin)" class="setup-container">
                <p v-if="!courts || courts.length === 0">พบโครงสร้างข้อมูลแบบเก่า กรุณาอัปเดต</p>
                <p v-else>Admin Mode</p>
                <button @click="handleSeedData" class="btn setup-btn">
                    อัปเดตข้อมูลสนาม (SaaS Structure)
                </button>
            </div>

            <div v-if="courtName" class="court-info">
                <h2>{{ courtName }}</h2>
                <div class="badge-container">
                    <span class="badge" v-if="courts">{{ courts.length }} คอร์ท</span>
                    <span class="badge" v-if="bookingAdvanceDays">จองล่วงหน้าได้ {{ bookingAdvanceDays }} วัน</span>
                </div>
            </div>

            <RouterView />
        </main>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import { useLiffStore } from './stores/liff'
import { useConfigStore } from './stores/config'

export default {
    data() {
        return {
            showAdmin: false
        }
    },
    computed: {
        ...mapState(useLiffStore, ['profile', 'isLoggedIn']),
        ...mapState(useConfigStore, ['courtName', 'courts', 'bookingAdvanceDays', 'isLoading'])
    },
    methods: {
        ...mapActions(useLiffStore, ['initLiff', 'login', 'logout']),
        ...mapActions(useConfigStore, ['fetchConfig', 'seedInitialData']),
        async handleSeedData() {
            const tenantId = 'court_001'
            await this.seedInitialData(tenantId)
            this.showAdmin = false
        }
    },
    async mounted() {
        const liffId = import.meta.env.VITE_LIFF_ID
        if (liffId) {
            await this.initLiff(liffId)
        }

        const tenantId = 'court_001' 
        await this.fetchConfig(tenantId)
    }
}
</script>

<style scoped>
#app {
    font-family: 'Inter', sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background-color: #fcfcfc;
    min-height: 100vh;
}

.app-header {
    background-color: #fff;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    position: sticky;
    top: 0;
    z-index: 100;
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

.user-name {
    font-weight: 600;
    flex-grow: 1;
    font-size: 0.95rem;
}

.btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    transition: opacity 0.2s;
}

.btn:active {
    opacity: 0.7;
}

.login-btn {
    background-color: #00b900;
    color: white;
    width: 100%;
    padding: 16px;
    font-size: 1.1rem;
}

.logout-btn {
    background-color: #f5f5f5;
    color: #666;
}

.setup-container {
    padding: 24px;
    text-align: center;
    border: 2px dashed #00b900;
    margin: 20px;
    border-radius: 16px;
    background-color: #f6ffed;
}

.setup-btn {
    background-color: #00b900;
    color: white;
    margin-top: 12px;
}

.court-info {
    padding: 20px 20px 10px 20px;
}

.court-info h2 {
    margin: 0;
    font-size: 1.4rem;
    color: #333;
}

.badge-container {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}

.badge {
    background: #e6f7ff;
    color: #1890ff;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
}

.content {
    padding: 0;
}

.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80vh;
    padding: 20px;
}
</style>

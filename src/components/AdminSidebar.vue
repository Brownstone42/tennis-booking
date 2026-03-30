<template>
    <aside class="sidebar">
        <div class="sidebar-logo">
            <img src="/favicon.ico" alt="Logo" />
            <span>Tennis Admin</span>
        </div>
        <nav class="sidebar-nav">
            <router-link :to="{ name: 'admin-dashboard' }" active-class="active"
                >📊 แดชบอร์ด</router-link
            >
            <router-link :to="{ name: 'admin-schedule' }" active-class="active"
                >📅 จัดการตารางเวลา</router-link
            >
            <router-link :to="{ name: 'admin-settings' }" active-class="active"
                >⚙️ ตั้งค่าสนาม</router-link
            >
        </nav>
        <div class="sidebar-footer">
            <button @click="logout">Log Out</button>
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

<style scoped>
.sidebar {
    width: 260px;
    background: #001529;
    color: white;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
}

.sidebar-logo {
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.2rem;
    font-weight: bold;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-logo img {
    width: 32px;
}

.sidebar-nav {
    flex-grow: 1;
    padding: 20px 0;
}

.sidebar-nav a {
    display: block;
    padding: 14px 24px;
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    transition: all 0.2s;
}

.sidebar-nav a:hover,
.sidebar-nav a.active {
    background: #1890ff;
    color: white;
}

.sidebar-footer {
    padding: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-footer button {
    width: 100%;
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 600;
}

.sidebar-footer button:hover {
    background: rgba(255, 255, 255, 0.2);
}
</style>

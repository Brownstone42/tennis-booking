<template>
    <div class="admin-login-container">
        <div class="login-card animate-fade">
            <div class="logo-section">
                <img src="/favicon.ico" alt="Logo" class="admin-logo" />
                <h1>Tennis Admin</h1>
                <p>ระบบจัดการสนามเทนนิสหลังบ้าน</p>
            </div>

            <div class="action-section">
                <button 
                    class="google-btn" 
                    :disabled="isLoading"
                    @click="handleGoogleLogin"
                >
                    <img src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google" />
                    <span>{{ isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google' }}</span>
                </button>
                <p v-if="error" class="error-msg">{{ error }}</p>
            </div>

            <footer class="login-footer">
                <p>&copy; 2024 Tennis SaaS Solution</p>
                <router-link to="/">กลับไปหน้าจองสนาม (User)</router-link>
            </footer>
        </div>
    </div>
</template>

<script>
import { auth, googleProvider } from '../../firebase'
import { signInWithPopup } from 'firebase/auth'

export default {
    data() {
        return {
            isLoading: false,
            error: ''
        }
    },
    methods: {
        async handleGoogleLogin() {
            this.isLoading = true
            this.error = ''
            try {
                const result = await signInWithPopup(auth, googleProvider)
                const user = result.user
                
                // ในอนาคตเราสามารถเพิ่มการเช็คสิทธิ์ตรงนี้ได้
                console.log('Admin logged in:', user.email)
                
                this.$router.push({ name: 'admin-dashboard' })
            } catch (err) {
                console.error('Login Error:', err)
                this.error = 'ไม่สามารถเข้าสู่ระบบได้: ' + err.message
            } finally {
                this.isLoading = false
            }
        }
    }
}
</script>

<style scoped>
.admin-login-container {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #1e1e1e 0%, #333333 100%);
    padding: 20px;
}

.login-card {
    background: white;
    padding: 40px;
    border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    width: 100%;
    max-width: 400px;
    text-align: center;
}

.logo-section {
    margin-bottom: 40px;
}

.admin-logo {
    width: 60px;
    margin-bottom: 16px;
}

.logo-section h1 {
    font-size: 1.8rem;
    color: #1a1a1a;
    margin: 0;
    font-weight: 800;
}

.logo-section p {
    color: #666;
    margin-top: 8px;
    font-size: 0.9rem;
}

.google-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 14px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.google-btn:hover {
    background: #f8f8f8;
    border-color: #ccc;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.google-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.google-btn img {
    width: 20px;
}

.error-msg {
    color: #ff4d4f;
    margin-top: 16px;
    font-size: 0.85rem;
}

.login-footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

.login-footer p {
    font-size: 0.8rem;
    color: #999;
}

.login-footer a {
    font-size: 0.85rem;
    color: #1890ff;
    text-decoration: none;
}

.animate-fade {
    animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>

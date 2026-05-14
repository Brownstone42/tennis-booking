<template>
    <div class="h-screen flex justify-center items-center bg-gradient-to-br from-[#1e1e1e] to-[#333333] p-5">
        <div class="animate-fade bg-white p-10 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] w-full max-w-sm text-center">
            <div class="mb-10">
                <img src="/favicon.ico" alt="Logo" class="w-15 mx-auto mb-4" />
                <h1 class="text-3xl font-extrabold text-gray-900 m-0">Tennis Admin</h1>
                <p class="text-gray-500 mt-2 text-sm">ระบบจัดการสนามเทนนิสหลังบ้าน</p>
            </div>

            <div>
                <button
                    class="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="isLoading"
                    @click="handleGoogleLogin"
                >
                    <img
                        src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
                        alt="Google"
                        class="w-5"
                    />
                    <span>{{ isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google' }}</span>
                </button>
                <p v-if="error" class="text-red-500 mt-4 text-sm">{{ error }}</p>
            </div>

            <footer class="mt-10 pt-5 border-t border-gray-100">
                <p class="text-xs text-gray-400">&copy; 2024 Tennis SaaS Solution</p>
                <router-link to="/" class="text-sm text-ant-blue no-underline">
                    กลับไปหน้าจองสนาม (User)
                </router-link>
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

import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import HomeView from '../views/HomeView.vue'
import CheckoutView from '../views/CheckoutView.vue'
import PaymentView from '../views/PaymentView.vue'
import SuccessView from '../views/SuccessView.vue'
import FailView from '../views/FailView.vue'

// Admin Views
import AdminLogin from '../views/admin/AdminLogin.vue'
import AdminDashboard from '../views/admin/AdminDashboard.vue'
import AdminSettings from '../views/admin/AdminSettings.vue'
import AdminSchedule from '../views/admin/AdminSchedule.vue'

// Waits for Firebase Auth to resolve before deciding — avoids false redirects on page load.
const requireAdminAuth = () =>
    new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe()
            resolve(user ? true : { name: 'admin-login' })
        })
    })

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', name: 'home', component: HomeView },
        { path: '/checkout', name: 'checkout', component: CheckoutView },
        { path: '/payment', name: 'payment', component: PaymentView },
        { path: '/success', name: 'success', component: SuccessView },
        { path: '/fail', name: 'fail', component: FailView },

        // Admin Routes
        { path: '/admin/login', name: 'admin-login', component: AdminLogin },
        { path: '/admin/dashboard', name: 'admin-dashboard', component: AdminDashboard, beforeEnter: requireAdminAuth },
        { path: '/admin/settings', name: 'admin-settings', component: AdminSettings, beforeEnter: requireAdminAuth },
        { path: '/admin/schedule', name: 'admin-schedule', component: AdminSchedule, beforeEnter: requireAdminAuth }
    ],
    scrollBehavior(to, from, savedPosition) {
        return { top: 0 }
    }
})

export default router

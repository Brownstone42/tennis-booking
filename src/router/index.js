import { createRouter, createWebHistory } from 'vue-router'
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
        { path: '/admin/dashboard', name: 'admin-dashboard', component: AdminDashboard },
        { path: '/admin/settings', name: 'admin-settings', component: AdminSettings },
        { path: '/admin/schedule', name: 'admin-schedule', component: AdminSchedule }
    ],
    scrollBehavior(to, from, savedPosition) {
        return { top: 0 }
    }
})

export default router

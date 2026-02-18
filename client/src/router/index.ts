import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: LoginView }, // Default page is Login
        { path: '/dashboard', component: DashboardView, meta: { requiresAuth: true } }
    ]
});

// Navigation Guard (Protect the dashboard)
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token');

    if (to.meta.requiresAuth && !token) {
        next('/'); // Redirect to login if no token
    } else {
        next();
    }
});

export default router;
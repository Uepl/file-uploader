import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { 
            path: '/', 
            component: LoginView,
            meta: { 
                title: 'Login | Secure File Uploader',
                description: 'Sign in to access your secure file dashboard and manage your uploads.'
            }
        },
        { 
            path: '/dashboard', 
            component: DashboardView, 
            meta: { 
                requiresAuth: true,
                title: 'Dashboard | Secure File Uploader',
                description: 'Manage your uploaded files securely. View, delete, and share your data easily.'
            } 
        }
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

// SEO Metadata Guard (Update title and description after navigation)
router.afterEach((to) => {
    // Update Document Title
    const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title);
    document.title = (nearestWithTitle?.meta?.title as string) || 'Secure File Uploader | Fast & Easy Transfers';

    // Update Meta Description
    const nearestWithDescription = to.matched.slice().reverse().find(r => r.meta && r.meta.description);
    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) {
        descriptionTag.setAttribute('content', (nearestWithDescription?.meta?.description as string) || 'Upload and share your files securely with our fast and easy-to-use file uploader.');
    }
});

export default router;
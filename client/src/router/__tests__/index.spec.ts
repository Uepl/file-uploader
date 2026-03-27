import { describe, it, expect, beforeEach, vi } from 'vitest';
import router from '../index';

// Mock the views to avoid loading them
vi.mock('../../views/LoginView.vue', () => ({ default: { name: 'LoginView', template: '<div>Login</div>' } }));
vi.mock('../../views/DashboardView.vue', () => ({ default: { name: 'DashboardView', template: '<div>Dashboard</div>' } }));

describe('Router', () => {
    beforeEach(async () => {
        localStorage.clear();
        vi.clearAllMocks();
        // Reset router state before each test
        await router.push('/');
    });

    it('should have initial route as /', async () => {
        expect(router.currentRoute.value.path).toBe('/');
    });

    it('should redirect to / if navigating to /dashboard without a token', async () => {
        await router.push('/dashboard');
        expect(router.currentRoute.value.path).toBe('/');
    });

    it('should allow access to /dashboard if a token is present', async () => {
        localStorage.setItem('token', 'fake-token');
        await router.push('/dashboard');
        expect(router.currentRoute.value.path).toBe('/dashboard');
    });
});

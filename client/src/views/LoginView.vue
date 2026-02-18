<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Loader2 } from 'lucide-vue-next';

const email = ref('');
const password = ref('');
const router = useRouter();
const errorMsg = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
    errorMsg.value = '';
    isLoading.value = true;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.value, password: password.value })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            router.push('/dashboard');
        } else {
            errorMsg.value = data.error || 'Login failed';
        }
    } catch (err) {
        errorMsg.value = 'Network error. Please try again.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
        <div class="w-87.5 rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm">

            <div class="flex flex-col space-y-1.5 p-6">
                <h3 class="text-2xl font-semibold leading-none tracking-tight">Login</h3>
                <p class="text-sm text-gray-500">Enter your credentials to access your files.</p>
            </div>

            <div class="p-6 pt-0">
                <form @submit.prevent="handleLogin">
                    <div class="grid w-full items-center gap-4">

                        <div class="flex flex-col space-y-1.5">
                            <label for="email"
                                class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Email
                            </label>
                            <input id="email" v-model="email" type="email" placeholder="name@example.com" required
                                class="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50" />
                        </div>

                        <div class="flex flex-col space-y-1.5">
                            <label for="password"
                                class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Password
                            </label>
                            <input id="password" v-model="password" type="password" placeholder="••••••••" required
                                class="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50" />
                        </div>

                        <div v-if="errorMsg"
                            class="relative w-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 [&>svg]:text-red-600">
                            <h5 class="mb-1 font-medium leading-none tracking-tight">Error</h5>
                            <div class="text-sm opacity-90">{{ errorMsg }}</div>
                        </div>

                    </div>
                </form>
            </div>

            <div class="flex items-center p-6 pt-0">
                <button @click="handleLogin" :disabled="isLoading"
                    class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-gray-50 hover:bg-gray-900/90 h-10 px-4 py-2 w-full">
                    <Loader2 v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
                    {{ isLoading ? 'Logging in...' : 'Login' }}
                </button>
            </div>
        </div>
    </div>
</template>
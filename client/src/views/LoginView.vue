<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const router = useRouter();
const errorMsg = ref('');

const handleLogin = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.value, password: password.value })
        });

        const data = await res.json();

        if (res.ok) {
            // Save the token to localStorage
            localStorage.setItem('token', data.token);
            // Redirect to the dashboard
            router.push('/dashboard');
        } else {
            errorMsg.value = data.error || 'Login failed';
        }
    } catch (err) {
        errorMsg.value = 'Network error';
    }
};
</script>

<template>
    <div class="login-container">
        <h2>Login</h2>
        <input v-model="email" type="email" placeholder="Email" />
        <input v-model="password" type="password" placeholder="Password" />
        <button @click="handleLogin">Login</button>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    flex-direction: column;
    max-width: 300px;
    margin: 100px auto;
    gap: 10px;
}

.error {
    color: red;
}
</style>
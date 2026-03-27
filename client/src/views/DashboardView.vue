<script setup lang="ts">
import { ref } from 'vue';
import FileUploader from '../components/FileUploader.vue';
import FileManager from '../components/FileManager.vue';

const activeTab = ref<'upload' | 'files'>('upload');
</script>

<template>
    <div class="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
        <!-- Header -->
        <header class="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div class="max-w-6xl mx-auto px-6 py-4">
                <h1 class="text-2xl font-bold text-gray-900">Secure File Vault</h1>
                <p class="text-gray-600 text-sm">End-to-End Encrypted Storage</p>
            </div>
        </header>

        <!-- Tab Navigation -->
        <nav class="bg-white border-b border-gray-200">
            <div class="max-w-6xl mx-auto px-6">
                <div class="flex gap-8">
                    <button @click="activeTab = 'upload'" :class="[
                        'py-4 px-1 border-b-2 font-medium transition-colors',
                        activeTab === 'upload'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                    ]">
                        Upload File
                    </button>
                    <button @click="activeTab = 'files'" :class="[
                        'py-4 px-1 border-b-2 font-medium transition-colors',
                        activeTab === 'files'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                    ]">
                        My Files
                    </button>
                </div>
            </div>
        </nav>

        <!-- Content -->
        <main class="py-8">
            <FileUploader v-if="activeTab === 'upload'" />
            <FileManager v-if="activeTab === 'files'" />
        </main>
    </div>

</template>

<style scoped>
/* Add any additional styles here */
</style>
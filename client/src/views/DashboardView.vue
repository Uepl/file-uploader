<script setup lang="ts">
import FileUploader from '../components/FileUploader.vue'; // Adjust path if needed
</script>

<template>
    <div class="container">
        <h1>Secure Hybrid File Uploader</h1>
        <p>Client-side Encryption / Server-side Storage</p>
        <FileUploader />
    </div>
</template>

<style scoped>
/* Your existing styles */
.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
}
</style>
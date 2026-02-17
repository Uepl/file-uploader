<script setup lang="ts">
import FileUploader from './components/FileUploader.vue';
</script>

<template>
  <div class="container">
    <h1>Secure Hybrid File Uploader</h1>
    <p>Client-side Encryption / Server-side Storage</p>
    
    <FileUploader />
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
</style>

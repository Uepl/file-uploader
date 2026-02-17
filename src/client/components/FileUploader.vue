<script setup lang="ts">
import { ref } from 'vue';
import { KeyUtils } from '../utils/KeyUtils';
import { CryptoService } from '../services/CryptoService';

const file = ref<File | null>(null);
const isEncrypting = ref(false);
const statusMessage = ref('');
const uploadProgress = ref(0);

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    file.value = target.files[0];
    statusMessage.value = `Selected: ${file.value.name}`;
    uploadProgress.value = 0;
  }
};

const uploadFile = async () => {
  if (!file.value) return;

  try {
    isEncrypting.value = true;
    statusMessage.value = 'Fetching Server Public Key...';

    // 1. Fetch Server IO Public Key
    const publicKeyRes = await fetch('/api/public-key');
    if (!publicKeyRes.ok) throw new Error('Failed to fetch public key');
    const { publicKey: publicKeyPem } = await publicKeyRes.json();
    
    // 2. Import Public Key
    const rsaPublicKey = await KeyUtils.importPublicKey(publicKeyPem);

    statusMessage.value = 'Generating AES Session Key...';
    // 3. Generate AES Key
    const aesKey = await CryptoService.generateAesKey();

    statusMessage.value = 'Encrypting File content...';
    // 4. Encrypt File
    const { ciphertext: encryptedFileBuffer, iv } = await CryptoService.encryptFileData(file.value, aesKey);

    statusMessage.value = 'Encrypting Session Key...';
    // 5. Encrypt (Wrap) AES Key
    const encryptedKeyBuffer = await CryptoService.wrapAesKeyWithRsa(aesKey, rsaPublicKey);

    // 6. Prepare Payload
    statusMessage.value = 'Uploading...';
    
    // Convert buffers to Base64 for JSON transport
    const encryptedFileBase64 = KeyUtils.arrayBufferToBase64(encryptedFileBuffer);
    const encryptedKeyBase64 = KeyUtils.arrayBufferToBase64(encryptedKeyBuffer);
    const ivBase64 = KeyUtils.arrayBufferToBase64(iv); // iv is Uint8Array, but arrayBufferBase64 handles it? wait.
    // Update KeyUtils to handle Uint8Array if needed, or just pass buffer.
    // Uint8Array.buffer property gives the ArrayBuffer.
    const ivBase64Fixed = KeyUtils.arrayBufferToBase64(iv.buffer);

    const payload = {
        originalName: file.value.name,
        encryptedFile: encryptedFileBase64,
        encryptedKey: encryptedKeyBase64,
        iv: ivBase64Fixed
    };

    // 7. Upload
    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error('Upload failed on server');
    }

    const result = await response.json();
    statusMessage.value = `Success! ${result.message}`;
    uploadProgress.value = 100;
    
    // Clear sensitive data (best effort in JS)
    file.value = null;

  } catch (error: any) {
    console.error(error);
    statusMessage.value = `Error: ${error.message}`;
  } finally {
    isEncrypting.value = false;
  }
};
</script>

<template>
  <div class="uploader">
    <h2>Secure File Upload</h2>
    
    <div class="drop-zone">
      <input type="file" @change="handleFileChange" :disabled="isEncrypting" />
      <p v-if="!file">Drag & drop or click to select a file</p>
      <p v-else>Selected: {{ file.name }}</p>
    </div>

    <button @click="uploadFile" :disabled="!file || isEncrypting">
      {{ isEncrypting ? 'Encrypting & Uploading...' : 'Upload Securely' }}
    </button>

    <div v-if="statusMessage" class="status">
        <p>{{ statusMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.uploader {
  border: 1px solid #333;
  padding: 2rem;
  border-radius: 8px;
  background: #2a2a2a;
  max-width: 500px;
  margin: 2rem auto;
}

.drop-zone {
  border: 2px dashed #666;
  padding: 2rem;
  margin-bottom: 1rem;
  text-align: center;
  position: relative;
}

.drop-zone input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.status {
    margin-top: 1rem;
    font-weight: bold;
    color: #4caf50;
}
</style>

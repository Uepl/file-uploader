<script setup lang="ts">
import { ref } from 'vue';
// FIX 1: Added RefreshCw to imports
import { UploadCloud, FileLock, Loader2, CheckCircle2, XCircle, ShieldCheck, RefreshCw } from 'lucide-vue-next';
import { KeyUtils } from '../utils/KeyUtils';
import { CryptoService } from '../services/CryptoService';
import { FileService } from '../services/FileService';

// --- State ---
const fileInput = ref<HTMLInputElement | null>(null);
const file = ref<File | null>(null);
const isDragging = ref(false);
const isProcessing = ref(false);
const status = ref<'idle' | 'processing' | 'success' | 'error'>('idle');
const statusMessage = ref('');

// --- Handlers ---
const triggerFileInput = () => {
  if (!isProcessing.value) {
    fileInput.value?.click();
  }
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files?.length) {
    processFile(target.files[0]);
  }
  // FIX 2: Reset value so selecting the same file again works
  target.value = '';
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  // FIX 3: Prevent dropping a new file while uploading
  if (isProcessing.value) return;

  if (event.dataTransfer?.files?.length) {
    processFile(event.dataTransfer.files[0]);
  }
};

const processFile = (selectedFile: File) => {
  file.value = selectedFile;
  status.value = 'idle';
  statusMessage.value = '';
};

const clearFile = () => {
  file.value = null;
  status.value = 'idle';
  statusMessage.value = '';
};

const uploadFile = async () => {
  if (!file.value) return;
  const token = localStorage.getItem('token');
  if (!token) {
    status.value = 'error';
    statusMessage.value = 'You must be logged in to upload.';
    return;
  }
  try {
    isProcessing.value = true;
    status.value = 'processing';
    statusMessage.value = 'Encrypting file chunks...';

    // 1. Fetch Server IO Public Key
    const publicKeyPem = await FileService.getPublicKey();

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
    const formData = new FormData();
    formData.append('originalName', file.value.name);
    formData.append('encryptedFile', new Blob([encryptedFileBuffer]), 'file.enc');
    formData.append('encryptedKey', new Blob([encryptedKeyBuffer]), 'key.enc');
    formData.append('iv', new Blob([iv.buffer as ArrayBuffer]), 'iv.dat');

    // 7. Upload
    const result = await FileService.uploadFile(formData);

    statusMessage.value = `Success! ${result.message}`;
    status.value = 'success';

    // Optional: Clear file after success logic here

  } catch (error: any) {
    console.error(error);
    status.value = 'error';
    statusMessage.value = error.message || 'Encryption failed';
  } finally {
    isProcessing.value = false;
  }
};
</script>
<template>
  <div class="flex items-center justify-center min-h-150 p-6 bg-gray-50/50">

    <div class="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">

      <div class="px-6 py-8 text-center bg-gray-900 text-white">
        <div
          class="mx-auto bg-gray-800 w-12 h-12 rounded-full flex items-center justify-center mb-4 ring-4 ring-gray-800/50">
          <ShieldCheck class="w-6 h-6 text-green-400" />
        </div>
        <h2 class="text-xl font-bold">Secure Vault Upload</h2>
        <p class="text-gray-400 text-sm mt-1">End-to-End Encrypted File Transfer</p>
      </div>

      <div class="p-6 space-y-6">

        <input ref="fileInput" type="file" class="hidden" @change="handleFileSelect" :disabled="isProcessing" />

        <div v-if="!file && status !== 'success'" class="relative group cursor-pointer"
          @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop"
          @click="triggerFileInput">
          <div class="border-2 border-dashed rounded-xl p-10 transition-all duration-200 text-center space-y-3"
            :class="isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'">
            <div
              class="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <UploadCloud class="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <p class="font-medium text-gray-700">Click to upload or drag and drop</p>
              <p class="text-xs text-gray-500 mt-1">Supports any file type (Max 50MB)</p>
            </div>
          </div>
        </div>

        <div v-if="file" class="bg-gray-50 rounded-lg p-4 border border-gray-100 relative group"
          @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
          <div v-if="isDragging && !isProcessing"
            class="absolute inset-0 bg-blue-50/90 border-2 border-blue-500 border-dashed rounded-lg z-10 flex items-center justify-center">
            <p class="text-blue-600 font-medium">Drop to Replace</p>
          </div>

          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-3 overflow-hidden">
              <div class="p-2 bg-white rounded-md border border-gray-200 shadow-sm shrink-0">
                <FileLock class="w-6 h-6 text-blue-600" />
              </div>
              <div class="min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ file.name }}</p>
                <p class="text-xs text-gray-500">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
              </div>
            </div>

            <div class="flex items-center space-x-1 shrink-0" v-if="!isProcessing && status !== 'success'">
              <button @click="triggerFileInput"
                class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Change File">
                <RefreshCw class="w-4 h-4" />
              </button>
              <button @click="clearFile"
                class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Remove File">
                <XCircle class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div v-if="isProcessing || status === 'success' || status === 'error'" class="mt-4 space-y-2">
            <div class="flex justify-between text-xs font-medium">
              <span
                :class="{ 'text-blue-600': status === 'processing', 'text-green-600': status === 'success', 'text-red-600': status === 'error' }">
                {{ statusMessage }}
              </span>
            </div>
            <div class="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full transition-all duration-500 ease-out"
                :class="{ 'bg-blue-600 w-1/2 animate-pulse': status === 'processing', 'bg-green-500 w-full': status === 'success', 'bg-red-500 w-full': status === 'error' }">
              </div>
            </div>
          </div>
        </div>

        <button v-if="file && status !== 'success'" @click="uploadFile" :disabled="isProcessing"
          class="w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          :class="isProcessing ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-900/10'">
          <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
          <span v-else>Encrypt & Upload</span>
        </button>

        <button v-if="status === 'success'" @click="clearFile"
          class="w-full py-2.5 px-4 rounded-lg font-medium text-sm bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 flex items-center justify-center space-x-2 transition-colors">
          <CheckCircle2 class="w-4 h-4" />
          <span>Upload Another File</span>
        </button>

      </div>

      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
        <p class="text-xs text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck class="w-3 h-3" /> Client-side AES-GCM Encryption
        </p>
      </div>

    </div>
  </div>
</template>
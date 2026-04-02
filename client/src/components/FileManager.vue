<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Download, Trash2, Edit2, Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-vue-next';
import { FileService, type FileMetadata } from '../services/FileService.js';

// --- State ---
const files = ref<FileMetadata[]>([]);
const isLoading = ref(true);
const error = ref('');
const successMessage = ref('');
const selectedFileId = ref<string | null>(null);
const editingFileId = ref<string | null>(null);
const editingFileName = ref('');
const isDeleting = ref<string | null>(null);
const isDownloading = ref<string | null>(null);

// --- Lifecycle ---
onMounted(async () => {
    await loadFiles();
});

// --- Methods ---
const loadFiles = async () => {
    try {
        isLoading.value = true;
        error.value = '';
        files.value = await FileService.getFiles();
    } catch (err) {
        error.value = `Failed to load files: ${err instanceof Error ? err.message : String(err)}`;
        console.error(err);
    } finally {
        isLoading.value = false;
    }
};

const downloadFile = async (fileId: string, fileName: string) => {
    try {
        isDownloading.value = fileId;
        error.value = '';
        successMessage.value = '';

        const { blob, originalName } = await FileService.downloadAndDecryptFile(fileId);

        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        successMessage.value = `Downloaded ${originalName}`;
    } catch (err) {
        error.value = `Failed to download: ${err instanceof Error ? err.message : String(err)}`;
        console.error(err);
    } finally {
        isDownloading.value = null;
    }
};

const startRename = (fileId: string, currentName: string) => {
    editingFileId.value = fileId;
    editingFileName.value = currentName;
};

const cancelRename = () => {
    editingFileId.value = null;
    editingFileName.value = '';
};

const saveRename = async (fileId: string) => {
    if (!editingFileName.value.trim()) {
        error.value = 'File name cannot be empty';
        return;
    }

    try {
        error.value = '';
        successMessage.value = '';
        await FileService.renameFile(fileId, editingFileName.value);

        // Update local state
        const file = files.value.find(f => f.id === fileId);
        if (file) {
            file.originalName = editingFileName.value;
        }

        successMessage.value = `Renamed to ${editingFileName.value}`;
        editingFileId.value = null;
        editingFileName.value = '';
    } catch (err) {
        error.value = `Failed to rename: ${err instanceof Error ? err.message : String(err)}`;
        console.error(err);
    }
};

const deleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        isDeleting.value = fileId;
        error.value = '';
        successMessage.value = '';

        await FileService.deleteFile(fileId);
        files.value = files.value.filter(f => f.id !== fileId);

        successMessage.value = `Deleted ${fileName}`;
    } catch (err) {
        error.value = `Failed to delete: ${err instanceof Error ? err.message : String(err)}`;
        console.error(err);
    } finally {
        isDeleting.value = null;
    }
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
</script>

<template>
    <div class="w-full max-w-5xl mx-auto p-6">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">File Manager</h1>
            <p class="text-gray-600">Manage your encrypted files</p>
        </div>

        <!-- Messages -->
        <div v-if="error" class="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p class="text-red-800">{{ error }}</p>
        </div>

        <div v-if="successMessage"
            class="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
            <CheckCircle2 class="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <p class="text-green-800">{{ successMessage }}</p>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-12">
            <div class="text-center">
                <Loader2 class="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p class="text-gray-600">Loading your files...</p>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="files.length === 0" class="py-12 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Lock class="w-8 h-8 text-gray-400" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-1">No files yet</h3>
            <p class="text-gray-600">Upload your first encrypted file to get started</p>
        </div>

        <!-- Files Table -->
        <div v-else class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">File Name</th>
                            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Size</th>
                            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Uploaded</th>
                            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr v-for="file in files" :key="file.id" class="hover:bg-gray-50 transition-colors">
                            <!-- File Name Column -->
                            <td class="px-6 py-4">
                                <div v-if="editingFileId === file.id" class="flex items-center gap-2">
                                    <input v-model="editingFileName" type="text"
                                        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        @keyup.enter="saveRename(file.id)" @keyup.escape="cancelRename" autofocus />
                                    <button @click="saveRename(file.id)"
                                        class="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                                        Save
                                    </button>
                                    <button @click="cancelRename"
                                        class="px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400">
                                        Cancel
                                    </button>
                                </div>
                                <div v-else class="font-medium text-gray-900">{{ file.originalName }}</div>
                            </td>

                            <!-- Size Column -->
                            <td class="px-6 py-4 text-sm text-gray-600">{{ formatFileSize(file.size) }}</td>

                            <!-- Upload Date Column -->
                            <td class="px-6 py-4 text-sm text-gray-600">{{ formatDate(file.uploadDate) }}</td>

                            <!-- Actions Column -->
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2">
                                    <!-- Download Button -->
                                    <button @click="downloadFile(file.id, file.originalName)"
                                        :disabled="isDownloading === file.id"
                                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors">
                                        <Download v-if="isDownloading !== file.id" class="w-4 h-4" />
                                        <Loader2 v-else class="w-4 h-4 animate-spin" />
                                        {{ isDownloading === file.id ? 'Downloading...' : 'Download' }}
                                    </button>

                                    <!-- Rename Button -->
                                    <button @click="startRename(file.id, file.originalName)"
                                        :disabled="editingFileId !== null || isDeleting !== null"
                                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:bg-gray-200 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors">
                                        <Edit2 class="w-4 h-4" />
                                        Rename
                                    </button>

                                    <!-- Delete Button -->
                                    <button @click="deleteFile(file.id, file.originalName)"
                                        :disabled="isDeleting === file.id || editingFileId !== null"
                                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors">
                                        <Trash2 v-if="isDeleting !== file.id" class="w-4 h-4" />
                                        <Loader2 v-else class="w-4 h-4 animate-spin" />
                                        {{ isDeleting === file.id ? 'Deleting...' : 'Delete' }}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- File Count Footer -->
        <div v-if="!isLoading && files.length > 0" class="mt-4 pt-4 border-t border-gray-200">
            <p class="text-sm text-gray-600">
                {{ files.length }} {{ files.length === 1 ? 'file' : 'files' }} total
            </p>
        </div>
    </div>
</template>

<style scoped>
/* Ensure FileLock icon is imported for empty state */
</style>

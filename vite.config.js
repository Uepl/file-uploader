import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
export default defineConfig({
    plugins: [vue()],
    root: 'src/client', // Serve from src/client
    build: {
        outDir: '../../dist', // Build to dist folder in root
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/client'),
        },
    },
});

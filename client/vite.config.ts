import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    root: './', // Tells Vite the index.html is right here in the client folder
    build: {
        outDir: '../dist/client', // Keeps your build files organized
        emptyOutDir: true,
    },
    server: {
        port: 3000,
        // proxy: {
        //   // This helps avoid CORS issues during development
        //   '/api': {
        //     target: 'http://localhost:5000',
        //     changeOrigin: true,
        //   },
        // },
    },
});
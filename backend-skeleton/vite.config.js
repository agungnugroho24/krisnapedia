import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        port: 8080,
        strictPort: true,
        allowedHosts: ['.ngrok-free.dev'],
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
            },
            '/storage': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
            },
        },
        hmr: {
            protocol: 'wss',
            host: 'modular-nickname-disburse.ngrok-free.dev',
            clientPort: 443,
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});

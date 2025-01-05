import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
    // ssr: {
    //     noExternal: ['fs'], // Mark fs as external for SSR
    //   },
      optimizeDeps: {
        exclude: ['nodemailer', "mexc-api-sdk"], // Prevent pre-bundling fs
      },
});

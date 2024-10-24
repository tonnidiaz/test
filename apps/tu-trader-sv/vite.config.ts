import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
export default defineConfig({ 
	plugins: [sveltekit()],
    define: {
        __dirname: JSON.stringify(dirname(fileURLToPath(import.meta.url))),
      },
});

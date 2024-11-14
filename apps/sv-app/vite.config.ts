import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
export default defineConfig({ 
	plugins: [sveltekit()],
    build: {
        commonjsOptions: {
            include: [/@repo\/common/, /node_modules/],
          },
    },
    define: {
        __dirname: JSON.stringify(dirname(fileURLToPath(import.meta.url))),
      },
      css: {
        preprocessorOptions: {
          scss: {
            silenceDeprecations: ["legacy-js-api"],
          },
        },
      },

      optimizeDeps: {
        exclude: ["binance-api-node","node-schedule", "svelte-codemirror-editor", "codemirror", "@codemirror/language-javascript", "@codemirror/lang-vue",  /* ... */],
    }
});

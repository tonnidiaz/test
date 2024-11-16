import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
process.stdout.write("\x1Bc");
export default defineConfig({ 
	plugins: [sveltekit()],
    // worker: {
	// 	plugins: [sveltekit()],
	// 	format: 'es',
	// },
    build: {
        commonjsOptions: {
            include: [/@repo\/common/, /node_modules/],
          },
    },
    define: {
        // process: {...import.meta, env: import.meta.env},
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
        exclude: ["svelte-codemirror-editor", "codemirror", "@codemirror/language-javascript", "@codemirror/lang-vue",  /* ... */],
        include: ['../../packages/common']
    }
});

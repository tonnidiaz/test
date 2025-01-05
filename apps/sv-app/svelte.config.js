import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */

const pkgsRoot1 = "../../packages"
const pkgsRoot = "../" + pkgsRoot1;

const config = {
    // Consult https://svelte.dev/docs/kit/integrations#preprocessors
    // for more information about preprocessors
    preprocess: vitePreprocess(),

    kit: {
        // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
        // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
        // See https://svelte.dev/docs/kit/adapters for more information about adapters.
        adapter: adapter(),
        alias: {
            // "@cmn/*": pkgsRoot1 + "/common/src/*",
            "@ts/*": pkgsRoot1 + "/tsmodule/src/*",
            "@/*": "src/*",
        },
        typescript: {
            config: (c) => {
                return {
                    ...c,
                    exclude: [
                        ...c.exclude,
                        // pkgsRoot + "/common/node_modules",
                        "../../../node_modules",
                        "../../../**/*.js",
                        "../../../*.d.ts",
                    ],
                    include: [
                        ...c.include,
                        // pkgsRoot + "/common/**/*.ts",
                        pkgsRoot + "/tsmodule/**/*.ts",
                        "../../../node_modules/svelte/elements.d.ts",
                    ],
                };
            },
        },
    },
    ssr: {
        noExternal: ["mongodb", "@mapbox/node-pre-gyp", "engine.io-client"],
    },
};

export default config;

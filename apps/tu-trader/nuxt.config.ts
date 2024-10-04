// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: [
        "@pinia/nuxt",
        "postcss-import",
        /*"nuxt-simple-sitemap"*/
    ],
    imports: {autoImport: true},

    //css: ['~/assets/css/tailwind.css'],

    postcss: {
        plugins: {
            tailwindcss: {},
            autoprefixer: {},
        },
    },

    devtools: { enabled: false },

    //   site: {
    //       url: "https://tunedbass.vercel.app",
    //   },

    compatibilityDate: "2024-08-03",
   
});
 
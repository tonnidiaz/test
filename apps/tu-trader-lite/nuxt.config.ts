// https://nuxt.com/docs/api/configuration/nuxt-config
const alias = {
    "@cmn": "../../packages/common/src"
  }
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  alias,
  typescript:{
    tsConfig: {
        compilerOptions: {
            paths: {
                "@cmn/*": ["../../../packages/common/src/*"],
            }
        },
        include: ["../../../packages/common/src/**/*.ts"]
    },
    
  },
  nitro:{alias},
  vite:{
    server:{
        fs:{
            cachedChecks: false
        }, 
        
    },
    
  }
  
})

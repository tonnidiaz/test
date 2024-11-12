import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
    // darkMode: true,
  theme: {
    extend: {}
  },

  daisyui: {
    themes: [
        {
            tb: {
                ...require("daisyui/src/theming/themes")["[data-theme=tb]"],
                primary: "rgb(74, 222, 128)",//"#ffa500",
                secondary: "#f6d860",
                accent: "#ecb847",
                neutral: "#181818",
                '.bg-2':{
                    'background-color': '#202020'
                },
                dark: '#292828',
                "base-100": "#111111",
                
            },
        },
        "dark",
        "bumblebee",
        "halloween",
        "forest",
        "black",
        "business",
        "night",
        "dracula",
    ],
},
plugins: [require("daisyui")],
} as Config;

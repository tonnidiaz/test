import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    'node_modules/daisyui/dist/**/*.js',
    'node_modules/react-daisyui/dist/**/*.js',
    ],
    theme: {
        extend: {},
       
    },

    darkMode: 'class',
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
};
export default config;

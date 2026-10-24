import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          950: "#070c1a",
          900: "#0b1329",
          850: "#0f172a",
          800: "#131f37",
          700: "#1e293b",
          600: "#334155",
        },
      },
    },
  },
  plugins: [],
};
export default config;

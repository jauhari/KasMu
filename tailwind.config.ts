import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Ramp netral hangat — diselaraskan dengan aksen amber.
        // Mengganti slate bawaan Tailwind (biru-abu) agar tidak bertabrakan
        // dengan latar netral dan aksen amber.
        slate: {
          50: "#f8f8f9",
          100: "#efeff1",
          200: "#e3e3e7",
          300: "#cacad2",
          400: "#a2a2ad",
          500: "#8a8a96",
          600: "#6b6b78",
          700: "#3b3b45",
          800: "#27272f",
          900: "#18181d",
          950: "#0e0e12",
        },
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

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f4efe6",
        ink: "#1d2733",
        accent: "#b66031",
        moss: "#708d6d",
        fog: "#d8e0db"
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        body: ["Segoe UI", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 20px 60px rgba(29, 39, 51, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;

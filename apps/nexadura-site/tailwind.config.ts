import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050505",
        paper: "#f4efe3",
        muted: "#9b9386",
        line: "rgba(244, 239, 227, 0.12)",
        signal: "#d7ff3f",
        amber: "#b87333",
      },
      boxShadow: {
        panel: "0 18px 70px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
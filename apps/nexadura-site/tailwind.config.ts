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
        ink: "#10110f",
        paper: "#f6f3ed",
        muted: "#6d7069",
        line: "rgba(16, 17, 15, 0.12)",
        signal: "#3b7a57",
        amber: "#c48a3a",
      },
      boxShadow: {
        panel: "0 18px 70px rgba(16, 17, 15, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
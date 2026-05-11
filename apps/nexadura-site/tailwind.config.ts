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
        muted: "#a79c8b",
        line: "rgba(244, 239, 227, 0.14)",
        signal: "#b87333",
        amber: "#d24a2f",
        copper: "#b87333",
        ember: "#d24a2f",
      },
      boxShadow: {
        panel: "0 18px 70px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
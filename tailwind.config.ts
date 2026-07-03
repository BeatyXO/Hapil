import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        court: {
          950: "#2E1439",
          900: "#49225B",
          700: "#6E3482",
          400: "#A56ABD",
          200: "#E7DBEF",
          100: "#F5EBFA",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "cursive"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        chamber: "0 4px 30px rgba(73, 34, 91, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

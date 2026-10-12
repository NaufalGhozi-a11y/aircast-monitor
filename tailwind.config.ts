import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        base: {
          950: "#0A0E15",
          900: "#0E1420",
          850: "#111927",
          800: "#141B26",
          700: "#1B2432",
          600: "#232C3A",
          500: "#3A4556",
          400: "#5B6B80",
          300: "#7C8798",
          200: "#A9B2C0",
          100: "#D5DAE2",
          50: "#EEF1F5",
        },
        accent: {
          DEFAULT: "#4C8DFF",
          dim: "#2F5FBD",
          bright: "#7CAEFF",
        },
        status: {
          online: "#2FBF71",
          onlineDim: "#1B7A48",
          warning: "#E8A33D",
          warningDim: "#9A6A21",
          critical: "#E5484D",
          criticalDim: "#9C2D30",
          unknown: "#6B7686",
          unknownDim: "#454E5B",
        },
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};

export default config;

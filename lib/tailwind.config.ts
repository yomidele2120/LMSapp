import type { Config } from "tailwindcss";

// Design language: "Chambers" — grounded in the physical world of a Nigerian
// law firm's own case ledgers, filing dockets and brass fixtures, rather than
// generic fintech-dashboard styling. See app/globals.css for the full token
// rationale.
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#12211D",   // deep chambers green, near-black
          50: "#E9EEEC",
          100: "#C9D6D1",
          300: "#7C978C",
          500: "#3D554A",
          700: "#1E332B",
          900: "#0C1512",
        },
        parchment: {
          DEFAULT: "#EFECE2",   // cool-toned paper, not warm cream
          50: "#F8F6F0",
          100: "#EFECE2",
          200: "#E2DDCC",
          300: "#CFC7AC",
        },
        brass: {
          DEFAULT: "#A9813F",
          light: "#C9A664",
          dark: "#7C5E2C",
        },
        seal: {
          DEFAULT: "#7A2E23", // wax-seal red-brown — urgent/overdue states
          light: "#9C4232",
        },
        charcoal: "#22241F",
        slate: {
          line: "#D6D0BE",
        },
        status: {
          active: "#3D6B52",
          hold: "#A9813F",
          closed: "#6E6A5C",
          overdue: "#7A2E23",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(18, 33, 29, 0.06), 0 1px 0 rgba(18, 33, 29, 0.04)",
        raised: "0 4px 16px rgba(18, 33, 29, 0.12)",
      },
      backgroundImage: {
        "ledger-lines":
          "repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(18,33,29,0.05) 28px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

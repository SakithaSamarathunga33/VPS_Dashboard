import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: "var(--destructive)",
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        vps: {
          bg: "#080e1a",
          card: "#0f1729",
          border: "#1a2540",
          green: "#8ed8ad",
          red: "#ef4444",
          yellow: "#f59e0b",
          blue: "#4aa2ab",
          text: "#f0f4f8",
          muted: "#8899b0",
          sidebar: "#0b1220",
          cyan: "#4aa2ab",
          primary: "#1d5d82",
          mint: "#8ed8ad",
          amber: "#f59e0b",
          purple: "#8b5cf6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "vps-fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "vps-slide-block": {
          "0%": { opacity: "0", transform: "translateX(4px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "vps-log-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "vps-pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(142, 216, 173, 0.45)" },
          "50%": { boxShadow: "0 0 0 6px rgba(142, 216, 173, 0.15)" },
        },
      },
      animation: {
        "vps-fade-in": "vps-fade-in 0.45s ease forwards",
        "vps-slide-block": "vps-slide-block 0.3s ease forwards",
        "vps-log-fade": "vps-log-fade 0.35s ease forwards",
        "vps-pulse-glow": "vps-pulse-glow 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
export default config

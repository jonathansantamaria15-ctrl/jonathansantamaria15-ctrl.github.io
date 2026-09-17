import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral MASTER/BUSINESS chrome palette (not tenant-themed)
        chrome: {
          bg: "#0b0c0f",
          surface: "#14161b",
          border: "#23262e",
          muted: "#8b8f98",
          text: "#e7e9ee",
        },
        // Tenant-driven theme tokens (public + business accents), resolved at runtime via CSS vars
        tenant: {
          primary: "var(--tenant-primary)",
          secondary: "var(--tenant-secondary)",
          bg: "var(--tenant-bg)",
          surface: "var(--tenant-surface)",
          text: "var(--tenant-text)",
          accent: "var(--tenant-accent)",
        },
      },
      fontFamily: {
        "tenant-heading": "var(--tenant-font-heading)",
        "tenant-body": "var(--tenant-font-body)",
      },
      borderRadius: {
        tenant: "var(--tenant-radius)",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

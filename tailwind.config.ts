import type { Config } from "tailwindcss";

/**
 * A Tailwind color value that reads from a CSS variable (defined in
 * app/globals.css), so the whole palette flips in dark mode without a
 * `dark:` variant on every use. The variable holds an RGB triplet, e.g.
 * `--ink: 17 17 17`, and `<alpha-value>` lets opacity modifiers like
 * `bg-white/90` keep working.
 */
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        /** Marc Lou redesign palette: warm paper, near-black ink, grey secondary. */
        ink: rgb("ink"),
        paper: rgb("paper"),
        muted: rgb("muted"),
        line: rgb("line"),
        card: rgb("card"),
        pitch: rgb("pitch"),
        /** Surfaces flip too: white cards become dark cards, black buttons
            become white buttons (with white text flipping to dark). */
        white: rgb("surface"),
        black: rgb("inverse"),
      },
      fontFamily: {
        serif: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

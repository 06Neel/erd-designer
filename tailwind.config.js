/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        surface2: 'var(--color-surface2)',
        border: 'var(--color-border)',
        textPrimary: 'var(--color-text-primary)',
        textSecondary: 'var(--color-text-secondary)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        accentHover: 'var(--color-accent-hover)',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        pkColor: '#f59e0b',
        fkColor: '#60a5fa',
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", 'monospace'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Shared semantic neutral + status tokens (light set)
        surface: { DEFAULT: '#ffffff', soft: '#f8fafc', alt: '#f1f5f9', hover: '#f3f4f6' },
        ink:     { DEFAULT: '#0f172a', soft: '#334155', muted: '#475569' },
        muted:   { DEFAULT: '#64748b', soft: '#94a3b8', faint: '#cbd5e1' },
        line:    { DEFAULT: '#e2e8f0', strong: '#cbd5e1' },
        danger:  { DEFAULT: '#ef4444', strong: '#dc2626' },
        success: '#16a34a',
        warning: '#f59e0b',
      },
      fontSize: {
        '11': '11px',
        '13': '13px',
        '15': '15px',
      },
    },
  },
  plugins: [],
}

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
        // Global Background Color System
        bg: {
          primary: '#080B12',
          secondary: '#0D1220',
          elevated: '#111827',
        },
        // Glass Surfaces & Borders
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.045)',
          surface: 'rgba(255, 255, 255, 0.045)',
          elevated: 'rgba(255, 255, 255, 0.065)',
          hover: 'rgba(255, 255, 255, 0.09)',
          border: 'rgba(255, 255, 255, 0.10)',
          highlight: 'rgba(255, 255, 255, 0.16)',
        },
        // Accents
        accent: {
          purple: '#8B5CF6',
          blue: '#38BDF8',
          purpleLight: '#A78BFA',
          success: '#34D399',
          warning: '#FBBF24',
          error: '#FB7185',
          cyan: '#38BDF8',
          emerald: '#34D399',
          amber: '#FBBF24',
          rose: '#FB7185',
          violet: '#8B5CF6',
        },
        // Text System
        txt: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
          disabled: '#64748B',
        },
        dark: {
          950: '#080B12',
          900: '#0D1220',
          850: '#111827',
          800: '#151D30',
          750: '#1A233A',
          700: '#222F4C',
          600: '#334155',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-purple': '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'glow-blue': '0 0 25px -5px rgba(56, 189, 248, 0.3)',
        'glow-brand': '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'glow-cyan': '0 0 25px -5px rgba(56, 189, 248, 0.3)',
        'glow-emerald': '0 0 25px -5px rgba(52, 211, 153, 0.3)',
        'glass-panel': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-elevated': '0 12px 40px 0 rgba(0, 0, 0, 0.45)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '20px',
        'glass-heavy': '24px',
      },
    },
  },
  plugins: [],
}

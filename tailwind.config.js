/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', 'monospace']
      },
      colors: {
        zinc: {
          850: '#1f1f23',
          925: '#111114',
          950: '#09090b',
        },
        rust: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ea580c',
          600: '#c2410c',
          700: '#9a3412',
          800: '#7c2d12',
          900: '#431407',
          950: '#2b0c03'
        },
        copper: {
          400: '#e07a5f',
          500: '#d97742',
          600: '#b85d38',
          700: '#9c4826',
        }
      },
      boxShadow: {
        'apple-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
        'apple-card': '0 2px 8px -1px rgba(0,0,0,0.06), 0 1px 3px -1px rgba(0,0,0,0.04)',
        'apple-card-dark': '0 4px 20px -2px rgba(0,0,0,0.5)',
        'spray-rust': '0 2px 8px -1px rgba(234, 88, 12, 0.2), 0 1px 3px -1px rgba(0, 0, 0, 0.08)',
        'spray-rust-subtle': '0 1px 4px -1px rgba(234, 88, 12, 0.12)',
        'spray-copper': '0 2px 8px -1px rgba(224, 122, 95, 0.2)',
        'subtle-inner': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spray-float': 'sprayFloat 7s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        sprayFloat: {
          '0%': { transform: 'scale(1) translate(0px, 0px)', opacity: '0.14' },
          '50%': { transform: 'scale(1.12) translate(8px, -10px)', opacity: '0.24' },
          '100%': { transform: 'scale(0.95) translate(-6px, 6px)', opacity: '0.16' },
        }
      }
    },
  },
  plugins: [],
}

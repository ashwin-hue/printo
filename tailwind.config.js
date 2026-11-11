/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#EEF0F2',
        ink: '#0F1115',
        body: '#2A2E35',
        muted: '#8B9098',
        code: '#7A7F88',
        comment: '#B3B8BF',
        hot: {
          DEFAULT: '#FF5A1F',
          soft: '#FFE1D3',
          dark: '#D9430F',
          hover: '#E84E16',
        },
        brand: {
          50: '#FFF2EB',
          100: '#FFE1D3',
          200: '#FFC2A8',
          300: '#FF9E78',
          400: '#FF7D4A',
          500: '#FF5A1F',
          600: '#E84E16',
          700: '#D9430F',
          800: '#B03309',
          900: '#8A2606',
          950: '#4D1202',
        },
        surface: {
          bg: '#EEF0F2',
          card: '#FFFFFF',
          dark: '#0D1017',
          subtle: '#E2E5E9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'hot-glow': '0 0 20px rgba(255, 90, 31, 0.35)',
        'card': '0 10px 30px -10px rgba(15, 17, 21, 0.08), 0 4px 6px -2px rgba(15, 17, 21, 0.03)',
        'card-hover': '0 20px 40px -15px rgba(15, 17, 21, 0.14), 0 8px 12px -4px rgba(15, 17, 21, 0.04)',
        'card-dark': '0 20px 50px -10px rgba(0, 0, 0, 0.5)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        pulseSlow: 'pulseSlow 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}

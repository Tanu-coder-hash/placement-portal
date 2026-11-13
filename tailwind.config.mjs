/** @type {import('tailwindcss').Config} */

// "Ink & marigold": fountain-pen ink for structure, marigold (the colour of
// celebration garlands) reserved for offers, placements and excellent matches.
const ink = {
  50: '#EEF1FA',
  100: '#DDE3F5',
  200: '#B9C4EA',
  300: '#8C9DD9',
  400: '#5F75C6',
  500: '#3F57B5',
  600: '#2B3FA0',
  700: '#22338A',
  800: '#1A2869',
  900: '#141E4D',
  950: '#0C1333',
};

const config = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink,
        brand: ink, // legacy alias used across components
        marigold: {
          50: '#FFF8E6',
          100: '#FFEDBF',
          200: '#FFDC85',
          300: '#FFC847',
          400: '#F7B21A',
          500: '#F0A202',
          600: '#C88200',
          700: '#9A6400',
          800: '#6E4700',
        },
        canvas: '#EDF0F7',
        line: '#D9DEEA',
        muted: '#5A6382',
      },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        panel: '18px',
      },
      keyframes: {
        'dial-fill': {
          from: { strokeDashoffset: 'var(--dial-circumference)' },
          to: { strokeDashoffset: 'var(--dial-offset)' },
        },
        'bar-grow': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'dial-fill': 'dial-fill 900ms cubic-bezier(.2,.8,.2,1) both',
        'bar-grow': 'bar-grow 900ms cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};

export default config;

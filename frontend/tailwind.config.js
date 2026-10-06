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
        coastal: {
          bg: '#F6F4EE',
          card: '#FFFFFF',
          sand: '#EAE4D8',
          peach: '#F1D3B7',
          'peach-dark': '#DEAC83',
          mint: '#9BCDC2',
          teal: '#5CB7A8',
          emerald: '#278E7B',
          deep: '#133B34',
          slate: '#2C5E55',
          muted: '#527E75',
          border: '#DDE7E4',
          'border-active': '#9BCDC2',
        },
        cyber: {
          bg: '#F6F4EE',
          card: '#FFFFFF',
          cyan: '#278E7B',
          purple: '#5CB7A8',
          emerald: '#278E7B',
          amber: '#DEAC83',
          rose: '#E05A47',
          border: '#DDE7E4',
        }
      },
      fontFamily: {
        comfortaa: ['Comfortaa', 'cursive', 'sans-serif'],
        sans: ['Comfortaa', 'cursive', 'sans-serif'],
        orbitron: ['Comfortaa', 'cursive', 'sans-serif'],
        rajdhani: ['Comfortaa', 'cursive', 'sans-serif'],
        mono: ['Comfortaa', 'cursive', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 240, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}

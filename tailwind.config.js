/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}" // Catch root files like App.tsx if they stay there
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        primary: '#D4AF37', // Gold from logo
        blue: '#135bec', // Kept as blue just in case
        gold: '#D4AF37',
        navy: '#0d121b',
        'bg-light': '#f6f6f8',
        'bg-dark': '#101622',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        }
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      }
    },
  },
  plugins: [],
}

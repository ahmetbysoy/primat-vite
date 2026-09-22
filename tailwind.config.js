/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pastel: {
          lavender: '#d8c6f0',
          blue: '#c2deef',
          mint: '#c8f5d0',
          pink: '#ffd6e3',
          bg: '#FFF7FB',
        }
      },
      animation: {
        'strip-scroll': 'strip-scroll 30s linear infinite',
      },
      keyframes: {
        'strip-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    }
  },
  plugins: [],
}

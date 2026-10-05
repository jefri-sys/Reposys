/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#0047ab",
        "primary-dark": "#00327d",
        "navy-900": "#001d3d",
        "navy-950": "#000814",
        "surface": "#f8fafc",
        "on-surface": "#0f172a",
        "outline": "#cbd5e1",
      },
      fontFamily: {
        "headline": ["Manrope", "sans-serif"],
        "body": ["Inter", "sans-serif"],
      },
      backgroundImage: {
        'mesh-dark': 'radial-gradient(at 0% 0%, hsla(215, 95%, 15%, 1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225, 80%, 20%, 1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(210, 100%, 10%, 1) 0, transparent 50%)',
      }
    },
  },
  plugins: [],
}

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Or 'Segoe UI', Roboto, Arial if you prefer
      },
      colors: {
        maroon: '#7a1330',
        maroon_dark: '#54001c',
        maroon_light: '#a83250',
        gold: '#d9a017',
        brand_green: '#3f7d3a',
        cream: '#faf6ee',
        paper: '#ffffff',
        line: '#d9cfc2',
        ink: '#3a2c2c',
        muted: '#8a7a72',
      }
    }
  },
  plugins: [],
}
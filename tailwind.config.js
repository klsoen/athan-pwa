/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Amiri', 'serif'],
        sans: ['Inter', 'sans-serif']
      },
      colors: {
        gold: {
          400: '#D4AF37',
          500: '#C5A028',
          600: '#B8960A'
        }
      }
    }
  },
  plugins: []
};

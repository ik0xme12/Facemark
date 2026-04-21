/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fb: {
          blue: '#1877F2',
          dark: '#0866FF',
          light: '#E7F3FF',
          bg: '#F0F2F5',
        },
      },
    },
  },
  plugins: [],
}

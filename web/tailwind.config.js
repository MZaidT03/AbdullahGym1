/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#22C55E',
          'primary-dark': '#0B6634',
          secondary: '#2563EB',
          tertiary: '#F59E0B',
          neutral: '#71796F',
          dark: '#141716',
          surface: '#E4EAE1',
          card: '#E8EEE5',
          text: '#222E25',
        },
      },
    },
  },
  plugins: [],
};

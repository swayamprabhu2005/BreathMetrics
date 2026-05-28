/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        env: {
          bg: '#F4F8F5',
          card: '#FFFFFF',
          forest: '#1B2A22',
          'forest-muted': '#4F6357',
          sage: '#4E8A64',
          'sage-light': '#EEF7F2',
          'sage-dark': '#2D6A4F',
          amber: '#D9901C',
          'amber-light': '#FEF7E0',
          'amber-dark': '#996515',
          coral: '#D9544C',
          'coral-light': '#FCE8E6',
          'coral-dark': '#9E2A2B',
          sky: '#E6F3FF',
          'sky-light': '#F2F8FD',
          'sky-dark': '#1D4ED8',
          sand: '#FAF4EB',
          'sand-light': '#FDFBF9',
        }
      },
      boxShadow: {
        'premium-sm': '0 2px 8px rgba(24, 46, 32, 0.02), 0 4px 20px rgba(24, 46, 32, 0.02)',
        'premium-md': '0 4px 16px rgba(24, 46, 32, 0.03), 0 10px 40px rgba(24, 46, 32, 0.04)',
        'premium-lg': '0 10px 30px rgba(24, 46, 32, 0.04), 0 30px 70px rgba(24, 46, 32, 0.06)',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Blood Bridge palette
        navbar: '#7F1D1D', // Deep Red
        primary: {
          DEFAULT: '#DC2626', // Bright Red
          dark: '#B91C1C',
          light: '#EF4444',
        },
        blush: '#FFF5F7', // Blush White (page background)
        card: '#FFFFFF', // Pure White (dashboard cards)
        heading: '#4C0519', // Dark Maroon (headings)
        alert: '#FDE8EE', // Soft Pink (alerts)
        ink: '#1F2937', // Main text
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(76, 5, 25, 0.08), 0 8px 24px rgba(76, 5, 25, 0.06)',
      },
    },
  },
  plugins: [],
}

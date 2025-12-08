/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'neumorphic': '8px 8px 16px rgba(163, 177, 198, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.5)',
        'neumorphic-hover': '12px 12px 24px rgba(163, 177, 198, 0.6), -12px -12px 24px rgba(255, 255, 255, 0.5)',
        'neumorphic-inset': 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.5)',
      },
    },
  },
  plugins: [],
}

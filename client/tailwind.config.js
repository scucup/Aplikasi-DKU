/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-purple': {
          900: '#1a0b2e',
          800: '#2d1b4e',
          700: '#3d2a5f',
        },
        'neon-purple': '#a855f7',
        'neon-cyan': '#06b6d4',
        'neon-pink': '#ec4899',
        'neon-yellow': '#fbbf24',
      },
      boxShadow: {
        'neumorphic': '8px 8px 16px rgba(163, 177, 198, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.5)',
        'neumorphic-hover': '12px 12px 24px rgba(163, 177, 198, 0.6), -12px -12px 24px rgba(255, 255, 255, 0.5)',
        'neumorphic-inset': 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.5)',
        'neon': '0 0 20px rgba(168, 85, 247, 0.5)',
        'neon-strong': '0 0 30px rgba(168, 85, 247, 0.8)',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #16213e 100%)',
      },
    },
  },
  plugins: [],
}

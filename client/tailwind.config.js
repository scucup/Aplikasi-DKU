/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NAS-style dark navy theme
        'navy': {
          950: '#0a1020',
          900: '#0f1a2e',
          800: '#152238',
          700: '#1a2d45',
          600: '#243a52',
          500: '#2e4a65',
        },
        'sidebar': {
          bg: '#0f1a2e',
          hover: '#1a2d45',
          active: '#2563eb',
        },
        // Keep legacy colors for backward compatibility
        'dark-purple': {
          900: '#0f1a2e',
          800: '#152238',
          700: '#1a2d45',
        },
        'neon-purple': '#2563eb',
        'neon-cyan': '#06b6d4',
        'neon-pink': '#ef4444',
        'neon-yellow': '#f59e0b',
        'neon-green': '#10b981',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
        'sidebar': '2px 0 8px rgba(0, 0, 0, 0.3)',
        // Keep legacy shadows
        'neumorphic': '8px 8px 16px rgba(163, 177, 198, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.5)',
        'neumorphic-hover': '12px 12px 24px rgba(163, 177, 198, 0.6), -12px -12px 24px rgba(255, 255, 255, 0.5)',
        'neumorphic-inset': 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.5)',
        'neon': '0 0 20px rgba(37, 99, 235, 0.5)',
        'neon-strong': '0 0 30px rgba(37, 99, 235, 0.8)',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #0f1a2e 0%, #152238 50%, #1a2d45 100%)',
      },
    },
  },
  plugins: [],
}

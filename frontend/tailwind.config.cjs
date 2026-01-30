/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background
        'dark-bg': '#08090B',
        'dark-bg-secondary': '#0F1116',
        'dark-bg-tertiary': '#16181D',
        
        // Holographic colors
        'holo-cyan': '#00F5FF',
        'holo-purple': '#B64CFF',
        'holo-pink': '#FF006E',
        
        // Text
        'dark-text': '#E8EDF4',
        'dark-text-secondary': '#A8B1C3',
        'dark-text-tertiary': '#6B7280',
      },
      fontFamily: {
        display: ['Sora', 'SF Pro Display', 'system-ui', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-holographic': 'linear-gradient(135deg, #00F5FF 0%, #B64CFF 50%, #FF006E 100%)',
      },
      animation: {
        'gradient': 'gradient 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
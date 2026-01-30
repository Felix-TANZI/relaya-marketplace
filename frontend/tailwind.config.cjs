/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'holo-cyan': '#00f5ff',
        'holo-purple': '#b64cff',
        'holo-pink': '#ff006e',
        'dark-bg': '#0a0a0f',
        'dark-bg-secondary': '#12121a',
        'dark-text': '#e4e4e7',
        'dark-text-secondary': '#a1a1aa',
        'dark-text-tertiary': '#71717a',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-holographic': 'linear-gradient(135deg, #00f5ff 0%, #b64cff 50%, #ff006e 100%)',
      },
      animation: {
        'gradient-bg': 'gradient 8s ease infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
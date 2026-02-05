/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Couleurs holographiques principales
        'holo-cyan': '#00f5ff',
        'holo-purple': '#b64cff',
        'holo-pink': '#ff006e',
        
        // Couleurs de fond dark
        'dark-bg': '#0a0a0f',
        'dark-bg-secondary': '#12121a',
        
        // Couleurs de texte
        'dark-text': '#e4e4e7',
        'dark-text-secondary': '#a1a1aa',
        'dark-text-tertiary': '#71717a',
      },
      
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      backgroundImage: {
        'gradient-holographic': 'linear-gradient(135deg, #00f5ff 0%, #b64cff 50%, #ff006e 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      
      animation: {
        // Animations existantes
        'gradient-bg': 'gradient 8s ease infinite',
        
        // Nouvelles animations
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      
      keyframes: {
        // Gradient animation existante
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        
        // Scale animation (pour modales)
        scaleIn: {
          '0%': { 
            transform: 'scale(0.95)', 
            opacity: '0' 
          },
          '100%': { 
            transform: 'scale(1)', 
            opacity: '1' 
          },
        },
        
        // Slide animations (pour notifications, sidebars)
        slideInRight: {
          '0%': { 
            transform: 'translateX(100%)', 
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateX(0)', 
            opacity: '1' 
          },
        },
        
        slideInLeft: {
          '0%': { 
            transform: 'translateX(-100%)', 
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateX(0)', 
            opacity: '1' 
          },
        },
        
        slideInUp: {
          '0%': { 
            transform: 'translateY(20px)', 
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateY(0)', 
            opacity: '1' 
          },
        },
        
        slideInDown: {
          '0%': { 
            transform: 'translateY(-20px)', 
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateY(0)', 
            opacity: '1' 
          },
        },
        
        // Fade animations
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        
        // Pulse glow (pour effets holographiques)
        pulseGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)',
            transform: 'scale(1)',
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(182, 76, 255, 0.5)',
            transform: 'scale(1.02)',
          },
        },
        
        // Shimmer effect (pour loading states)
        shimmer: {
          '0%': { 
            backgroundPosition: '-1000px 0' 
          },
          '100%': { 
            backgroundPosition: '1000px 0' 
          },
        },
      },
      
      // Durées de transition personnalisées
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      
      // Box shadows personnalisées (pour glassmorphism)
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 16px 64px 0 rgba(0, 0, 0, 0.45)',
        'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.4)',
        'glow-purple': '0 0 20px rgba(182, 76, 255, 0.4)',
        'glow-pink': '0 0 20px rgba(255, 0, 110, 0.4)',
      },
      
      // Backdrop blur pour glassmorphism
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
};
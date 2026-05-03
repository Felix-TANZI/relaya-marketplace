/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Palette principale client alignée sur la maquette v29 ──
        primary: {
          DEFAULT: '#F47920',
          light: '#F8A45E',
          dark: '#C85E14',
        },
        secondary: {
          DEFAULT: '#1D4ED8',
          light: '#60A5FA',
          dark: '#1E40AF',
        },
        bg: {
          light: '#F3F4F6',
          'light-alt': '#F9FAFB',
          dark: '#090E1A',
          'dark-alt': '#111827',
        },
        text: {
          light: '#1F2937',
          'light-secondary': '#4B5563',
          dark: '#F9FAFB',
          'dark-secondary': '#D1D5DB',
        },

        // ── Palette dédiée à l'espace vendeur ──
        // Couleur signature : Orange BelivaY #F47920
        vendor: {
          // Orange principal
          'orange':       '#F47920',
          'orange-dark':  '#C85E14',
          'orange-deeper':'#9A3412',
          'orange-rich':  '#7C2D12',
          // Teintes claires (fonds, hover)
          'orange-light': '#FFF4EB',
          'orange-xl':    '#FFF9F4',
          'orange-warm':  '#FFFBF7',
          'orange-soft':  '#FFF7ED',
          // Neutres
          'n950': '#090E1A',
          'n900': '#111827',
          'n800': '#1F2937',
          'n700': '#374151',
          'n600': '#4B5563',
          'n500': '#6B7280',
          'n400': '#9CA3AF',
          'n300': '#D1D5DB',
          'n200': '#E5E7EB',
          'n100': '#F3F4F6',
          'n50':  '#F9FAFB',
          // Sémantiques
          'green':        '#16A34A',
          'green-dark':   '#14532D',
          'green-light':  '#F0FDF4',
          'green-mid':    '#DCFCE7',
          'red':          '#DC2626',
          'red-dark':     '#991B1B',
          'red-light':    '#FEF2F2',
          'red-mid':      '#FEE2E2',
          'gold':         '#B45309',
          'gold-light':   '#FFFBEB',
          'gold-mid':     '#FEF3C7',
          'blue':         '#1D4ED8',
          'blue-light':   '#EFF6FF',
          'blue-mid':     '#DBEAFE',
          'violet':       '#7C3AED',
          'violet-light': '#F5F3FF',
          'violet-mid':   '#EDE9FE',
          // Sidebar
          'sidebar-light': '#FFFBF7',
          'sidebar-dark':  '#0F1117',
          // Page background
          'page-light':    '#F3F4F6',
          'page-dark':     '#0B0D11',
        },
      },

      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Syne', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        // Typographie spécifique espace vendeur (Plus Jakarta Sans + Syne via CDN ou Google Fonts)
        'vendor-body':    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'vendor-display': ['Syne', '"Plus Jakarta Sans"', 'sans-serif'],
      },

      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        'soft':       '0 4px 20px rgba(0, 0, 0, 0.08)',
        'soft-lg':    '0 10px 40px rgba(0, 0, 0, 0.12)',
        // Ombres vendeur
        'vendor-sm':  '0 1px 3px rgba(9,14,26,.08), 0 1px 2px rgba(9,14,26,.04)',
        'vendor-md':  '0 4px 6px rgba(9,14,26,.07), 0 2px 4px rgba(9,14,26,.04)',
        'vendor-lg':  '0 10px 15px rgba(9,14,26,.08), 0 4px 6px rgba(9,14,26,.04)',
        'vendor-or':  '0 8px 24px rgba(244,121,32,.26), 0 2px 8px rgba(244,121,32,.14)',
        'vendor-grn': '0 4px 12px rgba(22,163,74,.20)',
        'vendor-focus': '0 0 0 3px rgba(244,121,32,.22)',
      },

      // Largeur fixe de la sidebar vendeur
      width: {
        'seller-sidebar': '224px',
      },
      marginLeft: {
        'seller-sidebar': '224px',
      },
      // Hauteur fixe de la topbar vendeur
      height: {
        'seller-topbar': '58px',
      },
      top: {
        'seller-topbar': '58px',
      },
      paddingTop: {
        'seller-topbar': '58px',
      },

      // Keyframes pour animations vendeur
      keyframes: {
        'card-slide-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'none' },
        },
        'page-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'none' },
        },
        'badge-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':      { transform: 'scale(1.08)' },
        },
        'sparkle': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.2)' },
        },
      },
      animation: {
        'card-slide-in': 'card-slide-in 0.4s cubic-bezier(.4,0,.2,1) both',
        'page-in':       'page-in 0.3s cubic-bezier(.4,0,.2,1)',
        'badge-pulse':   'badge-pulse 3s ease-in-out infinite',
        'sparkle':       'sparkle 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

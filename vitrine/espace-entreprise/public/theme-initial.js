// Fond posé avant le premier rendu (fichier séparé : la politique de sécurité interdit les scripts en ligne).
try {
  var h = document.documentElement, c = localStorage.getItem('blv_e_theme'), x = localStorage.getItem('blv_e_text')
  h.dataset.theme = c === 'dark' || c === 'light' ? c : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  if (x === 'grande' || x === 'tres') h.dataset.text = x
} catch (e) {}

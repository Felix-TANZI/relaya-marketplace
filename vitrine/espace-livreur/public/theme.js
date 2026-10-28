// Thème posé avant le premier rendu (index.html, script bloquant) : choix gardé (Réglages), sinon celui du téléphone.
// preferences.tsx le reprend ensuite ; ainsi le premier écran paraît d'emblée dans son thème, sans éclair.
;(function () {
  var t = 'auto'
  try {
    t = localStorage.getItem('blv_l_theme') || 'auto'
  } catch (e) {
    /* stockage refusé */
  }
  if (t !== 'light' && t !== 'dark') t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', t)
})()

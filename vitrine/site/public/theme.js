// Thème posé avant le premier rendu (index.html, script bloquant) : choix gardé (Réglages), sinon clair (« auto » :
// celui du téléphone). preferences.tsx le reprend ensuite ; le premier écran paraît d'emblée dans son thème, sans
// éclair blanc ni écran d'ouverture.
;(function () {
  var t = 'light'
  try {
    t = localStorage.getItem('blv_c_theme') || 'light'
  } catch (e) {
    /* stockage refusé */
  }
  if (t !== 'light' && t !== 'dark') t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', t)
})()

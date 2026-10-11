// Définitions partagées par les outils (sans effet à l'import).

// Écrans retirés (PLAN-VENDEUR.md, règle 3) : démonstrations de ce que ferait une application native.
export const RETIRES = {
  ile: 'démonstration de l’île BelivaY (réservée à une application native ; exclue comme côté client)',
  telephone: 'simulation de l’écran d’accueil du téléphone (démonstration)',
  verrouille: 'simulation de l’écran verrouillé (démonstration)',
  android: 'simulation d’une notification Android (démonstration)',
}

// États exclus : l'île dépliée (exclue de l'application), le pidgin (DP-13).
export const exclu = (a) => /[?&](dyn=|etat=deplie|langue=pcm|lang=pcm)/.test(a) || /^#ile\b/.test(a)

// Clé d'un état : route et paramètres triés (l'ordre des paramètres ne change pas l'état).
export function cleEtat(adresse) {
  const [route, q] = adresse.replace(/^#/, '').split('?')
  const p = new URLSearchParams(q || '')
  p.sort()
  const s = p.toString()
  return route + (s ? '?' + s : '')
}

// Adresse de l'application pour une adresse du prototype : « #commande?ref=X » → « /commande?ref=X » (accueil : « / »).
export function chemin(href) {
  const [r, q] = href.replace(/^#/, '').split('?')
  return (r === 'accueil' ? '/' : '/' + r) + (q ? '?' + q : '')
}

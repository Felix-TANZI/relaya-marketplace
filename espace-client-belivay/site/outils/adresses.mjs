// Adresses des états du prototype, partagées par les outils de l'étape 6 (sans effet à l'import).

// États exclus du site : le pidgin (DP-13, aucune langue pidgin sur le site), aussi en aperçu des réglages ;
// le remboursement sans retour (DP-10 : un retour passe toujours par le relais), dont l'adresse montre le retour.
export const exclu = (adresse) => /[?&](langue=pcm|pcm=1|st=sans-retour)\b/.test(adresse)

// Clé d'un état : route et paramètres triés (l'ordre des paramètres d'une adresse ne change pas l'état).
export function cleEtat(adresse) {
  const [route, q] = adresse.replace(/^#/, '').split('?')
  const p = new URLSearchParams(q || '')
  p.sort()
  const s = p.toString()
  return route + (s ? '?' + s : '')
}

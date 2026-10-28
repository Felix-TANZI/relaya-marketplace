// DONNÉES DE DÉMONSTRATION — les lots annoncés au relais depuis une commande du client (pont commun, src/demo/pont.ts ;
// logique-metier/CAHIER-CONNECTIVITE.md, étape 5) : un paquet affecté par l'entreprise vers ce relais devient un lot
// attendu (son numéro est celui du paquet, son arrêt celui du livreur). Ils rejoignent les lots du jeu d'essai à chaque
// ouverture (même liste : réception, départs, colis), comme le serveur les servirait. Créés par src/demo/pont-livreur.ts.
import { COLLECTES, LOTS, type LotJeu } from './jeu-essai'
import { magasin } from './stockage'

export const lotsPont = magasin('lots_pont', () => ({ lots: [] as LotJeu[] }))
for (const l of lotsPont.lire().lots) if (!LOTS.some((x) => x.id === l.id)) LOTS.push(l)

/** Ajoute un lot annoncé (une fois) à la liste des lots. */
export function annoncerLot(l: LotJeu) {
  if (LOTS.some((x) => x.id === l.id)) return
  LOTS.push(l)
  lotsPont.ecrire((s) => void s.lots.push(l))
}

/** Collectes des courses de retour venues du pont (l'arrêt du livreur au relais) : jointes aux collectes du jeu d'essai. */
export const collectesPont = magasin('collectes_pont', () => ({ collectes: [] as (typeof COLLECTES)[number][] }))
export function joindreCollectes() {
  for (const c of collectesPont.lire().collectes) if (!COLLECTES.some((x) => x.id === c.id)) COLLECTES.push({ ...c })
}
joindreCollectes()

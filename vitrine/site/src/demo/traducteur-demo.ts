// DONNÉES DE DÉMONSTRATION — traducteur de démonstration du contenu saisi par les gens (src/traduction/traducteur.ts).
// Aucun prestataire : un petit dictionnaire mot à mot FR ↔ EN, assez pour voir le geste « Traduire / Voir l'original »
// sur les avis, messages et fiches du jeu d'essai ; un mot inconnu reste tel quel. Le résultat est toujours marqué
// « traduit automatiquement » à l'écran. Se retire avec src/demo (logique-metier/RETIRER-LA-DEMO.md).
import type { LangueTexte, Traducteur } from '../traduction/traducteur'

const FR_EN: Record<string, string> = {
  très: 'very', bon: 'good', bonne: 'good', bien: 'well', super: 'great', excellent: 'excellent', parfait: 'perfect', parfaitement: 'perfectly',
  produit: 'product', produits: 'products', livraison: 'delivery', rapide: 'fast', relais: 'pickup point', reçu: 'received', reçue: 'received',
  conforme: 'as described', qualité: 'quality', prix: 'price', taille: 'size', couleur: 'colour', merci: 'thank you', bonjour: 'hello',
  et: 'and', le: 'the', la: 'the', les: 'the', un: 'a', une: 'a', des: 'some', de: 'of', du: 'of the', pour: 'for', avec: 'with', sans: 'without',
  est: 'is', sont: 'are', pas: 'not', mais: 'but', je: 'I', vous: 'you', nous: 'we', il: 'it', elle: 'she', recommande: 'recommend',
  arrivé: 'arrived', arrivée: 'arrived', emballé: 'packed', solide: 'sturdy', beau: 'beautiful', belle: 'beautiful', jolie: 'pretty',
  correct: 'fine', rien: 'nothing', à: 'to', dire: 'say', fonctionne: 'works', boîte: 'box', scellée: 'sealed', autonomie: 'battery life',
  colis: 'parcel', commande: 'order', disponible: 'available', aujourd: 'today', demain: 'tomorrow', nouveau: 'new', nouvelle: 'new', neuf: 'brand new',
}
const EN_FR: Record<string, string> = Object.fromEntries(Object.entries(FR_EN).map(([k, v]) => [v.toLowerCase(), k]))

// Phrases entières du jeu d'essai (traduction soignée) ; sinon, le mot à mot ci-dessous.
const PHRASES: Record<string, string> = {
  'The seller replied within ten minutes in the chat to confirm it is the international version. Nothing to complain about.':
    'Le vendeur a répondu en dix minutes dans la messagerie pour confirmer qu’il s’agit de la version internationale. Rien à redire.',
}
const PHRASES_INVERSES: Record<string, string> = Object.fromEntries(Object.entries(PHRASES).map(([en, fr]) => [fr, en]))

function motAMot(texte: string, dico: Record<string, string>): string {
  return texte.replace(/[\p{L}’']+/gu, (m) => {
    const v = dico[m.toLowerCase()]
    if (!v) return m
    return m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? v[0].toUpperCase() + v.slice(1) : v
  })
}

export const traducteurDemo: Traducteur = {
  nom: 'démonstration',
  async traduire(texte: string, de: LangueTexte, vers: LangueTexte, signal?: AbortSignal) {
    await new Promise((ok) => setTimeout(ok, 200))
    if (signal?.aborted) throw new DOMException('annulé', 'AbortError')
    const phrase = (de === 'en' ? PHRASES : PHRASES_INVERSES)[texte.trim()]
    const sortie = de === vers ? texte : (phrase ?? motAMot(texte, de === 'fr' ? FR_EN : EN_FR))
    return { texte: sortie, automatique: true as const, fournisseur: 'démonstration' }
  },
}

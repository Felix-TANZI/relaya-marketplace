// Paires « accroche + photo » des pages de connexion et d'inscription, par public (logique-metier/PROMPTS-CONNEXION.md,
// comme l'ancien belivay.com). À chaque visite, une paire est tirée au hasard parmi celles dont la photo est fournie
// (site/src/assets/acces/<photo>.jpg|webp) ; le tirage reste le même pendant la visite (pas de clignotement d'une page
// à l'autre). Sans aucune photo fournie : l'accroche tourne de même, sur le fond de repli aux couleurs de l'espace.
// Le second morceau de l'accroche s'écrit à la couleur de l'espace. Accroches reprises telles qu'écrites par le porteur.

export type Public = 'client' | 'diaspora' | 'vendeur' | 'livreur' | 'entreprise' | 'relais' | 'equipe'
type Deux = [string, string]
export type Paire = { photo: string; fr: Deux; en: Deux }

export const ACCROCHES: Record<Public, Paire[]> = {
  client: [
    { photo: 'client-1', fr: ['Tout ce dont vous avez besoin,', 'plus proche de vous.'], en: ['Everything you need,', 'closer to you.'] },
    { photo: 'client-2', fr: ['Des produits du quotidien,', 'aux grandes opportunités.'], en: ['Everyday products,', 'great opportunities.'] },
    { photo: 'client-3', fr: ['Payez en un geste,', 'suivez chaque colis.'], en: ['Pay in one tap,', 'track every parcel.'] },
  ],
  diaspora: [
    { photo: 'diaspora-1', fr: ['Loin du pays,', 'proche des vôtres.'], en: ['Far from home,', 'close to your loved ones.'] },
    { photo: 'diaspora-2', fr: ['Vos proches reçoivent,', 'vous suivez tout.'], en: ['Your family receives,', 'you follow everything.'] },
  ],
  vendeur: [
    { photo: 'vendeur-1', fr: ['Vendez plus,', 'développez votre activité.'], en: ['Sell more,', 'grow your business.'] },
    { photo: 'vendeur-2', fr: ['Votre boutique,', 'ouverte à tout Yaoundé.'], en: ['Your shop,', 'open to all of Yaoundé.'] },
    { photo: 'vendeur-3', fr: ['Chaque vendredi,', 'vos gains sur Mobile Money.'], en: ['Every Friday,', 'your earnings on Mobile Money.'] },
  ],
  livreur: [
    { photo: 'livreur-1', fr: ['Votre journée de livraison', 'commence ici.'], en: ['Your delivery day', 'starts here.'] },
    { photo: 'livreur-2', fr: ['Chaque arrêt,', 'un client satisfait.'], en: ['Every stop,', 'a happy customer.'] },
  ],
  entreprise: [
    { photo: 'entreprise-1', fr: ['Une flotte organisée,', 'des livraisons maîtrisées.'], en: ['An organised fleet,', 'deliveries under control.'] },
    { photo: 'entreprise-2', fr: ['Grandissez avec', 'chaque commande.'], en: ['Grow with', 'every order.'] },
  ],
  relais: [
    { photo: 'relais-1', fr: ['Votre commerce,', 'au cœur du quartier.'], en: ['Your shop,', 'at the heart of the neighbourhood.'] },
    { photo: 'relais-2', fr: ['Un revenu en plus,', 'sans effort.'], en: ['Extra income,', 'without the effort.'] },
  ],
  equipe: [
    { photo: 'equipe-1', fr: ['Le e-commerce au service du', 'Cameroun.'], en: ['E-commerce serving', 'Cameroon.'] },
    { photo: 'equipe-2', fr: ['Notre pays,', 'nos opportunités.'], en: ['Our country,', 'our opportunities.'] },
  ],
}

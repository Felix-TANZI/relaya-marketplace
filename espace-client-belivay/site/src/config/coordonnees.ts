// Coordonnées officielles de BelivaY (relevées sur belivay.com, consigne du porteur du 5 oct. 2026) : accroche,
// adresse, téléphone, e-mail, WhatsApp du support et réseaux sociaux officiels (adresses sans paramètres de suivi).
// Valeurs par défaut : le serveur peut les remplacer par les contenus servis (donnees/contenus.ts, « coordonnees »,
// lus par useCoordonnees dans composants/contenus.ts). Le numéro WhatsApp officiel est le même que le téléphone.
export type NomReseau = 'facebook' | 'instagram' | 'tiktok'
export interface Reseau {
  nom: NomReseau
  libelle: string // « Facebook »
  url: string
}
export interface Coordonnees {
  accroche: string
  adresse: string
  telephone: string // affiché (« +237 689 002 812 »)
  telephoneLien: string // « tel:+237689002812 »
  email: string
  whatsapp: string // lien wa.me du support
  reseaux: Reseau[]
}

export const RESEAUX: Reseau[] = [
  { nom: 'facebook', libelle: 'Facebook', url: 'https://www.facebook.com/share/1Jte1yhs4a/' },
  { nom: 'instagram', libelle: 'Instagram', url: 'https://www.instagram.com/belivaycm' },
  { nom: 'tiktok', libelle: 'TikTok', url: 'https://www.tiktok.com/@belivaymarketplace' },
]

export const COORDONNEES: Coordonnees = {
  accroche: 'Votre marketplace de confiance au Cameroun',
  adresse: 'Yaoundé, Cameroun',
  telephone: '+237 689 002 812',
  telephoneLien: 'tel:+237689002812',
  email: 'contact@belivay.com',
  whatsapp: 'https://wa.me/237689002812',
  reseaux: RESEAUX,
}

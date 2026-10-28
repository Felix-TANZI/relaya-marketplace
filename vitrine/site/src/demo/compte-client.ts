// DONNÉES DE DÉMONSTRATION — identité du compte client pour le kit « compte » (src/compte) : la carte « compte
// reconnu » de la connexion par e-mail (photo affichée) et le lien de connexion reçu par e-mail.
import PHOTO_CARINE from '../assets/produits/d-ebb567019115.webp'
import type { IdentiteDepart } from '../compte/etat'
import { lireEtat } from './magasin'

export function departClient(): IdentiteDepart {
  const e = lireEtat()
  const p = e.profil
  return { prenom: p.prenom, nom: p.nom, telephone: p.numeroMasque, email: e.supprime ? null : p.email, photo: p.photo ?? (e.jeuEssai === false ? null : PHOTO_CARINE) }
}

// Connecteurs du domaine « equipe » (backend-kit/apps/vendeur_boutique), propriétaire seulement.
import { c, type ConnecteursDe } from './types'

const D = 'Équipe'

export const ROUTES_EQUIPE: ConnecteursDe<'equipe'> = {
  'equipe.membres': c(D, 'branche', 'GET /api/vendors/shop/members', '→ Equipe ; 403 owner_only'),
  'equipe.inviter': c(D, 'branche', 'POST /api/vendors/shop/members {prenomNom, telephone, droits?} (Idempotency-Key)', '→ Resultat plein | nom | telephone | deja | droits ; 403 owner_only', 'droits cochés (rôle Préparation par défaut ; interdits retirés d’office) ; code SMS au propriétaire ; rien n’est créé avant le code'),
  'equipe.confirmerInvitation': c(D, 'branche', 'POST /api/vendors/shop/members/invitations/{id}/confirm {code} (Idempotency-Key)', '→ Resultat code | expire ; 403 owner_only', 'compte du membre créé sans mot de passe (ou compte client du même numéro) ; SMS d’installation'),
  'equipe.renvoyerInvitation': c(D, 'branche', 'POST /api/vendors/shop/members/{id}/resend', '→ Resultat trop_tot ; 403 owner_only'),
  'equipe.demanderCodeRetrait': c(D, 'branche', 'POST /api/vendors/shop/members/{id}/removal-code', '→ {masque} ; 403 owner_only'),
  'equipe.annulerInvitation': c(D, 'branche', 'DELETE /api/vendors/shop/members/invitations/{id}', '→ Resultat introuvable ; 403 owner_only', 'sans code : rien n’est encore ouvert'),
  'equipe.demanderCodeMembre': c(D, 'branche', 'POST /api/vendors/shop/members/{id}/code {motif}', '→ {masque} ; 403 owner_only', 'motif : retrait | droits | reactivation ; code au téléphone personnel du propriétaire'),
  'equipe.changerDroits': c(D, 'branche', 'PUT /api/vendors/shop/members/{id}/rights {droits, code}', '→ Resultat code | proprietaire | droits ; 403 owner_only', 'le serveur retire les droits interdits (argent, prix, réponse aux litiges, équipe) ; jetons du membre rafraîchis'),
  'equipe.suspendre': c(D, 'branche', 'POST /api/vendors/shop/members/{id}/suspend', '→ Resultat proprietaire | etat ; 403 owner_only', 'sessions coupées tout de suite, compte gardé'),
  'equipe.reactiver': c(D, 'branche', 'POST /api/vendors/shop/members/{id}/reactivate {code}', '→ Resultat code | proprietaire | etat ; 403 owner_only'),
  'equipe.journal': c(D, 'branche', 'GET /api/vendors/shop/members/{id}/journal', '→ ActionMembre[] ; 403 owner_only', 'actions signées (EQU-03) : journaux des commandes, stock, boutique, connexions'),
  'equipe.retirer': c(D, 'branche', 'DELETE /api/vendors/shop/members/{id} {code}', '→ Resultat code | proprietaire ; 403 owner_only', 'sessions et appareils coupés tout de suite ; actions passées signées (EQU-04)'),
}

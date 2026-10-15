// DONNÉES DE DÉMONSTRATION — jeu d'essai du paquet vendeur (VD-02 p2, « V01 ») : lundi 21 septembre 2026, 09 h 48,
// boutique « Tonton PG » (nom interne), titulaire Franck Penga, @Penga12, particulier sans RCCM ; zone Z4,
// Mvog-Mbi / Mvog-Ada ; Bronze, Trust Score 62,7 ; plan Free, offre de découverte depuis le 27 août ; versements vers
// MTN ···· 4217 ; équipe : Franck Penga (propriétaire), Aïcha N. (préparation) ; commandes BLV-00001 à 00009.
// Logique-metier/vendeur/analyse/01-fondations-donnees-commission.md § 3.7 et § 4.4 (GET /seller/today à 09 h 48).
//
// Ce fichier est COMMUN (lecture seule pour les agents de la vague 2) : il ne contient que des faits (dates, prix de
// vente, catégories, états) ; aucun montant gardé n'y est écrit : les démonstrations de domaine les calculent avec
// src/calculs, au palier et à l'offre du jour du paiement (figés au paiement, D5). Un agent qui a besoin de données en
// plus les met dans SON fichier de démonstration (src/demo/<domaine>.ts).
import type { ArticleVendu, ClasseColis, Livreur, Palier, Plan, ReferenceCommande } from '../donnees/communs'
import type { EtatOffre } from '../donnees/domaines/produits'
import { yaounde } from '../calculs/temps'

export const BOUTIQUE = {
  nom: 'Tonton PG',
  titulaire: { prenom: 'Franck', nom: 'Penga' },
  identifiant: '@Penga12',
  statut: 'particulier' as const,
  zone: 'Z4',
  quartier: 'Mvog-Mbi / Mvog-Ada',
  repere: 'face à la pharmacie du carrefour',
  // Le paquet écrit 3,652° N : coquille (Mvog-Mbi est à 3,85° N) ; la longitude est celle du paquet.
  position: { lat: 3.852, lon: 11.517 },
  // Horaires : lundi à vendredi 08 h – 18 h, samedi 08 h – 14 h, dimanche fermé ; passage du livreur.
  horaires: [0, 1, 2, 3, 4, 5, 6].map((jour) => ({ jour, ouvert: jour < 6, de: '08:00', a: jour === 5 ? '14:00' : '18:00' })),
  passageLivreur: [
    { jours: 'lun–ven', de: '14:00', a: '16:00' },
    { jours: 'sam', de: '11:00', a: '13:00' },
  ],
  palier: 'Bronze' as Palier,
  trustScore: 62.7,
  commandesLivrees: 7,
  note: 4.0,
  plan: 'Free' as Plan,
  premiereCommandePayee: '2026-08-27',
  // Contrat signé il y a un an (démonstration riche : douze mois de gains) ; jusqu'au 27 août, ventes payées au comptoir
  // du relais seulement (aucune ne compte pour l'offre de découverte, qui part de la première commande payée).
  signature: '2025-09-15',
  numeroVersement: { operateur: 'MTN' as const, masque: '···· 4217', verifieLe: '2026-05-09' },
}

export const MEMBRES = [
  { id: 'm-franck', prenom: 'Franck', nom: 'Penga', initiales: 'FP', role: 'proprietaire' as const, telephone: '+237 6 77 12 42 17', depuis: yaounde(2026, 8, 20, 10) },
  { id: 'm-aicha', prenom: 'Aïcha', nom: 'N.', initiales: 'AN', role: 'preparation' as const, telephone: '+237 6 99 41 08 90', depuis: yaounde(2026, 9, 2, 9) },
]

export const ARTICLES: Record<string, ArticleVendu & { prix: number; madeInCameroon: boolean }> = {
  'itel-noir': { offreId: 'itel-noir', titre: 'ITEL AC52', variante: 'noir', etat: 'Neuf', dessin: 'itel', categorie: 'Électronique', prix: 20000, madeInCameroon: false },
  'itel-bleu': { offreId: 'itel-bleu', titre: 'ITEL AC52', variante: 'bleu', etat: 'Neuf', dessin: 'itel', categorie: 'Électronique', prix: 20000, madeInCameroon: false },
  iphone: { offreId: 'iphone', titre: 'iPhone 15 Pro Max', variante: '256 Go', etat: 'Neuf', dessin: 'flagship', categorie: 'Électronique', prix: 350000, madeInCameroon: false },
  // Catalogue élargi de la démonstration (catégories, variantes, états variés).
  chargeur: { offreId: 'chargeur', titre: 'Chargeur rapide 18 W · USB-C', variante: 'blanc', etat: 'Neuf', dessin: 'charger', categorie: 'Électronique', prix: 4000, madeInCameroon: false },
  coque: { offreId: 'coque', titre: 'Coque ITEL AC52 · silicone', variante: 'noir', etat: 'Neuf', dessin: 'coque', categorie: 'Électronique', prix: 2000, madeInCameroon: false },
  ecouteurs: { offreId: 'ecouteurs', titre: 'Écouteurs filaires · jack 3,5 mm', variante: 'noir', etat: 'Neuf', dessin: 'ecouteurs', categorie: 'Électronique', prix: 2500, madeInCameroon: false },
  'pagne-bleu': { offreId: 'pagne-bleu', titre: 'Pagne wax 6 yards', variante: 'bleu', etat: 'Neuf', dessin: 'pagne', categorie: 'Mode Femme', prix: 14000, madeInCameroon: true },
  'pagne-rouge': { offreId: 'pagne-rouge', titre: 'Pagne wax 6 yards', variante: 'rouge', etat: 'Neuf', dessin: 'pagne', categorie: 'Mode Femme', prix: 14000, madeInCameroon: true },
  'itel-64': { offreId: 'itel-64', titre: 'ITEL AC52 · 64 Go', variante: 'noir', etat: 'Neuf', dessin: 'itel', categorie: 'Électronique', prix: 24000, madeInCameroon: false },
  'iphone-128': { offreId: 'iphone-128', titre: 'iPhone 15 Pro Max', variante: '128 Go', etat: 'Reconditionné', dessin: 'flagship', categorie: 'Électronique', prix: 290000, madeInCameroon: false },
}

export const LIVREUR: Livreur = { nom: 'Serge M.', societe: 'Wink Express', creneau: ['14:00', '16:00'] }

export type EtapeCommande = 'a_preparer' | 'versee' | 'a_verser' | 'se_libere' | 'litige' | 'retour' | 'chez_le_livreur' | 'annulee'

export interface CommandeEssai {
  ref: ReferenceCommande
  article: string // clé de ARTICLES
  quantite: number
  colis: ClasseColis
  payeeA: number
  payableAuRetrait: boolean
  moyen: 'momo' | 'carte' | 'apple' | 'google' | 'wallet' | 'usd' | 'eur' | 'comptoir'
  etape: EtapeCommande
  echeance?: number // à préparer : prête avant
  retraitA?: number
  fermetureA?: number // fermeture du retour (« Tout est en ordre » ou retrait + 7 j)
  versement?: string // BLV-VS-…
  litige?: { ouvertA: number; echeance: number; motif: string; ceQueDitLeClient: string }
  retour?: { motif: string; arrivee: { jour: string; creneau: [string, string] } }
  preteA?: number // prête (« C'est prêt » touché), livreur attendu
  remiseA?: number // remise au livreur
  annulation?: { motif: 'client_avant_ramassage' | 'rupture' | 'litige_perdu' | 'belivay'; a: number }
  remplacementDe?: ReferenceCommande // sous-commande de remplacement d'un retour (REFCL-R080) : aucun nouvel argent
}

export const COMMANDES: CommandeEssai[] = [
  { ref: 'BLV-00001', article: 'itel-noir', quantite: 1, colis: 'S', payeeA: yaounde(2026, 8, 28, 10, 12), payableAuRetrait: false, moyen: 'momo', etape: 'versee', retraitA: yaounde(2026, 8, 31, 15), fermetureA: yaounde(2026, 9, 7, 9), versement: 'BLV-VS-4071' },
  { ref: 'BLV-00002', article: 'itel-noir', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 4, 11, 30), payableAuRetrait: false, moyen: 'momo', etape: 'versee', retraitA: yaounde(2026, 9, 7, 16), fermetureA: yaounde(2026, 9, 8, 12), versement: 'BLV-VS-4085' },
  { ref: 'BLV-00003', article: 'itel-noir', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 12, 9, 40), payableAuRetrait: false, moyen: 'momo', etape: 'a_verser', retraitA: yaounde(2026, 9, 15, 11), fermetureA: yaounde(2026, 9, 16, 11) },
  {
    ref: 'BLV-00004', article: 'itel-noir', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 14, 8, 20), payableAuRetrait: false, moyen: 'momo', etape: 'retour', retraitA: yaounde(2026, 9, 17, 10),
    retour: { motif: 'défaut caché, signalé 30 h après le retrait', arrivee: { jour: '2026-09-22', creneau: ['14:00', '16:00'] } },
  },
  {
    ref: 'BLV-00005', article: 'iphone', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 15, 13, 2), payableAuRetrait: false, moyen: 'momo', etape: 'litige', retraitA: yaounde(2026, 9, 19, 17),
    litige: { ouvertA: yaounde(2026, 9, 20, 5, 30), echeance: yaounde(2026, 9, 22, 5, 30), motif: 'Ce n’est pas le bon produit', ceQueDitLeClient: 'J’ai commandé le 256 Go, la boîte indique 128 Go.' },
  },
  {
    ref: 'BLV-00006', article: 'iphone', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 16, 18, 45), payableAuRetrait: false, moyen: 'momo', etape: 'litige', retraitA: yaounde(2026, 9, 20, 12),
    litige: { ouvertA: yaounde(2026, 9, 21, 6, 2), echeance: yaounde(2026, 9, 23, 6, 2), motif: 'Colis abîmé', ceQueDitLeClient: 'L’écran est fissuré à l’ouverture du colis.' },
  },
  { ref: 'BLV-00007', article: 'itel-noir', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 14, 15, 5), payableAuRetrait: false, moyen: 'momo', etape: 'se_libere', retraitA: yaounde(2026, 9, 17, 9), fermetureA: yaounde(2026, 9, 18, 18) },
  { ref: 'BLV-00008', article: 'itel-noir', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 21, 8, 42), payableAuRetrait: false, moyen: 'momo', etape: 'a_preparer', echeance: yaounde(2026, 9, 21, 12, 42) },
  { ref: 'BLV-00009', article: 'itel-noir', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 21, 9, 5), payableAuRetrait: true, moyen: 'comptoir', etape: 'a_preparer', echeance: yaounde(2026, 9, 21, 13, 5) },
  // Démonstration : chaque état d'une commande (en retard, prête, chez le livreur, annulée, rupture, livrée).
  { ref: 'BLV-00010', article: 'chargeur', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 19, 10, 0), payableAuRetrait: false, moyen: 'momo', etape: 'a_preparer', echeance: yaounde(2026, 9, 19, 14, 0) },
  { ref: 'BLV-00011', article: 'coque', quantite: 2, colis: 'S', payeeA: yaounde(2026, 9, 21, 8, 5), payableAuRetrait: false, moyen: 'carte', etape: 'chez_le_livreur', preteA: yaounde(2026, 9, 21, 9, 30) },
  { ref: 'BLV-00012', article: 'pagne-bleu', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 19, 9, 20), payableAuRetrait: false, moyen: 'momo', etape: 'chez_le_livreur', preteA: yaounde(2026, 9, 19, 11, 2), remiseA: yaounde(2026, 9, 19, 12, 10) },
  { ref: 'BLV-00013', article: 'ecouteurs', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 19, 8, 30), payableAuRetrait: false, moyen: 'momo', etape: 'annulee', annulation: { motif: 'rupture', a: yaounde(2026, 9, 19, 9, 15) } },
  { ref: 'BLV-00014', article: 'itel-noir', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 18, 10, 0), payableAuRetrait: false, moyen: 'wallet', etape: 'annulee', annulation: { motif: 'client_avant_ramassage', a: yaounde(2026, 9, 18, 11, 15) } },
  { ref: 'BLV-00015', article: 'pagne-bleu', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 16, 10, 40), payableAuRetrait: false, moyen: 'momo', etape: 'se_libere', retraitA: yaounde(2026, 9, 18, 16), fermetureA: yaounde(2026, 9, 19, 10) },
  { ref: 'BLV-00016', article: 'chargeur', quantite: 2, colis: 'S', payeeA: yaounde(2026, 9, 10, 15, 20), payableAuRetrait: false, moyen: 'momo', etape: 'versee', retraitA: yaounde(2026, 9, 12, 11), fermetureA: yaounde(2026, 9, 13, 9), versement: 'BLV-VS-4085' },
  // Litiges à chaque étape : en médiation (réponse envoyée), clos gagné, clos accepté (client remboursé).
  {
    ref: 'BLV-00017', article: 'chargeur', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 15, 9, 0), payableAuRetrait: false, moyen: 'momo', etape: 'litige', retraitA: yaounde(2026, 9, 18, 15),
    litige: { ouvertA: yaounde(2026, 9, 19, 10, 0), echeance: yaounde(2026, 9, 21, 10, 0), motif: 'Le produit ne fonctionne pas', ceQueDitLeClient: 'Le chargeur ne charge plus après deux jours.' },
  },
  {
    ref: 'BLV-00018', article: 'pagne-bleu', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 5, 10, 30), payableAuRetrait: false, moyen: 'momo', etape: 'litige', retraitA: yaounde(2026, 9, 8, 15), fermetureA: yaounde(2026, 9, 15, 15),
    litige: { ouvertA: yaounde(2026, 9, 9, 9, 0), echeance: yaounde(2026, 9, 11, 9, 0), motif: 'Ce n’est pas le bon produit', ceQueDitLeClient: 'J’attendais un pagne bleu nuit, celui-ci est bleu ciel.' },
  },
  {
    ref: 'BLV-00019', article: 'coque', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 12, 14, 10), payableAuRetrait: false, moyen: 'momo', etape: 'litige', retraitA: yaounde(2026, 9, 15, 11),
    litige: { ouvertA: yaounde(2026, 9, 15, 18, 0), echeance: yaounde(2026, 9, 17, 18, 0), motif: 'Colis abîmé', ceQueDitLeClient: 'La coque est fendue sur le côté.' },
  },
  // Retours à chaque étape : à inspecter, à décider (conforme), en médiation (non conforme), clos (remboursé).
  { ref: 'BLV-00020', article: 'chargeur', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 14, 11, 0), payableAuRetrait: false, moyen: 'momo', etape: 'retour', retraitA: yaounde(2026, 9, 17, 10), retour: { motif: 'abîmé à l’ouverture', arrivee: { jour: '2026-09-19', creneau: ['11:00', '13:00'] } } },
  { ref: 'BLV-00021', article: 'itel-noir', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 11, 16, 0), payableAuRetrait: false, moyen: 'momo', etape: 'retour', retraitA: yaounde(2026, 9, 14, 15), retour: { motif: 'non conforme', arrivee: { jour: '2026-09-18', creneau: ['14:00', '16:00'] } } },
  { ref: 'BLV-00022', article: 'ecouteurs', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 12, 9, 30), payableAuRetrait: false, moyen: 'momo', etape: 'retour', retraitA: yaounde(2026, 9, 15, 11), retour: { motif: 'contrefaçon', arrivee: { jour: '2026-09-19', creneau: ['11:00', '13:00'] } } },
  { ref: 'BLV-00023', article: 'pagne-bleu', quantite: 1, colis: 'S', payeeA: yaounde(2026, 9, 7, 10, 0), payableAuRetrait: false, moyen: 'momo', etape: 'retour', retraitA: yaounde(2026, 9, 10, 15), retour: { motif: 'non conforme', arrivee: { jour: '2026-09-14', creneau: ['14:00', '16:00'] } } },
  ...historique(),
]

/** Ventes des onze mois avant la première commande payée : au comptoir du relais, retirées, versées. L'activité
 *  grandit : trois ventes par mois, dont un iPhone à partir de février. */
function historique(): CommandeEssai[] {
  const out: CommandeEssai[] = []
  for (let i = 0; i < 11; i++) {
    const an = i < 3 ? 2025 : 2026
    const mois = ((9 + i) % 12) + 1 // octobre 2025 → août 2026
    const ventes: [string, number, number, number][] = [
      ['itel-noir', 1 + (i % 3), 6, 10],
      [i % 2 ? 'pagne-bleu' : 'chargeur', 1 + (i % 2), 14, 15],
      [i >= 4 ? 'iphone' : 'itel-64', 1, 22, 11],
    ]
    ventes.forEach(([article, quantite, jour, h], k) => {
      const n = i * 3 + k
      const payee = yaounde(an, mois, jour, h, 10 + n)
      out.push({ ref: `BLV-H${String(n + 1).padStart(3, '0')}`, article, quantite, colis: 'S', payeeA: payee, payableAuRetrait: true, moyen: 'comptoir', etape: 'versee', retraitA: payee + 2 * 86_400_000, fermetureA: payee + 3 * 86_400_000, versement: `BLV-VS-${3800 + n}` })
    })
  }
  return out
}

/** Versement refusé par l'opérateur (compte plein), crédité au nouvel essai du lendemain (VER-04). */
export const VERSEMENT_REFUSE = 'BLV-VS-3824'

/** Offres de la boutique (« 3 produits · 2 en vente · 1 en vérification »). */
export const OFFRES: { id: string; etat: EtatOffre; stock: number; seuilAlerte: number; paiementAuRetrait: boolean; verificationAvant: number | null }[] = [
  { id: 'itel-noir', etat: 'en_vente', stock: 3, seuilAlerte: 5, paiementAuRetrait: true, verificationAvant: null },
  { id: 'itel-bleu', etat: 'en_verification', stock: 5, seuilAlerte: 5, paiementAuRetrait: true, verificationAvant: yaounde(2026, 9, 22, 16, 10) },
  { id: 'iphone', etat: 'en_vente', stock: 2, seuilAlerte: 1, paiementAuRetrait: false, verificationAvant: null },
  { id: 'chargeur', etat: 'en_vente', stock: 14, seuilAlerte: 5, paiementAuRetrait: true, verificationAvant: null },
  { id: 'coque', etat: 'en_vente', stock: 25, seuilAlerte: 5, paiementAuRetrait: true, verificationAvant: null },
  { id: 'ecouteurs', etat: 'en_vente', stock: 0, seuilAlerte: 5, paiementAuRetrait: true, verificationAvant: null },
  { id: 'pagne-bleu', etat: 'en_vente', stock: 2, seuilAlerte: 3, paiementAuRetrait: true, verificationAvant: null },
  { id: 'pagne-rouge', etat: 'brouillon', stock: 6, seuilAlerte: 3, paiementAuRetrait: true, verificationAvant: null },
  { id: 'itel-64', etat: 'en_pause', stock: 4, seuilAlerte: 2, paiementAuRetrait: true, verificationAvant: null },
  { id: 'iphone-128', etat: 'refusee', stock: 1, seuilAlerte: 1, paiementAuRetrait: false, verificationAvant: null },
]

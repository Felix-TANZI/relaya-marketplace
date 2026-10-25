// DONNÉES DE DÉMONSTRATION — domaine « acteurs » (S3) : revue KYC, vendeurs, paliers et Trust Score, sanctions et
// recours, clients et IFA, qualité des acteurs. Même jeu d'essai que la console (src/demo/jeu-essai.ts : mêmes
// vendeurs, livreurs, entreprises, relais, clients et identifiants de dossiers), au mardi 13 oct. 2026 14 h 05.
// La source fait ce que fera le serveur : droits (exigerPage, exiger), lecture seule, conflit d'intérêts (A-33),
// motif minimal, pièces ouvertes avant approbation, quatre yeux (domaine quatreyeux, autre compte), journal, puis
// publication vers l'espace concerné (pont : événements typés de pont.ts quand ils existent, sinon événements S3
// nommés comme CONNEXIONS.md, à typer dans pont.ts à l'intégration : INTEGRATION.md).
import { droitDe, type Permission } from '../config/droits'
import { NOM_ROLE } from '../config/libelles'
import { AccesRefuse, type CodeZone, type Role } from '../donnees/communs'
import type { AbonnementClient, ActeurQualite, Controle, DecisionPrise, DemandeKyc, DomaineActeurs, DossierKyc, EspaceActeur, EvenementTrust, FicheClient, FicheVendeur, LigneHistorique, PieceKyc, PropositionPalier, RaisonRefus, Sanction, VendeurCourt } from '../donnees/domaines/acteurs'
import { PARAMETRES, REGISTRE, entier } from '../calculs/registre'
import { MINUTE } from '../calculs/temps'
import * as R from '../pages/ADM-06/calculs/regles'
import { PALIERS as PALIERS_SITE } from '@client/donnees/prime'
import { etatMembre } from './equipe-etat'
import { maintenant } from './horloge'
import { agentCourant, auPerimetre, exiger, exigerPage, roleCourant } from './acces'
import { journaliser } from './journal'
import { CLIENTS, ENTREPRISES, HEURE, JOUR, LIVREURS, RELAIS, T, VENDEURS, agent, masquerTelephone, nomAgent } from './jeu-essai'
import { ACTEURS_DEMO, evenementsPour, publier, type Evenement, type EvenementPont } from './pont'
import { demoQuatreYeux, quatreYeuxDemo } from './quatreyeux'
import { magasin, repondre } from './stockage'

const P = R.P3
const J = (j: number) => T((j * JOUR) / MINUTE)
const H = (h: number) => T((h * HEURE) / MINUTE)

/** Série quotidienne de n jours (la plus récente en dernier) par points d'appui [jour, valeur], interpolés. */
export function courbe(appuis: [number, number][], n = 30): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const k = appuis.findIndex(([j]) => j >= i)
    const [j1, v1] = appuis[Math.max(0, k)] ?? appuis[appuis.length - 1]
    const [j0, v0] = appuis[Math.max(0, k - 1)] ?? appuis[0]
    const v = k <= 0 ? v1 : v0 + ((v1 - v0) * (i - j0)) / Math.max(1, j1 - j0)
    out.push(Math.round(v * 10) / 10)
  }
  return out
}

// ── Événements S3 vers les autres espaces (CONNEXIONS.md) ───────────────────────────────────────────────────────
/** Publie un événement de la console vers les autres espaces (une seule fois par clé). */
export function publierS3(e: EvenementPont, cle: string) {
  publier(e, `admin-${cle}`, maintenant())
}

// ── Contrôles communs aux gestes ────────────────────────────────────────────────────────────────────────────────
/** Lecture seule (Audit, Support sur KYC…) : aucun geste ; sinon le geste transverse exigé. */
export function geste(route: string, quoi: string, p?: Permission): RaisonRefus | null {
  exigerPage(route, quoi)
  if (droitDe(route, roleCourant()).acces === 'lecture') return 'lecture_seule'
  if (p) exiger(p)
  return null
}
export const refus = <R extends string>(raison: R) => ({ ok: false as const, raison })
export const decisionPrise = (quoi: string, motif: string | null): DecisionPrise => {
  const a = agentCourant()
  return { quoi, par: `${nomAgent(a)} · ${NOM_ROLE[roleCourant()]}`, parId: a.id, le: maintenant(), motif }
}
export const ligne = (titre: string, ton: LigneHistorique['ton'] = 'done'): LigneHistorique => ({ titre, le: maintenant(), par: nomAgent(agentCourant()), ton })
const conflit = (lieAgent: string | null | undefined) => R.conflitInterets(agentCourant().id, lieAgent)
const motifOk = (m: string) => R.motifValable(m)

// ── Vendeurs (mêmes boutiques que le jeu d'essai, détaillées) ───────────────────────────────────────────────────
type VendeurBase = Omit<VendeurCourt, 'etiquettes' | 'palier' | 'seuil' | 'statut'> & {
  statut: VendeurCourt['statut']
  base: string[]
  fiche: Omit<FicheVendeur, keyof VendeurCourt | 'sanctions' | 'conflit' | 'journal' | 'bandeau'> & { journal: LigneHistorique[] }
}
const ev = (id: string, gravite: EvenementTrust['gravite'], titre: string, detail: string): EvenementTrust => ({ id, gravite, titre, detail })
const jeuVendeur = (id: string) => VENDEURS.find((v) => v.id === id)!

const BOUTIQUES: VendeurBase[] = [
  {
    id: 'v-tontonpg', nom: 'Tonton PG', categorie: 'Téléphonie', quartier: 'Mvog-Mbi', zone: 'Z10', trustScore: jeuVendeur('v-tontonpg').trustScore, produits: 12, commandes30: 14, litiges: 1, statut: 'ouvert', base: [], plafondDemarrage: null, position: [3.851, 11.521], precision: null, lieAgent: 'a-franck',
    fiche: {
      titulaire: 'Franck Penga', adresse: 'Mvog-Mbi, carrefour Shell, boutique 4', telephone: '+237 6•• •• •• 17', momo: 'MTN MoMo ···· 0 17 · vérifié', kyc: 'Vérifié le 3 août · CNI recto et verso, selfie vidéo · NIU en revue (KYC-0097)', contrat: 'Contrat vendeur v1.2 · signé le 4 août', abonnement: 'Free · offre de découverte jusqu’au 27 nov.', employes: '1 employée · préparation',
      historique: courbe([[0, 58.4], [10, 60.2], [20, 61.9], [29, 62.7]]),
      evenements: [ev('e1', 'ok', '12 commandes prêtes dans le délai', 'Ponctualité · 30 derniers jours'), ev('e2', 'g1', 'BLV-00007 · « C’est prêt » après le délai', 'lundi 5 oct. · Ponctualité'), ev('e3', 'ok', 'Avis 5 étoiles · ITEL AC52', 'jeudi 8 oct. · Satisfaction')],
      commissions: [
        { commande: 'BLV-00008', article: 'ITEL AC52 noir', prix: 20000, commission: 2160, garde: 17840, version: 'Grille du 22 sept. · Bronze · téléphones', etat: 'En route · PQ-Z1-261013-003' },
        { commande: 'BLV-00009', article: 'Chargeur itel 18 W', prix: 14000, commission: 1512, garde: 12488, version: 'Grille du 22 sept. · Bronze · accessoires', etat: 'En route · PQ-Z1-261013-003' },
        { commande: 'BLV-51877', article: 'Écouteurs filaires', prix: 16700, commission: 1804, garde: 14896, version: 'Grille du 22 sept. · Bronze · accessoires', etat: 'Gelé · litige LT-0412' },
      ],
      offres: [
        { titre: 'ITEL AC52 noir', prix: 20000, stock: 3, etat: 'publiee', note: 'attribuée en Z10 et Z1 (coût total livré le plus bas)' },
        { titre: 'Chargeur itel 18 W', prix: 4500, stock: 9, etat: 'publiee', note: 'suivante en Z1' },
        { titre: 'Écouteurs sans fil', prix: 9500, stock: 0, etat: 'brouillon', note: 'demande de création DC-0044 en cours' },
      ],
      litigesListe: [{ id: 'LT-0412', titre: 'BLV-51877 · « Article différent de la photo »', sous: 'Niveau 1 · instruction · 16 700 F gelés' }],
      versements: [{ titre: 'Versé le vendredi 9 octobre · 31 400 F', sous: 'Confirmé par l’opérateur · MTN MoMo ···· 0 17' }, { titre: 'Prochain versement : vendredi 16 octobre', sous: 'Tout ce qui est libéré au plus tard le jeudi 15 octobre à 23 h 59' }],
      journal: [{ titre: 'Trust Score recalculé : 62,5 → 62,7', le: H(-8), par: 'Système' }, { titre: 'Offre ITEL AC52 : stock 4 → 3 (par le vendeur)', le: J(-1), par: 'Tonton PG' }],
    },
  },
  {
    id: 'v-maman-wax', nom: 'Maman Wax Mokolo', categorie: 'Mode et pagnes', quartier: 'Mokolo', zone: 'Z3', trustScore: jeuVendeur('v-maman-wax').trustScore, produits: 34, commandes30: 41, litiges: 1, statut: 'ouvert', base: ['made_in_cameroon'], plafondDemarrage: null, position: [3.873, 11.499], precision: null, lieAgent: null,
    fiche: {
      titulaire: 'Jacqueline Mballa', adresse: 'Marché Mokolo, allée des pagnes, box 22', telephone: '+237 6•• •• •• 52', momo: 'Orange Money ···· 5 52 · vérifié', kyc: 'Vérifié le 30 juil. · CNI recto et verso, selfie vidéo', contrat: 'Contrat vendeur v1.2 · signé le 31 juil.', abonnement: 'Plus · 2 500 F par mois', employes: '2 employées · préparation et photos',
      historique: courbe([[0, 80.1], [14, 79.6], [22, 78.0], [29, 78.4]]),
      evenements: [ev('e1', 'g2', '3 photos reprises d’une autre boutique', 'du 28 sept. au 2 oct. · Qualité'), ev('e2', 'ok', '41 commandes prêtes dans le délai', '30 derniers jours · Ponctualité')],
      commissions: [{ commande: 'BLV-52230', article: 'Pagne wax 6 yards', prix: 28900, commission: 2890, garde: 26010, version: 'Grille du 22 sept. · Argent · mode', etat: 'Au relais · litige LT-0418' }],
      offres: [{ titre: 'Pagne wax 6 yards · lot de 3', prix: 39000, stock: 7, etat: 'moderation', note: 'OF-7794 · photo reprise d’une autre boutique' }, { titre: 'Pagne wax 6 yards', prix: 13500, stock: 22, etat: 'publiee', note: 'attribuée en Z3' }],
      litigesListe: [{ id: 'LT-0418', titre: 'BLV-52230 · « Colis abîmé au comptoir »', sous: 'Niveau 1 · ouvert' }],
      versements: [{ titre: 'Versé le vendredi 9 octobre · 184 300 F', sous: 'Orange Money ···· 5 52' }],
      journal: [{ titre: 'Recours déposé contre la sanction niveau 2', le: H(-20), par: 'Maman Wax Mokolo' }],
    },
  },
  {
    id: 'v-techno', nom: 'Techno Bastos', categorie: 'Téléphonie et informatique', quartier: 'Bastos', zone: 'Z1', trustScore: jeuVendeur('v-techno').trustScore, produits: 63, commandes30: 58, litiges: 0, statut: 'ouvert', base: [], plafondDemarrage: null, position: [3.889, 11.513], precision: null, lieAgent: null,
    fiche: {
      titulaire: 'Ibrahim Moussa', adresse: 'Bastos, avenue Rhin, immeuble Saker', telephone: '+237 6•• •• •• 08', momo: 'MTN MoMo ···· 1 08 · vérifié', kyc: 'Vérifié le 12 juil. · CNI, selfie vidéo, RCCM, NIU', contrat: 'Contrat vendeur v1.2 · signé le 13 juil.', abonnement: 'Pro · 10 000 F par mois', employes: '3 accès nominatifs',
      historique: courbe([[0, 84.0], [15, 86.9], [29, 88.1]]),
      evenements: [ev('e1', 'ok', '58 commandes prêtes dans le délai', '30 derniers jours'), ev('e2', 'ok', 'Note 4,6 sur 31 avis', 'Satisfaction')],
      commissions: [{ commande: 'BLV-52107', article: 'iPhone 15 Pro Max', prix: 163580, commission: 8000, garde: 155580, version: 'Grille du 22 sept. · Or · plafond 8 000 F par article', etat: 'Préparation · rupture, remboursement RB-0031' }],
      offres: [{ titre: 'iPhone 15 Pro Max · 256 Go', prix: 210000, stock: 2, etat: 'moderation', note: 'OF-7781 · prix signalé' }, { titre: 'ITEL AC52 noir', prix: 21000, stock: 6, etat: 'publiee', note: 'suivante en Z1' }],
      litigesListe: [],
      versements: [{ titre: 'Versé le vendredi 9 octobre · 612 900 F', sous: 'MTN MoMo ···· 1 08' }],
      journal: [{ titre: 'Trust Score recalculé : 87,9 → 88,1', le: H(-8), par: 'Système' }],
    },
  },
  {
    id: 'v-saveurs', nom: 'Saveurs du Pays', categorie: 'Épicerie fine', quartier: 'Melen', zone: 'Z6', trustScore: jeuVendeur('v-saveurs').trustScore, produits: 17, commandes30: 9, litiges: 0, statut: 'en_revue', base: ['made_in_cameroon', 'lancement'], plafondDemarrage: { faites: 6, sur: P.plafondDemarrageCommandes }, position: [3.866, 11.489], precision: 'pièce à compléter (KYC-0093)', lieAgent: null,
    fiche: {
      titulaire: 'Odile Nkoulou', adresse: 'Melen, face à l’université, boutique 9', telephone: '+237 6•• •• •• 66', momo: 'MTN MoMo ···· 4 66 · en vérification', kyc: 'CNI verso à compléter (KYC-0093) : versements en attente', contrat: 'Contrat vendeur v1.2 · signé le 21 août', abonnement: 'Free', employes: 'Aucun accès employé',
      historique: courbe([[0, 50], [10, 57.1], [20, 57.6], [29, 55.2]]),
      evenements: [ev('e1', 'g3', 'BLV-52140 · commande non préparée', 'jeudi 8 oct. · basculée vers le vendeur suivant'), ev('e2', 'g3', 'BLV-52166 · commande non préparée', 'samedi 10 oct. · basculée'), ev('e3', 'g1', 'Avertissement (niveau 1)', 'vendredi 2 oct.')],
      commissions: [{ commande: 'BLV-52198', article: 'Jus de bissap 1 L × 6', prix: 9800, commission: 980, garde: 8820, version: 'Offre de découverte · Bronze · épicerie', etat: 'Retirée · se libère jeu. 15 oct.' }],
      offres: [{ titre: 'Miel d’Oku 500 g', prix: 6500, stock: 0, etat: 'brouillon', note: 'demande de création DC-0043' }, { titre: 'Jus de bissap 1 L × 6', prix: 9800, stock: 14, etat: 'publiee', note: 'attribuée en Z6' }],
      litigesListe: [],
      versements: [{ titre: 'Versement en attente : pièce d’identité à compléter', sous: 'Un acteur sans KYC validé n’est pas payé (ADM-CACHEE-31)' }],
      journal: [{ titre: 'Complément demandé : CNI verso illisible', le: H(-2.5), par: 'Armand Kouam' }],
    },
  },
  {
    id: 'v-beaute', nom: 'Beauté Melen', categorie: 'Beauté', quartier: 'Melen', zone: 'Z6', trustScore: jeuVendeur('v-beaute').trustScore, produits: 28, commandes30: 27, litiges: 0, statut: 'ferme', base: [], plafondDemarrage: null, position: [3.862, 11.492], precision: 'réouverture mer. 14 oct. 8 h', lieAgent: null,
    fiche: {
      titulaire: 'Carole Tsogo', adresse: 'Melen, marché, rangée C, box 7', telephone: '+237 6•• •• •• 31', momo: 'Orange Money ···· 3 31 · vérifié', kyc: 'Vérifié le 2 août · CNI recto et verso, selfie vidéo', contrat: 'Contrat vendeur v1.2 · signé le 3 août', abonnement: 'Plus · 2 500 F par mois', employes: 'Aucun accès employé',
      historique: courbe([[0, 72.1], [15, 73.6], [29, 74.0]]),
      evenements: [ev('e1', 'ok', 'Avertissement levé le 30 sept.', 'Sanction niveau 1 · SN-0015'), ev('e2', 'g1', 'Fermeture annoncée la veille', 'samedi 3 oct.')],
      commissions: [{ commande: 'BLV-52241', article: 'Lait corporel 400 ml', prix: 12400, commission: 1240, garde: 11160, version: 'Grille du 22 sept. · Argent · beauté', etat: 'En route · domicile Z6' }],
      offres: [{ titre: 'Crème « Teint parfait »', prix: 6500, stock: 12, etat: 'moderation', note: 'OF-7790 · hydroquinone ?' }, { titre: 'Lait corporel 400 ml', prix: 3900, stock: 18, etat: 'publiee', note: 'non attribuée aujourd’hui (boutique fermée)' }],
      litigesListe: [],
      versements: [{ titre: 'Versé le vendredi 9 octobre · 96 100 F', sous: 'Orange Money ···· 3 31' }],
      journal: [{ titre: 'Fermeture du jour annoncée par la vendeuse', le: H(-6.5), par: 'Beauté Melen', ton: 'cur' }],
    },
  },
  {
    id: 'v-pieces', nom: 'Pièces Auto Biyem', categorie: 'Pièces auto et moto', quartier: 'Biyem-Assi', zone: 'Z6', trustScore: jeuVendeur('v-pieces').trustScore, produits: 0, commandes30: 11, litiges: 0, statut: 'suspendu', base: [], plafondDemarrage: null, position: [3.835, 11.485], precision: null, lieAgent: null,
    fiche: {
      titulaire: 'Rodrigue Ekani', adresse: 'Biyem-Assi, carrefour TKC, magasin 2', telephone: '+237 6•• •• •• 74', momo: 'MTN MoMo ···· 7 74 · vérifié', kyc: 'Vérifié le 19 août · CNI, selfie vidéo, RCCM', contrat: 'Contrat vendeur v1.2 · signé le 20 août', abonnement: 'Free', employes: 'Aucun accès employé',
      historique: courbe([[0, 49.5], [20, 46.8], [27, 42.0], [29, 41.8]]),
      evenements: [ev('e1', 'g3', 'BLV-52011 · commande non préparée', 'lundi 28 sept.'), ev('e2', 'g3', 'BLV-52064 · commande non préparée', 'samedi 3 oct.'), ev('e3', 'g3', 'BLV-52119 · commande non préparée', 'vendredi 9 oct.')],
      commissions: [{ commande: 'BLV-52245', article: 'Kit plaquettes de frein moto', prix: 64500, commission: 4515, garde: 59985, version: 'Grille du 22 sept. · Bronze · auto-moto', etat: 'Payée avant la suspension : honorée' }],
      offres: [{ titre: '11 offres', prix: 0, stock: 0, etat: 'depubliee', note: 'dépubliées jusqu’à la fin de la suspension' }],
      litigesListe: [],
      versements: [{ titre: 'Versements maintenus pour les commandes livrées', sous: 'Vendredi 16 octobre · MTN MoMo ···· 7 74' }],
      journal: [{ titre: 'Suspension niveau 3 appliquée', le: H(-5), par: 'Mireille Ngo Bassong', ton: 'bad' }],
    },
  },
]

// ── KYC ─────────────────────────────────────────────────────────────────────────────────────────────────────────
type DossierBase = Omit<DossierKyc, 'pieces' | 'conflit' | 'echeance'> & { pieces: Omit<PieceKyc, 'vue'>[]; lieAgent: string | null; suspendue?: boolean; /** Identifiant de l'acteur dans son application (pont) : la décision le lui renvoie. */ acteurId?: string }
const piece = (dossier: string, n: number, nature: PieceKyc['nature'], etat: PieceKyc['etat'], recueLe: number, doute: string | null = null, motif: string | null = null): Omit<PieceKyc, 'vue'> => ({ id: `${dossier}-${n}`, nature, etat, doute, motif, recueLe })
const ok = (texte: string): Controle => ({ ton: 'ok', texte })
const doute = (texte: string): Controle => ({ ton: 'doute', texte })
const info = (texte: string): Controle => ({ ton: 'info', texte })

function dossiersInitiaux(): DossierBase[] {
  return [
    {
      id: 'KYC-0091', acteur: 'Hervé F.', titulaire: 'Hervé Fouda', espace: 'livreur', organisation: 'Yafé Express · Z1 Centre-ville · en activation', zone: 'Z1', deposeLe: H(-5), etat: 'a_revoir', lieAgent: null,
      pieces: [piece('KYC-0091', 1, 'cni_recto', 'auto_ok', H(-5)), piece('KYC-0091', 2, 'cni_verso', 'auto_ok', H(-5)), piece('KYC-0091', 3, 'selfie_video', 'a_revoir', H(-5), 'Visage à 0,81 sous le seuil de 0,85 : selfie vidéo à contre-jour'), piece('KYC-0091', 4, 'permis', 'auto_ok', H(-5)), piece('KYC-0091', 5, 'carte_grise', 'auto_ok', H(-5))],
      visage: 0.81, preuveVie: true,
      controles: [ok('Preuve de vie réussie sur la vidéo : clignement et mouvement de tête'), doute('Visage à 0,81 : selfie vidéo à contre-jour, photo de CNI de 2019'), ok('OCR de la CNI : FOUDA Hervé, né le 14 mars 1998 (18 ans révolus)'), ok('CNI valide jusqu’au 11 juin 2029'), ok('Permis catégorie A, cohérent avec une moto'), ok('Carte grise CE 881 HF = plaque déclarée par Yafé Express')],
      dedup: [ok('CNI : aucun autre compte'), ok('Appareil : 1 compte livreur (maximum 1)'), ok('Numéro : rattaché à aucun autre compte'), ok('Liste noire : aucune correspondance (CNI, appareil, numéro)')],
      doublon: null, proposition: { texte: 'Écart d’éclairage probable (contre-jour, photo de 2019). Demander un nouveau selfie vidéo à la lumière du jour, sans casque ni lunettes. Vous décidez.', confiance: 0.64 },
      visiblePar: 'Yafé Express voit seulement « Pièces en vérification » sur la fiche de son livreur, jamais l’image ni le selfie.', complement: null, decision: null,
      historique: [{ titre: 'Pièces déposées depuis l’application livreur', le: H(-5), par: 'Hervé F.' }, { titre: 'Vérification automatique : doute sur le visage', le: H(-4.9), par: 'Système' }],
    },
    {
      id: 'KYC-0088', acteur: 'Relais Obili', titulaire: 'Samuel Etoga', espace: 'relais', organisation: 'Point relais · Z2 Nsam · en activation', zone: 'Z2', deposeLe: H(-26), etat: 'a_revoir', lieAgent: null,
      pieces: [piece('KYC-0088', 1, 'cni_recto', 'auto_ok', H(-26)), piece('KYC-0088', 2, 'cni_verso', 'auto_ok', H(-26)), piece('KYC-0088', 3, 'selfie_video', 'auto_ok', H(-26)), piece('KYC-0088', 4, 'local', 'a_revoir', H(-24), 'Visite physique obligatoire : photos du local prises par l’agent terrain Linda Abena, enseigne à vérifier')],
      visage: 0.93, preuveVie: true,
      controles: [ok('Preuve de vie réussie'), ok('Visage à 0,93 (seuil 0,85)'), ok('CNI valide jusqu’au 2 février 2031'), doute('Local : enseigne « Obili Services » au lieu de « Relais Obili »')],
      dedup: [ok('CNI : aucun autre compte'), ok('Appareil : aucun autre compte'), ok('Liste noire : aucune correspondance')],
      doublon: null, proposition: { texte: 'Pièces conformes ; l’enseigne diffère du nom déclaré mais la visite atteste l’activité. Approuver après avoir vu les photos du local.', confiance: 0.78 },
      visiblePar: 'Le gérant voit l’état de chaque pièce et, en cas de complément, le motif ; l’activation du relais attend l’approbation.', complement: null, decision: null,
      historique: [{ titre: 'Pièces déposées par le gérant', le: H(-26), par: 'Samuel Etoga' }, { titre: 'Photos du local prises en visite', le: H(-24), par: 'Linda Abena' }],
    },
    {
      id: 'KYC-0094', acteur: 'Mboa Logistique', titulaire: 'Ernest Ndzana', espace: 'entreprise', organisation: 'Entreprise de livraison · Z2, Z6 · pilote', zone: 'Z6', deposeLe: H(-2), etat: 'a_revoir', lieAgent: null,
      pieces: [piece('KYC-0094', 1, 'rccm', 'a_revoir', H(-2), 'Dénomination lue « MBOA LOGISTIQUE SARL », déclarée « Mboa Logistique »'), piece('KYC-0094', 2, 'niu', 'auto_ok', H(-2)), piece('KYC-0094', 3, 'cni_recto', 'auto_ok', H(-2)), piece('KYC-0094', 4, 'cni_verso', 'auto_ok', H(-2)), piece('KYC-0094', 5, 'selfie_video', 'auto_ok', H(-2)), piece('KYC-0094', 6, 'mint', 'a_revoir', H(-2), 'Date de validité illisible (OCR 41 %)'), piece('KYC-0094', 7, 'assurance', 'auto_ok', H(-2))],
      visage: 0.9, preuveVie: true,
      controles: [doute('Nom déclaré « Mboa Logistique » ≠ dénomination du RCCM « MBOA LOGISTIQUE SARL »'), ok('NIU au même nom que le RCCM'), doute('Autorisation de transport MINT : validité illisible (aucune souplesse, ADM-P18R-08)'), ok('Assurance véhicules valide jusqu’au 31 mars 2027')],
      dedup: [ok('RCCM : aucun autre compte'), ok('CNI du représentant légal : aucun autre compte'), ok('Liste noire : aucune correspondance')],
      doublon: null, proposition: { texte: 'Demander l’autorisation MINT lisible et l’attestation de nom commercial ; aucun livreur de Mboa Logistique n’est actif tant que le KYC n’est pas complet.', confiance: 0.82 },
      visiblePar: 'Le propriétaire de Mboa Logistique voit chaque pièce, son état et le motif d’un complément dans son portail.', complement: null, decision: null,
      historique: [{ titre: 'Pièces déposées dans le portail entreprise', le: H(-2), par: 'Ernest Ndzana' }],
    },
    {
      id: 'KYC-0096', acteur: 'Boutique Essos Mode', titulaire: 'Grâce Atangana', espace: 'vendeur', organisation: 'Vendeur · Essos (Z9, vente seulement) · inscription', zone: 'Z9', deposeLe: T(-40), etat: 'a_revoir', lieAgent: null,
      pieces: [piece('KYC-0096', 1, 'cni_recto', 'a_revoir', T(-40), 'Doublon : même CNI qu’un compte livreur (Mboa Logistique)'), piece('KYC-0096', 2, 'cni_verso', 'auto_ok', T(-40)), piece('KYC-0096', 3, 'selfie_video', 'auto_ok', T(-40))],
      visage: 0.97, preuveVie: true,
      controles: [ok('Preuve de vie réussie'), ok('Visage à 0,97 sur les deux comptes'), ok('Chaque rôle déclaré : vendeur à l’inscription, livreur dans l’invitation de Mboa Logistique')],
      dedup: [doute('CNI : un compte livreur « Grâce A. » chez Mboa Logistique'), ok('Appareil : 1 compte vendeur et 1 compte livreur (maximum 2 vendeur, 1 livreur)'), ok('Liste noire : aucune correspondance')],
      doublon: { autreCompte: 'Livreur « Grâce A. » · Mboa Logistique · en activation', similarite: 0.97, rolesDeclares: true },
      proposition: { texte: 'Même personne (0,97), deux rôles déclarés, appareil dans les limites : doublon autorisé. Approuver la CNI.', confiance: 0.93 },
      visiblePar: 'La vendeuse voit l’état de ses pièces ; Mboa Logistique ne voit que le statut de vérification de sa livreuse.', complement: null, decision: null,
      historique: [{ titre: 'Pièces déposées à l’étape « Publier »', le: T(-40), par: 'Grâce Atangana' }, { titre: 'Doublon de CNI signalé par la déduplication', le: T(-38), par: 'Système' }],
    },
    {
      id: 'KYC-0097', acteur: 'Tonton PG', titulaire: 'Franck Penga', espace: 'vendeur', organisation: 'Vendeur · Mvog-Mbi (Z10) · passage professionnel', zone: 'Z10', deposeLe: T(-25), etat: 'a_revoir', lieAgent: 'a-franck',
      pieces: [piece('KYC-0097', 1, 'niu', 'a_revoir', T(-25), 'NIU au nom de PENGA Franck ; boutique au nom commercial « Tonton PG »'), piece('KYC-0097', 2, 'rccm', 'auto_ok', T(-25))],
      visage: null, preuveVie: null,
      controles: [ok('RCCM au nom de PENGA Franck, activité commerce de détail'), doute('Nom commercial à rattacher au NIU (attestation de nom commercial ?)')],
      dedup: [ok('NIU : aucun autre compte'), ok('Liste noire : aucune correspondance')],
      doublon: null, proposition: { texte: 'Pièces cohérentes ; le nom commercial se rattache au titulaire. Approuver, par un agent qui ne tient pas cette boutique.', confiance: 0.71 },
      visiblePar: 'Le vendeur voit l’état de ses pièces dans son espace.', complement: null, decision: null,
      historique: [{ titre: 'NIU et RCCM déposés (passage professionnel)', le: T(-25), par: 'Tonton PG' }],
    },
    {
      id: 'KYC-0093', acteur: 'Saveurs du Pays', titulaire: 'Odile Nkoulou', espace: 'vendeur', organisation: 'Vendeur · Melen (Z6) · palier de lancement', zone: 'Z6', deposeLe: H(-3), etat: 'complement', lieAgent: null, suspendue: true,
      pieces: [piece('KYC-0093', 1, 'cni_recto', 'auto_ok', H(-3)), piece('KYC-0093', 2, 'cni_verso', 'complement', H(-3), 'Verso flou', 'Le verso de votre CNI est flou : reprenez-le à plat, sans reflet, les quatre coins visibles.'), piece('KYC-0093', 3, 'selfie_video', 'auto_ok', H(-3))],
      visage: 0.91, preuveVie: true, controles: [ok('Preuve de vie réussie'), ok('Visage à 0,91'), doute('Verso illisible (OCR 38 %)')], dedup: [ok('CNI : aucun autre compte')], doublon: null, proposition: null,
      visiblePar: 'La vendeuse voit « CNI verso à reprendre », le motif et un bouton « Renvoyer » ; ses versements attendent.', complement: { motif: 'Le verso de votre CNI est flou : reprenez-le à plat, sans reflet, les quatre coins visibles.', le: H(-2.5), par: 'Armand Kouam' }, decision: null,
      historique: [{ titre: 'Pièces déposées', le: H(-3), par: 'Odile Nkoulou' }, { titre: 'Complément demandé : CNI verso', le: H(-2.5), par: 'Armand Kouam', ton: 'cur' }],
    },
    {
      id: 'KYC-0085', acteur: 'Josiane E.', titulaire: 'Josiane Essomba', espace: 'livreur', organisation: 'Yafé Express · Z3 Mokolo · active', zone: 'Z3', deposeLe: H(-6), etat: 'approuve', lieAgent: null,
      pieces: [piece('KYC-0085', 1, 'assurance', 'approuvee', H(-6))], visage: null, preuveVie: null,
      controles: [ok('Assureur agréé CIMA vérifié à la main'), ok('Période : 1er oct. 2026 → 30 sept. 2027')], dedup: [ok('Attestation : aucun autre véhicule')], doublon: null, proposition: null,
      visiblePar: 'Yafé Express voit « Assurance vérifiée » sur la fiche du véhicule, sans l’image.', complement: null, decision: { quoi: 'Pièce approuvée', par: 'Armand Kouam · Vérification et modération', parId: 'a-armand', le: H(-3), motif: null },
      historique: [{ titre: 'Pièce déposée depuis l’application livreur', le: H(-6), par: 'Josiane E.' }, { titre: 'Approuvée (pièce vue, empreinte gardée)', le: H(-3), par: 'Armand Kouam' }],
    },
    {
      id: 'KYC-0079', acteur: 'Top Phones Yaoundé', titulaire: 'Candidat vendeur', espace: 'vendeur', organisation: 'Vendeur candidat · Essos (Z9) · inscription', zone: 'Z9', deposeLe: J(-2), etat: 'rejete', lieAgent: null,
      pieces: [piece('KYC-0079', 1, 'rccm', 'rejetee', J(-2), 'Numéro introuvable au format du greffe', 'Le RCCM transmis n’a pas pu être authentifié. Votre inscription ne peut pas être validée. Vous pouvez contester cette décision une fois depuis votre espace.')],
      visage: null, preuveVie: null, controles: [{ ton: 'ko', texte: 'OCR 88 % · numéro introuvable au format du greffe' }], dedup: [ok('Liste noire : aucune correspondance')], doublon: null, proposition: null,
      visiblePar: 'Le candidat voit le motif en clair ; les critères de détection ne lui sont jamais communiqués.', complement: null, decision: { quoi: 'Pièce rejetée · faux document (veto)', par: 'Armand Kouam · Vérification et modération', parId: 'a-armand', le: J(-1), motif: 'Le RCCM transmis n’a pas pu être authentifié. Votre inscription ne peut pas être validée.' },
      historique: [{ titre: 'Rejet : faux document, dossier de sanction SN-0018 ouvert', le: J(-1), par: 'Armand Kouam', ton: 'bad' }],
    },
  ]
}

// ── Demandes d'activation venues du pont (account.requested) ───────────────────────────────────────────────────
/** Pièces attendues par espace, dans l'ordre (R59, R81) ; le pont n'en donne que le nombre. */
const PIECES_ESPACE: Record<EspaceActeur, PieceKyc['nature'][]> = {
  vendeur: ['cni_recto', 'cni_verso', 'selfie_video', 'niu', 'rccm'],
  relais: ['cni_recto', 'cni_verso', 'selfie_video', 'local'],
  entreprise: ['rccm', 'niu', 'cni_recto', 'mint', 'assurance', 'cni_verso', 'selfie_video'],
  livreur: ['cni_recto', 'cni_verso', 'selfie_video', 'permis', 'carte_grise'],
  client: ['cni_recto', 'cni_verso', 'selfie_video'],
}
const ESPACE_LIB: Record<EspaceActeur, string> = { vendeur: 'Vendeur', relais: 'Point relais', entreprise: 'Entreprise de livraison', livreur: 'Livreur', client: 'Client' }
/** Nom lisible d'un acteur du jeu d'essai commun, à partir de son identifiant dans son application. */
function nomActeur(espace: EspaceActeur, id: string): string {
  const a = ACTEURS_DEMO
  if (espace === 'vendeur' && id === a.vendeur.lieu) return a.vendeur.boutique
  if (espace === 'entreprise' && id === a.entreprise.id) return a.entreprise.nom
  if (espace === 'livreur' && (id === a.livreur.id || id === a.livreur.compte)) return a.livreur.vu
  if (espace === 'relais' && id === a.relais.id) return a.relais.nom
  return id
}
/** Un dossier « à revoir » par demande d'activation reçue (une fois par dossier). */
function dossiersDuPont(): DossierBase[] {
  const vus = new Set<string>()
  const l: DossierBase[] = []
  for (const e of evenementsPour('admin')) {
    if (e.type !== 'account.requested' || vus.has(e.dossier)) continue
    vus.add(e.dossier)
    const x = e as Extract<Evenement, { type: 'account.requested' }>
    const natures = PIECES_ESPACE[x.espace].slice(0, Math.max(1, Math.min(x.pieces, PIECES_ESPACE[x.espace].length)))
    const nom = nomActeur(x.espace, x.acteur)
    l.push({
      id: x.dossier, acteur: nom, acteurId: x.acteur, titulaire: nom, espace: x.espace, organisation: `${ESPACE_LIB[x.espace]} · demande d’activation`, zone: ACTEURS_DEMO.vendeur.zone, deposeLe: x.le, etat: 'a_revoir', lieAgent: null,
      pieces: natures.map((n, i) => piece(x.dossier, i + 1, n, 'a_revoir', x.le)),
      visage: null, preuveVie: null, controles: [info(`${x.pieces} pièce${x.pieces > 1 ? 's' : ''} déposée${x.pieces > 1 ? 's' : ''} depuis l’application`)], dedup: [], doublon: null, proposition: null,
      visiblePar: 'L’acteur voit l’état de chaque pièce dans son application ; son compte s’active à l’approbation.', complement: null, decision: null,
      historique: [{ titre: 'Demande d’activation reçue', le: x.le, par: nom }],
    })
  }
  return l
}
/** Dossiers KYC : ceux gardés, puis ceux du pont pas encore touchés par un geste. */
function dossiersTous(): DossierBase[] {
  const gardes = acteursDemo.lire().dossiers
  return [...gardes, ...dossiersDuPont().filter((d) => !gardes.some((g) => g.id === d.id))]
}
/** Un dossier du pont entre dans l'état gardé au premier geste. */
function adopter(id: string) {
  const d = dossiersTous().find((x) => x.id === id)
  if (d && !acteursDemo.lire().dossiers.some((x) => x.id === id)) acteursDemo.ecrire((s) => void s.dossiers.push(structuredClone(d)))
}

// ── Paliers ─────────────────────────────────────────────────────────────────────────────────────────────────────
type PropBase = Omit<PropositionPalier, 'conflit' | 'joursSous' | 'seuil' | 'seuilDescente'> & { lieAgent: string | null }
function propositionsInitiales(): PropBase[] {
  const kevin = [...courbe([[0, 74.2], [12, 72.0], [15, 70.4]], 16), ...courbe([[0, 69.4], [13, 66.4]], 14)]
  return [
    {
      id: 'PT-0014', acteurId: 'l-kevin', acteur: 'Kevin D.', organisation: 'Yafé Express · Z6 Biyem-Assi', espace: 'livreur', sens: 'descente', de: 'confirme', vers: 'nouveau', etat: 'a_valider', score: kevin[kevin.length - 1], historique: kevin, lieAgent: null,
      evenements: [ev('k1', 'g2', 'PQ-Z6-261013-002 · domicile remis après l’heure limite', 'aujourd’hui · Ponctualité · paquet en retard'), ev('k2', 'g3', 'Litige perdu · BLV-52015 · colis mouillé', 'mardi 6 oct. · Qualité'), ev('k3', 'g2', 'Arrivée au relais après le créneau · PQ-Z6-261002-004', 'vendredi 2 oct. · Ponctualité'), ev('k4', 'g1', 'Photo de remise floue', 'mercredi 30 sept. · Qualité')],
      decomposition: [{ critere: 'Ponctualité', v: 17, max: 30 }, { critere: 'Qualité', v: 16, max: 25 }, { critere: 'Litiges', v: 14, max: 20 }, { critere: 'Ancienneté', v: 11, max: 15 }, { critere: 'Formation', v: 8, max: 10 }],
      croisement: [
        { evenement: 'Domicile en retard aujourd’hui', contrepartie: 'Client ••• 2954, palier IFA Standard', historique: 'Client présent à l’adresse ; retard au ramassage de 45 min (Beauté Melen fermée en avance)', lecture: 'relativiser' },
        { evenement: 'Litige perdu BLV-52015', contrepartie: 'Client ••• 6120, palier IFA Plafonné', historique: '4 litiges perdus chez 4 vendeurs ; photo du colis mouillé nette', lecture: 'solide' },
        { evenement: 'Retard au Relais Melen Université', contrepartie: 'Relais Melen Université, Trust 74', historique: 'Relais ouvert à l’heure ; 2 autres livreurs à l’heure ce jour-là', lecture: 'solide' },
      ],
      proposition: { texte: 'Confirmer la descente Confirmé → Nouveau : sans le retard d’aujourd’hui (ramassage tardif), le score reste sous 70 depuis 13 jours. Vous décidez.', confiance: 0.7 },
      contestation: null, decision: null, recours: null, creeeLe: H(-8), echeance: null,
    },
    {
      id: 'PT-0013', acteurId: 'v-pieces', acteur: 'Pièces Auto Biyem', organisation: 'Vendeur · Biyem-Assi (Z6)', espace: 'vendeur', sens: 'contestation', de: 'bronze', vers: 'bronze', etat: 'contestee', score: jeuVendeur('v-pieces').trustScore, historique: courbe([[0, 49.5], [20, 46.8], [27, 42.0], [29, 41.8]]), lieAgent: null,
      evenements: [ev('p1', 'g3', 'BLV-52011 · commande non préparée (contesté)', 'lundi 28 sept.'), ev('p2', 'g3', 'BLV-52064 · commande non préparée', 'samedi 3 oct.'), ev('p3', 'g3', 'BLV-52119 · commande non préparée', 'vendredi 9 oct.')],
      decomposition: [{ critere: 'Ponctualité', v: 9, max: 25 }, { critere: 'Qualité', v: 12, max: 20 }, { critere: 'Satisfaction', v: 11, max: 20 }, { critere: 'Litiges', v: 4, max: 15 }, { critere: 'Documents', v: 4, max: 10 }, { critere: 'Ancienneté', v: 2, max: 10 }],
      croisement: [{ evenement: 'Non-préparation BLV-52011', contrepartie: 'Client ••• 6120, palier IFA Plafonné', historique: 'Le client a annulé par la messagerie 2 h avant l’échéance ; message retrouvé', lecture: 'relativiser' }],
      proposition: { texte: 'Le message d’annulation du client est antérieur à l’échéance : l’événement BLV-52011 peut être annulé. Les deux autres restent comptés.', confiance: 0.76 },
      contestation: { texte: 'La commande BLV-52011 a été annulée par le client lui-même dans la messagerie, avant l’heure. Je demande qu’elle ne compte pas contre moi.', le: J(-2), constats: [ok('Message du client du 28 sept. à 10 h 12, 2 h avant l’échéance'), { ton: 'ko', texte: 'BLV-52064 et BLV-52119 : aucune annulation, non contestées' }, info('Contestation déposée dans le délai (une fois, 7 jours)')] },
      decision: { quoi: 'Événement compté (non-préparation)', par: 'Mireille Ngo Bassong · Médiation', parId: 'a-mireille', le: J(-14), motif: 'Commande non préparée à l’échéance, basculée vers le vendeur suivant.', evenements: ['p1'] }, recours: null, creeeLe: J(-2), echeance: J(-2) + 48 * HEURE,
    },
    {
      id: 'PT-0016', acteurId: 'e-yafe', acteur: 'Yafé Express', organisation: 'Entreprise de livraison · Mokolo', espace: 'entreprise', sens: 'montee', de: 'nouveau', vers: 'confirme', etat: 'observation', score: 72, historique: courbe([[0, 66], [24, 69.8], [25, 70.6], [29, 72]]), lieAgent: null,
      evenements: [ev('w1', 'ok', 'Seuil Confirmé franchi', 'jeudi 8 oct. · tenu depuis 5 jours')], decomposition: [], croisement: [], proposition: { texte: 'Montée automatique, journalisée, si le seuil tient 14 jours.', confiance: 0.9 }, contestation: null, decision: null, recours: null, creeeLe: J(-5), echeance: J(9),
    },
    {
      id: 'PT-0012', acteurId: 'v-techno', acteur: 'Techno Bastos', organisation: 'Vendeur · Bastos (Z1)', espace: 'vendeur', sens: 'montee', de: 'or', vers: 'platine', etat: 'observation', score: jeuVendeur('v-techno').trustScore, historique: courbe([[0, 84.0], [15, 86.9], [29, 88.1]]), lieAgent: null,
      evenements: [ev('t1', 'ok', '58 commandes prêtes dans le délai', '30 derniers jours')], decomposition: [], croisement: [], proposition: { texte: 'Platine dès le seuil tenu 14 jours, puis audit trimestriel (visite).', confiance: 0.6 }, contestation: null, decision: null, recours: null, creeeLe: J(-3), echeance: null,
    },
  ]
}

// ── Sanctions ───────────────────────────────────────────────────────────────────────────────────────────────────
type SanctionBase = Omit<Sanction, 'conflit' | 'quatreYeux'> & { lieAgent: string | null; qy: string | null }
function sanctionsInitiales(): SanctionBase[] {
  const n = (s: Partial<SanctionBase> & Pick<SanctionBase, 'id' | 'acteurId' | 'acteur' | 'espace' | 'zone' | 'niveau' | 'etat' | 'origine' | 'effet'>): SanctionBase => ({ declencheurs: [], historique: [], proposition: null, listeNoire: [], recours: null, debut: null, fin: null, probatoireFin: null, decision: null, lieAgent: null, qy: null, ...s })
  return [
    n({
      id: 'SN-0021', acteurId: 'v-saveurs', acteur: 'Saveurs du Pays', espace: 'vendeur', zone: 'Z6', niveau: 2, etat: 'proposee', origine: 'Proposée par le système · barème vendeur',
      declencheurs: [ev('s1', 'g3', 'BLV-52140 · commande non préparée', 'jeudi 8 oct. · basculée vers le vendeur suivant, client servi'), ev('s2', 'g3', 'BLV-52166 · commande non préparée', 'samedi 10 oct. · basculée, client servi')],
      historique: [{ titre: 'Niveau 1 · avertissement : non-préparation BLV-52102', le: J(-11), par: 'Mireille Ngo Bassong' }],
      proposition: { texte: 'Niveau 2, visibilité réduite : deux non-préparations en 14 jours après un avertissement.', confiance: 0.84 },
      effet: `Offres publiées ; à coût total livré égal, elles passent après celles des autres vendeurs pendant ${P.visibiliteJ} jours. Recours possible une fois.`,
    }),
    n({
      id: 'SN-0023', acteurId: 'v-tontonpg', acteur: 'Tonton PG', espace: 'vendeur', zone: 'Z10', niveau: 1, etat: 'proposee', origine: 'Proposée par le système · barème vendeur', lieAgent: 'a-franck',
      declencheurs: [ev('t1', 'g1', 'BLV-00007 · « C’est prêt » après le délai', 'lundi 5 oct.'), ev('t2', 'g1', 'BLV-00004 · « C’est prêt » après le délai', 'mercredi 30 sept.')],
      proposition: { texte: 'Niveau 1, avertissement : deux « C’est prêt » après le délai en 14 jours.', confiance: 0.8 }, effet: 'Motif écrit, trace au dossier ; aucune restriction.',
    }),
    n({
      id: 'SN-0018', acteurId: 'v-topphones', acteur: 'Top Phones Yaoundé', espace: 'vendeur', zone: 'Z9', niveau: 4, etat: 'proposee', origine: 'Revue KYC · KYC-0079 · faux document (veto)',
      declencheurs: [ev('f1', 'veto', 'Faux document · RCCM', 'lundi 12 oct. · rejeté en Revue KYC par Armand Kouam')],
      proposition: { texte: 'Exclusion (niveau 4) et liste noire : faux document, veto. Aucune offre publiée, aucune commande.', confiance: 0.92 },
      effet: 'Compte fermé ; réinscription refusée sur chaque identifiant de la liste noire. Recours possible une fois.',
      listeNoire: [{ identifiant: 'CNI', valeur: '1188 •••• 0271', effet: 'Réinscription refusée, quel que soit le rôle' }, { identifiant: 'Appareil', valeur: 'empreinte ••• 7F2A', effet: 'Aucun nouveau compte sur cet appareil' }, { identifiant: 'Numéro Mobile Money', valeur: 'MTN ···· 5 63', effet: 'Refusé comme numéro de connexion ou de versement' }, { identifiant: 'RCCM présenté', valeur: 'RC/YAO/2026/••••', effet: 'Refusé à toute nouvelle inscription' }],
    }),
    n({
      id: 'SN-0017', acteurId: 'v-maman-wax', acteur: 'Maman Wax Mokolo', espace: 'vendeur', zone: 'Z3', niveau: 2, etat: 'recours', origine: 'Modération · photos reprises d’une autre boutique',
      declencheurs: [ev('m1', 'g2', '3 photos reprises d’une autre boutique', 'du 28 sept. au 2 oct. · offres dépubliées puis corrigées')],
      historique: [{ titre: 'Niveau 2 validé (visibilité réduite)', le: J(-3), par: 'Franck Penga' }, { titre: 'Recours déposé par la vendeuse', le: H(-20), par: 'Maman Wax Mokolo', ton: 'cur' }],
      effet: `Visibilité réduite pendant ${P.visibiliteJ} jours.`, debut: J(-3), fin: J(-3 + P.visibiliteJ),
      recours: { texte: 'Les photos refusées montraient bien mes pagnes, prises dans ma boutique ; j’ai refait les trois photos sur fond clair le 3 octobre et elles ont été acceptées. Je demande la levée de la visibilité réduite.', le: H(-20) },
      decision: { quoi: 'Niveau 2 validé', par: 'Franck Penga · Direction', parId: 'a-franck', le: J(-3), motif: 'Trois photos reprises d’une autre boutique en cinq jours, malgré le rappel de la modération.' },
    }),
    n({
      id: 'SN-0016', acteurId: 'v-pieces', acteur: 'Pièces Auto Biyem', espace: 'vendeur', zone: 'Z6', niveau: 3, etat: 'vigueur', origine: 'Proposée par le système · 3 non-préparations en 30 jours',
      declencheurs: [ev('p1', 'g3', 'BLV-52011 · commande non préparée (contestée)', 'lundi 28 sept.'), ev('p2', 'g3', 'BLV-52064 · commande non préparée', 'samedi 3 oct.'), ev('p3', 'g3', 'BLV-52119 · commande non préparée', 'vendredi 9 oct.')],
      effet: 'Offres dépubliées ; score gelé ; commandes payées avant la suspension honorées ; versements des commandes livrées payés le vendredi.',
      debut: H(-5), fin: H(-5) + P.suspensionMaxJ * JOUR, probatoireFin: H(-5) + (P.suspensionMaxJ + P.probatoireJ) * JOUR,
      decision: { quoi: 'Suspension niveau 3', par: 'Mireille Ngo Bassong · Médiation', parId: 'a-mireille', le: H(-5), motif: 'Trois commandes payées non préparées en 30 jours glissants, après un niveau 2 : suspension pour protéger les clients.' },
      historique: [{ titre: 'Suspension niveau 3 appliquée', le: H(-5), par: 'Mireille Ngo Bassong', ton: 'bad' }],
    }),
    n({
      id: 'SN-0020', acteurId: 'l-cedric', acteur: 'Cédric M.', espace: 'livreur', zone: 'Z1', niveau: 3, etat: 'vigueur', origine: 'Proposée par le système · preuves de remise',
      declencheurs: [ev('c1', 'veto', 'Fraude aux preuves · photo de remise réutilisée', 'jeudi 8 oct. · deux colis, même photo')],
      effet: 'Aucune mission tant que la suspension court ; Rapide Colis Yaoundé ne peut pas lui en affecter. La sanction vise le livreur, pas l’entreprise.',
      debut: J(-5), fin: J(25), probatoireFin: J(25 + P.probatoireJ),
      decision: { quoi: 'Suspension niveau 3', par: 'Franck Penga · Direction', parId: 'a-franck', le: J(-5), motif: 'Photo de remise réutilisée pour deux colis différents : fraude aux preuves, veto ; suspension.' },
    }),
    n({
      id: 'SN-0015', acteurId: 'v-beaute', acteur: 'Beauté Melen', espace: 'vendeur', zone: 'Z6', niveau: 1, etat: 'levee', origine: 'Proposée par le système · retards',
      decision: { quoi: 'Avertissement levé', par: 'Franck Penga · Direction', parId: 'a-franck', le: J(-13), motif: 'Quatorze jours sans retard de préparation ; les neuf commandes suivantes prêtes dans le délai.' },
      effet: 'Aucune restriction : l’avertissement reste au dossier, sans effet.', historique: [{ titre: 'Niveau 1 validé', le: J(-27), par: 'Franck Penga' }, { titre: 'Levée', le: J(-13), par: 'Franck Penga' }],
    }),
  ]
}

// ── Clients et IFA ──────────────────────────────────────────────────────────────────────────────────────────────
type ClientBase = Omit<FicheClient, 'masque' | 'zone' | 'telephone' | 'proposition' | 'composantes' | 'aProposition'> & { composantes: FicheClient['composantes']; proposition: FicheClient['proposition'] }
const cli = (id: string) => CLIENTS.find((c) => c.id === id)!
function clientsInitiaux(): ClientBase[] {
  const base = { remboursements: [], recours: null, decision: null }
  const comp = (lp: number, rp: number, rn: number, an: number, nr: number) => [
    { libelle: 'Litiges perdus', v: lp, max: 3, faible: false },
    { libelle: 'Litiges retirés après demande de preuve', v: rp, max: 2, faible: false },
    { libelle: 'Remboursements non instruits', v: rn, max: 3, faible: false },
    { libelle: 'Annulations', v: an, max: 5, faible: true },
    { libelle: 'Non-retraits', v: nr, max: 5, faible: true },
  ]
  return [
    { ...base, id: 'c-4217', palier: 'standard', commandes: 9, depuis: J(-72), resume: 'Mvog-Mbi · 9 commandes · litige LT-0412 en cours', momo: 'MTN MoMo ···· 2 17', relaisHabituel: 'Relais Mvog-Ada (Z9)', compteurs: { litigesPerdus: 0, litigesGagnes: 1, retiresApresPreuve: 0, rembNonInstruits: 1, rembMontant: 1800, annulations: 1, nonRetraits: 0, refusRetrait: 0, commandesSansIncident: 7, retrogradations: 0 }, composantes: comp(0, 0, 1, 1, 0), remboursements: [{ id: 'RB-0031', montant: 180280, etat: 'à contresigner' }, { id: 'RB-0032', montant: 16700, etat: 'en attente de la décision LT-0412' }], historique: [{ titre: 'Litige LT-0412 ouvert : en cours, ne pénalise personne', le: J(-20) }, { titre: '5e commande sans incident : paiement au retrait jusqu’à la limite haute', le: J(-41) }, { titre: 'Inscription · palier Standard', le: J(-72) }], proposition: null },
    { ...base, id: 'c-0388', palier: 'eleve', commandes: 14, depuis: J(-118), resume: 'Bastos · 14 commandes · aucun litige perdu', momo: 'Orange Money ···· 3 88', relaisHabituel: 'Relais Bastos Carrefour (Z1)', compteurs: { litigesPerdus: 0, litigesGagnes: 0, retiresApresPreuve: 0, rembNonInstruits: 0, rembMontant: 0, annulations: 0, nonRetraits: 0, refusRetrait: 0, commandesSansIncident: 14, retrogradations: 0 }, composantes: comp(0, 0, 0, 0, 0), historique: [{ titre: 'Standard → Élevé (validé, 12 commandes sans incident)', le: J(-30), par: 'Clarisse Mvondo' }, { titre: 'Inscription · palier Standard', le: J(-118) }], proposition: null },
    {
      ...base, id: 'c-7731', palier: 'standard', commandes: 7, depuis: J(-57), resume: 'Mokolo · 7 commandes · rétrogradation proposée', momo: 'MTN MoMo ···· 9 07', relaisHabituel: 'Relais Mokolo Marché (Z3)',
      compteurs: { litigesPerdus: 3, litigesGagnes: 0, retiresApresPreuve: 1, rembNonInstruits: 2, rembMontant: 5300, annulations: 1, nonRetraits: 0, refusRetrait: 0, commandesSansIncident: 2, retrogradations: 0 }, composantes: comp(3, 1, 2, 1, 0),
      historique: [{ titre: 'Carte Score : rétrogradation proposée', le: J(-1), par: 'Système', ton: 'cur' }, { titre: 'Inscription · palier Standard', le: J(-57) }],
      proposition: {
        vers: 'a_instruire', texte: 'Standard → À instruire : trois litiges perdus contre des vendeurs sans autre litige, un litige retiré après demande de preuve, un second compte rattaché. Vous décidez.', confiance: 0.84, croisementCharge: true,
        croisement: [{ vendeur: 'Maman Wax Mokolo', trust: 78.4, issue: 'perdu', autres: 0 }, { vendeur: 'Techno Bastos', trust: 88.1, issue: 'perdu', autres: 0 }, { vendeur: 'Beauté Melen', trust: 74, issue: 'perdu', autres: 0 }, { vendeur: 'Saveurs du Pays', trust: 55.2, issue: 'retire', autres: 0 }],
        antiContournement: [doute('Identité élargie : un second compte créé le 1er oct. partage le numéro MoMo ···· 9 07 et le relais habituel : ses dossiers comptent ici'), info('Compteur de rétrogradations : 0, permanent, jamais remis à zéro'), info('Seuil absolu de litiges perdus atteint, en plus du ratio (valeurs d’affichage tant que IFA-NABS n’est pas calibré)'), info('Remboursements non instruits : 2 sur 90 jours')],
      },
    },
    { ...base, id: 'c-2954', palier: 'standard', commandes: 4, depuis: J(-26), resume: 'Melen · 4 commandes · nouveau client', momo: 'MTN MoMo ···· 9 54', relaisHabituel: 'Relais Melen Université (Z6)', compteurs: { litigesPerdus: 1, litigesGagnes: 0, retiresApresPreuve: 0, rembNonInstruits: 0, rembMontant: 0, annulations: 0, nonRetraits: 1, refusRetrait: 0, commandesSansIncident: 2, retrogradations: 0 }, composantes: comp(1, 0, 0, 0, 1), historique: [{ titre: 'Inscription · palier Standard', le: J(-26) }], proposition: null },
    { ...base, id: 'c-6120', palier: 'plafonne', commandes: 14, depuis: J(-97), resume: 'Biyem-Assi · 14 commandes · plafonné, recours déposé', momo: 'MTN MoMo ···· 1 20', relaisHabituel: 'Relais Biyem-Assi Lycée (Z6)', compteurs: { litigesPerdus: 4, litigesGagnes: 1, retiresApresPreuve: 1, rembNonInstruits: 0, rembMontant: 0, annulations: 2, nonRetraits: 1, refusRetrait: 2, commandesSansIncident: 3, retrogradations: 2 }, composantes: comp(4, 1, 0, 2, 1), remboursements: [{ id: 'RB-0029', montant: 112000, etat: 'exécuté (LT-0405)' }], recours: { texte: 'Je paie d’avance depuis un mois sans aucun problème ; je demande de pouvoir à nouveau payer au retrait.', le: J(-1) }, historique: [{ titre: 'Recours déposé depuis le support', le: J(-1), ton: 'cur' }, { titre: 'Standard → Plafonné (2e refus de paiement au retrait)', le: J(-33), par: 'Franck Penga', ton: 'bad' }, { titre: 'Standard → À instruire', le: J(-50), par: 'Clarisse Mvondo' }], proposition: null },
  ]
}

// ── Qualité : historiques des livreurs, entreprises et relais (vendeurs : leur fiche) ─────────────────────────────
const TRUST_AUTRES: Record<string, number[] | null> = {
  'l-serge': courbe([[0, 72.4], [29, 74]]), 'l-josiane': courbe([[0, 80.2], [29, 81]]), 'l-herve': null, 'l-junior': courbe([[0, 76.1], [29, 77]]), 'l-ines': courbe([[0, 78.5], [29, 79]]),
  'l-brice': courbe([[0, 77.8], [22, 77.2], [29, 68.6]]), 'l-armel': courbe([[0, 71.4], [29, 72]]), 'l-flore': courbe([[0, 74.0], [29, 75.2]]), 'l-cedric': courbe([[0, 61], [22, 58], [24, 39], [29, 38]]),
  'e-yafe': courbe([[0, 66], [24, 69.8], [25, 70.6], [29, 72]]), 'e-mboa': courbe([[0, 60], [29, 64.5]]), 'e-rapide': courbe([[0, 59], [22, 57], [29, 52]]),
  'r-bastos': courbe([[0, 69], [29, 71]]), 'r-nlongkak': null, 'r-mokolo': courbe([[0, 64], [20, 61], [29, 58]]), 'r-elobi': null, 'r-melen': courbe([[0, 73], [29, 74]]), 'r-obili': null, 'r-biyem': courbe([[0, 70.5], [29, 69]]), 'r-mvogada': courbe([[0, 61], [29, 63]]),
}

// ── État de la démonstration ────────────────────────────────────────────────────────────────────────────────────
interface EtatActeurs {
  dossiers: DossierBase[]
  vues: Record<string, string[]> // agent → pièces ouvertes
  propositions: PropBase[]
  sanctions: SanctionBase[]
  clients: ClientBase[]
  n: number
}
export const acteursDemo = magasin<EtatActeurs>('acteurs', () => ({
  dossiers: dossiersInitiaux(),
  // Armand Kouam a ouvert la CNI du gérant du Relais Obili ce matin (journal du jeu d'essai).
  vues: { 'a-armand': ['KYC-0088-1'] },
  propositions: propositionsInitiales(),
  sanctions: sanctionsInitiales(),
  clients: clientsInitiaux(),
  n: 23,
}))

/** Dossiers KYC à revoir (compteurs et File d'action à l'intégration). */
export const kycARevoir = () => auPerimetre(dossiersTous().filter((d) => d.etat === 'a_revoir'))
/** Propositions de palier à valider (descentes et contestations). */
export const paliersAValider = () => acteursDemo.lire().propositions.filter((p) => p.etat === 'a_valider' || p.etat === 'contestee')
/** Sanctions qui attendent une décision (proposées, en recours). */
export const sanctionsAOuvrir = () => acteursDemo.lire().sanctions.filter((s) => s.etat === 'proposee' || s.etat === 'recours' || s.etat === 'quatre_yeux')

/** Rapproche une sanction à quatre yeux de la décision du second validateur (domaine quatreyeux). */
function quatreYeuxDe(s: SanctionBase): Sanction['quatreYeux'] {
  if (!s.qy) return null
  const d = quatreYeuxDemo.lire().decisions.find((x) => x.id === s.qy)
  if (!d) return null
  return { id: d.id, etat: d.etat === 'refusee' ? 'refusee' : d.etat === 'contresignee' ? 'contresignee' : 'a_contresigner', premier: `${d.premier.agent}`, second: d.second ? d.second.agent : null }
}
/** Une exclusion contresignée s'applique (liste noire active) ; refusée, elle revient « proposée ». */
function reconcilier() {
  const s = acteursDemo.lire()
  const a_faire = s.sanctions.filter((x) => x.etat === 'quatre_yeux' && x.qy)
  for (const x of a_faire) {
    const q = quatreYeuxDe(x)
    if (!q || q.etat === 'a_contresigner') continue
    acteursDemo.ecrire((e) => {
      const y = e.sanctions.find((z) => z.id === x.id)!
      if (q.etat === 'contresignee') {
        y.etat = y.niveau === 4 && y.listeNoire.length && y.decision?.quoi.startsWith('Levée') ? 'levee' : 'vigueur'
        y.debut = maintenant()
        y.historique.push({ titre: `Contresignée par ${q.second} : appliquée`, le: maintenant(), par: q.second ?? '' })
      } else {
        y.etat = 'proposee'
        y.historique.push({ titre: `Refusée par ${q.second} : revient au dossier`, le: maintenant(), par: q.second ?? '', ton: 'bad' })
      }
      y.qy = null
    })
    if (q.etat === 'contresignee') publierS3({ type: 'sanction_decidee', acteurId: x.acteurId, espace: x.espace, niveau: x.niveau, etat: 'vigueur', motif: x.decision?.motif ?? '', recoursJusqua: maintenant() + R.delaiRecours(x.espace) }, `sanction-${x.id}-4y`)
  }
}

const vueDossier = (d: DossierBase): DossierKyc => {
  const vues = new Set(acteursDemo.lire().vues[agentCourant().id] ?? [])
  return { ...d, pieces: d.pieces.map((p) => ({ ...p, vue: vues.has(p.id) })), conflit: conflit(d.lieAgent), echeance: d.suspendue || d.etat !== 'a_revoir' ? null : R.echeanceOuvree(d.deposeLe, P.kycRevueH) }
}

function etiquettes(v: VendeurBase): VendeurCourt['etiquettes'] {
  const s = acteursDemo.lire()
  const e = [...v.base] as VendeurCourt['etiquettes']
  if (s.propositions.some((p) => p.acteurId === v.id && p.sens === 'descente' && p.etat === 'a_valider')) e.push('descente_proposee')
  if (s.sanctions.some((x) => x.acteurId === v.id && x.etat === 'proposee')) e.push('sanction_proposee')
  if (conflit(v.lieAgent)) e.push('conflit')
  return e
}
const ligneVendeur = (v: VendeurBase): VendeurCourt => {
  const lancement = v.base.includes('lancement')
  const palier = lancement ? 'bronze' : R.palierDe(v.trustScore, 'vendeur')
  const enVigueur = acteursDemo.lire().sanctions.find((x) => x.acteurId === v.id && x.etat === 'vigueur' && x.niveau >= 3)
  return { id: v.id, nom: v.nom, categorie: v.categorie, quartier: v.quartier, zone: v.zone, palier, trustScore: v.trustScore, seuil: R.seuilDe(palier === 'bronze' ? 'argent' : palier, 'vendeur'), produits: v.produits, commandes30: v.commandes30, litiges: v.litiges, statut: enVigueur ? 'suspendu' : v.statut, etiquettes: etiquettes(v), plafondDemarrage: v.plafondDemarrage, position: v.position, precision: enVigueur?.fin ? `jusqu’au ${new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Douala', day: 'numeric', month: 'short' }).format(enVigueur.fin)}` : v.precision, lieAgent: v.lieAgent }
}

// ── La source ───────────────────────────────────────────────────────────────────────────────────────────────────
// ── Abonnements des clients (paliers du site) ─────────────────────────────────────────────────────────────────────
const abonnementsDemo = magasin<{ gestes: Record<string, AbonnementClient['gestes']> }>('abonnements', () => ({ gestes: {} }))
const ABONNES: [string, string, string, number, number, AbonnementClient['etat'], number][] = [
  ['AB-0012', 'c-4217', 'prime', 140, 17, 'actif', 9],
  ['AB-0015', 'c-0388', 'plus', 60, 8, 'actif', 4],
  ['AB-0018', 'c-2954', 'duo', 35, 22, 'grace', 6],
  ['AB-0021', 'c-6120', 'business', 210, 3, 'actif', 41],
  ['AB-0009', 'c-7731', 'prime', 400, -1, 'resilie', 0],
]
function abonnementsVus(): AbonnementClient[] {
  const g = abonnementsDemo.lire().gestes
  return ABONNES.map(([id, cl, p, depuisJ, renouvJ, etat, n]) => {
    const d = PALIERS_SITE.find((x) => x.id === p)!
    const c = CLIENTS.find((x) => x.id === cl)!
    return { id, client: c.masque, zone: c.zone, palier: d.nom, prixMois: d.mois, depuis: maintenant() - depuisJ * JOUR, renouvellement: maintenant() + renouvJ * JOUR, etat, commandesMois: n, plafondMois: d.plafond, gestes: g[id] ?? [] }
  })
}

export const demoActeurs: Omit<DomaineActeurs, 'accesActeur' | 'changerAcces'> = {
  async abonnements() {
    exigerPage('abonnements', 'Abonnements des clients')
    const plafond = roleCourant() === 'superviseur' ? null : (etatMembre(agentCourant().id)?.perimetre.plafond ?? null)
    return repondre({ liste: auPerimetre(abonnementsVus()), plafondGeste: plafond })
  },
  async gesteAbonnement(id, montant, motif) {
    exigerPage('abonnements', 'Abonnements des clients')
    if (!['superviseur', 'support'].includes(roleCourant())) throw new AccesRefuse('Geste commercial sur un abonnement', ['superviseur', 'support'])
    const a = abonnementsVus().find((x) => x.id === id)
    if (!a) return refus('inconnu')
    if (motif.trim().length < PARAMETRES.console.motifMin) return refus('motif_court')
    if (!Number.isInteger(montant) || montant <= 0 || montant > a.prixMois) return refus('montant')
    // Plafond du niveau de l'agent (logique-metier/ACCES-CONSOLE.md § 2) : au-delà, la Direction.
    const plafond = roleCourant() === 'superviseur' ? null : (etatMembre(agentCourant().id)?.perimetre.plafond ?? null)
    if (plafond !== null && montant > plafond) return refus('plafond')
    abonnementsDemo.ecrire((s) => void (s.gestes[id] = [...(s.gestes[id] ?? []), { montant, le: maintenant(), par: nomAgent(agentCourant()), motif: motif.trim() }]))
    await journaliser({ action: 'abonnement.geste', objet: `${id} · ${a.client}`, motif: motif.trim(), zone: a.zone, avant: null, apres: `${montant} F · ${a.palier}` })
    publier({ type: 'geste', ticket: id, ref: a.palier, montant }, `admin-geste-${id}-${(abonnementsDemo.lire().gestes[id] ?? []).length}`, maintenant())
    return { ok: true }
  },
  async vendeurs() {
    exigerPage('vendeurs', 'Vendeurs')
    return repondre(auPerimetre(BOUTIQUES).map(ligneVendeur).sort((a, b) => b.litiges - a.litiges || b.commandes30 - a.commandes30))
  },
  async vendeur(id) {
    exigerPage('vendeurs', 'Vendeurs')
    const v = auPerimetre(BOUTIQUES).find((x) => x.id === id)
    if (!v) return repondre(null)
    const l = ligneVendeur(v)
    const sanctions = acteursDemo.lire().sanctions.filter((x) => x.acteurId === id).map((x) => ({ id: x.id, niveau: x.niveau, etat: x.etat, titre: x.origine }))
    const susp = acteursDemo.lire().sanctions.find((x) => x.acteurId === id && x.etat === 'vigueur' && x.niveau >= 3)
    const bandeau: FicheVendeur['bandeau'] = susp ? { ton: 'red', texte: `Suspendu · niveau ${susp.niveau}. ${susp.decision?.motif ?? ''}` } : l.statut === 'ferme' ? { ton: 'amber', texte: `Fermé aujourd’hui, annoncé depuis son espace : ${v.precision}. Ses offres ne sont pas attribuées aujourd’hui ; chaque client bascule vers l’offre suivante au coût total livré.` } : null
    return repondre({ ...l, ...v.fiche, etiquettes: l.etiquettes, statut: l.statut, precision: l.precision, sanctions, conflit: conflit(v.lieAgent), bandeau })
  },
  async demasquerVendeur(id, motif) {
    exiger('demasquer')
    if (!motifOk(motif)) return refus('motif_court')
    const v = BOUTIQUES.find((x) => x.id === id)
    if (!v) throw new Error(`vendeur inconnu : ${id}`)
    await journaliser({ action: 'donnee.demasquer', objet: `${v.nom} · téléphone`, motif, zone: v.zone })
    return { ok: true, valeur: v.fiche.telephone.replace(/•• •• ••/, `${77 + v.nom.length} ${12 + v.zone.length} ${40 + v.produits % 50}`) }
  },

  async kyc() {
    exigerPage('kyc', 'Revue KYC')
    return repondre(auPerimetre(dossiersTous()).map(vueDossier))
  },
  async ouvrirPiece(dossier, pieceId, motif) {
    exiger('piece.consulter')
    if (!motifOk(motif)) return { ok: false, raison: 'motif_court' }
    const k = dossiersTous().find((x) => x.id === dossier)
    if (!k) throw new Error(`dossier inconnu : ${dossier}`)
    const le = maintenant()
    await journaliser({ action: 'piece.consulter', objet: `${dossier} · ${pieceId}`, motif, zone: k.zone })
    const a = agentCourant()
    acteursDemo.ecrire((s) => {
      const l = (s.vues[a.id] ??= [])
      if (!l.includes(pieceId)) l.push(pieceId)
    })
    const quand = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Douala', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(le)
    return { ok: true, lien: { url: `https://p.belivay.com/${pieceId.toLowerCase()}`, expireLe: le + PARAMETRES.console.lienPieceMin * MINUTE, filigrane: `Consulté par ${nomAgent(a)} · ${quand} · ${dossier}` } }
  },
  async deciderKyc(id, d: DemandeKyc) {
    const r = geste('kyc', 'Revue KYC', 'kyc.decider')
    if (r) return refus(r)
    const k = dossiersTous().find((x) => x.id === id)
    if (!k) throw new Error(`dossier inconnu : ${id}`)
    if (k.etat !== 'a_revoir') return refus('deja_traite')
    adopter(id)
    if (conflit(k.lieAgent)) return refus('conflit_interets')
    const vu = vueDossier(k)
    let sanction: string | null = null
    if (d.action === 'approuver') {
      if (!R.approuvable(vu.pieces)) return refus('pieces_non_vues')
      if (k.doublon && !R.doublonAutorise(k.doublon.similarite, k.doublon.rolesDeclares)) return refus('doublon')
      acteursDemo.ecrire((s) => {
        const x = s.dossiers.find((y) => y.id === id)!
        x.etat = 'approuve'
        for (const p of x.pieces) p.etat = 'approuvee'
        x.decision = decisionPrise('Pièces approuvées', null)
        x.historique.push(ligne(`Approuvées : ${x.pieces.length} pièces vues (empreintes gardées), résultat automatique et auteur journalisés`))
      })
      await journaliser({ action: 'kyc.approuver', objet: `${id} · ${vu.pieces.map((p) => p.id).join(', ')}`, zone: k.zone })
    } else {
      if (!motifOk(d.motif)) return refus('motif_court')
      const cibles = d.action === 'rejeter' ? [d.piece] : d.pieces
      if (!cibles.length) return refus('motif_court')
      acteursDemo.ecrire((s) => {
        const x = s.dossiers.find((y) => y.id === id)!
        for (const p of x.pieces.filter((q) => cibles.includes(q.id))) {
          p.etat = d.action === 'rejeter' ? 'rejetee' : 'complement'
          p.motif = d.motif.trim()
        }
        if (d.action === 'complement') {
          x.etat = 'complement'
          x.suspendue = true
          x.complement = { motif: d.motif.trim(), le: maintenant(), par: nomAgent(agentCourant()) }
          x.historique.push(ligne(`Complément demandé (${cibles.length} pièce${cibles.length > 1 ? 's' : ''}) : échéance suspendue`, 'cur'))
        } else {
          x.etat = 'rejete'
          x.decision = decisionPrise(d.raison === 'faux_document' ? 'Pièce rejetée · faux document (veto)' : 'Pièce rejetée', d.motif.trim())
          x.historique.push(ligne(d.raison === 'faux_document' ? 'Rejet : faux document, veto et dossier de sanction' : 'Pièce rejetée avec motif en clair', 'bad'))
        }
      })
      await journaliser({ action: d.action === 'rejeter' ? 'kyc.rejeter' : 'kyc.complement', objet: `${id} · ${cibles.join(', ')}`, motif: d.motif.trim(), zone: k.zone })
      if (d.action === 'rejeter' && d.raison === 'faux_document') {
        const res = await creerSanction({ acteurId: `k-${id}`, acteur: k.acteur, espace: k.espace, zone: k.zone, niveau: 4, motif: d.motif.trim(), origine: `Revue KYC · ${id} · faux document (veto)` })
        sanction = res
      }
      // Livreur : la demande de nouvelle pièce arrive dans son application et chez son entreprise (pont typé).
      if (k.espace === 'livreur' && d.action === 'complement') {
        const sel = k.pieces.find((p) => cibles.includes(p.id) && p.nature === 'selfie_video')
        if (sel) publierS3({ type: 'piece_demandee', piece: 'selfie', motif: d.motif.trim(), jusqua: maintenant() + entier(REGISTRE, 'PHOTO-REVERIF-J', /^jours?/) * JOUR }, `kyc-${id}-piece`)
      }
    }
    const apres = acteursDemo.lire().dossiers.find((y) => y.id === id)!
    publierS3({ type: 'kyc_decide', dossier: id, espace: k.espace, acteur: k.acteurId ?? k.acteur, decision: apres.etat as 'approuve' | 'rejete' | 'complement', pieces: apres.pieces.filter((p) => p.motif).map((p) => ({ nature: p.nature, motif: p.motif })) }, `kyc-${id}-${apres.etat}`)
    return { ok: true, etat: apres.etat, sanction }
  },

  async paliers() {
    exigerPage('paliers', 'Paliers et Trust Score')
    return repondre(
      acteursDemo.lire().propositions.map((p) => {
        const seuil = R.seuilDe(p.de, p.espace)
        const seuilD = R.seuilDescente(p.de, p.espace)
        return { ...p, seuil, seuilDescente: seuilD, joursSous: seuilD === null ? 0 : R.joursSous(p.historique, seuilD), conflit: conflit(p.lieAgent) }
      }),
    )
  },
  async deciderPalier(id, d) {
    const r = geste('paliers', 'Paliers et Trust Score')
    if (r) return refus(r)
    const p = acteursDemo.lire().propositions.find((x) => x.id === id)
    if (!p) throw new Error(`proposition inconnue : ${id}`)
    if (conflit(p.lieAgent)) return refus('conflit_interets')
    const recours = d.action === 'maintenir' || d.action === 'annuler'
    if (recours ? p.etat !== 'contestee' : p.etat !== 'a_valider') return refus('deja_traite')
    if (d.action !== 'revue_terrain' && !motifOk(d.motif)) return refus('motif_court')
    if (d.action === 'confirmer' && !d.evenements.length) return refus('sans_evenement')
    // Contestation : examinée par une personne qui n'a pas pris la décision (ADM-CACHEE-32).
    if (recours && p.decision?.parId === agentCourant().id) return refus('meme_auteur')
    const etat = d.action === 'confirmer' ? 'confirmee' : d.action === 'refuser' ? 'refusee' : d.action === 'revue_terrain' ? 'revue_terrain' : d.action === 'maintenir' ? 'maintenue' : 'annulee'
    acteursDemo.ecrire((s) => {
      const x = s.propositions.find((y) => y.id === id)!
      x.etat = etat
      const NOM: Record<string, string> = { bronze: 'Bronze', argent: 'Argent', or: 'Or', platine: 'Platine', nouveau: 'Nouveau', confirme: 'Confirmé' }
      const quoi = { confirmee: `Descente confirmée · ${NOM[x.de]} → ${NOM[x.vers]}`, refusee: 'Descente refusée', revue_terrain: 'Revue terrain demandée aux Opérations', maintenue: 'Recours : événement maintenu', annulee: 'Recours : événement annulé (le score n’est pas modifié à la main : il est recalculé sans lui)' }[etat]!
      if (recours) x.recours = decisionPrise(quoi, d.motif.trim())
      else x.decision = { ...decisionPrise(quoi, d.motif.trim() || null), evenements: d.evenements }
    })
    await journaliser({ action: `palier.${d.action}`, objet: `${id} · ${p.acteur}`, motif: d.motif.trim() || undefined })
    publierS3({ type: 'palier_decide', acteurId: p.acteurId, espace: p.espace, de: p.de, vers: etat === 'confirmee' ? p.vers : p.de, decision: etat, motif: d.motif.trim() }, `palier-${id}-${etat}`)
    return { ok: true, etat }
  },

  async sanctions() {
    exigerPage('sanctions', 'Sanctions et recours')
    reconcilier()
    return repondre(acteursDemo.lire().sanctions.map((s) => ({ ...s, quatreYeux: quatreYeuxDe(s), conflit: conflit(s.lieAgent) })))
  },
  async deciderSanction(id, d) {
    const r = geste('sanctions', 'Sanctions et recours', 'sanction.decider')
    if (r) return refus(r)
    reconcilier()
    const s = acteursDemo.lire().sanctions.find((x) => x.id === id)
    if (!s) throw new Error(`sanction inconnue : ${id}`)
    if (conflit(s.lieAgent)) return refus('conflit_interets')
    if (!motifOk(d.motif)) return refus('motif_court')
    const surRecours = d.action.startsWith('recours_')
    if (surRecours ? s.etat !== 'recours' : d.action === 'lever' ? s.etat !== 'vigueur' : s.etat !== 'proposee') return refus('deja_traite')
    if (surRecours && s.decision?.parId === agentCourant().id) return refus('meme_auteur')
    const niveau = (d.action === 'niveau_inferieur' || d.action === 'recours_reduire' ? Math.max(1, s.niveau - 1) : s.niveau) as Sanction['niveau']
    // Exclusion et levée d'une liste noire : à quatre yeux (un second validateur d'un autre compte).
    const quatre = (d.action === 'valider' && R.sanctionQuatreYeux(niveau)) || (d.action === 'lever' && s.listeNoire.length > 0)
    let qy: string | null = null
    if (quatre) {
      const q = await demoQuatreYeux.decider({ action: d.action === 'lever' ? 'sanction.lever_liste_noire' : 'sanction.exclure', objet: id, resume: d.action === 'lever' ? `Lever la liste noire de ${s.acteur}` : `Exclure ${s.acteur} (niveau 4) et inscrire ${s.listeNoire.length} identifiants en liste noire`, motif: d.motif.trim(), preuves: s.declencheurs.map((e) => ({ id: e.id, libelle: e.titre, route: 'sanctions', params: { id } })), montant: null, quatreYeux: true, rolesSecond: ['superviseur', 'mediation'] })
      if (!q.ok) return refus('motif_court')
      qy = q.id
    }
    const etat: Sanction['etat'] = quatre ? 'quatre_yeux' : d.action === 'classer' || d.action === 'recours_lever' ? 'classee' : d.action === 'lever' ? 'levee' : 'vigueur'
    acteursDemo.ecrire((e) => {
      const x = e.sanctions.find((y) => y.id === id)!
      x.niveau = niveau
      x.etat = etat
      x.qy = qy
      const quoi = { valider: `Niveau ${niveau} validé`, niveau_inferieur: `Niveau ${niveau} validé (niveau inférieur)`, classer: 'Classée sans suite', recours_maintenir: 'Recours : sanction maintenue', recours_reduire: `Recours : réduite au niveau ${niveau}`, recours_lever: 'Recours : sanction levée', lever: 'Levée de la sanction' }[d.action]
      x.decision = decisionPrise(quoi, d.motif.trim())
      x.historique.push(ligne(quatre ? `${quoi} · première validation, en attente du second validateur (${qy})` : quoi, etat === 'vigueur' ? 'bad' : 'done'))
      if (etat === 'vigueur') {
        x.debut = maintenant()
        x.fin = niveau === 2 ? maintenant() + P.visibiliteJ * JOUR : niveau === 3 ? maintenant() + P.suspensionMaxJ * JOUR : null
        x.probatoireFin = niveau === 3 ? maintenant() + (P.suspensionMaxJ + P.probatoireJ) * JOUR : null
        if (surRecours) x.recours = null
      }
      if (etat === 'classee' || etat === 'levee') x.recours = null
    })
    await journaliser({ action: `sanction.${d.action}`, objet: `${id} · ${s.acteur} · niveau ${niveau}`, motif: d.motif.trim(), zone: s.zone ?? undefined })
    if (!quatre) {
      publierS3({ type: 'sanction_decidee', acteurId: s.acteurId, espace: s.espace, niveau, etat, motif: d.motif.trim(), recoursJusqua: etat === 'vigueur' && !surRecours ? maintenant() + R.delaiRecours(s.espace) : null }, `sanction-${id}-${d.action}`)
      // Livreur suspendu : l'entreprise ne peut plus lui affecter de mission (événement typé du pont).
      if (s.espace === 'livreur' && etat === 'vigueur' && niveau >= 3) publierS3({ type: 'livreur_suspendu', livreurId: s.acteurId, motif: d.motif.trim(), jusqua: maintenant() + P.suspensionMaxJ * JOUR }, `sanction-${id}-livreur`)
    }
    return { ok: true, etat, quatreYeux: qy }
  },
  async proposerSanction(p) {
    // Proposer (Support) ou transmettre depuis la modération, les avis ou la KYC (Vérification) : jamais décider.
    if (!(['superviseur', 'support', 'mediation', 'verification'] as Role[]).includes(roleCourant())) exiger('sanction.decider')
    if (!motifOk(p.motif)) return refus('motif_court')
    const id = await creerSanction(p)
    return { ok: true, id }
  },

  async clients() {
    exigerPage('clients', 'Clients et IFA')
    return repondre(acteursDemo.lire().clients.map((c) => ({ id: c.id, masque: cli(c.id).masque, zone: cli(c.id).zone, palier: c.palier, commandes: c.commandes, depuis: c.depuis, resume: c.resume, aProposition: !!c.proposition && !c.decision })))
  },
  async client(id) {
    exigerPage('clients', 'Clients et IFA')
    const c = acteursDemo.lire().clients.find((x) => x.id === id)
    if (!c) return repondre(null)
    const finance = roleCourant() === 'finance'
    const fiche: FicheClient = { ...c, aProposition: !!c.proposition && !c.decision, masque: cli(id).masque, zone: cli(id).zone, telephone: masquerTelephone(cli(id).telephone), proposition: c.decision ? null : c.proposition }
    // Finance : lecture des remboursements seulement (droits.ts) ; ni l'IFA ni ses raisons.
    if (finance) return repondre({ ...fiche, composantes: [], proposition: null, historique: [], recours: null, compteurs: { ...fiche.compteurs, litigesPerdus: 0, litigesGagnes: 0, retiresApresPreuve: 0, annulations: 0, nonRetraits: 0, retrogradations: 0 } })
    return repondre(fiche)
  },
  async demasquerClient(id, motif) {
    exiger('demasquer')
    exigerPage('clients', 'Clients et IFA')
    if (!motifOk(motif)) return refus('motif_court')
    await journaliser({ action: 'donnee.demasquer', objet: `${cli(id).masque} · téléphone`, motif, zone: cli(id).zone })
    return { ok: true, valeur: cli(id).telephone }
  },
  async deciderIfa(id, d) {
    const r = geste('clients', 'Clients et IFA')
    if (r) return refus(r)
    const c = acteursDemo.lire().clients.find((x) => x.id === id)
    if (!c) throw new Error(`client inconnu : ${id}`)
    if (!motifOk(d.motif)) return refus('motif_court')
    const recours = d.action.startsWith('recours_')
    if (recours ? !c.recours : !c.proposition || c.decision) return refus('deja_traite')
    if (d.action === 'valider') {
      const v = R.retrogradationPossible({ commandes: c.commandes, croisementCharge: !!c.proposition?.croisementCharge })
      if (v !== 'ok') return refus(v)
    }
    const palier: FicheClient['palier'] = d.action === 'valider' ? c.proposition!.vers : d.action === 'recours_relever' ? 'a_instruire' : c.palier
    acteursDemo.ecrire((s) => {
      const x = s.clients.find((y) => y.id === id)!
      const quoi = { valider: 'Rétrogradation validée', refuser: 'Rétrogradation refusée', recours_maintenir: 'Recours : palier maintenu', recours_relever: 'Recours : relevé à « À instruire »' }[d.action]
      x.decision = recours ? x.decision : decisionPrise(quoi, d.motif.trim())
      if (d.action === 'valider') x.compteurs.retrogradations++
      x.palier = palier
      if (recours) x.recours = null
      x.historique.unshift(ligne(quoi, d.action === 'valider' ? 'bad' : 'done'))
    })
    await journaliser({ action: `ifa.${d.action}`, objet: `${cli(id).masque} · ${palier}`, motif: d.motif.trim(), zone: cli(id).zone })
    const plafond = R.plafondRetrait({ commandesSansIncident: c.compteurs.commandesSansIncident, refusRetrait: c.compteurs.refusRetrait, palier })
    publierS3({ type: 'ifa_decide', client: id, palier, avantages: plafond === null ? 'paiement d’avance requis' : `paiement au retrait jusqu’à ${plafond} F` }, `ifa-${id}-${d.action}`)
    return { ok: true, palier }
  },

  async qualite() {
    exigerPage('qualite', 'Qualité des acteurs')
    const s = acteursDemo.lire()
    const ouvertes = (id: string) => s.sanctions.filter((x) => x.acteurId === id && ['proposee', 'quatre_yeux', 'recours', 'vigueur'].includes(x.etat)).length
    const l: ActeurQualite[] = [
      ...BOUTIQUES.map((v) => ({ id: v.id, nom: v.nom, espace: 'vendeur' as const, zone: v.zone, organisation: null, score: v.trustScore, palier: ligneVendeur(v).palier, historique: v.fiche.historique, veto: false, sanctionsOuvertes: ouvertes(v.id), route: 'vendeurs', params: { id: v.id } })),
      ...ENTREPRISES.map((e) => ({ id: e.id, nom: e.nom, espace: 'entreprise' as const, zone: e.zones[0], organisation: `${e.livreurs} livreurs`, score: TRUST_AUTRES[e.id]?.at(-1) ?? null, palier: TRUST_AUTRES[e.id] ? R.palierDe(TRUST_AUTRES[e.id]!.at(-1)!, 'entreprise') : null, historique: TRUST_AUTRES[e.id] ?? [], veto: false, sanctionsOuvertes: ouvertes(e.id), route: 'entreprises', params: { id: e.id } })),
      ...LIVREURS.map((l) => ({ id: l.id, nom: l.nom, espace: 'livreur' as const, zone: l.zones[0], organisation: l.entreprise, score: TRUST_AUTRES[l.id]?.at(-1) ?? null, palier: TRUST_AUTRES[l.id] ? R.palierDe(TRUST_AUTRES[l.id]!.at(-1)!, 'livreur') : null, historique: TRUST_AUTRES[l.id] ?? [], veto: l.id === 'l-cedric', sanctionsOuvertes: ouvertes(l.id), route: 'livreurs', params: { id: l.id } })),
      ...RELAIS.map((r) => ({ id: r.id, nom: r.nom, espace: 'relais' as const, zone: r.zone, organisation: r.gerant, score: TRUST_AUTRES[r.id]?.at(-1) ?? null, palier: null, historique: TRUST_AUTRES[r.id] ?? [], veto: false, sanctionsOuvertes: ouvertes(r.id), route: 'relais', params: { id: r.id } })),
    ]
    return repondre(auPerimetre(l))
  },
}

/** Ouvre un dossier de sanction proposé (niveau 4 : liste noire préparée, à quatre yeux). */
async function creerSanction(p: { acteurId: string; acteur: string; espace: EspaceActeur; zone: CodeZone | null; niveau: Sanction['niveau']; motif: string; origine: string }): Promise<string> {
  let id = ''
  acteursDemo.ecrire((s) => {
    s.n++
    id = `SN-${String(s.n).padStart(4, '0')}`
    s.sanctions.unshift({
      id, acteurId: p.acteurId, acteur: p.acteur, espace: p.espace, zone: p.zone, niveau: p.niveau, etat: 'proposee', origine: p.origine,
      declencheurs: [{ id: 'd1', gravite: p.niveau === 4 ? 'veto' : 'g3', titre: p.origine, detail: p.motif }],
      historique: [{ titre: `Dossier ouvert : ${p.origine}`, le: maintenant(), par: nomAgent(agentCourant()) }],
      proposition: null, effet: p.niveau === 4 ? 'Exclusion et liste noire (CNI, appareil, numéro Mobile Money, RCCM), à quatre yeux.' : `Niveau ${p.niveau} proposé : un humain décide, motif écrit, recours une fois.`,
      listeNoire: p.niveau === 4 ? [{ identifiant: 'CNI', valeur: '•••• (pièce du dossier)', effet: 'Réinscription refusée, quel que soit le rôle' }, { identifiant: 'Appareil', valeur: 'empreinte de l’appareil d’inscription', effet: 'Aucun nouveau compte sur cet appareil' }, { identifiant: 'Numéro Mobile Money', valeur: 'numéro de versement déclaré', effet: 'Refusé comme numéro de connexion ou de versement' }] : [],
      recours: null, debut: null, fin: null, probatoireFin: null, decision: null, lieAgent: BOUTIQUES.find((b) => b.id === p.acteurId)?.lieAgent ?? null, qy: null,
    })
  })
  await journaliser({ action: 'sanction.proposer', objet: `${id} · ${p.acteur} · niveau ${p.niveau}`, motif: p.motif, zone: p.zone ?? undefined })
  return id
}
export { creerSanction }
/** Agent qui n'est pas le connecté, pour dire à qui revient un dossier en conflit d'intérêts. */
export const autreAgentVerification = () => nomAgent(agent('a-armand'))

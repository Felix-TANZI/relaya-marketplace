// DONNÉES DE DÉMONSTRATION — domaine « contrat » (ENT-P03) : fiche légale de Yafé Express, pièces (statut, motif,
// expiration lue dans alerte_expiration_piece), lettre d'engagement de la phase pilote et grille signées (le contrat
// définitif attend le bilan conjoint, ENT-02-R14), chaîne d'activation calculée sur les données (ENT-RG-R16). Selon le
// scénario de la console (compte.ts) : en configuration, la lettre et la grille sont à signer et le NIU a été rejeté
// (ENT-RG-R40) ; suspendu, l'autorisation de transport a expiré. Les gestes de l'entreprise sont gardés par scénario.
// L'assurance des véhicules se suit véhicule par véhicule (ENT-P08) : la ligne en donne l'état d'ensemble.
import type { ChampFiche, DomaineContrat, EtapeActivation, FicheEntreprise, Piece, VersionContrat } from '../donnees/domaines/contrat'
import { PARAMETRES } from '../calculs/registre'
import { PARAMETRES_FLOTTE } from '../calculs/flotte'
import { HEURE, JOUR } from '../calculs/temps'
import { maintenant } from './horloge'
import { ENTREPRISE, T } from './jeu-essai'
import { exiger, roleCourant } from './acces'
import { compteDemo, etatCompte } from './compte'
import { signer } from './journal'
import { livreurDisponible, livreursDemo } from './livreurs'
import { magasin, repondre } from './stockage'
import { vehiculesVus } from './vehicules'
import { demanderActivation } from './pont-console'
import { ACTEURS_DEMO } from './pont'
import { zonesVues } from './zones'

const P = PARAMETRES_FLOTTE
type Reprise = Partial<Pick<Piece, 'statut' | 'motif' | 'envoyeeLe' | 'verifieeLe' | 'revueAvant' | 'fichier' | 'expireLe'>>

export const contratDemo = magasin('contrat', () => ({
  // Gestes faits, par scénario (« pilote:LE-1 ») : signatures, pièces envoyées.
  signatures: {} as Record<string, number>,
  pieces: {} as Record<string, Reprise>,
  fiche: null as FicheEntreprise | null,
}))
const scenario = () => compteDemo.lire().scenario ?? 'pilote'

const CLAUSES = [
  'Objet : ramassage, transport, dépôt au relais, remise à domicile, retours et transferts.',
  'Partenariat non exclusif ; non-sollicitation des clients et vendeurs pendant le contrat et 12 mois après.',
  'Grille annexée, sous les plafonds BelivaY, en lecture seule ; toute évolution annoncée 30 jours avant, jamais rétroactive.',
  'Délais : acceptation, ramassage et remise dans la promesse ; dépôt avant la fermeture du relais.',
  'Protocole : contrôle, emballage, codes et QR par colis, photo à chaque changement de main, zéro espèce, anonymat du client.',
  'Responsabilité du colis de la remise par le vendeur au dépôt ; assurance marchandises obligatoire au palier Or.',
  'Règlement chaque vendredi par Mobile Money ou virement, sans frais, sur un moyen au nom de l’entreprise.',
  'Litiges : dossier, preuves, réponse sous 48 h, médiation, décision motivée, recours une fois ; droit OHADA, juridictions de Yaoundé.',
  'Données : loi n° 2024/017 ; effacement en fin de contrat, preuves gardées 180 jours.',
  'Durée indéterminée ; résiliation avec préavis ; suspension sans préavis en cas de manquement grave ; missions en cours honorées.',
]

function versionsDeBase(): VersionContrat[] {
  const config = scenario() === 'configuration'
  const signe = ENTREPRISE.debutPilote - JOUR
  return [
    { id: 'LE-1', genre: 'lettre_engagement', version: 'v1', statut: config ? 'a_signer' : 'signe', signeLe: config ? null : signe, signataires: config ? [] : ['Gaëlle Wankeu', 'BelivaY SARL'], clauses: CLAUSES },
    { id: 'GR-1', genre: 'grille', version: 'v1', statut: config ? 'a_signer' : 'signe', signeLe: config ? null : signe, signataires: config ? [] : ['Gaëlle Wankeu', 'BelivaY SARL'] },
  ]
}

function versions(): VersionContrat[] {
  const sc = scenario()
  const sig = contratDemo.lire().signatures
  return versionsDeBase().map((v) => (sig[`${sc}:${v.id}`] ? { ...v, statut: 'signe', signeLe: sig[`${sc}:${v.id}`], signataires: ['Gaëlle Wankeu', 'BelivaY SARL'] } : v))
}

function piecesDeBase(t: number): Piece[] {
  const sc = scenario()
  const verifie = ENTREPRISE.debutPilote - 2 * JOUR
  const p = (type: string, libelle: string, prouve: string, x: Partial<Piece> = {}): Piece => ({ type, libelle, prouve, statut: 'valide', motif: null, expireLe: null, reserveeProprietaire: false, requise: true, envoyeeLe: verifie - 6 * HEURE, verifieeLe: verifie, revueAvant: null, fichier: null, route: null, ...x })
  const vs = vehiculesVus().filter((v) => v.type !== 'velo')
  const expirees = vs.filter((v) => v.statut === 'expire').length
  const bientot = vs.filter((v) => v.statut !== 'expire' && v.assuranceJusqua !== null && v.assuranceJusqua - t <= P.alerteAssuranceJours * JOUR).length
  return [
    p('rccm', 'Registre du commerce (RCCM)', 'L’existence légale de l’entreprise et sa dénomination.'),
    p('niu', 'Numéro d’identifiant unique (NIU)', 'Le numéro fiscal : aucun versement sans NIU.', sc === 'configuration' ? { statut: 'refusee', motif: 'Le NIU ne correspond pas à la dénomination inscrite au RCCM : envoyez l’attestation à jour.', verifieeLe: T(-5 * 60) } : {}),
    p('identite_gerant', 'Pièce d’identité du gérant et selfie', 'Que la gérante est bien la personne qui ouvre le compte (preuve de vie).', { reserveeProprietaire: true, expireLe: t + 1100 * JOUR }),
    p('adresse', 'Justificatif d’adresse et de l’agence', 'L’adresse opérationnelle et l’agence (une visite est possible).'),
    p('mint', 'Autorisation de transport (MINT)', 'Le droit de transporter des marchandises pour autrui.', { expireLe: sc === 'suspendu' ? t - 14 * HEURE : t + 24 * JOUR }),
    p('assurance_vehicules', 'Assurance des véhicules', 'Que chaque véhicule motorisé est assuré ; suivie véhicule par véhicule.', {
      requise: false,
      route: 'vehicules',
      statut: expirees ? 'expiree' : bientot ? 'expire_bientot' : 'valide',
      motif: expirees ? `${expirees} véhicule(s) avec une assurance expirée : retirés de l’affectation.` : bientot ? `${bientot} véhicule(s) à renouveler bientôt.` : null,
    }),
    p('assurance_marchandises', 'Assurance marchandises', 'La couverture des colis au-dessus du plafond : exigée au palier Or.', { requise: false, statut: 'non_exigee', envoyeeLe: null, verifieeLe: null }),
    p('reglement', 'Moyen de règlement au nom de l’entreprise', 'Où BelivaY verse chaque vendredi : titulaire vérifié par micro-versement.', sc === 'configuration' ? { statut: 'en_revue', verifieeLe: null, envoyeeLe: T(-26 * 60), revueAvant: plusHeuresOuvrees(T(-26 * 60), P.revueHumaineH) } : {}),
    p('photo_agence', 'Photo de l’agence et point de stockage de nuit', 'Où dorment les colis la nuit ; visite obligatoire avant le palier Or.', { requise: false }),
  ]
}

/** Heures ouvrées BelivaY : toutes les heures sauf le dimanche (DP-56 Q-53). */
export function plusHeuresOuvrees(depuis: number, heures: number): number {
  let t = depuis
  let reste = heures
  while (reste > 0) {
    t += HEURE
    if (new Date(t + HEURE).getUTCDay() !== 0) reste--
  }
  return t
}

/** Pièces vues par le serveur : gestes appliqués, échéances recalculées (à renouveler, expirée), identité réservée. */
export function pieces(t = maintenant()): Piece[] {
  const sc = scenario()
  const reprises = contratDemo.lire().pieces
  return piecesDeBase(t).map((b) => {
    const p = { ...b, ...reprises[`${sc}:${b.type}`] }
    if ((p.statut === 'valide' || p.statut === 'expire_bientot') && p.expireLe !== null) p.statut = p.expireLe <= t ? 'expiree' : p.expireLe - t <= P.alertePieceJours * JOUR ? 'expire_bientot' : 'valide'
    return p
  })
}

const ficheDeBase = (): FicheEntreprise => ({
  nomLegal: 'YAFE EXPRESS SARL',
  rccm: 'RC/YAO/2024/B/1187',
  niu: 'M062412345678Q',
  responsable: 'Gaëlle Wankeu, gérante',
  adresse: 'Carrefour Mokolo-Elobi, Yaoundé',
  agence: 'Agence Yafé Express, Mokolo',
  stockageNuit: 'Agence Yafé Express, carrefour Mokolo-Elobi',
  telephone: '+237 6 77 00 00 01',
  referenceContrat: 'BLV-ENT-2026-0007',
  enVerification: [],
})

/** Chaîne d'activation, calculée sur les données (ENT-RG-R16) ; l'étape bloquante porte le motif du rejet. */
export function chaineActivation(): EtapeActivation[] {
  const ps = pieces()
  const vs = versions()
  const compte = etatCompte()
  const manquantes = ps.filter((p) => p.requise && !['valide', 'expire_bientot'].includes(p.statut))
  const rejetee = ps.find((p) => p.requise && p.statut === 'refusee')
  const lettre = vs.find((v) => v.genre === 'lettre_engagement' || v.genre === 'contrat')
  const zones = zonesVues().filter((z) => z.exploitee && z.etat === 'ouverte')
  const livreurs = livreursDemo.lire().livreurs.filter((l) => livreurDisponible(l.id))
  const grille = vs.find((v) => v.genre === 'grille')
  const reglement = ps.find((p) => p.type === 'reglement')!
  const actif = compte.etat !== 'configuration'
  return [
    { id: 'conformite', fait: !manquantes.length && lettre?.statut === 'signe', detail: manquantes.length ? manquantes.map((p) => p.libelle).join(', ') : lettre?.statut === 'signe' ? 'Pièces vérifiées, lettre d’engagement signée' : 'Lettre d’engagement à signer', route: 'contrat', params: { t: manquantes.length ? 'pieces' : 'contrat' }, bloquant: rejetee?.motif ?? null },
    { id: 'zones', fait: zones.length > 0, detail: zones.length ? zones.map((z) => z.code).join(', ') : 'Aucune zone ouverte avec un livreur', route: 'zones' },
    { id: 'flotte', fait: livreurs.length > 0, detail: livreurs.length ? `${livreurs.length}` : 'Aucun livreur activé', route: 'flotte' },
    { id: 'grille', fait: grille?.statut === 'signe', detail: grille?.statut === 'signe' ? 'Grille v1 en vigueur' : 'Grille à signer', route: 'contrat', params: { t: 'contrat' } },
    { id: 'reglement', fait: reglement.statut === 'valide', detail: reglement.statut === 'en_revue' ? 'En vérification' : reglement.statut === 'valide' ? 'Vérifié' : 'À envoyer', route: 'contrat', params: { t: 'pieces' } },
    { id: 'activation', fait: actif, detail: actif ? 'Activée par BelivaY' : 'BelivaY active le compte quand tout est prêt', route: 'etat', par: actif ? 'Console BelivaY · Aureon' : null, le: actif ? ENTREPRISE.debutPilote : null },
  ]
}

const ok = { ok: true as const }
const non = <R extends string>(raison: R) => repondre({ ok: false as const, raison })

export const demoContrat: DomaineContrat = {
  async contrat() {
    const proprio = roleCourant() === 'proprietaire'
    // La pièce d'identité n'est rendue qu'à la propriétaire (ENT-P03R-03) : aux autres, rien d'elle.
    return repondre({ versions: versions(), pieces: pieces().filter((p) => proprio || !p.reserveeProprietaire) })
  },
  async accepter(versionId) {
    exiger(['proprietaire'], 'Signer le contrat')
    const v = versions().find((x) => x.id === versionId)
    if (!v || v.statut !== 'a_signer') return non('statut')
    contratDemo.ecrire((s) => void (s.signatures[`${scenario()}:${versionId}`] = maintenant()))
    signer('contract.accepted', 'contrat:' + versionId, 'statut', 'à signer', 'signé')
    return repondre(ok)
  },
  async fiche() {
    return repondre(contratDemo.lire().fiche ?? ficheDeBase())
  },
  async modifierFiche(champs) {
    exiger(['proprietaire'], 'Modifier la fiche')
    const avant = contratDemo.lire().fiche ?? ficheDeBase()
    const entrees = Object.entries(champs) as [ChampFiche, string][]
    if (entrees.some(([, v]) => !v.trim())) return non('vide')
    if (champs.telephone !== undefined && !/^\+237 ?6( ?\d){8}$/.test(champs.telephone.trim())) return non('telephone')
    const changes = entrees.filter(([k, v]) => avant[k] !== v.trim())
    const legaux = changes.map(([k]) => k).filter((k): k is 'nomLegal' | 'rccm' | 'niu' => k === 'nomLegal' || k === 'rccm' || k === 'niu')
    const t = maintenant()
    contratDemo.ecrire((s) => {
      const f = { ...(s.fiche ?? ficheDeBase()) }
      for (const [k, v] of changes) (f as unknown as Record<string, string>)[k] = v.trim()
      f.enVerification = [...new Set([...f.enVerification, ...legaux])]
      s.fiche = f
      // Nom, RCCM ou NIU repassent en vérification (ENT-P03R-02) ; les missions continuent.
      for (const k of legaux) s.pieces[`${scenario()}:${k === 'niu' ? 'niu' : 'rccm'}`] = { statut: 'en_revue', motif: null, envoyeeLe: t, verifieeLe: null, revueAvant: plusHeuresOuvrees(t, P.revueHumaineH) }
    })
    for (const [k, v] of changes) signer('company.profile_updated', 'entreprise:' + ENTREPRISE.id, k, avant[k] as string, v.trim())
    return repondre({ ...ok, enVerification: legaux })
  },
  async envoyerPiece(type, f) {
    exiger(['proprietaire'], 'Envoyer une pièce')
    const p = pieces().find((x) => x.type === type)
    if (!p || !['manquante', 'refusee', 'expire_bientot', 'expiree'].includes(p.statut) || p.route) return non('statut')
    if (f.type !== 'application/pdf' && !f.type.startsWith('image/')) return non('format')
    if (f.taille > PARAMETRES.acces.tailleMaxPieceMo * 1024 * 1024) return non('taille')
    if (!f.lisible) return non('illisible') // 422 : l'aperçu doit être lisible (ENT-P03R-01)
    const t = maintenant()
    const reprise: Reprise = { statut: 'en_revue', motif: null, envoyeeLe: t, verifieeLe: null, revueAvant: plusHeuresOuvrees(t, P.revueHumaineH), fichier: { nom: f.nom, taille: f.taille, type: f.type }, expireLe: p.expireLe && p.expireLe > t ? p.expireLe : null }
    contratDemo.ecrire((s) => void (s.pieces[`${scenario()}:${type}`] = reprise))
    signer('document.submitted', 'piece:' + type, 'statut', p.statut, 'en vérification')
    // Vers la console (R81) : les pièces en vérification de l'entreprise attendent la revue KYC de BelivaY.
    demanderActivation('entreprise', ACTEURS_DEMO.entreprise.id, `PIECES-${ACTEURS_DEMO.entreprise.id}-${type}`, pieces().filter((x) => x.statut === 'en_revue').length, t)
    return repondre({ ...ok, piece: pieces().find((x) => x.type === type)! })
  },
  async activation() {
    return repondre(chaineActivation())
  },
}

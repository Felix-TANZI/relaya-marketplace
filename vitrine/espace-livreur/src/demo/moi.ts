// DONNÉES DE DÉMONSTRATION — domaine « moi » : Serge, moto CE 482 KM, zone Z1 Centre-ville. Activation, certification et
// dates des pièces viennent du dossier d'accès (domaine « acces », LIV-04-R13 : CNI 11/03/2030, permis 02/08/2029,
// assurance 14/03/2027) : un seul dossier. Les états des pièces se calculent à la lecture (comme la tâche planifiée de
// minuit du serveur) ; une pièce envoyée est vérifiée automatiquement après KYC-AUTO-MIN minutes.
// DP-66 : une pièce ne se renvoie que si elle est renvoyable (refusée, demandée par l'entreprise, expirée ou bientôt) ;
// la photo ne change que par un selfie demandé par l'entreprise (pont : « piece_demandee ») ; le départ est une demande
// avec motif, préavis DEPART-PREAVIS-J, clôturée par l'entreprise (pont : « depart_kit », « depart_clos »).
// DP-67 : nouvelle photo demandée avec un délai PHOTO-REVERIF-J (« reverification », puis photoBloquee) ; préavis où il
// travaille jusqu'à la veille du dernier jour ; constat du kit (pont : « depart_kit ») et contestation de la retenue
// (« kit_conteste ») ; dernier versement estimé pendant le préavis (calculs/depart.ts), figé à la clôture
// (« depart_clos »), fait (« versement_fait »). Situations : ?demo=preavis, depart_clos, photo, photo_retard.
import { photoBloque } from '../calculs/absence'
import { affectationJusqua, constatJusqua, dernierVersement, vendrediSuivant } from '../calculs/depart'
import { PARAMETRES } from '../calculs/registre'
import { HEURE, JOUR, ajouterMois, debutDuJour, jourDe, yaounde } from '../calculs/temps'
import { MOTIFS_DEPART, type Depart, type DernierVersement, type DomaineMoi, type EtatPiece, type IdPiece, type MotifDepart, type Piece, type PreferencesCompte, type Profil } from '../donnees/domaines/moi'
import { etatAcces } from './acces'
import { etatEmploi, NOMS_ZONES, suspensionEnCours } from './emploi'
import { maintenant } from './horloge'
import { CONTEXTE, REJOUEURS, entier, parametre } from './horsligne'
import { PAQUETS } from './historique'
import { CODE_SMS_DEMO } from './jeu-essai'
import { publier } from './pont'
import { scenario } from './scenario'
import { departSerge, etatSession } from './session'
import { identite, masquerTel } from '@client/compte/etat'
import { etatTournee } from './tournee'
import { magasin, repondre } from './stockage'

type PieceGardee = Omit<Piece, 'etat' | 'demandee' | 'renvoyable'> & { verifiee: boolean; refusee: string | null }
/** Demande de départ gardée ; conditions, échéances et versement estimé se calculent à la lecture. */
export interface DepartDemo {
  id: string
  /** Absent : demandé par le livreur ; « entreprise » : fin de contrat décidée par son employeur (pont : fin_contrat). */
  initiative?: 'entreprise'
  demandeLe: number
  motif: MotifDepart
  texte: string | null
  preavisJusqua: number
  etat: 'demande' | 'close'
  closLe: number | null
  closPar: 'entreprise' | 'admin' | null
  versementLe: number | null
  kit: Omit<Depart['kit'], 'constatJusqua'>
  kitNonConteste: boolean
  versementFige: Omit<DernierVersement, 'faitLe'> | null // figé à la clôture (pont : depart_clos)
  faitLe: number | null // versement Mobile Money fait (pont : versement_fait)
}
/** Demande de l'entreprise sur une pièce ; « jusqua » : fin du délai PHOTO-REVERIF-J (selfie). */
export interface DemandeEntreprise {
  le: number
  motif: string
  jusqua: number | null
}
/** Le dossier d'accès de Serge (domaine « acces ») : activation, certification, dates des pièces. */
const dossier = () => etatAcces.lire().serge
const expiration = (id: string) => dossier().pieces.find((p) => p.id === id)?.expireLe ?? null
const ACTIVE = () => dossier().activeLe ?? yaounde(2026, 9, 24, 10, 40)
const CERTIF = () => dossier().badge?.obtenuLe ?? ACTIVE()

// ── Situations de démonstration (DP-67) ─────────────────────────────────────────────────────────────────────
const KIT_DEMO = (): DepartDemo['kit'] => ({ constat: 'incomplet', manquants: [PARAMETRES.livreur.kitValeur.elements[1].nom], retenue: PARAMETRES.livreur.kitValeur.elements[1].valeur, contestation: null })
/** ?demo=preavis : départ demandé le jeudi 8 octobre (préavis jusqu'au jeudi 15) ; kit rendu ce matin, une pochette
 * manquante, retenue contestable. ?demo=depart_clos : clôturé lundi 12 par Yafé Express, versement le vendredi 16. */
function departInitial(): DepartDemo | null {
  const s = scenario()
  if (s === 'preavis') {
    const le = yaounde(2026, 10, 8, 9, 0)
    return { id: 'DEP-PREAV', demandeLe: le, motif: 'autre_emploi', texte: null, preavisJusqua: le + entier('DEPART-PREAVIS-J') * JOUR, etat: 'demande', closLe: null, closPar: null, versementLe: null, kit: KIT_DEMO(), kitNonConteste: false, versementFige: null, faitLe: null }
  }
  if (s === 'depart_clos') {
    const le = yaounde(2026, 10, 5, 9, 0)
    const clos = yaounde(2026, 10, 12, 16, 30)
    const kit = KIT_DEMO()
    return {
      id: 'DEP-CLOS', demandeLe: le, motif: 'demenagement', texte: null, preavisJusqua: le + entier('DEPART-PREAVIS-J') * JOUR, etat: 'close', closLe: clos, closPar: 'entreprise', versementLe: vendrediSuivant(clos), kit, kitNonConteste: false,
      versementFige: { ...dernierVersement(18400, [{ gains: 300, conteste: 300 }], kit.retenue, PARAMETRES.livreur.kitValeur.total), missions: 41, litiges: 1 },
      faitLe: null,
    }
  }
  return null
}
/** ?demo=photo : nouvelle photo demandée hier (6 jours restants) ; ?demo=photo_retard : délai passé, plus de nouvelle mission. */
function selfieDemande(): Partial<Record<IdPiece, DemandeEntreprise>> {
  const s = scenario()
  if (s !== 'photo' && s !== 'photo_retard') return {}
  const le = s === 'photo' ? yaounde(2026, 10, 12, 10, 0) : yaounde(2026, 10, 5, 10, 0)
  return { selfie: { le, motif: 'Photo trop sombre : le gérant du relais ne vous reconnaît pas.', jusqua: le + entier('PHOTO-REVERIF-J') * JOUR } }
}

const etat = magasin('moi', () => ({
  pieces: [
    { id: 'cni', expireLe: expiration('cni_recto'), rectoVerso: true, envoyeeA: null, motifRefus: null, verifiee: true, refusee: null },
    { id: 'selfie', expireLe: null, rectoVerso: false, envoyeeA: null, motifRefus: null, verifiee: true, refusee: null },
    { id: 'permis', expireLe: expiration('permis'), rectoVerso: true, envoyeeA: null, motifRefus: null, verifiee: true, refusee: null },
    { id: 'carte_grise', expireLe: null, rectoVerso: true, envoyeeA: null, motifRefus: null, verifiee: true, refusee: null },
    { id: 'photo_vehicule', expireLe: null, rectoVerso: false, envoyeeA: null, motifRefus: null, verifiee: true, refusee: null },
    { id: 'assurance', expireLe: expiration('assurance'), rectoVerso: false, envoyeeA: null, motifRefus: null, verifiee: true, refusee: null },
  ] as PieceGardee[],
  // Pièces redemandées par l'entreprise (relance, nouvelle vérification de la photo), par pièce.
  demandesEntreprise: selfieDemande() as Partial<Record<IdPiece, DemandeEntreprise>>,
  depart: departInitial(),
  demandesDonnees: [] as Profil['demandesDonnees'],
}))
export const etatMoi = etat

export const etatPreferencesCompte = magasin<PreferencesCompte>('moi_preferences', () => ({ langue: 'fr', lectureVocale: true, envoiPhotos: 'immediat' }))

const verification = () => ({ autoMin: entier('KYC-AUTO-MIN'), revueH: entier('KYC-REVUE-H') })

/** Une pièce envoyée après la demande de l'entreprise et vérifiée : la demande est levée. */
const validee = (p: PieceGardee, d: DemandeEntreprise, t: number) => !p.refusee && p.envoyeeA !== null && p.envoyeeA >= d.le && t >= p.envoyeeA + verification().autoMin * 60_000
/** Demande de l'entreprise encore ouverte sur une pièce (gardée jusqu'à la validation de la nouvelle pièce). */
const demandeOuverte = (p: PieceGardee, t: number): DemandeEntreprise | null => {
  const d = etat.lire().demandesEntreprise[p.id]
  return d && !validee(p, d, t) ? { le: d.le, motif: d.motif, jusqua: d.jusqua ?? null } : null
}

/** État d'une pièce à l'instant t : vérification automatique faite, nouvelle photo demandée, échéance, alerte à J−30. */
function etatDe(p: PieceGardee, t: number): EtatPiece {
  if (p.refusee) return 'refusee'
  if (p.envoyeeA !== null && t < p.envoyeeA + verification().autoMin * 60_000) return 'en_verification'
  // Nouvelle vérification de la photo demandée, pas encore envoyée : état dédié (DP-67), jamais « refusée ».
  const d = etat.lire().demandesEntreprise[p.id]
  if (p.id === 'selfie' && d && (p.envoyeeA === null || p.envoyeeA < d.le)) return 'reverification'
  if (p.expireLe === null) return 'a_jour'
  // Expirée le jour même à minuit (LIV-ENT-03) : la date d'expiration est le dernier jour valable.
  if (t >= debutDuJour(jourDe(p.expireLe)) + JOUR) return 'expiree'
  if (p.expireLe - t <= entier('LIV-PIECE-ALERTE-J') * JOUR) return 'expire_bientot'
  return 'a_jour'
}

/** Renvoyable (DP-66) : refusée, demandée par l'entreprise, expirée ou bientôt ; jamais en vérification. */
const renvoyable = (etatP: EtatPiece, demandee: boolean) => etatP !== 'en_verification' && (demandee || etatP === 'refusee' || etatP === 'expiree' || etatP === 'expire_bientot' || etatP === 'reverification')

/** Relevé de la semaine en cours et tarif affiché par l'entreprise (posés par source-demo.ts : pas d'import croisé). */
export const RELEVE = {
  enCours: (): { gains: number | null; totalMissions: number } => ({ gains: null, totalMissions: 0 }),
  tarifMission: (): number | null => null,
}

const litigesOuverts = () => PAQUETS.filter((p) => p.dossier?.etat === 'en_cours')

/** Conditions de clôture d'un départ, constatées à la lecture (comme le serveur) ; les litiges ne bloquent pas. */
const conditionsDepart = (d: DepartDemo): Depart['conditions'] => ({
  missionEnCours: d.etat === 'close' ? false : missionEnCours(),
  colisSousGarde: d.etat === 'close' ? 0 : etatSession.lire().colisSousGarde,
  kitConstate: d.kit.constat !== null || d.kitNonConteste,
  litigesOuverts: litigesOuverts().length,
})

/** Retenue du kit qui compte : annulée par BelivaY → rien ; contestée sans décision → mise de côté. */
const kitPourVersement = (d: DepartDemo) => {
  const c = d.kit.contestation
  if (d.kitNonConteste || c?.decision === 'annulee') return { retenue: 0, conteste: false }
  return { retenue: d.kit.retenue, conteste: !!c && c.decision === null }
}

/** Dernier versement : figé à la clôture (le serveur), sinon estimé à ce jour (semaine en cours et litiges ouverts). */
function versementDe(d: DepartDemo): DernierVersement {
  const k = kitPourVersement(d)
  const kitValeur = PARAMETRES.livreur.kitValeur.total
  if (d.versementFige) {
    const f = d.versementFige
    // Une contestation après la clôture met la retenue de côté ; une décision la rend définitive ou l'annule.
    const kit = f.retenueKit + f.kitDeCote
    const v = k.retenue === 0 ? { retenueKit: 0, kitDeCote: 0 } : k.conteste ? { retenueKit: 0, kitDeCote: kit } : { retenueKit: kit, kitDeCote: 0 }
    const verse = f.verse === null ? null : k.retenue === 0 ? f.verse + kit : f.verse
    return { ...f, ...v, verse, faitLe: d.faitLe }
  }
  const r = RELEVE.enCours()
  const tarif = RELEVE.tarifMission()
  // Mission liée à un litige ouvert : ses gains comptent dans le dû, retenus au plus le montant contesté.
  const litiges = litigesOuverts().map(() => ({ gains: tarif ?? 0, conteste: tarif ?? 0 }))
  const du = r.gains === null ? null : r.gains + litiges.reduce((s, l) => s + l.gains, 0)
  const v = dernierVersement(du, litiges, k.retenue, kitValeur, k.conteste)
  return { ...v, missions: r.totalMissions + litiges.length, litiges: litiges.length, faitLe: null }
}

function departVu(d: DepartDemo): Depart {
  const p = PARAMETRES.livreur
  return {
    id: d.id,
    initiative: d.initiative ?? 'livreur',
    demandeLe: d.demandeLe,
    motif: d.motif,
    texte: d.texte,
    preavisJusqua: d.preavisJusqua,
    affectationJusqua: affectationJusqua(d.demandeLe, p.departPreavisJours),
    etat: d.etat,
    conditions: conditionsDepart(d),
    kit: { ...d.kit, constatJusqua: constatJusqua(d.demandeLe, p.departPreavisJours, p.departKitConstatHeures) },
    kitNonConteste: d.kitNonConteste,
    versement: versementDe(d),
    closLe: d.closLe,
    closPar: d.closPar,
    versementLe: d.versementLe,
  }
}
/** Demande de départ gardée, à la forme d'aujourd'hui (une forme plus ancienne, gardée sur l'appareil, est oubliée). */
const departGarde = (): DepartDemo | null => {
  const d = etat.lire().depart
  return d && typeof d === 'object' && 'kit' in d ? d : null
}
/** Départ en préavis (pour « Mon statut » : hors service sans point de Trust Score perdu). */
export const preavisEnCours = (): number | null => {
  const d = departGarde()
  return d && d.etat === 'demande' ? d.preavisJusqua : null
}

function profil(): Profil {
  const t = maintenant()
  const e = etat.lire()
  const pieces: Piece[] = e.pieces.map((p) => {
    const ep = etatDe(p, t)
    const demandee = demandeOuverte(p, t)
    return { id: p.id, expireLe: p.expireLe, rectoVerso: p.rectoVerso, envoyeeA: p.envoyeeA, motifRefus: p.refusee, etat: ep, demandee, renvoyable: renvoyable(ep, !!demandee) }
  })
  const selfie = e.pieces.find((p) => p.id === 'selfie')!
  const ds = demandeOuverte(selfie, t)
  const depart = departGarde()
  const valable = debutDuJour(ajouterMois(jourDe(CERTIF()), entier('BADGE-VALIDITE')))
  return {
    activeLe: ACTIVE(),
    numeroMasque: masquerTel(identite('livreur', departSerge()).telephone),
    certification: { reussieLe: CERTIF(), valableJusqua: valable, note: '18/20', seuil: parametre('CERT-SEUIL', '\\d+ sur \\d+')[0] },
    vehicule: { type: 'Moto', immatriculation: 'CE 482 KM', classes: ['S', 'M', 'L'], capacite: '6 colis S ou M, ou 2 colis L' },
    // Zones confiées par l'employeur (pont : zones_changees), sinon celles du jeu d'essai.
    zones: (etatEmploi.lire().zones ?? ['Z1', 'Z3']).map((code, i) => ({ code, nom: NOMS_ZONES[code] ?? code, principale: i === 0 })),
    pieces,
    alerteJours: entier('LIV-PIECE-ALERTE-J'),
    verification: verification(),
    restreint: pieces.some((p) => p.etat === 'expiree') || t >= valable,
    selfieEnVerification: pieces.some((p) => p.id === 'selfie' && p.etat === 'en_verification'),
    // Délai PHOTO-REVERIF-J passé, nouvelle photo pas encore validée (envoyée ou non) : plus de nouvelle mission.
    photoBloquee: !!ds && ds.jusqua !== null && photoBloque(ds.jusqua - entier('PHOTO-REVERIF-J') * JOUR, t, entier('PHOTO-REVERIF-J'), false),
    depart: depart ? departVu(depart) : null,
    demandesDonnees: e.demandesDonnees.map((d) => ({ ...d, etat: t - d.le > HEURE ? 'prete' : 'en_preparation' })),
  }
}

/** Une mission est-elle en cours (le départ ne se fera qu'après elle) ? */
const missionEnCours = () => etatSession.lire().colisSousGarde > 0 || (etatTournee.lire()?.arrets.some((a) => a.etat === 'a_faire' || a.etat === 'en_cours') ?? false)

// Rejoué au retour du réseau : la préférence de langue part sur le compte.
REJOUEURS.preference = () => undefined
CONTEXTE.envoiPhotos = () => etatPreferencesCompte.lire().envoiPhotos

export const demoMoi: DomaineMoi = {
  profil: () => repondre(profil()),
  emploi: () => repondre({ ...etatEmploi.lire(), suspension: suspensionEnCours(maintenant()) }),
  envoyerPiece(id, d, origine) {
    const p = etat.lire().pieces.find((x) => x.id === id)
    const vue = profil().pieces.find((x) => x.id === id)
    // Jamais à volonté (DP-66) : seulement une pièce refusée, demandée par l'entreprise, expirée ou bientôt.
    if (vue && !vue.renvoyable) return repondre({ ok: false as const, raison: 'non_demandee' as const })
    if (!p || !d.recto || (p.rectoVerso && !d.verso)) return repondre({ ok: false as const, raison: 'photo_manquante' as const })
    if (d.expireLe !== null && d.expireLe <= origine.heure) return repondre({ ok: false as const, raison: 'date_passee' as const })
    etat.ecrire((e) => {
      const x = e.pieces.find((y) => y.id === id)!
      x.envoyeeA = origine.heure
      x.refusee = null
      if (d.expireLe !== null || x.expireLe !== null) x.expireLe = d.expireLe
      // La demande de l'entreprise reste ouverte jusqu'à la validation de la nouvelle pièce (DP-67).
    })
    if (etatSession.lire().compte === 'serge' && (id === 'cni' || id === 'selfie' || id === 'permis')) publier({ type: 'piece_envoyee', piece: id }, 'piece-' + origine.cle, origine.heure)
    return repondre({ ok: true as const })
  },
  preferences: () => repondre(etatPreferencesCompte.lire()),
  reglerPreference(p) {
    etatPreferencesCompte.ecrire((x) => Object.assign(x, p))
    return repondre({ ok: true as const })
  },
  demanderDepart(d, origine) {
    const x = departGarde()
    if (x && x.etat === 'demande') return repondre({ ok: false as const, raison: 'deja_demande' as const })
    if (!MOTIFS_DEPART.includes(d.motif)) return repondre({ ok: false as const, raison: 'motif_inconnu' as const })
    const texte = d.texte?.trim() || null
    const preavisJusqua = origine.heure + entier('DEPART-PREAVIS-J') * JOUR
    const id = 'DEP-' + origine.cle.slice(-6)
    etat.ecrire((e) => void (e.depart = { id, demandeLe: origine.heure, motif: d.motif, texte, preavisJusqua, etat: 'demande', closLe: null, closPar: null, versementLe: null, kit: { constat: null, manquants: [], retenue: 0, contestation: null }, kitNonConteste: false, versementFige: null, faitLe: null }))
    if (etatSession.lire().compte === 'serge') publier({ type: 'depart_demande', id, motif: d.motif, texte, preavisJusqua }, 'depart-demande-' + origine.cle, origine.heure)
    return repondre({ ok: true as const, preavisJusqua })
  },
  annulerDepart(origine) {
    const x = departGarde()
    if (!x) return repondre({ ok: false as const, raison: 'aucune_demande' as const })
    if (x.etat === 'close') return repondre({ ok: false as const, raison: 'deja_close' as const })
    // Une fin de contrat décidée par l'employeur ne s'annule pas ici : seul l'employeur peut la retirer.
    if (x.initiative === 'entreprise') return repondre({ ok: false as const, raison: 'aucune_demande' as const })
    etat.ecrire((e) => void (e.depart = null))
    if (etatSession.lire().compte === 'serge') publier({ type: 'depart_annule', id: x.id }, 'depart-annule-' + origine.cle, origine.heure)
    return repondre({ ok: true as const })
  },
  contesterKit(motif, origine) {
    const x = departGarde()
    const m = motif.trim().replace(/\s+/g, ' ')
    if (!x || x.kitNonConteste || x.kit.constat !== 'incomplet' || x.kit.retenue <= 0) return repondre({ ok: false as const, raison: 'aucune_retenue' as const })
    if (x.kit.contestation) return repondre({ ok: false as const, raison: 'deja_contestee' as const })
    if (!m) return repondre({ ok: false as const, raison: 'motif' as const })
    etat.ecrire((e) => void ((e.depart as DepartDemo).kit.contestation = { le: origine.heure, motif: m, decision: null, decideLe: null }))
    if (etatSession.lire().compte === 'serge') publier({ type: 'kit_conteste', id: x.id, motif: m }, 'kit-conteste-' + origine.cle, origine.heure)
    return repondre({ ok: true as const })
  },
  demanderCodeDonnees: () => repondre({ ok: true as const, renvoiPossibleA: maintenant() + 60_000 }),
  demanderDonnees(type, code, origine) {
    if (code !== CODE_SMS_DEMO) return repondre({ ok: false as const, raison: 'code_faux' as const })
    if (etat.lire().demandesDonnees.some((d) => d.type === type)) return repondre({ ok: false as const, raison: 'deja_demande' as const })
    etat.ecrire((e) => void e.demandesDonnees.push({ type, le: origine.heure, etat: 'en_preparation' }))
    return repondre({ ok: true as const })
  },
}

/** Activation du livreur (ancienneté du Trust Score). */
export const ACTIVATION = ACTIVE

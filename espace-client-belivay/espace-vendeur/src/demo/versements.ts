// DONNÉES DE DÉMONSTRATION — domaine « versements » (propriétaire seulement) : vendredi avant 12 h, sans frais ni
// minimum ; référence annoncée avant ; historique par période ; refus de l'opérateur (scénario ?refus=1, comme
// ?role=prep : 3 essais à 24 h, puis suspension, src/calculs/versements.ts) ; versement non reçu signalé ; numéro de
// versement changé avec deux codes SMS (6 chiffres, renvoi, essais : registre OTP-*) et 7 jours de revue (VD-NUM-REVUE).
import type { CommandeCouverte, DomaineVersements, Historique, Incident, MotifRefus, NumeroVersement, Operateur, Periode, Prochain, StatutVersement, Versement } from '../donnees/domaines/versements'
import { ReserveAuProprietaire } from '../donnees/communs'
import { PARAMETRES, REGISTRE } from '../calculs/registre'
import { HEURE, ajouterJours, ajouterMois, debutDuJour, jourDe, jourSemaine } from '../calculs/temps'
import { essaisApresRefus, finDeRevue, heureLimite, montantDu, referenceDeVersement, suspendu, vendrediDeVersement } from '../calculs/versements'
import { VERSEMENT } from '../calculs/etats'
import { maintenant } from './horloge'
import { BOUTIQUE, COMMANDES, MEMBRES, VERSEMENT_REFUSE } from './jeu-essai'
import { gardeFige } from './commandes'
import { gainsFiges, liberationDe, mouvements, prochainVendredi } from './argent'
import { estProprietaire } from './session'
import { magasin, repondre } from './stockage'

const PV = PARAMETRES.versements
const CODE_DEMO = '123456' // démonstration : le code reçu par SMS (en production, envoyé par le serveur, jamais renvoyé)

// Préfixes par opérateur (VD09-R31, REFVD-R94). Q-94 : paramètres du registre par pays ; en attendant leur code
// (INTEGRATION.md), le « serveur » de la démonstration les tient ici et les donne à l'écran.
// Préfixes par opérateur : paramètre du pays (VD-PREFIXES-CM, Q-94), jamais dans l'écran.
const LIBELLES: Record<Operateur, string> = { MTN: 'MTN Mobile Money', Orange: 'Orange Money' }
const OPERATEURS: NumeroVersement['operateurs'] = PARAMETRES.console.prefixes.map((p) => ({ nom: p.operateur, libelle: LIBELLES[p.operateur], prefixes: p.prefixes }))
const operateurDe = (n: string): Operateur | null => OPERATEURS.find((o) => o.prefixes.some((p) => n.startsWith(p)))?.nom ?? null

function lireNombre(code: string, motif: RegExp): number {
  const m = motif.exec((REGISTRE[code] ?? '').trim())
  if (!m) throw new Error(`paramètre ${code} illisible : « ${REGISTRE[code]} »`)
  return Number(m[1])
}
const OTP = {
  longueur: lireNombre('OTP-LONG', /^(\d+) chiffres$/),
  dureeMinutes: lireNombre('OTP-DUREE', /^(\d+) minutes$/),
  essais: lireNombre('OTP-ESSAIS', /^(\d+), puis/),
  attenteMinutes: lireNombre('OTP-ESSAIS', /puis (\d+) minutes/),
  renvoiSecondes: lireNombre('OTP-RENVOI', /^(\d+) s\b/),
}

interface Attente {
  operateur: Operateur
  numero: string // national, 9 chiffres
  envoyeA: number
  renvoiNouveauA: number
  renvoiPersonnelA: number
  essais: number
  bloqueJusqua: number
}
interface EtatVersements {
  numero: { operateur: Operateur; masque: string; verifieLe: string }
  ancien: { operateur: Operateur; masque: string } | null
  revue: { jusqua: number } | null
  attente: Attente | null
  signales: string[]
}
const etat = magasin<EtatVersements>('versements-v2', () => ({ numero: { ...BOUTIQUE.numeroVersement }, ancien: null, revue: null, attente: null, signales: [] }))

const proprio = () => {
  if (!estProprietaire()) throw new ReserveAuProprietaire('versements')
}
const titulaire = () => `${BOUTIQUE.titulaire.prenom} ${BOUTIQUE.titulaire.nom}`

/** Numéro qui reçoit les versements ; pendant la revue, le nouveau (en revue) et la date de fin. */
export function numeroActif() {
  const e = etat.lire()
  const revue = e.revue && e.revue.jusqua > maintenant() ? e.revue : null
  return { ...e.numero, revue }
}

/** Versements crédités (une ligne par référence, avec les commandes couvertes). */
export function versementsPasses(periode: Periode = 'tout'): Versement[] {
  const parRef = new Map<string, CommandeCouverte[]>()
  for (const c of COMMANDES)
    if (c.versement) {
      const lib = liberationDe(c)!
      parRef.set(c.versement, [...(parRef.get(c.versement) ?? []), { ref: c.ref, liberation: lib, garde: gardeFige(c) }])
    }
  const e = etat.lire()
  const depuis = periode === 'tout' ? null : ajouterMois(jourDe(maintenant()), -Number(periode))
  return [...parRef]
    .map(([reference, cmds]) => ({ reference, cmds, vendredi: cmds.map((c) => vendrediDeVersement(c.liberation, PV)).sort().pop()! }))
    .map(({ reference, cmds, vendredi }) => ({
      reference,
      vendredi,
      montant: cmds.reduce((s, c) => s + c.garde, 0),
      numero: `${BOUTIQUE.numeroVersement.operateur} ${BOUTIQUE.numeroVersement.masque}`,
      statut: 'credite' as const,
      // Refusé par l'opérateur le vendredi à 11 h 40, crédité au nouvel essai du lendemain (24 h après).
      essais: reference === VERSEMENT_REFUSE ? [debutDuJour(vendredi) + 11 * HEURE + 40 * 60_000, debutDuJour(vendredi) + 35 * HEURE + 40 * 60_000] : [],
      commandes: cmds,
      signale: e.signales.includes(reference),
    }))
    .filter((v) => !depuis || v.vendredi >= depuis)
    .sort((a, b) => b.vendredi.localeCompare(a.vendredi))
}

/** Référence attribuée à l'arrêté du jeudi (VER-02) : la suivante de la série tenue par le serveur. */
function referencePrevue(): string {
  const n = Math.max(0, ...versementsPasses().map((v) => Number(v.reference.replace(/\D/g, ''))))
  return referenceDeVersement(n + 1)
}

/** Statut du prochain versement par la machine VERSEMENT (src/calculs/etats.ts) : jamais écrit d'avance. */
function statutPrevu(revue: boolean, incident: Incident | null): StatutVersement {
  let s = VERSEMENT.appliquer('—', 'payout.closing').vers
  if (revue) return VERSEMENT.appliquer(s, 'payout.friday', { revue_du_numero: true }).vers as StatutVersement
  if (!incident) return s as StatutVersement
  s = VERSEMENT.appliquer(s, 'payout.friday', {}).vers
  s = VERSEMENT.appliquer(s, 'operator.refused').vers
  if (incident.suspendu) s = VERSEMENT.appliquer(s, 'payout.retry', { essais_epuises: true }).vers
  return s as StatutVersement
}

/** Scénario du prototype : « ?refus=1 » (refus au vendredi), « ?refus=suspendu » (après 3 essais), « &motif=tiers|prefixe ». */
function scenarioRefus(heure: number, operateur: Operateur): Incident | null {
  let q: URLSearchParams
  try {
    q = new URLSearchParams(location.search)
  } catch {
    return null
  }
  const r = q.get('refus')
  if (!r) return null
  const motif = (['plein', 'tiers', 'prefixe'] as MotifRefus[]).find((m) => m === q.get('motif')) ?? 'plein'
  const essais = essaisApresRefus(heure, PV)
  const faits = r === 'suspendu' ? PV.essais : 0
  return { motif, operateur, refuseA: heure, essais, essaisFaits: faits, suspendu: suspendu(faits + 1, PV) }
}

/** Le lundi suivant à 12 h (réponse à un versement non reçu, VER-03). */
function lundiMidi(t: number): number {
  const j = jourDe(t)
  const d = (7 - jourSemaine(j)) % 7 || 7
  return debutDuJour(ajouterJours(j, d)) + 12 * HEURE
}

const masquer = (n: string) => `${n.slice(0, 3)} •• •• ${n.slice(-2)}`
const telephonePersonnel = () => {
  const n = MEMBRES.find((m) => m.role === 'proprietaire')!.telephone.replace(/\D/g, '').replace(/^237/, '')
  return `${n[0]}•• •• •• ${n.slice(-2)}`
}

export const demoVersements: DomaineVersements = {
  async prochain(): Promise<Prochain | null> {
    proprio()
    const m = mouvements()
    const p = prochainVendredi(m)
    if (!p.montant && !p.couvertes.length) return null
    const n = numeroActif()
    const incident = n.revue ? null : scenarioRefus(heureLimite(p.vendredi, PV), n.operateur)
    return repondre({
      reference: referencePrevue(),
      statut: statutPrevu(!!n.revue, incident),
      vendredi: p.vendredi,
      heureLimite: p.heureLimite,
      aVerser: p.dejaLibere,
      montant: p.montant,
      passeA: p.passeA,
      commandes: p.couvertes.map((x) => ({ ref: x.ref, liberation: x.liberation!, garde: x.garde })),
      numero: `${n.operateur} ${n.masque}`,
      operateur: n.operateur,
      titulaire: titulaire(),
      incident,
      enRevueJusqua: n.revue?.jusqua ?? null,
      reporteAu: n.revue ? p.vendredi : null,
    })
  },
  async historique(periode): Promise<Historique> {
    proprio()
    const v = versementsPasses(periode)
    return repondre({ periode, versements: v, total: v.reduce((s, x) => s + x.montant, 0), nombre: v.length, depuis: BOUTIQUE.signature })
  },
  async signalerNonRecu(reference) {
    proprio()
    if (!versementsPasses().some((v) => v.reference === reference)) return { ok: false, raison: 'inconnu' }
    if (etat.lire().signales.includes(reference)) return { ok: false, raison: 'deja' }
    etat.ecrire((e) => {
      e.signales.push(reference)
    })
    return { ok: true, reponseAvant: lundiMidi(maintenant()) }
  },
  async numero(): Promise<NumeroVersement> {
    proprio()
    const e = etat.lire()
    const n = numeroActif()
    // Le versement qui serait parti sans le changement attend la fin de la revue : il n'est pas perdu (VD09-R32).
    const base = vendrediDeVersement(maintenant(), PV)
    const enAttente = n.revue ? montantDu(base, gainsFiges(), PV) : 0
    return repondre({
      actuel: { operateur: e.numero.operateur, masque: e.numero.masque, verifieLe: e.numero.verifieLe, titulaire: titulaire() },
      enRevue:
        n.revue && e.ancien
          ? { operateur: n.operateur, masque: n.masque, jusqua: n.revue.jusqua, premierVersement: vendrediDeVersement(n.revue.jusqua, PV), ancien: e.ancien, enAttente: enAttente ? { vendredi: base, montant: enAttente } : null }
          : null,
      operateurs: OPERATEURS,
      indicatif: '+237',
      longueur: 9,
      telephonePersonnel: telephonePersonnel(),
      revueJours: PV.revueNumeroJours,
      code: { longueur: OTP.longueur, renvoiSecondes: OTP.renvoiSecondes, dureeMinutes: OTP.dureeMinutes },
      attente: e.attente && maintenant() - e.attente.envoyeA < OTP.dureeMinutes * 60000 ? { operateur: e.attente.operateur, numeroMasque: masquer(e.attente.numero), envoyeA: e.attente.envoyeA } : null,
    })
  },
  async demanderCodes(operateur, numero) {
    proprio()
    const n = numero.replace(/\D/g, '').replace(/^237(?=\d{9}$)/, '')
    if (n.length !== 9) return { ok: false, raison: 'longueur' }
    const vrai = operateurDe(n)
    if (!vrai) return { ok: false, raison: 'prefixe' }
    if (vrai !== operateur) return { ok: false, raison: 'operateur', detail: vrai }
    const e = etat.lire()
    if (e.numero.operateur === vrai && e.numero.masque.replace(/\D/g, '') === n.slice(-4)) return { ok: false, raison: 'meme_numero' }
    const t = maintenant()
    if (e.attente && e.attente.numero === n && t - e.attente.envoyeA < OTP.renvoiSecondes * 1000)
      return { ok: true, destination: masquer(n), renvoiSecondes: OTP.renvoiSecondes - Math.floor((t - e.attente.envoyeA) / 1000), codeDemo: CODE_DEMO }
    etat.ecrire((x) => {
      x.attente = { operateur: vrai, numero: n, envoyeA: t, renvoiNouveauA: t, renvoiPersonnelA: t, essais: 0, bloqueJusqua: 0 }
    })
    return { ok: true, destination: masquer(n), renvoiSecondes: OTP.renvoiSecondes, codeDemo: CODE_DEMO }
  },
  async renvoyerCode(quel) {
    proprio()
    const a = etat.lire().attente
    const t = maintenant()
    if (!a) return { ok: false, raison: 'expire' }
    const dernier = quel === 'nouveau' ? a.renvoiNouveauA : a.renvoiPersonnelA
    if (t - dernier < OTP.renvoiSecondes * 1000) return { ok: false, raison: 'trop_tot' }
    etat.ecrire((x) => {
      if (!x.attente) return
      if (quel === 'nouveau') x.attente.renvoiNouveauA = t
      else x.attente.renvoiPersonnelA = t
      x.attente.envoyeA = t
    })
    return { ok: true, renvoiSecondes: OTP.renvoiSecondes }
  },
  async confirmerNumero(codeNouveau, codePersonnel) {
    proprio()
    const a = etat.lire().attente
    const t = maintenant()
    if (!a || t - a.envoyeA >= OTP.dureeMinutes * 60000) return { ok: false, raison: 'expire' }
    if (a.bloqueJusqua > t) return { ok: false, raison: 'bloque', bloqueJusqua: a.bloqueJusqua }
    const faux: 'code_nouveau' | 'code_personnel' | null = codeNouveau !== CODE_DEMO ? 'code_nouveau' : codePersonnel !== CODE_DEMO ? 'code_personnel' : null
    if (faux) {
      const essais = a.essais + 1
      const bloque = essais >= OTP.essais ? t + OTP.attenteMinutes * 60000 : 0
      etat.ecrire((x) => {
        if (!x.attente) return
        x.attente.essais = bloque ? 0 : essais
        x.attente.bloqueJusqua = bloque
      })
      return bloque ? { ok: false, raison: 'bloque', bloqueJusqua: bloque } : { ok: false, raison: faux, essaisRestants: OTP.essais - essais }
    }
    const revue = finDeRevue(t, PV)
    etat.ecrire((x) => {
      x.ancien = { operateur: x.numero.operateur, masque: x.numero.masque }
      x.numero = { operateur: a.operateur, masque: '···· ' + a.numero.slice(-4), verifieLe: jourDe(t) }
      x.revue = { jusqua: revue }
      x.attente = null
    })
    return { ok: true, revueJusqua: revue, premierVersement: vendrediDeVersement(revue, PV) }
  },
  async annulerSaisie() {
    proprio()
    etat.ecrire((x) => {
      x.attente = null
    })
  },
}

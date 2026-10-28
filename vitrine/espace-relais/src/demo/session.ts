// DONNÉES DE DÉMONSTRATION — domaine « session » : le téléphone du comptoir et le serveur d'authentification. Deux
// membres au jeu d'essai : Rose Mbarga (gérante, propriétaire du relais) et Paul Essomba (employé de comptoir).
// Appareil LIÉ à un membre (jeton d'appareil, CNX-04) : le PIN suffit à rouvrir ; nouvel appareil : code SMS d'abord
// (PAR-02, OTP-*) ; PIN personnel à PIN-LONGUEUR chiffres, PIN-ESSAIS essais puis blocage PR-PIN-BLOCAGE-MIN minutes
// (ARL-12) ; le serveur ne garde qu'une empreinte. Les compteurs de la coque sont de VRAIS comptes du modèle central
// (src/demo/colis.ts). Le numéro d'une candidature en cours (src/demo/acces.ts) n'ouvre pas encore d'espace.
import { PARAMETRES } from '../calculs/registre'
import type { Acteur } from '../donnees/communs'
import type { CodeEnvoye, DomaineSession, EcranConnexion, Membre, SessionRelais } from '../donnees/domaines/session'
import { pinTropSimple } from '../calculs/acces'
import { candidatureDuNumero } from './acces'
import { ouvertA } from './calendrier'
import { FILTRES, argentVisibleSi, empreinte, occupationDuRelais, tousLesColis } from './colis'
import { maintenant } from './horloge'
import { CODE_SMS_DEMO, PIN_DEMO, RELAIS } from './jeu-essai'
import { etatMessages } from './messages'
import { nonLuesATraiter, notifier } from './notifications'
import { etatQualite, palierDe } from './qualite'
import { etatRelais } from './relais'
import { scenario } from './scenario'
import { magasin, repondre } from './stockage'
import { identite, initiales, type IdentiteDepart } from '@client/compte/etat'

// La situation de départ (?demo=…) est lue avant toute donnée gardée sur l'appareil.
scenario()
const C = PARAMETRES.connexion
/** PR-SESSION-J : la session d'un appareil de confiance se ferme après ces jours sans ouvrir l'application (CNX-04). */
const SESSION_MS = PARAMETRES.acces.sessionJours * 86_400_000

interface CodeEnCours {
  motif: CodeEnvoye['motif']
  membreId: string
  expireA: number
  envois: number[] // instants des envois (OTP-RENVOI : intervalle et nombre par heure)
  essais: number
  verifie: boolean
}

export const etatSession = magasin('session', () => {
  const id = scenario() === 'premiere' || scenario() === 'candidat' ? null : scenario() === 'employe' ? 'm-paul' : 'm-rose'
  return {
    membreId: id as string | null,
    /** Membre lié à CET appareil (jeton d'appareil) ; null : nouvel appareil. */
    appareil: id as string | null,
    empreintes: { 'm-rose': empreinte('m-rose:' + PIN_DEMO), 'm-paul': empreinte('m-paul:' + PIN_DEMO) } as Record<string, string>,
    pinFaux: 0,
    bloqueJusqua: null as number | null,
    code: null as CodeEnCours | null,
    /** Dernière ouverture de l'application avec une session (CNX-04 : la session tombe après PR-SESSION-J jours sans). */
    dernierAcces: scenario() === 'session_expiree' ? maintenant() - SESSION_MS - 86_400_000 : maintenant(),
    /** La dernière session de cet appareil a expiré (l'écran de connexion le dit). */
    expiree: false,
  }
})

/** Session close après PR-SESSION-J jours sans accès (ARL-141) ; sinon l'accès est noté (au plus une fois par heure). */
function tenirSession(t: number) {
  const s = etatSession.lire()
  if (!s.membreId) return
  if (t - s.dernierAcces > SESSION_MS) etatSession.ecrire((x) => void ((x.membreId = null), (x.code = null), (x.expiree = true)))
  else if (t - s.dernierAcces > 3600_000) etatSession.ecrire((x) => void (x.dernierAcces = t))
}

/** Membre connu du relais (équipe) ; un membre retiré n'a plus d'accès (DRO-04). */
const membreDe = (id: string | null): Membre | null => (id ? (etatRelais.lire().equipe.find((m) => m.id === id) ?? null) : null)
// Compte réglé par le membre lui-même (kit « compte », src/compte) : nom, numéro, e-mail, mot de passe, Google ; la
// photo reste celle du relais (changerPhoto). Clé du kit : « relais:<membre> ». Adresses de démonstration seulement.
const EMAILS: Record<string, string> = { 'm-rose': 'rose.relais@exemple.cm', 'm-paul': 'paul.comptoir@exemple.cm' }
export const cleCompte = (id: string) => `relais:${id}` as const
export function departMembre(id: string): IdentiteDepart {
  const m = membreDe(id)
  return { prenom: m?.prenom ?? '', nom: m?.nom ?? '', telephone: etatRelais.lire().telephones[id] ?? '', email: EMAILS[id] ?? null, photo: m?.photo ?? null }
}
const numeroDe = (id: string) => identite(cleCompte(id), departMembre(id)).telephone
function avecCompte(m: Membre): Membre {
  const i = identite(cleCompte(m.id), departMembre(m.id))
  return { ...m, prenom: i.prenom, nom: i.nom, initiales: initiales(i.prenom, i.nom) }
}
/** Compte du gérant : il porte la couverture du point relais. */
export const cleCompteGerant = () => cleCompte(etatRelais.lire().equipe.find((m) => m.role === 'proprietaire')?.id ?? 'm-rose')
/** Membre que vise la connexion par e-mail : celui de cet appareil, sinon la gérante du jeu d'essai. */
export const membreDeLAppareil = () => etatSession.lire().appareil ?? 'm-rose'
/** Source hybride (donnees/session-hybride.ts) : ce numéro est-il celui d'un membre ou d'une candidature de la démonstration ? */
export const estNumeroDemo = (telephone: string) => {
  const n = normaliser(telephone).slice(-9)
  return Object.keys(etatRelais.lire().telephones).some((k) => numeroDe(k) === n) || !!candidatureDuNumero(n)
}
/** Connexion par e-mail, lien ou Google (kit « compte », démonstration) : la session s'ouvre, l'appareil est lié. */
export function ouvrirParCompte(id: string) {
  etatSession.ecrire((x) => void ((x.membreId = id), (x.appareil = id), (x.dernierAcces = maintenant()), (x.expiree = false), (x.code = null), (x.pinFaux = 0), (x.bloqueJusqua = null)))
}

export function membreActuel(): Membre | null {
  return membreDe(etatSession.lire().membreId)
}
// La part du relais (garde) ne part que vers le gérant ou un membre qui a le droit « argent » (PR-RC-09).
argentVisibleSi(() => {
  const m = membreActuel()
  return !!m && (m.role === 'proprietaire' || m.droits.includes('argent'))
})

export function acteurActuel(): Acteur {
  const m = membreActuel()
  return m ? { type: 'membre', nom: m.initiales, membreId: m.id } : { type: 'systeme', nom: null, membreId: null }
}

/** Contrôle le PIN d'un membre ; compte les essais (PIN-ESSAIS, ARL-12) ; blocage PR-PIN-BLOCAGE-MIN au dernier. */
function controlerPin(membreId: string | null, pin: string): 'ok' | 'pin_faux' | 'bloque' {
  const s = etatSession.lire()
  const t = maintenant()
  if (!membreId) return 'pin_faux'
  if (s.bloqueJusqua && s.bloqueJusqua > t) return 'bloque'
  const bon = (s.empreintes[membreId] ?? '') === empreinte(membreId + ':' + pin)
  etatSession.ecrire((x) => {
    x.pinFaux = bon ? 0 : x.pinFaux + 1
    if (bon) x.bloqueJusqua = null
    if (x.pinFaux >= C.pinEssais) Object.assign(x, { pinFaux: 0, bloqueJusqua: t + C.pinBlocageMin * 60_000 })
  })
  const apres = etatSession.lire().bloqueJusqua
  // Le gérant est prévenu du blocage (CNX-03), sur ses notifications.
  if (!bon && apres && apres > t && (!s.bloqueJusqua || s.bloqueJusqua <= t)) {
    const m = membreDe(membreId)
    notifier({ id: 'N-PIN-' + t, cle: 'relais.connexion_bloquee', vars: { n: C.pinEssais, qui: m ? m.prenom + ' ' + m.nom[0] + '.' : { fr: 'membre', en: 'member' }, min: C.pinBlocageMin }, route: 'equipe', quand: t })
  }
  return bon ? 'ok' : apres && apres > t ? 'bloque' : 'pin_faux'
}

/** Vérifie le PIN du membre connecté pour signer un geste (GEN-09) ; compte les essais (PIN-ESSAIS, ARL-12). */
export function verifierPin(pin: string): 'ok' | 'pin_faux' | 'bloque' {
  return controlerPin(etatSession.lire().membreId, pin)
}

/** Lie cet appareil à un membre et lui crée son PIN (invitation acceptée, nouveau PIN après un code SMS). */
export function lierEtCreerPin(membreId: string, pin: string) {
  etatSession.ecrire((x) => {
    x.empreintes[membreId] = empreinte(membreId + ':' + pin)
    x.appareil = membreId
    x.membreId = membreId
    x.code = null
    x.pinFaux = 0
    x.bloqueJusqua = null
    x.dernierAcces = maintenant()
    x.expiree = false
  })
}

const normaliser = (telephone: string) => telephone.replace(/\D/g, '').replace(/^237/, '')
/** « 677245310 » → « 6 •• •• •3 10 » : le numéro de l'appareil, jamais en clair à l'écran. */
const masquer = (n: string) => `${n[0]} •• •• •${n.slice(-3, -2)} ${n.slice(-2)}`

function envoyerCode(membreId: string, motif: CodeEnvoye['motif'], t: number) {
  etatSession.ecrire((x) => {
    const envois = x.code && x.code.membreId === membreId ? x.code.envois.filter((e) => e > t - 3600_000) : []
    x.code = { motif, membreId, expireA: t + C.codeSmsDureeMin * 60_000, envois: [...envois, t], essais: 0, verifie: false }
  })
}

export const demoSession: DomaineSession = {
  session() {
    const t = maintenant()
    tenirSession(t)
    const brut = membreActuel()
    const membre = brut && avecCompte(brut)
    const r = etatRelais.lire()
    const colis = tousLesColis()
    const o = occupationDuRelais(r.placesDeclarees, colis)
    // Situation « configuration » (?demo=configuration, src/demo/acces.ts) : relais pas encore ouvert.
    const statut = r.statut
    const ouverture = statut === 'suspendu' || statut === 'clos' || statut === 'en_configuration' || statut === 'candidat' ? { ouvert: false, fermeA: null, rouvreLe: null } : ouvertA(t)
    const score = etatQualite.lire().score
    const s: SessionRelais = {
      connecte: !!membre,
      maintenant: t,
      membre,
      numeroMasque: membre && numeroDe(membre.id) ? '+237 ' + masquer(numeroDe(membre.id)) : null,
      relais: membre
        ? { id: RELAIS.id, nom: RELAIS.nom, quartier: RELAIS.quartier, zone: RELAIS.zone, statut, ouvertMaintenant: ouverture.ouvert, fermeA: ouverture.fermeA, rouvreLe: ouverture.rouvreLe, placesOccupees: o.occupees, placesDeclarees: o.declarees, sature: o.seuilAtteint, trust: score, palier: palierDe(score) }
        : null,
      badges: {
        reception: colis.filter((c) => c.etat === 'attendu').length,
        stock: colis.filter(FILTRES.tous).length,
        retrait: colis.filter(FILTRES.prets).length,
        departs: colis.filter(FILTRES.a_faire_partir).length,
        notifications: nonLuesATraiter(),
        messages: etatMessages.lire().fils.reduce((n, f) => n + f.nonLus, 0),
      },
    }
    return repondre(s)
  },

  ecranConnexion() {
    const s = etatSession.lire()
    const t = maintenant()
    const lie = membreDe(s.appareil)
    const numero = s.appareil ? etatRelais.lire().telephones[s.appareil] : null
    const code = s.code
    const dernier = code ? Math.max(...code.envois) : 0
    const recents = code ? code.envois.filter((e) => e > t - 3600_000).length : 0
    const e: EcranConnexion = {
      etape: code && !code.verifie ? 'code' : code?.verifie ? 'nouveau_pin' : lie ? 'pin' : 'numero',
      prenom: (code ? (membreDe(code.membreId) && avecCompte(membreDe(code.membreId)!).prenom) : lie && avecCompte(lie).prenom) ?? null,
      numero: numero ? masquer(numero) : null,
      code: code
        ? {
            motif: code.motif,
            vers: masquer(etatRelais.lire().telephones[code.membreId] ?? '000000000'),
            expireA: code.expireA,
            renvoiA: recents >= C.envoisParHeure ? null : dernier + C.renvoiSecondes * 1000,
            essaisRestants: Math.max(0, C.codeSmsEssais - code.essais),
          }
        : null,
      pin: { essaisRestants: C.pinEssais - s.pinFaux, bloqueJusqua: s.bloqueJusqua && s.bloqueJusqua > t ? s.bloqueJusqua : null },
      sessionExpiree: s.expiree && lie ? { jours: PARAMETRES.acces.sessionJours } : null,
    }
    return repondre(e)
  },

  async commencer(telephone, o) {
    const numero = normaliser(telephone)
    if (!/^6\d{8}$/.test(numero)) return { ok: false, raison: 'numero_invalide' }
    const r = etatRelais.lire()
    const id = Object.keys(r.telephones).find((k) => numeroDe(k) === numero)
    // Candidature à l'étude (ARL-50) : pas encore d'espace, même pour un numéro déjà connu.
    if (candidatureDuNumero(numero) && r.statut === 'candidat') return { ok: false, raison: 'candidature_en_cours' }
    if (!id) return candidatureDuNumero(numero) ? { ok: false, raison: 'candidature_en_cours' } : { ok: false, raison: 'inconnu' }
    if (!r.equipe.some((m) => m.id === id)) return { ok: false, raison: 'acces_retire' }
    const s = etatSession.lire()
    if (s.appareil === id && s.empreintes[id]) return { ok: true, etape: 'pin' }
    // Nouvel appareil (ou PIN jamais créé) : code SMS d'abord, l'appareil n'est lié qu'au code juste (PAR-02).
    envoyerCode(id, 'appareil', o.heure)
    return { ok: true, etape: 'code' }
  },

  async verifierCode(code, o) {
    const c = etatSession.lire().code
    if (!c) return { ok: false, raison: 'expire' }
    if (c.expireA <= o.heure) return { ok: false, raison: 'expire' }
    if (c.essais >= C.codeSmsEssais) return { ok: false, raison: 'bloque' }
    if (code !== CODE_SMS_DEMO) {
      etatSession.ecrire((x) => void (x.code!.essais += 1))
      return { ok: false, raison: etatSession.lire().code!.essais >= C.codeSmsEssais ? 'bloque' : 'code_faux' }
    }
    const aUnPin = !!etatSession.lire().empreintes[c.membreId]
    if (c.motif === 'appareil' && aUnPin) {
      etatSession.ecrire((x) => void ((x.appareil = c.membreId), (x.code = null)))
      return { ok: true, etape: 'pin' }
    }
    etatSession.ecrire((x) => void ((x.code!.verifie = true), (x.appareil = c.membreId)))
    return { ok: true, etape: 'nouveau_pin' }
  },

  async renvoyerCode(o) {
    const c = etatSession.lire().code
    if (!c) return { ok: false, raison: 'expire' }
    const recents = c.envois.filter((e) => e > o.heure - 3600_000)
    if (recents.length >= C.envoisParHeure) return { ok: false, raison: 'trop_d_envois' }
    if (Math.max(...c.envois) + C.renvoiSecondes * 1000 > o.heure) return { ok: false, raison: 'trop_tot' }
    envoyerCode(c.membreId, c.motif, o.heure)
    return { ok: true }
  },

  async connecter(pin) {
    const s = etatSession.lire()
    const m = membreDe(s.appareil)
    if (!m) return { ok: false, raison: s.appareil ? 'acces_retire' : 'inconnu' }
    const v = controlerPin(m.id, pin)
    if (v !== 'ok') return { ok: false, raison: v }
    etatSession.ecrire((x) => void ((x.membreId = m.id), (x.dernierAcces = maintenant()), (x.expiree = false)))
    return { ok: true }
  },

  async pinOublie(o) {
    const s = etatSession.lire()
    const id = s.appareil ?? s.code?.membreId ?? null
    if (!id) return { ok: false, raison: 'expire' }
    const recents = (s.code?.envois ?? []).filter((e) => e > o.heure - 3600_000)
    if (recents.length >= C.envoisParHeure) return { ok: false, raison: 'trop_d_envois' }
    envoyerCode(id, 'oubli', o.heure)
    return { ok: true }
  },

  async creerPin(pin) {
    const c = etatSession.lire().code
    if (!c?.verifie) return { ok: false, raison: 'code_requis' }
    if (pin.length !== C.pinLongueur || !/^\d+$/.test(pin) || pinTropSimple(pin)) return { ok: false, raison: 'pin_trop_simple' }
    lierEtCreerPin(c.membreId, pin)
    return { ok: true }
  },

  async changerNumero() {
    etatSession.ecrire((x) => void ((x.appareil = null), (x.membreId = null), (x.code = null), (x.expiree = false)))
  },

  async deconnecter() {
    etatSession.ecrire((x) => void ((x.membreId = null), (x.code = null), (x.expiree = false)))
  },
}

// DONNÉES DE DÉMONSTRATION — domaine « session » : le téléphone du livreur et le serveur d'authentification.
// Deux comptes au jeu d'essai : Serge Atangana (actif, ce téléphone lui est lié, ouvert par PIN à 7 h 42) et Hervé
// Fouda (invité par Yafé Express, jamais connecté : sa première connexion se fait sur un téléphone sans session).
// Le serveur tient les compteurs (PIN faux, envois de code) et le journal de chaque ouverture, échec, blocage et
// bascule (LIV-UIX-10), sans jamais garder un PIN ni un code en clair.
import { lire, REGISTRE } from '../calculs/registre'
import { HEURE, yaounde } from '../calculs/temps'
import type { Instant, Origine } from '../donnees/communs'
import type { CodeEnCours, DomaineSession, EcranConnexion, Livreur, MotifCode, ReglesConnexion, Securite, SessionLivreur, Suite } from '../donnees/domaines/session'
import { etatAcces } from './acces'
import { maintenant } from './horloge'
import { CODE_SMS_DEMO, LIVREUR, PIN_DEMO, h } from './jeu-essai'
import { etatDisponibilite } from './disponibilite'
import { etatMessages } from './messages'
import { etatNotifications } from './notifications'
import { etatTournee } from './tournee'
import { etatTrust } from './trust'
import { scenario } from './scenario'
import { magasin, repondre } from './stockage'
import { identite, initiales, type IdentiteDepart } from '@client/compte/etat'

// La situation de départ du jeu d'essai (?demo=…) est lue avant toute donnée gardée sur l'appareil.
scenario()

// ---------- Paramètres : registre en vigueur d'abord, sinon paquet livreur ----------
// Paramètres du livreur : registre officiel seul (logique-metier/parametres-en-vigueur.json, DP-62), lus côté
// « serveur » avec une forme attendue exacte ; les écrans les reçoivent dans les réponses.
export function regle(code: string, motif: string): RegExpExecArray {
  return lire(REGISTRE, code, motif)
}
export const nombre = (code: string, motif = '(\\d[\\d\\s]*)') => Number(regle(code, motif)[1].replace(/\s/g, ''))

const renvoi = regle('OTP-RENVOI', '(\\d+) s entre deux envois, (\\d+) envois par heure')
export const REGLES_CONNEXION: ReglesConnexion = {
  pinLongueur: nombre('PIN-LONGUEUR'),
  codeLongueur: nombre('OTP-LONGUEUR'),
  pinEssais: nombre('PIN-ESSAIS'),
  pinBlocageMin: nombre('PIN-BLOCAGE-MIN'),
  codeEssais: nombre('sms_essais_code'),
  renvoiSecondes: Number(renvoi[1]),
  envoisMax: Number(renvoi[2]),
  sessionHeures: nombre('SESSION-H'),
  inactivitePreuveMin: nombre('INACTIVITE-PREUVE-MIN'),
}

// ---------- Comptes du jeu d'essai ----------
export type IdCompte = 'serge' | 'herve'
export const HERVE: Livreur = { id: 'liv-0012', prenom: 'Hervé', nom: 'Fouda', initiales: 'HF', entreprise: 'Yafé Express', vehicule: 'Moto', zone: 'Z1 Centre-ville', photo: null }
// Numéros vérifiés (+237, 9 chiffres) : seule clé de connexion ; jamais renvoyés en clair à l'application.
const COMPTES: Record<IdCompte, { livreur: Livreur; numero: string; immatriculation: string | null }> = {
  serge: { livreur: LIVREUR, numero: '677510827', immatriculation: 'CE 482 KM' },
  herve: { livreur: HERVE, numero: '699458103', immatriculation: 'CE 917 LT' },
}
/** « +237 6 77 •• •• 27 » : le numéro du livreur lui-même, partiellement masqué (LIV-UIX-09). */
// Compte modifié par le livreur (kit « compte », src/compte : photo, nom, numéro, e-mail) : Serge A. seulement, le
// compte de démonstration principal. L'en-tête, Moi et l'écran du PIN montrent aussitôt ce qu'il a changé.
export const departSerge = (): IdentiteDepart => ({ prenom: LIVREUR.prenom, nom: LIVREUR.nom, telephone: COMPTES.serge.numero, email: 'serge.atangana@exemple.cm', photo: LIVREUR.photo })
function surcharge(compte: IdCompte): Livreur {
  const l = COMPTES[compte].livreur
  if (compte !== 'serge') return l
  const i = identite('livreur', departSerge())
  return { ...l, prenom: i.prenom, nom: i.nom, initiales: initiales(i.prenom, i.nom), photo: i.photo }
}
/** Numéro du compte : celui que le livreur a changé (code SMS au nouveau numéro), sinon celui de l'invitation. */
const numeroDe = (k: IdCompte) => (k === 'serge' ? identite('livreur', departSerge()).telephone : COMPTES[k].numero)
/** Source hybride (donnees/session-hybride.ts) : ce numéro est-il celui d'un compte de la démonstration ? */
export const estNumeroDemo = (numero: string) => {
  const n = numero.replace(/\D/g, '').replace(/^237/, '')
  return (Object.keys(COMPTES) as IdCompte[]).some((k) => numeroDe(k).replace(/\D/g, '').slice(-9) === n)
}
/** Connexion par e-mail, lien ou Google (kit « compte », démonstration) : ce téléphone est lié au compte de Serge A. */
export function ouvrirParCompte() {
  etatSession.ecrire((e) => {
    e.compte = 'serge'
    e.appareilLie = true
    e.connecte = true
    e.ouverteA = maintenant()
    e.pinFaux = 0
    e.bloqueJusqua = null
    e.smsObligatoire = false
    e.code = null
    e.bascule = null
  })
}

const masquer = (n: string) => `+237 ${n[0]} ${n.slice(1, 3)} •• •• ${n.slice(7)}`
// Ancien téléphone de Serge (quand il se connecte depuis un téléphone neuf) : le serveur connaît sa dernière synchro.
const ANCIEN_APPAREIL = { nom: 'Tecno Spark 10', synchronise: h(13, 58) }

interface Evenement {
  evenement: string
  a: Instant
  cle: string | null
  detail: string | null
}

export const etatSession = magasin('session', () => ({
  compte: (scenario() === 'activation' ? 'herve' : 'serge') as IdCompte,
  appareilLie: scenario() !== 'premiere',
  connecte: scenario() !== 'premiere',
  ouverteA: (scenario() === 'activation' ? h(13, 50) : h(7, 42)) as Instant,
  pinCree: { serge: true, herve: scenario() === 'activation' } as Record<IdCompte, boolean>,
  // Empreintes salées des PIN (le serveur ne garde jamais un PIN en clair, LIV-03-R11). Hervé, déjà connecté dans la
  // situation « activation », a choisi le même PIN de démonstration.
  empreintes: { serge: empreinte('serge', PIN_DEMO), herve: scenario() === 'activation' ? empreinte('herve', PIN_DEMO) : null } as Record<IdCompte, string | null>,
  biometrie: false,
  pinChangeLe: null as Instant | null,
  colisSousGarde: scenario() === 'aucun_paquet' ? 0 : 2,
  pinFaux: 0,
  bloqueJusqua: null as Instant | null,
  smsObligatoire: false,
  code: null as (CodeEnCours & { compte: IdCompte }) | null,
  envois: [] as Instant[],
  bascule: null as { compte: IdCompte } | null,
  journal: [] as Evenement[],
}))

/** Empreinte salée d'un PIN (démonstration : FNV-1a ; le serveur réel dérive par Argon2id). */
function empreinte(sel: string, pin: string): string {
  let x = 0x811c9dc5
  for (const c of sel + ':' + pin) x = Math.imul(x ^ c.charCodeAt(0), 0x01000193) >>> 0
  return x.toString(16)
}

type Etat = ReturnType<typeof etatSession.lire>
function journaliser(e: Etat, evenement: string, o: Origine | null, detail: string | null = null) {
  e.journal.push({ evenement, a: maintenant(), cle: o?.cle ?? null, detail })
  if (e.journal.length > 200) e.journal.splice(0, e.journal.length - 200)
}

/** Suite de l'ouverture selon l'état du compte (me/state). */
export function suiteDe(compte: IdCompte): Suite {
  const etat = etatAcces.lire()[compte].etat
  return etat === 'actif' ? 'aujourdhui' : etat === 'en_activation' ? 'activation' : 'compte'
}

const sessionExpiree = (s: Etat, t: number) => s.connecte && t - s.ouverteA > REGLES_CONNEXION.sessionHeures * HEURE

function envoyer(e: Etat, compte: IdCompte, motif: MotifCode, o: Origine): CodeEnCours {
  const t = maintenant()
  e.envois = e.envois.filter((x) => t - x < HEURE)
  e.envois.push(t)
  const c = {
    compte,
    motif,
    numeroMasque: masquer(COMPTES[compte].numero),
    envoyeA: t,
    renvoiPossibleA: t + REGLES_CONNEXION.renvoiSecondes * 1000,
    envoisRestants: REGLES_CONNEXION.envoisMax - e.envois.length,
    essaisRestants: REGLES_CONNEXION.codeEssais,
    verifie: false,
  }
  e.code = c
  journaliser(e, 'auth.otp_sent', o, motif) // SMS payant accordé au livreur (LIV-P01R-04) ; jamais le code au journal
  return c
}

// Téléphone lié du jeu d'essai (le seul : LIV-03-R10) et ouvertures des jours passés connues du serveur.
const APPAREIL = { nom: 'Infinix Hot 30', lieLe: yaounde(2026, 8, 3, 9, 12) }
const CONNEXIONS_PASSEES: Securite['connexions'] = [
  { a: yaounde(2026, 10, 12, 7, 35), evenement: 'pin_ok', appareil: APPAREIL.nom },
  { a: yaounde(2026, 10, 11, 18, 2), evenement: 'verrouillage', appareil: APPAREIL.nom },
  { a: yaounde(2026, 10, 11, 7, 51), evenement: 'pin_faux', appareil: APPAREIL.nom },
  { a: yaounde(2026, 10, 11, 7, 52), evenement: 'pin_ok', appareil: APPAREIL.nom },
  { a: yaounde(2026, 10, 10, 7, 40), evenement: 'pin_ok', appareil: APPAREIL.nom },
]
const EVENEMENTS: Record<string, Securite['connexions'][number]['evenement']> = {
  'auth.pin_ok': 'pin_ok',
  'auth.biometric_ok': 'biometrie_ok',
  'auth.pin_failed': 'pin_faux',
  'auth.pin_locked': 'blocage',
  'auth.otp_sent': 'code_envoye',
  'auth.pin_changed': 'pin_change',
  'auth.locked': 'verrouillage',
}
const tropSimple = (pin: string) => pin.length !== REGLES_CONNEXION.pinLongueur || SIMPLES.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)

const SIMPLES = /^(\d)\1+$|^(0123456789|9876543210)/

export const demoSession: DomaineSession = {
  session() {
    const s = etatSession.lire()
    const t = maintenant()
    const serge = s.compte === 'serge'
    const tour = serge ? etatTournee.lire() : null
    const etatDetaille = etatAcces.lire()[s.compte].etat
    const v: SessionLivreur = {
      connecte: s.connecte && s.appareilLie && !sessionExpiree(s, t),
      maintenant: t,
      livreur: s.appareilLie ? surcharge(s.compte) : null,
      // En activation, tout envoyé et rien à refaire : « en vérification » (le serveur vérifie, LIV-P02R-05).
      etatCompte: etatDetaille === 'en_activation' && etatAcces.lire()[s.compte].pieces.every((p) => p.etat === 'en_verification' || p.etat === 'verifiee') && etatAcces.lire()[s.compte].pieces.some((p) => p.etat === 'en_verification') ? 'en_verification' : etatDetaille,
      disponibilite: etatDisponibilite.lire().statut,
      colisSousGarde: serge ? s.colisSousGarde : 0,
      trustScore: etatDetaille === 'en_activation' ? null : etatTrust.lire().score,
      badges: {
        notifications: serge ? etatNotifications.lire().filter((n) => !n.lue).length : 0,
        messages: serge ? etatMessages.lire().reduce((n, f) => n + f.nonLus, 0) : 0,
        tournee: tour ? tour.arrets.filter((a) => a.etat === 'a_faire' || a.etat === 'en_cours').length : 0,
      },
    }
    return repondre(v)
  },

  ecranConnexion() {
    const s = etatSession.lire()
    const t = maintenant()
    const c = { ...COMPTES[s.compte], livreur: surcharge(s.compte) }
    const e: EcranConnexion = {
      appareilLie: s.appareilLie,
      identite: s.appareilLie ? { prenom: c.livreur.prenom, initiales: c.livreur.initiales, photo: c.livreur.photo, entreprise: c.livreur.entreprise, vehicule: c.livreur.vehicule, immatriculation: c.immatriculation, zone: c.livreur.zone } : null,
      numeroMasque: s.appareilLie ? masquer(numeroDe(s.compte)) : null,
      biometrie: s.biometrie,
      pinCree: s.pinCree[s.compte],
      sessionExpiree: sessionExpiree(s, t),
      pinEssaisRestants: REGLES_CONNEXION.pinEssais - s.pinFaux,
      bloqueJusqua: s.bloqueJusqua && s.bloqueJusqua > t ? s.bloqueJusqua : null,
      smsObligatoire: s.smsObligatoire || (s.bloqueJusqua !== null && s.bloqueJusqua <= t),
      code: s.code ? { ...s.code, envoisRestants: REGLES_CONNEXION.envoisMax - s.envois.filter((x) => t - x < HEURE).length } : null,
      bascule: s.bascule ? { ancienAppareil: ANCIEN_APPAREIL.nom, ancienneSynchronisation: ANCIEN_APPAREIL.synchronise } : null,
      regles: REGLES_CONNEXION,
    }
    return repondre(e)
  },

  saisirNumero(numero, o) {
    const n = numero.replace(/\D/g, '').replace(/^237(?=\d{9}$)/, '')
    if (!/^6\d{8}$/.test(n)) return repondre({ ok: false as const, raison: 'numero_invalide' as const })
    const compte = (Object.keys(COMPTES) as IdCompte[]).find((k) => numeroDe(k) === n)
    const s = etatSession.lire()
    if (s.appareilLie && compte !== s.compte) {
      // Un appareil, un compte livreur (LIV-P01R-05) : refusé et signalé à la console.
      etatSession.ecrire((e) => journaliser(e, 'courier.second_account_blocked', o))
      return repondre({ ok: false as const, raison: 'autre_compte_sur_appareil' as const })
    }
    if (!compte) return repondre({ ok: false as const, raison: 'sans_invitation' as const })
    if (etatAcces.lire()[compte].etat === 'retire') return repondre({ ok: false as const, raison: 'refuse' as const })
    if (compte === 'serge') {
      // Compte déjà connecté sur un autre téléphone : avertissement des trois conséquences avant tout code.
      etatSession.ecrire((e) => void (e.bascule = { compte }))
      return repondre({ ok: true as const, bascule: true })
    }
    etatSession.ecrire((e) => void envoyer(e, compte, 'premiere_connexion', o))
    return repondre({ ok: true as const, bascule: false })
  },

  confirmerBascule(o) {
    const s = etatSession.lire()
    if (!s.bascule) return repondre({ ok: false as const, raison: 'rien_a_confirmer' as const })
    const compte = s.bascule.compte
    etatSession.ecrire((e) => void envoyer(e, compte, 'nouvel_appareil', o))
    return repondre({ ok: true as const })
  },

  demanderCode(motif, o) {
    const s = etatSession.lire()
    const t = maintenant()
    const compte = s.code?.compte ?? (s.appareilLie ? s.compte : s.bascule?.compte)
    if (!compte) return repondre({ ok: false as const, raison: 'pas_de_numero' as const })
    if (s.code && s.code.renvoiPossibleA > t && !s.code.verifie && s.code.essaisRestants > 0) return repondre({ ok: false as const, raison: 'trop_tot' as const })
    if (s.envois.filter((x) => t - x < HEURE).length >= REGLES_CONNEXION.envoisMax) return repondre({ ok: false as const, raison: 'trop_d_envois' as const })
    const c = etatSession.ecrire((e) => void envoyer(e, compte, s.code && !s.code.verifie ? s.code.motif : motif, o)).code!
    return repondre({ ok: true as const, renvoiPossibleA: c.renvoiPossibleA, envoisRestants: c.envoisRestants })
  },

  verifierCode(code, o) {
    const s = etatSession.lire()
    if (!s.code || s.code.essaisRestants <= 0) return repondre({ ok: false as const, raison: 'aucun_code' as const })
    if (code !== CODE_SMS_DEMO) {
      const e = etatSession.ecrire((x) => {
        x.code!.essaisRestants -= 1
        journaliser(x, 'auth.otp_failed', o)
        if (x.code!.essaisRestants <= 0) x.code = null // au dernier essai faux, le code est annulé (LIV-03-R01)
      })
      return repondre(e.code ? { ok: false as const, raison: 'code_faux' as const, essaisRestants: e.code.essaisRestants } : { ok: false as const, raison: 'code_annule' as const, essaisRestants: 0 })
    }
    const { motif, compte } = s.code
    const e = etatSession.ecrire((x) => {
      x.code!.verifie = true
      journaliser(x, 'auth.otp_verified', o, motif)
      if (motif === 'premiere_connexion' || motif === 'nouvel_appareil') {
        // Le téléphone est lié au compte ; l'ancien est déconnecté et l'entreprise prévenue (courier.device_switched).
        x.compte = compte
        x.appareilLie = true
        x.bascule = null
        x.pinFaux = 0
        x.bloqueJusqua = null
        x.smsObligatoire = false
        if (motif === 'nouvel_appareil') journaliser(x, 'courier.device_switched', o, ANCIEN_APPAREIL.nom)
      }
      if (motif === 'apres_blocage') {
        x.smsObligatoire = false
        x.bloqueJusqua = null
        x.pinFaux = 0
        x.code = null
      }
    })
    const creer = motif === 'pin_oublie' || !e.pinCree[compte]
    if (!creer && motif !== 'apres_blocage') etatSession.ecrire((x) => void (x.code = null))
    return repondre({ ok: true as const, suite: creer ? ('creer_pin' as const) : ('saisir_pin' as const) })
  },

  creerPin(pin, o) {
    const s = etatSession.lire()
    if (!s.code?.verifie) return repondre({ ok: false as const, raison: 'code_requis' as const })
    if (pin.length !== REGLES_CONNEXION.pinLongueur || SIMPLES.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) return repondre({ ok: false as const, raison: 'pin_trop_simple' as const })
    etatSession.ecrire((e) => {
      e.pinCree[e.compte] = true
      e.empreintes[e.compte] = empreinte(e.compte, pin)
      e.code = null
      e.connecte = true
      e.ouverteA = maintenant()
      e.pinFaux = 0
      e.smsObligatoire = false
      e.bloqueJusqua = null
      journaliser(e, 'auth.pin_set', o) // l'empreinte salée seulement, côté serveur
    })
    return repondre({ ok: true as const, suite: suiteDe(s.compte) })
  },

  verifierPin(pin, o) {
    const s = etatSession.lire()
    const t = maintenant()
    if (!s.appareilLie || !s.pinCree[s.compte]) return repondre({ ok: false as const, raison: 'pas_de_session' as const })
    if (s.bloqueJusqua && s.bloqueJusqua > t) return repondre({ ok: false as const, raison: 'bloque' as const, debloqueA: s.bloqueJusqua })
    if (s.smsObligatoire || (s.bloqueJusqua && s.bloqueJusqua <= t)) {
      etatSession.ecrire((e) => void (e.smsObligatoire = true))
      return repondre({ ok: false as const, raison: 'sms_obligatoire' as const })
    }
    if (s.empreintes[s.compte] === empreinte(s.compte, pin)) {
      etatSession.ecrire((e) => {
        e.connecte = true
        e.ouverteA = t
        e.pinFaux = 0
        journaliser(e, 'auth.pin_ok', o)
      })
      return repondre({ ok: true as const, suite: suiteDe(s.compte) })
    }
    const e = etatSession.ecrire((x) => {
      x.pinFaux += 1
      journaliser(x, 'auth.pin_failed', o)
      if (x.pinFaux >= REGLES_CONNEXION.pinEssais) {
        x.bloqueJusqua = t + REGLES_CONNEXION.pinBlocageMin * 60_000
        journaliser(x, 'auth.pin_locked', o)
      }
    })
    return repondre(
      e.bloqueJusqua && e.bloqueJusqua > t
        ? { ok: false as const, raison: 'bloque' as const, debloqueA: e.bloqueJusqua }
        : { ok: false as const, raison: 'pin_faux' as const, essaisRestants: REGLES_CONNEXION.pinEssais - e.pinFaux },
    )
  },

  deverrouillerBiometrie(o) {
    const s = etatSession.lire()
    const t = maintenant()
    if (!s.biometrie || !s.appareilLie) return repondre({ ok: false as const, raison: 'indisponible' as const })
    if (s.bloqueJusqua && s.bloqueJusqua > t) return repondre({ ok: false as const, raison: 'bloque' as const })
    if (s.smsObligatoire) return repondre({ ok: false as const, raison: 'sms_obligatoire' as const })
    etatSession.ecrire((e) => ((e.connecte = true), (e.ouverteA = t), journaliser(e, 'auth.biometric_ok', o)))
    return repondre({ ok: true as const, suite: suiteDe(s.compte) })
  },

  async annulerCode() {
    etatSession.ecrire((e) => {
      if (e.code && !e.code.verifie) e.code = null
      if (e.code?.verifie && e.code.motif === 'pin_oublie') e.code = null
      e.bascule = null
    })
  },

  securite() {
    const s = etatSession.lire()
    const ouverture: Securite['connexions'] = [{ a: s.ouverteA, evenement: 'pin_ok', appareil: APPAREIL.nom }]
    const journal = s.journal.filter((x) => EVENEMENTS[x.evenement]).map((x) => ({ a: x.a, evenement: EVENEMENTS[x.evenement], appareil: APPAREIL.nom }))
    const connexions = [...CONNEXIONS_PASSEES, ...ouverture, ...journal].sort((a, b) => b.a - a.a).slice(0, 12)
    return repondre({
      appareil: { ...APPAREIL, derniereSynchronisation: s.ouverteA },
      numeroMasque: masquer(COMPTES[s.compte].numero),
      biometrie: s.biometrie,
      pinChangeLe: s.pinChangeLe ?? null,
      connexions,
      regles: REGLES_CONNEXION,
    } satisfies Securite)
  },

  changerPin(ancien, nouveau, o) {
    const s = etatSession.lire()
    const t = maintenant()
    if (s.bloqueJusqua && s.bloqueJusqua > t) return repondre({ ok: false as const, raison: 'bloque' as const })
    if (s.empreintes[s.compte] !== empreinte(s.compte, ancien)) {
      const e = etatSession.ecrire((x) => {
        x.pinFaux += 1
        journaliser(x, 'auth.pin_failed', o)
        if (x.pinFaux >= REGLES_CONNEXION.pinEssais) {
          x.bloqueJusqua = t + REGLES_CONNEXION.pinBlocageMin * 60_000
          journaliser(x, 'auth.pin_locked', o)
        }
      })
      return repondre(e.bloqueJusqua && e.bloqueJusqua > t ? { ok: false as const, raison: 'bloque' as const } : { ok: false as const, raison: 'pin_faux' as const, essaisRestants: REGLES_CONNEXION.pinEssais - e.pinFaux })
    }
    if (ancien === nouveau) return repondre({ ok: false as const, raison: 'meme_pin' as const })
    if (tropSimple(nouveau)) return repondre({ ok: false as const, raison: 'pin_trop_simple' as const })
    etatSession.ecrire((e) => {
      e.empreintes[e.compte] = empreinte(e.compte, nouveau)
      e.pinFaux = 0
      e.pinChangeLe = t
      journaliser(e, 'auth.pin_changed', o)
    })
    return repondre({ ok: true as const })
  },

  reglerBiometrie(active, o) {
    etatSession.ecrire((e) => {
      e.biometrie = active
      journaliser(e, active ? 'auth.biometric_on' : 'auth.biometric_off', o)
    })
    return repondre({ ok: true as const })
  },

  async deconnecter() {
    etatSession.ecrire((e) => {
      e.connecte = false
      journaliser(e, 'auth.locked', null)
    })
  },
}

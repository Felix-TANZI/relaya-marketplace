// DONNÉES DE DÉMONSTRATION — domaine « horsligne » : la file des gestes faits sans réseau, et le « serveur » qui la reçoit.
// - parametre() : lecture d'un paramètre du registre officiel (logique-metier/parametres-en-vigueur.json, DP-62) ; le
//   serveur les servira par GET /config (vague 3).
// - Rejeu : au retour du réseau, chaque élément part dans l'ordre de son heure d'origine. Un élément qui porte sa
//   charge est rejoué par la source (domaine, méthode, arguments) : le « serveur » l'applique ou le refuse (motif mot
//   pour mot). Un geste déjà appliqué à la copie locale (même magasin dans la démonstration) est accusé reçu par sa clé
//   d'idempotence, sans second effet. Les domaines qui gardent eux-mêmes le détail (incident, message, contestation,
//   clôture) l'appliquent par leur REJOUEUR.
// - Le jeu d'essai garde les gestes déjà envoyés aujourd'hui (compteurs et graphiques de LIV-P22).
import { REGISTRE, lire } from '../calculs/registre'
import { HEURE } from '../calculs/temps'
import type { Origine } from '../donnees/communs'
import type { ActionEnFile, ChargeGeste, DomaineHorsLigne, FileHorsLigne, ReglesEnvoi, TypeAction } from '../donnees/domaines/horsligne'
import { maintenant } from './horloge'
import { h } from './jeu-essai'
import { magasin, repondre } from './stockage'

// ── Paramètres ──────────────────────────────────────────────────────────────────────────────────────────────
/** Paramètre du registre lu selon une forme exacte ; jamais deviné. */
export function parametre(code: string, motif: string): RegExpExecArray {
  return lire(REGISTRE, code, motif)
}
/** Paramètre entier (« 72 », « 15 min », « 18 h »). */
export const entier = (code: string) => Number(parametre(code, '(\\d+)(?:\\s*\\S.*)?')[1])

export const REGLES = (): ReglesEnvoi => ({
  expirationH: entier('LIV-FILE-EXPIRATION-H'),
  photoMaxKo: entier('LIV-PHOTO-POIDS-KO'),
  wifiAttenteMaxH: entier('LIV-WIFI-ATTENTE-MAX-H'),
  // LIV-P22R-04 : un écart entre l'heure du téléphone et celle du serveur au-delà de ce seuil est signalé.
  ecartHorlogeMaxH: entier('LIV-HORLOGE-ECART-H'),
})

// ── Rejoueurs : le serveur applique le geste reçu ───────────────────────────────────────────────────────────
export type Rejoueur = (objet: string, o: Origine, recu: number) => { refus: string } | void
export const REJOUEURS: Partial<Record<TypeAction, Rejoueur>> = {}
/** Le « serveur » reçoit une charge : l'appel est refait par la source de démonstration (chargée à la demande). */
async function rejouer(c: ChargeGeste): Promise<{ refus: string } | void> {
  const { sourceDemo } = await import('./source-demo')
  const d = (sourceDemo as unknown as Record<string, Record<string, (...a: unknown[]) => Promise<unknown>> | undefined>)[c.domaine]
  if (typeof d?.[c.methode] !== 'function') return { refus: 'geste_inconnu' }
  const r = (await d[c.methode](...c.args)) as { ok?: boolean; raison?: string } | undefined
  if (r && r.ok === false) return { refus: r.raison ?? 'refuse' }
}
/** Effet du rejeu d'un élément : charge rejouée (sauf déjà appliquée localement), sinon rejoueur du domaine. */
async function recevoir(a: ActionEnFile, t: number): Promise<{ refus: string } | void> {
  if (a.charge && !a.appliquee) return rejouer(a.charge)
  if (!a.charge) return REJOUEURS[a.type]?.(a.objet, a.origine, t)
}
/** Préférence « Envoi des photos » du compte (posée par le domaine « moi » : pas d'import croisé). */
export const CONTEXTE = { envoiPhotos: (): 'immediat' | 'wifi' => 'immediat' }

/** Preuves d'un colis sous garde : jamais retenues pour le Wi-Fi (LIV-P31R-03). */
const PREUVES_DE_GARDE = new Set<TypeAction>(['arrivee', 'etiquette', 'code_remise', 'refus', 'depot', 'domicile', 'echec', 'incident', 'stockage', 'controle', 'audit', 'emballage', 'photo', 'collecte', 'retour'])

// ── Jeu d'essai : ce qui est déjà parti aujourd'hui ───────────────────────────────────────────────────────────
const BASTOS = { lat: 3.8892, lng: 11.5137, precisionM: 12 }
function envoye(type: TypeAction, objet: string, heure: number, minute: number, photos = 0): ActionEnFile {
  const quand = h(heure, minute)
  return { type, objet, origine: { cle: `jeu-${type}-${objet}-${heure}${minute}`, heure: quand, position: BASTOS }, etat: 'envoyee', motif: null, photos, poidsKo: photos * 205, recu: quand + 4000, expireA: quand + 72 * HEURE }
}

export const etatFile = magasin<FileHorsLigne>('horsligne', () => ({
  actions: [
    envoye('disponibilite', 'disponible', 7, 42),
    envoye('arrivee', 'A1', 13, 2),
    envoye('etiquette', 'BLV-00008-1', 13, 9, 2),
    envoye('etiquette', 'BLV-00009-1', 13, 14, 2),
    envoye('code_remise', 'A1', 13, 24),
    envoye('arrivee', 'A2', 14, 1),
  ],
  horsLigneDepuis: null,
  dernierEnvoi: { a: h(14, 1) + 4000, envoyees: 1, refusees: 0 },
  conflits: [],
  annonce: null,
  ecartHorlogeMin: 0,
}))

/** Geste fait en ligne : écrit dans la file et parti aussitôt (compteurs « envoyés aujourd'hui », double horodatage). */
export function journaliserEnvoye(type: TypeAction, objet: string, o: Origine, details?: { photos?: number; poidsKo?: number }) {
  etatFile.ecrire((f) => void f.actions.push({ type, objet, origine: o, etat: 'envoyee', motif: null, photos: details?.photos ?? 0, poidsKo: details?.poidsKo ?? 0, recu: o.heure, expireA: o.heure + REGLES().expirationH * HEURE }))
}

/** Le téléphone est-il sur des données mobiles (Wi-Fi seulement : photos lourdes retenues) ? */
const surDonneesMobiles = () => {
  const c = (navigator as Navigator & { connection?: { type?: string } }).connection
  return c?.type === 'cellular'
}

export const demoHorsLigne: DomaineHorsLigne = {
  file: () => repondre(etatFile.lire()),
  regles: () => repondre(REGLES()),
  mettreEnFile(type, objet, origine, details) {
    const a: ActionEnFile = { type, objet, origine, etat: 'en_attente', motif: null, photos: details?.photos ?? 0, poidsKo: details?.poidsKo ?? 0, recu: null, expireA: origine.heure + REGLES().expirationH * HEURE }
    if (details?.charge) Object.assign(a, { charge: details.charge, appliquee: !!details.appliquee })
    etatFile.ecrire((f) => void f.actions.push(a))
    return repondre(a)
  },
  async envoyerFile() {
    const t = maintenant()
    const { wifiAttenteMaxH } = REGLES()
    const wifi = CONTEXTE.envoiPhotos() === 'wifi' && surDonneesMobiles()
    // Ordre chronologique (heure d'origine) ; un élément expiré reste en file, signalé (relancé à la main).
    const ordre = etatFile
      .lire()
      .actions.filter((a) => a.etat === 'en_attente')
      .sort((a, b) => a.origine.heure - b.origine.heure)
      .filter((a) => !(a.expireA !== undefined && t >= a.expireA))
      .filter((a) => !(wifi && (a.photos ?? 0) > 0 && !PREUVES_DE_GARDE.has(a.type) && t < a.origine.heure + wifiAttenteMaxH * HEURE))
    const issues = new Map<string, { refus: string } | void>()
    for (const a of ordre) {
      try {
        issues.set(a.origine.cle, await recevoir(a, t))
      } catch {
        // Le serveur n'a pas répondu : l'élément reste en file, il repartira au prochain envoi.
      }
    }
    let envoyees = 0
    let refusees = 0
    const f = etatFile.ecrire((x) => {
      for (const a of x.actions) {
        if (a.etat !== 'en_attente' || !issues.has(a.origine.cle)) continue
        const r = issues.get(a.origine.cle)
        a.recu = t
        a.etat = r ? 'refusee' : 'envoyee'
        a.motif = r ? r.refus : null
        if (r) refusees += 1
        else envoyees += 1
      }
      x.horsLigneDepuis = null
      x.dernierEnvoi = { a: t, envoyees, refusees }
    })
    return f.dernierEnvoi
  },
  async relancer(cle) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false as const, raison: 'hors_ligne' as const }
    const a = etatFile.lire().actions.find((x) => x.origine.cle === cle && x.etat === 'en_attente')
    if (!a) return { ok: false as const, raison: 'introuvable' as const }
    const t = maintenant()
    const r = await recevoir(a, t)
    etatFile.ecrire((f) => {
      const x = f.actions.find((y) => y.origine.cle === cle)!
      x.recu = t
      x.tardif = true
      x.etat = r ? 'refusee' : 'envoyee'
      x.motif = r ? r.refus : null
    })
    return { ok: true as const }
  },
  async conflitVu(objet) {
    etatFile.ecrire((f) => f.conflits.forEach((c) => c.objet === objet && (c.vu = true)))
  },
  async noterReseau(depuis) {
    if (etatFile.lire().horsLigneDepuis === null) etatFile.ecrire((f) => void (f.horsLigneDepuis = depuis))
  },
}

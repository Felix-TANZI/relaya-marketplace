// Domaine « horsligne » branché sur le kit (relais_compte ; relais_core/synchro.py) : la file des gestes faits sans
// réseau vit SUR LE TÉLÉPHONE (localStorage « blv_r_file », en mémoire si le stockage est refusé). Au retour du réseau,
// elle part par POST /api/relay/sync/batch {actions: [{origine, charge, preuve?}]} : le serveur rejoue chaque geste,
// dans l'ordre des heures d'origine, PAR SA PROPRE ROUTE (mêmes droits, rejeu idempotent par origine.cle) et rend
// {a, envoyees, refusees, resultats[{cle, ok, raison}]} (motif du serveur, mot pour mot).
// - Le PIN ne voyage JAMAIS dans la file (ARL-46) : un geste signé porte « preuve » = HMAC-SHA256(clé de l'appareil
//   rendue à l'ouverture de session, origine.cle), calculée ici au moment de la mise en file ; le serveur la vérifie.
// - Le paiement Mobile Money au comptoir n'est jamais rejoué (OFF-02) : le serveur le refuse « reseau_requis ».
// - Une action en file depuis plus de PR-OFF-EXPIRATION-H heures est « expirée » : jamais envoyée, jamais effacée
//   (OFF-05) ; « refaite » la marque quand le geste a été refait. Rien ne se perd, pas d'action « vider la file ».
import type { ClientApi } from '@client/api/client'
import { PARAMETRES } from '../../calculs/registre'
import { jourDe } from '../../calculs/temps'
import type { Instant } from '../../donnees/communs'
import type { ActionEnFile, DomaineHorsLigne, FileHorsLigne, ReglesFile } from '../../donnees/domaines/horsligne'
import type { SourceRelais } from '../../donnees/source'
import { appels, prevenir } from '../outils'
import { cleHorsLigne } from './session'

const CLE = 'blv_r_file'
const HEURE = 3_600_000
/** Taille d'un envoi (relais_core.synchro.ACTIONS_MAX) : une file plus longue part en plusieurs fois. */
const PAR_ENVOI = 200
const CODES_REGLES = 'PR-OFF-EXPIRATION-H,PHOTO-MAX-KO,PR-HL-REMISES,PR-PAPIER-SAISIE-H'

type ActionLocale = ActionEnFile & { preuve?: string }
interface EtatLocal {
  actions: ActionLocale[]
  horsLigneDepuis: Instant | null
  dernierEnvoi: FileHorsLigne['dernierEnvoi']
  regles: ReglesFile | null
}
interface Bilan {
  a: Instant
  envoyees: number
  refusees: number
  resultats: { cle: string; ok: boolean; raison: string | null }[]
}

const P = PARAMETRES.relais
/** Règles du registre embarqué : seulement tant que le serveur n'a pas encore répondu (premier geste sans réseau). */
const REGLES_LOCALES: ReglesFile = { expirationH: P.fileExpirationH, photoMaxKo: P.photoMaxKo, remisesHorsLigneParJour: P.horsLigneRemisesParJour, papierSaisieH: P.papierSaisieH }
const vide = (): EtatLocal => ({ actions: [], horsLigneDepuis: null, dernierEnvoi: null, regles: null })
let memoire: EtatLocal | null = null

function lire(): EtatLocal {
  if (memoire) return memoire
  try {
    const brut = typeof localStorage === 'undefined' ? null : localStorage.getItem(CLE)
    memoire = brut ? { ...vide(), ...(JSON.parse(brut) as Partial<EtatLocal>) } : vide()
  } catch {
    memoire = vide()
  }
  return memoire
}
function ecrire(f: (e: EtatLocal) => void): EtatLocal {
  const e = lire()
  f(e)
  memoire = e
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(CLE, JSON.stringify(e))
  } catch {
    // stockage plein ou refusé : la file reste en mémoire pour la session
  }
  return e
}

/** Preuve signée d'un geste fait sans réseau : HMAC-SHA256(clé de l'appareil, origine.cle), en hexadécimal. */
export async function signer(cle: string, texte: string): Promise<string | null> {
  const c = globalThis.crypto?.subtle
  if (!c) return null
  const k = await c.importKey('raw', new TextEncoder().encode(cle), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const s = new Uint8Array(await c.sign('HMAC', k, new TextEncoder().encode(texte)))
  return [...s].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const versEcran = ({ preuve: _p, ...a }: ActionLocale): ActionEnFile => (void _p, a)

/** Expire les actions trop vieilles (OFF-05). */
function entretenir(t: number) {
  if (lire().actions.some((a) => a.etat === 'en_attente' && t >= a.expireA)) ecrire((e) => e.actions.forEach((a) => a.etat === 'en_attente' && t >= a.expireA && (a.etat = 'expiree')))
}

export function domaineHorsligne(api: ClientApi): SourceRelais['horsligne'] {
  const a = appels(api)
  const regles = async () => {
    const r = await a.get<ReglesFile>('/config', { query: { codes: CODES_REGLES } })
    ecrire((e) => void (e.regles = r))
    return r
  }
  const d: DomaineHorsLigne = {
    async file() {
      const t = Date.now()
      entretenir(t)
      const e = lire()
      const jour = jourDe(t)
      const remisesHorsLigneDuJour = e.actions.filter((x) => x.charge?.domaine === 'retrait' && x.charge.methode === 'remettre' && jourDe(x.origine.heure) === jour).length
      return { actions: e.actions.map(versEcran), horsLigneDepuis: e.horsLigneDepuis, dernierEnvoi: e.dernierEnvoi, remisesHorsLigneDuJour, modePapier: null }
    },
    async regles() {
      try {
        return await regles()
      } catch (x) {
        const r = lire().regles
        if (r) return r
        throw x
      }
    },
    async mettreEnFile(type, objet, origine, details) {
      const r = lire().regles ?? REGLES_LOCALES
      const c = details?.charge
      const cle = cleHorsLigne()
      // Geste signé : sa charge porte la marque « preuve-pin: » à la place du PIN (donnees/fileHorsLigne.ts, sansPin).
      const preuve = c && cle && JSON.stringify(c.args).includes('"preuve-pin:') ? await signer(cle, origine.cle).catch(() => null) : null
      const x: ActionLocale = {
        type,
        objet,
        origine,
        etat: 'en_attente',
        motif: null,
        photos: details?.photos ?? 0,
        recu: null,
        expireA: origine.heure + r.expirationH * HEURE,
        ...(c ? { charge: c, appliquee: !!details?.appliquee } : {}),
        ...(preuve ? { preuve } : {}),
      }
      ecrire((e) => void (e.actions.some((y) => y.origine.cle === origine.cle) || e.actions.push(x)))
      prevenir('horsligne')
      return versEcran(x)
    },
    async envoyerFile() {
      const t = Date.now()
      entretenir(t)
      // Ordre chronologique (heure d'origine) ; un geste « appliqué » sur le téléphone part aussi : le serveur seul
      // décide, et la même clé ne fait jamais deux effets.
      const lot = lire()
        .actions.filter((x) => x.etat === 'en_attente' && x.charge)
        .sort((x, y) => x.origine.heure - y.origine.heure)
      let bilan: NonNullable<FileHorsLigne['dernierEnvoi']> = { a: t, envoyees: 0, refusees: 0 }
      for (let i = 0; i < lot.length; i += PAR_ENVOI) {
        const part = lot.slice(i, i + PAR_ENVOI)
        const r = await a.post<Bilan>('/sync/batch', { actions: part.map((x) => ({ origine: x.origine, charge: x.charge, ...(x.preuve ? { preuve: x.preuve } : {}) })) })
        const parCle = new Map(r.resultats.map((y) => [y.cle, y]))
        ecrire((e) => {
          for (const x of e.actions) {
            const res = parCle.get(x.origine.cle)
            if (!res || x.etat !== 'en_attente') continue
            Object.assign(x, { etat: res.ok ? 'envoyee' : 'refusee', motif: res.ok ? null : res.raison, recu: r.a })
          }
        })
        bilan = { a: r.a, envoyees: bilan.envoyees + r.envoyees, refusees: bilan.refusees + r.refusees }
      }
      ecrire((e) => {
        e.horsLigneDepuis = null
        e.dernierEnvoi = bilan
      })
      prevenir('horsligne')
      return bilan
    },
    noterReseau: async (depuis) => void ecrire((e) => void (e.horsLigneDepuis ??= depuis)),
    async marquerRefaite(cle) {
      if (!lire().actions.some((x) => x.origine.cle === cle && x.etat === 'expiree')) return { ok: false, raison: 'introuvable' }
      ecrire((e) => void (e.actions.find((x) => x.origine.cle === cle)!.motif = 'refaite'))
      prevenir('horsligne')
      return { ok: true }
    },
  }
  return d
}

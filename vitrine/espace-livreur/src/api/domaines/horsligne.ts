// Domaine « horsligne » branché sur le kit (backend-kit/apps/livreur_tournee) : la file des gestes faits sans réseau vit
// SUR LE TÉLÉPHONE (localStorage, protégé : un stockage refusé garde la file en mémoire pour la session). Au retour du
// réseau, elle part par lot (POST /api/courier/sync/batch) : le serveur rejoue chaque geste dans l'ordre de son heure
// d'origine, par la même route que le geste fait en ligne, idempotent par origine.cle ; un geste sans le détail
// nécessaire est refusé avec un motif lisible ; en cas d'écart, la version du serveur s'impose (conflits).
// Jamais d'action « vider la file » ni « supprimer » (LIV-08-R37) : un élément expiré reste, « Réessayer l'envoi » le relance.
// Chaque geste mis en file par geste() porte sa CHARGE (domaine, méthode, arguments) : elle est traduite, sur le
// téléphone, en la REQUÊTE exacte que ce geste enverrait en ligne (chemin sous /api/courier/ et corps avec l'origine),
// sans rien envoyer ; le lot la rejoue par la même route. Une photo prise sans réseau reçoit un identifiant provisoire
// « file-<clé> », remplacé par le serveur, dans le même lot, par celui de la preuve déposée (POST /media).
import { creerClient, stockageMemoire, type ClientApi } from '@client/api/client'
import type { Instant, Origine } from '../../donnees/communs'
import type { ActionEnFile, ChargeGeste, Conflit, DomaineHorsLigne, FileHorsLigne, ReglesEnvoi, TypeAction } from '../../donnees/domaines/horsligne'
import type { SourceLivreur } from '../../donnees/source'
import { appels } from '../outils'

const CLE = 'belivay-livreur-file-v1'
const HEURE = 3_600_000

/** Action gardée sur le téléphone : ce que l'écran voit, plus le détail du geste (corps) quand le domaine l'a donné. */
type Requete = { chemin: string; corps: Record<string, unknown> }
type ActionLocale = ActionEnFile & { corps?: Record<string, unknown>; requete?: Requete }
interface EtatLocal {
  actions: ActionLocale[]
  horsLigneDepuis: Instant | null
  dernierEnvoi: FileHorsLigne['dernierEnvoi']
  conflits: Conflit[]
  ecartHorlogeMin: number
  regles: ReglesEnvoi | null
}
interface ResultatLot {
  a: Instant
  envoyees: number
  refusees: number
  resultats: { cle: string; etat: 'envoyee' | 'refusee'; motif: string | null; recu: Instant; tardif: boolean }[]
  conflits: Conflit[]
  heureServeur: Instant
}

const vide = (): EtatLocal => ({ actions: [], horsLigneDepuis: null, dernierEnvoi: null, conflits: [], ecartHorlogeMin: 0, regles: null })
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

const versEcran = ({ corps: _c, requete: _r, ...a }: ActionLocale): ActionEnFile => (void _c, void _r, a)

/** Identifiant provisoire d'un objet créé sans réseau (preuve photo) : remplacé au rejeu par celui du serveur. */
export const idProvisoire = (cle: string) => 'file-' + cle

/**
 * Requête qu'enverrait un geste en ligne, calculée sans réseau : le connecteur du domaine est appelé avec un client qui
 * note l'appel au lieu de l'envoyer. Seules les requêtes d'écriture sous /courier/ sont gardées (une lecture n'a rien à
 * rejouer). `fabrique` : les connecteurs (BRANCHES), passés par source-api pour éviter un import circulaire.
 */
export async function requeteDe(charge: ChargeGeste, fabrique: (api: ClientApi) => SourceLivreur): Promise<Requete | null> {
  let note: Requete | null = null
  const origine = charge.args.find((x): x is Origine => !!x && typeof x === 'object' && 'cle' in x && 'heure' in x)
  const capteur = creerClient({
    baseUrl: 'http://file.local/api',
    stockage: stockageMemoire({ acces: 'file', rafraichissement: null }),
    tentatives: 0,
    attendre: async () => {},
    fetch: (async (url: string, init: RequestInit) => {
      const chemin = new URL(String(url)).pathname.replace(/^\/api/, '')
      const methode = (init.method ?? 'GET').toUpperCase()
      if (methode !== 'GET' && chemin.startsWith('/courier/') && !note) {
        const corps = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
        note = { chemin: '/api' + chemin, corps }
      }
      const reponse = { ok: true, enFile: true, ...(origine ? { id: idProvisoire(origine.cle) } : {}) }
      return new Response(JSON.stringify(reponse), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch,
  })
  const domaine = (fabrique(capteur) as unknown as Record<string, Record<string, (...a: unknown[]) => Promise<unknown>>>)[charge.domaine]
  if (!domaine?.[charge.methode]) return null
  try {
    await domaine[charge.methode](...charge.args)
  } catch {
    return note
  }
  return note
}

/** Met un geste en file avec son détail (corps), pour qu'il soit rejoué tel quel par le serveur (incident, etc.). */
export function enFile(type: TypeAction, objet: string, origine: Origine, corps?: Record<string, unknown>, details?: { photos?: number; poidsKo?: number; requete?: Requete | null; appliquee?: boolean }): ActionEnFile {
  const r = lire().regles
  const a: ActionLocale = {
    type,
    objet,
    origine,
    etat: 'en_attente',
    motif: null,
    photos: details?.photos ?? 0,
    poidsKo: details?.poidsKo ?? 0,
    recu: null,
    ...(r ? { expireA: origine.heure + r.expirationH * HEURE } : {}),
    ...(details?.appliquee ? { appliquee: true } : {}),
    ...(corps ? { corps } : {}),
    ...(details?.requete ? { requete: details.requete } : {}),
  }
  ecrire((e) => void e.actions.push(a))
  return versEcran(a)
}

/** Gestes encore en file (pour les domaines qui montrent leurs éléments « en file », comme les incidents). */
export const actionsEnFile = (type: TypeAction): ActionLocale[] => lire().actions.filter((a) => a.type === type && a.etat === 'en_attente')

const enLigne = () => (typeof navigator === 'undefined' ? true : navigator.onLine)

export function domaineHorsligne(api: ClientApi, fabrique?: (api: ClientApi) => SourceLivreur): SourceLivreur['horsligne'] {
  const a = appels(api)
  const regles = async () => {
    const r = await a.get<ReglesEnvoi>('/sync/rules')
    ecrire((e) => {
      e.regles = r
      for (const x of e.actions) if (x.expireA === undefined) x.expireA = x.origine.heure + r.expirationH * HEURE
    })
    return r
  }
  /** Envoie un lot et range la réponse du serveur dans la file (heure du serveur, motif mot pour mot, conflits). */
  const envoyer = async (lot: ActionLocale[], tardif: boolean): Promise<ResultatLot> => {
    const r = await a.post<ResultatLot>('/sync/batch', {
      actions: lot.map((x) => ({ type: x.type, objet: x.objet, origine: x.origine, ...(x.corps ? { corps: x.corps } : {}), ...(x.requete ? { requete: x.requete } : {}) })),
    })
    const parCle = new Map(r.resultats.map((x) => [x.cle, x]))
    ecrire((e) => {
      for (const x of e.actions) {
        const res = parCle.get(x.origine.cle)
        if (!res || x.etat !== 'en_attente') continue
        x.etat = res.etat
        x.motif = res.motif
        x.recu = res.recu
        if (tardif || res.tardif) x.tardif = true
      }
      for (const c of r.conflits) if (!e.conflits.some((y) => y.objet === c.objet && y.a === c.a)) e.conflits.push(c)
      e.ecartHorlogeMin = Math.round((Date.now() - r.heureServeur) / 60_000)
    })
    return r
  }
  const d: DomaineHorsLigne = {
    file: async () => {
      const e = lire()
      return { actions: e.actions.map(versEcran), horsLigneDepuis: e.horsLigneDepuis, dernierEnvoi: e.dernierEnvoi, conflits: e.conflits, annonce: null, ecartHorlogeMin: e.ecartHorlogeMin }
    },
    regles: async () => {
      try {
        return await regles()
      } catch (x) {
        const r = lire().regles
        if (r) return r
        throw x
      }
    },
    mettreEnFile: async (type, objet, origine, details) => {
      if (!lire().regles) await regles().catch(() => null)
      // La charge du geste devient la requête exacte à rejouer (même route, même corps, même clé d'idempotence).
      const requete = details?.charge && fabrique ? await requeteDe(details.charge, fabrique) : null
      return enFile(type, objet, origine, undefined, { photos: details?.photos, poidsKo: details?.poidsKo, requete, appliquee: details?.appliquee })
    },
    envoyerFile: async () => {
      const t = Date.now()
      // Ordre chronologique (heure d'origine) ; un élément expiré reste en file : « Réessayer l'envoi » le relance.
      const lot = lire()
        .actions.filter((x) => x.etat === 'en_attente' && (x.expireA === undefined || t < x.expireA))
        .sort((x, y) => x.origine.heure - y.origine.heure)
      let bilan: NonNullable<FileHorsLigne['dernierEnvoi']> = { a: t, envoyees: 0, refusees: 0 }
      if (lot.length) {
        const r = await envoyer(lot, false)
        bilan = { a: r.a, envoyees: r.envoyees, refusees: r.refusees }
      }
      ecrire((e) => {
        e.horsLigneDepuis = null
        e.dernierEnvoi = bilan
      })
      return bilan
    },
    relancer: async (cle) => {
      if (!enLigne()) return { ok: false as const, raison: 'hors_ligne' as const }
      const x = lire().actions.find((y) => y.origine.cle === cle && y.etat === 'en_attente')
      if (!x) return { ok: false as const, raison: 'introuvable' as const }
      await envoyer([x], true)
      return { ok: true as const }
    },
    conflitVu: async (objet) => void ecrire((e) => e.conflits.forEach((c) => c.objet === objet && (c.vu = true))),
    noterReseau: async (depuis) => void ecrire((e) => void (e.horsLigneDepuis ??= depuis)),
  }
  return d
}

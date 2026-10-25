// File hors connexion de l'entreprise (motif M8, ENT-01-R17), sur le modèle du livreur (espace-livreur/src/donnees/
// fileHorsLigne.ts) : sans réseau, un geste n'est ni perdu ni refusé, il est GARDÉ sur l'appareil puis envoyé au
// retour du réseau, dans l'ordre où il a été fait.
// - geste(libelle, faire) : en ligne, fait le geste ; hors connexion, note l'appel exact (domaine, méthode, arguments
//   copiés) par une source qui enregistre, et le met en file (localStorage blv_e_file) ;
// - envoyerLaFile() : rejoue la file, geste par geste ; un geste refusé (Resultat ok:false, rôle, règle) sort de la
//   file et reste affiché avec sa raison jusqu'à ce qu'on l'ait lu ; l'envoi s'arrête si le réseau retombe ;
// - au retour du réseau (événement online), la file part toute seule ; useFile() la lit en direct (événement blv:file).
// Un geste en file peut être retiré avant l'envoi. Les gestes d'argent (contestation, versement) n'y passent jamais.
import { useEffect, useState } from 'react'
import { source, type SourceEntreprise } from './source'

export interface GesteEnFile {
  id: string
  libelle: string // ce que la personne a fait, en français (traduit à l'affichage par t())
  objet?: string // référence montrée à côté (« PQ-2026-0042 »)
  appels: { domaine: string; methode: string; args: unknown[] }[]
  le: number
  raisons?: Record<string, string> // code de refus → phrase française montrée si le serveur refuse à l'envoi
}
export interface GesteRefuse {
  id: string
  libelle: string
  objet?: string
  raison: string
}
export interface EtatFile {
  gestes: GesteEnFile[]
  refuses: GesteRefuse[]
  dernierEnvoi: number | null
}

const CLE = 'blv_e_file'
const vide = (): EtatFile => ({ gestes: [], refuses: [], dernierEnvoi: null })

export const enLigneMaintenant = () => (typeof navigator === 'undefined' ? true : navigator.onLine)

export function lireFile(): EtatFile {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? 'null') as EtatFile | null
    return v && Array.isArray(v.gestes) && Array.isArray(v.refuses) ? v : vide()
  } catch {
    return vide()
  }
}

function ecrire(f: (e: EtatFile) => void) {
  const e = lireFile()
  f(e)
  try {
    localStorage.setItem(CLE, JSON.stringify(e))
  } catch {
    /* stockage refusé : la file vaut pour la visite */
  }
  window.dispatchEvent(new CustomEvent('blv:file'))
}

const nouvelId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

type Appelable = Record<string, Record<string, (...a: unknown[]) => Promise<unknown>>>

/** Source qui note chaque appel et répond « accepté, en file » sans rien envoyer. */
function sourceQuiNote(appels: GesteEnFile['appels']): SourceEntreprise {
  return new Proxy({} as SourceEntreprise, {
    get: (_, domaine: string) =>
      new Proxy(
        {},
        {
          get: (__, methode: string) =>
            (...args: unknown[]) => {
              appels.push({ domaine, methode, args: JSON.parse(JSON.stringify(args ?? [])) as unknown[] })
              return Promise.resolve({ ok: true as const, enFile: true as const })
            },
        },
      ),
  })
}

export type IssueGeste<T> = { etat: 'fait'; r: T } | { etat: 'en_file'; id: string }

/**
 * Un geste qui tient sans réseau. `faire(s)` appelle la source par `s` (une ou plusieurs méthodes). En ligne : fait
 * tout de suite, réponse de la source rendue. Hors connexion : gardé en file, envoyé au retour du réseau.
 */
export async function geste<T>(libelle: string, faire: (s: SourceEntreprise) => Promise<T>, objet?: string, raisons?: Record<string, string>): Promise<IssueGeste<T>> {
  if (enLigneMaintenant()) return { etat: 'fait', r: await faire(source) }
  const appels: GesteEnFile['appels'] = []
  await faire(sourceQuiNote(appels))
  const id = nouvelId()
  ecrire((e) => void e.gestes.push({ id, libelle, objet, appels, le: Date.now(), ...(raisons ? { raisons } : {}) }))
  return { etat: 'en_file', id }
}

/** Retirer un geste encore en file (il ne partira pas). */
export const retirerDeLaFile = (id: string) => ecrire((e) => void (e.gestes = e.gestes.filter((g) => g.id !== id)))
/** Le refus d'un geste a été lu. */
export const oublierRefus = (id: string) => ecrire((e) => void (e.refuses = e.refuses.filter((g) => g.id !== id)))

let envoiEnCours: Promise<{ envoyes: number; refuses: number }> | null = null

/** Rejoue la file dans l'ordre ; un seul envoi à la fois ; rien sans réseau. */
export function envoyerLaFile(): Promise<{ envoyes: number; refuses: number }> {
  if (envoiEnCours) return envoiEnCours
  envoiEnCours = (async () => {
    let envoyes = 0
    let refuses = 0
    for (const g of lireFile().gestes) {
      if (!enLigneMaintenant()) break
      let raison: string | null = null
      try {
        for (const a of g.appels) {
          const r = await (source as unknown as Appelable)[a.domaine][a.methode](...a.args)
          if (r && typeof r === 'object' && 'ok' in r && (r as { ok: unknown }).ok === false) {
            const code = String((r as { raison?: unknown }).raison ?? 'refus')
            raison = g.raisons?.[code] ?? code
            break
          }
        }
      } catch (x) {
        if (!enLigneMaintenant()) break // le réseau est retombé : le geste reste en file
        raison = x instanceof Error ? x.message : String(x)
      }
      ecrire((e) => {
        e.gestes = e.gestes.filter((y) => y.id !== g.id)
        if (raison !== null) e.refuses.push({ id: g.id, libelle: g.libelle, objet: g.objet, raison })
        e.dernierEnvoi = Date.now()
      })
      if (raison === null) envoyes++
      else refuses++
    }
    return { envoyes, refuses }
  })().finally(() => (envoiEnCours = null))
  return envoiEnCours
}

if (typeof window !== 'undefined') window.addEventListener('online', () => void envoyerLaFile())

/** La file lue en direct (gestes en attente, refus à lire, dernier envoi). */
export function useFile(): EtatFile {
  const [e, setE] = useState(lireFile)
  useEffect(() => {
    const maj = () => setE(lireFile())
    window.addEventListener('blv:file', maj)
    window.addEventListener('storage', maj)
    return () => (window.removeEventListener('blv:file', maj), window.removeEventListener('storage', maj))
  }, [])
  return e
}

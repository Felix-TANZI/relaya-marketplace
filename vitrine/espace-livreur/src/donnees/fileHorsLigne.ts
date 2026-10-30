// Hors connexion PRIORITAIRE (LIV-P22, LIV-UIX-10) : le livreur travaille sur la route, souvent sans réseau.
// - origine() : clé d'idempotence + heure et position du téléphone, jointes à TOUTE action métier ;
// - useEnLigne : le téléphone a-t-il du réseau (événements online / offline), suivi en direct ;
// - useReseauGlobal (monté UNE fois, dans App.tsx) : au passage hors connexion, note l'heure des données affichées ;
//   au retour du réseau, rejoue la file toute seule ;
// - geste() : fait le geste en ligne, sinon le met en file avec son origine et sa CHARGE (l'appel exact, noté par une
//   source qui enregistre) ; un geste « local » s'applique aussi à la copie du téléphone ; useFile() : la file lue.
import { useEffect, useState } from 'react'
import type { Origine, Position } from './communs'
import type { ActionEnFile, ChargeGeste, FileHorsLigne, TypeAction } from './domaines/horsligne'
import { source, type SourceLivreur } from './source'
import { useLecture } from './useLecture'
import { signal } from '../composants/signaux'

const enLigneMaintenant = () => (typeof navigator === 'undefined' ? true : navigator.onLine)

// Dernière position connue (posée par les écrans de la tournée quand le livreur l'accorde) ; jamais demandée ici.
let derniere: Position | null = null
export const noterPosition = (p: Position | null) => void (derniere = p)

/** Origine d'un geste : clé unique (rejouable sans double effet), heure du serveur, dernière position connue. */
export function origine(maintenant: number): Origine {
  const cle = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${maintenant}-${Math.random().toString(36).slice(2)}`
  return { cle, heure: maintenant, position: derniere }
}

export function useEnLigne(): boolean {
  const [en, setEn] = useState(enLigneMaintenant)
  useEffect(() => {
    const maj = () => setEn(enLigneMaintenant())
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => {
      window.removeEventListener('online', maj)
      window.removeEventListener('offline', maj)
    }
  }, [])
  return en
}

let envoiEnCours = false
/** Rejoue la file d'attente (au retour du réseau, ou « Synchroniser maintenant ») ; un seul envoi à la fois. */
export async function envoyerLaFile(): Promise<FileHorsLigne['dernierEnvoi']> {
  if (envoiEnCours || !enLigneMaintenant()) return null
  envoiEnCours = true
  try {
    const f = await source.horsligne.file()
    if (!f.actions.some((a) => a.etat === 'en_attente') && f.horsLigneDepuis === null) return null
    const bilan = await source.horsligne.envoyerFile()
    if (bilan?.envoyees) signal(bilan.refusees ? 'alerte' : 'succes')
    return bilan
  } finally {
    envoiEnCours = false
  }
}

/** Réseau de toute l'application (App.tsx) : heure des données notée hors connexion, file rejouée au retour. */
export function useReseauGlobal(maintenant: number | null): boolean {
  const en = useEnLigne()
  useEffect(() => {
    if (maintenant === null) return // pas de session : rien à noter ni à rejouer
    if (!en) void source.horsligne.noterReseau(maintenant)
    else void envoyerLaFile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [en, maintenant === null])
  return en
}

/**
 * Source qui note l'appel fait par un geste (domaine, méthode, arguments copiés) : c'est la charge mise en file.
 * `appliquer` : l'appel est aussi fait (copie locale) ; sinon il est seulement noté et répond « accepté, en attente ».
 */
export function sourceQuiNote(appliquer: boolean): { s: SourceLivreur; charge: () => ChargeGeste | null } {
  let charge: ChargeGeste | null = null
  const s = new Proxy({} as SourceLivreur, {
    get: (_, domaine: string) =>
      new Proxy({}, {
        get: (__, methode: string) =>
          (...args: unknown[]) => {
            charge = { domaine, methode, args: JSON.parse(JSON.stringify(args)) as unknown[] }
            const d = (source as unknown as Record<string, Record<string, (...a: unknown[]) => Promise<unknown>>>)[domaine]
            // Réponse « acceptée, en file » ; un objet créé sans réseau (preuve photo) reçoit un identifiant provisoire
            // « file-<clé> », remplacé au rejeu par celui du serveur.
            const cle = args.find((x): x is Origine => !!x && typeof x === 'object' && 'cle' in x && 'heure' in x)?.cle
            const enFile = { ok: true as const, enFile: true as const, ...(cle ? { id: 'file-' + cle } : {}) }
            if (!appliquer) return Promise.resolve(enFile)
            // Copie du téléphone (démonstration) ; avec le serveur, sans réseau, l'appel échoue : le geste part en file.
            return d[methode](...args).catch((x: unknown) => {
              if (enLigneMaintenant()) throw x
              return enFile
            })
          },
      }),
  })
  return { s, charge: () => charge }
}

/**
 * Un geste qui marche hors connexion. `faire(s)` appelle la source par `s`. En ligne : fait tout de suite. Hors
 * connexion : mis en file avec son origine et sa charge, rejoué au retour du réseau ; `local` (tournée, paquet
 * téléchargé, kit, réglages) l'applique en plus à la copie du téléphone, le rejeu garde la même clé d'idempotence.
 */
export async function geste<T>(enLigne: boolean, type: TypeAction, objet: string, o: Origine, faire: (s: SourceLivreur) => Promise<T>, local = false): Promise<{ etat: 'fait' | 'en_file'; r: T }> {
  if (enLigne) return { etat: 'fait', r: await faire(source) }
  const n = sourceQuiNote(local)
  const r = await faire(n.s)
  await source.horsligne.mettreEnFile(type, objet, o, { charge: n.charge() ?? undefined, appliquee: local })
  return { etat: 'en_file', r }
}

/** La file lue dans la source (relue à chaque changement de données) ; null tant qu'elle n'est pas arrivée. */
export function useFile(): FileHorsLigne | null {
  return useLecture(() => source.horsligne.file(), []).donnees
}

/** Actions encore en attente d'envoi (d'un type donné, ou toutes). */
export const enAttente = (f: FileHorsLigne | null, type?: TypeAction): ActionEnFile[] => (f ? f.actions.filter((a) => a.etat === 'en_attente' && (!type || a.type === type)) : [])

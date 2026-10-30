// Hors connexion (PR-02 OFF-01 à OFF-06, A-VALIDER ARL-03) : le comptoir travaille aussi quand le réseau tombe.
// - origine() : clé d'idempotence + heure et position du téléphone, jointes à TOUTE action métier ;
// - useEnLigne : le téléphone a-t-il du réseau (événements online / offline), suivi en direct ;
// - useReseauGlobal (monté UNE fois, dans App.tsx) : au passage hors connexion, note l'heure ; au retour du réseau,
//   rejoue la file toute seule ;
// - geste() : fait le geste en ligne, sinon le met en file avec son origine et sa CHARGE (l'appel exact) ; un geste
//   « local » s'applique aussi à la copie du téléphone (rejoué ensuite avec la même clé : jamais deux effets) ;
// - le paiement Mobile Money au comptoir n'est JAMAIS mis en file (OFF-02) : geste(…, { reseauRequis: true }) refuse ;
// - une action en file depuis plus de PR-OFF-EXPIRATION-H heures est « expirée » : jamais envoyée, jamais effacée
//   (OFF-05) ; rien ne se perd.
import { useEffect, useState } from 'react'
import type { Origine, Position } from './communs'
import type { ActionEnFile, ChargeGeste, FileHorsLigne, TypeAction } from './domaines/horsligne'
import { source, type SourceRelais } from './source'
import { useLecture } from './useLecture'
import { signal } from '../composants/signaux'

const enLigneMaintenant = () => (typeof navigator === 'undefined' ? true : navigator.onLine)

// Dernière position connue (posée par un écran quand le membre l'accorde) ; jamais demandée ici.
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

/** Réseau de toute l'application (App.tsx) : heure notée hors connexion, file rejouée au retour. */
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
 * JAMAIS un PIN dans la file (ARL-46) : un geste signé par le PIN est vérifié AU MOMENT DU GESTE, sur le téléphone,
 * contre l'empreinte du PIN du membre (copie locale, comme en ligne : essais comptés, blocage) ; la file ne garde que
 * la PREUVE de cette signature (membre, heure, clé du geste, sceau), que le serveur contrôle au rejeu. Place du PIN
 * dans les arguments de chaque geste signé : index de l'argument, ou [index, champ].
 */
const PIN_DANS: Record<string, number | [number, string]> = {
  'retrait.remettre': 1,
  'retrait.refusSansMotif': 1,
  'reception.validerLot': 2,
  'departs.valider': 2,
  'stock.terminerInventaire': 0,
  'incidents.ouvrirConstat': [0, 'pin'],
  'incidents.deposerRetour': [0, 'pin'],
}
/** Sceau de la preuve (démonstration : empreinte FNV-1a ; le vrai téléphone signe avec la clé de l'appareil). */
const sceau = (texte: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(16).padStart(8, '0')
}
/** Charge sans PIN : le PIN remplacé par la preuve de la signature locale. */
export function sansPin(domaine: string, methode: string, args: unknown[], o: Origine | undefined): unknown[] {
  const ou = PIN_DANS[`${domaine}.${methode}`]
  const copie = JSON.parse(JSON.stringify(args)) as unknown[]
  if (ou === undefined) return copie
  const preuve = `preuve-pin:${o?.heure ?? 0}:${sceau(`${o?.cle ?? ''}|${o?.heure ?? 0}|signe`)}`
  if (typeof ou === 'number') copie[ou] = preuve
  else if (copie[ou[0]] && typeof copie[ou[0]] === 'object') (copie[ou[0]] as Record<string, unknown>)[ou[1]] = preuve
  return copie
}
export const signeParPin = (domaine: string, methode: string) => `${domaine}.${methode}` in PIN_DANS

/**
 * Source qui note l'appel fait par un geste (domaine, méthode, arguments copiés SANS PIN) : c'est la charge mise en
 * file. `appliquer` : l'appel est aussi fait (copie locale) ; sinon il est seulement noté et répond « accepté, en
 * attente ». Un geste signé par le PIN est toujours appliqué à la copie locale (le PIN y est vérifié tout de suite).
 */
export function sourceQuiNote(appliquer: boolean): { s: SourceRelais; charge: () => ChargeGeste | null; appliquee: () => boolean } {
  let charge: ChargeGeste | null = null
  let applique = appliquer
  const s = new Proxy({} as SourceRelais, {
    get: (_, domaine: string) =>
      new Proxy({}, {
        get: (__, methode: string) =>
          (...args: unknown[]) => {
            const o = args.find((x): x is Origine => !!x && typeof x === 'object' && 'cle' in x && 'heure' in x)
            charge = { domaine, methode, args: sansPin(domaine, methode, args, o) }
            applique = appliquer || signeParPin(domaine, methode)
            const d = (source as unknown as Record<string, Record<string, (...a: unknown[]) => Promise<unknown>>>)[domaine]
            const cle = o?.cle
            const enFile = { ok: true as const, enFile: true as const, ...(cle ? { id: 'file-' + cle } : {}) }
            if (!applique) return Promise.resolve(enFile)
            return d[methode](...args).catch((x: unknown) => {
              if (enLigneMaintenant()) throw x
              return enFile
            })
          },
      }),
  })
  return { s, charge: () => charge, appliquee: () => applique }
}

/** Le geste exige le réseau (paiement Mobile Money au comptoir, OFF-02) : refusé hors connexion, jamais mis en file. */
export class ReseauRequis extends Error {
  constructor() {
    super('reseau_requis')
    this.name = 'ReseauRequis'
  }
}

/**
 * Un geste qui marche hors connexion. `faire(s)` appelle la source par `s`. En ligne : fait tout de suite. Hors
 * connexion : mis en file avec son origine et sa charge, rejoué au retour du réseau ; `local` l'applique en plus à la
 * copie du téléphone ; `reseauRequis` le refuse (ReseauRequis).
 */
export async function geste<T>(enLigne: boolean, type: TypeAction, objet: string, o: Origine, faire: (s: SourceRelais) => Promise<T>, options: { local?: boolean; photos?: number; reseauRequis?: boolean } = {}): Promise<{ etat: 'fait' | 'en_file'; r: T }> {
  if (enLigne) return { etat: 'fait', r: await faire(source) }
  if (options.reseauRequis) throw new ReseauRequis()
  const n = sourceQuiNote(!!options.local)
  const r = await faire(n.s)
  // Un PIN faux refusé par la copie locale n'est pas mis en file : rien n'est signé.
  if (n.appliquee() && r && typeof r === 'object' && (r as { ok?: boolean }).ok === false) return { etat: 'fait', r }
  await source.horsligne.mettreEnFile(type, objet, o, { charge: n.charge() ?? undefined, appliquee: n.appliquee(), photos: options.photos })
  return { etat: 'en_file', r }
}

/** La file lue dans la source (relue à chaque changement de données) ; null tant qu'elle n'est pas arrivée. */
export function useFile(): FileHorsLigne | null {
  return useLecture(() => source.horsligne.file(), []).donnees
}

/** Actions encore en attente d'envoi (d'un type donné, ou toutes) ; les expirées sont à part (expirees). */
export const enAttente = (f: FileHorsLigne | null, type?: TypeAction): ActionEnFile[] => (f ? f.actions.filter((a) => a.etat === 'en_attente' && (!type || a.type === type)) : [])
/** Actions expirées (OFF-05) : à refaire, jamais envoyées. */
export const expirees = (f: FileHorsLigne | null): ActionEnFile[] => (f ? f.actions.filter((a) => a.etat === 'expiree') : [])

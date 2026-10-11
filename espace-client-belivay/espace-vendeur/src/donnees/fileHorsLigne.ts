// Réseau et file hors connexion, communs à tous les écrans (Q-93, OFF-01 à OFF-05, VD04-R06, VD04-R14).
// - useEnLigne : le téléphone a-t-il du réseau (événements online / offline), suivi en direct ;
// - useReseauGlobal (monté UNE fois, dans App.tsx) : au passage hors connexion, note l'heure des données affichées
//   (« Données de 09 h 14 ») ; au retour du réseau, rejoue la file toute seule ;
// - geste() : fait le geste en ligne, sinon le met en file avec son heure et son lieu d'origine (origin_time,
//   origin_geo) ; mettreEnFile() pour un geste déjà décidé hors connexion ;
// - useFile() : la file lue dans la source (« n actions en attente d'envoi », « C'est prêt » gardé pour BLV-…).
// La file vit dans le domaine `accueil` (src/donnees/domaines/accueil.ts) : une seule file pour l'accueil, les
// commandes (« C'est prêt »), la remise, le stock, les photos, « Masquer » et « Fermer aujourd'hui ».
import { useEffect, useState } from 'react'
import { jouer } from '@client/composants/Sons'
import type { ActionEnFile, FileHorsLigne, TypeAction } from './domaines/accueil'
import { source } from './source'
import { useLecture } from './useLecture'

const enLigneMaintenant = () => (typeof navigator === 'undefined' ? true : navigator.onLine)

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
/** Rejoue la file d'attente (au retour du réseau, ou « Réessayer ») ; un seul envoi à la fois. */
export async function envoyerLaFile(): Promise<FileHorsLigne['dernierEnvoi']> {
  if (envoiEnCours || !enLigneMaintenant()) return null
  envoiEnCours = true
  try {
    const f = await source.accueil.file()
    if (!f.actions.some((a) => a.etat === 'en_attente') && f.horsLigneDepuis === null) return null
    const bilan = await source.accueil.envoyerFile()
    if (bilan.envoyees) jouer('notification')
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
    if (!en) void source.accueil.noterReseau(maintenant)
    else void envoyerLaFile()
    // maintenant : l'heure des données lues au dernier passage en ligne.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [en, maintenant === null])
  return en
}

/** Met un geste en file, avec son heure et son lieu d'origine. */
export function mettreEnFile(type: TypeAction, objet: string, detail?: ActionEnFile['detail']): Promise<ActionEnFile> {
  return source.accueil.mettreEnFile({ type, objet, detail })
}

/** Un geste qui marche hors connexion (Q-93) : fait tout de suite en ligne, sinon mis en file avec son heure. */
export async function geste(enLigne: boolean, type: TypeAction, objet: string, faire: () => Promise<unknown>, detail?: ActionEnFile['detail']): Promise<'fait' | 'en_file'> {
  if (enLigne) {
    await faire()
    return 'fait'
  }
  await mettreEnFile(type, objet, detail)
  return 'en_file'
}

/** La file lue dans la source (relue à chaque changement de données) ; null tant qu'elle n'est pas arrivée. */
export function useFile(): FileHorsLigne | null {
  return useLecture(() => source.accueil.file(), []).donnees
}

/** Actions encore en attente d'envoi (d'un type donné, ou toutes). */
export const enAttente = (f: FileHorsLigne | null, type?: TypeAction): ActionEnFile[] => (f ? f.actions.filter((a) => a.etat === 'en_attente' && (!type || a.type === type)) : [])

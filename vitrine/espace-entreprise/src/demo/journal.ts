// DONNÉES DE DÉMONSTRATION — journal signé des gestes de l'entreprise (DED-17, DED-18) : ajout seul ; chaque ligne
// porte l'événement émis vers les autres interfaces (CONNEXIONS.md : rider.updated, zone.state_changed,
// document.submitted…), son auteur nominatif et son rôle, l'objet touché, l'avant et l'après, et une empreinte qui
// chaîne la ligne à la précédente (le serveur signe ; la console relit et contrôle). Les écrans lisent le journal
// d'un objet (fiche du livreur, zone, véhicule) par sa source, jamais ici.
import { NOM_ROLE } from '../config/libelles'
import type { EntreeJournal } from '../donnees/domaines/livreurs'
import { maintenant } from './horloge'
import { UTILISATEURS } from './jeu-essai'
import { roleCourant, sessionDemo } from './acces'
import { magasin } from './stockage'

export interface LigneJournal extends EntreeJournal {
  evenement: string // « rider.updated »
  objet: string // « livreur:l-junior », « zone:Z6 », « vehicule:v-junior »
  empreinte: string
}

export const journalDemo = magasin('journal', () => ({ lignes: [] as LigneJournal[] }))

/** Auteur du geste : nom de l'utilisateur connecté et son rôle (« Gaëlle Wankeu · Propriétaire »). */
export function auteur(): string {
  const u = UTILISATEURS.find((x) => x.id === sessionDemo.lire().utilisateurId)!
  return `${u.prenom} ${u.nom} · ${NOM_ROLE[roleCourant()]}`
}

const hacher = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Écrit une ligne signée (chaînée à la précédente) et la rend. */
export function signer(evenement: string, objet: string, champ: string, avant: string, apres: string, par = auteur()): LigneJournal {
  const precedente = journalDemo.lire().lignes.at(-1)?.empreinte ?? ''
  const le = maintenant()
  const ligne: LigneJournal = { le, auteur: par, champ, avant, apres, evenement, objet, empreinte: hacher([precedente, le, par, evenement, objet, champ, avant, apres].join('|')) }
  journalDemo.ecrire((s) => void s.lignes.push(ligne))
  return ligne
}

/** Lignes d'un objet, la plus récente d'abord. */
export const journalDe = (objet: string): EntreeJournal[] =>
  journalDemo
    .lire()
    .lignes.filter((l) => l.objet === objet)
    .reverse()
    .map(({ le, auteur: a, champ, avant, apres }) => ({ le, auteur: a, champ, avant, apres }))

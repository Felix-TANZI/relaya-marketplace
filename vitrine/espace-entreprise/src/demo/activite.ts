// DONNÉES DE DÉMONSTRATION — activité de l'équipe (page Activité, AJ-E ; DED-17) : relue dans les journaux que la
// démonstration écrit déjà comme le serveur — journal de chaque paquet (prise, affectation, relances, incidents),
// des litiges (réponses de l'entreprise), des paramètres (utilisateurs, stockage) et le journal signé des fiches
// (livreurs, zones, véhicules). Seuls les gestes d'une personne de l'entreprise comptent (pas BelivaY ni le livreur).
import type { LigneActivite } from '../donnees/domaines/compte'
import type { Role } from '../donnees/communs'
import { UTILISATEURS } from './jeu-essai'
import { journalDemo } from './journal'
import { litigesDemo } from './litiges'
import { paquetsDemo } from './paquets'
import { parametresDemo } from './parametres'

const QUOI_PAQUET: Record<string, string> = {
  accepte: 'Paquet accepté',
  affecte: 'Livreur affecté',
  reaffecte: 'Livreur réaffecté',
  modifie: 'Affectation modifiée',
  ignore: 'Paquet ignoré',
  rendu: 'Paquet rendu',
  transfert: 'Paquet transféré à un autre livreur',
  incident_valide: 'Incident validé',
  incident_refuse: 'Incident refusé',
  arret_retire: 'Arrêt retiré de la tournée',
  relance_colis: 'Livreur relancé (colis)',
  relance_preuves: 'Livreur relancé (preuves)',
}

/** Personne de l'entreprise derrière un nom (« Serge Mbarga », « Serge M. », « Serge Mbarga · Répartiteur »). */
function personne(par: string | null): { nom: string; role: Role } | null {
  if (!par) return null
  const tete = par.split('·')[0].trim()
  const u = UTILISATEURS.find((x) => tete === `${x.prenom} ${x.nom}` || tete === `${x.prenom} ${x.nom[0]}.`)
  return u ? { nom: `${u.prenom} ${u.nom}`, role: u.role } : null
}

export function activiteDemo(): LigneActivite[] {
  const out: LigneActivite[] = []
  for (const p of paquetsDemo.lire().paquets)
    p.journal.forEach((j, i) => {
      const qui = personne(j.par)
      const quoi = QUOI_PAQUET[j.quoi] ?? (j.quoi.startsWith('relance_') ? 'Livreur relancé' : null)
      if (qui && quoi) out.push({ id: `pq-${p.id}-${i}`, le: j.le, par: qui.nom, role: qui.role, genre: 'paquets', quoi, objet: p.id, lien: { route: 'paquet', id: p.id } })
    })
  for (const l of litigesDemo.lire().litiges)
    l.journal.forEach((j, i) => {
      const qui = personne(j.par)
      if (qui) out.push({ id: `lt-${l.id}-${i}`, le: j.le, par: qui.nom, role: qui.role, genre: 'litiges', quoi: j.quoi, objet: l.id, lien: { route: 'litiges', id: l.id } })
    })
  parametresDemo.lire().journal.forEach((j, i) => {
    const qui = personne(j.par)
    if (qui) out.push({ id: `pa-${i}-${j.le}`, le: j.le, par: qui.nom, role: qui.role, genre: 'equipe', quoi: j.quoi, objet: null, lien: { route: 'parametres' } })
  })
  journalDemo.lire().lignes.forEach((j, i) => {
    const qui = personne(j.auteur)
    if (!qui) return
    const [genre, id] = j.objet.split(':')
    const lien =
      genre === 'livreur' ? { route: 'livreur', id } : genre === 'zone' ? { route: 'zones' } : genre === 'vehicule' ? { route: 'vehicules', id } : genre === 'invitation' ? { route: 'ajout' } : genre === 'compte' ? { route: 'etat' } : { route: 'contrat' }
    const compte = ['contrat', 'piece', 'entreprise', 'compte'].includes(genre)
    out.push({ id: `jn-${i}`, le: j.le, par: qui.nom, role: qui.role, genre: compte ? 'equipe' : 'flotte', quoi: `${j.champ} : ${j.avant || '—'} → ${j.apres || '—'}`, objet: compte ? null : (id ?? null), lien })
  })
  return out.sort((a, b) => b.le - a.le)
}

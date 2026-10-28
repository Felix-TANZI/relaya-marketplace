// DONNÉES DE DÉMONSTRATION — domaine « compte » (ENT-P27) : l'entreprise est en pilote (jour compté depuis le début du
// pilote, durée lue dans le registre). Les états sont décidés par BelivaY : l'entreprise n'en change aucun. Pour voir
// les sept états, la démonstration (et elle seule) pose un scénario, comme la console le ferait : « ?etat=suspendu »
// dans l'adresse, ou le panneau « Démonstration » de l'État du compte ; « ?pluie=1 » pose un jour de pluie forte.
// Durées lues dans le registre : pilote, préavis, lecture après résiliation (PARAMETRES, PARAMETRES_FLOTTE).
import { ETATS_COMPTE, type DomaineCompte, type EtatCompte, type EtatDuCompte, type EvenementCompte } from '../donnees/domaines/compte'
import { PARAMETRES } from '../calculs/registre'
import { PARAMETRES_FLOTTE } from '../calculs/flotte'
import { plafondDe } from '../calculs/paliers'
import { HEURE, JOUR, MINUTE } from '../calculs/temps'
import { maintenant } from './horloge'
import { ENTREPRISE, T, ZONES } from './jeu-essai'
import { exiger } from './acces'
import { activiteDemo } from './activite'
import { signer } from './journal'
import { magasin, repondre } from './stockage'

export const compteDemo = magasin('compte', () => ({
  scenario: null as EtatCompte | null,
  pluie: false,
  recours: null as { le: number; texte: string; etat: EtatCompte } | null,
}))

// Scénario posé par l'adresse (« ?etat=… », « ?pluie=1|0 ») : gardé ensuite, comme le rôle de démonstration.
function suivreScenario() {
  if (typeof location === 'undefined') return
  const q = new URLSearchParams(location.search)
  const e = q.get('etat') as EtatCompte | null
  const p = q.get('pluie')
  const s = compteDemo.lire()
  const etat = e && ETATS_COMPTE.includes(e) ? (e === 'pilote' ? null : e) : undefined
  const pluie = p === '1' ? true : p === '0' ? false : undefined
  if ((etat === undefined || etat === s.scenario) && (pluie === undefined || pluie === s.pluie)) return
  compteDemo.ecrire((x) => {
    if (etat !== undefined) {
      x.scenario = etat
      x.recours = null
    }
    if (pluie !== undefined) x.pluie = pluie
  })
}

const minuit = (t: number) => t - ((t + HEURE) % JOUR) // début du jour à Yaoundé
const finDuJour = (t: number) => minuit(t) + JOUR - MINUTE // 23 h 59
const vendrediApres = (t: number) => {
  // Jour de la semaine à Yaoundé (0 dimanche) ; versement le vendredi avant 12 h.
  const j = new Date(t + HEURE).getUTCDay()
  return minuit(t) + (((5 - j + 7) % 7) || 7) * JOUR + 11 * HEURE
}

export function etatCompte(): EtatDuCompte {
  suivreScenario()
  const s = compteDemo.lire()
  const t = maintenant()
  const F = PARAMETRES_FLOTTE
  const duree = PARAMETRES.pilote.dureeJours
  const jour = Math.min(duree, Math.floor((t - ENTREPRISE.debutPilote) / JOUR) + 1)
  const plafond = plafondDe(ENTREPRISE.palier)
  const toutes = ZONES.map((z) => z.code)
  const journal: EvenementCompte[] = [
    { le: ENTREPRISE.debutPilote, etat: 'pilote', motif: 'Lettre d’engagement signée, pièces vérifiées, activation validée', par: 'Console BelivaY · Aureon' },
    { le: ENTREPRISE.debutPilote - 3 * JOUR, etat: 'configuration', motif: 'Compte créé après le premier rendez-vous', par: 'Console BelivaY · Aureon' },
  ]
  const base: EtatDuCompte = {
    etat: 'pilote',
    motif: null,
    niveau: null,
    depuis: ENTREPRISE.debutPilote,
    jusqua: ENTREPRISE.debutPilote + duree * JOUR,
    decidePar: 'Console BelivaY · Aureon',
    recours: { permis: false, utilise: !!s.recours, envoyeLe: s.recours?.le ?? null, texte: s.recours?.texte ?? null },
    effets: { zones: toutes, plafond, publication: true },
    pilote: { jour, duree },
    journal,
    bilanLe: ENTREPRISE.debutPilote + (duree - 1) * JOUR + 9 * HEURE,
    preavis: null,
    lectureJusqua: null,
    aTerminer: null,
    restriction: null,
    pluie: s.pluie,
  }
  const avec = (e: Partial<EtatDuCompte>, motifJournal: string, par = 'Console BelivaY · Aureon'): EtatDuCompte => {
    const depuis = e.depuis ?? T(-3 * 60)
    return { ...base, pilote: null, bilanLe: null, ...e, depuis, recours: { ...base.recours, permis: e.recours?.permis ?? false }, journal: [{ le: depuis, etat: e.etat!, motif: motifJournal, par }, ...journal] }
  }
  switch (s.scenario) {
    case 'configuration':
      return { ...base, etat: 'configuration', pilote: null, bilanLe: null, depuis: ENTREPRISE.debutPilote - 3 * JOUR, jusqua: null, motif: 'La chaîne d’activation n’est pas complète : le guide de démarrage dit ce qui manque.', effets: { zones: [], plafond, publication: false }, journal: journal.slice(1) }
    case 'actif':
      return avec({ etat: 'actif', jusqua: null, depuis: T(-2 * 60) }, 'Bilan conjoint écrit validé : contrat définitif signé')
    case 'restreint':
      return avec(
        { etat: 'restreint', niveau: 'Niveau 2 · restriction', motif: `Délai tenu sous ${F.seuilDelaiTenu} % sur ${F.fenetreSanteJours} jours en Z2 (Nsam), après un avertissement écrit resté sans effet.`, restriction: 'Z2 retirée de la publication jusqu’au retour du délai tenu ; les autres zones continuent.', jusqua: T(0) + 7 * JOUR, effets: { zones: toutes.filter((z) => z !== 'Z2'), plafond, publication: true }, recours: { permis: true, utilise: false } },
        'Restriction de niveau 2 validée par un opérateur, motif écrit',
      )
    case 'suspendu':
      return avec(
        {
          etat: 'suspendu',
          niveau: 'Suspension automatique · pas une sanction',
          motif: 'Autorisation de transport (MINT) expirée : plus aucun paquet ne vous est publié jusqu’à la nouvelle autorisation vérifiée.',
          depuis: minuit(t),
          jusqua: null,
          effets: { zones: [], plafond, publication: false },
          aTerminer: { colis: 4, relais: 'Relais Obili · Chez Mireille', avant: minuit(t) + 19 * HEURE },
          recours: { permis: true, utilise: false },
        },
        'Pièce expirée : suspension automatique (tâche planifiée de 0 h 00)',
        'Tâche automatique',
      )
    case 'preavis': {
      const notif = T(-60)
      const fin = finDuJour(notif + F.preavisJours * JOUR)
      return avec(
        { etat: 'preavis', motif: 'Résiliation notifiée : fin du partenariat à la fin du préavis. Les paquets restent accessibles jusqu’au dernier jour.', depuis: notif, jusqua: fin, preavis: { fin, jour: Math.floor((t - notif) / JOUR) + 1, duree: F.preavisJours, dernierVersement: vendrediApres(fin) } },
        'Résiliation notifiée avec préavis',
      )
    }
    case 'resilie': {
      const fin = finDuJour(T(-10 * 24 * 60))
      return avec(
        { etat: 'resilie', motif: 'Partenariat terminé à la fin du préavis. Relevés, règlements, preuves et contrat restent lisibles.', depuis: fin, jusqua: null, lectureJusqua: fin + F.lectureApresResiliationJours * JOUR, effets: { zones: [], plafond, publication: false } },
        'Fin du préavis : partenariat terminé',
      )
    }
    default:
      return base
  }
}

export const demoCompte: DomaineCompte = {
  async activite() {
    return repondre(activiteDemo())
  },
  async etat() {
    return repondre(etatCompte())
  },
  async faireRecours(texte) {
    exiger(['proprietaire'], 'Faire un recours')
    const e = etatCompte()
    if (!e.recours.permis) return repondre({ ok: false as const, raison: 'non_permis' as const })
    if (e.recours.utilise) return repondre({ ok: false as const, raison: 'deja_utilise' as const })
    if (!texte.trim()) return repondre({ ok: false as const, raison: 'texte' as const })
    compteDemo.ecrire((s) => void (s.recours = { le: maintenant(), texte: texte.trim(), etat: e.etat }))
    signer('account.appeal_filed', 'compte:' + ENTREPRISE.id, 'recours', e.etat, 'recours envoyé à la console')
    return repondre({ ok: true as const })
  },
  async scenario(sc) {
    compteDemo.ecrire((s) => {
      if (sc.etat !== undefined) {
        s.scenario = sc.etat === 'pilote' ? null : sc.etat
        s.recours = null
      }
      if (sc.pluie !== undefined) s.pluie = sc.pluie
    })
  },
}

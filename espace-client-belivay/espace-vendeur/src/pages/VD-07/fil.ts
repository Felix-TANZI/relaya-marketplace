// Fil chronologique d'un litige (même famille que « Où en est ton litige » du client, CL-11) : ce qui est arrivé,
// du plus ancien au plus récent, puis l'étape attendue (en cours), avec son échéance.
import type { Litige } from '../../donnees/domaines/litiges'
import type { Retour } from '../../donnees/domaines/retours'
import { echeance, type Langue } from '../../i18n/temps'
import { dateCourte } from './outils'

type T = (fr: string) => string
type TF = (modele: string, v: Record<string, string | number>) => string
const POSTURE: Record<string, string> = { accepte: 'J’accepte', conteste: 'Je conteste', arrangement: 'Arrangement proposé' }

export function lignesDuFil(l: Litige, maintenant: number, t: T, tf: TF, langue: Langue) {
  const lignes = l.journal.map((e) => {
    const quand = dateCourte(e.a, langue)
    const par = (detail: string) => (e.auteur ? tf('{d} · par {nom}', { d: detail, nom: t(e.auteur) }) : detail)
    switch (e.code) {
      case 'ouvert':
        return { titre: t('Litige ouvert par le client'), detail: tf('« {motif} » · {d}', { motif: t(e.detail ?? l.motif), d: quand }) }
      case 'photos_client':
        return { titre: t('Photos du client au dossier'), detail: tf(Number(e.detail) > 1 ? '{n} photos · {d}' : '{n} photo · {d}', { n: Number(e.detail ?? 0), d: quand }) }
      case 'preuves_versees':
        return { titre: t('Photos du ramassage versées au dossier'), detail: tf('Versées d’office · {d}', { d: quand }) }
      case 'preuve_ajoutee':
        return { titre: t('Photo ajoutée au dossier'), detail: par(quand) }
      case 'preuve_retiree':
        return { titre: t('Photo retirée du dossier'), detail: par(quand) }
      case 'reponse':
        return { titre: e.detail === 'accepte' ? t('Vous avez accepté le litige') : tf('Réponse envoyée : {p}', { p: t(POSTURE[e.detail ?? ''] ?? '') }), detail: par(quand) }
      case 'echeance':
        return { titre: t('Délai de réponse passé'), detail: tf('BelivaY examine le dossier en partant de ce que dit le client · {d}', { d: quand }) }
      case 'decision':
        return { titre: t(e.detail === 'gagne' ? 'Décision : litige gagné' : 'Décision : litige perdu'), detail: par(quand) }
      case 'recours':
        return { titre: t('Décision contestée (recours)'), detail: par(quand) }
      case 'clos':
        return { titre: t('Litige clos'), detail: quand }
    }
  }).map((x, i) => ({ cle: 'e' + i, ...x, etat: 'done' as const }))
  const suite =
    l.etat === 'a_repondre'
      ? { titre: t('Votre réponse'), detail: tf('Avant {d}', { d: echeance(l.echeance, maintenant, langue) }) }
      : l.etat === 'en_mediation' && !l.decision
        ? { titre: t('Décision de BelivaY'), detail: tf('Au plus tard {d}, avec un motif écrit', { d: echeance(l.decisionAvant, maintenant, langue) }) }
        : l.decision && l.recours.jusqua && maintenant <= l.recours.jusqua && !l.recours.deposeA
          ? { titre: t('Délai de recours'), detail: tf('Jusqu’à {d}', { d: echeance(l.recours.jusqua, maintenant, langue) }) }
          : null
  return suite ? [...lignes, { cle: 'suite', ...suite, etat: 'cur' as const }] : lignes
}

/** Fil d'un retour : retrait, signalement, remise, inspection, suite ; puis l'étape attendue. */
export function lignesDuRetour(r: Retour, maintenant: number, t: T, tf: TF, langue: Langue) {
  const TITRES: Record<string, string> = {
    retire: 'Commande retirée par le client',
    signale: 'Retour signalé par le client',
    depose: 'Colis déposé au relais',
    recu: 'Retour reçu à la boutique',
    photo: 'Photo d’inspection',
    inspecte: 'Inspection envoyée',
    mediation: 'Preuves en médiation',
    remplacement: 'Remplacement proposé',
    pret: 'Remplacement prêt pour le livreur',
    rembourse: 'Client remboursé',
    rembourse_auto: 'Client remboursé automatiquement',
  }
  const lignes = r.journal.map((e, i) => {
    const quand = dateCourte(e.a, langue)
    const detail = e.code === 'signale' && e.detail ? tf('{motif} · {d}', { motif: t(e.detail), d: quand }) : e.code === 'inspecte' && e.detail ? tf('{v} · {d}', { v: t(e.detail === 'conforme' ? 'Conforme au motif' : 'Non conforme'), d: quand }) : quand
    return { cle: 'r' + i, titre: t(TITRES[e.code] ?? e.code), detail: e.auteur ? tf('{d} · par {nom}', { d: detail, nom: t(e.auteur) }) : detail, etat: 'done' as const }
  })
  const s = r.suite
  const suite =
    s.type === 'en_route' && r.inspecterAvant
      ? { titre: t('Arrivée chez vous, puis votre inspection'), detail: tf('Avant {d}', { d: echeance(r.inspecterAvant, maintenant, langue) }) }
      : s.type === 'a_inspecter' && r.inspecterAvant
        ? { titre: t('Votre inspection'), detail: tf('Avant {d}', { d: echeance(r.inspecterAvant, maintenant, langue) }) }
        : s.type === 'a_choisir'
          ? { titre: t('Remplacer ou rembourser'), detail: t('À choisir par le propriétaire') }
          : s.type === 'mediation'
            ? { titre: t('Décision de BelivaY'), detail: tf('Au plus tard {d}, avec un motif écrit', { d: echeance(s.decisionAvant, maintenant, langue) }) }
            : s.type === 'remplacement' && !s.pretA
              ? { titre: t('Expédition du remplacement'), detail: tf('Avant {d}', { d: echeance(s.expedierAvant, maintenant, langue) }) }
              : null
  return suite ? [...lignes, { cle: 'suite', ...suite, etat: 'cur' as const }] : lignes
}

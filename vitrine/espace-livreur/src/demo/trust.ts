// DONNÉES DE DÉMONSTRATION — domaine « trust » : le moteur du serveur, simulé. Les poids, paliers, plafond du veto,
// délai de contestation et formule d'Ancienneté sont lus dans le registre ; la note est Σ poids × critère (arrondie à
// l'entier affiché) ; Ancienneté = formule LIV-TSC-ANCIENNETE sur les mois depuis l'activation et les missions validées
// (historique) ; une contestation en examen suspend l'effet de son événement. Valeurs des autres critères, événements
// et courbe : données du jeu d'essai.
import { JOUR, yaounde } from '../calculs/temps'
import type { Critere, DomaineTrust, EvenementTrust, IdCritere, Palier, TrustLivreur } from '../donnees/domaines/trust'
import { PAQUETS, missionsValidees } from './historique'
import { REJOUEURS, demoHorsLigne, entier, journaliserEnvoye, parametre } from './horsligne'
import { maintenant } from './horloge'
import { h } from './jeu-essai'
import { ACTIVATION } from './moi'
import { etatTournee } from './tournee'
import { magasin, repondre } from './stockage'

const poids = (): Record<IdCritere, number> => {
  const x = parametre('LIV-TSC-POIDS', 'Ponctualité (\\d+),(\\d+) · Qualité (\\d+),(\\d+) · Litiges (\\d+),(\\d+) · Ancienneté (\\d+),(\\d+) · Formation (\\d+),(\\d+)')
  const n = (i: number) => Number(`${x[i]}.${x[i + 1]}`)
  return { ponctualite: n(1), qualite: n(3), litiges: n(5), anciennete: n(7), formation: n(9) }
}
const paliers = (): TrustLivreur['paliers'] => {
  const x = parametre('TSC-PALIERS-LIVREUR', 'Nouveau · Confirmé ≥ (\\d+) · Or ≥ (\\d+)')
  return [
    { id: 'nouveau', seuil: 0 },
    { id: 'confirme', seuil: Number(x[1]) },
    { id: 'or', seuil: Number(x[2]) },
  ]
}
export const palierDe = (score: number, p = paliers()): Palier => [...p].reverse().find((x) => score >= x.seuil)!.id

/** Ancienneté (LIV-TSC-ANCIENNETE) : a × min(1 ; mois / m) + b × min(1 ; missions / n). */
function anciennete(t: number): number {
  const x = parametre('LIV-TSC-ANCIENNETE', '(\\d+) × min\\(1 ; mois/(\\d+)\\) \\+ (\\d+) × min\\(1 ; missions/(\\d+)\\)')
  const mois = (t - ACTIVATION()) / (30.44 * JOUR)
  const auj = etatTournee.lire()?.arrets.filter((a) => a.etat === 'fait').length ?? 0
  const missions = PAQUETS.reduce((s, p) => s + missionsValidees(p), 0) + auj
  return Number(x[1]) * Math.min(1, mois / Number(x[2])) + Number(x[3]) * Math.min(1, missions / Number(x[4]))
}

type EvGarde = Omit<EvenementTrust, 'contesterAvant'> & { effetCritere: number }
const ev = (id: string, quand: number, mission: string | null, texte: string, critere: IdCritere, gravite: EvenementTrust['gravite'], effet: number, effetCritere: number, contestation: EvenementTrust['contestation'] = null): EvGarde => ({ id, quand, mission, texte, critere, gravite, effet, effetCritere, contestation })

export const etatTrust = magasin('trust', () => ({
  score: 74 as number | null,
  // Valeurs des critères mesurés (sur 100), avec l'effet de tous les événements non suspendus.
  valeurs: { ponctualite: 73, qualite: 82, litiges: 70, formation: 100 } as Record<Exclude<IdCritere, 'anciennete'>, number>,
  evenements: [
    ev('EV-33', h(13, 24), 'PQ-Z1-261013-003', 'Ramassage dans le créneau annoncé', 'ponctualite', 'succes', 1, 3),
    ev('EV-31', yaounde(2026, 10, 10, 15, 40), 'PQ-Z1-261010-004', 'Ramassage en retard de 22 min après le créneau annoncé', 'ponctualite', 'g1', -2, -6.7),
    ev('EV-30', yaounde(2026, 10, 10, 10, 50), 'PQ-Z1-261010-003', 'Preuves complètes et lisibles', 'qualite', 'succes', 1, 4),
    ev('EV-29', yaounde(2026, 10, 10, 11, 20), 'PQ-Z1-261009-003', 'Colis abîmé : litige en cours, sans effet tant qu’il n’est pas tranché', 'litiges', 'neutre', 0, 0),
    ev('EV-28', yaounde(2026, 10, 8, 11, 15), 'PQ-Z1-261008-003', 'Dépôt avant la fermeture du relais, dans le délai de 5 h', 'ponctualite', 'succes', 1, 3),
    ev('EV-26', yaounde(2026, 10, 2, 10, 40), 'PQ-Z1-261002-003', 'Photo illisible rejetée par la console', 'qualite', 'g1', -1, -4, {
      motif: 'autre',
      note: 'La photo était nette sur mon téléphone, l’envoi a été coupé par le réseau.',
      le: yaounde(2026, 10, 3, 9, 5),
      etat: 'rejetee',
      decision: 'La photo reçue est floue et la seconde ne montre pas l’étiquette : l’événement est maintenu.',
    }),
    ev('EV-21', yaounde(2026, 9, 25, 17, 0), null, 'Certification à jour', 'formation', 'succes', 0, 0),
  ] as EvGarde[],
  courbe: [
    [yaounde(2026, 9, 24, 12), 50],
    [yaounde(2026, 9, 26, 18), 53],
    [yaounde(2026, 9, 29, 18), 58],
    [yaounde(2026, 10, 2, 18), 61],
    [yaounde(2026, 10, 5, 18), 66],
    [yaounde(2026, 10, 8, 18), 70],
    [yaounde(2026, 10, 10, 18), 72],
  ] as [number, number][],
}))

const BAREME: TrustLivreur['bareme'] = [
  { evenement: 'Ramassage dans le créneau annoncé', critere: 'ponctualite', gravite: 'Succès' },
  { evenement: 'Retard de 15 à 60 minutes', critere: 'ponctualite', gravite: 'g1' },
  { evenement: 'Retard de plus de 60 minutes ou créneau manqué signalé', critere: 'ponctualite', gravite: 'g2' },
  { evenement: 'Créneau manqué sans signalement', critere: 'ponctualite', gravite: 'g3' },
  { evenement: 'Dépôt avant la fermeture du relais, dans le délai de 5 h', critere: 'ponctualite', gravite: 'Succès' },
  { evenement: 'Relais trouvé fermé à cause du retard du livreur', critere: 'ponctualite', gravite: 'g2' },
  { evenement: 'Preuves complètes et lisibles', critere: 'qualite', gravite: 'Succès' },
  { evenement: 'Photo illisible rejetée par la console', critere: 'qualite', gravite: 'g1' },
  { evenement: 'Preuve absente ou jamais synchronisée', critere: 'qualite', gravite: 'g2' },
  { evenement: 'Scellé rompu constaté au relais, imputé au livreur', critere: 'qualite', gravite: 'g3' },
  { evenement: 'Litige gagné ou en cours', critere: 'litiges', gravite: 'Neutre' },
  { evenement: 'Colis abîmé imputé après arbitrage', critere: 'litiges', gravite: 'g2' },
  { evenement: 'Colis perdu imputé après arbitrage', critere: 'litiges', gravite: 'g3' },
  { evenement: 'Demande d’argent ou de pourboire', critere: 'litiges', gravite: 'g3 + sanction de niveau 3' },
  { evenement: 'Colis ouvert, vol, photo réutilisée, fausse position, faux incident', critere: 'qualite', gravite: 'Veto + sanction de niveau 4' },
  { evenement: 'Certification à jour · expirée', critere: 'formation', gravite: '100 · 0' },
]

const contestationJours = () => entier('LIV-TSC-CONTESTATION-J')

function calculer(): TrustLivreur {
  const t = maintenant()
  const e = etatTrust.lire()
  const w = poids()
  const pal = paliers()
  const suspendu = (x: EvGarde) => x.contestation?.etat === 'en_examen'
  const valeur = (id: IdCritere) => (id === 'anciennete' ? anciennete(t) : e.valeurs[id] - e.evenements.filter((x) => x.critere === id && suspendu(x)).reduce((s, x) => s + x.effetCritere, 0))
  const ids: IdCritere[] = ['ponctualite', 'qualite', 'litiges', 'anciennete', 'formation']
  const criteres: Critere[] = ids.map((id) => {
    const v = Math.max(0, Math.min(100, valeur(id)))
    return { id, poids: w[id], valeur: Math.round(v * 10) / 10, points: Math.round(w[id] * v * 10) / 10 }
  })
  const brut = ids.reduce((s, id) => s + w[id] * Math.max(0, Math.min(100, valeur(id))), 0)
  const veto = e.evenements.some((x) => x.gravite === 'veto' && !suspendu(x))
  const score = Math.round(veto ? Math.min(brut, entier('LIV-TSC-VETO-PLAFOND')) : brut)
  const d = contestationJours() * JOUR
  return {
    score,
    palier: palierDe(score, pal),
    depart: entier('LIV-TSC-NEUTRE'),
    activeLe: ACTIVATION(),
    criteres,
    evenements: e.evenements
      .map(({ effetCritere: _e, ...x }) => ({ ...x, contesterAvant: x.gravite === 'succes' || x.gravite === 'neutre' ? null : x.quand + d }))
      .sort((a, b) => b.quand - a.quand),
    courbe: [...e.courbe.map(([quand, s]) => ({ quand, score: s })), { quand: t, score }],
    paliers: pal,
    veto: entier('LIV-TSC-VETO-PLAFOND'),
    hysteresisJours: entier('LIV-TSC-HYSTERESIS-J'),
    contestationJours: contestationJours(),
    noteMin: entier('LIV-TSC-NOTE-MIN'),
    bareme: BAREME,
    // Même Trust Score de Yafé Express que l'espace entreprise (espace-entreprise/src/demo/score.ts : 76,8 arrondi).
    entreprise: { nom: 'Yafé Express', score: 77, palier: 'nouveau', plafondColis: Number(parametre('LIV-PLAFOND-VALEUR', '([\\d\\s]+) F · .*')[1].replace(/\D/g, '')) },
    recalculeA: Math.max(...e.evenements.map((x) => x.quand)),
  }
}

/** Le score servi à la session (pastille de l'en-tête) suit le calcul. */
function servir(): TrustLivreur {
  const v = calculer()
  if (etatTrust.lire().score !== v.score) etatTrust.ecrire((x) => void (x.score = v.score))
  return v
}

REJOUEURS.contestation = (id) => {
  etatTrust.ecrire((x) => x.evenements.forEach((y) => y.id === id && y.contestation?.etat === 'en_file' && (y.contestation.etat = 'en_examen')))
}

export const demoTrust: DomaineTrust = {
  trust: () => repondre(servir()),
  async contester(id, motif, note, origine, enLigne) {
    const x = etatTrust.lire().evenements.find((y) => y.id === id)
    if (!x || x.gravite === 'succes' || x.gravite === 'neutre') return { ok: false as const, raison: 'non_contestable' as const }
    if (x.contestation) return { ok: false as const, raison: 'deja_conteste' as const }
    if (origine.heure > x.quand + contestationJours() * JOUR) return { ok: false as const, raison: 'hors_delai' as const }
    if (note.trim().length < entier('LIV-TSC-NOTE-MIN')) return { ok: false as const, raison: 'note_trop_courte' as const }
    etatTrust.ecrire((t) => {
      const y = t.evenements.find((z) => z.id === id)!
      y.contestation = { motif, note: note.trim(), le: origine.heure, etat: enLigne ? 'en_examen' : 'en_file', decision: null }
    })
    if (enLigne) journaliserEnvoye('contestation', id, origine)
    else await demoHorsLigne.mettreEnFile('contestation', id, origine)
    servir()
    return { ok: true as const }
  },
}

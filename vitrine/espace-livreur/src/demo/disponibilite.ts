// DONNÉES DE DÉMONSTRATION — domaine « disponibilite » : Serge est passé disponible à 7 h 42 (ouverture par PIN). Le
// changement de statut est diffusé au portail de l'entreprise (courier.status_changed) et journalisé. Planning (DP-66) :
// en lecture ; une absence prévenue part à l'entreprise par le pont (événement « absence »), qui la marque « vue ».
// DP-67 : l'absence est jugée comme le serveur (calculs/absence.ts, porté de moteurs/belivay_moteurs/absence.py) sur
// l'heure de saisie (origine.heure, bornée par heureDeSaisie) : faite hors connexion, elle arrive par la file.
import type { Absence, DomaineDisponibilite, EtatDisponibilite, JourPlanning, MotifAbsence } from '../donnees/domaines/disponibilite'
import { IMPREVUS, TEXTE_MAX, heureDeSaisie, juger, textePropre } from '../calculs/absence'
import { PARAMETRES } from '../calculs/registre'
import { ajouterJours, debutDuJour, jourDe, jourSemaine } from '../calculs/temps'
import { maintenant } from './horloge'
import type { Disponibilite, Instant } from '../donnees/communs'
import { etatAcces } from './acces'
import { etatEmploi, NOMS_ZONES } from './emploi'
import { etatFile } from './horsligne'
import { h } from './jeu-essai'
import { scenario } from './scenario'
import { etatSession, nombre, regle } from './session'
import { publier } from './pont'
import { magasin, repondre } from './stockage'

interface EtatDemo {
  statut: Disponibilite
  depuis: Instant
  motifPause: string | null
  finPausePrevue: Instant | null
}
const enActivation = () => scenario() === 'activation' || scenario() === 'premiere'
export const etatDisponibilite = magasin<EtatDemo>('disponibilite', () => (enActivation() ? { statut: 'hors_service', depuis: h(13, 50), motifPause: null, finPausePrevue: null } : { statut: 'disponible', depuis: h(7, 42), motifPause: null, finPausePrevue: null }))

// Planning de Yafé Express (donnée de l'entreprise) : du lundi au samedi, 7 h 30 → 18 h, le samedi jusqu'à 13 h. Le
// livreur le voit ; il ne l'annonce plus (DP-66) : il prévient seulement d'une absence.
// Horaires changés par l'employeur (pont : horaires_changes, 0 lundi … 6 dimanche) : ils remplacent ceux-ci.
const horaire = (j: string): JourPlanning['horaire'] => {
  const changes = etatEmploi.lire().horaires
  if (changes) {
    const c = changes.find((x) => x.jour === jourSemaine(j))
    return c ? { de: c.de, a: c.a } : null
  }
  return jourSemaine(j) === 6 ? null : jourSemaine(j) === 5 ? { de: '07:30', a: '13:00' } : { de: '07:30', a: '18:00' }
}
// Absences prévenues (jeu d'essai : samedi 17 octobre, démarches, déjà vue par Yafé Express).
type AbsenceDemo = Absence & { annuleeLe: number | null }
export const etatAbsences = magasin('absences', () => ({
  liste: [{ id: 'AB-1', du: '2026-10-17', au: '2026-10-17', motif: 'demarches', texte: 'Rendez-vous à la mairie pour ma carte d’identité.', imprevu: false, apresDebut: false, prevenueLe: h(8, 10) - 86_400_000, vueLe: h(9, 2) - 86_400_000, annuleeLe: null }] as AbsenceDemo[],
}))
/** Début du premier créneau d'un jour (minuit un jour de repos), à Yaoundé. */
const premierCreneau = (j: string) => {
  const x = horaire(j)
  const [hh, mm] = (x?.de ?? '00:00').split(':').map(Number)
  return debutDuJour(j) + (hh * 60 + mm) * 60_000
}
/** Départ en préavis (posé par le domaine « moi » : pas d'import croisé). */
export const PREAVIS = { jusqua: (): number | null => null }
const actives = (t: number) => etatAbsences.lire().liste.filter((a) => a.annuleeLe === null && a.au >= jourDe(t))

const liste = (code: string) => regle(code, '[^,]+(?:, [^,]+)*')[0].split(',').map((x) => x.trim())

export const demoDisponibilite: DomaineDisponibilite = {
  lire() {
    const s = etatSession.lire()
    const v: EtatDisponibilite = {
      ...etatDisponibilite.lire(),
      entreprise: 'Yafé Express',
      zones: (etatEmploi.lire().zones ?? ['Z1']).map((z) => `${z} ${NOMS_ZONES[z] ?? ''}`.trim()),
      colisSousGarde: s.compte === 'serge' ? s.colisSousGarde : 0,
      preavisJusqua: s.compte === 'serge' ? PREAVIS.jusqua() : null,
      regles: {
        rappelPauseHeures: nombre('PAUSE-RAPPEL-H'),
        motifsPause: liste('motifs_de_pause'),
        dureesPauseMin: liste('durées_pause').map(Number),
        delaiPortailSecondes: nombre('délai_affichage_portail'),
      },
    }
    return repondre(v)
  },
  planning() {
    const t = maintenant()
    const auj = jourDe(t)
    const abs = actives(t)
    const jours: JourPlanning[] = Array.from({ length: 14 }, (_, k) => {
      const j = ajouterJours(auj, k)
      return { jour: j, horaire: horaire(j), absence: abs.find((a) => a.du <= j && j <= a.au)?.id ?? null }
    })
    const p = PARAMETRES.livreur
    return repondre({
      entreprise: 'Yafé Express',
      jours,
      absences: abs.map(({ annuleeLe: _a, ...x }) => x),
      regles: { prevenirH: p.planningPrevenirHeures, maxJours: p.absenceMaxJours, texteMax: TEXTE_MAX, imprevus: [...IMPREVUS] as MotifAbsence[] },
    })
  },
  prevenirAbsence(d, origine) {
    // Heure de saisie (faite hors connexion : reçue au retour du réseau) : jamais après la réception, jamais avant la
    // dernière synchronisation connue du téléphone.
    const synchro = etatFile.lire().dernierEnvoi?.a ?? null
    const t = heureDeSaisie(origine.heure, maintenant(), synchro)
    const p = PARAMETRES.livreur
    // Une même demande rejouée (même clé d'idempotence) rend la même réponse, sans second effet.
    const id = 'AB-' + origine.cle.slice(-6)
    const deja = etatAbsences.lire().liste.find((a) => a.id === id)
    if (deja) return repondre({ ok: true as const, id, imprevu: deja.imprevu, apresDebut: deja.apresDebut })
    const j = juger(d.motif, d.du, d.au, t, premierCreneau(d.du), p.planningPrevenirHeures, p.absenceMaxJours)
    if (!j.ok) return repondre({ ok: false as const, raison: j.raison })
    if (actives(t).some((a) => a.du <= d.au && d.du <= a.au)) return repondre({ ok: false as const, raison: 'chevauche' as const })
    const texte = textePropre(d.texte) || null
    const a: AbsenceDemo = { id, du: d.du, au: d.au, motif: d.motif, texte, imprevu: j.imprevu, apresDebut: j.apresDebut, prevenueLe: t, vueLe: null, annuleeLe: null }
    etatAbsences.ecrire((e) => void e.liste.push(a))
    if (etatSession.lire().compte === 'serge') publier({ type: 'absence', id, du: d.du, au: d.au, motif: d.motif, texte, imprevu: j.imprevu, apresDebut: j.apresDebut }, 'absence-' + origine.cle, t)
    return repondre({ ok: true as const, id, imprevu: j.imprevu, apresDebut: j.apresDebut })
  },
  annulerAbsence(id, origine) {
    const a = etatAbsences.lire().liste.find((x) => x.id === id && x.annuleeLe === null)
    if (!a) return repondre({ ok: false as const, raison: 'inconnue' as const })
    if (a.du <= jourDe(origine.heure)) return repondre({ ok: false as const, raison: 'commencee' as const })
    etatAbsences.ecrire((e) => void (e.liste.find((x) => x.id === id)!.annuleeLe = origine.heure))
    if (etatSession.lire().compte === 'serge') publier({ type: 'absence_annulee', id }, 'absence-annulee-' + origine.cle, origine.heure)
    return repondre({ ok: true as const })
  },
  changer(statut, origine, pause) {
    const s = etatSession.lire()
    const garde = s.compte === 'serge' ? s.colisSousGarde : 0
    // Hors service refusé tant qu'un colis est sous garde (409 custody_not_empty {count}).
    if (statut === 'hors_service' && garde > 0) return repondre({ ok: false as const, raison: 'colis_sous_garde' as const, nombre: garde })
    // Seul un compte actif (ou restreint, dans ses limites) peut recevoir des paquets (409 courier_not_active).
    const etat = etatAcces.lire()[s.compte].etat
    if (statut !== 'hors_service' && etat !== 'actif' && etat !== 'restreint') return repondre({ ok: false as const, raison: 'compte_non_actif' as const })
    etatDisponibilite.ecrire((e) => {
      e.statut = statut
      e.depuis = origine.heure
      e.motifPause = statut === 'en_pause' ? (pause?.motif ?? null) : null
      e.finPausePrevue = statut === 'en_pause' && pause?.minutes ? origine.heure + pause.minutes * 60_000 : null
    })
    return repondre({ ok: true as const })
  },
}

// DONNÉES DE DÉMONSTRATION — domaine « horsligne » : la file des gestes faits sans réseau au comptoir, et le « serveur »
// qui la reçoit. Rejeu dans l'ordre des heures d'origine ; chaque charge est rejouée par la source de démonstration
// (même clé d'idempotence : jamais deux effets). Au-delà de PR-OFF-EXPIRATION-H heures, une action est « expirée » :
// jamais envoyée, jamais effacée (OFF-05). Situation « hors_ligne » : le réseau est tombé à 13 h 48, deux gestes en file.
import { PARAMETRES } from '../calculs/registre'
import { HEURE, jourDe } from '../calculs/temps'
import type { ActionEnFile, ChargeGeste, DomaineHorsLigne, FileHorsLigne, ReglesFile } from '../donnees/domaines/horsligne'
import { maintenant } from './horloge'
import { h } from './jeu-essai'
import { scenario } from './scenario'
import { magasin, repondre } from './stockage'

const P = PARAMETRES.relais
const REGLES: ReglesFile = { expirationH: P.fileExpirationH, photoMaxKo: P.photoMaxKo, remisesHorsLigneParJour: P.horsLigneRemisesParJour, papierSaisieH: P.papierSaisieH }
const BASTOS = { lat: 3.8842, lng: 11.5139, precisionM: 10 }

function enAttente(type: ActionEnFile['type'], objet: string, heure: number, photos: number): ActionEnFile {
  return { type, objet, origine: { cle: `jeu-${type}-${objet}`, heure, position: BASTOS }, etat: 'en_attente', motif: null, photos, recu: null, expireA: heure + P.fileExpirationH * HEURE }
}

export const etatFile = magasin<FileHorsLigne & { jour: string }>('horsligne', () => ({
  actions: scenario() === 'hors_ligne' ? [enAttente('photo', 'CS-2207', h(13, 50), 1), enAttente('message', 'T-881', h(13, 55), 0)] : [],
  horsLigneDepuis: scenario() === 'hors_ligne' ? h(13, 48) : null,
  dernierEnvoi: { a: h(13, 41), envoyees: 3, refusees: 0 },
  remisesHorsLigneDuJour: 0,
  modePapier: null,
  jour: '2026-10-13',
}))

/** Le « serveur » reçoit une charge : l'appel est refait par la source de démonstration (chargée à la demande). */
async function rejouer(c: ChargeGeste): Promise<string | null> {
  const { sourceDemo } = await import('./source-demo')
  const d = (sourceDemo as unknown as Record<string, Record<string, (...a: unknown[]) => Promise<unknown>> | undefined>)[c.domaine]
  if (typeof d?.[c.methode] !== 'function') return 'geste_inconnu'
  const r = (await d[c.methode](...c.args)) as { ok?: boolean; raison?: string } | undefined
  return r && r.ok === false ? (r.raison ?? 'refuse') : null
}

/** Marque expirées les actions trop vieilles et remet à zéro le compteur des remises hors ligne au changement de jour. */
function entretenir() {
  const t = maintenant()
  const f = etatFile.lire()
  if (f.actions.some((a) => a.etat === 'en_attente' && t >= a.expireA) || f.jour !== jourDe(t))
    etatFile.ecrire((x) => {
      for (const a of x.actions) if (a.etat === 'en_attente' && t >= a.expireA) a.etat = 'expiree'
      if (x.jour !== jourDe(t)) Object.assign(x, { jour: jourDe(t), remisesHorsLigneDuJour: 0 })
    })
}

export const demoHorsLigne: DomaineHorsLigne = {
  file: () => (entretenir(), repondre(etatFile.lire())),
  regles: () => repondre(REGLES),
  mettreEnFile(type, objet, origine, details) {
    const a: ActionEnFile = { type, objet, origine, etat: 'en_attente', motif: null, photos: details?.photos ?? 0, recu: null, expireA: origine.heure + P.fileExpirationH * HEURE }
    if (details?.charge) Object.assign(a, { charge: details.charge, appliquee: !!details.appliquee })
    etatFile.ecrire((f) => void (f.actions.some((x) => x.origine.cle === origine.cle) || f.actions.push(a)))
    return repondre(a)
  },
  async envoyerFile() {
    entretenir()
    const t = maintenant()
    const ordre = etatFile.lire().actions.filter((a) => a.etat === 'en_attente').sort((a, b) => a.origine.heure - b.origine.heure)
    const issues = new Map<string, string | null>()
    for (const a of ordre) {
      try {
        issues.set(a.origine.cle, a.charge && !a.appliquee ? await rejouer(a.charge) : null)
      } catch {
        // Le serveur n'a pas répondu : l'élément reste en file, il repartira au prochain envoi.
      }
    }
    let envoyees = 0
    let refusees = 0
    const f = etatFile.ecrire((x) => {
      for (const a of x.actions) {
        if (a.etat !== 'en_attente' || !issues.has(a.origine.cle)) continue
        const r = issues.get(a.origine.cle)
        Object.assign(a, { recu: t, etat: r ? 'refusee' : 'envoyee', motif: r ?? null })
        if (r) refusees += 1
        else envoyees += 1
      }
      x.horsLigneDepuis = null
      x.dernierEnvoi = { a: t, envoyees, refusees }
    })
    return f.dernierEnvoi
  },
  async noterReseau(depuis) {
    if (etatFile.lire().horsLigneDepuis === null) etatFile.ecrire((f) => void (f.horsLigneDepuis = depuis))
  },
  async marquerRefaite(cle) {
    if (!etatFile.lire().actions.some((a) => a.origine.cle === cle && a.etat === 'expiree')) return { ok: false, raison: 'introuvable' }
    etatFile.ecrire((f) => void (f.actions.find((a) => a.origine.cle === cle)!.motif = 'refaite'))
    return { ok: true }
  },
}

// Heure limite de la préparation (BV-DEV-01 § 8.1 ; R45, R46, R47) : ce que « C'est prêt » maintenant promet au client.
// Domicile : prêt à 13 h au plus tard, livré le jour même moins de 5 h après ; prêt après 13 h, le jour de service
// suivant avant 13 h ; pas de service le dimanche ni hors 8 h – 18 h. Mêmes réglages et même « C'est prêt » estimé que
// la promesse du client (site/src/calculs/promesse.ts, = moteurs/belivay_moteurs/v20/promesse.py) : rien n'est recalculé ici.
import { pretEstime, reglage } from '@client/calculs'
import { DECALAGE_YAOUNDE_MS, HEURE, JOUR, debutDuJour, jourDe } from './temps'

export interface HeureLimite {
  /** 13 h du jour où le colis serait prêt : avant, livraison le jour même (null : déjà passée). */
  limite: number | null
  /** Le client est livré avant cette heure si le colis est prêt maintenant. */
  livreAvant: number
}

const service = (j: number) => j % 7 !== 6

export function heureLimite(maintenant: number): HeureLimite {
  const d = new Date(maintenant + DECALAGE_YAOUNDE_MS)
  const j = (d.getUTCDay() + 6) % 7 // 0 = lundi
  const h = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600
  const lundi = debutDuJour(jourDe(maintenant)) - j * JOUR
  const [jp, hp] = pretEstime(j, h, 0)
  const lim = reglage('heure_limite')
  if (hp <= lim) {
    const livre = Math.min(Math.ceil(hp + reglage('promesse_h') - 1e-9), reglage('fermeture'))
    return { limite: lundi + jp * JOUR + lim * HEURE, livreAvant: lundi + jp * JOUR + livre * HEURE }
  }
  let js = jp + 1
  while (!service(js)) js++
  return { limite: null, livreAvant: lundi + js * JOUR + lim * HEURE }
}

// Lecture des paramètres du registre pour l'espace livreur (moteurs/belivay_moteurs/registre.py ; CCH-15 : aucune
// valeur dans le code). Source : logique-metier/parametres-en-vigueur.json, importé à la construction. Chaque valeur
// est lue avec une forme attendue précise : si la forme change, la lecture s'arrête (ParametreIllisible) au lieu de
// deviner. En production, les mêmes codes viendront de la configuration versionnée du serveur (GET /config).
// SQUELETTE PRÊT POUR LES MOTEURS : un moteur du livreur (src/calculs/<moteur>.ts, portage d'un moteur Python) reçoit
// ses paramètres d'ici (PARAMETRES.livreur) ; un paramètre du paquet livreur qui manque encore au registre
// (outils/inventaire.mjs les liste) s'ajoute d'abord au registre, jamais en dur dans un écran.
import donnees from '../../../logique-metier/parametres-en-vigueur.json' with { type: 'json' }
import { ParametreAbsent, ParametreIllisible } from './erreurs'

export type Registre = Record<string, string>

/** Code → valeur, telle qu'écrite dans le registre. */
export function chargerRegistre(d: { parametres: { code: string; valeur: string }[] } = donnees): Registre {
  return Object.fromEntries(d.parametres.map((p) => [p.code, p.valeur]))
}
export const REGISTRE: Registre = chargerRegistre()

function valeur(r: Registre, code: string): string {
  if (!(code in r)) throw new ParametreAbsent(code)
  return r[code].trim()
}
/** Lit un paramètre selon une forme exacte (expression régulière entière) ; sinon ParametreIllisible. */
export function lire(r: Registre, code: string, motif: string): RegExpExecArray {
  const v = valeur(r, code)
  const m = new RegExp('^(?:' + motif + ')$').exec(v)
  if (!m) throw new ParametreIllisible(`${code} : « ${v} » ne suit pas la forme attendue`)
  return m
}

// ── Livreur (paquet LIV, DP-60) ─────────────────────────────────────────────────────────────────────────────

export interface ParametresLivreur {
  /** CODE-ESSAIS : codes de remise faux avant blocage, et durée du blocage (« 3 ⇒ blocage 24 h »). */
  codeRemise: { essais: number; blocageHeures: number }
  /** SLA-ZONE-H : promesse de délai de la zone, de « C'est prêt » à la remise (« moins de 5 h »). */
  delaiZoneHeures: number
  /** INC-NOTIF-MIN : délai de notification d'un incident (« 15 min »). */
  incidentNotificationMin: number
  /** RUPTURE-TENTATIVES : vendeurs suivants essayés avant remboursement, après un refus au ramassage (« 2 »). */
  ruptureTentatives: number
  /** DEPART-PREAVIS-J (DP-66) : préavis d'un départ demandé, en jours (« 7 »). */
  departPreavisJours: number
  /** DEPART-KIT-CONSTAT-H (DP-67) : délai du constat du kit après la fin du préavis, en heures (« 72 »). */
  departKitConstatHeures: number
  /** KIT-VALEUR-F (DP-67) : valeur du kit (plafond d'une retenue) et de chacun de ses éléments, en francs. */
  kitValeur: { total: number; elements: { nom: string; valeur: number }[] }
  /** PLANNING-PREVENIR-H (DP-67) : délai d'une absence prévue avant le premier créneau, en heures (« 24 »). */
  planningPrevenirHeures: number
  /** ABSENCE-MAX-J (DP-67) : jours au plus par demande d'absence (« 14 »). */
  absenceMaxJours: number
  /** PHOTO-REVERIF-J (DP-67) : délai pour envoyer la nouvelle photo demandée, en jours (« 7 »). */
  photoReverifJours: number
}

const francs = (t: string) => Number(t.replace(/[\s\u00a0\u202f]/g, ''))
/** « 21 000 F (sac … 12 000 F · pochettes … 4 500 F · …) » : total et éléments ; la somme doit faire le total. */
export function lireKit(r: Registre): ParametresLivreur['kitValeur'] {
  const m = lire(r, 'KIT-VALEUR-F', '(\\d[\\d\\s\u00a0\u202f]*) F \\((.+)\\)')
  const total = francs(m[1])
  const elements = m[2].split(' · ').map((x) => {
    const e = /^(.+?) (\d[\d\s\u00a0\u202f]*) F$/.exec(x.trim())
    if (!e) throw new ParametreIllisible(`KIT-VALEUR-F : « ${x} » ne suit pas la forme attendue`)
    return { nom: e[1], valeur: francs(e[2]) }
  })
  if (elements.reduce((s, e) => s + e.valeur, 0) !== total) throw new ParametreIllisible('KIT-VALEUR-F : la somme des éléments ne fait pas le total')
  return { total, elements }
}

export function lireLivreur(r: Registre): ParametresLivreur {
  const ce = lire(r, 'CODE-ESSAIS', '(\\d+) ⇒ blocage (\\d+) h')
  return {
    codeRemise: { essais: Number(ce[1]), blocageHeures: Number(ce[2]) },
    delaiZoneHeures: Number(lire(r, 'SLA-ZONE-H', 'moins de (\\d+) h')[1]),
    incidentNotificationMin: Number(lire(r, 'INC-NOTIF-MIN', '(\\d+) min')[1]),
    ruptureTentatives: Number(lire(r, 'RUPTURE-TENTATIVES', '(\\d+)')[1]),
    departPreavisJours: Number(lire(r, 'DEPART-PREAVIS-J', '(\\d+)')[1]),
    departKitConstatHeures: Number(lire(r, 'DEPART-KIT-CONSTAT-H', '(\\d+)')[1]),
    kitValeur: lireKit(r),
    planningPrevenirHeures: Number(lire(r, 'PLANNING-PREVENIR-H', '(\\d+)')[1]),
    absenceMaxJours: Number(lire(r, 'ABSENCE-MAX-J', '(\\d+)')[1]),
    photoReverifJours: Number(lire(r, 'PHOTO-REVERIF-J', '(\\d+)')[1]),
  }
}

export const PARAMETRES = {
  livreur: lireLivreur(REGISTRE),
}

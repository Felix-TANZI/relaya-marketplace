// DONNÉES DE DÉMONSTRATION — domaine « kit » : le kit de Serge le mardi 13 octobre. Remise enregistrée par Yafé
// Express à 7 h 48 à son agence de Bastos (12 S, 9 M, 3 C1, aucune pochette L ni carton C2 ; rouleau BV 24 8200 à BV 24 8249, de quoi couvrir la journée), déclarée par
// Serge à 7 h 50 ; étiquettes liées le matin (PQ-Z1-261013-001) et à l'arrêt 1 de PQ-Z1-261013-003. Le stock n'est jamais saisi : il se
// décompte à chaque étiquette liée (LIV-EQU-02). Seuils et alerte des pochettes abîmées : paramètres du registre.
import type { Instant, Origine } from '../donnees/communs'
import type { DomaineKit, FormatKit, Kit, MotifEcart, Quantites, StockFormat } from '../donnees/domaines/kit'
import { h } from './jeu-essai'
import { besoinsDesPaquets } from './paquets'
import { scenario } from './scenario'
import { etatSession, nombre, regle } from './session'
import { magasin, repondre } from './stockage'

export const FORMATS: FormatKit[] = ['S', 'M', 'L', 'C1', 'C2']
const zero = (): Quantites => ({ S: 0, M: 0, L: 0, C1: 0, C2: 0 })

/** Seuils « kit bas » par format (seuils_kit_bas : « S 3 · M 2 · L 1 · C1 1 ») ; le C2 n'en a pas (au stockage). */
function seuils(): Partial<Quantites> {
  const v = regle('seuils_kit_bas', '((?:S|M|L|C1|C2) \\d+(?: · )?)+')[0]
  return Object.fromEntries(v.split('·').map((x) => x.trim().split(' ')).map(([f, n]) => [f, Number(n)]))
}

/** Dimensions des cinq formats (LIV-EMB-FORMATS : « S 20×30 · M 25×35 · L 35×45 · C1 30×20×15 · C2 40×30×25 »). */
function dimensions(): Record<FormatKit, string> {
  const v = regle('LIV-EMB-FORMATS', '(?:(?:S|M|L|C1|C2) [\\d×]+(?: · )?)+')[0]
  return Object.fromEntries(v.split('·').map((x) => x.trim().split(' ')).map(([f, d]) => [f, d.replace(/×/g, ' × ') + ' cm'])) as Record<FormatKit, string>
}

// Étiquettes : « BV 24 8204 » = préfixe du rouleau + numéro.
const numero = (e: string) => Number(/(\d+)$/.exec(e)?.[1] ?? NaN)
const prefixe = (e: string) => e.replace(/\d+$/, '')
const etiquette = (pref: string, n: number) => pref + String(n)

interface EtatKit {
  remise: Kit['remise']
  declaration: Kit['declaration']
  accessoires: Kit['accessoires']
  plage: { de: string; a: string; perdu: boolean } | null
  lies: { etiquette: string; format: FormatKit; paquetId: string; le: Instant }[]
  abimes: { format: FormatKit; le: Instant }[]
  reassort: Kit['reassort']
  semaine: { utilises: number; abimes: number } // jours précédents de la semaine (lundi : jour de repos)
  rendu: Quantites | null
  motifs: Partial<Record<FormatKit, MotifEcart>>
}

function initial(): EtatKit {
  const remise = { le: h(7, 48), lieu: 'Agence Yafé Express · Bastos', quantites: { S: 12, M: 9, L: 0, C1: 3, C2: 0 }, plage: { de: 'BV 24 8200', a: 'BV 24 8249' } }
  const lies: EtatKit['lies'] = [
    { etiquette: 'BV 24 8200', format: 'S', paquetId: 'PQ-Z1-261013-001', le: h(9, 21) },
    { etiquette: 'BV 24 8201', format: 'S', paquetId: 'PQ-Z1-261013-001', le: h(9, 23) },
    { etiquette: 'BV 24 8202', format: 'M', paquetId: 'PQ-Z1-261013-001', le: h(9, 52) },
    { etiquette: 'BV 24 8203', format: 'M', paquetId: 'PQ-Z1-261013-001', le: h(9, 55) },
    { etiquette: 'BV 24 8204', format: 'S', paquetId: 'PQ-Z1-261013-003', le: h(13, 24) },
    { etiquette: 'BV 24 8205', format: 'C1', paquetId: 'PQ-Z1-261013-003', le: h(13, 27) },
  ]
  if (scenario() === 'aucun_paquet')
    lies.push(
      { etiquette: 'BV 24 8206', format: 'S', paquetId: 'PQ-Z1-261013-003', le: h(14, 18) },
      { etiquette: 'BV 24 8207', format: 'M', paquetId: 'PQ-Z1-261013-003', le: h(14, 21) },
      { etiquette: 'BV 24 8208', format: 'M', paquetId: 'PQ-Z1-261013-008', le: h(15, 58) },
    )
  return {
    remise,
    declaration: { le: h(7, 50), quantites: { ...remise.quantites }, ecartAvecRemise: false },
    accessoires: { ruban: true, marqueur: true, papierBulle: true },
    plage: { ...remise.plage, perdu: false },
    lies,
    abimes: [],
    reassort: null,
    semaine: { utilises: 0, abimes: 0 },
    rendu: null,
    motifs: {},
  }
}

export const etatKit = magasin<EtatKit>('kit', initial)

function stocks(e: EtatKit): Quantites {
  const s = zero()
  const recu = e.declaration?.quantites ?? zero()
  for (const f of FORMATS) s[f] = recu[f] - e.lies.filter((l) => l.format === f).length - e.abimes.filter((a) => a.format === f).length
  return s
}
/** Stock du téléphone par format (paquets : kit nécessaire comparé au kit déclaré). */
export const stockDisponible = (): Quantites => (etatSession.lire().compte === 'serge' ? stocks(etatKit.lire()) : zero())

function vue(e: EtatKit): Kit {
  const st = stocks(e)
  const se = seuils()
  // Couverture des paquets à venir, dans l'ordre des heures limites : chacun consomme avant le suivant.
  const reste = { ...st }
  const couverture: Kit['couverture'] = []
  for (const p of besoinsDesPaquets()) {
    const manque: Partial<Quantites> = {}
    for (const [f, n] of Object.entries(p.besoins) as [FormatKit, number][]) {
      if (reste[f] < n) manque[f] = n - Math.max(0, reste[f])
      reste[f] -= n
    }
    if (Object.keys(manque).length) couverture.push({ paquetId: p.paquetId, manque })
  }
  const formats: StockFormat[] = FORMATS.map((f) => {
    const seuil = se[f] ?? null
    const nonCouvert = couverture.some((x) => (x.manque[f] ?? 0) > 0)
    return {
      format: f,
      recu: e.declaration?.quantites[f] ?? 0,
      lies: e.lies.filter((l) => l.format === f).length,
      abimes: e.abimes.filter((a) => a.format === f).length,
      stock: st[f],
      seuil,
      etat: f === 'C2' && st[f] === 0 ? 'stockage' : nonCouvert ? 'non_couvert' : seuil !== null && st[f] < seuil ? 'bas' : 'ok',
    }
  })
  const valides = e.plage && !e.plage.perdu ? e.lies.filter((l) => prefixe(l.etiquette) === prefixe(e.plage!.de) && numero(l.etiquette) >= numero(e.plage!.de) && numero(l.etiquette) <= numero(e.plage!.a)) : []
  const derniere = valides.length ? valides.reduce((m, l) => (numero(l.etiquette) > numero(m) ? l.etiquette : m), valides[0].etiquette) : null
  const fin = e.plage ? numero(e.plage.a) : 0
  const prochain = e.plage ? (derniere ? numero(derniere) + 1 : numero(e.plage.de)) : 0
  const parPaquet = [...new Set(e.lies.map((l) => l.paquetId))]
  const utilises = e.semaine.utilises + e.lies.length
  const abimes = e.semaine.abimes + e.abimes.length
  const seuilPourcent = nombre('KIT-ABIME-SEUIL')
  const rendu = e.rendu
  return {
    formats,
    dimensions: dimensions(),
    etiquettes: e.plage
      ? { de: e.plage.de, a: e.plage.a, derniere, restantes: e.plage.perdu ? 0 : Math.max(0, fin - prochain + 1), prochaine: e.plage.perdu || prochain > fin ? null : etiquette(prefixe(e.plage.de), prochain), perdu: e.plage.perdu }
      : null,
    accessoires: e.accessoires,
    remise: e.remise,
    declaration: e.declaration,
    consommation: parPaquet.map((id) => {
      const l = e.lies.filter((x) => x.paquetId === id)
      const formats: Partial<Quantites> = {}
      for (const x of l) formats[x.format] = (formats[x.format] ?? 0) + 1
      const tri = l.map((x) => x.etiquette).sort((a, b) => numero(a) - numero(b))
      return { paquetId: id, formats, etiquettes: tri.length ? { de: tri[0], a: tri[tri.length - 1] } : null }
    }),
    couverture,
    reassort: e.reassort,
    abimesSemaine: { abimes, utilises, seuilPourcent, alerte: utilises + abimes > 0 && (abimes / (utilises + abimes)) * 100 > seuilPourcent },
    // Fin de journée : doit rester = reçu − étiquettes liées ; écart = doit rester − rendu (LIV-04-R39).
    finDeJournee: rendu
      ? {
          rendu,
          ecarts: FORMATS.map((f) => ({ format: f, ecart: (e.declaration?.quantites[f] ?? 0) - e.lies.filter((l) => l.format === f).length - rendu[f], motif: e.motifs[f] ?? null })).filter((x) => x.ecart !== 0),
        }
      : null,
    suffisant: couverture.length === 0,
  }
}

const vide = (): Kit => ({
  dimensions: dimensions(),
  formats: FORMATS.map((f) => ({ format: f, recu: 0, lies: 0, abimes: 0, stock: 0, seuil: null, etat: f === 'C2' ? 'stockage' : 'ok' })),
  etiquettes: null,
  accessoires: { ruban: false, marqueur: false, papierBulle: false },
  remise: null,
  declaration: null,
  consommation: [],
  couverture: [],
  reassort: null,
  abimesSemaine: { abimes: 0, utilises: 0, seuilPourcent: nombre('KIT-ABIME-SEUIL'), alerte: false },
  finDeJournee: null,
  suffisant: true,
})

/** Le kit vu par le livreur (Aujourd'hui : alertes). */
export const kitVu = (): Kit => (etatSession.lire().compte === 'serge' ? vue(etatKit.lire()) : vide())

/** Rouleau du livreur, lu par le ramassage (LIV-P13) : préfixe « BV 24 » de BelivaY, rangs à 4 chiffres. */
export function rouleau(): { prefixe: string; de: number; a: number; perdu: boolean } | null {
  const p = etatKit.lire().plage
  if (!p) return null
  const n = String(numero(p.de))
  return { prefixe: prefixe(p.de) + n.slice(0, -4), de: Number(n.slice(-4)), a: Number(String(numero(p.a)).slice(-4)), perdu: p.perdu }
}
/** Étiquette déjà liée à un colis (kit du jour). */
export const etiquetteLiee = (x: string) => etatKit.lire().lies.some((l) => l.etiquette === x)
/** Liaison faite au ramassage, une fois le format choisi : le stock du format se décompte (LIV-EQU-02). */
export function lierAuKit(format: FormatKit, x: string, paquetId: string, le: Instant) {
  if (!etiquetteLiee(x)) etatKit.ecrire((k) => void k.lies.push({ etiquette: x, format, paquetId, le }))
}
const dansPlage = (e: EtatKit, x: string) => !!e.plage && prefixe(x) === prefixe(e.plage.de) && numero(x) >= numero(e.plage.de) && numero(x) <= numero(e.plage.a)

export const demoKit: DomaineKit = {
  lire: () => repondre(kitVu()),
  confirmerReception(quantites, accessoires, premiere, o: Origine) {
    const e = etatKit.lire()
    if (!e.remise) return repondre({ ok: false as const, raison: 'sans_remise' as const })
    // Le rouleau scanné doit être celui que l'entreprise a remis (plage enregistrée dans son portail, ENT-P21R-01).
    if (premiere.trim().toUpperCase() !== e.remise.plage.de) return repondre({ ok: false as const, raison: 'plage_differente' as const })
    etatKit.ecrire((x) => {
      x.declaration = { le: o.heure, quantites, ecartAvecRemise: FORMATS.some((f) => quantites[f] !== x.remise!.quantites[f]) }
      x.accessoires = accessoires
    })
    return repondre({ ok: true as const })
  },
  demanderReassort(formats, paquetId, o) {
    if (!Object.values(formats).some((n) => (n ?? 0) > 0)) return repondre({ ok: false as const, raison: 'rien_a_demander' as const })
    const r = etatKit.lire().reassort
    if (r && r.paquetId === paquetId) return repondre({ ok: false as const, raison: 'deja_demande' as const })
    // Notification au répartiteur de l'entreprise (ENT-P21) : formats et paquet.
    etatKit.ecrire((x) => void (x.reassort = { demandeLe: o.heure, formats, paquetId }))
    return repondre({ ok: true as const })
  },
  declarerAbimee(format, o) {
    if (stocks(etatKit.lire())[format] <= 0) return repondre({ ok: false as const, raison: 'plus_de_stock' as const })
    etatKit.ecrire((x) => void x.abimes.push({ format, le: o.heure }))
    return repondre({ ok: true as const })
  },
  declarerRouleauPerdu() {
    const e = etatKit.lire()
    if (!e.plage) return repondre({ ok: false as const, raison: 'sans_rouleau' as const })
    if (e.plage.perdu) return repondre({ ok: false as const, raison: 'deja_perdu' as const })
    // La plage est invalidée dans le système : plus aucune de ses étiquettes ne peut être liée (LIV-RG-R71).
    etatKit.ecrire((x) => void (x.plage!.perdu = true))
    return repondre({ ok: true as const })
  },
  lierEtiquette(format, x, paquetId, o) {
    const e = etatKit.lire()
    if (e.plage?.perdu) return repondre({ ok: false as const, raison: 'plage_perdue' as const })
    if (!dansPlage(e, x)) return repondre({ ok: false as const, raison: 'hors_plage' as const })
    if (e.lies.some((l) => l.etiquette === x)) return repondre({ ok: false as const, raison: 'deja_liee' as const })
    if (stocks(e)[format] <= 0) return repondre({ ok: false as const, raison: 'plus_de_stock' as const })
    etatKit.ecrire((k) => void k.lies.push({ etiquette: x, format, paquetId, le: o.heure }))
    return repondre({ ok: true as const })
  },
  declarerRendu(rendu) {
    etatKit.ecrire((x) => void (x.rendu = rendu))
    return repondre({ ok: true as const })
  },
  declarerMotifEcart(format, motif) {
    const k = kitVu()
    if (!k.finDeJournee?.ecarts.some((x) => x.format === format)) return repondre({ ok: false as const, raison: 'sans_ecart' as const })
    etatKit.ecrire((x) => void (x.motifs[format] = motif))
    return repondre({ ok: true as const })
  },
}


// DONNÉES DE DÉMONSTRATION — domaine « ramassage » (LIV-06) : deux ramassages, Maison Ngono (A2, deux colis, dont un
// tiré pour l'audit C4 : vendeur récent, 100 % de ses premières commandes) et Afrik Déco (A6, la course à
// domicile). Le serveur décide de tout ce que l'écran ne doit pas décider : tirage de l'audit (révélé après le
// contrôle), plage d'étiquettes du rouleau, unicité d'une étiquette, essais du code (CODE-ESSAIS), blocage, garde.
import type { ClasseColis } from '../donnees/communs'
import type { ArticleFiche, ControleColis, DomaineRamassage, FormatEmballage, Ramassage } from '../donnees/domaines/ramassage'
import { maintenant } from './horloge'
import { h } from './jeu-essai'
import { etiquetteLiee, lierAuKit, rouleau, stockDisponible } from './kit'
import { magasin, repondre } from './stockage'
import { INCIDENTS_TERRAIN, MINUTE_MS, arretDe, changerColis, changerGarde, etape, etatTournee, journaliser, lotDe, modifier, ouvrirIncident, reglesDemo, terminerArret } from './tournee'
import { codeRemisePont, colisPont, ficheDuColis, objetsPont } from './objets-pont'
import { publier } from './pont'
import { formatConseille } from '../donnees/domaines/paquets'

/** Codes de remise que chaque vendeur lit dans « Mes commandes à remettre » (l'API ne les renvoie jamais). */
const CODES: Record<string, string> = { A2: '305718', A6: '640277' }
/** Tirage C4 fait par le serveur au chargement du paquet : jamais montré avant le contrôle. */
const AUDIT_TIRE = new Set(['BLV-00014-1'])

const colis = (colisId: string, classe: ClasseColis, fragile: boolean, article: ArticleFiche, formatConseille: FormatEmballage): ControleColis => ({
  colisId,
  classe,
  fragile,
  article,
  etat: 'attendu',
  formatConseille,
  zoneManuscrite: 'Z1 · B',
  cases: [false, false, false, false, false, false],
  boiteScellee: null,
  photo1: null,
  classeDepassee: null,
  serieIllisible: false,
  audit: null,
  format: null,
  motifFormat: null,
  etiquette: null,
  scelle: [false, false, false],
  photo2: null,
  recupere: null,
  manquant: null,
  refuse: null,
})

const ramassage = (arretId: string, vendeur: string, repere: string, creneau: [number, number], c: ControleColis[], quartier = 'Bastos'): Ramassage => ({
  arretId,
  vendeur,
  quartier,
  repere,
  creneau,
  arriveeA: null,
  notification: null,
  relanceA: null,
  colis: c,
  code: { essaisRestants: 0, bloqueJusqua: null, valideA: null },
  // Rouleau et stock : ceux du kit du jour (domaine « kit »), relus à chaque lecture.
  plageEtiquettes: { prefixe: '', de: 0, a: 0 },
  stock: {},
  fermee: null,
})

const etat = magasin('ramassage', () => ({
  ramassages: {
    A2: ramassage('A2', 'Maison Ngono', 'Face à l’ambassade de Chine, portail vert', [h(14, 0), h(14, 30)], [
      colis('BLV-00011-1', 'S', false, { nom: 'Robe en wax', variante: 'Taille M · motif bleu', etat: 'Neuf', quantite: 1, accessoires: null, serie: false, categorie: 'mode' }, 'S'),
      colis('BLV-00014-1', 'M', true, { nom: 'Écouteurs sans fil BT-500', variante: 'Noir', etat: 'Neuf', quantite: 1, accessoires: 'Boîtier de charge, câble USB-C', serie: true, categorie: 'electronique' }, 'C1'),
    ]),
    A6: ramassage('A6', 'Afrik Déco', 'Nlongkak, face à la station, boutique rouge', [h(16, 15), h(16, 45)], [
      colis('BLV-00017-1', 'M', false, { nom: 'Pagne bazin brodé', variante: '6 yards · bleu roi', etat: 'Neuf', quantite: 1, accessoires: null, serie: false, categorie: 'mode' }, 'M'),
    ], 'Nlongkak'),
  } as Record<string, Ramassage>,
  // Étiquettes liées ici (les liaisons du matin sont au kit) : une étiquette ne se lie qu'une fois, définitivement.
  liees: [] as string[],
}))

/** Code de remise attendu à un arrêt : celui du jeu d'essai, sinon celui du vendeur pour le colis venu du pont. */
const codeDe = (arretId: string): string | undefined => CODES[arretId] ?? (etat.lire().ramassages[arretId]?.colis[0] ? codeRemisePont(etat.lire().ramassages[arretId].colis[0].colisId) : undefined)
const duPont = (arretId: string) => arretId in objetsPont.lire().lieux

/** Ramassage d'un paquet venu d'une commande du client (pont commun), prêt quand le livreur part. */
export function ajouterRamassagePont(arretId: string, vendeur: string, quartier: string, creneau: [string, string] | null, c: { id: string; classe: ClasseColis; fragile: boolean }[]) {
  if (etat.lire().ramassages[arretId]) return
  const heure = (x: string) => h(Number(x.slice(0, 2)), Number(x.slice(3, 5)))
  const cr: [number, number] = creneau ? [heure(creneau[0]), heure(creneau[1])] : [maintenant(), maintenant() + 30 * MINUTE_MS]
  const repere = objetsPont.lire().lieux[arretId]?.repere ?? quartier
  etat.ecrire((e) => void (e.ramassages[arretId] = ramassage(arretId, vendeur, repere, cr, c.map((x) => colis(x.id, x.classe, x.fragile, ficheDuColis(x.id), formatConseille(x.classe, x.fragile))), quartier)))
}

const ecrire = (arretId: string, f: (r: Ramassage) => void) => etat.ecrire((e) => f(e.ramassages[arretId]))
const ouSe = (colisId: string) => Object.values(etat.lire().ramassages).find((r) => r.colis.some((c) => c.colisId === colisId)) ?? null
function ecrireColis(colisId: string, f: (c: ControleColis, r: Ramassage) => void) {
  etat.ecrire((e) => {
    for (const r of Object.values(e.ramassages)) for (const c of r.colis) if (c.colisId === colisId) f(c, r)
  })
}
const enAttente = (r: Ramassage) => r.colis.filter((c) => c.etat !== 'refuse' && c.etat !== 'retire')
const ok = { ok: true as const }

/** Plus aucun colis à prendre à cet arrêt (tous refusés ou retirés) : l'arrêt se termine, la tournée continue. */
function verifierFin(arretId: string) {
  const r = etat.lire().ramassages[arretId]
  if (r && enAttente(r).length === 0 && arretDe(arretId)?.etat === 'en_cours') terminerArret(arretId, 'fait')
}

/** Numéro d'étiquette normalisé « BV 24 8206 » (scan ou saisie : « bv248206 », « 8206 »). */
function normaliser(saisie: string, prefixe: string): string | null {
  const chiffres = saisie.replace(/\D/g, '')
  const p = prefixe.replace(/\D/g, '')
  const n = chiffres.startsWith(p) && chiffres.length > p.length ? chiffres.slice(p.length) : chiffres
  return /^\d{4}$/.test(n) ? `${prefixe}${n}` : null
}

/** Colis du ramassage remis au livreur (pour le dépôt et la remise qui suivent). */
export const colisRemis = (arretId: string) => etat.lire().ramassages[arretId]?.colis.filter((c) => c.etat === 'remis') ?? []

export const demoRamassage: DomaineRamassage = {
  async ramassage(arretId) {
    const r = etat.lire().ramassages[arretId]
    if (!r) return repondre(null)
    const regles = await reglesDemo()
    const a = arretDe(arretId)
    const essais = r.code.essaisRestants || (r.code.bloqueJusqua || r.code.valideA ? 0 : regles.codeEssais)
    const rl = rouleau()
    const plageEtiquettes = rl ? { prefixe: rl.prefixe, de: rl.de, a: rl.a } : r.plageEtiquettes
    return repondre({ ...r, plageEtiquettes, stock: stockDisponible(), arriveeA: a?.arriveeA ?? null, notification: a?.arriveeA ? 'envoyee' : null, code: { ...r.code, essaisRestants: essais }, codeDemo: codeDe(arretId) })
  },
  relancer(arretId, o) {
    if (etat.lire().ramassages[arretId]?.relanceA) return repondre({ ok: false as const, raison: 'deja_relance' as const })
    journaliser('relance_vendeur', arretId, o)
    ecrire(arretId, (r) => void (r.relanceA = maintenant()))
    return repondre(ok)
  },
  async pasPret(arretId, o) {
    const regles = await reglesDemo()
    const arrivee = arretDe(arretId)?.arriveeA ?? null
    const possibleA = (arrivee ?? maintenant()) + regles.attenteVendeurMin * MINUTE_MS
    if (arrivee === null || maintenant() < possibleA) return repondre({ ok: false as const, raison: 'trop_tot' as const, possibleA })
    if (!journaliser('vendeur_pas_pret', arretId, o)) return repondre(ok)
    const nom = etat.lire().ramassages[arretId].vendeur
    terminerArret(arretId, 'dissocie')
    modifier('{vendeur} n’était pas prêt : BelivaY le relance et décide du repassage. La tournée continue, les colis attendus sont recalculés.', { vendeur: nom })
    return repondre(ok)
  },
  async boutiqueFermee(arretId, photo, note, o) {
    const regles = await reglesDemo()
    if (note.trim().length < regles.noteMin) return repondre({ ok: false as const, raison: 'note_trop_courte' as const })
    if (!journaliser('boutique_fermee', arretId, o)) return repondre(ok)
    ecrire(arretId, (r) => void (r.fermee = { photo, note: note.trim(), quand: maintenant() }))
    etatTournee.ecrire((t) => void (t.arrets.find((a) => a.id === arretId)!.etat = 'echec'))
    ouvrirIncident('Boutique fermée à votre arrivée', '{entreprise} valide l’incident ; le système dissocie l’arrêt et recalcule les colis attendus. Événement Ponctualité pour le vendeur, aucun pour vous.', { entreprise: 'Yafé Express' }, arretId, { famille: 'vendeur', type: 'boutique_fermee' })
    return repondre(ok)
  },
  controler(colisId, c, o) {
    if (c.cases.length !== 6 || c.cases.some((x) => !x)) return repondre({ ok: false as const, raison: 'cases_incompletes' as const })
    if (!c.photo1) return repondre({ ok: false as const, raison: 'photo_manquante' as const })
    const audit = AUDIT_TIRE.has(colisId)
    if (journaliser('controle', colisId, o)) {
      ecrireColis(colisId, (x) => {
        Object.assign(x, { cases: c.cases, boiteScellee: c.boiteScellee, photo1: c.photo1, classeDepassee: c.classeDepassee, serieIllisible: c.serieIllisible })
        x.etat = audit ? 'audit' : 'controle'
        if (audit) x.audit = { verifs: [null, null, null, null], photos: [], resultat: null, debut: maintenant() }
      })
      // Classe dépassée sur un colis venu du pont : reclassement facturé au vendeur (le vendeur et l'entreprise le voient).
      const p = colisPont(colisId)
      if (p && c.classeDepassee) publier({ type: 'parcel.reclassified', paquet: p.paquetId, colis: colisId, de: p.classe, vers: String(c.classeDepassee) }, 'parcel.reclassified-' + colisId, maintenant())
      const r = ouSe(colisId)
      if (r) etape(r.arretId, 2)
    }
    return repondre({ ok: true as const, suite: audit ? ('audit' as const) : ('emballage' as const) })
  },
  async auditer(colisId, a, o) {
    const regles = await reglesDemo()
    const r = ouSe(colisId)
    const x = r?.colis.find((c) => c.colisId === colisId)
    if (!r || !x?.audit) return repondre({ ok: false as const, raison: 'incomplet' as const })
    const impossible = a.verifs.some((v) => v === null)
    if (impossible ? a.photos.length < 1 : a.photos.length < 3) return repondre({ ok: false as const, raison: 'incomplet' as const })
    const resultat = impossible ? 'attente_console' : a.verifs.every((v) => v) ? 'favorable' : 'defavorable'
    if (journaliser('audit', colisId, o)) {
      // La durée réelle de l'audit (plafonnée) est comptée dans la tournée : l'heure limite est recalculée à la minute.
      const minutes = Math.min(regles.auditMaxMin, Math.max(1, Math.ceil((maintenant() - x.audit.debut) / MINUTE_MS)))
      etatTournee.ecrire((t) => {
        const p = t.paquets.find((q) => q.id === arretDe(r.arretId)?.paquetId)
        if (p) p.heureLimite += minutes * MINUTE_MS
      })
      ecrireColis(colisId, (c) => {
        c.audit = { ...c.audit!, verifs: a.verifs, photos: a.photos, resultat }
        if (resultat === 'favorable') c.etat = 'controle'
      })
    }
    return repondre({ ok: true as const, suite: resultat === 'favorable' ? ('emballage' as const) : resultat === 'defavorable' ? ('refus' as const) : ('attente_console' as const) })
  },
  lierEtiquette(colisId, numero, o) {
    const r = ouSe(colisId)
    if (!r) return repondre({ ok: false as const, raison: 'illisible' as const })
    const rl = rouleau()
    const n = rl ? normaliser(numero, rl.prefixe) : null
    if (!rl || !n) return repondre({ ok: false as const, raison: 'illisible' as const })
    const rang = Number(n.slice(-4))
    // Un rouleau déclaré perdu invalide sa plage (LIV-RG-R71) : plus aucune de ses étiquettes ne se lie.
    if (rl.perdu || rang < rl.de || rang > rl.a) return repondre({ ok: false as const, raison: 'hors_plage' as const })
    const deja = r.colis.find((c) => c.colisId === colisId)?.etiquette
    if (deja === n) return repondre({ ok: true as const, numero: n })
    if (etat.lire().liees.includes(n) || etiquetteLiee(n) || deja) return repondre({ ok: false as const, raison: 'deja_liee' as const })
    journaliser('etiquette', colisId, o)
    etat.ecrire((e) => {
      e.liees.push(n)
      for (const x of Object.values(e.ramassages)) for (const c of x.colis) if (c.colisId === colisId) c.etiquette = n
    })
    return repondre({ ok: true as const, numero: n })
  },
  emballer(colisId, e, o) {
    const r = ouSe(colisId)
    const x = r?.colis.find((c) => c.colisId === colisId)
    if (!r || !x?.etiquette) return repondre({ ok: false as const, raison: 'etiquette_manquante' as const })
    if (e.format !== x.formatConseille && !e.motifFormat?.trim()) return repondre({ ok: false as const, raison: 'motif_manquant' as const })
    if (e.scelle.length !== 3 || e.scelle.some((s) => !s)) return repondre({ ok: false as const, raison: 'scelle_incomplet' as const })
    if (journaliser('emballage', colisId, o)) {
      ecrireColis(colisId, (c) => void Object.assign(c, { format: e.format, motifFormat: e.motifFormat, scelle: e.scelle, photo2: e.photo2, etat: 'emballe' }))
      // Le kit se décompte à chaque étiquette liée, dans le format choisi : aucune saisie du livreur (LIV-EQU-02).
      if (e.format !== 'origine') lierAuKit(e.format, x.etiquette, arretDe(r.arretId)?.paquetId ?? '', o.heure)
      etape(r.arretId, 3)
    }
    return repondre(ok)
  },
  emballageManquant(colisId, o) {
    const r = ouSe(colisId)
    if (!r || !journaliser('emballage_manquant', colisId, o)) return repondre(ok)
    ecrireColis(colisId, (c) => void (c.etat = 'retire'))
    changerColis(r.arretId, -1)
    modifier('Emballage manquant : {colis} reste chez {vendeur}, son ramassage est reporté. Les colis attendus sont recalculés ; vous ne payez rien.', { colis: colisId, vendeur: r.vendeur })
    verifierFin(r.arretId)
    return repondre(ok)
  },
  async validerCode(arretId, code, o) {
    const regles = await reglesDemo()
    const r = etat.lire().ramassages[arretId]
    if (!r) return repondre({ ok: false as const, raison: 'controle_incomplet' as const })
    if (r.code.bloqueJusqua && r.code.bloqueJusqua > maintenant()) return repondre({ ok: false as const, raison: 'bloque' as const, essaisRestants: 0 })
    const prets = enAttente(r)
    if (prets.length === 0 || prets.some((c) => c.etat !== 'emballe' || !c.photo1 || !c.photo2 || !c.etiquette)) return repondre({ ok: false as const, raison: 'controle_incomplet' as const })
    const essais = r.code.essaisRestants || regles.codeEssais
    if (code !== codeDe(arretId)) {
      journaliser('code_faux', arretId, o)
      const reste = essais - 1
      ecrire(arretId, (x) => {
        x.code.essaisRestants = reste
        if (reste <= 0) x.code.bloqueJusqua = maintenant() + regles.codeBlocageH * 60 * MINUTE_MS
      })
      if (reste <= 0) {
        etatTournee.ecrire((t) => void (t.arrets.find((a) => a.id === arretId)!.etat = 'echec'))
        ouvrirIncident('Code de remise bloqué', 'Les colis restent chez {vendeur}. {entreprise} valide l’incident ; le vendeur redemande lui-même un code, sans effet pour lui. Aucun effet pour vous.', { vendeur: r.vendeur, entreprise: 'Yafé Express' }, arretId, { famille: 'vendeur', type: 'code_bloque' })
        return repondre({ ok: false as const, raison: 'bloque' as const, essaisRestants: 0 })
      }
      return repondre({ ok: false as const, raison: 'code_faux' as const, essaisRestants: reste })
    }
    if (!journaliser('code_remise', arretId, o)) return repondre({ ok: true as const, garde: prets.length })
    // Passage de responsabilité à l'entreprise, horodaté à la seconde ; le vendeur voit « Remis à Serge », le client
    // passe « En route » et ne peut plus annuler (parcel.collected).
    ecrire(arretId, (x) => {
      x.code.valideA = maintenant()
      for (const c of x.colis) if (c.etat === 'emballe') c.etat = 'remis'
    })
    changerGarde(prets.length)
    etape(arretId, 4)
    // Commande du client (pont commun) : le vendeur voit « Remis à Serge A. », le client « Ramassé », l'entreprise
    // l'avancement, le relais l'arrivée annoncée.
    if (duPont(arretId)) {
      const paquetId = arretDe(arretId)?.paquetId ?? ''
      const relais = etatTournee.lire().arrets.find((a) => a.paquetId === paquetId && a.type === 'relais')
      publier({ type: 'parcel.collected', paquet: paquetId, arret: arretId, colis: prets.map((x) => x.colisId), relais: relais ? lotDe(relais.id) : null }, 'parcel.collected-' + arretId, maintenant())
    }
    terminerArret(arretId, 'fait')
    return repondre({ ok: true as const, garde: prets.length })
  },
  async refuser(colisId, motif, photo, note, o) {
    const regles = await reglesDemo()
    if (!photo) return repondre({ ok: false as const, raison: 'photo_manquante' as const })
    if (note.trim().length < regles.noteMin) return repondre({ ok: false as const, raison: 'note_trop_courte' as const })
    const r = ouSe(colisId)
    const dossier = motif === 'contrefacon' || motif === 'interdit'
    if (!r || !journaliser('refus:' + motif, colisId, o)) return repondre({ ok: true as const, dossier })
    ecrireColis(colisId, (c) => {
      c.etat = 'refuse'
      c.refuse = { motif, photo, note: note.trim(), quand: maintenant() }
    })
    // Colis d'une commande du client (pont commun) : le vendeur reçoit le refus motivé, le client en est informé.
    if (colisPont(colisId)) publier({ type: 'parcel.refused_at_pickup', paquet: colisPont(colisId)!.paquetId, colis: colisId, motif, photos: photo ? 1 : 0 }, 'parcel.refused_at_pickup-' + colisId, maintenant())
    changerColis(r.arretId, -1)
    modifier('Refus envoyé pour {colis} : le vendeur est prévenu, BelivaY confie la commande au vendeur suivant ou rembourse le client. Les colis attendus sont recalculés.', { colis: colisId })
    verifierFin(r.arretId)
    return repondre({ ok: true as const, dossier })
  },
  async recuperer(colisId, par, photo, o) {
    const r = ouSe(colisId)
    if (!r) return repondre({ ok: false as const, raison: 'inconnu' as const })
    if (!photo) return repondre({ ok: false as const, raison: 'photo_manquante' as const })
    if (journaliser('recuperation:' + par, colisId, o)) {
      ecrireColis(colisId, (c) => void Object.assign(c, { recupere: { photo, par, quand: maintenant() }, manquant: null }))
      const p = colisPont(colisId)
      publier({ type: 'preuve', paquetId: p?.paquetId ?? arretDe(r.arretId)?.paquetId ?? null, objet: colisId, nature: 'recuperation' }, 'recuperation-' + o.cle, maintenant())
    }
    return repondre(ok)
  },
  async colisManquant(colisId, choix, o) {
    const regles = await reglesDemo()
    const r = ouSe(colisId)
    if (!r) return repondre({ ok: false as const, raison: 'inconnu' as const })
    if (choix === 'attendre') {
      const deja = r.colis.find((c) => c.colisId === colisId)?.manquant
      if (deja) return repondre({ ok: true as const, jusqua: deja.jusqua })
      const jusqua = maintenant() + regles.attenteVendeurMin * MINUTE_MS
      journaliser('colis_attendu', colisId, o)
      ecrireColis(colisId, (c) => void (c.manquant = { depuis: maintenant(), jusqua }))
      return repondre({ ok: true as const, jusqua })
    }
    if (!journaliser('colis_laisse', colisId, o)) return repondre(ok)
    ecrireColis(colisId, (c) => void Object.assign(c, { etat: 'retire', manquant: null }))
    changerColis(r.arretId, -1)
    const paquetId = arretDe(r.arretId)?.paquetId ?? ''
    // L'entreprise est prévenue (missions) et le dossier est ouvert sans bloquer la tournée (vendeur pas prêt).
    publier({ type: 'colis_laisse', paquetId, arretId: r.arretId, colis: colisId }, 'colis_laisse-' + colisId, maintenant())
    INCIDENTS_TERRAIN.enregistrer?.({ famille: 'vendeur', type: 'pas_pret', note: `Colis ${colisId} pas prêt : parti avec les autres colis.`, arretId: r.arretId })
    modifier('{colis} reste chez {vendeur} : {entreprise} est prévenue et BelivaY décide de son repassage. Vous partez avec les autres colis.', { colis: colisId, vendeur: r.vendeur, entreprise: 'Yafé Express' })
    verifierFin(r.arretId)
    return repondre(ok)
  },
  corrigerSurPlace(colisId, o) {
    journaliser('correction_sur_place', colisId, o)
    ecrireColis(colisId, (c) => {
      Object.assign(c, { etat: 'attendu', cases: [false, false, false, false, false, false], boiteScellee: null, photo1: null, classeDepassee: null, serieIllisible: false, audit: null })
    })
    return repondre(ok)
  },
}

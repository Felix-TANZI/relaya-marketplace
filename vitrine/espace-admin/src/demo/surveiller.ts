// DONNÉES DE DÉMONSTRATION — « tout surveiller et agir » depuis la console : accès des comptes d'acteurs (bloquer,
// rétablir), promotions de la plateforme (programmer, lancer, arrêter) et photos remplacées (bannières et moments de
// l'accueil, catégories, produit signalé, pièce d'un dossier). Le « serveur » :
// - chaque geste a un motif écrit (motif_min_caracteres), est journalisé et publié à l'espace concerné par le pont
//   (acces_change, promotion, photo_remplacee) ; jamais une donnée d'identité dans le pont ;
// - droits : ceux de la page de l'acteur (« oui », ou « zone » dans le périmètre de l'agent) ; bloquer un vendeur, un
//   relais, une entreprise ou un livreur revient à suspendre son activité : quatre yeux (A-12, S4-02 : second
//   Direction, autre compte), appliqué à la contre-signature ; bloquer un client, rétablir un accès : aussitôt ;
//   conflit d'intérêts (A-33) : jamais sur un compte que l'agent tient ;
// - une promotion de la plateforme est financée par BelivaY (budget de croissance), jamais déduite du net vendeur ;
//   remise au plus la limite de générosité ; Direction seule pour la créer ou la lancer, Service client pour l'arrêter
//   (contrôle, comme les ventes flash) ;
// - une photo est réduite sur l'appareil (1 200 px au plus) ; la pièce d'un dossier reste dans la console (jamais
//   publiée : donnée personnelle, loi n° 2024/017).
import { PARAMETRES } from '../calculs/registre'
import { PERMISSIONS, droitDe } from '../config/droits'
import { AccesRefuse, type CodeZone, type Role } from '../donnees/communs'
import type { AccesActeur, DemandeAcces, DomaineActeurs, EspaceActeur, RaisonAcces } from '../donnees/domaines/acteurs'
import type { CiblePhoto, CiblePromotion, DemandePromotion, DomainePilotage, EtatPromotion, PhotoConsole, PromotionPlateforme, RaisonPhoto, RaisonPromotion, RemisePromotion } from '../donnees/domaines/pilotage'
import type { Resultat } from '../donnees/communs'
import { REGLES_S5 } from '../pages/ADM-11/regles-s5'
import { CONTENU_ACCUEIL } from '@client/donnees/contenus'
import { MOMENTS_PAR_DEFAUT } from '@client/donnees/moments'
import { agentCourant, dansPerimetre, exiger, exigerPage, roleCourant } from './acces'
import { maintenant } from './horloge'
import { T, VENDEURS, nomAgent } from './jeu-essai'
import { journaliser } from './journal'
import { publier } from './pont'
import { decisionsEnAttente, demanderSecond, effetQuatreYeux } from './quatreyeux'
import { magasin, repondre } from './stockage'

const motifValable = (m: string) => m.trim().length >= PARAMETRES.console.motifMin
const nomCourant = () => nomAgent(agentCourant())

// ── Accès des comptes d'acteurs ────────────────────────────────────────────────────────────────────────────────────
/** Page de la console qui tient chaque espace : ses droits disent qui bloque ou rétablit. */
const PAGE: Record<EspaceActeur, string> = { client: 'clients', vendeur: 'vendeurs', livreur: 'livreurs', relais: 'relais', entreprise: 'entreprises' }
const QUATRE_YEUX: Record<EspaceActeur, boolean> = { client: false, vendeur: true, livreur: true, relais: true, entreprise: true }
const SECOND: Role[] = ['superviseur']

interface EtatAcces {
  etat: 'autorise' | 'bloque'
  depuis: number | null
  par: string | null
  motif: string | null
}
interface Demande {
  espace: EspaceActeur
  acteurId: string
  nom: string
  zone: CodeZone | null
  par: string
  le: number
  motif: string
}
export const accesDemo = magasin<{ n: number; acces: Record<string, EtatAcces>; demandes: Record<string, Demande>; historique: Record<string, AccesActeur['historique']> }>('acces-acteurs', () => ({ n: 0, acces: {}, demandes: {}, historique: {} }))
const cle = (espace: EspaceActeur, id: string) => `${espace}:${id}`

function peut(espace: EspaceActeur, zone: CodeZone | null): boolean {
  const a = droitDe(PAGE[espace], roleCourant()).acces
  return a === 'oui' || (a === 'zone' && dansPerimetre(zone))
}
/** Conflit d'intérêts (A-33) : un compte d'acteur tenu par l'agent connecté. */
const tenuParMoi = (espace: EspaceActeur, id: string) => espace === 'vendeur' && VENDEURS.some((v) => v.id === id && 'lieAgent' in v && v.lieAgent === agentCourant().id)
/** Demande de blocage encore à contresigner (une décision tranchée ou échue n'attend plus). */
function demandeEnCours(k: string): [string, Demande] | null {
  const ouvertes = new Set(decisionsEnAttente().map((d) => d.id))
  const x = Object.entries(accesDemo.lire().demandes).find(([qy, d]) => cle(d.espace, d.acteurId) === k && ouvertes.has(qy))
  return x ?? null
}
async function appliquer(d: { espace: EspaceActeur; acteurId: string; zone: CodeZone | null; etat: 'bloque' | 'autorise'; motif: string; par: string; objet: string }) {
  const k = cle(d.espace, d.acteurId)
  const n = maintenant()
  const e = accesDemo.ecrire((s) => {
    s.n++
    s.acces[k] = { etat: d.etat, depuis: n, par: d.par, motif: d.motif }
    ;(s.historique[k] ??= []).unshift({ le: n, etat: d.etat, par: d.par, motif: d.motif })
  })
  publier({ type: 'acces_change', espace: d.espace, acteur: d.acteurId, etat: d.etat, motif: d.motif }, `admin-acces-${k}-${e.n}`, n)
}
// À la contre-signature : le blocage s'applique (jamais avant) ; refusé ou échu, la demande tombe.
effetQuatreYeux('blocage.', async (_objet, q) => {
  const d = accesDemo.lire().demandes[q.id]
  if (!d) return
  accesDemo.ecrire((s) => void delete s.demandes[q.id])
  if (q.etat !== 'contresignee') return
  await appliquer({ ...d, etat: 'bloque', par: `${d.par} · ${q.second?.agent ?? ''}`.replace(/ · $/, ''), objet: d.nom })
})

export const demoAccesActeurs: Pick<DomaineActeurs, 'accesActeur' | 'changerAcces'> = {
  async accesActeur(espace, acteurId, zoneVue = null) {
    exigerPage(PAGE[espace], 'Accès du compte')
    const k = cle(espace, acteurId)
    const s = accesDemo.lire()
    const e = s.acces[k] ?? { etat: 'autorise', depuis: null, par: null, motif: null }
    const d = demandeEnCours(k)
    const zone = espace === 'vendeur' ? ((VENDEURS.find((v) => v.id === acteurId)?.zone ?? zoneVue) as CodeZone | null) : zoneVue
    const v: AccesActeur = {
      espace,
      acteurId,
      ...e,
      demande: d ? { id: d[0], par: d[1].par, le: d[1].le, motif: d[1].motif } : null,
      peutChanger: peut(espace, zone) && !tenuParMoi(espace, acteurId),
      quatreYeux: QUATRE_YEUX[espace],
      historique: s.historique[k] ?? [],
    }
    return repondre(v)
  },
  async changerAcces(d: DemandeAcces): Promise<Resultat<{ etat: 'appliquee' | 'a_contresigner'; id: string }, RaisonAcces>> {
    exigerPage(PAGE[d.espace], 'Accès du compte')
    if (!peut(d.espace, d.zone)) throw new AccesRefuse(d.etat === 'bloque' ? 'Bloquer l’accès d’un compte' : 'Rétablir l’accès d’un compte', (['superviseur', 'support', 'operations'] as Role[]).filter((r) => ['oui', 'zone'].includes(droitDe(PAGE[d.espace], r).acces)))
    if (tenuParMoi(d.espace, d.acteurId)) throw new AccesRefuse('Décider sur un compte que vous tenez (conflit d’intérêts)', [])
    if (!motifValable(d.motif)) return { ok: false, raison: 'motif_court' }
    const k = cle(d.espace, d.acteurId)
    const actuel = accesDemo.lire().acces[k]?.etat ?? 'autorise'
    if (actuel === d.etat) return { ok: false, raison: 'sans_effet' }
    const motif = d.motif.trim()
    if (d.etat === 'bloque' && QUATRE_YEUX[d.espace]) {
      if (demandeEnCours(k)) return { ok: false, raison: 'deja_demande' }
      const id = await demanderSecond({ action: 'blocage.bloquer', objet: `${d.nom} · accès`, resume: `Bloquer l’accès de ${d.nom} (${d.espace}) : plus de connexion à son espace tant que l’accès n’est pas rétabli`, motif, preuves: [], montant: null, quatreYeux: true, rolesSecond: SECOND })
      accesDemo.ecrire((s) => void (s.demandes[id] = { espace: d.espace, acteurId: d.acteurId, nom: d.nom, zone: d.zone, par: nomCourant(), le: maintenant(), motif }))
      return { ok: true, etat: 'a_contresigner', id }
    }
    await journaliser({ action: d.etat === 'bloque' ? 'acces_acteur.bloquer' : 'acces_acteur.retablir', objet: `${d.nom} · ${d.espace}`, motif, zone: d.zone ?? undefined, avant: actuel === 'bloque' ? 'Bloqué' : 'Autorisé', apres: d.etat === 'bloque' ? 'Bloqué' : 'Autorisé' })
    await appliquer({ ...d, motif, par: nomCourant(), objet: d.nom })
    return { ok: true, etat: 'appliquee', id: k }
  },
}

// ── Promotions de la plateforme ────────────────────────────────────────────────────────────────────────────────────
interface Promo {
  id: string
  titre: string
  remise: RemisePromotion
  cible: CiblePromotion
  debut: number
  fin: number
  creeePar: string
  arret: { le: number; par: string; motif: string } | null
  journal: PromotionPlateforme['journal']
}
const promosDemo = magasin<{ n: number; promotions: Promo[] }>('promotions-plateforme', () => ({
  n: 1,
  promotions: [
    {
      id: 'PP-0001',
      titre: 'Rentrée scolaire',
      remise: { genre: 'livraison' },
      cible: { genre: 'categorie', id: 'bebe' },
      debut: T(-42 * 24 * 60),
      fin: T(-28 * 24 * 60),
      creeePar: 'Franck Penga',
      arret: null,
      journal: [{ le: T(-45 * 24 * 60), quoi: 'Programmée', par: 'Franck Penga', motif: 'Livraison offerte sur les fournitures de la rentrée, financée par le budget de croissance.' }],
    },
  ],
}))
const CATEGORIES = () => CONTENU_ACCUEIL.carrousel.map((b) => ({ id: /cat=(\w+)/.exec(b.lien)?.[1] ?? b.titre, titre: b.titre }))
const ZONES = () => PARAMETRES.zonesExploitees.map((z) => ({ id: z.code, titre: `${z.code} ${z.nom}` }))
const VITRINES = () => VENDEURS.filter((v) => v.statut === 'actif').map((v) => ({ id: v.id, titre: v.nom }))
export function libelleCible(c: CiblePromotion): string {
  if (c.genre === 'toutes') return 'Tout le catalogue'
  if (c.genre === 'categorie') return `Catégorie : ${CATEGORIES().find((x) => x.id === c.id)?.titre ?? c.id}`
  if (c.genre === 'zone') return `Zone : ${ZONES().find((x) => x.id === c.id)?.titre ?? c.id}`
  return `Vitrines : ${c.ids.map((i) => VITRINES().find((x) => x.id === i)?.titre ?? i).join(', ')}`
}
export const libelleRemise = (r: RemisePromotion) => (r.genre === 'livraison' ? 'Livraison offerte' : `−${r.pct} %`)
export function etatPromotion(p: { debut: number; fin: number; arret: unknown }, n: number): EtatPromotion {
  if (p.arret) return 'arretee'
  if (n >= p.fin) return 'terminee'
  return n >= p.debut ? 'en_cours' : 'programmee'
}
const vue = (p: Promo, n: number): PromotionPlateforme => ({ ...p, cibleLibelle: libelleCible(p.cible), etat: etatPromotion(p, n) })
const publierPromo = (p: Promo, etat: EtatPromotion, n: number) =>
  publier({ type: 'promotion', id: p.id, etat, titre: p.titre, debut: p.debut, fin: p.fin, cible: libelleCible(p.cible), remise: libelleRemise(p.remise) }, `admin-promotion-${p.id}-${etat}-${etat === 'en_cours' ? p.debut : ''}`, n)
const peutCreer = () => droitDe('promotions', roleCourant()).acces === 'oui'
const peutArreter = () => peutCreer() || roleCourant() === 'support'
function exigerCreer(quoi: string) {
  exigerPage('promotions', 'Promotions')
  if (!peutCreer()) throw new AccesRefuse(quoi, ['superviseur'])
}
function cibleValable(c: CiblePromotion): boolean {
  if (c.genre === 'toutes') return true
  if (c.genre === 'categorie') return CATEGORIES().some((x) => x.id === c.id)
  if (c.genre === 'zone') return ZONES().some((x) => x.id === c.id)
  return c.ids.length > 0 && c.ids.every((i) => VITRINES().some((x) => x.id === i))
}
const remiseValable = (r: RemisePromotion) => r.genre === 'livraison' || (Number.isInteger(r.pct) && r.pct >= 1 && r.pct <= REGLES_S5.generositeLancementPct)

export const demoPromotionsPlateforme: Pick<DomainePilotage, 'promotionsPlateforme' | 'creerPromotion' | 'lancerPromotion' | 'arreterPromotion'> = {
  async promotionsPlateforme() {
    exigerPage('promotions', 'Promotions')
    const n = maintenant()
    const l = promosDemo.lire().promotions
    // Une promotion arrivée à sa fin est annoncée finie (une fois : la clé du pont).
    for (const p of l) if (etatPromotion(p, n) === 'terminee' && p.journal.length > 1) publierPromo(p, 'terminee', n)
    return repondre({
      promotions: [...l].reverse().map((p) => vue(p, n)),
      categories: CATEGORIES(),
      zones: ZONES(),
      vitrines: VITRINES(),
      remiseMaxPct: REGLES_S5.generositeLancementPct,
      peutCreer: peutCreer(),
      peutArreter: peutArreter(),
    })
  },
  async creerPromotion(d: DemandePromotion, motif): Promise<Resultat<{ id: string }, RaisonPromotion>> {
    exigerCreer('Créer une promotion de la plateforme')
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const titre = d.titre.trim()
    if (titre.length < 3 || titre.length > 60) return { ok: false, raison: 'titre' }
    if (!remiseValable(d.remise)) return { ok: false, raison: 'remise' }
    if (!cibleValable(d.cible)) return { ok: false, raison: 'cible' }
    const n = maintenant()
    const debut = d.debut ?? n
    if (debut < n - 60_000 || d.fin <= debut) return { ok: false, raison: 'dates' }
    let p: Promo | null = null
    promosDemo.ecrire((s) => {
      s.n++
      p = { id: `PP-${String(s.n).padStart(4, '0')}`, titre, remise: d.remise, cible: d.cible, debut, fin: d.fin, creeePar: nomCourant(), arret: null, journal: [{ le: n, quoi: d.debut === null ? 'Lancée maintenant' : 'Programmée', par: nomCourant(), motif: motif.trim() }] }
      s.promotions.push(p)
    })
    const x = p as unknown as Promo
    await journaliser({ action: d.debut === null ? 'promotion.lancer' : 'promotion.programmer', objet: `${x.id} · ${titre}`, motif: motif.trim(), apres: `${libelleRemise(x.remise)} · ${libelleCible(x.cible)}` })
    publierPromo(x, etatPromotion(x, n), n)
    return { ok: true, id: x.id }
  },
  async lancerPromotion(id, motif) {
    exigerCreer('Lancer une promotion de la plateforme')
    const p = promosDemo.lire().promotions.find((x) => x.id === id)
    if (!p) return { ok: false, raison: 'inconnu' }
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const n = maintenant()
    if (etatPromotion(p, n) !== 'programmee') return { ok: false, raison: 'etat' }
    const apres = promosDemo.ecrire((s) => {
      const x = s.promotions.find((y) => y.id === id)!
      x.debut = n
      x.journal.push({ le: n, quoi: 'Lancée maintenant', par: nomCourant(), motif: motif.trim() })
    })
    await journaliser({ action: 'promotion.lancer', objet: `${id} · ${p.titre}`, motif: motif.trim() })
    publierPromo(apres.promotions.find((y) => y.id === id)!, 'en_cours', n)
    return { ok: true }
  },
  async arreterPromotion(id, motif) {
    exigerPage('promotions', 'Promotions')
    if (!peutArreter()) throw new AccesRefuse('Arrêter une promotion de la plateforme', ['superviseur', 'support'])
    const p = promosDemo.lire().promotions.find((x) => x.id === id)
    if (!p) return { ok: false, raison: 'inconnu' }
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const n = maintenant()
    const e = etatPromotion(p, n)
    if (e !== 'programmee' && e !== 'en_cours') return { ok: false, raison: 'etat' }
    const apres = promosDemo.ecrire((s) => {
      const x = s.promotions.find((y) => y.id === id)!
      x.arret = { le: n, par: nomCourant(), motif: motif.trim() }
      x.journal.push({ le: n, quoi: e === 'programmee' ? 'Annulée avant son début' : 'Arrêtée', par: nomCourant(), motif: motif.trim() })
    })
    await journaliser({ action: 'promotion.arreter', objet: `${id} · ${p.titre}`, motif: motif.trim(), avant: e === 'en_cours' ? 'En cours' : 'Programmée', apres: 'Arrêtée' })
    publierPromo(apres.promotions.find((y) => y.id === id)!, 'arretee', n)
    return { ok: true }
  },
}

// ── Photos ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Offres de la modération qui sont un produit du catalogue du client (identifiant du site). */
const PRODUIT_CLIENT: Record<string, string> = { 'OF-7794': 'pagne' }
/** Taille d'une image réduite acceptée (1 200 px au plus, JPEG ou WebP, environ 600 Ko). */
const PHOTO_MAX = 820_000
const photosDemo = magasin<{ n: number; photos: Record<string, PhotoConsole> }>('photos-console', () => ({ n: 0, photos: {} }))
const clePhoto = (c: CiblePhoto, id: string) => `${c}:${id}`

function exigerPhoto(c: CiblePhoto) {
  const r = roleCourant()
  if (c === 'banniere' || c === 'moment') {
    exigerPage('contenu-site', 'Contenu du site')
    if (r !== 'superviseur') throw new AccesRefuse('Changer une photo de l’accueil', ['superviseur'])
  } else if (c === 'categorie') {
    exigerPage('contenu-site', 'Contenu du site')
    if (!['oui', 'part'].includes(droitDe('contenu-site', r).acces)) throw new AccesRefuse('Changer la photo d’une catégorie', ['superviseur', 'support'])
  } else if (c === 'produit') {
    exigerPage('moderation', 'Modération')
    if (droitDe('moderation', r).acces !== 'oui') throw new AccesRefuse('Remplacer la photo d’un produit signalé', ['superviseur', 'verification'])
  } else exiger('kyc.decider')
}
function publierPhoto(c: CiblePhoto, id: string, photo: string | null, motif: string, n: number) {
  if (c === 'piece') return // pièce d'un dossier : donnée personnelle, gardée dans la console
  const cible = c === 'produit' ? (PRODUIT_CLIENT[id] ?? id) : id
  const rang = photosDemo.ecrire((s) => void s.n++).n
  publier({ type: 'photo_remplacee', cible: c, id: cible, photo, motif }, `admin-photo-${c}-${id}-${rang}`, n)
}

export const demoPhotos: Pick<DomainePilotage, 'photos' | 'remplacerPhoto' | 'retirerPhoto'> = {
  async photos() {
    const r = roleCourant()
    // La pièce d'un dossier : seulement les rôles qui consultent les pièces d'identité.
    const voit = (c: CiblePhoto) => (c === 'banniere' || c === 'moment' || c === 'categorie' ? droitDe('contenu-site', r).acces !== 'aucun' : c === 'produit' ? droitDe('moderation', r).acces !== 'aucun' : PERMISSIONS['piece.consulter'].roles.includes(r))
    return repondre(Object.values(photosDemo.lire().photos).filter((p) => voit(p.cible)))
  },
  async remplacerPhoto(d, motif): Promise<Resultat<object, RaisonPhoto>> {
    exigerPhoto(d.cible)
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    if (!/^data:image\/(jpeg|webp|png);base64,/.test(d.photo) || d.photo.length > PHOTO_MAX) return { ok: false, raison: 'photo' }
    if (d.cible === 'moment' && !MOMENTS_PAR_DEFAUT.some((m) => m.id === d.id)) return { ok: false, raison: 'inconnu' }
    if ((d.cible === 'banniere' || d.cible === 'categorie') && !CATEGORIES().some((c) => c.id === d.id)) return { ok: false, raison: 'inconnu' }
    const n = maintenant()
    const k = clePhoto(d.cible, d.id)
    const avant = photosDemo.lire().photos[k]
    photosDemo.ecrire((s) => void (s.photos[k] = { cible: d.cible, id: d.id, libelle: d.libelle, photo: d.photo, le: n, par: nomCourant(), motif: motif.trim() }))
    await journaliser({ action: avant ? 'photo.remplacer' : 'photo.ajouter', objet: d.libelle, motif: motif.trim(), avant: avant ? 'Photo de la console' : 'Photo d’origine', apres: 'Nouvelle photo' })
    publierPhoto(d.cible, d.id, d.photo, motif.trim(), n)
    return { ok: true }
  },
  async retirerPhoto(cible, id, motif) {
    exigerPhoto(cible)
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const k = clePhoto(cible, id)
    const p = photosDemo.lire().photos[k]
    if (!p) return { ok: false, raison: 'sans_effet' }
    const n = maintenant()
    photosDemo.ecrire((s) => void delete s.photos[k])
    await journaliser({ action: 'photo.retirer', objet: p.libelle, motif: motif.trim(), avant: 'Photo de la console', apres: 'Photo d’origine' })
    publierPhoto(cible, id, null, motif.trim(), n)
    return { ok: true }
  },
}

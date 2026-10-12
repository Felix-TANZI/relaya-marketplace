// DONNÉES DE DÉMONSTRATION — domaine « preparation » : « C'est prêt », rupture, plus de temps, bon de préparation,
// vérification de la référence. Chaque geste est signé dans le journal de la commande (GEN-09) par le membre connecté.
import type { BonPreparation, ChoixDelai, DomainePreparation, OptionsDelai, Verification } from '../donnees/domaines/preparation'
import { optionsDeDelai } from '../donnees/domaines/preparation'
import { jourDe } from '../calculs/temps'
import { maintenant } from './horloge'
import { ARTICLES, COMMANDES, LIVREUR, MEMBRES } from './jeu-essai'
import { marquerRemplacementPret } from './retours'
import { accessoiresDe, calendrier, essaiDe, etatCommandes, journaliser, referenceDe, vueCommande } from './commandes'
import { demoProduits } from './produits'
import { exigerDroit, roleCourant } from './session'
import { magasin, repondre } from './stockage'

const VERIFS: Verification[] = ['modele', 'etat', 'accessoires', 'boite']
const coches = magasin('preparation', () => ({}) as Record<string, (string | null)[]>) // qui a coché chaque case
const nomDe = () => {
  const m = MEMBRES.find((x) => x.role === roleCourant())!
  return `${m.prenom} ${m.nom}`
}

function bon(ref: string): BonPreparation | null {
  const c = essaiDe(ref)
  if (!c) return null
  const v = vueCommande(c, roleCourant())
  const a = ARTICLES[c.article]
  const faits = coches.lire()[ref] ?? []
  const r = v.ramassage
  return {
    ref,
    colis: c.colis,
    payeeA: c.payeeA,
    payableAuRetrait: c.payableAuRetrait,
    echeance: v.echeance,
    lignes: [{ titre: a.titre, variante: a.variante, etat: a.etat, dessin: a.dessin, reference: referenceDe(a.offreId), quantite: c.quantite, aMettreDeCote: accessoiresDe(a.offreId) }],
    aVerifier: VERIFS.map((cle, i) => ({ cle, fait: !!faits[i], par: faits[i] ?? null })),
    ramassage: r ? { debut: r.debut, fin: r.fin, livreur: LIVREUR.nom, photo: 'person' } : null,
    garde: v.garde,
    liberationJours: v.liberationJours,
    aPreparer: v.echeance !== null,
  }
}

function options(ref: string): OptionsDelai | null {
  const c = essaiDe(ref)
  if (!c) return null
  const v = vueCommande(c, roleCourant())
  const e = etatCommandes.lire()[ref]
  const echeance = v.echeance ?? e.echeance ?? c.payeeA
  const absolue = v.echeanceAbsolue ?? echeance
  return { ref, echeance, absolue, prolongee: e.prolongee, aPreparer: v.echeance !== null, ...optionsDeDelai(echeance, absolue, calendrier()) }
}

export const demoPreparation: DomainePreparation = {
  async cestPret(ref, a) {
    exigerDroit('commandes.preparer', 'préparer')
    const e = etatCommandes.lire()[ref]
    if (!e) return { ok: false, raison: 'introuvable' }
    if (e.etape === 'annulee') return { ok: false, raison: 'annulee' }
    if (e.etape !== 'a_preparer') return { ok: false, raison: 'deja_prete' }
    const preteA = a ?? maintenant()
    etatCommandes.ecrire((x) => {
      x[ref].etape = 'chez_le_livreur'
      x[ref].preteA = preteA
    })
    journaliser(ref, roleCourant(), '« C’est prêt »', a ? { a, detail: 'Envoyé au retour du réseau' } : {})
    // Sous-commande de remplacement : le retour d'origine note le remplacement prêt (VD07-R31).
    const origine = COMMANDES.find((c) => c.ref === ref)?.remplacementDe
    if (origine) marquerRemplacementPret(origine)
    return { ok: true, preteA }
  },
  async signalerRupture(ref, stockAZero) {
    exigerDroit('commandes.preparer', 'préparer')
    const c = essaiDe(ref)
    const e = etatCommandes.lire()[ref]
    if (!c || !e) return { ok: false, raison: 'introuvable' }
    if (e.etape !== 'a_preparer') return { ok: false, raison: 'deja_prete' }
    etatCommandes.ecrire((x) => {
      x[ref].etape = 'annulee'
      x[ref].annulation = { motif: 'rupture', a: maintenant() }
    })
    journaliser(ref, roleCourant(), 'Rupture signalée', { detail: 'Vendeur suivant ou remboursement du client' })
    if (stockAZero) {
      // Le stock de la variante passe à 0 (VD05-R12) : le domaine « produits » l'applique, le journal le prouve.
      const avant = (await demoProduits.detail(c.article))?.stock ?? null
      await demoProduits.changerStock(c.article, 0)
      const a = ARTICLES[c.article]
      journaliser(ref, roleCourant(), 'Stock de l’{p} mis à jour', { detail: `${a.titre} ${a.variante}`, ...(avant !== null ? { avant: String(avant), apres: '0' } : {}) })
    }
    return { ok: true }
  },
  optionsDelai: (ref) => repondre(options(ref)),
  async demanderDelai(ref, choix: ChoixDelai) {
    exigerDroit('commandes.preparer', 'préparer')
    const o = options(ref)
    if (!o) return { ok: false, raison: 'introuvable' }
    if (!o.aPreparer) return { ok: false, raison: 'deja_prete' }
    if (o.prolongee) return { ok: false, raison: 'deja_prolongee' }
    const x = o.options.find((y) => y.choix === choix)!
    if (!x.possible) return { ok: false, raison: 'au_dela_de_24h' }
    etatCommandes.ecrire((e) => {
      e[ref].echeance = x.echeance
      e[ref].prolongee = true
    })
    // Client et livreur prévenus de la nouvelle heure (DEL-02) ; le ramassage suit (P-6).
    journaliser(ref, roleCourant(), 'Plus de temps demandé', { detail: x.effet === 'suivant' ? 'Ramassage au créneau suivant' : 'Client et livreur prévenus', avant: o.echeance, apres: x.echeance })
    return { ok: true, echeance: x.echeance }
  },
  bon: (ref) => repondre(bon(ref)),
  async ouvrirBon(ref) {
    exigerDroit('commandes.preparer', 'préparer')
    const e = etatCommandes.lire()[ref]
    if (!e) return
    const qui = nomDe()
    const jour = jourDe(maintenant())
    if (e.journal.some((j) => j.action === 'Bon de préparation ouvert' && j.auteur === qui && jourDe(j.a) === jour)) return
    journaliser(ref, roleCourant(), 'Bon de préparation ouvert')
  },
  async cocher(ref, i, fait) {
    exigerDroit('commandes.preparer', 'préparer')
    if (!essaiDe(ref) || i < 0 || i >= VERIFS.length) return bon(ref)
    coches.ecrire((x) => {
      x[ref] = x[ref] ?? []
      x[ref][i] = fait ? nomDe() : null
    })
    return bon(ref)
  },
  async verifierReference(ref, lu) {
    exigerDroit('commandes.preparer', 'préparer')
    const c = essaiDe(ref)
    if (!c) return { ok: false, raison: 'introuvable' }
    const attendue = referenceDe(c.article)
    const net = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (net(lu) !== net(attendue)) return { ok: false, raison: 'autre_reference', detail: attendue }
    coches.ecrire((x) => {
      x[ref] = x[ref] ?? []
      x[ref][0] = nomDe()
    })
    journaliser(ref, roleCourant(), 'Référence vérifiée', { detail: attendue })
    return { ok: true, bon: bon(ref)! }
  },
}

// DONNÉES DE DÉMONSTRATION — la Vue d'ensemble en direct (page ajoutée « direct ») et la recherche transversale
// (« recherche »). Tout est lu dans les autres démonstrations (commandes, litiges, files, logistique, argent, acteurs,
// communication, pont) : rien n'est
// inventé ici. Chaque chiffre porte la route (et les filtres) de sa liste ; la source filtre par rôle et par zone ;
// aucun montant pour un rôle sans accès à l'argent ; la santé du système pour la Direction seulement (droits.ts).
import { pageOuverte } from '../config/droits'
import { jourDe } from '../calculs/temps'
import { PARAMETRES } from '../calculs/registre'
import type { DomaineDirect, IndicateurDirect, ResultatRecherche } from '../donnees/domaines/direct'
import { REGLES_S1 } from '../pages/ADM-03/regles'
import { maintenant } from './horloge'
import { auPerimetre, dansPerimetre, exigerPage, roleCourant } from './acces'
import { commandesBrutes, commandesCourtes } from './commandes'
import { fileDuRole } from './files'
import { CLIENTS, ENTREPRISES, LIVREURS, VENDEURS, ZONES, masquerTelephone } from './jeu-essai'
import { acteursDemo } from './acteurs'
import { remboursementsVus } from './argent'
import { communicationDemo } from './communication'
import { etatsLogistique } from './logistique'
import { litigesOuverts } from './litiges'
import { evenementsPour, type Evenement } from './pont'
import type { ActiviteDirecte } from '../donnees/domaines/direct'
import { aTraiterAcces } from './equipe'
import { repondre } from './stockage'
import { demoSysteme } from './systeme'

const R = REGLES_S1
const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export const demoDirect: DomaineDirect = {
  async vue() {
    exigerPage('direct', 'Vue d’ensemble')
    const r = roleCourant()
    const n = maintenant()
    const ouvre = (route: string) => pageOuverte(route, r)
    const cmd = commandesCourtes().filter((c) => dansPerimetre(c.zone))
    const brutes = commandesBrutes().filter((c) => dansPerimetre(c.zone))
    const jour = cmd.filter((c) => jourDe(c.payeeLe) === jourDe(n))
    const retard = cmd.filter((c) => c.enRetard)
    const lg = etatsLogistique()
    const paquets = lg.paquets.filter((p) => dansPerimetre(p.zone))
    const bloques = paquets.filter((p) => p.etat === 'incident')
    const relais = lg.relais.filter((x) => dansPerimetre(x.zone))
    const pleins = relais.filter((x) => x.taux >= R.relaisAlertePct)
    const litiges = litigesOuverts().filter((l) => l.voir(r))
    const file = ouvre('file') ? fileDuRole() : []
    const enRetardFile = file.filter((c) => c.echeance !== null && c.echeance < n)
    const ind: IndicateurDirect[] = []
    const ajouter = (route: string, i: Omit<IndicateurDirect, 'route'>, params?: Record<string, string>) => ouvre(route) && ind.push({ ...i, route, params })
    ajouter('commandes', { id: 'jour', libelle: 'Commandes du jour', valeur: jour.length, unite: 'nombre', sous: `${jour.filter((c) => c.argent === 'bloque').length} payées · ${jour.filter((c) => c.etat === 'validee').length} au retrait · ${jour.filter((c) => c.etat === 'verification').length} en vérification`, ton: 'neutre' }, { filtre: 'jour' })
    ajouter('commandes', { id: 'retard', libelle: 'Livraisons au-delà de {h} h', valeur: retard.length, unite: 'nombre', sous: 'Depuis « C’est prêt », colis pas encore au relais ni chez le client', ton: retard.length ? 'alerte' : 'ok' }, { filtre: 'retard' })
    ajouter('paquets', { id: 'bloques', libelle: 'Colis bloqués', valeur: bloques.reduce((s, p) => s + p.colis, 0), unite: 'nombre', sous: `${bloques.length} paquet(s) en incident`, ton: bloques.length ? 'alerte' : 'ok' }, { etat: 'incident' })
    ajouter('relais', { id: 'garde', libelle: 'Colis en garde dans les relais', valeur: relais.reduce((s, x) => s + x.occupes, 0), unite: 'nombre', sous: `${pleins.length} relais à ${R.relaisAlertePct} % ou plus de leur capacité`, ton: pleins.length ? 'alerte' : 'ok' })
    ajouter('litige', { id: 'litiges', libelle: 'Litiges ouverts', valeur: litiges.length, unite: 'nombre', sous: `${litiges.filter((l) => l.niveau === 2).length} en médiation ou en recours`, ton: litiges.length ? 'neutre' : 'ok' })
    if (r === 'superviseur') {
      const acc = aTraiterAcces()
      ajouter('roles', { id: 'acces', libelle: 'Alertes sur les accès', valeur: acc.alertes.length, unite: 'nombre', sous: `${acc.demandes.length} demande(s) d’accès à valider`, ton: acc.alertes.length || acc.demandes.length ? 'alerte' : 'ok' }, { onglet: 'alertes' })
    }
    ajouter('file', { id: 'files', libelle: 'Cartes en retard', valeur: enRetardFile.length, unite: 'nombre', sous: `sur ${file.length} carte(s) de votre file`, ton: enRetardFile.length ? 'alerte' : 'ok' }, { filtre: 'retard' })
    const incidents = [
      ...bloques.map((p) => ({ id: p.id, quoi: `Incident déclaré · ${p.entreprise ?? '—'} · ${p.livreur ?? '—'}`, zone: p.zone, le: p.heureLimite, route: 'paquets', params: { id: p.id } })),
      ...paquets.filter((p) => p.etat === 'en_retard').map((p) => ({ id: p.id, quoi: `Heure limite dépassée · ${p.entreprise ?? '—'}`, zone: p.zone, le: p.heureLimite, route: 'paquets', params: { id: p.id } })),
      ...evenementsPour('admin')
        .filter((e) => e.type === 'incident')
        .map((e) => ({ id: e.cle, quoi: `Incident signalé par le livreur · ${(e as { note: string }).note}`, zone: null, le: e.le, route: 'paquets', params: undefined })),
    ].filter((x) => ouvre(x.route))
    const sante = ouvre('sante') ? (await demoSysteme.sante()).map((s) => ({ nom: s.nom, etat: s.etat })) : null
    return repondre({
      le: n,
      indicateurs: ind,
      zones: ZONES.filter((z) => dansPerimetre(z.code)).map((z) => ({ code: z.code, nom: z.nom, exploitee: PARAMETRES.zonesExploitees.some((x) => x.code === z.code), commandes: cmd.filter((c) => c.zone === z.code).length, enRetard: retard.filter((c) => c.zone === z.code).length + paquets.filter((p) => p.zone === z.code && p.etat === 'en_retard').length, relaisSatures: pleins.filter((x) => x.zone === z.code).length })),
      relais: ouvre('relais') ? relais.map((x) => ({ nom: x.nom, zone: x.zone, colis: x.occupes, capacite: x.capacite, statut: x.statut })) : [],
      incidents,
      sante,
      escrow: ['superviseur', 'finance', 'audit'].includes(r) ? brutes.filter((c) => ['payee', 'preparation', 'en_route', 'au_relais', 'litige'].includes(c.etat)).reduce((s, c) => s + c.total, 0) : null,
      activite: activite().filter((x) => !x.route || ouvre(x.route)),
    })
  },
  async chercher(q) {
    exigerPage('recherche', 'Rechercher partout')
    const r = roleCourant()
    const ouvre = (route: string) => pageOuverte(route, r)
    const m = normaliser(q)
    const chiffres = q.replace(/\D/g, '')
    if (m.length < 2) return repondre([])
    const a = (...champs: (string | null | undefined)[]) => normaliser(champs.filter(Boolean).join(' ')).includes(m)
    const res: ResultatRecherche[] = []
    if (ouvre('commandes'))
      for (const c of commandesCourtes().filter((x) => dansPerimetre(x.zone))) {
        if (a(c.ref, c.article, c.vendeurs.join(' '), c.relais)) res.push({ genre: 'commande', id: c.ref, titre: `${c.ref} · ${c.article}`, sous: `${c.vendeurs.join(', ')} · ${c.relais ?? 'domicile'} · ${c.zone}`, route: 'commandes', params: { ref: c.ref } })
        else if (c.etiquette && normaliser(c.etiquette).replace(/\s/g, '').includes(m.replace(/\s/g, ''))) res.push({ genre: 'etiquette', id: c.etiquette, titre: `Étiquette ${c.etiquette}`, sous: `liée à ${c.ref} (une seule commande, définitivement)`, route: 'commandes', params: { ref: c.ref } })
        // Téléphone du client : recherche réservée au Support et à la Direction (ADM-04-R06) ; le résultat reste masqué.
        else if ((r === 'support' || r === 'superviseur') && chiffres.length >= 6) {
          const cl = commandesBrutes().find((x) => x.ref === c.ref)
          const tel = CLIENTS.find((y) => y.id === cl?.client)?.telephone ?? ''
          if (tel.includes(chiffres)) res.push({ genre: 'client', id: c.ref, titre: `${c.client} · ${masquerTelephone(tel)}`, sous: `${c.ref} · ${c.article}`, route: 'commandes', params: { ref: c.ref } })
        }
      }
    if (ouvre('paquets')) for (const p of etatsLogistique().paquets.filter((x) => dansPerimetre(x.zone))) if (a(p.id, p.entreprise, p.livreur)) res.push({ genre: 'paquet', id: p.id, titre: p.id, sous: `${p.entreprise ?? 'sans preneur'} · ${p.livreur ?? '—'} · ${p.colis} colis`, route: 'paquets', params: { id: p.id } })
    if (ouvre('litige')) for (const l of litigesOuverts().filter((x) => x.voir(r))) if (a(l.id, l.commande, l.vendeur, l.motif)) res.push({ genre: 'litige', id: l.id, titre: `${l.id} · ${l.motif}`, sous: `${l.commande} · ${l.vendeur}`, route: 'litige', params: { id: l.id } })
    if (ouvre('vendeurs')) for (const v of auPerimetre(VENDEURS)) if (a(v.nom)) res.push({ genre: 'vendeur', id: v.id, titre: v.nom, sous: `Vendeur · ${v.palier} · ${v.zone}`, route: 'vendeurs', params: { id: v.id } })
    if (ouvre('relais')) for (const x of etatsLogistique().relais.filter((y) => dansPerimetre(y.zone))) if (a(x.nom, x.gerant)) res.push({ genre: 'relais', id: x.id, titre: x.nom, sous: `Relais · gérant ${x.gerant} · ${x.zone}`, route: 'relais', params: { id: x.id } })
    if (ouvre('entreprises')) for (const e of ENTREPRISES.filter((x) => x.zones.some(dansPerimetre))) if (a(e.nom)) res.push({ genre: 'entreprise', id: e.id, titre: e.nom, sous: `Entreprise de livraison · ${e.quartier} · palier ${e.palier}`, route: 'entreprises', params: { id: e.id } })
    if (ouvre('livreurs')) for (const l of LIVREURS.filter((x) => x.zones.some(dansPerimetre))) if (a(l.nom, l.entreprise)) res.push({ genre: 'livreur', id: l.id, titre: l.nom, sous: `Livreur · ${l.entreprise}`, route: 'livreurs', params: { id: l.id } })
    if (ouvre('kyc')) for (const k of auPerimetre(acteursDemo.lire().dossiers)) if (a(k.id, k.acteur)) res.push({ genre: 'kyc', id: k.id, titre: `${k.id} · ${k.acteur}`, sous: 'Vérification d’identité', route: 'kyc', params: { id: k.id } })
    if (ouvre('remboursements')) for (const x of remboursementsVus()) if (a(x.id, x.commande)) res.push({ genre: 'remboursement', id: x.id, titre: x.id, sous: `${x.commande} · ${x.motif}`, route: 'remboursements', params: { id: x.id } })
    if (ouvre('support')) for (const t of communicationDemo.lire().tickets) if (a(t.id, t.sujet, t.de)) res.push({ genre: 'ticket', id: t.id, titre: `${t.id} · ${t.sujet}`, sous: t.de, route: 'support', params: { id: t.id } })
    return repondre(res.slice(0, 40))
  },
}

/** Libellé de ce qui vient d'arriver dans un espace (événements du pont), sans donnée personnelle ; null : rien à montrer. */
function libelle(e: Evenement): Omit<ActiviteDirecte, 'cle' | 'le' | 'espace'> | null {
  const c = (x: string) => ({ route: 'commandes', params: { ref: x } })
  switch (e.type) {
    case 'order.paid':
      return { quoi: `Commande ${e.commande} payée · ${e.mode === 'relais' ? 'retrait au relais' : 'à domicile'}`, ...c(e.commande) }
    case 'suborder.ready':
      return { quoi: `« C’est prêt » · ${e.colis} · zone ${e.zone}`, ...c(e.commande) }
    case 'suborder.out_of_stock':
      return { quoi: `Rupture déclarée · ${e.colis}`, ...c(e.commande) }
    case 'package.published':
      return { quoi: `Paquet ${e.paquet} publié · ${e.colis.length} colis`, route: 'paquets', params: { id: e.paquet } }
    case 'package.assigned':
      return { quoi: `Paquet ${e.paquet} affecté par ${e.entreprise}`, route: 'paquets', params: { id: e.paquet } }
    case 'parcel.collected':
      return { quoi: `Colis ramassé chez le vendeur · ${e.colis.join(', ')}`, route: 'paquets', params: { id: e.paquet } }
    case 'parcel.delivered':
      return { quoi: `Colis remis à domicile · ${e.colis.join(', ')}`, route: 'paquets', params: { id: e.paquet } }
    case 'relay.drop.completed':
      return { quoi: `Lot ${e.lot} déposé au relais · ${e.remis.length} colis`, route: 'relais' }
    case 'handover.completed':
      return { quoi: `Colis retiré au relais · ${e.colis}`, route: 'relais' }
    case 'relay.stock.updated':
      return e.sature ? { quoi: `Relais saturé · ${e.occupees} places sur ${e.declarees}`, route: 'relais' } : null
    case 'relay.inventory.missing':
      return { quoi: `Inventaire du relais : ${e.colis.length} colis manquant(s)`, route: 'relais' }
    case 'relay.closure.declared':
      return { quoi: `Fermeture du relais annoncée · du ${e.du} au ${e.au}`, route: 'relais' }
    case 'claim.opened':
      return { quoi: `Litige ouvert par le client · ${e.commande}`, route: 'litige' }
    case 'claim.answered':
      return { quoi: `Réponse du vendeur au litige · ${e.posture === 'conteste' ? 'contesté (arbitrage)' : e.posture === 'accepte' ? 'accepté' : 'arrangement'}`, route: 'litige' }
    case 'account.requested':
      return { quoi: `Activation demandée · ${e.espace} · dossier ${e.dossier}`, route: e.espace === 'vendeur' ? 'kyc' : 'candidatures' }
    case 'report.filed':
      return { quoi: `Signalement ${e.gravite === 'grave' ? 'grave ' : ''}· ${e.espace} · ${e.motif}`, route: e.gravite === 'grave' ? 'fraude' : 'moderation' }
    case 'incident':
      return { quoi: `Incident du livreur · ${e.note}`, route: 'paquets' }
    case 'depart_demande':
      return { quoi: 'Départ demandé par un livreur', route: 'livreurs' }
    case 'kit_conteste':
      return { quoi: 'Retenue de kit contestée par un livreur', route: 'livreurs' }
    default:
      return null
  }
}
function activite(): ActiviteDirecte[] {
  const l: ActiviteDirecte[] = []
  for (const e of evenementsPour('admin')) {
    if (e.app === 'admin') continue
    const x = libelle(e)
    if (x) l.push({ cle: e.cle, le: e.le, espace: e.app, ...x })
  }
  return l.sort((a, b) => b.le - a.le).slice(0, 12)
}


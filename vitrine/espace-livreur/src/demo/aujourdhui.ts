// DONNÉES DE DÉMONSTRATION — domaine « aujourdhui » : la journée se compose à partir des paquets, de la tournée, du kit,
// des pièces et de la certification (mêmes calculs que le serveur : GET /api/courier/today).
import { JOUR, jourDe } from '../calculs/temps'
import type { Alerte, DomaineAujourdhui, Journee, Maintenant, PaquetDuJour } from '../donnees/domaines/aujourdhui'
import { etatAcces } from './acces'
import { maintenant } from './horloge'
import { etatFile } from './horsligne'
import { h } from './jeu-essai'
import { etatJournee } from './journee'
import { kitVu } from './kit'
import { etatPaquets, paquetsVus } from './paquets'
import { etatSession, nombre } from './session'
import { etatTournee } from './tournee'
import { repondre } from './stockage'

export const demoAujourdhui: DomaineAujourdhui = {
  journee() {
    const t = maintenant()
    const s = etatSession.lire()
    const acces = etatAcces.lire()[s.compte]
    const paquets = paquetsVus()
    const tour = etatTournee.lire()
    const ordre = (e: string) => (['en_cours', 'affecte', 'modifie', 'bloque'].includes(e) ? 0 : 1)
    const liste: PaquetDuJour[] = paquets
      .map((p) => ({
        id: p.id,
        type: p.type,
        zone: p.zone,
        arrets: p.arrets.length,
        colis: p.colisTotal,
        heureLimite: p.heureLimite,
        etat: p.etat,
        termineA: etatPaquets.lire()[p.id]?.termineA ?? null,
        destination: p.type === 'domicile' ? 'Remise à domicile' : (p.arrets.find((a) => a.type === 'relais')?.nom ?? p.zone),
      }))
      // Affectés par heure limite croissante, puis terminés du plus récent au plus ancien (LIV-04-R01).
      .sort((a, b) => ordre(a.etat) - ordre(b.etat) || (ordre(a.etat) === 0 ? a.heureLimite - b.heureLimite : (b.termineA ?? 0) - (a.termineA ?? 0)))

    const enCours = paquets.filter((p) => p.etat === 'en_cours').sort((a, b) => a.heureLimite - b.heureLimite)[0]
    const nouveau = paquets.filter((p) => p.etat === 'affecte' || p.etat === 'modifie').sort((a, b) => b.affecteA - a.affecteA)[0]
    const p = enCours ?? nouveau
    let m: Maintenant | null = null
    if (p) {
      const courant = p.arrets.find((a) => (tour && tour.paquetId === p.id ? a.id === tour.enCours : false)) ?? p.arrets.find((a) => !a.fait) ?? null
      m = {
        paquetId: p.id,
        type: p.type,
        ton: enCours ? 'en_cours' : 'nouveau',
        heureLimite: p.heureLimite,
        affecteA: p.affecteA,
        accepteA: p.accepteA,
        arret: courant ? { id: courant.id, rang: courant.ordre, total: p.arrets.length, type: courant.type, nom: courant.nom, quartier: courant.quartier, pretDepuis: courant.pretDepuis } : null,
        colisRamasses: p.colisRamasses,
        colisTotal: p.colisTotal,
        colisSurVous: s.colisSousGarde,
        aRamasser: p.colisTotal - p.colisRamasses,
      }
    }

    // Tuiles : seulement des missions validées par le serveur (LIV-P25R-02).
    const valides = paquets.filter((x) => x.etat !== 'rendu' && x.etat !== 'retire')
    const arretsFaits = valides.flatMap((x) => x.arrets.filter((a) => a.fait))
    const colisRelais = arretsFaits.filter((a) => a.type === 'relais').reduce((n, a) => n + a.colis.length, 0)
    const colisDomicile = arretsFaits.filter((a) => a.type === 'domicile').reduce((n, a) => n + a.colis.length, 0)

    // Alertes calculées le jour même (LIV-04-R06) ; la batterie est lue sur le téléphone (écran).
    const alertes: Alerte[] = []
    const kit = kitVu()
    for (const c of kit.couverture) alertes.push({ id: 'kit-' + c.paquetId, type: 'kit_insuffisant', niveau: 'urgent', paquetId: c.paquetId, manque: c.manque, route: 'kit' })
    for (const f of kit.formats) if (f.etat === 'bas' && f.seuil !== null) alertes.push({ id: 'kit-bas-' + f.format, type: 'kit_bas', niveau: 'attention', format: f.format, stock: f.stock, seuil: f.seuil, route: 'kit' })
    const alerteJ = nombre('PIECE-ALERTE-J')
    // CNI recto et verso : une seule alerte.
    for (const pc of acces.pieces.filter((x) => x.id !== 'cni_verso' && x.expireLe !== null && x.expireLe - t <= alerteJ * JOUR))
      alertes.push({ id: 'piece-' + pc.id, type: 'piece', niveau: pc.expireLe! <= t ? 'urgent' : 'attention', piece: pc.id, expireLe: pc.expireLe!, route: 'activation' })
    if (acces.badge && acces.badge.expireLe - t <= nombre('CERT-ALERTE-J') * JOUR)
      alertes.push({ id: 'certification', type: 'certification', niveau: acces.badge.expireLe <= t ? 'urgent' : 'attention', expireLe: acces.badge.expireLe, route: 'certification' })
    if (acces.etat !== 'en_activation' && acces.modules.some((x) => x.aRevoir)) alertes.push({ id: 'modules', type: 'modules', niveau: 'attention', route: 'certification' })

    const f = etatFile.lire()
    const j: Journee = {
      jour: jourDe(t),
      prenom: acces.prenom,
      entreprise: acces.entreprise.nom,
      compte: { etat: acces.etat, niveau: acces.decision?.niveau ?? null, finLe: acces.decision?.finLe ?? null, plafondColis: acces.decision?.limites?.plafondColis ?? null, domicile: acces.decision?.limites?.domicile ?? true },
      maintenant: m,
      paquets: liste,
      tuiles: {
        paquetsTermines: valides.filter((x) => x.etat === 'termine' || x.etat === 'clos').length,
        paquetsTotal: valides.length,
        colisRemis: colisRelais + colisDomicile,
        colisRelais,
        colisDomicile,
        missionsValidees: arretsFaits.length,
        enRevue: 0,
        gains: null, // Yafé Express affiche le compteur de missions, pas de montant (affichage_gains_livreur)
      },
      colisSousGarde: s.compte === 'serge' ? s.colisSousGarde : 0,
      alertes,
      derniereSynchronisation: f.dernierEnvoi?.a ?? (s.compte === 'serge' ? h(14, 2) : null),
      // Journée close (LIV-P23) : la clôture est faite, preuves envoyées ou encore en file.
      cloturee: etatJournee.lire().etat !== 'ouverte',
      regles: { batterieAlertePourcent: nombre('batterie_alerte'), batterieEconomiePourcent: nombre('batterie_économie') },
    }
    return repondre(j)
  },
}

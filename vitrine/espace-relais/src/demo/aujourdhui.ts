// DONNÉES DE DÉMONSTRATION — domaine « aujourdhui » : l'écran Aujourd'hui, composé comme le ferait GET /relay/today à
// partir du modèle central (vrais comptes), des lots (reception), des départs, des constats, de la file hors ligne, de
// la caisse et du prochain versement (argent, gérant seul), du Trust Score et des avis (qualite).
import { annoncerRenvoisPont } from './departs'
import { PARAMETRES } from '../calculs/registre'
import { JOUR, aHeure, ajouterJours } from '../calculs/temps'
import type { Aujourdhui, DomaineAujourdhui, TacheDuJour } from '../donnees/domaines/aujourdhui'
import type { ColisRelais } from '../donnees/domaines/colis'
import { demoArgent, etatArgent } from './argent'
import { ouvertA } from './calendrier'
import { FILTRES, occupationDuRelais, tousLesColis } from './colis'
import { etatDeparts } from './departs'
import { aujourdhui as jourCourant, maintenant } from './horloge'
import { etatFile } from './horsligne'
import { etatIncidents } from './incidents'
import { COLLECTES } from './jeu-essai'
import { demoQualite, etatQualite, palierDe } from './qualite'
import { etatReception, lots } from './reception'
import { etatRelais } from './relais'
import { remisDuJour } from './retrait'
import { membreActuel } from './session'
import { repondre } from './stockage'

const P = PARAMETRES.relais
/** PR-HEROS-FENETRE-MIN : le héros « livreur en approche » paraît dans cette fenêtre avant l'arrivée estimée. */
const HEROS_FENETRE_MIN = P.herosFenetreMin
const CONFIRMATION_MIN = P.lotConfirmMin
/** PR-AVIS-PERIODE-J (ARL-68) : période de la note moyenne affichée à l'accueil. */
const AVIS_PERIODE_J = P.avisPeriodeJours

const motifsDe = (l: ColisRelais[]) => ({
  renvoi: l.filter((c) => c.etat === 'a_renvoyer' || c.sortie?.motif === 'renvoi').length,
  retour: l.filter((c) => c.etat === 'retour_depose' || c.etat === 'a_faire_partir' || (c.sortie?.motif === 'retour' && c.etat !== 'a_renvoyer')).length,
  transfert: l.filter((c) => c.etat === 'transfert_demande').length,
  refus: l.filter((c) => c.etat === 'refuse_comptoir').length,
})

export const demoAujourdhui: DomaineAujourdhui = {
  async aujourdhui() {
    const t = maintenant()
    const jour = jourCourant()
    const colis = tousLesColis()
    annoncerRenvoisPont(colis)
    const r = etatRelais.lire()
    const o = occupationDuRelais(r.placesDeclarees, colis)
    const membre = membreActuel()
    const gerant = membre?.role === 'proprietaire'
    const argent = gerant ? await demoArgent.argent() : null
    const ouverture = r.statut === 'suspendu' || r.statut === 'clos' ? { ouvert: false, fermeA: null, rouvreLe: null } : ouvertA(t)
    const tousLots = lots()

    // Le prochain lot : le premier pas encore validé ni déposé ; « en approche » à PR-NTF-APPROCHE-MIN minutes.
    const prochain = tousLots.find((x) => !x.valideA && x.suivi !== 'depose') ?? null
    const approche = prochain && prochain.suivi === 'en_route' && prochain.arriveeEstimee !== null && prochain.arriveeEstimee - t <= P.approcheMin * 60_000 ? { ...prochain, suivi: 'en_approche' as const } : prochain
    const enLot = (x: NonNullable<typeof approche>) => ({ lot: x.lot, entreprise: x.entreprise, livreur: x.livreur, arriveeEstimee: x.arriveeEstimee, suivi: x.suivi, colis: x.colis, placesNecessaires: x.placesNecessaires, placesManquantes: x.placesManquantes, aReprendre: x.aReprendre })

    // ── À faire maintenant (ACC-03 : des actions seulement ; ACC-04 : départs, dernier jour, constats, groupages) ──
    const taches: TacheDuJour[] = []
    for (const l of tousLots.filter((x) => x.valideA && !x.confirmeParLivreurA)) taches.push({ type: 'lot_a_confirmer', lot: l.lot, valideA: l.valideA!, alerteSupport: t - l.valideA! >= CONFIRMATION_MIN * 60_000 })
    const bloque = etatReception.lire().bloqueJusqua
    if (bloque && bloque > t) taches.push({ type: 'code_bloque', jusqua: bloque })
    const aPartir = colis.filter(FILTRES.a_faire_partir)
    const dep = etatDeparts.lire()
    for (const c of COLLECTES) {
      if (dep.collectes[c.id]?.termineeA) continue
      const l = aPartir.filter((x) => x.sortie?.collecte === c.id)
      if (l.length) taches.push({ type: 'collecte', collecte: c.id, heure: c.heurePrevue, colis: l.length, motifs: motifsDe(l) })
    }
    const sansCollecte = aPartir.filter((x) => !x.sortie?.collecte)
    if (sansCollecte.length) taches.push({ type: 'a_faire_partir', colis: sansCollecte.length })
    const dernier = colis.filter(FILTRES.dernier_jour)
    if (dernier.length)
      taches.push({ type: 'dernier_jour', clients: new Set(dernier.map((c) => c.groupe)).size, colis: dernier.length, rappelA: aHeure(ajouterJours(jour, -1), P.garde.heureRappel), fermeA: ouverture.fermeA })
    // Constat à compléter : BelivaY a demandé une photo ou une précision dans le fil du dossier (PR-07).
    for (const c of etatIncidents.lire().dossiers.filter((x) => x.demande !== null && x.demande.faiteA === null)) taches.push({ type: 'constat', id: c.id, colis: c.colis, aCompleter: true })
    const groupage = colis.filter(FILTRES.groupage)
    if (groupage.length) taches.push({ type: 'groupage', colis: groupage.length, jusquau: groupage.map((c) => c.groupageJusquau).filter((x): x is string => !!x).sort()[0] ?? null })
    const file = etatFile.lire()
    const expirees = file.actions.filter((a) => a.etat === 'expiree' && a.motif !== 'refaite').length
    if (expirees) taches.push({ type: 'expirees', n: expirees })
    // PR-RC-18 : colis arrivé dont le client n'a pas encore reçu l'avis ; la garde ne court pas, BelivaY relance.
    const nonPrevenus = colis.filter((c) => (c.etat === 'en_stock' || c.etat === 'dernier_jour') && c.arrivee.le !== null && !c.code.envoye && c.paiement.mode === 'paye')
    if (nonPrevenus.length) taches.push({ type: 'non_prevenu', colis: nonPrevenus.length, relanceA: Math.min(...nonPrevenus.map((c) => c.arrivee.le!)) + P.garde.nonVuHeures * 3600_000 })
    if (argent?.dette.aReverser) taches.push({ type: 'dette', montant: argent.dette.montant })

    // ── Semaine (gérant seul, ACC-05, ACC-07) ──
    const v = argent?.prochain ?? null
    const semaine = v
      ? {
          // Chiffres tirés du même relevé que la page Versements : gagné = somme des lignes gagnées, colis remis = lignes
          // « colis » (une par taille), jours de garde = lignes « jour_garde ».
          gains: v.gagne,
          colisRemis: v.lignes.filter((l) => l.type === 'colis').reduce((n, l) => n + l.quantite, 0),
          joursGarde: v.lignes.filter((l) => l.type === 'jour_garde').reduce((n, l) => n + l.quantite, 0),
          versementLe: v.date,
          versement: v.total,
          statut: v.etat,
        }
      : null

    // ── Trust Score et avis ──
    // Le détail du Trust Score et les avis sont au gérant (droit « argent ») ; l'employé voit le score et le palier,
    // comme dans l'en-tête, sans alerte de seuil ni avis.
    const score = etatQualite.lire().score
    const trust = gerant ? await demoQualite.trust() : { score, palier: palierDe(score), alerte: null }
    const avis = gerant ? (await demoQualite.avis()).filter((a) => a.le >= t - AVIS_PERIODE_J * JOUR) : []

    // ── Relais neuf : « Votre premier jour » (VID-02) ──
    const neuf = !colis.some((c) => c.remise)
    const modules = membre ? (r.formation[membre.id] ?? []) : []
    const numero = etatArgent.lire().numero

    const a: Aujourdhui = {
      maintenant: t,
      ouvert: ouverture.ouvert,
      fermeA: ouverture.fermeA,
      rouvreLe: ouverture.rouvreLe,
      prochainLot: approche ? enLot(approche) : null,
      lots: tousLots.map(enLot),
      compteurs: {
        prets: colis.filter(FILTRES.prets).length,
        dernierJour: dernier.length,
        aFairePartir: aPartir.length,
        motifsAFairePartir: motifsDe(aPartir),
        constats: colis.filter(FILTRES.constats).length,
        groupage: groupage.length,
        retraitsFaits: remisDuJour().length,
        placesLibres: o.libres,
        placesDeclarees: o.declarees,
        placesOccupees: o.occupees,
        tauxOccupation: o.taux,
        saturation: o.seuilAtteint,
      },
      taches,
      caisseDuJour: argent ? { total: argent.caisse.total, partRelais: argent.caisse.partRelais, partBelivay: argent.caisse.partBelivay } : null,
      semaine,
      trust: { score: trust.score, palier: trust.palier, alerte: trust.alerte },
      avis: { note: avis.length ? Math.round((avis.reduce((n, x) => n + x.etoiles, 0) / avis.length) * 10) / 10 : null, nombre: avis.length, jours: AVIS_PERIODE_J },
      premierJour: neuf
        ? {
            formation: { faits: modules.filter((m) => m.obligatoire && m.statut === 'termine').length, total: P.formationModules },
            numero: { verifie: numero.statut === 'verifie', masque: gerant ? numero.masque : null },
            premiereRemise: P.gainColis.S,
          }
        : null,
      enAttenteEnvoi: file.actions.filter((x) => x.etat === 'en_attente').length,
      regles: { herosFenetreMin: HEROS_FENETRE_MIN, approcheMin: P.approcheMin, saturationPct: P.capaciteSeuilPct, lotConfirmMin: CONFIRMATION_MIN },
    }
    return repondre(a)
  },
}

// DONNÉES DE DÉMONSTRATION — domaine « incidents » : le « serveur » des constats, des dossiers et des retours.
// - Dossiers du jeu d'essai : CS-2207 / LT-0931 (BLV-00043-1, abîmé, constaté lundi par Paul devant la cliente,
//   déballage photographié ; le vendeur a jusqu'à mercredi 16 h 21 ; BelivaY demande une photo de l'étiquette) ;
//   LT-0902 (signalé par le client : colis remis ouvert, décision qui met le relais en cause, contestable une fois) ;
//   LT-0874 (abîmé, clos ce mois : remplacement accepté, le relais n'est pas mis en cause).
// - L'étape et son échéance se CALCULENT depuis la réception par le serveur (DP-35 : vendeur LIT-VENDEUR-H, décision au
//   plus LIT-DECISION-H après, recours LIT-RECOURS-H) : le dossier avance seul avec l'heure, comme sur le serveur.
// - Retours : RT-0412 et RT-0415 déposés, RT-0418 validé et attendu, RT-0421 NON validé (à refuser, LIT-05).
import { HEURE, JOUR, jourDe } from '../calculs/temps'
import type { Instant } from '../donnees/communs'
import type { ColisPourConstat, DecisionDossier, Dossier, DomaineIncidents, MessageDossier, RetourVu } from '../donnees/domaines/incidents'
import { MOTIFS_COMPTOIR } from '../donnees/domaines/incidents'
import { REGLES } from '../calculs/regles-incidents'
import { appliquer, creerColis, emplacementPour, preuve, tousLesColis, unColis } from './colis'
import { maintenant } from './horloge'
import { CONSTAT, h, oct } from './jeu-essai'
import { sansHistorique } from './scenario'
import { acteurActuel, membreActuel, verifierPin } from './session'
import { pontRetourDepose } from './pont-relais'
import { magasin, repondre } from './stockage'

const R = REGLES

/** Dossier tel que le serveur le garde : l'étape, l'échéance et la fermeture du fil se calculent à la lecture. */
interface DossierGarde extends Omit<Dossier, 'etape' | 'echeance' | 'closA' | 'filFerme' | 'filLisibleJusqua' | 'gardeSuspendue' | 'decision'> {
  vendeurReponduA: Instant | null
  decision: (Omit<DecisionDossier, 'contestableJusqua'> & { retenue: number | null }) | null
}
interface RetourGarde extends Omit<RetourVu, 'emplacement'> {
  emplacement: string | null
}

const msg = (id: string, le: Instant, de: MessageDossier['de'], texte: string, par: string | null = null): MessageDossier => ({ id, le, de, par, texte, photos: [] })

function initial() {
  if (sansHistorique()) return { dossiers: [] as DossierGarde[], retours: [] as RetourGarde[], cles: [] as string[], numero: 931 }
  const recu = CONSTAT.ouvertA + 60_000
  const dossiers: DossierGarde[] = [
    {
      id: CONSTAT.id,
      litige: 'LT-0931',
      colis: CONSTAT.colis,
      origine: 'relais',
      motif: CONSTAT.motif,
      photos: ['ph-cs1', 'ph-cs2'],
      note: CONSTAT.note,
      devantLeClient: true,
      ouvertA: CONSTAT.ouvertA,
      par: { type: 'membre', nom: 'PE', membreId: CONSTAT.par },
      recuServeurA: recu,
      vendeurReponduA: null,
      demande: { texte: 'Pouvez-vous ajouter une photo de l’étiquette du colis ?', le: h(9, 10), photo: true, faiteA: null },
      decision: null,
      fil: [
        msg('m1', recu, 'systeme', 'Constat reçu par BelivaY. Le colis reste chez vous sans frais jusqu’à la décision.'),
        msg('m2', h(9, 10), 'belivay', 'Pouvez-vous ajouter une photo de l’étiquette du colis ?', 'BelivaY'),
      ],
    },
    {
      id: 'CS-2194',
      litige: 'LT-0902',
      colis: 'BLV-00018-1',
      origine: 'client',
      motif: 'colis_ouvert',
      photos: ['ph-lt902-1'],
      note: null,
      devantLeClient: false,
      ouvertA: oct(9, 10, 0),
      par: { type: 'client', nom: null, membreId: null },
      recuServeurA: oct(9, 10, 0),
      vendeurReponduA: oct(10, 9, 30),
      demande: null,
      decision: { le: oct(12, 11, 0), colis: null, texte: 'Colis remis sans photo du colis fermé : la preuve manquante met le relais en cause.', relaisEnCause: true, retenue: 6_500, contestation: null },
      fil: [
        msg('m1', oct(9, 10, 0), 'systeme', 'Le client signale un colis remis ouvert. Votre photo de remise est demandée.'),
        msg('m2', oct(12, 11, 0), 'belivay', 'Décision : la photo de remise manque. Vous pouvez contester une fois.', 'BelivaY'),
      ],
    },
    {
      id: 'CS-2161',
      litige: 'LT-0874',
      colis: 'BLV-00012-1',
      origine: 'relais',
      motif: 'abime',
      photos: ['ph-lt874-1', 'ph-lt874-2'],
      note: null,
      devantLeClient: true,
      ouvertA: oct(1, 15, 2),
      par: { type: 'membre', nom: 'RM', membreId: 'm-rose' },
      recuServeurA: oct(1, 15, 3),
      vendeurReponduA: oct(2, 10, 0),
      demande: null,
      decision: { le: oct(3, 9, 0), colis: 'faire_partir', texte: 'Remplacement accepté par le client ; vous n’êtes pas mis en cause.', relaisEnCause: false, retenue: null, contestation: null },
      fil: [msg('m1', oct(1, 15, 3), 'systeme', 'Constat reçu par BelivaY. Le colis reste chez vous sans frais jusqu’à la décision.'), msg('m2', oct(3, 9, 0), 'belivay', 'Remplacement accepté par le client. Le colis repart vers le vendeur.', 'BelivaY')],
    },
  ]
  const retours: RetourGarde[] = [
    { reference: 'RT-0412', colis: 'BLV-00004-2', classe: 'S', valide: true, motif: 'Taille différente de la commande', destination: 'Tech Bastos', attenduAvant: null, deposeA: oct(12, 16, 5), emplacement: 'A-06' },
    { reference: 'RT-0415', colis: 'BLV-00028-1', classe: 'M', valide: true, motif: 'Produit non conforme à l’annonce', destination: 'Bastos Mode', attenduAvant: null, deposeA: h(10, 40), emplacement: 'C-02' },
    { reference: 'RT-0418', colis: 'BLV-00029-1', classe: 'S', valide: true, motif: 'Article différent de la photo', destination: 'Pharma Beauté', attenduAvant: oct(15, 19, 0), deposeA: null, emplacement: null },
    { reference: 'RT-0421', colis: 'BLV-00026-1', classe: 'M', valide: false, motif: null, destination: null, attenduAvant: null, deposeA: null, emplacement: null },
  ]
  return { dossiers, retours, cles: [] as string[], numero: 931 }
}

export const etatIncidents = magasin('incidents', initial)

/** Retour accepté par le vendeur d'une commande du client (pont : claim.answered) : attendu au comptoir sous 48 h. */
export function attendreRetour(reference: string, colis: string, classe: RetourGarde['classe'], motif: string, destination: string, avant: Instant) {
  etatIncidents.ecrire((e) => void (e.retours.some((x) => x.reference === reference) || e.retours.push({ reference, colis, classe, valide: true, motif, destination, attenduAvant: avant, deposeA: null, emplacement: null })))
}

const proprietaire = () => membreActuel()?.role === 'proprietaire'

/** Le dossier vu du relais à cet instant (étape, échéance, fil, garde, retenue filtrée pour un employé). */
function vu(d: DossierGarde, t: Instant = maintenant()): Dossier {
  let etape: Dossier['etape'] = 'constat'
  let echeance: Instant | null = null
  let closA: Instant | null = null
  if (d.recuServeurA !== null) {
    if (d.decision) {
      const finRecours = d.decision.le + R.recoursH * HEURE
      if (t < finRecours) [etape, echeance] = ['recours', finRecours]
      else [etape, closA] = ['clos', finRecours]
    } else {
      const finVendeur = d.recuServeurA + R.vendeurH * HEURE
      if (t < finVendeur && !d.vendeurReponduA) [etape, echeance] = ['reponse_vendeur', finVendeur]
      else [etape, echeance] = ['mediation', finVendeur + R.decisionH * HEURE]
    }
  }
  const lisible = closA === null ? null : closA + R.conservationJ * JOUR
  const c = unColis(d.colis)
  return {
    ...d,
    etape,
    echeance,
    closA,
    filFerme: etape === 'clos',
    filLisibleJusqua: lisible,
    fil: lisible !== null && t > lisible ? [] : d.fil,
    gardeSuspendue: c?.etat === 'en_constat',
    decision: d.decision ? { ...d.decision, retenue: proprietaire() ? d.decision.retenue : null, contestableJusqua: d.decision.relaisEnCause ? d.decision.le + R.contestationH * HEURE : null } : null,
  }
}

/** Les dossiers vus du relais (lus par la Messagerie : un fil par dossier, qui renvoie au dossier, ARL-95). */
export const dossiersVus = (t: Instant = maintenant()) => etatIncidents.lire().dossiers.map((d) => vu(d, t))

const trouver = (id: string) => etatIncidents.lire().dossiers.find((x) => x.id === id || x.litige === id) ?? null
const retourVu = (r: RetourGarde): RetourVu => ({ ...r, emplacement: r.deposeA ? r.emplacement : r.valide ? emplacementPour(r.classe) : null })
const norme = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '')

export const demoIncidents: DomaineIncidents = {
  dossiers: () => repondre(etatIncidents.lire().dossiers.map((d) => vu(d)).sort((a, b) => b.ouvertA - a.ouvertA)),
  dossier: (id) => repondre(trouver(id) ? vu(trouver(id)!) : null),

  colisPourConstat(reference) {
    const ref = norme(reference)
    const tous = tousLesColis()
    const c = tous.find((x) => x.id === ref) ?? (() => {
      const l = tous.filter((x) => x.groupe === ref && x.etat !== 'parti')
      return l.length === 1 ? l[0] : null
    })()
    if (!c) return repondre(null)
    const enGarde = c.etat === 'en_stock' || c.etat === 'dernier_jour'
    const r: ColisPourConstat = {
      colis: c.id,
      etat: c.etat,
      emplacement: c.emplacement,
      constatable: enGarde,
      raison: enGarde ? null : c.etat === 'remis' ? 'remis' : c.etat === 'en_constat' ? 'en_constat' : c.etat === 'attendu' ? 'pas_arrive' : 'pas_en_garde',
      rangGarde: enGarde ? (c.garde?.rang ?? null) : null,
      remisLe: c.remise?.le ?? null,
      fenetreJusqua: c.remise ? c.remise.le + R.fenetreJ * JOUR : null,
      dossier: c.constat ?? etatIncidents.lire().dossiers.find((d) => d.colis === c.id && !vu(d).filFerme)?.id ?? null,
    }
    return repondre(r)
  },

  async ouvrirConstat(c, o) {
    const id = 'CS-' + o.cle.replace(/-/g, '').slice(0, 6).toUpperCase()
    if (etatIncidents.lire().cles.includes(o.cle)) return { ok: true, id }
    if (!(MOTIFS_COMPTOIR as readonly string[]).includes(c.motif)) return { ok: false, raison: 'motif_requis' }
    if (c.photos.length < R.photosConstat) return { ok: false, raison: 'photo_manquante' }
    const x = unColis(c.colis)
    if (!x) return { ok: false, raison: 'introuvable' }
    if (x.etat !== 'en_stock' && x.etat !== 'dernier_jour') return { ok: false, raison: 'non_constatable' }
    const pin = verifierPin(c.pin)
    if (pin !== 'ok') return { ok: false, raison: pin }
    const par = acteurActuel()
    const t = appliquer(c.colis, 'un_probleme', { photos: c.photos.length, pinOk: true }, o, par, (y) => {
      y.constat = id
      y.suspendu = { du: jourDe(o.heure), au: null } // garde et renvoi suspendus, sans frais (LIT-03)
      preuve(y, c.devantLeClient ? 'deballage' : 'constat', c.photos, par, o.heure)
    }, c.motif)
    if (!t.ok) return { ok: false, raison: t.raison === 'introuvable' || t.raison === 'photo_manquante' ? t.raison : 'transition_interdite' }
    // Hors connexion, la réception par le serveur (départ des délais) est l'heure du rejeu : ici, aussitôt.
    const recu = Math.max(o.heure, maintenant())
    etatIncidents.ecrire((e) => {
      e.cles.push(o.cle)
      e.numero += 1
      e.dossiers.unshift({
        id,
        litige: 'LT-' + String(e.numero).padStart(4, '0'),
        colis: c.colis,
        origine: 'relais',
        motif: c.motif,
        photos: c.photos,
        note: c.note,
        devantLeClient: c.devantLeClient,
        ouvertA: o.heure,
        par,
        recuServeurA: recu,
        vendeurReponduA: null,
        demande: null,
        decision: null,
        fil: [msg('m1', recu, 'systeme', 'Constat reçu par BelivaY. Le colis reste chez vous sans frais jusqu’à la décision.')],
      })
    })
    return { ok: true, id }
  },

  async ajouterPhotos(id, photos, o) {
    const d = trouver(id)
    if (!d) return { ok: false, raison: 'introuvable' }
    if (vu(d).filFerme) return { ok: false, raison: 'clos' }
    if (!photos.length) return { ok: false, raison: 'photo_manquante' }
    if (etatIncidents.lire().cles.includes(o.cle)) return { ok: true }
    const par = acteurActuel()
    etatIncidents.ecrire((e) => {
      e.cles.push(o.cle)
      const y = e.dossiers.find((x) => x.id === d.id)!
      y.photos.push(...photos)
      if (y.demande?.photo && !y.demande.faiteA) y.demande.faiteA = o.heure
      y.fil.push({ id: 'm' + (y.fil.length + 1), le: o.heure, de: 'relais', par: par.nom, texte: 'Photo ajoutée au dossier.', photos })
    })
    return { ok: true }
  },

  async ecrire(id, texte, photos, o) {
    const d = trouver(id)
    if (!d) return { ok: false, raison: 'introuvable' }
    if (vu(d).filFerme) return { ok: false, raison: 'fil_ferme' }
    if (!texte.trim() && !photos.length) return { ok: false, raison: 'vide' }
    const mid = 'm' + (d.fil.length + 1)
    if (etatIncidents.lire().cles.includes(o.cle)) return { ok: true, id: mid }
    const par = acteurActuel()
    etatIncidents.ecrire((e) => {
      e.cles.push(o.cle)
      const y = e.dossiers.find((x) => x.id === d.id)!
      y.fil.push({ id: mid, le: o.heure, de: 'relais', par: par.nom, texte: texte.trim(), photos })
      if (photos.length) {
        y.photos.push(...photos)
        if (y.demande?.photo && !y.demande.faiteA) y.demande.faiteA = o.heure
      }
    })
    return { ok: true, id: mid }
  },

  async contester(id, motif, o) {
    const d = trouver(id)
    if (!d) return { ok: false, raison: 'introuvable' }
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    const v = vu(d, o.heure)
    if (!v.decision?.relaisEnCause) return { ok: false, raison: 'non_contestable' }
    if (v.decision.contestation) return etatIncidents.lire().cles.includes(o.cle) ? { ok: true } : { ok: false, raison: 'deja_contestee' }
    if (o.heure > v.decision.contestableJusqua!) return { ok: false, raison: 'delai_depasse' }
    if (!motif.trim()) return { ok: false, raison: 'vide' }
    const par = acteurActuel()
    etatIncidents.ecrire((e) => {
      e.cles.push(o.cle)
      const y = e.dossiers.find((x) => x.id === d.id)!
      y.decision!.contestation = { le: o.heure, motif: motif.trim(), etat: 'en_examen', reponse: null }
      y.fil.push({ id: 'm' + (y.fil.length + 1), le: o.heure, de: 'relais', par: par.nom, texte: motif.trim(), photos: [] })
    })
    return { ok: true }
  },

  retours: () => repondre(etatIncidents.lire().retours.map(retourVu)),

  verifierRetour(reference) {
    const r = etatIncidents.lire().retours.find((x) => x.reference === norme(reference))
    if (!r) return repondre({ ok: false as const, raison: 'introuvable' as const })
    if (!r.valide) return repondre({ ok: false as const, raison: 'non_valide' as const })
    if (r.deposeA) return repondre({ ok: false as const, raison: 'deja_depose' as const })
    return repondre({ ok: true as const, retour: retourVu(r) })
  },

  async deposerRetour(d, o) {
    const r = etatIncidents.lire().retours.find((x) => x.reference === norme(d.reference))
    if (!r) return { ok: false, raison: 'introuvable' }
    if (!r.valide) return { ok: false, raison: 'non_valide' }
    if (r.deposeA) return etatIncidents.lire().cles.includes(o.cle) ? { ok: true, emplacement: r.emplacement } : { ok: false, raison: 'deja_depose' }
    if (d.scelle !== 'intact') return { ok: false, raison: 'scelle_requis' }
    if (d.photos.length < R.photosRetour) return { ok: false, raison: 'photo_manquante' }
    const pin = verifierPin(d.pin)
    if (pin !== 'ok') return { ok: false, raison: pin }
    const emplacement = emplacementPour(r.classe)
    const par = acteurActuel()
    const t = appliquer(r.colis, 'depot_retour', { photos: d.photos.length, pinOk: true, scelle: d.scelle }, o, par, (_, e) => {
      // Un colis retiré à ce relais et rapporté par son client garde sa fiche (journal) ; sinon il est créé.
      const champs = { emplacement, retour: { reference: r.reference, motif: r.motif ?? '', scelle: d.scelle, destination: r.destination ?? '' }, sortie: { motif: 'retour' as const, destination: r.destination, collecte: null, le: null } }
      const x = e.colis[r.colis] ? Object.assign(e.colis[r.colis], { etat: 'retour_depose' as const }, champs) : creerColis(e, r.colis, r.classe, { etat: 'retour_depose', ...champs })
      x.journal.push({ le: o.heure, action: 'retour_depose', par, signe: true, detail: r.reference, cle: o.cle })
      preuve(x, 'retour', d.photos, par, o.heure)
    }, r.reference)
    if (!t.ok) return { ok: false, raison: t.raison === 'scelle_requis' || t.raison === 'photo_manquante' ? t.raison : 'introuvable' }
    etatIncidents.ecrire((e) => {
      e.cles.push(o.cle)
      Object.assign(e.retours.find((x) => x.reference === r.reference)!, { deposeA: o.heure, emplacement })
    })
    // pont : return.dropped (vendeur : retour en route ; console : dossier)
    pontRetourDepose(r.colis, r.reference, o)
    return { ok: true, emplacement }
  },
}

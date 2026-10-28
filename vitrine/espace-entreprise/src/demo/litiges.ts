// DONNÉES DE DÉMONSTRATION — domaine « litiges » (ENT-P17), selon DP-35 seule (src/calculs/ent07.ts) : trois dossiers
// du début du pilote, un à chaque étape. LT-031 ouvert (réponse préparée par le répartiteur, à envoyer par la
// propriétaire, L-02) ; LT-030 en examen (contesté, décision attendue) ; LT-029 décidé (perte reconnue, transporteur en
// tort : article, livraison remboursée, trajet retour, DED-10), recours encore possible. Le temps fait avancer les
// étapes comme le serveur : échéance passée sans réponse ⇒ examen ; arrangement sans réponse ⇒ examen.
import type { DomaineLitiges, GenreReponse, Litige, RefusLitige } from '../donnees/domaines/litiges'
import type { Resultat } from '../donnees/communs'
import { lireLitigesDp35, retenueTransporteur } from '../calculs/ent07'
import { HEURE, JOUR } from '../calculs/temps'
import { maintenant } from './horloge'
import { ENTREPRISE, UTILISATEURS, livreurCourt } from './jeu-essai'
import { exiger, montantsVisibles, sessionDemo } from './acces'
import { J, LITIGES_ANCIENS, prestations } from './prestations'
import { magasin, repondre } from './stockage'

const P = lireLitigesDp35()
const echeances = (ouvertLe: number) => ({ ouvertLe, repondreAvant: ouvertLe + P.reponseH * HEURE, decisionAvant: ouvertLe + (P.reponseH + P.decisionH) * HEURE })
const R029 = retenueTransporteur(17_840, 900, ENTREPRISE.palier)

// Litiges des semaines passées, tous décidés (trafic normal : une dizaine depuis le début du pilote) ; la prestation de
// chaque mission en cause est dans prestations.ts (LITIGES_ANCIENS). Médiation, recours et retenues comme LT-029.
interface Ancien {
  id: string
  ouvertPar: Litige['ouvertPar']
  motif: string
  description: string
  enTort: Litige['decision'] extends infer D ? (D extends { enTort: infer E } ? E : never) : never
  decision: string
  reponse: 'accepter' | 'contester'
  retenues?: { libelle: string; article?: number; livraison?: number; trajet?: number }
  arrangement?: boolean
}
const ANCIENS: Ancien[] = [
  { id: 'LT-021', ouvertPar: 'client', motif: 'Colis remis en retard', description: 'Le client signale une remise une heure après le créneau annoncé.', enTort: 'aucune', reponse: 'contester', decision: 'Le créneau a été modifié par le vendeur après l’affectation (journal du paquet) : la remise est dans la promesse recalculée.' },
  { id: 'LT-022', ouvertPar: 'vendeur', motif: 'Colis déclaré non ramassé', description: 'Le vendeur déclare que le colis n’a pas été ramassé.', enTort: 'vendeur', reponse: 'contester', decision: 'Photo et scan au ramassage horodatés : le colis a bien été remis au livreur ; la déclaration du vendeur est écartée.' },
  { id: 'LT-023', ouvertPar: 'relais', motif: 'Colis introuvable après la tournée', description: 'Un colis scanné au ramassage n’a jamais été déposé au relais.', enTort: 'entreprise', reponse: 'accepter', decision: 'Le colis était sous la garde de l’entreprise (scan au ramassage, aucun dépôt) : perte reconnue.', retenues: { libelle: 'perte', article: 11_500, livraison: 900 } },
  { id: 'LT-024', ouvertPar: 'client', motif: 'Colis remis abîmé', description: 'Carton enfoncé à la remise, contenu intact au déballage photographié.', enTort: 'aucune', reponse: 'contester', decision: 'Le contenu est intact (photo du client) ; l’emballage d’origine du vendeur était léger. Aucune partie en tort.' },
  { id: 'LT-025', ouvertPar: 'client', motif: 'Article non conforme', description: 'Le client a reçu une autre taille que celle commandée.', enTort: 'vendeur', reponse: 'contester', decision: 'Colis scellé du ramassage à la remise (photos) : l’erreur de taille vient de la préparation du vendeur.' },
  { id: 'LT-026', ouvertPar: 'relais', motif: 'Dépôt hors des heures du relais', description: 'Le gérant signale un dépôt à 18 h 40, après la fermeture annoncée.', enTort: 'entreprise', reponse: 'accepter', decision: 'Dépôt hors des heures du relais : trajet de retour à la charge de l’entreprise.', retenues: { libelle: 'trajet', trajet: 600 } },
  { id: 'LT-027', ouvertPar: 'client', motif: 'Colis déclaré non reçu', description: 'Le client déclare ne pas avoir reçu son colis.', enTort: 'client', reponse: 'contester', decision: 'Code de remise validé au point de remise, photo et position : la remise est prouvée.' },
  { id: 'LT-028', ouvertPar: 'vendeur', motif: 'Retour non rapporté', description: 'Un colis refusé par le client n’est pas revenu à la boutique.', enTort: 'aucune', reponse: 'contester', decision: 'Retour remis à la boutique le lendemain avec preuve ; le délai du retour est tenu.', arrangement: true },
]
function anciens(): Litige[] {
  const ps = prestations(new Set())
  return ANCIENS.map((a) => {
    const n = LITIGES_ANCIENS[a.id].n
    const p = ps.find((x) => x.id === 'PR-' + n)!
    const ouvert = p.jour + 5 * HEURE
    const decide = ouvert + (P.reponseH + 6) * HEURE
    const r = a.retenues?.article ? retenueTransporteur(a.retenues.article, a.retenues.livraison ?? 0, ENTREPRISE.palier) : null
    const ret = !a.retenues
      ? []
      : r
        ? [
            { libelle: 'Valeur de l’article (net payé au vendeur, plafond du palier)', montant: r.article },
            { libelle: 'Livraison remboursée au client', montant: r.livraison },
            { libelle: 'Trajet retour', montant: r.trajet },
          ]
        : [{ libelle: 'Trajet de retour du colis', montant: a.retenues.trajet ?? 0 }]
    const par = a.ouvertPar === 'relais' ? 'Gérant du relais' : p.livreur.nom
    return {
      id: a.id,
      paquetId: p.paquetId,
      missionId: p.missionId,
      commande: 'BLV-0' + (1500 + n),
      livreur: p.livreur,
      ouvertPar: a.ouvertPar,
      etape: 'decide',
      motif: a.motif,
      description: a.description,
      montantEnJeu: ret.reduce((x, y) => x + (y.montant ?? 0), 0) || 9_000 + (n % 7) * 1_500,
      ...echeances(ouvert),
      preuves: [
        { maillon: 'C1', genre: 'photo', libelle: 'Photo au ramassage (vendeur → livreur)', le: p.jour - 40 * 60_000, par: p.livreur.nom },
        { maillon: 'C1', genre: 'qr', libelle: 'Étiquette scannée au ramassage', le: p.jour - 39 * 60_000, par: p.livreur.nom },
        { maillon: 'transport', genre: 'position', libelle: 'Trajet de la mission (positions)', le: p.jour - 10 * 60_000, par: p.livreur.nom },
        { maillon: p.genre === 'relais' ? 'C2' : 'C3', genre: 'photo', libelle: p.genre === 'relais' ? 'Photo au dépôt (livreur → gérant du relais)' : 'Photo de remise (livreur → client)', le: p.jour, par },
      ],
      brouillon: null,
      reponse: { genre: a.reponse, texte: a.reponse === 'accepter' ? 'Nous reconnaissons les faits décrits.' : 'Les preuves de la chaîne montrent que la mission a été faite comme prévu.', piece: a.reponse === 'contester' ? `Déclaration du livreur (${p.livreur.nom})` : null, le: ouvert + 3 * HEURE, par: 'Gaëlle Wankeu' },
      arrangement: a.arrangement ? { reponseAvant: ouvert + 24 * HEURE, statut: 'accepte' } : null,
      complements: [],
      decision: { le: decide, par: 'Médiatrice BelivaY · Clarisse N.', enTort: a.enTort, motif: a.decision, retenues: ret, effetTrust: a.enTort === 'entreprise' ? 'Événement grave (g3) pour l’entreprise et son livreur' : null, definitiveLe: decide + P.recoursH * HEURE },
      recours: null,
      journal: [
        { le: ouvert, quoi: `Litige ouvert par ${a.ouvertPar === 'relais' ? 'le relais' : a.ouvertPar === 'vendeur' ? 'le vendeur' : 'le client'}, preuves de la chaîne jointes`, par: 'BelivaY' },
        { le: ouvert + 3 * HEURE, quoi: `Réponse envoyée : ${a.reponse}`, par: 'Gaëlle Wankeu' },
        { le: decide, quoi: 'Décision motivée', par: 'Médiatrice BelivaY · Clarisse N.' },
      ],
    } satisfies Litige
  })
}

export const litigesDemo = magasin('litiges', () => ({
  litiges: [
    {
      id: 'LT-031',
      paquetId: 'PQ-2355',
      missionId: 'MS-2355',
      commande: 'BLV-02218',
      livreur: livreurCourt('l-junior'),
      ouvertPar: 'relais',
      etape: 'ouvert',
      motif: 'Colis remis abîmé (reçu avec réserve au relais)',
      description: 'Le gérant du relais Mokolo Marché a reçu le colis BV 24 8137 avec réserve : carton enfoncé sur un angle, enceinte fêlée au déballage photographié.',
      montantEnJeu: 12_500,
      ...echeances(J(-1, 17, 5)),
      preuves: [
        { maillon: 'C1', genre: 'photo', libelle: 'Photo au ramassage (vendeur → livreur)', le: J(-1, 15, 58), par: 'Junior T.' },
        { maillon: 'C1', genre: 'qr', libelle: 'Étiquette scannée au ramassage', le: J(-1, 15, 59), par: 'Junior T.' },
        { maillon: 'transport', genre: 'position', libelle: 'Trajet de la mission (positions)', le: J(-1, 16, 20), par: 'Junior T.' },
        { maillon: 'C2', genre: 'photo', libelle: 'Photo au dépôt (livreur → gérant du relais)', le: J(-1, 16, 40), par: 'Junior T.' },
        { maillon: 'C2', genre: 'photo', libelle: 'Photo « reçu avec réserve » du gérant', le: J(-1, 16, 42), par: 'Gérant du relais' },
      ],
      brouillon: {
        genre: 'contester',
        texte: 'Le colis a été photographié intact au ramassage (15 h 58) puis au dépôt (16 h 40) : le carton ne montre aucun choc sur les deux photos. Le livreur déclare un trajet sans incident.',
        piece: 'Déclaration du livreur (Junior T.)',
        le: J(0, 9, 12),
        par: 'Serge Mbarga',
      },
      reponse: null,
      arrangement: null,
      complements: [],
      decision: null,
      recours: null,
      journal: [
        { le: J(-1, 17, 5), quoi: 'Litige ouvert par le relais, preuves de la chaîne jointes', par: 'BelivaY' },
        { le: J(0, 9, 12), quoi: 'Réponse préparée (contester) avec la déclaration du livreur', par: 'Serge Mbarga' },
      ],
    },
    {
      id: 'LT-030',
      paquetId: 'PQ-2361',
      missionId: 'MS-2361',
      commande: 'BLV-02231',
      livreur: livreurCourt('l-brice'),
      ouvertPar: 'client',
      etape: 'examen',
      motif: 'Colis déclaré non reçu à domicile',
      description: 'Le client déclare ne pas avoir reçu son colis alors que la remise est enregistrée à 9 h 30.',
      montantEnJeu: 9_700,
      ...echeances(J(0, 10, 15)),
      preuves: [
        { maillon: 'C1', genre: 'photo', libelle: 'Photo au ramassage (vendeur → livreur)', le: J(0, 8, 41), par: 'Brice N.' },
        { maillon: 'transport', genre: 'position', libelle: 'Position du livreur au point de remise', le: J(0, 9, 27), par: 'Brice N.' },
        { maillon: 'C3', genre: 'code', libelle: 'Code de remise validé (jamais affiché)', le: J(0, 9, 30), par: 'Brice N.' },
        { maillon: 'C3', genre: 'photo', libelle: 'Photo de remise (livreur → client)', le: J(0, 9, 30), par: 'Brice N.' },
        { maillon: 'transport', genre: 'appel', libelle: 'Appel masqué au client, 42 s (sans contenu)', le: J(0, 9, 24), par: 'Brice N.' },
      ],
      brouillon: null,
      reponse: {
        genre: 'contester',
        texte: 'Le code de remise à six chiffres a été validé à 9 h 30 au point de remise, avec la photo de remise et la position du livreur sur place.',
        piece: 'Déclaration du livreur (Brice N.)',
        le: J(0, 11, 20),
        par: 'Gaëlle Wankeu',
      },
      arrangement: null,
      complements: [],
      decision: null,
      recours: null,
      journal: [
        { le: J(0, 10, 15), quoi: 'Litige ouvert par le client, preuves de la chaîne jointes', par: 'BelivaY' },
        { le: J(0, 11, 20), quoi: 'Réponse envoyée : contester', par: 'Gaëlle Wankeu' },
      ],
    },
    {
      id: 'LT-029',
      paquetId: 'PQ-2349',
      missionId: 'MS-2349',
      commande: 'BLV-02204',
      livreur: livreurCourt('l-hugo'),
      ouvertPar: 'relais',
      etape: 'decide',
      motif: 'Colis attendu jamais déposé au relais',
      description: 'Le colis BV 24 8121 (M) a été scanné au ramassage à 14 h 20 ; aucun dépôt au relais Biyem-Assi Carrefour ; introuvable chez le livreur au contrôle.',
      montantEnJeu: R029.article + R029.livraison + R029.trajet,
      ...echeances(J(-1, 15, 30)),
      preuves: [
        { maillon: 'C1', genre: 'photo', libelle: 'Photo au ramassage (vendeur → livreur)', le: J(-1, 14, 18), par: 'Hugo M.' },
        { maillon: 'C1', genre: 'qr', libelle: 'Étiquette scannée au ramassage', le: J(-1, 14, 20), par: 'Hugo M.' },
        { maillon: 'transport', genre: 'position', libelle: 'Dernière position avant le relais', le: J(-1, 14, 52), par: 'Hugo M.' },
        { maillon: 'transport', genre: 'incident', libelle: 'Incident « colis introuvable » déclaré', le: J(-1, 15, 12), par: 'Hugo M.' },
      ],
      brouillon: null,
      reponse: { genre: 'accepter', texte: 'Nous reconnaissons la perte : le colis est introuvable après la tournée.', piece: null, le: J(-1, 16, 5), par: 'Gaëlle Wankeu' },
      arrangement: null,
      complements: [],
      decision: {
        le: J(-1, 17, 40),
        par: 'Médiatrice BelivaY · Clarisse N.',
        enTort: 'entreprise',
        motif: 'Le colis était sous la garde de Yafé Express (photo et scan au ramassage, aucun dépôt) et l’entreprise a reconnu la perte. Le client est remboursé de l’article et de la livraison ; le vendeur est payé normalement.',
        retenues: [
          { libelle: 'Valeur de l’article (net payé au vendeur, plafond du palier)', montant: R029.article },
          { libelle: 'Livraison remboursée au client', montant: R029.livraison },
          { libelle: 'Trajet retour', montant: R029.trajet },
        ],
        effetTrust: 'Événement grave (g3) pour l’entreprise et son livreur',
        definitiveLe: J(-1, 17, 40) + P.recoursH * HEURE,
      },
      recours: null,
      journal: [
        { le: J(-1, 15, 30), quoi: 'Litige ouvert par le relais, preuves de la chaîne jointes', par: 'BelivaY' },
        { le: J(-1, 16, 5), quoi: 'Réponse envoyée : accepter', par: 'Gaëlle Wankeu' },
        { le: J(-1, 17, 40), quoi: 'Décision motivée : transporteur en tort', par: 'Médiatrice BelivaY · Clarisse N.' },
      ],
    },
    ...anciens(),
  ] as Litige[],
}))

/** Étapes que le temps fait avancer (le serveur le fait à l'échéance). */
function avancer(l: Litige, t: number): Litige {
  const x = structuredClone(l)
  if (x.etape === 'ouvert' && t > x.repondreAvant) {
    x.etape = 'examen'
    x.journal.push({ le: x.repondreAvant, quoi: 'Échéance passée sans réponse : BelivaY arbitre sur les preuves', par: 'BelivaY' })
  }
  if (x.arrangement?.statut === 'attente' && t > x.arrangement.reponseAvant) {
    x.arrangement.statut = 'sans_reponse'
    x.journal.push({ le: x.arrangement.reponseAvant, quoi: 'Arrangement sans réponse : le dossier revient en examen', par: 'BelivaY' })
  }
  return x
}

const auteur = () => {
  const u = UTILISATEURS.find((x) => x.id === sessionDemo.lire().utilisateurId)!
  return `${u.prenom} ${u.nom}`
}
const non = (raison: RefusLitige): Promise<Resultat<object, RefusLitige>> => repondre({ ok: false as const, raison })
const oui = (): Promise<Resultat<object, RefusLitige>> => repondre({ ok: true as const })

function texteValide(genre: GenreReponse, texte: string): boolean {
  if (genre === 'arrangement') return texte.trim().length >= P.arrangementMin
  if (genre === 'contester') return texte.trim().length > 0
  return true
}

function trouver(id: string): Litige | null {
  const l = litigesDemo.lire().litiges.find((x) => x.id === id)
  return l ? avancer(l, maintenant()) : null
}
function poser(l: Litige) {
  litigesDemo.ecrire((s) => {
    s.litiges = s.litiges.map((x) => (x.id === l.id ? l : x))
  })
}

export const demoLitiges: DomaineLitiges = {
  async liste(etape) {
    const voir = montantsVisibles()
    const t = maintenant()
    return repondre(
      litigesDemo
        .lire()
        .litiges.map((l) => avancer(l, t))
        .filter((l) => !etape || l.etape === etape)
        .map((l) => ({
          ...l,
          montantEnJeu: voir ? l.montantEnJeu : null,
          decision: l.decision && { ...l.decision, retenues: l.decision.retenues.map((r) => ({ ...r, montant: voir ? r.montant : null })) },
        })),
    )
  },
  async preparer(id, genre, texte, piece) {
    exiger(['proprietaire', 'repartiteur'], 'Préparer la réponse à un litige')
    const l = trouver(id)
    if (!l || l.etape !== 'ouvert') return non('delai')
    if (!texteValide(genre, texte)) return non('texte')
    const t = maintenant()
    l.brouillon = { genre, texte: texte.trim(), piece, le: t, par: auteur() }
    l.journal.push({ le: t, quoi: `Réponse préparée (${genre})`, par: auteur() })
    poser(l)
    return oui()
  },
  async repondre(id, genre, texte, piece) {
    exiger(['proprietaire'], 'Envoyer la réponse à un litige')
    const l = trouver(id)
    if (!l || l.etape !== 'ouvert') return non('delai')
    if (!texteValide(genre, texte)) return non('texte')
    const t = maintenant()
    l.reponse = { genre, texte: texte.trim(), piece, le: t, par: auteur() }
    l.brouillon = null
    l.etape = 'examen'
    if (genre === 'arrangement') l.arrangement = { reponseAvant: t + P.arrangementReponseJ * JOUR, statut: 'attente' }
    l.journal.push({ le: t, quoi: `Réponse envoyée (${genre})`, par: auteur() })
    poser(l)
    return oui()
  },
  async completer(id, texte) {
    exiger(['proprietaire', 'repartiteur'], 'Compléter un dossier de litige')
    const l = trouver(id)
    if (!l || l.etape !== 'examen') return non('etape')
    if (!texte.trim()) return non('element')
    const t = maintenant()
    l.complements.push({ le: t, par: auteur(), texte: texte.trim() })
    l.journal.push({ le: t, quoi: 'Élément nouveau ajouté au dossier', par: auteur() })
    poser(l)
    return oui()
  },
  async recours(id, element) {
    exiger(['proprietaire'], 'Faire un recours')
    const l = trouver(id)
    if (!l || l.etape !== 'decide' || !l.decision) return non('etape')
    if (l.recours) return non('recours_utilise')
    const t = maintenant()
    if (t > l.decision.le + P.recoursH * HEURE) return non('delai')
    if (!element.trim()) return non('element')
    l.recours = { le: t, par: auteur(), element: element.trim(), statut: 'en_cours', examinePar: 'Médiateur senior BelivaY · Paul A.' }
    l.journal.push({ le: t, quoi: 'Recours déposé : examiné par une autre personne', par: auteur() })
    poser(l)
    return oui()
  },
}

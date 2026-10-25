// DONNÉES DE DÉMONSTRATION — domaine « prix » (ENT-P09) et calcul de la rémunération d'un paquet (le « serveur »).
// Grille d'achat de Yafé Express (offre du 25 sept., ENT-02-R27) : chaque prix et chaque plafond est lu dans le
// registre (pages/ENT-05/regles.ts) ; chaque colis est payé au plus au plafond de sa classe (DP-62, A-01, A-02).
// v1 en vigueur depuis le début du pilote ; v2 annoncée avec le préavis du registre (ENT-P09R-02), dont une ligne
// bloquée par la console (au-dessus du plafond, en attente de la décision écrite d'Aureon : ENT-RG-R80).
// Grille lue par le propriétaire et le comptable ; le répartiteur ne voit aucun montant détaillé (ENT-RG-R25).
import type { ClasseColis, Francs } from '../donnees/communs'
import type { CodeLigne, DomainePrix, Grille, LigneGrille, VersionGrille } from '../donnees/domaines/prix'
import type { GenrePaquet, LigneRemuneration } from '../donnees/domaines/paquets'
import { PARAMETRES } from '../calculs/registre'
import { JOUR } from '../calculs/temps'
import { REGLES, plafondRelais, trancheTournee } from '../calculs/livraison/regles-ecrans'
import { REFERENCE, maintenant } from './horloge'
import { ENTREPRISE, UTILISATEURS } from './jeu-essai'
import { exiger, sessionDemo } from './acces'
import { messagesDemo } from './messages'
import { magasin, repondre } from './stockage'
import { parametresDemo } from './parametres'

const R = REGLES
const P = R.plafonds
const relais = (prix: Francs) => [
  { classe: 'S' as ClasseColis, montant: P.S },
  { classe: 'M' as ClasseColis, montant: P.M },
  { classe: 'L' as ClasseColis, montant: P.L },
].map((x) => ({ ...x, prix }))
const controle = (prix: Francs, plafonds: { montant: Francs }[]): LigneGrille['controle'] => (plafonds.some((p) => prix > p.montant) ? 'ecrete' : 'ok')

const V1 = { version: 'v1', depuis: ENTREPRISE.debutPilote }
function lignesV1(): LigneGrille[] {
  const l = (code: CodeLigne, type: LigneGrille['type'], prix: Francs, plafonds: { classe: ClasseColis | null; montant: Francs }[], paquetType = false): LigneGrille => ({
    code,
    type,
    prix,
    plafonds,
    controle: controle(prix, plafonds),
    version: V1.version,
    depuis: V1.depuis,
    paquetType,
  })
  const [t14, t59, t10] = R.tournee
  return [
    l('relais_1_4', 'tournee_relais', t14, relais(t14)),
    l('relais_5_9', 'tournee_relais', t59, relais(t59), true),
    l('relais_10', 'tournee_relais', t10, relais(t10)),
    l('relais_autre_zone', 'supplement', R.horsZone, relais(t14 + R.horsZone).map(({ classe, montant }) => ({ classe, montant }))),
    l('carton_c2', 'supplement', R.c2, [{ classe: 'L', montant: P.L }]),
    l('domicile_zones', 'domicile', R.domicile[0], [{ classe: null, montant: P.domicile }]),
    l('domicile_z1', 'domicile', R.domicile[1], [{ classe: null, montant: P.domicile }]),
    l('collecte', 'collecte', Math.min(t14, P.retour), [{ classe: null, montant: P.retour }]),
    l('retour', 'retour', Math.min(t14, P.retour), [{ classe: null, montant: P.retour }]),
    l('transfert_sm', 'transfert', P.transfert[0], [{ classe: 'S', montant: P.transfert[0] }, { classe: 'M', montant: P.transfert[0] }]),
    l('transfert_l', 'transfert', P.transfert[1], [{ classe: 'L', montant: P.transfert[1] }]),
  ].map((x) =>
    x.code === 'relais_autre_zone' ? { ...x, controle: t14 + R.horsZone > Math.min(P.S, P.M, P.L) ? 'ecrete' : 'ok' } : x.code === 'carton_c2' ? { ...x, controle: t59 + R.c2 > P.L ? 'ecrete' : 'ok' } : x,
  )
}

// Grille v2 annoncée (démonstration) : domicile depuis ou vers Z1 relevé, ligne « relais hors zone 1 à 4 colis »
// demandée au-dessus du plafond : bloquée par la console.
// Annoncée hier (le préavis du registre court à partir de l'annonce).
const annonceV2 = REFERENCE - JOUR
const etatPrix = magasin('prix', () => ({ v2Acceptee: false }))

// Alertes avant échéance (réglage de l'entreprise) : bornes du registre, valeur par défaut = seuil d'alerte de marge
// ramené dans les bornes ; chaque modification entre au journal des paramètres avec son auteur.
const BORNES = {
  acceptation: { min: R.anneauRougeMin, max: R.acceptationMin },
  ramassage: { min: R.anneauRougeMin, max: R.ramassageMin },
}
const dansBornes = (n: number, b: { min: number; max: number }) => Math.min(b.max, Math.max(b.min, n))
const etatAlertes = magasin('prix-alertes', () => ({
  acceptationMin: dansBornes(R.margeAlerteMin, BORNES.acceptation),
  ramassageMin: dansBornes(R.margeAlerteMin, BORNES.ramassage),
  modifieLe: null as number | null,
  par: null as string | null,
}))
function versionV2(): VersionGrille {
  return {
    version: 'v2',
    du: annonceV2 + R.preavisGrilleJ * JOUR,
    au: null,
    statut: 'annoncee',
    acceptee: etatPrix.lire().v2Acceptee,
    changements: [
      { code: 'domicile_z1', avant: R.domicile[1], apres: R.domicile[1] + 50, controle: R.domicile[1] + 50 > P.domicile ? 'au_dessus' : 'ok' },
      { code: 'relais_autre_zone', avant: R.horsZone, apres: R.tournee[0] + R.horsZone, controle: R.tournee[0] + R.horsZone > P.S ? 'au_dessus' : 'ok' },
    ],
  }
}

/** Paquet type (RG-R84) : tournée relais de l'objectif du registre, colis S, tranche correspondante. */
function paquetType(): Grille['paquetType'] {
  const nb = PARAMETRES.pilote.objectifTournee
  const u = Math.min(trancheTournee(nb), P.S)
  return { colis: nb, classe: 'S', lignes: [{ code: nb >= 10 ? 'relais_10' : nb >= 5 ? 'relais_5_9' : 'relais_1_4', quantite: nb, montant: nb * u }], total: nb * u }
}

/**
 * Rémunération d'un paquet (ENT-02-R18, ENT-02-R27) : somme des lignes de la grille en vigueur, chaque colis écrêté au
 * plafond de sa classe. Tournée relais : tarif de la tranche + supplément si la tournée commence hors de la zone du
 * relais (ENT-02-R21) ; domicile : une course (Z1 au départ ou à l'arrivée : second tarif) ; collecte et retour :
 * tarif de la tranche écrêté au plafond du retour.
 */
export function remunerer(genre: GenrePaquet, classes: ClasseColis[], o: { horsZone?: boolean; z1?: boolean } = {}): LigneRemuneration[] {
  const groupes = new Map<string, LigneRemuneration>()
  const ajouter = (code: CodeLigne, classe: ClasseColis | null, unitaire: Francs, paye: Francs) => {
    const k = code + classe
    const g = groupes.get(k) ?? { code, classe, quantite: 0, unitaire, montant: 0, ecrete: paye < unitaire }
    g.quantite += 1
    g.montant += paye
    groupes.set(k, g)
  }
  if (genre === 'domicile') {
    const prix = R.domicile[o.z1 ? 1 : 0]
    ajouter(o.z1 ? 'domicile_z1' : 'domicile_zones', null, prix, Math.min(prix, P.domicile))
  } else if (genre === 'retour' || genre === 'collecte') {
    const t = trancheTournee(classes.length)
    for (const c of classes) ajouter(genre, c, t, Math.min(t, P.retour))
  } else {
    const t = trancheTournee(classes.length) + (o.horsZone ? R.horsZone : 0)
    const code: CodeLigne = o.horsZone ? 'relais_autre_zone' : classes.length >= 10 ? 'relais_10' : classes.length >= 5 ? 'relais_5_9' : 'relais_1_4'
    for (const c of classes) ajouter(code, c, t, Math.min(t, plafondRelais(c) ?? t))
  }
  return [...groupes.values()]
}

export const demoPrix: DomainePrix = {
  async grille() {
    exiger(['proprietaire', 'comptable'], 'Grille de prix')
    const v2 = versionV2()
    return repondre({
      version: V1.version,
      enVigueurDepuis: V1.depuis,
      lignes: lignesV1(),
      prochaine: v2,
      versions: [{ version: V1.version, du: V1.depuis, au: v2.du, statut: 'en_vigueur' as const, acceptee: true, changements: [] }, v2],
      paquetType: paquetType(),
    })
  },
  async delais() {
    return repondre({
      acceptationMin: R.acceptationMin,
      prioriteMin: R.prioriteMin,
      ramassageMin: R.ramassageMin,
      livraisonH: R.livraisonH,
      depotAvantFermetureMin: R.depotAvantFermetureMin,
      incidentMin: R.incidentMin,
      heuresService: R.heuresService,
      tourneesJour: R.tourneesJour,
      seuilDepart: R.seuilDepart,
    })
  },
  async supplements() {
    exiger(['proprietaire', 'comptable'], 'Grille de prix')
    return repondre([
      { code: 'client_absent' as const, montant: R.clientAbsent, pourcentage: null, base: 'course' as const },
      { code: 'refus_conforme' as const, montant: R.refusConforme, pourcentage: null, base: 'course' as const },
      { code: 'deplacement' as const, montant: R.deplacement, pourcentage: null, base: 'forfait' as const },
      { code: 'carton_c2' as const, montant: R.c2, pourcentage: null, base: 'colis' as const },
      { code: 'autre_zone' as const, montant: R.horsZone, pourcentage: null, base: 'colis' as const },
      { code: 'minoration' as const, montant: null, pourcentage: R.minorationPct, base: 'prestation' as const },
    ])
  },
  async paliers() {
    const p = PARAMETRES.paliers
    return repondre({
      actuel: ENTREPRISE.palier,
      plafonds: [
        { palier: 'Nouveau' as const, plafond: p.plafonds.Nouveau, seuil: null },
        { palier: 'Confirme' as const, plafond: p.plafonds.Confirme, seuil: p.seuils.Confirme },
        { palier: 'Or' as const, plafond: p.plafonds.Or, seuil: p.seuils.Or },
      ],
    })
  },
  async demanderRevision(texte) {
    exiger(['proprietaire', 'comptable'], 'Demander une révision de la grille')
    if (texte.trim().length < PARAMETRES.saisies.revisionTexteMin) return repondre({ ok: false as const, raison: 'texte' as const })
    const u = UTILISATEURS.find((x) => x.id === sessionDemo.lire().utilisateurId)!
    const id = 'FI-GR-' + Math.random().toString(36).slice(2, 7)
    messagesDemo.ecrire((s) => void s.fils.unshift({ id, groupe: 'belivay', titre: 'Révision de grille', dossier: null, dernier: `${u.prenom} : ${texte.trim()}`, le: maintenant(), nonLus: 0, ferme: false, messages: [] }))
    return repondre({ ok: true as const, filId: id })
  },
  async alertesDelais() {
    return repondre({ ...etatAlertes.lire(), bornes: BORNES })
  },
  async reglerAlertesDelais(p) {
    exiger(['proprietaire', 'repartiteur'], 'Régler les alertes de délai')
    const ok = (n: number, b: { min: number; max: number }) => Number.isInteger(n) && n >= b.min && n <= b.max
    if (!ok(p.acceptationMin, BORNES.acceptation) || !ok(p.ramassageMin, BORNES.ramassage)) return repondre({ ok: false as const, raison: 'bornes' as const })
    const u = UTILISATEURS.find((x) => x.id === sessionDemo.lire().utilisateurId)!
    const par = `${u.prenom} ${u.nom}`
    const t = maintenant()
    etatAlertes.ecrire((s) => void Object.assign(s, { acceptationMin: p.acceptationMin, ramassageMin: p.ramassageMin, modifieLe: t, par }))
    parametresDemo.ecrire((s) => void s.journal.unshift({ le: t, par, quoi: `Alertes avant échéance : acceptation ${p.acceptationMin} min, ramassage ${p.ramassageMin} min` }))
    return repondre({ ok: true as const })
  },
}

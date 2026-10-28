// Lecture des paramètres du registre pour l'espace point relais (moteurs/belivay_moteurs/registre.py ; CCH-15 : aucune
// valeur dans le code). Source unique : logique-metier/parametres-en-vigueur.json, importé à la construction. Chaque valeur
// est lue avec une forme attendue précise : si la forme change, la lecture s'arrête (ParametreIllisible) au lieu de
// deviner. En production, les mêmes codes viendront de la configuration versionnée du serveur (GET /config).
//
// AJOUTER UN PARAMÈTRE (un écran ou un calcul a besoin d'un seuil, d'un délai, d'un montant) :
// 1. chercher d'abord un code qui dit déjà la même chose (parametres-en-vigueur.json) : un seul code par notion ;
// 2. sinon, une ligne dans NOUVEAUX de logique-metier/relais/outils/construire.py (sens, valeur, unité, source ARL) ;
//    un code du paquet qui double un autre code : une ligne dans ALIAS du même fichier (alias_de) ;
// 3. python3 logique-metier/relais/outils/construire.py puis uv run --python 3.12 python logique-metier/outils/revue.py
//    (le code entre au registre officiel par relais/propositions-relais.json, statut « Proposé ») ;
// 4. recopier le registre dans backend-kit/apps/client_core/donnees/parametres-en-vigueur.json ;
// 5. le lire ici (ou dans parametres-moteurs.ts) avec sa forme exacte et le tester. Jamais de repli local.
import officiel from '../../../logique-metier/parametres-en-vigueur.json' with { type: 'json' }
import type { ClasseColis } from '../donnees/communs'
import { ParametreAbsent, ParametreIllisible } from './erreurs'

export type Registre = Record<string, string>

/** Code → valeur, telle qu'écrite dans le registre. */
export function chargerRegistre(d: { parametres: { code: string; valeur: string }[] } = officiel): Registre {
  return Object.fromEntries(d.parametres.map((p) => [p.code, p.valeur]))
}
/** Registre complété par d'autres paramètres (essais, configuration du serveur) : le registre donné l'emporte. Plus
 * aucun repli local : tous les codes lus par l'appli sont au registre officiel. */
export function completer(r: Registre, provisoires: { parametres: { code: string; valeur: string }[] } = { parametres: [] }): Registre {
  return { ...chargerRegistre(provisoires), ...r }
}
export const REGISTRE: Registre = chargerRegistre()

function valeur(r: Registre, code: string): string {
  if (!(code in r)) throw new ParametreAbsent(code)
  return r[code].trim()
}
/** Lit un paramètre selon une forme exacte (expression régulière entière) ; sinon ParametreIllisible. */
export function lire(r: Registre, code: string, motif: string): RegExpExecArray {
  const v = valeur(r, code)
  const m = new RegExp('^(?:' + motif + ')$').exec(v)
  if (!m) throw new ParametreIllisible(`${code} : « ${v} » ne suit pas la forme attendue`)
  return m
}

/** Nombre écrit avec ou sans séparateur de milliers (« 1 000 », « 15 000 », « 300 »), comme registre.py (_NOMBRE). */
export const NOMBRE = '(\\d{1,3}(?:[\\s\\u00a0\\u202f]\\d{3})*|\\d+)'
export const entier = (texte: string) => Number(texte.replace(/[\s  ]/g, ''))
const ecrireMilliers = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const un = (r: Registre, code: string, motif = NOMBRE) => entier(lire(r, code, motif)[1])
/** Paramètre du paquet relais (PR-…) : un entier en tête, suivi éventuellement de sa précision écrite (« 3 au plus, sur
 * tous les plans », « 2 (le colis, puis le problème) », « 90 % ») ; la précision ne change pas la valeur. */
const pr = (r: Registre, code: string) => entier(lire(r, code, NOMBRE + '(?:\\s*\\S.*)?')[1])

// ── Garde (portage de lire_garde, registre.py) ─────────────────────────────────────────────────────────────────
export interface ParametresGarde {
  /** GARDE-GRILLE : tarif des jours 1 à 7 (DP-08). */
  grille: readonly number[]
  /** GARDE-GROS-AJOUT : ajouté chaque jour dès le jour 1, cartons C1 et C2 (DP-08). */
  ajoutGros: number
  /** GARDE-RENVOI : retenue en plus de la garde au renvoi au vendeur (v6 : 0 F). */
  renvoi: number
  /** RELAIS-GAIN-GARDE : part du relais par jour facturé. */
  gainRelaisJour: number
  /** RELAIS-GAIN-GARDE-GROS : part du relais par jour facturé, gros colis. */
  gainRelaisJourGros: number
  /** GARDE-RAPPEL-H, en minutes depuis minuit (18 h 00 → 1080). */
  heureRappel: number
  /** GARDE-NONVU-H : relance par le canal de repli sans accusé fort. */
  nonVuHeures: number
  /** SMS-ECO : sous ce montant de panier, S1 et S2 partent en push. */
  seuilSmsEco: number
  /** MSG-DISSOC : retard d'un colis sur les autres avant de dissocier le groupe (DP-32). */
  dissociationHeures: number
  /** GARDE-J1-BELIVAY : le relais touche le 1er jour, payé par BelivaY (v6, désactivable). */
  j1PayeParBelivay: boolean
}

export function lireGarde(r: Registre): ParametresGarde {
  const grille = lire(r, 'GARDE-GRILLE', '\\d+(?:, \\d+){6}')[0].split(', ').map(Number)
  // La grille lisible par le serveur doit dire la même chose que les paramètres écrits jour par jour.
  const attendu: Record<string, string | null> = {
    'GARDE-J1': grille[0] === 0 ? `gratuit (${grille[0]} F)` : null,
    'GARDE-J2-3': grille[1] === grille[2] ? `${grille[1]} F par jour (jours 2 et 3)` : null,
    'GARDE-J4-5': `${grille[3]} F le jour 4, ${grille[4]} F le jour 5`,
    'GARDE-J6-7': `${grille[5]} F le jour 6, ${ecrireMilliers(grille[6])} F le jour 7`,
  }
  for (const [code, texte] of Object.entries(attendu))
    if (texte === null || valeur(r, code) !== texte) throw new ParametreIllisible(`${code} : « ${valeur(r, code)} » ne correspond pas à GARDE-GRILLE ${grille.join(', ')}`)
  if (valeur(r, 'GARDE-FERME') !== 'jamais facturé') throw new ParametreIllisible('GARDE-FERME : seul « jamais facturé » est pris en charge')
  if (valeur(r, 'GARDE-PRORATA') !== 'jour entier') throw new ParametreIllisible('GARDE-PRORATA : seul « jour entier » est pris en charge (DP-29)')
  const rappel = lire(r, 'GARDE-RAPPEL-H', '(\\d{1,2}) h (\\d{2})')
  const gainJour = un(r, 'RELAIS-GAIN-GARDE', NOMBRE + ' F par jour facturé')
  const j1 = lire(r, 'GARDE-J1-BELIVAY', '(activé|désactivé) : BelivaY paie au relais les ' + NOMBRE + ' F du 1er jour \\(règle de lancement, désactivable\\)')
  if (entier(j1[2]) !== gainJour) throw new ParametreIllisible('GARDE-J1-BELIVAY : le 1er jour vaut le gain du relais par jour (RELAIS-GAIN-GARDE)')
  return {
    grille,
    ajoutGros: un(r, 'GARDE-GROS-AJOUT', '(\\d+)'),
    renvoi: un(r, 'GARDE-RENVOI', NOMBRE + ' F'),
    gainRelaisJour: gainJour,
    gainRelaisJourGros: un(r, 'RELAIS-GAIN-GARDE-GROS', NOMBRE + ' F par jour facturé \\(cartons C1 et C2\\)'),
    heureRappel: Number(rappel[1]) * 60 + Number(rappel[2]),
    nonVuHeures: un(r, 'GARDE-NONVU-H', '(\\d+) h après l’arrivée'),
    seuilSmsEco: un(r, 'SMS-ECO', NOMBRE + ' F de panier'),
    dissociationHeures: un(r, 'MSG-DISSOC', "(\\d+) h de retard d'un colis sur les autres colis du groupe"),
    j1PayeParBelivay: j1[1] === 'activé',
  }
}

// ── Point relais ───────────────────────────────────────────────────────────────────────────────────────────────
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export interface ParametresRelais {
  garde: ParametresGarde
  /** GARDE-ESPECES : la garde se paie en espèces au gérant, au retrait ; remise bloquée sans encaissement confirmé. */
  gardeEnEspeces: boolean
  /** GARDE-COMPTOIR : commande à payer au comptoir non retirée après les 7 jours : comptée comme un refus. */
  comptoirNonRetireCommeRefus: boolean
  /** RELAIS-GAIN-COLIS : part du relais par colis remis ou retour déposé (petit, moyen, encombrant). */
  gainColis: Record<ClasseColis, number>
  /** RELAIS-PLACES : places occupées par classe. */
  places: Record<ClasseColis, number>
  /** CODE-LONGUEUR, CODE-ESSAIS, CODE-BLOCAGE-H, CODE-RENVOI : code de dépôt et code de retrait (DP-26). */
  code: { longueur: number; essais: number; blocageHeures: number; renvoisPar24h: number }
  /** CODE-PORTEUR : au-delà de cette valeur, porteur nommé et pièce vérifiée. */
  porteurPieceDes: number
  /** PAY-CPT-NOUV, -STD, -FID, -REFUS : paiement Mobile Money au comptoir. */
  comptoir: { plafonds: { nouveau: number; standard: number; fidele: number }; refusAvantAvance: number }
  /** TRANSFERT-RELAIS : transfert d'un colis arrivé vers un autre relais, payé par le client. */
  transfert: Record<ClasseColis, number>
  /** VD-VER-JOUR, VD-VER-ARRETE, VD-VER-ESSAIS, VD-NUM-REVUE : versement du vendredi (mêmes règles que le vendeur). */
  versement: { jourSemaine: number; avantHeure: number; arreteJourSemaine: number; arreteMinutes: number; essais: number; intervalleH: number; revueNumeroJours: number }
  /** AVIS-FENETRE : le client peut noter le relais pendant ces jours après le retrait. */
  avisFenetreJours: number
  /** LIT-CONSTAT-H : réponse de BelivaY à un constat du relais (heures ouvrées). */
  constatReponseH: number
  /** RELAIS-FERME-TRANSFERT-H : relais fermé plusieurs jours, transfert automatique après ce délai sans réponse. */
  fermeTransfertH: number
  /** PHOTO-MAX-KO : poids maximal d'une photo envoyée (photos compressées, OFF-04). */
  photoMaxKo: number
  // ── Codes PR-… du paquet relais et des arbitrages ARL (registre officiel, statut « Proposé ») ──
  capaciteSeuilPct: number // PR-SATURATION
  equipeMax: number // PR-EQUIPE-MAX
  formationModules: number // PR-FORMATION-MODULES
  finPreavisJours: number // PR-FIN-PREAVIS-J (ARL-26)
  finSansColisJours: number // PR-FIN-SANS-COLIS-J (ARL-26)
  preuvesConservationJours: number // PR-PREUVES-CONSERV-J
  constatPhotosMin: number // PR-CONSTAT-PHOTOS-MIN
  retourPhotos: number // PR-RETOUR-PHOTOS-MIN
  fileExpirationH: number // PR-OFF-EXPIRATION-H (OFF-05)
  papierSaisieH: number // PR-PAPIER-SAISIE-H
  approcheMin: number // PR-NTF-APPROCHE-MIN
  heuresCalmes: { de: number; a: number } // PR-NTF-CALME, heures
  documentAlerteJours: number // PR-DOC-EXPIRE-J
  alerteSeuilPoints: number // PR-TRUST-ALERTE (ARL-15)
  horsLigneRemisesParJour: number // PR-HL-REMISES (ARL-03)
  dette: { max: number; semaines: number } // PR-DETTE-MAX, PR-DETTE-SEMAINES (ARL-05)
  paliers: { confirme: number; premium: number } // PR-PAL-CONFIRME, PR-PAL-PREMIUM
  // ── Codes lus par les écrans (vague d'intégration : plus aucune lecture directe du registre hors de calculs/) ──
  herosFenetreMin: number // PR-HEROS-FENETRE-MIN : le prochain lot devient le héros de l'accueil ce délai avant
  lotConfirmMin: number // PR-LOT-CONFIRM-MIN : confirmation du dépôt par le livreur
  departAlerteH: number // PR-DEP-ALERTE-H : départ en retard signalé
  groupageLiberationJ: number // PR-GROUPAGE-LIBERATION-J
  grillePreavisJours: number // PR-GRILLE-PREAVIS-J : changement de grille annoncé ce délai avant
  paiementComptoirDelaiMin: number // PR-PAY-COMPTOIR-DELAI-MIN : attente de la confirmation Mobile Money au comptoir
  retourFenetreJours: number // RET-FENETRE : le client signale un problème pendant ces jours après le retrait
  viceCacheJours: number // RET-VICE : vice caché couvert ces jours après le retrait (DP-27)
  avisPeriodeJours: number // PR-AVIS-PERIODE-J (ARL-68) : note moyenne des avis à l'accueil
  fermetureMasqueJours: number // PR-FER-MASQUE-J (ARL-93) : au-delà, relais masqué du choix des clients
  formationQuizPct: number // PR-FORMATION-QUIZ-PCT (ARL-125)
  donneesDelaiJours: number // PR-DONNEES-DELAI-J (ARL-127)
  visitePratiqueHeures: number // PR-VISITE-PRATIQUE-H (ARL-44) : séance pratique de la visite d'activation
  contestationFenetreJours: number // PR-CONTESTATION-FENETRE-J (ARL-115) : contester un événement du Trust Score
  contestationHeures: number // PR-CONTESTATION-H : réponse à une contestation, heures ouvrées, une par décision
  /** PR-NTF-RESUME-H (NTF-01) : heure du résumé du matin par défaut et heure au plus tôt, « HH:MM » (ARL-100 : réglée
   * par chaque membre dans ses notifications, seule source). */
  resumeMatin: { defaut: string; min: string }
}

const parClasse = (r: Registre, code: string, motif: string): Record<ClasseColis, number> => {
  const m = lire(r, code, motif)
  return { S: entier(m[1]), M: entier(m[2]), L: entier(m[3]) }
}

export function lireRelais(r: Registre): ParametresRelais {
  const essais = lire(r, 'CODE-ESSAIS', '(\\d+) ⇒ blocage (\\d+) h')
  const blocage = un(r, 'CODE-BLOCAGE-H', '(\\d+)')
  if (Number(essais[2]) !== blocage) throw new ParametreIllisible('CODE-ESSAIS et CODE-BLOCAGE-H ne disent pas le même blocage')
  const longueur = un(r, 'CODE-LONGUEUR', '(\\d+)')
  if (un(r, 'CODE-LONG', '(\\d+) chiffres \\+ QR') !== longueur) throw new ParametreIllisible('CODE-LONG et CODE-LONGUEUR ne disent pas la même longueur')
  const transfert = lire(r, 'TRANSFERT-RELAIS', NOMBRE + ' F par colis S ou M, ' + NOMBRE + ' F par colis L')
  const verJour = lire(r, 'VD-VER-JOUR', '(\\S+), avant (\\d+) h, sans frais ni minimum')
  const arrete = lire(r, 'VD-VER-ARRETE', '(\\S+) (\\d+) h (\\d{2})')
  const verEssais = lire(r, 'VD-VER-ESSAIS', '(\\d+) essais à (\\d+) h d’intervalle, puis versements suspendus')
  const jour = (nom: string, code: string) => {
    const i = JOURS.indexOf(nom)
    if (i < 0) throw new ParametreIllisible(`${code} : jour « ${nom} » inconnu`)
    return i
  }
  const calmes = lire(r, 'PR-NTF-CALME', "(\\d{1,2}) h – (\\d{1,2}) h(?:, sauf l[’']urgent)?")
  if (valeur(r, 'GARDE-COMPTOIR') !== 'commande à payer au comptoir non retirée après 7 jours : comptée comme un refus') throw new ParametreIllisible('GARDE-COMPTOIR : forme attendue « … après 7 jours : comptée comme un refus »')
  return {
    garde: lireGarde(r),
    gardeEnEspeces: /^payée en espèces au gérant, en une fois, au retrait ; remise bloquée tant que l'encaissement n'est pas confirmé ; /.test(valeur(r, 'GARDE-ESPECES')),
    comptoirNonRetireCommeRefus: true,
    gainColis: parClasse(r, 'RELAIS-GAIN-COLIS', `${NOMBRE} F / ${NOMBRE} F / ${NOMBRE} F`),
    places: parClasse(r, 'RELAIS-PLACES', 'S (\\d+) · M (\\d+) · L (\\d+)'),
    code: { longueur, essais: Number(essais[1]), blocageHeures: blocage, renvoisPar24h: un(r, 'CODE-RENVOI', '(\\d+) par commande et par 24 h') },
    porteurPieceDes: un(r, 'CODE-PORTEUR', NOMBRE + ' F \\(valeur du relais\\)'),
    comptoir: {
      plafonds: { nouveau: un(r, 'PAY-CPT-NOUV', NOMBRE + ' F'), standard: un(r, 'PAY-CPT-STD', NOMBRE + ' F'), fidele: un(r, 'PAY-CPT-FID', NOMBRE + ' F') },
      refusAvantAvance: un(r, 'PAY-CPT-REFUS', '(\\d+)'),
    },
    transfert: { S: entier(transfert[1]), M: entier(transfert[1]), L: entier(transfert[2]) },
    versement: {
      jourSemaine: jour(verJour[1], 'VD-VER-JOUR'),
      avantHeure: Number(verJour[2]),
      arreteJourSemaine: jour(arrete[1], 'VD-VER-ARRETE'),
      arreteMinutes: Number(arrete[2]) * 60 + Number(arrete[3]),
      essais: Number(verEssais[1]),
      intervalleH: Number(verEssais[2]),
      revueNumeroJours: un(r, 'VD-NUM-REVUE', '(\\d+) jours, versements reportés'),
    },
    avisFenetreJours: un(r, 'AVIS-FENETRE', '(\\d+) jours après le retrait'),
    constatReponseH: un(r, 'LIT-CONSTAT-H', '(\\d+) h ouvrées'),
    fermeTransfertH: un(r, 'RELAIS-FERME-TRANSFERT-H', '(\\d+) h sans réponse du client : transfert automatique au relais ouvert le plus proche'),
    photoMaxKo: un(r, 'PHOTO-MAX-KO', '(\\d+)'),
    capaciteSeuilPct: pr(r, 'PR-SATURATION'),
    equipeMax: pr(r, 'PR-EQUIPE-MAX'),
    formationModules: pr(r, 'PR-FORMATION-MODULES'),
    finPreavisJours: pr(r, 'PR-FIN-PREAVIS-J'),
    finSansColisJours: pr(r, 'PR-FIN-SANS-COLIS-J'),
    preuvesConservationJours: pr(r, 'PR-PREUVES-CONSERV-J'),
    constatPhotosMin: pr(r, 'PR-CONSTAT-PHOTOS-MIN'),
    retourPhotos: pr(r, 'PR-RETOUR-PHOTOS-MIN'),
    fileExpirationH: pr(r, 'PR-OFF-EXPIRATION-H'),
    papierSaisieH: pr(r, 'PR-PAPIER-SAISIE-H'),
    approcheMin: pr(r, 'PR-NTF-APPROCHE-MIN'),
    heuresCalmes: { de: Number(calmes[1]), a: Number(calmes[2]) },
    documentAlerteJours: pr(r, 'PR-DOC-EXPIRE-J'),
    alerteSeuilPoints: pr(r, 'PR-TRUST-ALERTE'),
    horsLigneRemisesParJour: pr(r, 'PR-HL-REMISES'),
    dette: { max: un(r, 'PR-DETTE-MAX', NOMBRE + ' F'), semaines: pr(r, 'PR-DETTE-SEMAINES') },
    paliers: { confirme: pr(r, 'PR-PAL-CONFIRME'), premium: pr(r, 'PR-PAL-PREMIUM') },
    herosFenetreMin: un(r, 'PR-HEROS-FENETRE-MIN', '(\\d+)'),
    lotConfirmMin: un(r, 'PR-LOT-CONFIRM-MIN', '(\\d+)'),
    departAlerteH: un(r, 'PR-DEP-ALERTE-H', '(\\d+)'),
    groupageLiberationJ: un(r, 'PR-GROUPAGE-LIBERATION-J', '(\\d+)'),
    grillePreavisJours: un(r, 'PR-GRILLE-PREAVIS-J', '(\\d+)'),
    paiementComptoirDelaiMin: un(r, 'PR-PAY-COMPTOIR-DELAI-MIN'),
    retourFenetreJours: un(r, 'RET-FENETRE', '(\\d+) jours après le retrait'),
    viceCacheJours: un(r, 'RET-VICE', '(\\d+) jours après le retrait'),
    avisPeriodeJours: un(r, 'PR-AVIS-PERIODE-J', '(\\d+)'),
    fermetureMasqueJours: un(r, 'PR-FER-MASQUE-J', '(\\d+)'),
    formationQuizPct: un(r, 'PR-FORMATION-QUIZ-PCT', '(\\d+)'),
    donneesDelaiJours: un(r, 'PR-DONNEES-DELAI-J', '(\\d+)'),
    visitePratiqueHeures: un(r, 'PR-VISITE-PRATIQUE-H', '(\\d+)'),
    contestationFenetreJours: un(r, 'PR-CONTESTATION-FENETRE-J', '(\\d+)'),
    contestationHeures: un(r, 'PR-CONTESTATION-H', '(\\d+) h ouvrées, une contestation par décision'),
    resumeMatin: (() => {
      const m = lire(r, 'PR-NTF-RESUME-H', '(\\d{1,2}) h(?: (\\d{2}))?, réglable, jamais avant (\\d{1,2}) h')
      const hhmm = (h: string, mn = '0') => `${h.padStart(2, '0')}:${mn.padStart(2, '0')}`
      return { defaut: hhmm(m[1], m[2] ?? '0'), min: hhmm(m[3]) }
    })(),
  }
}

/** Paramètres de connexion des membres du relais (mêmes codes que le livreur : PIN-*, OTP-*, SESSION-H). */
export interface ParametresConnexion {
  pinLongueur: number
  pinEssais: number
  pinBlocageMin: number
  codeSmsLongueur: number
  codeSmsEssais: number
  codeSmsDureeMin: number // OTP-DUREE
  renvoiSecondes: number
  envoisParHeure: number
  sessionHeures: number
}
export function lireConnexion(r: Registre): ParametresConnexion {
  const renvoi = lire(r, 'OTP-RENVOI', '(\\d+) s entre deux envois, (\\d+) envois par heure')
  return {
    pinLongueur: un(r, 'PIN-LONGUEUR', '(\\d+)'),
    pinEssais: un(r, 'PIN-ESSAIS', '(\\d+)'),
    pinBlocageMin: pr(r, 'PR-PIN-BLOCAGE-MIN'), // ARL-12 : 15 min au relais (PIN-BLOCAGE-MIN 30 est celui du livreur)
    codeSmsLongueur: un(r, 'OTP-LONGUEUR', '(\\d+)'),
    codeSmsEssais: un(r, 'sms_essais_code', '(\\d+)'),
    codeSmsDureeMin: un(r, 'OTP-DUREE', '(\\d+) minutes'),
    renvoiSecondes: Number(renvoi[1]),
    envoisParHeure: Number(renvoi[2]),
    sessionHeures: un(r, 'SESSION-H', '(\\d+)'),
  }
}

// ── Accès (PR-03 : connexion, invitation, candidature, activation, statut) ──────────────────────────────────────
export interface ParametresAcces {
  /** PR-SESSION-J : session gardée sur un appareil de confiance (CNX-04). */
  sessionJours: number
  /** PR-INVITATION-H : lien d'invitation valable (INV-01). */
  invitationHeures: number
  /** PR-APPEL-CANDIDAT-H : appel d'un agent après la candidature (INS-04). */
  appelCandidatHeures: number
  /** ZONES-EXPLOITEES (DP-09) : zones de lancement, recrutement prioritaire (INS-05). */
  zonesExploitees: string[]
  /** RELAIS-PAR-ZONE : relais par zone au lancement (CT01 R04, ARL-21). */
  relaisParZone: number
  /** PR-FONDATEURS, PR-EXCLU-RAYON-M, PR-EXCLU-MOIS : partenaire fondateur (ACT-02, ARL-21). */
  fondateurs: number
  exclusiviteRayonM: number
  exclusiviteMois: number
  /** PR-CONTESTATION-H : réponse à une contestation, en heures ouvrées (STA-03). */
  contestationHeures: number
  /** PR-SAN-GEL-SEUIL : Trust Score gelé sous ce seuil pendant une suspension (STA-03, TRU-06). */
  gelSous: number
  /** PR-PREFIXES-MOMO : préfixes par opérateur (INS-03). */
  prefixes: { mtn: string[]; orange: string[] }
  /** VD-NUM-REVUE (alias PR-NUMVERS-VERIF-J) : vérification d'un changement de numéro de versement (INS-03, PR-09). */
  changementNumeroJours: number
  /** PR-PWA-POIDS-MO : poids cible de l'application (PWA-03). */
  pwaMo: number
  /** PR-FORMATION-MODULES : durée des modules obligatoires (≈ minutes). */
  formationMinutes: number
  /** PR-VISITE-PRATIQUE-H (ARL-44) : séance pratique de la visite d'activation. */
  visitePratiqueHeures: number
  /** VD-KYC-DELAIS (ARL-18 : comme le vendeur) : vérification automatique, sinon revue humaine. */
  kyc: { autoMinutes: number; humainHeures: number }
}

/** « 650 à 654 » → 650…654 ; « 67 » → 67. */
function plage(texte: string): string[] {
  const m = /^(\d+) à (\d+)$/.exec(texte.trim())
  if (!m) return [texte.trim()]
  const out: string[] = []
  for (let n = Number(m[1]); n <= Number(m[2]); n++) out.push(String(n))
  return out
}

export function lireAcces(r: Registre): ParametresAcces {
  const prefixes = lire(r, 'PR-PREFIXES-MOMO', 'MTN : ([\\d, à]+) · Orange : ([\\d, à]+)')
  const formation = lire(r, 'PR-FORMATION-MODULES', '(\\d+) \\(.*≈ (\\d+) min\\)')
  const kyc = lire(r, 'VD-KYC-DELAIS', 'vérification automatique en (\\d+) minutes au plus ; sinon une personne répond sous (\\d+) h ouvrées.*')
  return {
    sessionJours: pr(r, 'PR-SESSION-J'),
    invitationHeures: pr(r, 'PR-INVITATION-H'),
    appelCandidatHeures: pr(r, 'PR-APPEL-CANDIDAT-H'),
    zonesExploitees: lire(r, 'ZONES-EXPLOITEES', '(Z\\d+ [^,]+(?:, Z\\d+ [^,]+)*)')[1].split(', '),
    relaisParZone: pr(r, 'RELAIS-PAR-ZONE'),
    fondateurs: pr(r, 'PR-FONDATEURS'),
    exclusiviteRayonM: pr(r, 'PR-EXCLU-RAYON-M'),
    exclusiviteMois: pr(r, 'PR-EXCLU-MOIS'),
    contestationHeures: entier(lire(r, 'PR-CONTESTATION-H', '(\\d+) h ouvrées, une contestation par décision')[1]),
    gelSous: pr(r, 'PR-SAN-GEL-SEUIL'),
    prefixes: { mtn: prefixes[1].split(', ').flatMap(plage), orange: prefixes[2].split(', ').flatMap(plage) },
    changementNumeroJours: pr(r, 'VD-NUM-REVUE'),
    pwaMo: entier(lire(r, 'PR-PWA-POIDS-MO', '< (\\d+)')[1]),
    formationMinutes: Number(formation[2]),
    visitePratiqueHeures: pr(r, 'PR-VISITE-PRATIQUE-H'),
    kyc: { autoMinutes: Number(kyc[1]), humainHeures: Number(kyc[2]) },
  }
}

// ── Argent et performance (PR-09 : numéro de versement, réclamation, préfixes, gel, palier) ──────────────────────
export interface ParametresArgent {
  /** PR-NUM-CODE (MOM-02) : nombre de codes SMS, chiffres, validité en minutes. */
  numeroCodes: { nombre: number; chiffres: number; minutes: number }
  /** PR-NUM-VERIF-J (VER-03, MOM-03) : vérification d'un nouveau numéro par une personne, versements suspendus. */
  numeroVerifJours: number
  /** PR-VER-ESSAIS (VER-08) : nouveaux essais après un refus de l'opérateur. */
  versementEssais: number
  /** PR-VER-RECLAM (VER-05) : un versement non reçu et signalé reçoit une réponse avant ce jour, à midi. */
  reclamation: { jourSemaine: number; heure: number }
  /** CARTE-PREFIXES (MOM-05) : préfixes Mobile Money au Cameroun, tels qu'écrits au registre. */
  prefixes: { MTN: string[]; Orange: string[] }
  /** PR-SAN-GEL-SEUIL : suspension, score gelé sous ce seuil (TRU-06). */
  gelSous: number
  /** PR-PAL-CAPACITE-PCT : hausse de capacité du palier Confirmé, validée à distance (PAL-04). */
  capacitePct: number
  /** PR-ACCOMPAGNEMENT-J : accompagnement renforcé du support, palier Starter (PAL-03). */
  accompagnementJours: number
}

export function lireArgent(r: Registre): ParametresArgent {
  const code = lire(r, 'PR-NUM-CODE', '(\\d+) codes de (\\d+) chiffres, valables (\\d+) minutes')
  const reclam = lire(r, 'PR-VER-RECLAM', 'avant le (\\S+) midi suivant, avec la preuve de l.opérateur')
  const jr = JOURS.indexOf(reclam[1])
  if (jr < 0) throw new ParametreIllisible(`PR-VER-RECLAM : jour « ${reclam[1]} » inconnu`)
  const pref = lire(r, 'CARTE-PREFIXES', 'MTN : (.+) · Orange : (.+)')
  return {
    numeroCodes: { nombre: Number(code[1]), chiffres: Number(code[2]), minutes: Number(code[3]) },
    numeroVerifJours: un(r, 'PR-NUM-VERIF-J', '(\\d+) jours, versements reportés'),
    versementEssais: un(r, 'PR-VER-ESSAIS', '(\\d+) essais à \\d+ h d.intervalle, puis versements suspendus'),
    reclamation: { jourSemaine: jr, heure: 12 },
    prefixes: { MTN: pref[1].split(', '), Orange: pref[2].split(', ') },
    gelSous: un(r, 'PR-SAN-GEL-SEUIL'),
    capacitePct: un(r, 'PR-PAL-CAPACITE-PCT', 'jusqu.à \\+(\\d+) %, validée à distance'),
    accompagnementJours: un(r, 'PR-ACCOMPAGNEMENT-J', '(\\d+) premiers jours'),
  }
}

export const PARAMETRES = {
  relais: lireRelais(REGISTRE),
  connexion: lireConnexion(REGISTRE),
  acces: lireAcces(REGISTRE),
  argent: lireArgent(REGISTRE),
}

// DONNÉES DE DÉMONSTRATION — domaine « aide » : le « serveur » de l'aide du relais. Les réponses et les fiches disent
// les règles avec les VALEURS DU REGISTRE (AID-02 : réponses alignées sur les règles, éditables en console) ; rien n'y
// est écrit en dur. Filtrées selon le rôle (ARL-06) : l'employé ne lit ni l'argent du relais ni la convention.
// Panne générale du jeu d'essai : diffusion DIF-0312 par SMS, lundi 12 octobre 2026 de 16 h à 17 h 30 (réseau de
// l'opérateur coupé dans la zone) ; le registre papier se saisit dans les PR-PAPIER-SAISIE-H heures qui suivent.
import { PARAMETRES, REGISTRE, lire } from '../calculs/registre'
import { HEURE, jourDe, minutesDuJour } from '../calculs/temps'
import type { Aide, DomaineAide, DroitFiche, FicheAide, LigneRegistre, PanneGenerale, QuestionAide, RefusLigne } from '../donnees/domaines/aide'
import type { Texte } from '../donnees/domaines/notifications'
import { heure } from '../i18n/temps'
import { appliquer, empreinte, etatColis, preuve, vue } from './colis'
import { maintenant } from './horloge'
import { oct } from './jeu-essai'
import { lirePannesDepuis } from './notifications'
import { acteurActuel, membreActuel, verifierPin } from './session'
import { magasin, repondre } from './stockage'
import { decisionsConsole, estMoi } from './pont-console'
import type { Evenement } from './pont'

const P = PARAMETRES.relais
const T = (fr: string, en: string): Texte => ({ fr, en })
const CONTESTATION_H = PARAMETRES.relais.contestationHeures
const PIN_REMISE = Number(lire(REGISTRE, 'PR-PIN-REMISE-ESSAIS', '(\\d+)')[1])
const JOURS = { fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'], en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }
const milliers = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const milliersEn = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const hh = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

// ── Questions fréquentes (AID-02 : REC-01, RET-12, CAL-21, CAL-10, REC-04, avis, mode papier) ─────────────────────
type Q = QuestionAide & { droit: DroitFiche }
function questions(): Q[] {
  const c = P.code
  const v = P.versement
  const g = P.gainColis
  return [
    {
      id: 'sans-code-depot',
      droit: 'recevoir',
      question: T('Le livreur n’a pas de code de dépôt', 'The courier has no drop code'),
      reponse: T(
        `Ne prenez pas le lot. Écrivez au support ou demandez un rappel depuis l’app : BelivaY vérifie la mission et vous donne le feu vert, ou fait repartir le livreur. ${c.essais} codes faux : le code est bloqué ${c.blocageHeures} h.`,
        `Do not take the batch. Write to support or ask for a call-back from the app: BelivaY checks the delivery and gives you the go-ahead, or sends the courier away. ${c.essais} wrong codes: the code is blocked for ${c.blocageHeures} h.`,
      ),
      regles: ['REC-01', 'DP-62'],
      lien: { libelle: T('Écrire au support', 'Write to support'), route: 'messagerie' },
    },
    {
      id: 'code-perdu',
      droit: 'remettre',
      question: T('Le client a perdu son code', 'The customer lost their code'),
      reponse: T(
        `Vous ne voyez jamais son code : vous ne pouvez pas le lui redonner. Le client le réaffiche dans son application (QR ou ${c.longueur} chiffres) ; il l’a aussi reçu par SMS et peut en redemander l’envoi, ${c.renvoisPar24h} fois par 24 h au plus. ${c.essais} codes faux : le colis est bloqué ${c.blocageHeures} h et le client demande lui-même un nouveau code.`,
        `You never see their code: you cannot give it back to them. The customer shows it again in their app (QR or ${c.longueur} digits); they also received it by SMS and can ask for it again, at most ${c.renvoisPar24h} times per 24 h. ${c.essais} wrong codes: the parcel is blocked for ${c.blocageHeures} h and the customer requests a new code themselves.`,
      ),
      regles: ['RET-12', 'CAL-31', 'DP-26'],
      lien: { libelle: T('Ouvrir le retrait', 'Open pickup'), route: 'retrait' },
    },
    {
      id: 'presque-plein',
      droit: null,
      question: T('Mon relais est presque plein', 'My relay is almost full'),
      reponse: T(
        `À ${P.capaciteSeuilPct} % de places occupées, BelivaY n’envoie plus de nouveaux colis à votre relais et oriente les clients vers un autre relais. Les colis déjà en route arrivent quand même : vous ne refusez jamais un colis pour la place. Faites partir les départs d’abord ; les retours déposés ne comptent pas dans les places.`,
        `At ${P.capaciteSeuilPct}% of spaces used, BelivaY stops sending new parcels to your relay and directs customers to another relay. Parcels already on their way still arrive: you never refuse a parcel for lack of space. Hand over departures first; dropped-off returns do not count in the spaces.`,
      ),
      regles: ['CAL-21', 'DP-20', 'PR-RC-05'],
      lien: { libelle: T('Voir le stock', 'See stock'), route: 'stock' },
    },
    {
      id: 'paiement',
      droit: 'argent',
      question: T('Quand et comment suis-je payé ?', 'When and how am I paid?'),
      reponse: T(
        `C’est BelivaY qui vous paie, chaque ${JOURS.fr[v.jourSemaine]} avant ${v.avantHeure} h, sur votre numéro Mobile Money vérifié (arrêté le ${JOURS.fr[v.arreteJourSemaine]} à ${heure(hh(v.arreteMinutes), 'fr')}). Par colis remis ou retour déposé : ${g.S} F (petit), ${g.M} F (moyen), ${g.L} F (grand) ; ${P.garde.gainRelaisJour} F par jour de garde, 1er jour compris (payé par BelivaY). Vous encaissez la garde en espèces et gardez votre part ; le reste revient à BelivaY, déduit du versement. Même quand la livraison est offerte au client, votre rémunération ne change pas.`,
        `BelivaY pays you, every ${JOURS.en[v.jourSemaine]} before ${heure(hh(v.avantHeure * 60), 'en')}, on your verified Mobile Money number (closed on ${JOURS.en[v.arreteJourSemaine]} at ${heure(hh(v.arreteMinutes), 'en')}). Per parcel handed over or return dropped off: ${g.S} F (small), ${g.M} F (medium), ${g.L} F (large); ${P.garde.gainRelaisJour} F per storage day, 1st day included (paid by BelivaY). You collect storage fees in cash and keep your share; the rest goes back to BelivaY, deducted from the payout. Even when delivery is free for the customer, your pay does not change.`,
      ),
      regles: ['CAL-10', 'VER-07', 'VER-09', 'v6 D12', 'ARL-30'],
      lien: { libelle: T('Voir mes versements', 'See my payouts'), route: 'versements' },
    },
    {
      id: 'abime-arrivee',
      droit: 'recevoir',
      question: T('Un colis est abîmé à l’arrivée', 'A parcel arrives damaged'),
      reponse: T(
        `Prenez-le « avec réserve » et photographiez-le : le livreur accepte la réserve dans son application avant de confirmer le lot. Scellé du livreur cassé, colis mouillé ou ouvert : refusez-le avec ${P.constatPhotosMin} photos ; il repart avec le livreur et vous n’en êtes pas responsable.`,
        `Take it “with reservation” and photograph it: the courier accepts the reservation in their app before confirming the batch. Courier seal broken, parcel wet or opened: refuse it with ${P.constatPhotosMin} photos; it leaves with the courier and you are not responsible for it.`,
      ),
      regles: ['REC-04', 'DP-62', 'PR-RC-08'],
      lien: { libelle: T('Ouvrir la réception', 'Open receiving'), route: 'reception' },
    },
    {
      id: 'avis-injuste',
      droit: null,
      question: T('Un avis me semble injuste', 'A review seems unfair'),
      reponse: T(
        'Signalez-le au support depuis la Messagerie, avec la date de l’avis. Un avis n’est retiré que pour une insulte, une donnée personnelle ou un hors-sujet, par un médiateur, avec un motif écrit. Vous pouvez répondre en privé au client : la réponse arrive dans sa messagerie, jamais publiée.',
        'Report it to support from Messages, with the date of the review. A review is only removed for an insult, personal data or being off-topic, by a mediator, with a written reason. You can reply privately to the customer: the reply reaches their messages, never published.',
      ),
      regles: ['AID-05', 'AVI-05', 'DP-39'],
      lien: { libelle: T('Voir les avis', 'See reviews'), route: 'avis' },
    },
    {
      id: 'mode-papier',
      droit: null,
      question: T('Panne générale : le mode papier', 'General outage: paper mode'),
      reponse: T(
        `BelivaY vous prévient par un SMS ou un WhatsApp de diffusion. Tenez alors le registre papier : référence du colis, code donné par le client, pièce d’identité, signature du client, heure. Ne remettez que les colis sans montant à payer (ni garde due, ni commande à payer au comptoir). Au retour du réseau, saisissez chaque ligne dans l’application dans les ${P.papierSaisieH} h, avec une photo de la page.`,
        `BelivaY warns you by a broadcast SMS or WhatsApp. Then keep the paper register: parcel reference, code given by the customer, ID document, customer signature, time. Only hand over parcels with nothing to pay (no storage fee due, no order to pay at the counter). When the network is back, enter each line in the app within ${P.papierSaisieH} h, with a photo of the page.`,
      ),
      regles: ['AID-04', 'OFF-06', 'v6 D15'],
      lien: { libelle: T('Ouvrir le mode papier', 'Open paper mode'), route: 'mode-papier' },
    },
  ]
}

// ── Convention : voir et demander, jamais décider (GEN-06 ; DP-66 appliquée au relais) ───────────────────────────
function convention(): Q[] {
  return [
    {
      id: 'conv-remuneration',
      droit: 'argent',
      question: T('Puis-je changer ma rémunération ou la grille de garde ?', 'Can I change my pay or the storage grid?'),
      reponse: T('Non : elles sont fixées par la convention et son annexe 1. BelivaY les change par avenant annoncé à l’avance, jamais de façon rétroactive. Vous les relisez dans Documents.', 'No: they are set by the agreement and its appendix 1. BelivaY changes them by an amendment announced in advance, never retroactively. You can read them again in Documents.'),
      regles: ['PR-CT02', 'CAL-09', 'ARL-25'],
      lien: { libelle: T('Ouvrir Documents', 'Open Documents'), route: 'documents' },
    },
    {
      id: 'conv-horaires',
      droit: 'capacite',
      question: T('Comment changer mes horaires ou ma capacité ?', 'How do I change my hours or capacity?'),
      reponse: T('Vous les demandez depuis « Capacité et horaires » : BelivaY valide. Une fermeture imprévue du jour se déclare tout de suite depuis « Fermeture exceptionnelle » ; les jours fermés ne comptent pas : la garde s’arrête et le renvoi recule d’autant.', 'You request them from “Capacity and hours”: BelivaY approves. An unplanned closure today is declared right away from “Exceptional closure”; closed days do not count: storage stops and the return date moves back.'),
      regles: ['CAP-01', 'FER-01', 'DP-66'],
      lien: { libelle: T('Capacité et horaires', 'Capacity and hours'), route: 'capacite' },
    },
    {
      id: 'conv-sanction',
      droit: 'argent',
      question: T('Une sanction me semble injuste', 'A sanction seems unfair'),
      reponse: T(`Une sanction est proposée par le calcul et décidée par une personne de BelivaY, avec un motif écrit. Vous pouvez la contester une seule fois, sous ${CONTESTATION_H} h ouvrées, depuis Trust Score ; la réponse est motivée et reste dans l’historique.`, `A sanction is proposed by the calculation and decided by a BelivaY person, with a written reason. You can contest it only once, within ${CONTESTATION_H} working hours, from Trust Score; the answer is reasoned and stays in the history.`),
      regles: ['TRU-06', 'TRU-07', 'PR-RC-27'],
      lien: { libelle: T('Ouvrir Trust Score', 'Open Trust Score'), route: 'trust' },
    },
    {
      id: 'conv-fin',
      droit: 'parametres',
      question: T('Je veux arrêter le partenariat', 'I want to end the partnership'),
      reponse: T(`Demandez la fin depuis Paramètres, avec un motif : préavis de ${P.finPreavisJours} jours, dont les ${P.finSansColisJours} derniers sans nouveaux colis. BelivaY prononce la fin ; les colis restants sont remis ou transférés, et le dernier versement part le vendredi suivant la clôture.`, `Request the end from Settings, with a reason: ${P.finPreavisJours} days’ notice, the last ${P.finSansColisJours} without new parcels. BelivaY declares the end; remaining parcels are handed over or transferred, and the last payout goes out on the Friday after closure.`),
      regles: ['ARL-26', 'PR-RC-28', 'PAR-08'],
      lien: { libelle: T('Ouvrir Paramètres', 'Open Settings'), route: 'parametres' },
    },
    {
      id: 'conv-donnees',
      droit: 'parametres',
      question: T('Mes données et mes preuves', 'My data and my proofs'),
      reponse: T(`Vous pouvez demander vos données ou la suppression de votre compte (loi n° 2024/017) depuis Paramètres. Les preuves et les messages sont gardés ${P.preuvesConservationJours} jours et ne se suppriment jamais depuis le relais ; le journal des espèces et les preuves d’un dossier ouvert restent.`, `You can request your data or the deletion of your account (law no. 2024/017) from Settings. Proofs and messages are kept for ${P.preuvesConservationJours} days and are never deleted from the relay; the cash log and the proofs of an open case remain.`),
      regles: ['PR-RC-29', 'MSG-02', 'HIS-02'],
      lien: { libelle: T('Ouvrir Paramètres', 'Open Settings'), route: 'parametres' },
    },
  ]
}

// ── Fiches de travail du comptoir ─────────────────────────────────────────────────────────────────────────────────
type F = FicheAide & { droit: DroitFiche }
function fiches(): F[] {
  const g = P.garde.grille
  const pl = P.comptoir.plafonds
  return [
    {
      id: 'recevoir',
      droit: 'recevoir',
      icone: 'r-colis',
      route: 'reception',
      titre: T('Recevoir un lot', 'Receive a batch'),
      resume: T('Code de dépôt, chaque colis scanné, photo du lot', 'Drop code, each parcel scanned, batch photo'),
      etapes: [
        T(`Scannez le QR ou tapez les ${P.code.longueur} chiffres du code de dépôt que montre le livreur. Pas de code : ne prenez pas le lot.`, `Scan the QR or type the ${P.code.longueur} digits of the drop code shown by the courier. No code: do not take the batch.`),
        T('Scannez chaque étiquette : ok, avec réserve (photo), refusé (scellé cassé, mouillé, ouvert), absent. Un colis qui n’est pas pour votre relais se refuse.', 'Scan each label: OK, with reservation (photo), refused (seal broken, wet, opened), missing. A parcel not for your relay is refused.'),
        T('Prenez une photo du lot, tous les colis visibles, puis signez avec votre PIN.', 'Take a photo of the batch, all parcels visible, then sign with your PIN.'),
        T('Le livreur confirme dans son application (une réserve s’accepte d’abord) : les colis passent sous votre garde.', 'The courier confirms in their app (a reservation is accepted first): the parcels come under your care.'),
      ],
      regles: ['REC-01', 'REC-04', 'ARL-11', 'PR-RC-04', 'PR-RC-08'],
    },
    {
      id: 'remettre',
      droit: 'remettre',
      icone: 'r-cle',
      route: 'retrait',
      titre: T('Remettre un colis', 'Hand over a parcel'),
      resume: T('Code du client, tout réglé, photo, PIN', 'Customer code, everything paid, photo, PIN'),
      etapes: [
        T('Scannez le QR ou tapez les chiffres que montre le client : vous ne voyez jamais son code. Plusieurs colis : chacun a son code.', 'Scan the QR or type the digits the customer shows: you never see their code. Several parcels: each has its own code.'),
        T('Réglez d’abord ce qui est dû : garde en espèces, commande à payer au comptoir en Mobile Money. La remise reste bloquée avant.', 'First settle what is due: storage fee in cash, order to pay at the counter by Mobile Money. Handover stays blocked until then.'),
        T(`Porteur désigné : pièce d’identité vérifiée au-delà de ${milliers(P.porteurPieceDes)} F de valeur.`, `Named collector: ID checked above ${milliers(P.porteurPieceDes)} F in value.`),
        T(`Le client touche « Tout est en ordre » dans son application ; photo de la remise, puis votre PIN. ${PIN_REMISE} PIN faux annulent la remise.`, `The customer taps “Everything is in order” in their app; photo of the handover, then your PIN. ${PIN_REMISE} wrong PINs cancel the handover.`),
      ],
      regles: ['RET-02', 'PR-RC-01', 'PR-RC-21', 'ARL-01', 'ARL-42', 'DP-28'],
    },
    {
      id: 'garde',
      droit: 'remettre',
      icone: 'r-horloge',
      route: 'retrait',
      titre: T('Encaisser la garde en espèces', 'Collect the storage fee in cash'),
      resume: T('Grille par jour, une fois par commande', 'Grid per day, once per order'),
      etapes: [
        T(`Grille par jour et par colis : ${g.join(' · ')} F. Le 1er jour est offert au client ; un jour fermé ne compte pas, le renvoi recule d’autant.`, `Grid per day and per parcel: ${g.join(' · ')} F. The 1st day is free for the customer; a closed day does not count, the return date moves back.`),
        T('En espèces seulement, une seule fois par commande, au premier retrait ; les colis suivants de la commande ne doivent plus rien.', 'In cash only, once per order, at the first pickup; the following parcels of the order owe nothing more.'),
        T('Confirmez l’encaissement dans l’application avant la remise ; rendez la monnaie (l’application la calcule). Le client reçoit son reçu par SMS.', 'Confirm the collection in the app before the handover; give change (the app works it out). The customer gets their receipt by SMS.'),
      ],
      regles: ['v6 D12', 'ARL-02', 'ARL-04', 'ARL-32', 'PR-RC-02'],
    },
    {
      id: 'mobile-money',
      droit: 'remettre',
      icone: 'r-carte-paiement',
      route: 'retrait',
      titre: T('Mobile Money au comptoir', 'Mobile Money at the counter'),
      resume: T('Commande à payer au retrait, jamais d’espèces', 'Order paid at pickup, never cash'),
      etapes: [
        T('Une commande à payer au comptoir se paie en Mobile Money, sur le téléphone du client : jamais en espèces.', 'An order to pay at the counter is paid by Mobile Money, on the customer’s phone: never in cash.'),
        T('Envoyez la demande de paiement ; attendez la confirmation dans l’application. Le code du client n’existe pas avant le paiement.', 'Send the payment request; wait for confirmation in the app. The customer’s code does not exist before payment.'),
        T(`Le réseau est obligatoire. Plafonds du panier : ${milliers(pl.nouveau)} F (nouveau compte), ${milliers(pl.standard)} F, ${milliers(pl.fidele)} F (client fidèle).`, `Network is required. Basket caps: ${milliersEn(pl.nouveau)} F (new account), ${milliersEn(pl.standard)} F, ${milliersEn(pl.fidele)} F (loyal customer).`),
      ],
      regles: ['v6 D14', 'OFF-02', 'PR-RC-01'],
    },
    {
      id: 'faire-partir',
      droit: 'faire_partir',
      icone: 'r-camion',
      route: 'departs',
      titre: T('Faire partir des colis', 'Hand over departures'),
      resume: T('Renvois, retours, transferts au livreur', 'Returns to seller, returns, transfers to the courier'),
      etapes: [
        T('« À faire partir » : colis non retirés après 7 jours (renvoi au vendeur), retours décidés, transferts vers un autre relais.', '“To hand over”: parcels not collected after 7 days (back to seller), decided returns, transfers to another relay.'),
        T('Au passage du livreur, scannez chaque colis et prenez la photo de sortie ; le livreur confirme dans son application.', 'When the courier comes, scan each parcel and take the departure photo; the courier confirms in their app.'),
        T('Les places se libèrent à la sortie confirmée ; le client est remboursé à ce moment, jamais avant.', 'Spaces are freed when the departure is confirmed; the customer is refunded then, never before.'),
      ],
      regles: ['PR-RC-07', 'PR-RC-15', 'PR-RC-23', 'ARL-08'],
    },
    {
      id: 'constat',
      droit: 'remettre',
      icone: 'r-balance',
      route: 'litiges',
      titre: T('Faire un constat', 'Make a report'),
      resume: T('Photos et motif ; BelivaY décide', 'Photos and reason; BelivaY decides'),
      etapes: [
        T('Motif : non conforme, abîmé ou contrefaçon. Photographiez le déballage devant le client.', 'Reason: not as described, damaged or counterfeit. Photograph the unpacking in front of the customer.'),
        T(`Au moins ${P.constatPhotosMin} photos, puis votre PIN. La garde et le renvoi sont suspendus, sans frais.`, `At least ${P.constatPhotosMin} photos, then your PIN. Storage and return to seller are suspended, at no cost.`),
        T(`Le fil du dossier s’ouvre dans la Messagerie ; BelivaY répond sous ${P.constatReponseH} h ouvrées et décide : vous constatez, BelivaY décide.`, `The case thread opens in Messages; BelivaY answers within ${P.constatReponseH} working hours and decides: you report, BelivaY decides.`),
      ],
      regles: ['ARL-17', 'PR-RC-06', 'PR-RC-12', 'MSG-03', 'LIT-08'],
    },
    {
      id: 'fermeture',
      droit: 'fermeture_jour',
      icone: 'r-fermeture',
      route: 'fermeture',
      titre: T('Fermer le relais', 'Close the relay'),
      resume: T('Fermeture du jour, fermeture prévue', 'Closure today, planned closure'),
      etapes: [
        T('Imprévu aujourd’hui : déclarez la fermeture tout de suite ; moins de 24 h, les clients voient « rouvre demain ».', 'Unplanned today: declare the closure right away; under 24 h, customers see “reopens tomorrow”.'),
        T(`Au-delà de 24 h, le client choisit un autre relais ; sans réponse, le colis est transféré après ${P.fermeTransfertH} h. Les jours fermés ne comptent pas dans la garde.`, `Beyond 24 h, the customer chooses another relay; without an answer, the parcel is transferred after ${P.fermeTransfertH} h. Closed days do not count toward storage.`),
        T('Une fermeture non déclarée constatée par un livreur ouvre un incident et compte au Trust Score après décision d’une personne.', 'An undeclared closure found by a courier opens an incident and counts in the Trust Score after a person’s decision.'),
      ],
      regles: ['FER-01', 'ARL-20', 'PR-RC-24'],
    },
    {
      id: 'sans-reseau',
      droit: null,
      icone: 'r-reseau',
      route: 'accueil',
      titre: T('Sans réseau', 'Without network'),
      resume: T('File d’attente, ce qui marche, ce qui attend', 'Queue, what works, what waits'),
      etapes: [
        T('Réception, constat, retour, sortie et remise sans paiement Mobile Money partent en file d’attente avec l’heure du téléphone.', 'Receiving, report, return, departure and handover without Mobile Money payment go into the queue with the phone’s time.'),
        T(`Remise avec garde en espèces : permise hors ligne, ${P.horsLigneRemisesParJour} par jour au plus. Le paiement Mobile Money au comptoir exige le réseau.`, `Handover with cash storage fee: allowed offline, at most ${P.horsLigneRemisesParJour} per day. Mobile Money payment at the counter needs the network.`),
        T(`Au-delà de ${P.fileExpirationH} h, une opération en file expire : refaites-la. Rien ne se perd en silence.`, `Beyond ${P.fileExpirationH} h, a queued operation expires: redo it. Nothing is lost silently.`),
      ],
      regles: ['OFF-02', 'OFF-05', 'ARL-03', 'PR-RC-19'],
    },
  ]
}

// ── Panne générale et registre papier ─────────────────────────────────────────────────────────────────────────────
const PANNES_ESSAI: Omit<PanneGenerale, 'saisirAvant'>[] = [{ reference: 'DIF-0312', canal: 'sms', du: oct(12, 16, 0), au: oct(12, 17, 30) }]
/**
 * Pannes déclarées par la console (pont : « panne » en mode papier qui liste ce relais, src/demo/pont-console.ts) : du
 * passage en mode papier au rétablissement (ou à la clôture) ; le registre se saisit ensuite comme pour la diffusion.
 */
function pannesConsole(): Omit<PanneGenerale, 'saisirAvant'>[] {
  const l = decisionsConsole('relais').filter((e): e is Extract<Evenement, { type: 'panne' }> => e.type === 'panne')
  return [...new Set(l.map((e) => e.id))].flatMap((id) => {
    const de = l.filter((e) => e.id === id)
    const papier = de.find((e) => e.etat === 'papier' && e.relais.some((r) => estMoi(r, 'relais')))
    if (!papier) return []
    const fin = de.find((e) => (e.etat === 'retabli' || e.etat === 'clos') && e.le >= papier.le)
    return [{ reference: id, canal: 'sms' as const, du: papier.le, au: fin ? fin.le : null }]
  })
}
const pannes = () => [...PANNES_ESSAI, ...pannesConsole()]
const avecDelai = (p: Omit<PanneGenerale, 'saisirAvant'>): PanneGenerale => ({ ...p, saisirAvant: p.au === null ? null : p.au + P.papierSaisieH * HEURE })
// Notifications (même groupe) : la panne est annoncée au retour du réseau.
lirePannesDepuis(() => pannes().filter((p) => p.au !== null && p.au <= maintenant()).map((p) => ({ reference: p.reference, du: p.du, au: p.au! })))

/** Dernière panne en cours ou dont la saisie est encore ouverte. */
function panneOuverte(): PanneGenerale | null {
  const t = maintenant()
  const p = pannes().map(avecDelai).filter((x) => x.du <= t && (x.saisirAvant === null || t < x.saisirAvant))
  return p.length ? p[p.length - 1] : null
}

export const COLONNES: Texte[] = [T('Référence du colis', 'Parcel reference'), T('Code donné par le client', 'Code given by the customer'), T('Pièce d’identité', 'ID document'), T('Signature du client', 'Customer signature'), T('Heure', 'Time')]

export const etatAide = magasin('aide', () => ({ lignes: [] as LigneRegistre[] }))

// Même règle que config/droits.ts (aLeDroit) : le propriétaire a tous les droits, l'employé ceux qu'on lui a donnés.
const permis = (d: DroitFiche) => {
  const m = membreActuel()
  return d === null || (!!m && (m.role === 'proprietaire' || m.droits.includes(d)))
}
const sans = <X extends { droit: DroitFiche }>({ droit: _d, ...x }: X) => x

function support() {
  const SUP = lire(REGISTRE, 'SUP-HORAIRES', '(\\d+) h – (\\d+) h, 7 j/7')
  const DELAI = Number(lire(REGISTRE, 'SUP-DELAI', '(\\d+) h pendant les heures du support')[1])
  const m = minutesDuJour(maintenant())
  return { horaires: T(SUP[0], `${heure(hh(Number(SUP[1]) * 60), 'en')} – ${heure(hh(Number(SUP[2]) * 60), 'en')}, 7 days a week`), ouvertMaintenant: m >= Number(SUP[1]) * 60 && m < Number(SUP[2]) * 60, delaiH: DELAI }
}

export const demoAide: DomaineAide = {
  aide: () =>
    repondre<Aide>({
      questions: questions().filter((q) => permis(q.droit)).map(sans),
      convention: membreActuel()?.role === 'proprietaire' ? convention().filter((q) => permis(q.droit)).map(sans) : [],
      fiches: fiches().filter((f) => permis(f.droit)).map(sans),
      support: support(),
      registrePapier: COLONNES,
      panne: panneOuverte(),
      papierSaisieH: P.papierSaisieH,
    }),
  fiche: (id) => {
    const f = fiches().find((x) => x.id === id && permis(x.droit))
    return repondre(f ? sans(f) : null)
  },
  registre: () => repondre({ panne: panneOuverte(), lignes: [...etatAide.lire().lignes].sort((a, b) => b.saisieLe - a.saisieLe), colonnes: COLONNES, papierSaisieH: P.papierSaisieH }),
  async saisirLigne(l, o) {
    const t = maintenant()
    const deja = etatAide.lire().lignes.find((x) => x.id === 'RP-' + o.cle)
    if (deja) return deja.etat === 'remise' ? { ok: true, ligne: deja } : { ok: false, raison: deja.motif ?? 'transition_interdite' }
    const panne = pannes().map(avecDelai).find((p) => p.reference === l.panne)
    const ref = l.reference.trim().toUpperCase()
    const refus = (raison: RefusLigne, garder = true): { ok: false; raison: RefusLigne } => {
      // Une ligne refusée par le serveur reste au registre saisi (preuve de ce qui a été tenté), motif écrit.
      if (garder) etatAide.ecrire((e) => void e.lignes.push({ id: 'RP-' + o.cle, panne: l.panne, reference: ref, heure: l.heure, saisieLe: t, par: membreActuel()?.initiales ?? '', etat: 'refusee', motif: raison }))
      return { ok: false, raison }
    }
    if (!panne) return refus('aucune_panne', false)
    if (panne.saisirAvant !== null && t >= panne.saisirAvant) return refus('delai_depasse', false)
    if (l.heure < panne.du || (panne.au !== null && l.heure > panne.au)) return refus('hors_panne', false)
    if (!l.photo) return refus('photo_manquante', false)
    if (!l.pieceVerifiee) return refus('piece_requise', false)
    if (!l.signature) return refus('signature_requise', false)
    const pin = verifierPin(l.pin)
    if (pin !== 'ok') return refus(pin === 'bloque' ? 'bloque' : 'pin_faux', false)
    const e = etatColis.lire()
    const c = e.colis[ref]
    if (!c) return refus('introuvable')
    if (c.code.empreinte !== empreinte(l.code.replace(/\D/g, ''))) return refus('code_faux')
    if (c.etat === 'remis' || c.remise) return refus('deja_remis')
    // Seuls les colis sans montant à payer se remettent sur papier (AID-04) : garde due ce jour-là, ou commande à payer.
    const v = vue(c, e, jourDe(l.heure))
    if ((v.garde?.du ?? 0) > 0 || (v.paiement.mode === 'au_comptoir' && v.paiement.etat !== 'confirme')) return refus('montant_du')
    const par = acteurActuel()
    const origine = { ...o, heure: l.heure }
    const r = appliquer(ref, 'remettre', { photos: 1, pinOk: true, controle: 'en_ordre', gardeDue: 0, payableAuRetrait: false, codeBloque: false, formationOk: membreActuel()?.formationOk ?? true, enLigne: true }, origine, par, (x, ee) => {
      x.remise = { le: l.heure, par, porteur: 'client', pieceVerifiee: true, photo: l.photo! }
      preuve(x, 'remise', [l.photo!], par, t)
      x.journal.push({ le: t, action: 'registre_papier_saisi', par, signe: true, detail: `${l.panne} · remise écrite à ${heure(l.heure, 'fr')}`, cle: o.cle })
      const g = ee.groupes[x.groupe]
      if (g && !g.encaissee) g.encaissee = { montant: 0, le: l.heure, par: par.nom ?? '' }
    }, `registre papier ${l.panne}`)
    if (!r.ok) return refus(r.raison === 'introuvable' ? 'introuvable' : 'transition_interdite')
    const ligne: LigneRegistre = { id: 'RP-' + o.cle, panne: l.panne, reference: ref, heure: l.heure, saisieLe: t, par: membreActuel()?.initiales ?? '', etat: 'remise', motif: null }
    etatAide.ecrire((x) => void x.lignes.push(ligne))
    return { ok: true, ligne }
  },
}

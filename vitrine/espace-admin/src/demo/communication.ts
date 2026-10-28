// DONNÉES DE DÉMONSTRATION — domaine « communication » (S5) : journal des envois, budget SMS, diffusions, modèles de
// messages FR/EN versionnés, pannes et mode papier, support et centre d'aide. Le « serveur » :
// - un envoi porte sa clé d'idempotence ; renvoyer réutilise la même clé (jamais deux SMS au client) ; le code de
//   retrait n'apparaît jamais (« ●●●●●● ») ; un SMS en échec n'est pas facturé ;
// - une diffusion au-delà du seuil de destinataires attend un second validateur (source.quatreyeux) ;
// - une panne : déclarer et diffuser est un seul geste (bandeau dans les six applications, délais suspendus), le
//   mode papier, le retour du service (délais prolongés), le rapport, la clôture (registre papier ressaisi) ;
// - le support rattache chaque demande à un dossier ; aucun numéro ni code dans une réponse ; le geste commercial a
//   un montant fixe, jamais au-delà de la commission perçue.
// Jeu d'essai : mardi 13 octobre 2026, 14 h 05 ; incident en cours à Mokolo (coupure de courant) ; demandes SP-0203 à 0211.
import { HEURE, JOUR } from '../calculs/temps'
import { droitDe } from '../config/droits'
import { AccesRefuse, type Espace, type Role } from '../donnees/communs'
import type { ArticleAide, Canal, Diffusion, DomaineCommunication, Envoi, Espaces, Incident, ModeleMessage, ReponseType, ServiceEtat, TicketSupport } from '../donnees/domaines/communication'
import { REGLES_S5, contenuInterdit, dansHeuresPromo, diffusionQuatreYeux, echeanceSupport, gestePossible, peutClore } from '../pages/ADM-11/regles-s5'
import { agentCourant, dansPerimetre, exigerPage, roleCourant, zonesVisibles } from './acces'
import { etatMembre } from './equipe-etat'
import { maintenant } from './horloge'
import { journaliser } from './journal'
import { ENTREPRISES, LIVREURS, RELAIS, T, nomAgent } from './jeu-essai'
import { pilotageDemo } from './pilotage'
import { publier } from './pont'
import { demoQuatreYeux, quatreYeuxDemo } from './quatreyeux'
import { magasin, repondre } from './stockage'

const R = REGLES_S5
const motifValable = (m: string) => m.trim().length >= R.motifMin
const nomCourant = () => nomAgent(agentCourant())
const MASQUE = '●●●●●●'

// ── Jeu d'essai ────────────────────────────────────────────────────────────────────────────────────────────────────
const E = (o: Omit<Envoi, 'cout' | 'renvois' | 'echeanceCarte' | 'delivres' | 'destinataires' | 'version'> & Partial<Pick<Envoi, 'cout' | 'renvois' | 'delivres' | 'destinataires' | 'version'>>): Envoi => {
  const premierEchec = o.essais.find((x) => !x.ok)?.le ?? null
  const sms = o.canaux.includes('sms')
  return {
    version: 1,
    renvois: 0,
    destinataires: 1,
    delivres: null,
    cout: o.statut === 'delivre' && sms ? R.smsPrix : 0,
    echeanceCarte: o.criticite === 1 && o.statut === 'echec' && premierEchec !== null ? premierEchec + R.c1CarteMin * 60_000 : null,
    ...o,
  }
}
const ok = (le: number) => [{ le, ok: true, detail: 'Délivré' }]

function envoisInitiaux(): Envoi[] {
  return [
    E({ id: 'EV-0412', le: T(-3), evenement: 'Renvoi du code de retrait', objet: 'BLV-52230', destinataire: 'Client ••• 7731', espace: 'client', canaux: ['sms'], modele: 'CODE-RETRAIT', version: 3, criticite: 1, statut: 'echec', cle: 'pickup_code_resend:BLV-52230:1', renvois: 1, essais: [{ le: T(-8), ok: false, detail: 'Opérateur injoignable' }, { le: T(-7), ok: false, detail: 'Nouvel essai à 1 minute : échec' }, { le: T(-3), ok: false, detail: 'Nouvel essai à 5 minutes : échec' }], texte: `BelivaY : ton colis BLV-52230 t’attend au Relais Mokolo Marché. Ton code de retrait : ${MASQUE}. Ne le donne qu’au comptoir.` }),
    E({ id: 'EV-0411', le: T(-9), evenement: 'Renvoi du code demandé', objet: 'BLV-52230', destinataire: 'Client ••• 7731', espace: 'client', canaux: ['app'], modele: 'CODE-RENVOI', criticite: 2, statut: 'enregistre', cle: 'resend_request:BLV-52230:1', essais: ok(T(-9)), texte: 'Demande de renvoi du code, 1 sur 3 en 24 heures.' }),
    E({ id: 'EV-0410', le: T(-15), evenement: 'Commande en route', objet: 'BLV-00011', destinataire: 'Client ••• 7731', espace: 'client', canaux: ['push'], modele: 'PROG-ROUTE', criticite: 3, statut: 'delivre', cle: 'prog_route:BLV-00011', essais: ok(T(-15)), texte: 'Ta commande BLV-00011 est en route vers le Relais Bastos Carrefour.' }),
    E({ id: 'EV-0409', le: T(-26), evenement: 'Retard de livraison', objet: 'BLV-52241', destinataire: 'Client ••• 2954', espace: 'client', canaux: ['sms', 'push'], modele: 'INCIDENT', version: 2, criticite: 2, statut: 'delivre', cle: 'incident:BLV-52241:1', essais: ok(T(-26)), texte: 'BelivaY : ta commande BLV-52241 a un contretemps : livreur retardé. Nouvelle heure : 15 h 30.' }),
    E({ id: 'EV-0408', le: T(-43), evenement: 'Panne déclarée', objet: 'INC-261013-01', destinataire: 'Acteurs de Mokolo (Z3)', espace: 'relais', canaux: ['push', 'app'], modele: 'PANNE', criticite: 2, statut: 'delivre', destinataires: 46, delivres: 45, cle: 'incident_open:INC-261013-01', essais: ok(T(-43)), texte: 'BelivaY : service perturbé (coupure de courant au Relais Mokolo Marché). Z3 : suivez les consignes affichées dans l’application.' }),
    E({ id: 'EV-0407', le: T(-61), evenement: 'Dépôt au relais', objet: 'PQ-Z6-261013-001', destinataire: 'Relais Melen Université', espace: 'relais', canaux: ['push'], modele: 'DEPOT-OK', criticite: 3, statut: 'delivre', cle: 'deposit:PQ-Z6-261013-001', essais: ok(T(-61)), texte: 'Paquet PQ-Z6-261013-001 déposé : 7 colis.' }),
    E({ id: 'EV-0406', le: T(-200), evenement: 'Remerciement', objet: 'BLV-52198', destinataire: 'Client ••• 2954', espace: 'client', canaux: ['sms'], modele: 'MERCI', criticite: 3, statut: 'delivre', cle: 'thanks:BLV-52198', essais: ok(T(-200)), texte: 'BelivaY : merci ! Ta commande BLV-52198 est confirmée. À bientôt.' }),
    E({ id: 'EV-0405', le: T(-360), evenement: 'Paiement protégé', objet: 'BLV-52245', destinataire: 'Client ••• 6120', espace: 'client', canaux: ['sms'], modele: 'PAY-OK', version: 2, criticite: 2, statut: 'delivre', cle: 'pay_ok:BLV-52245', essais: ok(T(-360)), texte: 'BelivaY : paiement reçu pour BLV-52245. Ton argent reste bloqué jusqu’au retrait.' }),
    E({ id: 'EV-0404', le: T(-365), evenement: 'Code de retrait', objet: 'BLV-52198', destinataire: 'Client ••• 2954', espace: 'client', canaux: ['sms', 'push'], modele: 'CODE-RETRAIT', version: 3, criticite: 1, statut: 'delivre', cle: 'pickup_code:BLV-52198', essais: ok(T(-365)), texte: `BelivaY : ton colis BLV-52198 t’attend au Relais Melen Université. Ton code de retrait : ${MASQUE}. Ne le donne qu’au comptoir.` }),
  ]
}

interface V {
  fr: string
  en: string
}
const M = (id: string, nom: string, evenement: string, destinataire: Espaces, canaux: Canal[], criticite: 1 | 2 | 3, source: string, versions: (V & { n?: number; le?: number })[], o: { promotion?: boolean; codePermis?: boolean } = {}): ModeleMessage => ({
  id,
  nom,
  evenement,
  destinataire,
  canaux,
  criticite,
  promotion: !!o.promotion,
  codePermis: !!o.codePermis,
  source,
  echecs: 0,
  versions: versions.map((v, i) => ({ version: v.n ?? i + 1, fr: v.fr, en: v.en, le: v.le ?? T(-(versions.length - i) * 9 * 24 * 60), par: 'Franck Penga', motif: 'Version du lancement, relue par la Direction et le Support (ADM-CACHEE-27).' })),
})
function modelesInitiaux(): ModeleMessage[] {
  return [
    M('CODE-RETRAIT', 'Code de retrait', 'Arrivée du dernier colis au relais', 'client', ['sms', 'push'], 1, 'ADM-PRV-03', [{ n: 3, fr: 'BelivaY : ton colis {ref} t’attend au {relais}. Ton code de retrait : {code}. Ne le donne qu’au comptoir.', en: 'BelivaY: your parcel {ref} is waiting at {relais}. Your pickup code: {code}. Only give it at the counter.' }], { codePermis: true }),
    M('PAY-OK', 'Paiement protégé', 'Paiement confirmé', 'client', ['sms'], 2, 'ADM-P27R-01', [{ n: 2, fr: 'BelivaY : paiement reçu pour {ref}. Ton argent reste bloqué jusqu’au retrait.', en: 'BelivaY: payment received for {ref}. Your money stays protected until pickup.' }]),
    M('PAY-ECHEC', 'Échec de paiement', 'Paiement refusé', 'client', ['sms', 'push'], 1, 'ADM-P27R-04', [{ fr: 'BelivaY : le paiement de {ref} n’a pas abouti. Ton panier est gardé : réessaie dans l’application.', en: 'BelivaY: the payment for {ref} did not go through. Your cart is saved: try again in the app.' }]),
    M('LITIGE-DECISION', 'Décision de litige', 'Litige décidé', 'client', ['sms', 'app'], 1, 'ADM-P03', [{ fr: 'BelivaY : décision sur le litige de {ref} : {motif}. Le détail est dans l’application.', en: 'BelivaY: decision on the dispute for {ref}: {motif}. Details are in the app.' }]),
    M('RAPPEL-J2', 'Rappel de garde J+2', 'Colis au relais depuis deux jours', 'client', ['sms'], 2, 'GARDE-GRILLE', [{ fr: 'BelivaY : ton colis {ref} t’attend au {relais}. Pense à le retirer : la garde est de {montant} par jour à partir de demain.', en: 'BelivaY: your parcel {ref} is waiting at {relais}. Please collect it: storage is {montant} a day from tomorrow.' }]),
    M('INCIDENT', 'Retard ou incident', 'Incident de livraison', 'client', ['sms', 'push'], 2, 'ADM-P27R-01', [{ fr: 'BelivaY : ta commande {ref} a un contretemps.', en: 'BelivaY: your order {ref} has a delay.' }, { fr: 'BelivaY : ta commande {ref} a un contretemps : {motif}. Nouvelle heure : {heure}.', en: 'BelivaY: your order {ref} has a delay: {motif}. New time: {heure}.' }]),
    M('MERCI', 'Remerciement', 'Commande confirmée', 'client', ['sms'], 3, 'ADM-P27R-01', [{ fr: 'BelivaY : merci ! Ta commande {ref} est confirmée. À bientôt.', en: 'BelivaY: thank you! Your order {ref} is confirmed. See you soon.' }]),
    M('PANNE', 'Panne déclarée', 'Incident déclaré', 'relais', ['push', 'app'], 2, 'ADM-P28', [{ fr: 'BelivaY : service perturbé ({motif}). {zone} : suivez les consignes affichées dans l’application.', en: 'BelivaY: service disrupted ({motif}). {zone}: follow the instructions shown in the app.' }]),
    M('REPRISE', 'Reprise du service', 'Incident rétabli', 'relais', ['push', 'app'], 2, 'ADM-11-R12', [{ fr: 'BelivaY : le service est rétabli. Merci de votre patience : tout fonctionne de nouveau.', en: 'BelivaY: service is back. Thank you for your patience: everything works again.' }]),
    M('KYC-DECISION', 'Décision sur une identité', 'KYC validé ou refusé', 'vendeur', ['push', 'sms'], 2, 'A-22', [{ fr: 'BelivaY : décision sur votre dossier d’identité : {motif}. Le détail est dans votre espace.', en: 'BelivaY: decision on your identity file: {motif}. Details are in your space.' }]),
    M('SUSPENSION', 'Suspension d’une boutique', 'Boutique suspendue', 'vendeur', ['sms', 'email'], 1, 'A-22', [{ fr: 'BelivaY : votre boutique {boutique} est suspendue : {motif}. Recours possible dans votre espace.', en: 'BelivaY: your shop {boutique} is suspended: {motif}. You can appeal from your space.' }]),
    M('REMB-EXECUTE', 'Remboursement exécuté', 'Remboursement envoyé', 'client', ['sms'], 2, 'CONNEXIONS ADM-P06', [{ fr: 'BelivaY : {montant} remboursés pour {ref} sur ton moyen de paiement d’origine.', en: 'BelivaY: {montant} refunded for {ref} to your original payment method.' }]),
    M('VERSEMENT-VENDREDI', 'Versement du vendredi', 'Versement envoyé', 'vendeur', ['sms'], 2, 'A-16, A-22', [{ fr: 'BelivaY : versement de {montant} envoyé sur votre numéro de versement.', en: 'BelivaY: payout of {montant} sent to your payout number.' }, { fr: 'BelivaY : versement du vendredi de {montant} envoyé sur votre numéro de versement. Détail dans votre espace.', en: 'BelivaY: Friday payout of {montant} sent to your payout number. Details in your space.' }]),
    M('LIV-DEPART-CLOTURE', 'Départ du livreur : clôture', 'Départ clos (DP-67)', 'livreur', ['sms'], 2, 'DP-67, ADM-CACHEE-05', [{ fr: 'BelivaY : votre départ de {entreprise} est clos. Dernier versement le {date}, par votre entreprise.', en: 'BelivaY: your departure from {entreprise} is closed. Last payment on {date}, by your company.' }]),
    M('LIV-VERSEMENT-FAIT', 'Départ du livreur : versement fait', 'Dernier versement fait (DP-67)', 'livreur', ['sms'], 2, 'DP-67, ADM-CACHEE-05', [{ fr: 'BelivaY : {entreprise} a fait votre dernier versement Mobile Money de {montant}. Merci pour votre travail.', en: 'BelivaY: {entreprise} has made your last Mobile Money payment of {montant}. Thank you for your work.' }]),
    M('PROMO-FLASH', 'Vente flash', 'Vente flash programmée', 'client', ['push'], 3, 'ADM-P26R-09', [{ fr: 'Ventes flash près de chez toi ({zone}) : {motif}, jusqu’à {heure}.', en: 'Flash sales near you ({zone}): {motif}, until {heure}.' }], { promotion: true }),
  ]
}

/** Audience d'une diffusion, par espace et par zone (comptes actifs avec notifications ; clients : consentement « Promotions » pour une promotion). */
const CLIENTS_ZONE: Record<string, number> = { Z1: 412, Z2: 268, Z3: 386, Z6: 301, Z9: 97 }
const VENDEURS_ZONE: Record<string, number> = { Z1: 9, Z2: 6, Z3: 14, Z6: 8, Z9: 3 }
const CONSENTEMENT_PROMO = 0.72

const INCIDENT_OUVERT: Incident = {
  id: 'INC-261013-01',
  service: 'Coupure de courant · Relais Mokolo Marché',
  zones: ['Z3'],
  detecteLe: T(-52),
  declareLe: T(-45),
  par: 'Yannick Owona',
  effets: ['Remises des colis déjà payés : elles continuent, sur registre papier', 'Délais de garde, de litige et de versement suspendus pour le relais touché'],
  consignes: 'Relais Mokolo Marché : registre papier ; aucune remise sans pièce d’identité et code écrit par le client lui-même ; ressaisie dans les 24 heures. Garde due encaissée en espèces et notée sur la fiche (DP-65).',
  etat: 'papier',
  papierLe: T(-41),
  relaisPapier: ['Relais Mokolo Marché'],
  retabliLe: null,
  closLe: null,
  accuses: (['admin', 'relais', 'livreur', 'entreprise', 'vendeur', 'client'] as Espace[]).map((app, i) => ({ app, le: T(-45) + [0, 40, 75, 110, 150, 190][i] * 1000 })),
  remises: [
    { id: 'RP-1', relais: 'Relais Mokolo Marché', etiquette: 'BV 26 1302', porteur: 'client', le: T(-35), ressaisieLe: null, relances: 0 },
    { id: 'RP-2', relais: 'Relais Mokolo Marché', etiquette: 'BV 26 1297', porteur: 'client', le: T(-22), ressaisieLe: null, relances: 0 },
    { id: 'RP-3', relais: 'Relais Mokolo Marché', etiquette: 'BV 26 1311', porteur: 'tiers', le: T(-9), ressaisieLe: null, relances: 0 },
  ],
  rapport: null,
  journal: [
    { le: T(-52), quoi: 'Détection : Relais Mokolo Marché sans signal depuis 5 minutes', par: 'Système' },
    { le: T(-45), quoi: 'Déclarée et diffusée', par: 'Yannick Owona' },
    { le: T(-41), quoi: 'Mode papier : Relais Mokolo Marché', par: 'Yannick Owona' },
  ],
}
const incidentClos = (id: string, service: string, zones: string[], debut: number, fin: number, remises: number): Incident => ({
  id,
  service,
  zones,
  detecteLe: debut - 5 * 60_000,
  declareLe: debut,
  par: 'Franck Penga',
  effets: [],
  consignes: '',
  etat: 'clos',
  papierLe: remises ? debut + 4 * 60_000 : null,
  relaisPapier: [],
  retabliLe: fin,
  closLe: fin + 2 * JOUR,
  accuses: [],
  remises: Array.from({ length: remises }, (_, i) => ({ id: `${id}-${i}`, relais: 'Relais Melen Université', etiquette: '—', porteur: 'client' as const, le: debut + (10 + i) * 60_000, ressaisieLe: fin + 30 * 60_000, relances: 0 })),
  rapport: { cause: 'Coupure du réseau électrique dans le quartier, sans batterie externe au comptoir.', effets: 'Remises sur registre papier, toutes ressaisies le jour même, aucun colis perdu ni remis sans code.', change: 'Batterie externe ajoutée au kit de chaque relais ; essai mensuel du registre papier.' },
  journal: [],
})

const T_ = (o: Omit<TicketSupport, 'echeance' | 'premiereReponseLe' | 'brouillon' | 'geste' | 'rattache' | 'proposition' | 'dossier'> & Partial<TicketSupport>): TicketSupport => ({ echeance: echeanceSupport(o.ouvertLe), premiereReponseLe: null, brouillon: null, geste: null, rattache: null, proposition: null, dossier: null, ...o })
function ticketsInitiaux(): TicketSupport[] {
  return [
    T_({ id: 'SP-0207', espace: 'client', canal: 'whatsapp_clients', sujet: 'Code de retrait non reçu', de: 'Client ••• 0388', role: 'Client · Bastos', ouvertLe: T(-45), etat: 'nouvelle', zone: 'Z1', proposition: { ref: 'BLV-00008', libelle: 'BLV-00008 · en route vers le Relais Bastos Carrefour' }, dossier: { commission: 1450, moyen: 'MTN MoMo ···· 17' }, messages: [{ le: T(-45), de: 'acteur', auteur: 'Client ••• 0388', texte: 'Bonjour, je n’ai pas reçu mon code de retrait. Je peux passer au relais ce soir ?' }], brouillon: { reponseType: 'RT-CODE-01', texte: 'Bonjour, ta commande BLV-00008 est encore en route vers le Relais Bastos Carrefour : ton code de retrait part dès son arrivée, par SMS et dans l’application (Commandes, « Afficher mon code »). Par sécurité, personne chez BelivaY ne peut te le dicter.' } }),
    T_({ id: 'SP-0208', espace: 'vendeur', canal: 'whatsapp_vendeurs', sujet: 'Versement de vendredi absent', de: 'Saveurs du Pays', role: 'Vendeur · Melen · numéro vendeurs', ouvertLe: T(-38), etat: 'nouvelle', zone: 'Z6', proposition: { ref: 'KYC-0093', libelle: 'KYC-0093 · pièces d’identité à compléter' }, messages: [{ le: T(-38), de: 'acteur', auteur: 'Saveurs du Pays', texte: 'Je n’ai rien reçu vendredi alors que j’ai vendu toute la semaine. Pourquoi ?' }] }),
    T_({ id: 'SP-0210', espace: 'relais', canal: 'app', sujet: 'Relais plein, colis refusés', de: 'Relais Mokolo Marché', role: 'Gérante · Hortense Biloa', ouvertLe: T(-25), etat: 'en_cours', zone: 'Z3', rattache: { ref: 'INC-261013-01', libelle: 'INC-261013-01 · coupure de courant, mode papier' }, premiereReponseLe: T(-20), messages: [{ le: T(-25), de: 'acteur', auteur: 'Hortense Biloa', texte: 'Le relais est plein et sans courant : je refuse les nouveaux colis ?' }, { le: T(-20), de: 'support', auteur: 'Clarisse Mvondo', texte: 'Continuez les remises sur le registre papier ; les dépôts de la prochaine tournée vont au Relais Elobi, l’entreprise est prévenue.' }] }),
    T_({ id: 'SP-0211', espace: 'livreur', canal: 'app', sujet: 'Application bloquée à la photo de preuve', de: 'Kevin D. · Yafé Express', role: 'Livreur · Melen', ouvertLe: T(-10), etat: 'nouvelle', zone: 'Z6', proposition: { ref: 'PQ-Z6-261013-002', libelle: 'PQ-Z6-261013-002 · domicile en retard' }, messages: [{ le: T(-10), de: 'acteur', auteur: 'Kevin D.', texte: 'L’appareil photo ne s’ouvre pas à la remise, je suis devant le client.' }] }),
    T_({ id: 'SP-0205', espace: 'client', canal: 'app', sujet: 'Commande arrivée avec un jour de retard', de: 'Client ••• 2954', role: 'Client · Melen', ouvertLe: T(-300), etat: 'resolue', zone: 'Z6', rattache: { ref: 'BLV-52198', libelle: 'BLV-52198 · Relais Melen Université' }, dossier: { commission: 1960, moyen: 'MTN MoMo ···· 54' }, premiereReponseLe: T(-288), geste: { montant: R.gesteMontant, le: T(-287), par: 'Clarisse Mvondo', moyen: 'MTN MoMo ···· 54' }, messages: [{ le: T(-300), de: 'acteur', auteur: 'Client ••• 2954', texte: 'Ma commande devait arriver hier au relais, elle n’est arrivée que ce matin.' }, { le: T(-288), de: 'support', auteur: 'Clarisse Mvondo', texte: 'Pardon pour ce retard : ta commande était prête après la dernière tournée d’hier, elle est partie à la première de ce matin. En geste commercial, nous te remboursons un petit montant sur le moyen qui a payé.' }, { le: T(-287), de: 'systeme', auteur: 'BelivaY', texte: 'Geste commercial accordé, remboursé vers le moyen de paiement d’origine.' }] }),
    T_({ id: 'SP-0203', espace: 'client', canal: 'whatsapp_clients', sujet: 'Payer par MoMo sur ce numéro WhatsApp ?', de: 'Client ••• 7731', role: 'Client · Mokolo', ouvertLe: T(-380), etat: 'resolue', zone: 'Z3', rattache: { ref: 'motif : paiement', libelle: 'motif : paiement' }, premiereReponseLe: T(-377), messages: [{ le: T(-380), de: 'acteur', auteur: 'Client ••• 7731', texte: 'Je peux vous payer par MoMo sur ce numéro WhatsApp ?' }, { le: T(-377), de: 'support', auteur: 'Clarisse Mvondo', texte: 'Non : BelivaY n’encaisse jamais par WhatsApp. Paie dans l’application, ton argent reste bloqué jusqu’au retrait.' }] }),
  ]
}

const REPONSES: ReponseType[] = [
  { id: 'RT-CODE-01', titre: 'Code de retrait non reçu', regles: ['ADM-PRV-03', 'ADM-P29R-05'], version: 3, utilisee30j: 46, pour: ['client'], majLe: T(-19 * 24 * 60), texte: 'Bonjour, ton code de retrait s’affiche dans l’application BelivaY (Commandes, « Afficher mon code ») dès l’arrivée de ton colis au relais. Par sécurité, personne chez BelivaY ne peut te le dicter.' },
  { id: 'RT-PAY-WA-01', titre: 'Payer par WhatsApp : jamais', regles: ['ADM-P29R-01'], version: 1, utilisee30j: 12, pour: ['client'], majLe: T(-30 * 24 * 60), texte: 'Non : BelivaY n’encaisse jamais par WhatsApp. Paie dans l’application, ton argent reste bloqué jusqu’au retrait.' },
  { id: 'RT-GARDE-01', titre: 'Frais de garde au relais', regles: ['GARDE-GRILLE', 'ADM-TAR-01'], version: 2, utilisee30j: 31, pour: ['client'], majLe: T(-12 * 24 * 60), texte: 'Le premier jour au relais est gratuit ; ensuite, la garde suit la grille affichée dans l’application, payée au gérant au retrait.' },
  { id: 'RT-VEND-GARDE-02', titre: 'Ce que le vendeur garde', regles: ['VD-COM-MIN', 'ADM-P25R-08'], version: 2, utilisee30j: 9, pour: ['vendeur'], majLe: T(-15 * 24 * 60), texte: 'Sur les petits prix, chaque commande garde un minimum pour BelivaY ; plus le prix monte, plus vous gardez. Le détail de chaque vente est dans votre espace, rubrique Argent.' },
  { id: 'RT-VERS-01', titre: 'Versement du vendredi', regles: ['VD-VER-JOUR', 'ADM-CACHEE-31'], version: 2, utilisee30j: 17, pour: ['vendeur', 'relais', 'entreprise'], majLe: T(-15 * 24 * 60), texte: 'Le versement part le vendredi pour les ventes confirmées ; il attend tant que vos pièces d’identité ne sont pas complètes. Votre espace dit ce qui manque.' },
  { id: 'RT-ENT-PALIER-01', titre: 'Paquet invisible pour mon palier', regles: ['ENT-PLAFOND-NOUVEAU'], version: 1, utilisee30j: 5, pour: ['entreprise'], majLe: T(-20 * 24 * 60), texte: 'Un paquet dont la valeur dépasse le plafond de votre palier ne vous est pas proposé ; il le sera quand votre palier montera.' },
  { id: 'RT-PANNE-01', titre: 'Mode papier : ressaisir le registre', regles: ['ADM-P28R-02', 'ADM-PAPIER-RESSAISIE-H'], version: 1, utilisee30j: 2, pour: ['relais'], majLe: T(-19 * 24 * 60), texte: 'Au retour du réseau, ouvrez Remises papier dans l’application relais et saisissez chaque ligne du registre ; le client vous redonne son code. Tout doit être ressaisi dans les 24 heures.' },
]
const ARTICLES: Omit<ArticleAide, 'signale'>[] = [
  { id: 'AA-01', titre: 'Combien de temps mon colis reste au relais ?', pour: 'client', regles: ['GARDE-GRILLE', 'GARDE-RENVOI'], majLe: T(-19 * 24 * 60) },
  { id: 'AA-02', titre: 'Quand suis-je remboursé ?', pour: 'client', regles: ['REMB-CONTROLE-SEUIL', 'REMB-MOMO-H'], majLe: T(-25 * 24 * 60) },
  { id: 'AA-03', titre: 'Mon code de retrait', pour: 'client', regles: ['CODE-RENVOI', 'CODE-ESSAIS'], majLe: T(-19 * 24 * 60) },
  { id: 'AA-04', titre: 'Ce que vous gardez sur chaque vente', pour: 'vendeur', regles: ['VD-COM-MIN', 'VD-COM-PALIER'], majLe: T(-15 * 24 * 60) },
  { id: 'AA-05', titre: 'Le versement du vendredi', pour: 'vendeur', regles: ['VD-VER-JOUR'], majLe: T(-15 * 24 * 60) },
  { id: 'AA-06', titre: 'Travailler sur registre papier', pour: 'relais', regles: ['ADM-PAPIER-RESSAISIE-H'], majLe: T(-19 * 24 * 60) },
  { id: 'AA-07', titre: 'Paquets visibles selon votre palier', pour: 'entreprise', regles: ['ENT-PLAFOND-NOUVEAU'], majLe: T(-20 * 24 * 60) },
  { id: 'AA-08', titre: 'Quitter votre entreprise', pour: 'livreur', regles: ['DEPART-PREAVIS-J'], majLe: T(-2 * 24 * 60) },
  { id: 'AA-09', titre: 'Délai de réponse du support', pour: 'client', regles: ['SUP-DELAI', 'SUP-HORAIRES'], majLe: T(-25 * 24 * 60) },
]

interface EtatCommunication {
  n: number
  envois: Envoi[]
  modeles: ModeleMessage[]
  diffusions: Diffusion[]
  incidents: Incident[]
  tickets: TicketSupport[]
  articles: Record<string, number> // mises à jour faites (majLe)
}
export const communicationDemo = magasin<EtatCommunication>('communication', () => ({
  n: 7,
  envois: envoisInitiaux(),
  modeles: modelesInitiaux(),
  diffusions: [{ id: 'DF-0006', objet: 'Support ouvert de 7 h à 21 h, 7 jours sur 7', texte: 'BelivaY : le support répond désormais de 7 h à 21 h, 7 jours sur 7, dans l’application et sur WhatsApp Business.', espaces: ['client', 'vendeur', 'relais', 'entreprise', 'livreur'], zones: ['Z1', 'Z2', 'Z3', 'Z6'], canaux: ['push', 'app'], promotion: false, programmeeLe: T(-17 * 24 * 60 - 300), destinataires: 912, par: 'Franck Penga', le: T(-17 * 24 * 60 - 320), etat: 'envoyee', quatreYeux: null }],
  incidents: [INCIDENT_OUVERT, incidentClos('INC-260919-01', 'Coupure de courant · Relais Melen Université', ['Z6'], T(-24 * 24 * 60 - 3 * 60), T(-24 * 24 * 60 - 50), 6), incidentClos('INC-260916-01', 'SMS : délivrance lente', ['Z1', 'Z2', 'Z3', 'Z6'], T(-27 * 24 * 60 + 60), T(-27 * 24 * 60 + 95), 0)],
  tickets: ticketsInitiaux(),
  articles: {},
}))

const id = (prefixe: string) => {
  let x = ''
  communicationDemo.ecrire((s) => {
    s.n++
    x = `${prefixe}-${String(s.n).padStart(4, '0')}`
  })
  return x
}

/** Gestes commerciaux du mois (budget de croissance, ADM-P26R-08). */
export function gestesDuMois(): number {
  const debut = T(-12 * 24 * 60 - 845)
  return communicationDemo
    .lire()
    .tickets.filter((t) => t.geste && t.geste.le >= debut)
    .reduce((n, t) => n + t.geste!.montant, 0)
}

// ── Droits ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function refuser(quoi: string, roles: Role[]): never {
  throw new AccesRefuse(quoi, roles)
}
/** Messagerie : la Finance n'en voit que les coûts (droits.ts « part : Coûts »). */
function exigerMessagerie(complet: boolean) {
  exigerPage('messagerie', 'Messagerie et notifications')
  if (complet && roleCourant() === 'finance') refuser('Journal, modèles et diffusions', ['superviseur', 'support', 'audit'])
}
const peutAgir = (route: string, roles: Role[]) => roles.includes(roleCourant()) && droitDe(route, roleCourant()).acces !== 'lecture'
function exigerGeste(route: string, quoi: string, roles: Role[]) {
  exigerPage(route, quoi)
  if (!peutAgir(route, roles)) refuser(quoi, roles)
}

// ── Réconciliation des diffusions à quatre yeux ───────────────────────────────────────────────────────────────────
function reconcilier() {
  const qy = quatreYeuxDemo.lire().decisions
  const s = communicationDemo.lire()
  const a = s.diffusions.filter((d) => d.etat === 'a_contresigner' && d.quatreYeux && qy.find((x) => x.id === d.quatreYeux)?.etat !== 'a_contresigner')
  if (!a.length) return
  const n = maintenant()
  communicationDemo.ecrire((e) => {
    for (const d of e.diffusions) {
      const q = d.quatreYeux ? qy.find((x) => x.id === d.quatreYeux) : null
      if (d.etat !== 'a_contresigner' || !q || q.etat === 'a_contresigner') continue
      d.etat = q.etat === 'contresignee' ? (d.programmeeLe <= n ? 'envoyee' : 'programmee') : 'refusee'
    }
  })
  for (const d of a) if (qy.find((x) => x.id === d.quatreYeux)?.etat === 'contresignee') publier({ type: 'diffusion', id: d.id, espaces: d.espaces, zones: d.zones, programmeeLe: d.programmeeLe, texte: d.texte }, `admin-diffusion-${d.id}`, n)
}

function audienceDe(espaces: Espaces[], zones: string[], promotion: boolean): number {
  let n = 0
  for (const z of zones) {
    if (espaces.includes('client')) n += Math.floor((CLIENTS_ZONE[z] ?? 0) * (promotion ? CONSENTEMENT_PROMO : 1))
    if (espaces.includes('vendeur')) n += VENDEURS_ZONE[z] ?? 0
    if (espaces.includes('relais')) n += RELAIS.filter((r) => r.zone === z).length
  }
  if (espaces.includes('entreprise')) n += ENTREPRISES.filter((e) => e.zones.some((z) => zones.includes(z))).length
  if (espaces.includes('livreur')) n += LIVREURS.filter((l) => l.statut === 'actif' && l.zones.some((z) => zones.includes(z))).length
  return n
}

// ── Panne ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const APPS: Espace[] = ['admin', 'relais', 'livreur', 'entreprise', 'vendeur', 'client']
const trouverIncident = (iid: string) => communicationDemo.lire().incidents.find((i) => i.id === iid)
const changerIncident = (iid: string, f: (i: Incident) => void) => communicationDemo.ecrire((s) => f(s.incidents.find((i) => i.id === iid)!))
function exigerPanne(i?: Incident) {
  exigerGeste('panne', 'Diffusion de panne', ['superviseur', 'operations'])
  // Opérations : seulement ses zones (ADM-ROL-03).
  if (i && zonesVisibles() && !i.zones.every((z) => dansPerimetre(z))) refuser('Incident hors de vos zones', ['superviseur'])
}

// ── Support ────────────────────────────────────────────────────────────────────────────────────────────────────────
const REF_VALABLE = /^((BLV|KYC|PQ|INC|LT|RB)-[\w-]+|motif : (paiement|compte))$/
const trouverTicket = (tid: string) => communicationDemo.lire().tickets.find((t) => t.id === tid)
const changerTicket = (tid: string, f: (t: TicketSupport) => void) => communicationDemo.ecrire((s) => f(s.tickets.find((t) => t.id === tid)!))

export const demoCommunication: DomaineCommunication = {
  // ── Messagerie ───────────────────────────────────────────────────────────────────────────────────────────────────
  async envois() {
    exigerMessagerie(true)
    return repondre([...communicationDemo.lire().envois].sort((a, b) => b.le - a.le))
  },
  async renvoyer(eid) {
    exigerGeste('messagerie', 'Renvoyer un message', ['superviseur', 'support'])
    const e = communicationDemo.lire().envois.find((x) => x.id === eid)
    if (!e) return { ok: false, raison: 'inconnu' }
    if (e.statut === 'delivre') return { ok: false, raison: 'deja_delivre' }
    const n = maintenant()
    // Même clé d'idempotence : si un essai précédent finit par arriver, le client ne reçoit jamais deux SMS.
    communicationDemo.ecrire((s) => {
      const x = s.envois.find((y) => y.id === eid)!
      x.essais.push({ le: n, ok: true, detail: 'Renvoyé depuis la console, même clé : délivré' })
      x.statut = 'delivre'
      x.cout = x.canaux.includes('sms') ? R.smsPrix : 0
      x.echeanceCarte = null
    })
    publier({ type: 'sms_renvoye', envoi: eid, cle: e.cle }, `admin-renvoi-${e.cle}`, n)
    await journaliser({ action: 'message.renvoyer', objet: `${e.objet} · ${e.modele} · ${e.cle}` })
    return { ok: true }
  },
  async budgetSms() {
    exigerMessagerie(false)
    const jours = [44, 51, 47, 39, 58, 62, 55, 49, 61, 66, 40, 52, 31]
    const parModele: [string, string, number][] = [['PAY-OK', 'Paiement protégé', 201], ['CODE-RETRAIT', 'Code de retrait ou de livraison', 190], ['MERCI', 'Remerciement', 140], ['RAPPEL-J2', 'Rappel de garde J+2', 82], ['RAPPEL-J4', 'Rappel de garde J+4', 23], ['INCIDENT', 'Retard ou incident', 19]]
    return repondre({ mois: 'octobre 2026', jours: jours.map((sms, i) => ({ jour: String(i + 1), sms, cout: sms * R.smsPrix })), commandesMois: 236, commandesJour: 9, parModele: parModele.map(([modele, libelle, sms]) => ({ modele, libelle, sms, cout: sms * R.smsPrix })), gratuits: 4120 })
  },
  async diffusions() {
    exigerMessagerie(true)
    reconcilier()
    return repondre([...communicationDemo.lire().diffusions].sort((a, b) => b.le - a.le))
  },
  async audience(espaces, zones, promotion) {
    exigerMessagerie(true)
    return repondre(audienceDe(espaces, zones, promotion))
  },
  async diffuser(d) {
    exigerGeste('messagerie', 'Diffusion générale', ['superviseur', 'support'])
    if (d.objet.trim().length < 3) return { ok: false, raison: 'objet' }
    if (!d.espaces.length || !d.zones.length || !d.canaux.length || !d.texte.trim()) return { ok: false, raison: 'vide' }
    if (contenuInterdit(d.texte) || contenuInterdit(d.objet)) return { ok: false, raison: 'contenu' }
    if (d.promotion && d.canaux.includes('sms')) return { ok: false, raison: 'sms_promo' }
    if (d.promotion && !dansHeuresPromo(d.programmeeLe)) return { ok: false, raison: 'heures_promo' }
    const n = maintenant()
    if (d.programmeeLe < n - 60_000) return { ok: false, raison: 'passe' }
    if (!motifValable(d.motif)) return { ok: false, raison: 'motif_court' }
    const destinataires = audienceDe(d.espaces, d.zones, d.promotion)
    const did = id('DF')
    const quatre = diffusionQuatreYeux(destinataires)
    let qy: string | null = null
    if (quatre) {
      const r = await demoQuatreYeux.decider({ action: 'diffusion.envoyer', objet: did, resume: `Diffuser « ${d.objet.trim()} » à ${destinataires} destinataires`, motif: d.motif.trim(), preuves: [{ id: 'aud', libelle: `${destinataires} destinataires (${d.espaces.join(', ')} · ${d.zones.join(', ')})`, route: 'messagerie', params: { s: 'diffusion' } }], montant: null, quatreYeux: true, rolesSecond: ['superviseur', 'finance'] })
      qy = r.ok ? r.id : null
    }
    const etat: Diffusion['etat'] = quatre ? 'a_contresigner' : d.programmeeLe <= n + 60_000 ? 'envoyee' : 'programmee'
    communicationDemo.ecrire((s) => void s.diffusions.push({ id: did, objet: d.objet.trim(), texte: d.texte.trim(), espaces: d.espaces, zones: d.zones, canaux: d.canaux, promotion: d.promotion, programmeeLe: d.programmeeLe, destinataires, par: nomCourant(), le: n, etat, quatreYeux: qy }))
    if (!quatre) {
      publier({ type: 'diffusion', id: did, espaces: d.espaces, zones: d.zones, programmeeLe: d.programmeeLe, texte: d.texte.trim() }, `admin-diffusion-${did}`, n)
      await journaliser({ action: 'diffusion.envoyer', objet: `${did} · ${d.objet.trim()} · ${destinataires} destinataires`, motif: d.motif.trim() })
    }
    return { ok: true, id: did, etat }
  },

  // ── Modèles ──────────────────────────────────────────────────────────────────────────────────────────────────────
  async modeles() {
    exigerPage('modeles', 'Modèles de messages')
    const echecs = communicationDemo.lire().envois.filter((e) => e.statut === 'echec')
    return repondre(communicationDemo.lire().modeles.map((m) => ({ ...m, echecs: echecs.filter((e) => e.modele === m.id).length })))
  },
  async publierModele(mid, fr, en, motif) {
    exigerGeste('modeles', 'Publier un modèle', ['superviseur', 'support'])
    const m = communicationDemo.lire().modeles.find((x) => x.id === mid)
    if (!m) return { ok: false, raison: 'vide' }
    if (!fr.trim() || !en.trim()) return { ok: false, raison: 'vide' }
    const c = contenuInterdit(fr, { codePermis: m.codePermis }) ?? contenuInterdit(en, { codePermis: m.codePermis })
    if (c) return { ok: false, raison: c }
    if (m.promotion && m.canaux.includes('sms')) return { ok: false, raison: 'sms_promo' }
    const der = m.versions.at(-1)!
    if (der.fr === fr.trim() && der.en === en.trim()) return { ok: false, raison: 'inchange' }
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const version = der.version + 1
    communicationDemo.ecrire((s) => void s.modeles.find((x) => x.id === mid)!.versions.push({ version, fr: fr.trim(), en: en.trim(), le: maintenant(), par: nomCourant(), motif: motif.trim() }))
    publier({ type: 'modele_publie', modele: mid, version }, `admin-modele-${mid}-v${version}`, maintenant())
    await journaliser({ action: 'modele.publier', objet: `${mid} · v${version}`, motif: motif.trim() })
    return { ok: true, version }
  },

  // ── Panne ────────────────────────────────────────────────────────────────────────────────────────────────────────
  async services() {
    exigerPage('panne', 'Diffusion de panne')
    const actifs = communicationDemo.lire().incidents.filter((i) => i.etat !== 'clos' && i.etat !== 'retabli')
    const relaisPapier = new Set(actifs.flatMap((i) => i.relaisPapier))
    const enLigne = RELAIS.filter((r) => r.statut !== 'en_activation' && !relaisPapier.has(r.nom)).length
    const ouverts = RELAIS.filter((r) => r.statut !== 'en_activation').length
    const l: ServiceEtat[] = [
      { id: 'api', nom: 'API BelivaY', detail: '99,98 % sur 30 jours · 180 ms', etat: 'normal' },
      { id: 'paiement', nom: 'Paiements · agrégateur', detail: 'Mobile Money · confirmation en 7 s', etat: 'normal' },
      { id: 'paiement-secours', nom: 'Paiements · agrégateur de secours', detail: 'Prêt · testé ce matin à 8 h', etat: 'normal' },
      { id: 'carte', nom: 'Carte de la diaspora', detail: 'Après le lancement : corridor fermé', etat: 'ferme' },
      { id: 'sms', nom: 'SMS · fournisseur principal', detail: 'Un renvoi de code en échec depuis 14 h', etat: communicationDemo.lire().envois.some((e) => e.statut === 'echec') ? 'degrade' : 'normal' },
      { id: 'push', nom: 'Notifications push', detail: '99,7 % délivrées', etat: 'normal' },
      { id: 'cartes', nom: 'Carte et itinéraires', detail: 'Tuiles et calcul des tournées', etat: 'normal' },
      { id: 'preuves', nom: 'Stockage des preuves', detail: relaisPapier.size ? 'Preuves du relais en file, envoyées au retour du réseau' : 'Aucune preuve en attente', etat: 'normal' },
      { id: 'relais', nom: 'Réseau des relais', detail: `${enLigne} relais ouverts en ligne sur ${ouverts}`, etat: enLigne < ouverts ? 'degrade' : 'normal' },
    ]
    return repondre(l)
  },
  async incidents() {
    exigerPage('panne', 'Diffusion de panne')
    return repondre([...communicationDemo.lire().incidents].filter((i) => i.zones.some((z) => dansPerimetre(z))).sort((a, b) => b.declareLe - a.declareLe))
  },
  async declarer(d) {
    exigerPanne()
    if (!d.service.trim()) return { ok: false, raison: 'service' }
    if (!d.zones.length) return { ok: false, raison: 'zones' }
    if (zonesVisibles() && !d.zones.every((z) => dansPerimetre(z))) return { ok: false, raison: 'perimetre' }
    if (!motifValable(d.consignes)) return { ok: false, raison: 'motif_court' }
    if (contenuInterdit(d.consignes)) return { ok: false, raison: 'contenu' }
    const n = maintenant()
    const jour = new Date(n + HEURE).toISOString().slice(2, 10).replace(/-/g, '')
    const deJour = communicationDemo.lire().incidents.filter((i) => i.id.startsWith(`INC-${jour}-`)).length
    const iid = `INC-${jour}-${String(deJour + 1).padStart(2, '0')}`
    const par = nomCourant()
    communicationDemo.ecrire((s) =>
      s.incidents.unshift({ id: iid, service: d.service.trim(), zones: d.zones, detecteLe: Math.min(d.detecteLe, n), declareLe: n, par, effets: d.effets, consignes: d.consignes.trim(), etat: 'declare', papierLe: null, relaisPapier: [], retabliLe: null, closLe: null, accuses: APPS.map((app, i) => ({ app, le: n + [0, 40, 75, 110, 150, 190][i] * 1000 })), remises: [], rapport: null, journal: [{ le: n, quoi: 'Déclarée et diffusée : bandeau dans les six applications, délais suspendus', par }] }),
    )
    publier({ type: 'panne', id: iid, etat: 'declare', zones: d.zones, message: d.consignes.trim(), relais: [] }, `admin-incident-${iid}-declare`, n)
    await journaliser({ action: 'panne.declarer', objet: `${iid} · ${d.service.trim()}`, motif: d.consignes.trim(), zone: d.zones[0] })
    return { ok: true, id: iid }
  },
  async passerPapier(iid, relais) {
    const i = trouverIncident(iid)
    exigerPanne(i)
    if (!i || i.etat !== 'declare') return { ok: false, raison: 'etat' }
    const valables = relais.filter((r) => RELAIS.some((x) => x.nom === r && i.zones.includes(x.zone)))
    if (!valables.length) return { ok: false, raison: 'zones' }
    const n = maintenant()
    changerIncident(iid, (x) => {
      x.etat = 'papier'
      x.papierLe = n
      x.relaisPapier = valables
      x.journal.push({ le: n, quoi: `Mode papier : ${valables.join(', ')}`, par: nomCourant() })
    })
    publier({ type: 'panne', id: iid, etat: 'papier', zones: i.zones, message: i.consignes, relais: valables }, `admin-incident-${iid}-papier`, n)
    await journaliser({ action: 'panne.papier', objet: `${iid} · ${valables.join(', ')}`, zone: i.zones[0] })
    return { ok: true }
  },
  async mettreAJour(iid, consignes) {
    const i = trouverIncident(iid)
    exigerPanne(i)
    if (!i || i.etat === 'clos' || i.etat === 'retabli') return { ok: false, raison: 'etat' }
    if (!motifValable(consignes)) return { ok: false, raison: 'motif_court' }
    if (contenuInterdit(consignes)) return { ok: false, raison: 'contenu' }
    const n = maintenant()
    changerIncident(iid, (x) => {
      x.consignes = consignes.trim()
      x.journal.push({ le: n, quoi: 'Message et consignes mis à jour, rediffusés', par: nomCourant() })
    })
    publier({ type: 'panne', id: iid, etat: 'maj', zones: i.zones, message: consignes.trim(), relais: i.relaisPapier }, `admin-incident-${iid}-maj-${n}`, n)
    await journaliser({ action: 'panne.mettre_a_jour', objet: iid, motif: consignes.trim(), zone: i.zones[0] })
    return { ok: true }
  },
  async retablir(iid) {
    const i = trouverIncident(iid)
    exigerPanne(i)
    if (!i || (i.etat !== 'declare' && i.etat !== 'papier')) return { ok: false, raison: 'etat' }
    const n = maintenant()
    changerIncident(iid, (x) => {
      x.etat = 'retabli'
      x.retabliLe = n
      // Le gérant ressaisit son registre à la reconnexion (code redonné par le client) ; une remise à un tiers attend sa relance.
      for (const r of x.remises) if (r.porteur === 'client') r.ressaisieLe = n
      x.journal.push({ le: n, quoi: 'Service rétabli : paiements rouverts, délais relancés et prolongés, message de reprise', par: nomCourant() })
    })
    publier({ type: 'panne', id: iid, etat: 'retabli', zones: i.zones, message: 'REPRISE', relais: i.relaisPapier }, `admin-incident-${iid}-retabli`, n)
    await journaliser({ action: 'panne.retablir', objet: iid, zone: i.zones[0] })
    return { ok: true }
  },
  async relancerRessaisie(iid, rid) {
    const i = trouverIncident(iid)
    exigerPanne(i)
    const r = i?.remises.find((x) => x.id === rid)
    if (!i || !r || r.ressaisieLe !== null || i.etat !== 'retabli') return { ok: false, raison: 'etat' }
    const n = maintenant()
    changerIncident(iid, (x) => {
      const y = x.remises.find((z) => z.id === rid)!
      y.relances++
      y.ressaisieLe = n // démonstration : le gérant ressaisit dès la relance
      x.journal.push({ le: n, quoi: `Relance de la ressaisie ${y.etiquette} : ressaisie faite par le gérant`, par: nomCourant() })
    })
    publier({ type: 'ressaisie_relancee', incident: iid, remise: rid, relais: r.relais }, `admin-ressaisie-${iid}-${rid}`, n)
    await journaliser({ action: 'panne.relancer_ressaisie', objet: `${iid} · ${r.etiquette}`, zone: i.zones[0] })
    return { ok: true }
  },
  async ecrireRapport(iid, rapport) {
    const i = trouverIncident(iid)
    exigerPanne(i)
    if (!i || i.etat !== 'retabli') return { ok: false, raison: 'etat' }
    if ([rapport.cause, rapport.effets, rapport.change].some((x) => !motifValable(x))) return { ok: false, raison: 'motif_court' }
    if ([rapport.cause, rapport.effets, rapport.change].some((x) => contenuInterdit(x))) return { ok: false, raison: 'contenu' }
    changerIncident(iid, (x) => {
      x.rapport = { cause: rapport.cause.trim(), effets: rapport.effets.trim(), change: rapport.change.trim() }
      x.journal.push({ le: maintenant(), quoi: 'Rapport de clôture enregistré', par: nomCourant() })
    })
    await journaliser({ action: 'panne.rapport', objet: iid, zone: i.zones[0] })
    return { ok: true }
  },
  async clore(iid) {
    const i = trouverIncident(iid)
    exigerPanne(i)
    if (!i) return { ok: false, raison: 'etat' }
    const p = peutClore(i, maintenant())
    if (p !== 'ok') return { ok: false, raison: p }
    const n = maintenant()
    changerIncident(iid, (x) => {
      x.etat = 'clos'
      x.closLe = n
      x.journal.push({ le: n, quoi: 'Incident clos', par: nomCourant() })
    })
    publier({ type: 'panne', id: iid, etat: 'clos', zones: i.zones, message: '', relais: [] }, `admin-incident-${iid}-clos`, n)
    await journaliser({ action: 'panne.clore', objet: iid, zone: i.zones[0] })
    return { ok: true }
  },

  // ── Support ──────────────────────────────────────────────────────────────────────────────────────────────────────
  async tickets() {
    exigerPage('support', 'Support')
    return repondre([...communicationDemo.lire().tickets].sort((a, b) => (a.etat === 'resolue' ? 1 : 0) - (b.etat === 'resolue' ? 1 : 0) || a.echeance - b.echeance))
  },
  async rattacher(tid, ref) {
    exigerGeste('support', 'Répondre aux demandes', ['support'])
    const t = trouverTicket(tid)
    if (!t) return { ok: false, raison: 'inconnu' }
    if (!REF_VALABLE.test(ref.trim())) return { ok: false, raison: 'non_rattache' }
    const libelle = t.proposition?.ref === ref.trim() ? t.proposition.libelle : ref.trim()
    changerTicket(tid, (x) => {
      x.rattache = { ref: ref.trim(), libelle }
      x.messages.push({ le: maintenant(), de: 'systeme', auteur: nomCourant(), texte: `Demande rattachée à ${ref.trim()}.` })
      if (x.etat === 'nouvelle') x.etat = 'en_cours'
    })
    await journaliser({ action: 'support.rattacher', objet: `${tid} · ${ref.trim()}`, zone: t.zone ?? undefined })
    return { ok: true }
  },
  async preparerReponse(tid, reponseType, texte) {
    exigerGeste('support', 'Répondre aux demandes', ['support'])
    const t = trouverTicket(tid)
    if (!t || t.etat === 'resolue') return { ok: false, raison: 'etat' }
    if (!texte.trim()) return { ok: false, raison: 'vide' }
    if (contenuInterdit(texte)) return { ok: false, raison: 'contenu' }
    changerTicket(tid, (x) => void (x.brouillon = { reponseType, texte: texte.trim() }))
    return { ok: true }
  },
  async envoyerReponse(tid) {
    exigerGeste('support', 'Répondre aux demandes', ['support'])
    const t = trouverTicket(tid)
    if (!t || t.etat === 'resolue' || !t.brouillon) return { ok: false, raison: 'etat' }
    if (!t.rattache) return { ok: false, raison: 'non_rattache' }
    if (contenuInterdit(t.brouillon.texte)) return { ok: false, raison: 'contenu' }
    const n = maintenant()
    const texte = t.brouillon.texte
    changerTicket(tid, (x) => {
      x.messages.push({ le: n, de: 'support', auteur: nomCourant(), texte })
      x.premiereReponseLe ??= n
      x.brouillon = null
      x.etat = 'en_cours'
    })
    publier({ type: 'support_reponse', ticket: tid, espace: t.espace, texte }, `admin-support-${tid}-${n}`, n)
    await journaliser({ action: 'support.repondre', objet: `${tid} · ${t.rattache.ref}`, zone: t.zone ?? undefined })
    return { ok: true }
  },
  async resoudre(tid) {
    exigerGeste('support', 'Répondre aux demandes', ['support'])
    const t = trouverTicket(tid)
    if (!t || t.etat === 'resolue') return { ok: false, raison: 'etat' }
    if (!t.rattache) return { ok: false, raison: 'non_rattache' }
    changerTicket(tid, (x) => {
      x.etat = 'resolue'
      x.messages.push({ le: maintenant(), de: 'systeme', auteur: nomCourant(), texte: 'Demande résolue.' })
    })
    await journaliser({ action: 'support.resoudre', objet: `${tid} · ${t.rattache.ref}`, zone: t.zone ?? undefined })
    return { ok: true }
  },
  async accorderGeste(tid, motif) {
    exigerGeste('support', 'Accorder un geste commercial', ['support'])
    const t = trouverTicket(tid)
    if (!t) return { ok: false, raison: 'inconnu' }
    if (!t.rattache || !t.dossier) return { ok: false, raison: 'non_rattache' }
    if (t.geste) return { ok: false, raison: 'deja_geste' }
    if (!gestePossible(t.dossier.commission)) return { ok: false, raison: 'geste_depasse' }
    // Plafond du niveau de l'agent (ACCES-CONSOLE § 2) : un geste au-delà revient à un Senior ou à la Direction.
    const plafond = etatMembre(agentCourant().id)?.perimetre.plafond
    if (roleCourant() !== 'superviseur' && plafond != null && R.gesteMontant > plafond) return { ok: false, raison: 'geste_depasse' }
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const n = maintenant()
    changerTicket(tid, (x) => {
      x.geste = { montant: R.gesteMontant, le: n, par: nomCourant(), moyen: x.dossier!.moyen }
      x.messages.push({ le: n, de: 'systeme', auteur: 'BelivaY', texte: 'Geste commercial accordé, remboursé vers le moyen de paiement d’origine.' })
    })
    publier({ type: 'geste', ticket: tid, ref: t.rattache.ref, montant: R.gesteMontant }, `admin-geste-${tid}`, n)
    await journaliser({ action: 'support.geste', objet: `${tid} · ${t.rattache.ref}`, motif: motif.trim(), zone: t.zone ?? undefined })
    return { ok: true }
  },
  async reponsesTypes() {
    exigerPage('support', 'Support')
    return repondre(REPONSES)
  },
  async articles() {
    exigerPage('support', 'Support')
    const versions = pilotageDemo.lire().versions
    const maj = communicationDemo.lire().articles
    return repondre(
      ARTICLES.map((a) => {
        const majLe = maj[a.id] ?? a.majLe
        const v = versions.filter((x) => a.regles.includes(x.code) && x.creeLe > majLe).sort((x, y) => y.version - x.version)[0]
        return { ...a, majLe, signale: v ? `${v.code} · v${v.version}` : null }
      }),
    )
  },
  async mettreAJourArticle(aid) {
    exigerGeste('support', 'Mettre à jour un article', ['superviseur', 'support'])
    const a = ARTICLES.find((x) => x.id === aid)
    if (!a) return { ok: false, raison: 'inconnu' }
    communicationDemo.ecrire((s) => void (s.articles[aid] = maintenant()))
    await journaliser({ action: 'aide.mettre_a_jour', objet: `${aid} · ${a.titre}` })
    return { ok: true }
  },
}

// ── États vivants lus par la File d'action et les compteurs (filtrés par l'appelant) ────────────────────────────────
/** Demandes du support non résolues. */
export const demandesSupport = () => communicationDemo.lire().tickets.filter((t) => t.etat !== 'resolue')
/** Messages critiques (criticité 1) non délivrés. */
export const critiquesNonDelivres = () => communicationDemo.lire().envois.filter((e) => e.criticite === 1 && (e.statut === 'echec' || e.statut === 'en_cours'))
/** Incidents de service en cours (déclarés, mode papier, rétablis non clos). */
export const incidentsActifs = () => communicationDemo.lire().incidents.filter((i) => i.etat !== 'clos')

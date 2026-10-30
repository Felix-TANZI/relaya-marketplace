// DONNÉES DE DÉMONSTRATION — domaine « aide » : les dix questions de VD11-R63 (réponses de VD11-R65, montants calculés
// par src/calculs), produits interdits (VD11-R64), coordonnées et réseaux officiels de BelivaY (site/src/config/
// coordonnees.ts, consigne du porteur du 5 oct.), conseil de la semaine.
import { calculerCommission20 } from './commission20'
import type { DomaineAide, QuestionAide } from '../donnees/domaines/aide'
import { COORDONNEES } from '@client/config/coordonnees'
import { familleDe } from '../calculs/commission'
import { PARAMETRES } from '../calculs/registre'
import { ARTICLES, BOUTIQUE } from './jeu-essai'
import { estProprietaire } from './session'
import { repondre } from './stockage'

const itel = ARTICLES['itel-noir']
const ligne = () => [{ famille: familleDe(itel.categorie, PARAMETRES.commission), prixUnitaire: itel.prix }]
const garde = (palier: 'Bronze' | 'Argent') => calculerCommission20(ligne(), palier, true, PARAMETRES.commission).garde
const A = PARAMETRES.paliers.conditions.Argent

const QUESTIONS = (): QuestionAide[] => [
  { id: 'q1', theme: 'argent', question: 'Quand suis-je payé ?', reponse: { modele: 'Chaque vendredi avant 12 h, sans frais et sans minimum, pour tout ce qui s’est libéré avant jeudi minuit. Vous n’avez rien à demander.' }, ecran: 'versements', lien: 'Voir mes versements' },
  { id: 'q2', theme: 'argent', question: 'Combien je garde sur une vente ?', reponse: { modele: 'Chaque commande affiche « Vous gardez » avant que vous la prépariez. Exemple : un ITEL AC52 vendu {prix}, vous gardez {garde}.', montants: { prix: itel.prix, garde: garde('Bronze') } }, ecran: 'argent', lien: 'Voir mon argent' },
  { id: 'q3', theme: 'argent', question: 'Pourquoi mon argent est-il gelé ?', reponse: { modele: 'Un litige, un retour ou une vérification est en cours sur la commande. L’argent se libère dès que le dossier est réglé.' }, ecran: 'gele', lien: 'Voir l’argent gelé' },
  { id: 'q4', theme: 'commandes', question: 'Je n’ai plus le produit : que faire ?', reponse: { modele: 'Ouvrez la commande et touchez « Rupture », le plus tôt possible. BelivaY confie la commande à un autre vendeur. Signaler tôt coûte peu.' }, ecran: 'commandes', lien: 'Voir mes commandes' },
  { id: 'q5', theme: 'commandes', question: 'Le livreur ne vient pas', reponse: { modele: 'Votre délai est suspendu jusqu’à son prochain passage : aucun effet pour vous. Gardez le colis prêt.' }, ecran: 'horaires', lien: 'Voir le passage du livreur' },
  { id: 'q6', theme: 'litiges', question: 'Un client ouvre un litige : que faire ?', reponse: { modele: 'Répondez dans les 48 h : acceptez, contestez avec vos preuves, ou proposez un arrangement. Sans réponse, BelivaY décide en partant de ce que dit le client.' }, ecran: 'litiges', lien: 'Voir mes litiges' },
  { id: 'q7', theme: 'retours', question: 'Un produit me revient : que faire ?', reponse: { modele: 'Inspectez-le dans les 48 h après réception. Si le défaut est réel : remboursement, ou remplacement sous 72 h ouvrées. Le trajet retour de 500 F et la livraison remboursée sont alors à votre charge.' }, ecran: 'retours', lien: 'Voir mes retours' },
  {
    id: 'q8', theme: 'palier', question: 'Comment passer au palier Argent ?',
    reponse: estProprietaire()
      ? { modele: 'Trois conditions, tenues {j} jours : Trust Score {s} au moins, {n} commandes livrées, note de {note} au moins. Vous garderez alors {argent} au lieu de {bronze} par ITEL.', valeurs: { j: PARAMETRES.paliers.monteeJours, s: A.trustScore, n: A.commandesLivrees, note: A.note.texte().replace('.', ',') }, montants: { argent: garde('Argent'), bronze: garde('Bronze') } }
      : { modele: 'Trois conditions, tenues {j} jours : Trust Score {s} au moins, {n} commandes livrées, note de {note} au moins.', valeurs: { j: PARAMETRES.paliers.monteeJours, s: A.trustScore, n: A.commandesLivrees, note: A.note.texte().replace('.', ',') } },
    ecran: 'palier', lien: 'Voir mon palier',
  },
  { id: 'q9', theme: 'boutique', question: 'Qui voit le nom de ma boutique ?', reponse: { modele: 'Vous et BelivaY seulement. Le client voit « Vendeur certifié {palier} · Trust Score {score} », rien d’autre.', valeurs: { palier: BOUTIQUE.palier, score: Math.round(BOUTIQUE.trustScore) } }, ecran: 'boutique', lien: 'Voir ce que voit le client' },
  { id: 'q10', theme: 'produits', question: 'Quels produits sont interdits ?', reponse: { modele: 'Une offre sur ces produits est refusée et peut mener à l’exclusion.' }, ecran: null, lien: null },
]

const INTERDITS = ['Armes, munitions et explosifs', 'Drogues et médicaments', 'Contrefaçons et copies de marque', 'Produits volés ou sans preuve d’origine', 'Espèces protégées : ivoire, écailles, peaux', 'Documents officiels et moyens de paiement']
const nrm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export const demoAide: DomaineAide = {
  questions: (r) => {
    const q = QUESTIONS().filter((x) => estProprietaire() || x.theme !== 'argent')
    const m = r?.trim() ? nrm(r.trim()) : ''
    return repondre(m ? q.filter((x) => nrm(x.question + ' ' + x.reponse.modele + (x.id === 'q10' ? ' ' + INTERDITS.join(' ') : '')).includes(m)) : q)
  },
  produitsInterdits: () => repondre(INTERDITS),
  contacts: () =>
    repondre({
      telephone: COORDONNEES.telephone,
      telephoneLien: COORDONNEES.telephoneLien,
      email: COORDONNEES.email,
      whatsapp: COORDONNEES.whatsapp,
      horaires: ['07:00', '21:00'],
      delaiReponseH: 2,
      responsablePlatine: true,
      reseaux: COORDONNEES.reseaux.map((r) => ({ ...r })),
    }),
  conseil: () => repondre({ titre: 'Des photos à la lumière du jour', texte: 'Posez le produit près d’une fenêtre, sur un fond uni. Une photo nette rassure le client et vend plus.', publieLe: '2026-10-06' }),
}

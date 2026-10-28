// DONNÉES DE DÉMONSTRATION — domaine « aide » : fiches (versionnées par BelivaY), numéros d'urgence du Cameroun (espace
// pays, LIV-08-R19 ; à vérifier en console avant la production, S-07), et le SOS simulé : l'entreprise est appelée,
// puis le support après APPEL_SUPPORT_S secondes sans réponse ; le partage s'arrête seul à son échéance.
import type { Aide, DomaineAide, EtatSOS, Fiche } from '../donnees/domaines/aide'
import { entier, parametre } from './horsligne'
import { maintenant } from './horloge'
import { yaounde } from '../calculs/temps'
import { publier } from './pont'
import { magasin, repondre } from './stockage'

const APPEL_SUPPORT_S = 25

const F = (id: string, sujet: Fiche['sujet'], titre: string, etapes: string[], interdit: string | null, consequence: string | null, action: Fiche['action'], regle: string): Fiche => ({ id, sujet, titre, etapes, interdit, consequence, action, regle })
const TOURNEE = { route: 'tournee', libelle: 'Ouvrir ma tournée' }
const declarer = (famille: string) => ({ route: 'incident', libelle: 'Déclarer cet incident', params: { famille } })

const FICHES: Fiche[] = [
  F('ramassage', 'tournee', 'Le ramassage chez le vendeur', ['Touchez « Je suis arrivé » devant la boutique : votre position part avec l’heure.', 'Montrez votre écran, votre nom et votre photo, au vendeur.', 'Contrôlez chaque colis : photo 1, l’article à découvert ; photo 2, le colis fermé, scellé et étiqueté.', 'Saisissez le code de remise que le vendeur vous donne : la garde passe à vous.'], 'Prendre un colis sans ses deux photos ni le code.', 'Sans preuve, la responsabilité du colis revient à celui qui devait la produire.', TOURNEE, 'LIV-MOD-05'),
  F('depot', 'tournee', 'Le dépôt au point relais', ['Présentez le QR de dépôt au gérant, ou dictez-lui le code de dépôt à 6 chiffres.', 'Le gérant contrôle chaque colis : contrôlé, avec réserve ou absent.', 'Confirmez le lot : la garde passe au relais à cet instant.'], 'Partir sans avoir confirmé le lot.', 'Un lot non confirmé à temps passe « à confirmer » et le support est alerté.', TOURNEE, 'LIV-P16R-01'),
  F('domicile', 'tournee', 'La remise à domicile', ['Appelez le client par l’appel masqué en partant vers lui.', 'Demandez son code de livraison : il le lit dans son application.', 'Saisissez le code, puis prenez la photo de remise.'], 'Remettre sans code, ou demander le code par message.', 'Sans code ni photo, la remise n’est pas prouvée.', TOURNEE, 'DED-16'),
  F('relais-ferme', 'incidents', 'Le relais est fermé à votre arrivée', ['Photographiez la devanture : l’heure et la position partent avec la photo.', 'Déclarez l’incident « Relais fermé » (famille Au relais).', 'N’attendez pas devant la porte : le système désigne un relais de secours ou le retour au point de stockage.', 'Suivez la nouvelle tournée, colis sous garde, pochettes fermées.'], 'Laisser un colis à un voisin ou à un commerçant.', 'Si le relais est en faute, l’incident compte sur son score, jamais sur le vôtre.', declarer('relais'), 'LIV-10-R36'),
  F('boutique-fermee', 'incidents', 'La boutique est fermée', ['Photographiez la devanture.', 'Déclarez « Boutique fermée » (famille Chez le vendeur).', 'Le système relance le vendeur, puis dissocie l’arrêt si besoin : vous ne dissociez rien.'], 'Sauter l’arrêt sans incident validé.', 'Le retard du vendeur ne compte pas sur votre Ponctualité.', declarer('vendeur'), 'LIV-08-R15'),
  F('panne', 'incidents', 'Panne ou crevaison en route', ['Mettez-vous à l’abri avec les colis.', 'Déclarez « Panne » ou « Crevaison » (famille En route).', 'Votre entreprise désigne un remplaçant : remettez-lui chaque colis en main propre ; il les scanne un par un.'], 'Confier un colis à un tiers.', 'Un incident validé n’a aucun effet sur votre Trust Score.', declarer('route'), 'LIV-08-R18'),
  F('code-refuse', 'incidents', 'Le code de remise est refusé', ['Vérifiez avec le vendeur qu’il lit le code de cette commande.', 'Après trop d’essais faux, le code est bloqué : le vendeur demande lui-même un nouveau code.', 'Ne partez jamais avec le colis sans code validé.'], 'Demander ou donner un code par message.', 'Sans code validé, la garde reste au vendeur.', declarer('vendeur'), 'LIV-PRV-01'),
  F(
    'interdits',
    'interdits',
    'Les interdits de la charte',
    [
      'Recevoir de l’argent ou un pourboire, sous quelque forme que ce soit.',
      'Ouvrir un colis, sauf à la demande d’une autorité (photo, puis nouveau scellé).',
      'Laisser un colis à un tiers, ou rentrer chez soi avec un colis.',
      'Sauter ou intervertir un arrêt sans incident validé.',
      'Déclarer un incident fictif.',
      'Envoyer une photo de colis ou un code par message.',
      'Contacter un client ou un vendeur hors de l’application.',
      'Changer l’heure du téléphone ou chercher à vider la file d’envoi.',
      'Prêter son compte ou son téléphone connecté.',
      'Conduire un véhicule non déclaré.',
      'Résister à une agression pour protéger un colis.',
      'Faire faire ses missions par un tiers.',
    ],
    null,
    'Un manquement grave entraîne une sanction validée par un humain, avec un motif écrit ; un recours est toujours possible.',
    null,
    'LIV-SAN-01',
  ),
  F('agression', 'securite', 'Agression ou menace', ['Ne résistez jamais : aucun colis ne vaut votre sécurité.', 'Dès que possible, maintenez le bouton SOS : votre entreprise, puis le support, sont appelés.', 'Déclarez ensuite l’incident « Agression » ; la plainte se fait avec votre entreprise.'], 'Poursuivre l’agresseur.', 'Aucune retenue sur vous : la perte se règle entre BelivaY, votre entreprise et son assurance.', declarer('securite'), 'LIV-P30R-03'),
  F('pluie', 'securite', 'Rouler sous la pluie', ['Protégez les colis : pochettes fermées, jamais posées au sol mouillé.', 'Ralentissez ; si la route devient dangereuse, arrêtez-vous à l’abri.', 'Déclarez « Pluie forte » : le délai est recalculé.'], 'Rouler sans casque.', 'Un retard déclaré à temps ne pèse pas sur votre Ponctualité.', declarer('route'), 'LIV-CON-05'),
  F('conduite', 'securite', 'Tenue et conduite', ['Casque attaché, tenue propre.', 'Respectez le code de la route : une infraction relève de vous et de votre entreprise.', 'Arrêtez-vous pour lire l’écran ou passer un appel.'], 'Transporter un colis ouvert.', null, null, 'LIV-CON-06'),
  F('sans-reseau', 'sans_reseau', 'Travailler sans réseau', ['Votre tournée, vos cartes et vos consignes sont déjà sur le téléphone.', 'Chaque geste garde son heure et sa position, puis part au retour du réseau.', 'Suivez la file d’envoi dans Synchronisation.'], 'Désinstaller l’application ou changer l’heure du téléphone avec une file non vide.', 'Un élément non envoyé à temps expire : il reste signalé, jamais effacé.', { route: 'synchronisation', libelle: 'Voir la file d’envoi' }, 'LIV-P22R-01'),
  F('telephone-perdu', 'sans_reseau', 'Téléphone perdu ou volé', ['Prévenez tout de suite votre entreprise.', 'Le support bloque l’appareil ; vos preuves déjà envoyées sont gardées.', 'Sur un nouveau téléphone, reconnectez-vous avec le code SMS.'], 'Utiliser le téléphone d’un autre livreur.', 'Une preuve restée sur l’ancien téléphone est perdue : synchronisez souvent.', { route: 'messages', libelle: 'Écrire à mon entreprise', params: { fil: 'F1' } }, 'LIV-P01R-03'),
  F('zero-espece', 'zero_espece', 'Aucun argent', ['Toute commande est payée en ligne avant la course.', 'Vous remettez le colis avec le code et la photo, rien d’autre.', 'Vous ne recevez jamais d’argent, sous aucune forme.'], 'Accepter de l’argent ou un pourboire, sous quelque forme que ce soit.', 'Une demande d’argent est une faute grave (sanction de niveau 3).', null, 'LIV-MOD-01'),
]

const URGENCES = [
  { numero: '119', service: 'SAMU' },
  { numero: '118', service: 'Sapeurs-pompiers' },
  { numero: '117', service: 'Police secours' },
  { numero: '113', service: 'Gendarmerie' },
]

const regles = () => ({ appuiS: entier('LIV-SOS-APPUI-S'), partageMin: entier('LIV-SOS-POSITION-MIN'), intervalleS: entier('SOS-POSITION-S') })

const etatSos = magasin<EtatSOS[]>('aide_sos', () => [])

function aide(): Aide {
  const wa = parametre('SUP-WA', '.+')[0]
  return {
    fiches: FICHES,
    misesAJourLe: yaounde(2026, 10, 9, 6, 0),
    urgences: URGENCES,
    entreprise: 'Yafé Express',
    whatsappSupport: /^\+?\d[\d\s]+$/.test(wa) ? wa : null,
    horairesSupport: parametre('SUP-HORAIRES', '.+')[0],
    delaiSupport: parametre('SUP-DELAI', '.+')[0],
    sos: regles(),
  }
}

/** État d'un SOS à l'instant t : support appelé après le silence de l'entreprise ; arrêt automatique à l'échéance. */
function vue(s: EtatSOS, t: number): EtatSOS {
  if (s.arreteA === null && t >= s.partageJusqua) return { ...s, arreteA: s.partageJusqua, arret: 'automatique' }
  if (s.arreteA === null && t >= s.depuis + APPEL_SUPPORT_S * 1000) return { ...s, appels: [{ vers: 'entreprise', etat: 'sans_reponse' }, { vers: 'support', etat: 'en_cours' }] }
  return s
}

export const demoAide: DomaineAide = {
  aide: () => repondre(aide()),
  sosEnCours() {
    const l = etatSos.lire()
    return repondre(l.length ? vue(l[l.length - 1], maintenant()) : null)
  },
  sos(origine, enLigne) {
    const l = etatSos.lire()
    const t = origine.heure
    if (l.some((s) => vue(s, t).arreteA === null)) return repondre({ ok: false as const, raison: 'deja_en_cours' as const })
    const id = 'SOS-' + String(l.length + 1).padStart(3, '0')
    etatSos.ecrire((x) => void x.push({ id, depuis: t, partageJusqua: t + regles().partageMin * 60_000, appels: [{ vers: 'entreprise', etat: 'en_cours' }, { vers: 'support', etat: 'a_venir' }], positions: origine.position ? 1 : 0, derniere: origine.position, arreteA: null, arret: null, horsLigne: !enLigne }))
    // L'entreprise le voit en temps réel : dossier Sécurité, priorité absolue (src/demo/pont.ts).
    publier({ type: 'incident', id, paquetId: null, lieu: origine.position ? 'Position partagée' : null, famille: 'securite', genre: 'sos', note: 'SOS déclenché depuis l’application : appel à l’entreprise puis au support BelivaY, position partagée.', bloquant: true }, 'sos-' + id, t)
    return repondre({ ok: true as const, id })
  },
  async positionSOS(id, p) {
    etatSos.ecrire((x) => x.forEach((s) => s.id === id && s.arreteA === null && ((s.positions += 1), (s.derniere = p))))
  },
  arreterSOS(id, origine) {
    const s = etatSos.lire().find((x) => x.id === id)
    if (!s || vue(s, origine.heure).arreteA !== null) return repondre({ ok: false as const, raison: 'deja_arrete' as const })
    etatSos.ecrire((x) => x.forEach((y) => y.id === id && ((y.arreteA = origine.heure), (y.arret = 'livreur'))))
    return repondre({ ok: true as const })
  },
}

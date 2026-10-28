// Fiches de travail de l'Aide (ancienne page « Apprendre », AJ-L, motif M14 ; fusionnée dans l'Aide par DP-66) : ce
// que le livreur fait à chaque étape, et pourquoi. Le texte suit les règles des écrans (LIV-06 à LIV-09, LIV-P11 à
// LIV-P26) ; les nombres viennent des règles servies par le serveur (ReglesLivreur : `{codeEssais}`, `{auditMaxMin}`…),
// jamais écrits ici. Ouverte par `aide?geste=<id>` depuis l'écran concerné (« Pourquoi ? », « La fiche qui l'explique »).
export interface FicheApprendre {
  id: string
  titre: string
  icone: string
  ton: string
  resume: string
  etapes: string[] // une consigne par ligne, valeurs entre accolades
  pourquoi: string
  ecran?: { route: string; titre: string } // l'écran où cela se fait
}

export const FICHES: FicheApprendre[] = [
  {
    id: 'controle',
    titre: 'Contrôle au ramassage (C1)',
    icone: 'clipboard-check',
    ton: 'acc',
    resume: 'Devant le vendeur, colis par colis, avant qu’il passe sous votre garde.',
    etapes: [
      'La fiche décrit l’article tel que le vendeur l’a déclaré, jamais son prix.',
      'Cochez vous-même les six vérifications : aucune n’est cochée d’avance.',
      'Boîte scellée par le fabricant : photographiez toutes ses faces sans l’ouvrir. Sinon, sortez le produit pour le contrôler.',
      'Photo 1 avec l’appareil de l’application : nette, horodatée et géolocalisée. Une photo floue est refusée.',
      'Classe dépassée : une photo avec un repère suffit. Le système reclasse le colis ; vous ne saisissez aucun montant.',
      'Comptez {controleMin} à {controleMax} secondes par colis, payées dans la prestation.',
    ],
    pourquoi: 'La photo 1 prouve l’état du colis au moment où il passe sous votre garde : en cas de litige, elle vous protège.',
    ecran: { route: 'tournee', titre: 'Ma tournée' },
  },
  {
    id: 'audit',
    titre: 'Audit par échantillon (C4)',
    icone: 'scan-line',
    ton: 'or',
    resume: 'Un contrôle approfondi tiré par BelivaY, révélé seulement après le contrôle C1.',
    etapes: [
      'Vous ne le connaissez jamais d’avance et vous ne prévenez pas le vendeur.',
      'Quatre vérifications selon la catégorie, puis les photos 2 à 4 dans l’ordre.',
      '{auditMaxMin} minutes au plus, comptées dans la tournée : l’heure limite est recalculée.',
      'Résultat défavorable : refus motivé, BelivaY instruit. Ce n’est jamais une sanction que vous décidez.',
    ],
    pourquoi: 'L’échantillon protège les clients sans ralentir chaque ramassage : plus un vendeur est fiable, plus l’audit est rare.',
  },
  {
    id: 'scelle',
    titre: 'Emballage, étiquette et scellé',
    icone: 'package-check',
    ton: 'acc',
    resume: 'Le colis se ferme devant le vendeur, avec le kit BelivaY.',
    etapes: [
      'Prenez le format conseillé ; un autre format demande un motif.',
      'Le vendeur peut aider à caler, jamais fermer ni étiqueter.',
      'L’étiquette se lie définitivement à la commande. Zone manuscrite : le code de zone et l’initiale du relais, jamais un nom.',
      'Scellé en trois gestes, puis photo 2 : colis fermé, scellé, étiquette lisible.',
      'Emballage manquant : signalez un incident. Le colis reste chez le vendeur ; jamais d’emballage improvisé, vous ne payez rien.',
    ],
    pourquoi: 'Un scellé intact jusqu’au client prouve que personne n’a ouvert le colis en route.',
    ecran: { route: 'kit', titre: 'Mon kit d’emballage' },
  },
  {
    id: 'remise',
    titre: 'Code de remise du vendeur',
    icone: 'key-round',
    ton: 'blue',
    resume: 'La garde passe à votre entreprise quand le vendeur tape lui-même son code.',
    etapes: [
      'Tendez votre téléphone : le vendeur tape son code. Ne le demandez jamais à l’avance, ne le notez pas.',
      'Quatre conditions : photo 1, photo 2, étiquette liée et code correct.',
      '{codeEssais} essais, puis blocage de {codeBlocageH} h et incident automatique : vous ne partez pas avec le colis.',
      'Code validé : la responsabilité passe à votre entreprise, horodatée à la seconde.',
    ],
    pourquoi: 'Le code du vendeur prouve qu’il vous a bien remis ce colis : personne ne peut dire ensuite qu’il ne l’a jamais donné.',
  },
  {
    id: 'domicile',
    titre: 'Remise à domicile',
    icone: 'home',
    ton: 'acc',
    resume: 'Le client tape son code ; vous ne voyez ni son nom, ni son numéro, ni un montant.',
    etapes: [
      'Vous voyez le prénom, le quartier et le repère, seulement pendant cet arrêt.',
      'Le client a déjà payé en ligne : vous ne recevez jamais d’argent.',
      'Client absent : attendez {absentAttenteMin} minutes et passez {absentAppels} appels masqués ; le système coche les preuves.',
      'Jamais chez un voisin, un gardien, devant la porte, ni chez vous : le colis repart au relais de la zone.',
    ],
    pourquoi: 'Le code et la photo de remise prouvent la livraison ; le client a déjà payé, aucun argent sur vous.',
  },
  {
    id: 'incidents',
    titre: 'Incidents',
    icone: 'triangle-alert',
    ton: 'or',
    resume: 'Un problème se signale tout de suite : jamais de refus silencieux.',
    etapes: [
      'Le bouton d’incident est en haut de chaque écran.',
      'Choisissez la famille, puis le type : l’écran dit ce qui va se passer avant l’envoi.',
      'Sans réseau, l’incident part en file et la tournée continue.',
      'Danger immédiat : maintenez le bouton SOS. Votre entreprise, puis le support BelivaY, sont appelés.',
    ],
    pourquoi: 'Un incident déclaré à temps vous protège : aucun incident ne vous pénalise automatiquement.',
    ecran: { route: 'incident', titre: 'Signaler un incident' },
  },
  {
    id: 'score',
    titre: 'Faire monter son Trust Score',
    icone: 'gauge',
    ton: 'acc',
    resume: 'Cinq critères : ponctualité, qualité des preuves, litiges, ancienneté, formation.',
    etapes: [
      'Arrivez dans le créneau annoncé ; un retard prévisible se signale avant l’heure.',
      'Des photos nettes et complètes à chaque étape.',
      'Un litige se règle avec vos preuves : votre entreprise répond pour vous.',
      'Gardez votre certification à jour.',
      'Un événement injuste se conteste une fois, dans le délai affiché.',
    ],
    pourquoi: 'Le score mesure la qualité de votre travail ; votre entreprise et BelivaY le voient. Il n’est jamais montré aux clients, aux vendeurs ni aux relais.',
    ecran: { route: 'trust', titre: 'Mon Trust Score' },
  },
  {
    id: 'securite',
    titre: 'Votre code PIN et votre téléphone',
    icone: 'lock-keyhole',
    ton: 'ink',
    resume: 'Un seul téléphone, un PIN à {pinLongueur} chiffres, jamais partagé.',
    etapes: [
      'Ne donnez votre PIN à personne, même à votre entreprise ou au support.',
      '{pinEssais} PIN faux de suite : blocage de {pinBlocageMin} minutes, puis un code SMS.',
      'Changer de téléphone déconnecte l’ancien ; votre entreprise est prévenue.',
      'L’empreinte ouvre l’application, jamais à la place d’un code SMS.',
    ],
    pourquoi: 'Votre téléphone porte les preuves de vos colis : il ne doit s’ouvrir que pour vous.',
    ecran: { route: 'reglages', titre: 'Réglages · sécurité et appareil' },
  },
]

export const fiche = (id: string | null) => FICHES.find((f) => f.id === id) ?? null

# Espace vendeur — échanges avec les autres interfaces

Ce que l'espace vendeur **reçoit** du client, du livreur, du relais et de l'administration (console BelivaY), et ce
qu'il leur **envoie**. Types : `src/donnees/echanges.ts` (`EvenementEntrant`, `EvenementSortant`, `CANAUX_ENTRANTS`,
`CANAUX_SORTANTS`) ; exemples tirés du jeu d'essai : `src/demo/echanges.ts` ; contrat vérifié par
`src/donnees/echanges.test.ts`. Routes sous `/api/vendors/` (Q-51) ; les routes manquantes sont listées dans
`INTEGRATION-API.md` § 8.

## Règles communes

- **Anonymat** (GEN-01, BOU-02, BOU-03) : aucun événement ne porte le nom, le numéro, l'adresse, le quartier, le point
  de retrait ni le total payé du client. Le client ne reçoit jamais le nom, les lieux, la photo ni le téléphone de la
  boutique (VD11-R11) : il voit « Vendeur certifié [palier] · Trust Score ».
- **Transport** : les événements entrants arrivent par un flux unique `GET /events?depuis=<curseur>` (puis
  `GET /events/stream` en SSE), chacun avec un `id` : rejouer le flux ne crée aucun doublon. Le serveur en tire aussi
  les notifications et les SMS (Q-48 : commande, litige, sanction, numéro ; silence de 21 h à 7 h).
- **Gestes sortants** : chacun est déjà une méthode de la `SourceVendeur` (colonne « méthode ») ; le serveur le relaie
  aux interfaces concernées. Hors connexion, la file de l'appareil le rejoue avec `origin_time` (72 h au plus).
- **Droits** : un employé ne reçoit et n'émet que ce que ses droits permettent (`src/donnees/droits.ts`) ; aucun
  montant ne lui parvient (`montant: null`, Q-18). Colonne « droit » : « — » = propriétaire seulement.
- **Signature** : chaque geste sortant est signé par son auteur (membre, rôle) dans le journal de la commande (EQU-03).

## Client

| Sens | Événement | Champs | Route | Écran vendeur | Droit |
|---|---|---|---|---|---|
| ← | `commande_payee` | ref, lignes[{offreId, quantite}], echeance, payableAuRetrait | `GET /events` → `order.paid` | `commande?ref=` | commandes.voir |
| ← | `commande_annulee` | ref, avantRamassage | `order.cancelled` | `commande?ref=` | commandes.voir |
| ← | `question` | questionId, offreId, texte (filtré) | `question.asked` | `questions` | messages.repondre |
| ← | `message` | fil, ref, texte (filtré) | `thread.message` | `messages?fil=` | messages.voir |
| ← | `avis` | avisId, ref, note, commentaire | `review.posted` | `avis` | — |
| ← | `litige_ouvert` | ref, motif (5 motifs client, Q-29), photos, reponseAvant (48 h) | `dispute.opened` | `litige?ref=` | litiges.voir |
| ← | `remplacement_choisi` | ref, accepte (le choix du client vaut accord, Q-30) | `replacement.answered` | `remplacement?ref=` | retours.inspecter |
| → | `prete` | ref, at | `POST /orders/{id}/ready {at}` · `preparation.cestPret` | `commande_prete` | commandes.preparer |
| → | `rupture` | ref, stockAZero | `POST /orders/{id}/out-of-stock` · `preparation.signalerRupture` | `rupture` | commandes.preparer |
| → | `delai` | ref, nouvelleEcheance | `POST /orders/{id}/extend` · `preparation.demanderDelai` | `delai` | commandes.preparer |
| → | `message` | fil, texte (numéros retirés avant l'envoi) | `POST /threads/{id}/messages` · `messages.envoyer` | `messages` | messages.repondre |
| → | `reponse_question` | questionId, texte | `POST /questions/{id}/answer` | `questions` | messages.repondre |
| → | `reponse_litige` | ref, posture (accepte, conteste, arrangement) | `POST /disputes/{id}/answer` · `litiges.repondre` | `litige` | — (Q-17) |
| → | `remplacement_propose` | ref | `POST /returns/{id}/replacement` · `retours.proposer` | `remplacement` | — |

## Livreur

| Sens | Événement | Champs | Route | Écran vendeur | Droit |
|---|---|---|---|---|---|
| ← | `creneau` | ref (ou null : tournée), debut, fin, livreur{nom, societe} | `pickup.slot` | `ramassages` | commandes.remettre |
| ← | `en_route` | ref, arriveeVers | `pickup.en_route` | `commande_remise` | commandes.remettre |
| ← | `code_saisi` | ref, bon, essaisRestants (3 codes faux : bloqué, P-7) | `handover.code_entered` | `commande_remise` | commandes.remettre |
| ← | `remise_faite` | ref, photos, scelle | `handover.done` | `commande` | commandes.voir |
| ← | `absent` | ref, prochainCreneau (l'échéance est suspendue) | `pickup.missed` | `commande` | commandes.remettre |
| → | `code_affiche` / `nouveau_code` | ref | `GET /orders/{id}/handover-code` · `POST …/renew` | `commande_remise` | commandes.remettre |
| → | `colis_non_pret` | ref, raison (en_cours, rupture, boutique_fermee), prochainCreneau | **`POST /orders/{id}/not-ready`** (nouveau) | `commande_remise` | commandes.remettre |
| → | `prete`, `delai` | voir Client (le livreur reçoit aussi le créneau suivant, P-6) | | | |

Le livreur voit le **lieu principal** de la boutique (point, repère, horaires) et, pour un dépôt, le centre BelivaY
choisi ; jamais les autres lieux sans objet pour sa tournée.

## Relais

| Sens | Événement | Champs | Route | Écran vendeur | Droit |
|---|---|---|---|---|---|
| ← | `colis_arrive` | ref (jamais quel relais) | `parcel.at_pickup_point` | `commande` | commandes.voir |
| ← | `colis_retire` | ref, liberationLe | `parcel.collected` | `commande` | commandes.voir |
| ← | `colis_non_retire` | ref, retourVers | `parcel.not_collected` | `commande` | commandes.voir |
| ← | `retour_depose` | ref, motif, inspecterAvant (48 h après réception) | `return.dropped` | `inspection?ref=` | retours.inspecter |
| → | dépôt dans un centre BelivaY | lieu de type `collecte` (`centre`) | `POST /shop/locations {centre}` · `boutique.ajouterLieu` | `emplacement` | — |

## Administration (console BelivaY)

| Sens | Événement | Champs | Route | Écran vendeur | Droit |
|---|---|---|---|---|---|
| → | `demande_modification` | demandeId, champ (nom, officiel, titulaire, autre), valeur, motif, pièces | `POST /shop/change-requests` · `boutique.demanderModification` | `boutique` | — |
| ← | `demande_decidee` | demandeId, decision (acceptee, refusee), motif écrit | `change_request.decided` | `boutique` | — |
| → | `lieu` | lieuId, action (ajoute, deplace, principal, retire) | `/shop/locations…` | `emplacement` | — |
| ← | `lieu_verifie` | lieuId, verifie, motif (agent de zone ; relance après 72 h, Q-91) | `location.verified` | `emplacement?lieu=` | — |
| → | `kyc_pieces` | etape | `POST /shops/{id}/kyc` · `session.envoyerPourVerification` | `kyc` | — |
| ← | `kyc` | etat (accepte, pieces_a_refaire, refuse), motif (S-2) | `kyc.decided` | `kyc` | — |
| ← | `fiche_decidee` | offreId, decision, motif | `offer.reviewed` | `offre_detail` | produits.voir |
| → | `preuve_litige`, `inspection_retour` | ref, pièces ou verdict | `POST /disputes/{id}/evidence` · `POST /returns/{id}/inspection` | `litige`, `inspection` | litiges.preuves, retours.inspecter |
| ← | `litige_decide` | ref, issue, motif, contesterAvant (un recours, 48 h) | `dispute.decided` | `litige_envoye` | litiges.voir |
| ← | `sanction` | decisionId, niveau (1 automatique, 2-4 humains, Q-31), motif, contesterAvant | `sanction.applied` | `sanctions` | — |
| → | `contestation` | decisionId | `POST /account/decisions/{id}/appeal` · `trust.contester` | `contester` | — |
| → | `reponse_avis` | avisId, texte (réponse privée, passe par le support) | `POST /reviews/{id}/private-reply` | `avis` | — |
| → | `fermeture` | jusqua | `POST /shop/closed-today` · `POST /shop/pause` (l'attribution évite la boutique, Q-38) | `horaires` | boutique.fermer |
| ← | `versement` | payoutId, montant (null pour un employé), le | `payout.sent` | `versements` | — |

La console voit aussi l'**équipe** (membres, droits, suspensions, journal) pour une enquête : `GET /shop/members`
côté administration, jamais montré au client.

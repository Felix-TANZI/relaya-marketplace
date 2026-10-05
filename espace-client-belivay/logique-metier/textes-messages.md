# Textes des messages, à valider

Généré par `outils/textes.py` depuis CL-10 (« Catalogue des textes rédigés pour le prototype ») et la
grille de garde en vigueur ; ne pas modifier à la main. Décision DP-34 : le porteur valide ces textes.

> Les noms, références, montants, dates et liens sont ceux du **jeu d’essai** (données de démonstration) :
> en production, le serveur les remplace par les vraies valeurs au moment de l’envoi (CDA-28).

Pour valider : réponds « ok » pour tout, ou donne le code du message et la correction.

## Notifications (push)

Règles : titre de 45 caractères au plus, texte de 120 au plus (CNT-32) ; jamais de code, d’OTP ni de montant
de commande sur l’écran verrouillé (CNT-26, CNT-27).

| Code | Catégorie | Titre | Texte | Ouvre | Contrôle |
|---|---|---|---|---|---|
| C1 | Paiement · 1 | Paiement protégé · BLV-52107 | Ton argent reste bloqué jusqu’à ton retrait. | `confirmee (le reçu)` | ✓ 28 / 44 car. |
| Préparation | Suivi · 3 | Colis 1 de BLV-52107 confirmé | Prêt dans 2 h. Retrait possible aujourd’hui dès 15 h, avec un seul code pour tes 3 colis. | `suivi?ref=BLV-52107` | ✓ 29 / 89 car. |
| Arrivée (Validée) | Retrait · 1 * | Colis arrivé · BLV-51940 | Ta commande validée t’attend au Relais Mvog-Ada. Le reste se paie au retrait en Mobile Money. | `commande?ref=BLV-51940` | ✓ 24 / 93 car. |
| C2a | Retrait · 3 | Colis 1 sur 2 arrivé · BLV-52018 | Il t’attend au Relais Mvog-Ada. Ton code de retrait arrivera avec le Colis 2. | `suivi?ref=BLV-52018` | ✓ 32 / 77 car. |
| C2 | Retrait · 1 * | Ton code de retrait est disponible | BLV-52018 · tes 2 colis sont au Relais Mvog-Ada. Gratuit aujourd’hui, 100 F par jour dès demain. | `code?ref=BLV-52018` | ✓ 34 / 96 car. |
| S0 | Retrait · 2 ** | Rappel · BLV-52018 | Montant dû : 100 F. 100 F par jour jusqu’au mer. 23, puis 200 F. Retrait avant sam. 26 au soir, sinon renvoi (+ 500 F). | `garde?ref=BLV-52018` | ✓ 18 / 119 car. |
| S1 (ligne du centre) | Retrait · 2 · SMS | Rappel · BLV-52018 | (envoyé par SMS, voir plus bas) | `garde?ref=BLV-52018` | ✓ titre 18 car. |
| S3 « dernier jour » | Retrait · 2 ** | Dernier jour · BLV-52018 | Montant dû : 1 000 F. Relais fermé demain : retire avant 19 h, sinon renvoi au vendeur lundi 28 (+ 500 F). | `garde?ref=BLV-52018` | ✓ 24 / 106 car. |
| S5 | Retrait · 2 ** | Colis renvoyé au vendeur · BLV-52018 | Frais retenus : 1 500 F (garde 1 000 F + renvoi 500 F). Ton solde est remboursé sur ton Mobile Money. | `garde?ref=BLV-52018&j=renvoye` | ✓ 36 / 101 car. |
| Litige | Incident · 2 | Litige LIT-3042 reçu | Le vendeur a jusqu’au ven. 25 à 17 h 15. Ton paiement reste bloqué, rien n’est versé au vendeur. | `litige-suivi?id=LIT-3042` | ✓ 20 / 96 car. |
| Litige (réponse) | Incident · 2 | Le vendeur a répondu · LIT-3042 | Ouvre ton dossier pour voir sa réponse. | `litige-suivi?id=LIT-3042` | ✓ 31 / 39 car. |

## SMS

Règles : 160 caractères au plus, sans accents (GSM-7), expéditeur « BelivaY » (CSM-01) ; le code de retrait
seulement dans C3 et le renvoi (CCD-15), l’OTP seul dans son SMS ; C1 sans montant (CSM-03).

| Code | Moment (démonstration) | Texte | Contrôle |
|---|---|---|---|
| C3 | lun. 21 sept. 17 h 40 · BLV-52018 | Tes 2 colis BLV-52018 sont au Relais Mvog-Ada (8h-19h, ferme dim.). Gratuit aujourd'hui, 100 F/jour des demain. Code de retrait 604318 : belivay.com/r/7KQ2MX4P | ✓ 159 car. |
| C3 (commande « Validée ») | jeu. 24 sept. 08 h 50 · BLV-51940 | Ta commande BLV-51940 est au Relais Mvog-Ada (8h-19h). Montant du au retrait : 24 000 F en Mobile Money. Garde gratuite aujourd'hui, 100 F/jour des demain. | ✓ 155 car. |
| C1 | sam. 19 sept. 20 h 40 · BLV-52018 | Paiement protege pour BLV-52018 : ton argent reste bloque jusqu'a ton retrait au Relais Mvog-Ada. On te previent des que tes colis arrivent. | ✓ 140 car. |
| S1 | mer. 23 sept. 18 h 00 · BLV-52018 | BLV-52018, Relais Mvog-Ada. Montant du : 200 F. 200 F par jour des demain (jeu. 24). Retrait avant sam. 26 au soir, sinon renvoi au vendeur (+500 F). | ✓ 149 car. |
| S2 | ven. 25 sept. 18 h 00 · BLV-52018 | BLV-52018, Relais Mvog-Ada. Montant du : 600 F. 400 F par jour des demain (sam. 26). Retrait avant le sam. 26 au soir, sinon renvoi au vendeur (+500 F). | ✓ 152 car. |
| C4 | sam. 12 sept. 11 h 20 · BLV-51533 | BLV-51533 : Marmite en fonte 8 L en rupture, aucune autre offre a moins de 5 % de plus. Commande annulee, remboursement integral aujourd'hui sur ton MoMo. | ✓ 154 car. |
| C12 | sam. 19 sept. 12 h 32 · BLV-51702 | Merci Carine ! BLV-51702 retiree au Relais Mvog-Ada. Note le vendeur et le relais : belivay.com/a/Q4T7ZK9C. Un probleme ? Signale-le avant le 26 sept. | ✓ 150 car. |
| Renvoi du code | à la demande (exemple : jeu. 24 sept. 10 h 15) | Relais Mvog-Ada, 8h-19h. Montant du aujourd'hui : 400 F. Code de retrait BLV-52018 (renvoi 1 sur 3) : 604318, QR : belivay.com/r/7KQ2MX4P | ✓ 137 car. |
| OTP | dim. 2 août 14 h 06 (inscription) | Ton code de verification BelivaY : 480527. Ne le donne a personne, BelivaY ne te le demandera jamais. | ✓ 101 car. |

## Rappels de garde S0 à S5 avec la grille en vigueur

Grille en vigueur (GARDE-GRILLE, DP-08), jour 1 à jour 7 : 0 F, 100 F, 100 F, 100 F, 200 F, 500 F, 1 000 F ; renvoi 500 F.
Exemple du jeu d’essai : arrivée le lun. 21 sept. (jour 1), relais fermé le dimanche (jour 7, jamais facturé),
renvoi le premier jour ouvert après le 7e jour (lun. 28).

| Jour | Date | Tarif du jour | Montant dû (cumul) |
|---|---|---|---|
| 1 | lun. 21 | 0 F | 0 F |
| 2 | mar. 22 | 100 F | 100 F |
| 3 | mer. 23 | 100 F | 200 F |
| 4 | jeu. 24 | 100 F | 300 F |
| 5 | ven. 25 | 200 F | 500 F |
| 6 | sam. 26 | 500 F | 1 000 F |
| 7 | dim. 27 | fermé (0 F) | 1 000 F |

Au renvoi : garde 1 000 F + renvoi 500 F = **1 500 F retenus**.

### Textes proposés

Même rédaction que CL-10, montants et paliers recalculés. Les SMS sont écrits sans accents (« Montant du »).

| Code | Canal | Texte de CL-10 (ancienne grille) | Texte proposé (grille en vigueur) | Contrôle | Changé |
|---|---|---|---|---|---|
| S0 | push | Montant dû : 100 F. 100 F par jour jusqu’au mer. 23, puis 200 F. Retrait avant sam. 26 au soir, sinon renvoi (+ 500 F). | Montant dû : 100 F. 100 F par jour jusqu’au jeu. 24, puis 200 F. Retrait avant sam. 26 au soir, sinon renvoi (+ 500 F). | ✓ 119 / 120 | oui |
| S1 | SMS | BLV-52018, Relais Mvog-Ada. Montant du : 200 F. 200 F par jour des demain (jeu. 24). Retrait avant sam. 26 au soir, sinon renvoi au vendeur (+500 F). | BLV-52018, Relais Mvog-Ada. Montant du : 200 F. 100 F demain (jeu. 24), puis 200 F. Retrait avant sam. 26 au soir, sinon renvoi au vendeur (+500 F). | ✓ 148 / 160 | oui |
| S2 | SMS | BLV-52018, Relais Mvog-Ada. Montant du : 600 F. 400 F par jour des demain (sam. 26). Retrait avant le sam. 26 au soir, sinon renvoi au vendeur (+500 F). | BLV-52018, Relais Mvog-Ada. Montant du : 500 F. 500 F demain (sam. 26). Retrait avant le sam. 26 au soir, sinon renvoi au vendeur (+500 F). | ✓ 139 / 160 | oui |
| S3 | push | Dernier jour · BLV-52018 — Montant dû : 1 000 F. Relais fermé demain : retire avant 19 h, sinon renvoi au vendeur lundi 28 (+ 500 F). | Montant dû : 1 000 F. Relais fermé demain : retire avant 19 h, sinon renvoi au vendeur lundi 28 (+ 500 F). | ✓ 106 / 120 | non |
| S5 | push | Push : Frais retenus : 1 500 F (garde 1 000 F + renvoi 500 F). Ton solde est remboursé sur ton Mobile Money. Centre : … Solde remboursé : 32 280 F sur ton Mobile Money. | Frais retenus : 1 500 F (garde 1 000 F + renvoi 500 F). Ton solde est remboursé sur ton Mobile Money. | ✓ 101 / 120 | non |

S4 n’est pas envoyé dans cet exemple : le jour 7 tombe un dimanche, relais fermé (CGA-25).

### À valider aussi

- **C2 et C3** disent « Gratuit aujourd’hui, 100 F par jour dès demain » : c’est vrai jusqu’au jour 4, puis le tarif monte.
  Proposition : garder la phrase (elle annonce le palier suivant, CGA-02) ; les rappels S1 et S2 donnent la suite.
- **Plafond** affiché dans S5 et dans l’écran de garde : 2 000 F au plus, 2 500 F avec le renvoi
  (jamais au-delà de la valeur du colis).
- **Ligne du centre de S5** : « Solde remboursé : 32 680 F » (et non 32 280 F) : avec la remise par
  colis (DP-18), BLV-52018 (2 colis) a coûté 34 180 F ; le texte du push, sans montant (CNT-27), ne change pas.


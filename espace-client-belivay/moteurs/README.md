# Moteurs de calcul — Espace client BelivaY

Étape 5 (voir `HANDOFF.md`), décision du porteur du 3 octobre : les calculs de la spécification sont
écrits ici en **Python pur**, testés, puis intégrés au serveur Django existant de BelivaY
(`Felix-TANZI/relaya-marketplace`, en production sur belivay.com).

**Pourquoi « purs »** : comme le domaine financier de relaya-marketplace (`backend/apps/payments/domain`),
ils ne dépendent ni de Django ni de la base de données : ils prennent des données, rendent un résultat
et sa trace. Mêmes conventions : montants en francs entiers (`int`), taux en `Decimal`, `float`
interdit, objets immuables, arrondi « moitié vers le haut ».

**Versions** : Python 3.11 et 3.12 (relaya-marketplace : 3.11 en intégration continue et en production,
`Dockerfile.prod` ; 3.12 dans l'image de développement), pytest comme leur suite de tests. Python 3.12 et 3.11 sont installés par `uv` dans
le dossier de l'utilisateur.

```bash
cd moteurs
uv sync                       # une fois
uv run pytest                 # tests et couverture
uvx ruff check . && uvx ruff format --check .
```

## Paramètres

Aucune valeur dans le code (CCH-15) : `belivay_moteurs/registre.py` lit
`logique-metier/parametres-en-vigueur.json` (registre de CL-16 avec les décisions du porteur). Chaque
valeur a une forme attendue ; si elle change, la lecture s'arrête au lieu de deviner un montant. En
production, les mêmes codes viendront de la configuration versionnée du serveur (console).

## Moteur de frais du panier (`frais.py`)

CL-07, CAL-06 à CAL-11, décisions DP-07, DP-18, DP-19, DP-25 :

    S     = Σ P(v) × q
    Ram   = Σ_zones [R + (n_z − 1) × R′]          R = 500 F, R′ = 380 F
    Rem   = Σ_colis remise                        relais : 400 F (S, M), 600 F (L) ; domicile : 1 000 F
    Off   = R + remise d'un colis S, si S ≥ seuil   30 000 F relais, 50 000 F domicile
    Suppl = M, L : 0 F ; XL à domicile : 1 500 / 2 000 / 3 000 F (< 5 km, 5 à 10 km, > 10 km)
    Total = S + Ram + Rem + Suppl − Off

### Les exemples du jeu d'essai, recalculés

Les montants de CL-02 datent d'avant les décisions ; la remise par colis (DP-18) ajoute 400 F par colis
au-delà du premier, et le supplément XL suit la distance (DP-07).

| Variante (CL-02) | Spécification | Recalculé | Écart |
|---|---|---|---|
| Panier de référence (3 boutiques, 3 colis) | 272 579 F | **273 379 F** | + 800 F (DP-18) |
| « Changer d'offre » : mixeur par la boutique A (2 colis) | 272 079 F | **272 479 F** | + 400 F ; gain du conseil 900 F au lieu de 500 F |
| Boutique A retirée | 121 500 F | **121 900 F** | + 400 F |
| Seuil non atteint (pagne seul) | 19 400 F | 19 400 F | — ; « Ajoute 11 500 F », barre 62 % |
| Une seule boutique | 84 000 F | 84 000 F | — |
| Robe au comptoir | 24 900 F | 24 900 F | — |
| Téléviseur XL à domicile, 5,2 km | 190 500 F | **191 000 F** | + 500 F (DP-07 : 2 000 F de 5 à 10 km) |
| Prix en hausse | 274 579 F | **275 379 F** | + 800 F |
| Prix en baisse | 271 079 F | **271 879 F** | + 800 F |
| Mixeur retiré | 235 079 F | **235 479 F** | + 400 F |
| Sac cuir pris | 220 579 F | **221 379 F** | + 800 F |

### Points tranchés par le porteur (DP-46)

- Classe d'un colis = la plus grande classe de ses articles (une boutique = un colis, CCY-15).
- Distance du supplément XL = distance de la boutique au domicile du client. Les tests prennent 5,2 km
  pour le téléviseur 43″ (distance du jeu d'essai).

## Garde et rappels S0 à S5 (`garde.py`)

CL-10, CAL-19 à CAL-23, CGA-13, CGA-17, CGA-24 à CGA-28, décisions DP-08, DP-24, DP-29 : garde par groupe
de remise (un code) ; J0 = premier accusé fort ; grille 0, 100, 100, 100, 200, 500, 1 000 F (gros colis :
+ 300 F chaque jour dès le 1er) ; un jour fermé, de litige, de groupage ou de transfert n'est jamais
facturé ; plafond à la valeur des colis ; renvoi le premier jour ouvert après le 7e : retenue = garde +
500 F, jamais plus que le payé ; gain du relais par jour facturé ; série de rappels revérifiée avant
l'envoi (retiré, litige, jour fermé), « dernier jour » à l'ouverture du relais, SMS en push sous SMS-ECO.

| BLV-52018 (spécification 10.4) | Spécification | Recalculé | Pourquoi |
|---|---|---|---|
| Dû le jeudi 24 (4e jour) | 400 F · 600 F demain | **300 F · 500 F demain** | grille DP-08 (100 F le 4e jour) |
| Garde au renvoi (rangs 1 à 7) | 1 000 F | 1 000 F | — |
| Payé à la commande (2 colis) | 33 780 F | **34 180 F** | remise par colis (DP-18) |
| S5 : retenu, remboursé | 1 500 F, 32 280 F | **1 500 F, 32 680 F** | DP-18 |
| Rappels | S0 22, S1 23, S2 25 à 18 h ; S3 « dernier jour » sam. 26 à 8 h ; S4 non envoyé ; S5 lun. 28 | identiques | — |

Les textes des rappels (montants et paliers) sont à refaire avec la nouvelle grille : voir
`logique-metier/textes-messages.md` (S0 à S5 recalculés par `outils/textes.py`).

## Les autres moteurs

| Module | Ce qu'il calcule | Règles |
|---|---|---|
| `comptoir.py` | éligibilité au paiement au comptoir (ordre CPN-36), palier et plafond du compte, partage avance / dû au retrait, refus et paiement d'avance obligatoire, retenue après un refus, code de retrait | CAL-13, CAL-18, CCP, DP-24, DP-26 |
| `annulation.py` | remboursement d'une boutique (Off conservé, jamais plus que l'encaissé, commande au comptoir), changement de relais (transfert par colis, garde due, deux codes, attendre l'arrivée, relais fermé) | CAL-24, CAL-25, CAN, CRL, DP-37, DP-42 |
| `carte.py` | frais de service, euros et dollars US, découpage au plafond de 150 000 F (unité par unité), frais de service rendus à l'annulation ; Apple Pay et Google Pay suivent la carte | CAL-26, CET-16, CET-24, DP-47 |
| `delais.py` | compte à rebours, « Prêt dans X h », temps restant, « Réponse sous X h », dissociation d'un groupe | CAL-14 à CAL-17, DP-32 |
| `catalogue.py` | prix livré, attribution de l'offre, vendeur suivant, prix d'une carte, distance, « Retirable aujourd'hui », visibilité | CAL-01 à CAL-05, CAN-24, DP-01 |
| `litiges.py` | remboursement automatique, échéances, voie de retour, remboursement d'un retour, remplacement, libération du vendeur | CAL-27 à CAL-29, DP-10, DP-27, DP-35 |
| `notes.py` | note affichée, répartition, borne de Wilson, satisfaction | CAL-30 et suivantes |
| `portefeuille.py` | recharge, remboursement, paiement par le solde, retrait et ses frais (fermé au lancement, FF-WALLET) | CWL-01 à CWL-12 |
| `geo.py` | distance géodésique WGS 84 (celle d'OpenStreetMap et de PostGIS, au millimètre), distance d'une carte et du supplément XL, relais proposés par distance, zones exploitées | CAL-04, CDA-05, CRL-03, CCO-11, DP-09, DP-46, DP-49 |
| `etats.py` | machines à états : commande, sous-commande, tentative de paiement, escrow, litige, retour, remplacement ; chaque transition avec ses gardes | CL-02, machines-a-etats.json |

## Plan et distances : OpenStreetMap (DP-49)

Le fond de plan est OpenStreetMap, comme dans relaya-marketplace (Leaflet, tuiles OSM, géocodage Nominatim) :
DP-49 remplace Google Maps (DP-30). Les distances affichées restent géodésiques (CAL-04) : `geo.py` les calcule
sur l'ellipsoïde WGS 84, au millimètre près de GeographicLib, la bibliothèque de PostGIS. Le serveur de
relaya-marketplace n'a pas PostGIS (PostgreSQL 16 seul) : le moteur pur suffit, et donnera le même résultat si
l'équipe ajoute PostGIS plus tard. Le temps de trajet à pied (« 350 m · 6 min ») vient d'un calcul d'itinéraire
sur les données OSM (OSRM, profil piéton), côté serveur. En production : pas de charge lourde sur les serveurs
publics d'OSM (tile.openstreetmap.org, nominatim.openstreetmap.org), donc serveur propre ou fournisseur OSM.

Lecture à confirmer : le palier du supplément XL (DP-46) se choisit sur la distance affichée au client
(arrondie à 0,1 km), pour que « 5,0 km » ne coûte jamais le palier « moins de 5 km ».

## Points tranchés par le porteur (DP-48)

La spécification ne les fixait pas, ou se contredisait ; le porteur a retenu les neuf lectures suivantes,
écrites dans le code (« DP-48 ») et testées.

1. **Renvoi d'abord** (`garde.py`) : quand la retenue au renvoi est plafonnée par le payé (DP-24), le
   trajet de renvoi est couvert en premier, la garde ensuite.
2. **Comptoir sans avance** (`comptoir.py`) : livraison offerte, l'avance est de 0 F.
3. **Suppléments rendus à l'annulation** (`annulation.py`) : CAN-11 écrit F = Ram + Rem − Off, sans
   les suppléments ; le moteur les rend (un colis XL annulé n'est pas livré).
4. **Refus au comptoir** (`comptoir.py`) : DP-24 cite la garde seule ; le trajet de renvoi (500 F) n'est
   pas ajouté à la retenue.
5. **Période de CSM-30** (`garde.py`) : aucun frais du jour du rappel non délivré jusqu'au rappel
   suivant délivré (non compris), ou jusqu'au renvoi s'il n'y en a plus.
6. **Ordre du portefeuille** (`portefeuille.py`) : un paiement prend d'abord l'argent rechargé, un
   retrait d'abord l'argent remboursé (les deux ordres les plus favorables au client).
7. **SMS-ECO** (`garde.py`) : le « montant du panier » comparé au seuil de CSM-14 est le sous-total S
   (33 400 F pour BLV-52018), pas le total payé.
8. **Frais de service d'une annulation partielle** (`carte.py`) : la part d'une boutique sur plusieurs est
   2 % du montant remboursé, la dernière boutique prend le reste ; rendue si le vendeur ou BelivaY annule,
   acquise si le bénéficiaire annule (CET-24).
9. **Dissociation** (`delais.py`, DP-32) : le délai de 24 h part du premier colis arrivé ; un colis devenu
   retirable le reste.

## Suite

Correspondance avec les modèles et l'API de relaya-marketplace (`modele-donnees.json`, `api.json`), pour
préparer l'intégration avec leur équipe.

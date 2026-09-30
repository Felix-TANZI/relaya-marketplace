# Synthèse batch 7 — VD-11 & VD-12 (Espace vendeur)

> Source : `espace_vendeur_txt/VD-11_guide.txt` et `espace_vendeur_txt/VD-12_guide.txt` (PDF → texte, mise en page brute conservée). BelivaY, guides développeur datés du **27 septembre 2026**, documents d'origine en version **1.0 · 24 septembre 2026**.

---

## 1. VD-11 — Boutique, compte et communication

- **Titre exact** : « VD-11 — Boutique, compte et communication »
- **Code / identifiant de suivi des actions** : VD-D12 (actions `VD-D12.A01…`, questions `VD-D12.Q01…`)
- **Pages** : 37 · **Parties** : 3 (Partie 01 p.1-13, Partie 02 p.14-23, Partie 03 p.24-37) · **Actions** : 28 (VD-D12.A01 à A28)
- Document d'origine : `01_Documents/VD-11_Boutique_Compte_Communication.pdf`

### 1.1 Écrans couverts

#### Écran « Menu » (p.2-4, Fig. 1)
- **Objectif** : trouver n'importe quelle fonction d'un coup d'œil — sept groupes courts, rangés du plus utilisé au moins utilisé, avec des compteurs réels.
- **Éléments UI principaux** : carte nuit de la boutique (avatar, nom interne, « propriétaire », pastille d'ouverture, palier · Trust Score, plan) ; 7 groupes dans l'ordre d'usage : **À traiter** (À préparer, Litiges en rouge, Retours), **Messages et aide** (Notifications, Messagerie, Aide), **Mon argent** (montant à verser, Versements, Documents), **Mon catalogue** (Mes produits, Nouvelle offre, Saisie assistée), **Vendre plus** (Trust Score et palier, Mes chiffres, Plans & tarifs, Se faire voir), **Ma boutique** (Ma boutique, Horaires, Avis, Mon équipe, Emplacement), **Mon compte** (Paramètres, Sécurité, Installer l'application, Se déconnecter) ; bloc replié « Écrans d'état et d'accès » en fin de liste ; libellé « Espace vendeur · version 2.0 ».
- **Actions possibles** : naviguer vers chaque groupe/route ; toucher un compteur pour aller à l'écran source.

#### Écran « Ma boutique » (p.5-7, Fig. 2)
- **Objectif** : montrer ce que voit le client (un palier et un score, rien d'autre), mener aux réglages de la boutique, rappeler l'identité interne.
- **Éléments UI principaux** : carte nuit « Ce que voit le client » (« Vendeur certifié Bronze · Trust Score 63 », rien d'autre) ; bloc replié « Comment ça marche » ; liens vers Horaires, Avis, Mon équipe, Emplacement (avec valeur actuelle) ; carte « Votre identité chez BelivaY » (nom, titulaire verrouillé, identifiant, statut, dates de création/approbation) ; bouton « Demander une modification ».
- **Actions possibles** : consulter l'aperçu client ; naviguer vers les 4 réglages ; ouvrir la Messagerie pour demander une modification d'identité.

#### Écran « Horaires et fermetures » (p.8-10, Fig. 3)
- **Objectif** : régler les heures d'ouverture (le délai de préparation ne court que pendant elles), voir le passage du livreur, gérer les fermetures programmées.
- **Éléments UI principaux** : interrupteur « Fermé aujourd'hui » + état du jour ; cases horaires touchables (une ligne par période, case 44 px) ; passage du livreur en lecture seule (cadenas « Fixé avec Wink Express ») ; liste des fermetures programmées avec « Annuler » ; bouton « Programmer une fermeture » ; feuille `horaires?prog=1` (deux champs date, motif facultatif jamais montré au client, aide « au moins 48 h à l'avance ») ; bouton « Enregistrer » en bas.
- **Actions possibles** : activer « Fermé aujourd'hui » (effet immédiat) ; modifier une heure puis enregistrer ; programmer une fermeture (≥ 48 h à l'avance) ; annuler une fermeture programmée jusqu'à son premier jour.

#### Écran « Emplacement » (p.11-13, Fig. 4)
- **Objectif** : fixer le point vérifié de la boutique et son repère, car le coût total livré (prix + livraison depuis la boutique) décide qui reçoit la commande.
- **Éléments UI principaux** : phrase d'explication ; plan avec zone (Z4) et point ; carte du point (zone, pastille « Vérifié », coordonnées GPS, date de pose/vérification, champ « Repère pour le livreur » en texte libre) ; bloc replié « Comment ça marche » (attribution) ; bouton « Replacer le point depuis la boutique » ; « Enregistrer ».
- **Actions possibles** : modifier le repère texte (sans re-vérification) ; replacer le point GPS sur place (déclenche une nouvelle vérification si l'écart dépasse 200 m).

#### Écran « Mon équipe » (p.14-16, Fig. 5 liste / Fig. 6 ajout)
- **Objectif** : donner un accès à chaque personne qui tient la boutique, et le retirer ; l'argent et les prix restent au propriétaire.
- **Éléments UI principaux** : liste des personnes (avatar, nom, rôle en pastille, dernière action, bouton « Retirer ») ; compteur « 1 accès employé sur 3 · sur tous les plans » ; bouton « Ajouter un accès » ; encadré « Ne partagez jamais votre compte » ; bloc replié « Ce que voit un accès Préparation » ; bloc replié « Comment ça marche » (code SMS second facteur, actions signées) ; feuille « Ajouter un accès » (prénom/nom, téléphone +237, rôle Préparation, « Envoyer l'invitation », code SMS de confirmation).
- **Actions possibles** : ajouter un accès (déclenche SMS + code de confirmation) ; retirer un accès (coupe la session immédiatement) ; consulter l'accueil tel que vu par un employé.

#### Écran « Paramètres » (p.17-19, Fig. 7)
- **Objectif** : rendre l'application confortable (langue, taille du texte, thème, économie de données), choisir ses notifications, mettre la boutique en pause, tenir à jour le profil et le seul numéro de versement.
- **Éléments UI principaux** : carte d'identité (nom, identifiant, pastilles « Identité vérifiée » + palier, ligne « Gagné avec BelivaY » avec montant en vert) ; sélecteur Langue (Français/English/Pidgin) ; Taille du texte (Normale/Grande/Très grande) ; Thème sombre ; Économie de données ; bloc Notifications (Commandes et litiges verrouillé, Versements, Avis, Conseils, « Jamais de promotion par SMS ») ; « Mettre la boutique en pause » + lien « Fermé aujourd'hui » ; Profil (téléphone personnel, e-mail) ; Mobile Money (numéro de versement) ; liens Sécurité/Documents/Messagerie/Installer l'application ; « Enregistrer », « Se déconnecter ».
- **Actions possibles** : changer langue/taille/thème/économie de données (appliqué immédiatement) ; activer/désactiver notifications non verrouillées ; mettre la boutique en pause ; modifier téléphone personnel/e-mail puis enregistrer ; se déconnecter.

#### Écran « Sécurité, appareils et données » (p.20-23, Fig. 8)
- **Objectif** : voir qui utilise le compte et le protéger (appareils, mot de passe, second facteur SMS), consulter le statut du compte et la part gardée par catégorie, gérer « Mes données » et la clôture.
- **Éléments UI principaux** : liste d'appareils regroupés (ville, sans IP) avec « Déconnecter » ; carte « Mot de passe et second facteur » (8 caractères dont 1 chiffre, changement de mot de passe, second facteur SMS toujours visible) ; carte « Statut du compte » (dates, contrat, palier/plan, « Vous gardez · votre grille » repliable par catégorie) ; bloc « Mes données » (consulter, exporter sous 48 h, conservation 180 jours, « Clôturer mon compte ») ; feuille de clôture `securite?cloture=1` (commandes/litiges/versements soldés d'abord, clôture 30 jours après la demande, annulable, « Demander la clôture »/« Annuler »).
- **Actions possibles** : déconnecter un appareil (n'annule aucune commande) ; changer le mot de passe ; consulter la grille de commission par catégorie ; exporter ses données ; demander la clôture du compte (annulable pendant 30 jours).

#### Écran « Notifications » (p.24-28, Fig. 9 tout / Fig. 10 urgent)
- **Objectif** : des messages qui disent quoi faire, avant quand, et ce que ça rapporte ou coûte ; un toucher mène à l'écran exact.
- **Éléments UI principaux** : filtres Tout / Urgent / Argent avec compteurs ; liste antéchronologique (icône type + canal SMS/notif, heure, titre, conséquence) ; pied avec règle SMS et lien « Régler mes notifications ».
- **Actions possibles** : filtrer par catégorie ; toucher une ligne pour aller à l'écran source ; accéder aux réglages de notifications.

#### Écran « Avis et droit de réponse » (p.29-31, Fig. 11)
- **Objectif** : afficher les avis vérifiés, leur poids dans le Trust Score, et permettre la réponse privée via le support.
- **Éléments UI principaux** : carte nuit (note moyenne, étoiles, nb d'avis vérifiés, « 20 % du Trust Score ») ; bloc replié « Comment ça marche » ; une carte par avis (étoiles, « Achat vérifié », commentaire, référence, date, « Voir le détail ») ; bouton « Répondre en privé » (via le support, sans le nom de la boutique, délai 30 jours).
- **Actions possibles** : consulter le détail d'une commande liée à l'avis ; répondre en privé via le support (fenêtre 30 jours).

#### Écran « Messagerie » (p.32-34, Fig. 12 fils / Fig. 13 un fil)
- **Objectif** : échanger avec le client d'une commande ou avec le support, sans nom ni numéro, avec filtre avant envoi ; la conversation sert de preuve.
- **Éléments UI principaux** : liste des fils (« Client de BLV-… », dernier message, heure, non lus) ; bloc replié « Comment ça marche » ; dans un fil : carte de la commande, bulles, avis de filtrage (numéro retiré), « Réponses rapides », champ de saisie.
- **Actions possibles** : ouvrir un fil ; envoyer un message (filtré côté serveur pour retirer coordonnées) ; utiliser une réponse rapide ; ouvrir la commande liée.

#### Écran « Aide » (p.35-37, Fig. 14)
- **Objectif** : répondre tout de suite aux questions les plus fréquentes, en mots simples, et donner un seul moyen de joindre une personne (support vendeur WhatsApp).
- **Éléments UI principaux** : carte verte « Support vendeur · WhatsApp » (horaires, délai de réponse selon palier, bouton « Écrire au support ») ; 10 questions fréquentes repliées (première ouverte) ; alerte anti-fraude Mobile Money ; liens « Mon contrat » et conseil de la semaine.
- **Actions possibles** : ouvrir une question (réponse + lien vers l'écran où agir) ; écrire au support via wa.me (message prérempli, identifiant, jamais de code) ; consulter le contrat.

### 1.2 Tableau des actions numérotées (VD-D12.A01 → A28)

| ID | Description courte | Statut |
|---|---|---|
| VD-D12.A01 | Remplacer le tiroir sombre 20 entrées par la page Menu claire en 7 groupes (route menu, compteurs GET /seller/today) | — (action, non statuée V/D/Δ/P) |
| VD-D12.A02 | Retirer 5 entrées financières, « Analytiques IA », « Boost & Pub », « Passer au Pro », « Certifications » du menu | — |
| VD-D12.A03 | Masquer pour l'accès Préparation : Mon argent, Nouvelle offre, Plans & tarifs, Se faire voir, Mon équipe | — |
| VD-D12.A04 | Décider du maintien en production du bloc « Écrans d'état et d'accès » | — |
| VD-D12.A05 | Supprimer storefront : bannière, description publique, lien/QR boutique, affiche, WhatsApp public | — |
| VD-D12.A06 | Ajouter l'aperçu fixe « Ce que voit le client » (palier + Trust Score) | — |
| VD-D12.A07 | Ajouter horaires, passage du livreur (lecture seule), fermetures programmées (PUT /shop/hours, POST /shop/closed-today, POST/DELETE /shop/closures) | — |
| VD-D12.A08 | Remplacer emplacements publics multiples par un point vérifié interne + repère (PUT /shop/location, vérification agent de zone au-delà de 200 m) | — |
| VD-D12.A09 | Retirer l'alimentation du filtre client « zone du vendeur » (DEC-15 remplacée par livrabilité en v3) | — |
| VD-D12.A10 | Créer les accès multiples avec droits séparés (GET/POST/DELETE /shop/members, rôle owner/prep, 2e facteur, 403 hors rôle, révocation immédiate) | — |
| VD-D12.A11 | Supprimer « My account » ; un seul écran « Paramètres » traduit | — |
| VD-D12.A12 | Séparer téléphone personnel et numéro de versement (renvoi VD-09) | — |
| VD-D12.A13 | Ajouter pidgin (pcm), économie de données (data_saver par défaut activé), taille du texte (text_scale) sur tous les écrans | — |
| VD-D12.A14 | Remplacer « Newsletter »/« SMS » par Commandes et litiges (verrouillé), Versements, Avis, Conseils | — |
| VD-D12.A15 | Afficher « Gagné avec BelivaY » depuis earned_total (même compteur que l'accueil) | — |
| VD-D12.A16 | Regrouper les sessions par appareil, ville sans IP, « Déconnecter » (DELETE /devices/{id}) | — |
| VD-D12.A17 | Ajouter la grille par catégorie (keep_grid du service de commission), repliée | — |
| VD-D12.A18 | Ajouter Mes données (export sous 48 h, conservation 180 j) et clôture par feuille (POST /account/closure, 30 j, annulable) | — |
| VD-D12.A19 | Retirer le QR code de boutique de Paramètres | — |
| VD-D12.A20 | Harmoniser la route de clôture (POST /account/closure ici vs POST /account/close dans VD-02) | — |
| VD-D12.A21 | Créer la page Notifications (GET /notifications, filtres Tout/Urgent/Argent, liens vers l'écran exact) | — |
| VD-D12.A22 | Retirer « Newsletter » et SMS promotionnels ; SMS seulement pour commande à préparer et litige | — |
| VD-D12.A23 | Créer la page Avis (GET /reviews, réponse privée via support 30 j, POST /reviews/{id}/private-reply) | — |
| VD-D12.A24 | Retirer AVI-02 (retrait d'avis « manifestement injuste » par médiateur) : v3 client ne retire que pour insulte/coordonnées/hors sujet | — |
| VD-D12.A25 | Créer la messagerie anonyme rattachée aux commandes (GET /threads, filtre serveur des coordonnées) | — |
| VD-D12.A26 | Aligner la fermeture du fil : v3 « à la clôture du dossier » vs VD « à la fin du délai de litige » | — |
| VD-D12.A27 | Créer la page Aide unique (support WhatsApp wa.me, 10 questions gérées en console, liste produits interdits en cache) | — |
| VD-D12.A28 | Publier la liste des produits interdits (CAT-INTERDITS) avant le lancement | — |

*Note : la colonne « statut » du tableau des actions n'est pas fournie dans le document (les actions n'ont pas de statut V/D/Δ/P propre — c'est un plan d'exécution, pas un registre de règles). Le statut V/D/Δ/P s'applique aux **règles** (ci-dessous), pas aux actions.*

### 1.3 Règles citées (avec statut Verrouillé/Décidé/Déduit/Proposé)

**Partie 01** (17 règles citées, 8 valeurs clés) :
- MEN-01 → groupes dans l'ordre d'usage : À traiter · Messages et aide · Mon argent · Mon catalogue · Vendre plus · Ma boutique · Mon compte ; écrans d'état repliés — **Décidé**
- MEN-02 → compteurs du menu = valeurs réelles, même instant que les badges — **Décidé**
- MEN-03 → une pastille = un travail à faire ; nombre d'information en texte — **Proposé**
- MEN-04 → chaque fonction une seule fois ; onglets du dock non répétés — **Proposé**
- BOU-01 → le client voit « Vendeur certifié [palier] · Trust Score » et rien d'autre (A1) — **Décidé**
- BOU-02 → le vendeur ne voit rien du client (A2) — **Décidé**
- BOU-03 → aucun contact direct : messagerie interne, fils rattachés à une commande, anonymes (A3) — **Décidé**
- HOR-01 → bouton d'enregistrement en bas, après le dernier champ (V77) — **Décidé**
- HOR-02 → fermeture non annoncée au passage du livreur : g2 sur la Ponctualité — **Proposé**
- HOR-03 → fermeture programmée annulable d'un geste jusqu'à son premier jour — **Proposé**
- HOR-04 → passage du livreur en lecture seule (fixé avec l'entreprise de la zone) — **Proposé**
- HOR-05 → fermeture programmée dans une feuille (48 h minimum) — **Recommandé**
- EMP-01 → point posé depuis la boutique ; > 200 m ⇒ nouvelle vérification — **Proposé**
- EMP-02 → repère en texte libre, modifiable sans vérification — **Proposé**
- Règles client liées : CDR-01 (anonymat), FIC-01 (badges vrais seulement), FIC-03 (« Autres vendeurs » supprimé), CCA-03 (livraison offerte dès 30 000/50 000 F), DEC-15 (filtres) — **Décidé**

**Partie 02** (16 règles citées, 8 valeurs clés) :
- EQU-01 → périmètre accès Préparation (peut faire / ne voit jamais) ; ajout/retrait par code SMS — **Décidé**
- EQU-02 → jusqu'à 3 accès employés, sur tous les plans — **Proposé**
- EQU-03 → chaque action signée, visible dans le journal — **Décidé**
- EQU-04 → retirer un accès coupe la session tout de suite ; actions passées signées — **Proposé**
- PAR-01 → identifiant non modifiable ; nom du titulaire verrouillé (pièce et MoMo) — **Décidé**
- PAR-02 → français, English, pidgin ; thème suit le téléphone puis mémorisé — **Décidé**
- PAR-03 → pause de la boutique avec sa conséquence ; « Fermé aujourd'hui » pour un jour — **Décidé**
- PAR-04 → taille du texte 100/115/130 % ; suit le téléphone au premier lancement — **Proposé**
- PAR-05 → interrupteurs appliqués tout de suite ; « Enregistrer » pour le profil seulement — **Proposé**
- PAR-06 → « Gagné avec BelivaY » = même valeur que l'accueil — **Décidé**
- SEC-01 → connexions regroupées par appareil ; ville, jamais IP — **Décidé**
- SEC-02 → révoquer un appareil n'annule aucune commande — **Décidé**
- SEC-03 → clôture une fois commandes/litiges/versements soldés, 30 jours de préavis — **Décidé**
- SEC-04 → second facteur = code SMS au téléphone personnel, jamais au numéro de versement — **Décidé**
- SEC-05 → part gardée par catégorie pour le palier, en fourchette, hors découverte et planchers — **Décidé**
- SEC-06 → clôture par feuille de confirmation, annulable pendant 30 jours — **Recommandé**

**Partie 03** (18 règles citées, 6 valeurs clés) :
- VNO-01 → jamais de message sans action — **Décidé**
- VNO-02 → prix relancé seulement quand un concurrent passe moins cher, toujours vers le bas — **Décidé**
- VNO-03 → jamais de code ni montant sensible dans une notification poussée ; lien vers l'écran exact — **Décidé**
- VNO-04 → sanction ou descente notifiée avec « Contester » — **Décidé**
- VNO-05 → « Votre score approche de 65 » avec gain/risque en francs, 1×/seuil/semaine — **Décidé**
- VNO-06 → stock sous le seuil, offre vérifiée/refusée, message reçu : notification seule, jamais SMS — **Recommandé**
- CNO-01 (client) → push d'abord, lien vers l'écran exact ; jamais code/montant sensible — **Décidé**
- AVI-01 → jamais de réponse publique signée, jamais d'avis négocié contre remboursement, jamais d'avis supprimé par le vendeur — **Décidé**
- AVI-02 → un avis manifestement injuste peut être retiré par un médiateur senior — **Décidé** *(mais action A24 demande de le retirer — voir contradictions)*
- FIC-05 (client) → acheteur vérifié uniquement (payé et retiré) — **Décidé**
- CPT-15 (client) → note basse propose un litige sans condition — **Décidé**
- MSG-01 → vendeur lit « Client de BLV-… » ; client lit « le vendeur » + palier/Trust Score — **Décidé**
- MSG-02 → chaque fil rattaché à une commande, fermé à la fin du délai de litige — **Décidé**
- MSG-03 → WhatsApp du support pour l'aide seulement : jamais de commande ni de preuve — **Décidé**
- AID-01 → liste des produits interdits publiée dans l'Aide avant le lancement — **Décidé**
- AID-02 → un numéro WhatsApp unique pour le support vendeur — **Décidé**
- AID-03 → chaque réponse en trois phrases au plus, mène à l'écran où agir — **Proposé**

### 1.4 Règles métier et calculs clés (chiffres exacts)

- **Filtres Menu** : « À traiter » = À préparer (2), Litiges (2), Retours (1) — exemple ; Notifications (4), Messagerie (1) — exemple.
- **Aperçu client** : « Vendeur certifié Bronze · Trust Score 63 ».
- **Horaires (exemple Fig. 3)** : lun-ven 08 h-18 h, sam 08 h-14 h, dim fermé.
- **Délai de préparation** : compté en heures d'ouverture (E10) — une commande payée boutique fermée part de l'ouverture suivante.
- **Fermeture programmée** : annonce obligatoire **≥ 48 h** avant le premier jour fermé.
- **Passage du livreur (exemple)** : lun-ven 14 h-16 h, sam 11 h-13 h (Wink Express).
- **Emplacement** : point vérifié ; au-delà de **200 m** d'écart → nouvelle vérification par l'agent de zone. Coordonnées exemple : 3,652° N · 11,517° E.
- **Attribution de commande** : `argmin(prix + livraison réelle depuis la boutique)`, Trust Score en départage, bascule sur le vendeur suivant (règle A4).
- **Accès équipe** : jusqu'à **3 accès employés**, sur tous les plans ; 2e facteur = code SMS envoyé à un numéro masqué (« 6•• •• •• 90 »).
- **Taille du texte** : 3 paliers — **100 % / 115 % / 130 %** (text_scale 1 / 1,15 / 1,3).
- **Grille par catégorie « gardée » (palier Bronze, exemple Fig. 8)** : électronique/électroménager **86,5 à 98 %** ; mode/beauté **76,5 à 86,5 %** ; supermarché/frais **92,5 à 95 %** ; maison/sport/bébé/animaux **85 à 91,5 %** ; livres/médias **87,5 à 91 %** ; offre de découverte : **+3 points** jusqu'au **27 novembre** ; **minimum 700 F** par commande.
- **Mes données** : export par e-mail sous **48 h** ; preuves conservées **180 jours** (loi n° 2024/017).
- **Clôture de compte** : effective **30 jours** après la demande, annulable d'ici là.
- **Mot de passe** : 8 caractères dont un chiffre.
- **Gagné avec BelivaY (exemple)** : 53 520 F, « 17 840 F à verser » (exemple boutique).
- **Notifications** : SMS uniquement si `type ∈ {commande à préparer, litige}` (règle L3) ; « Urgent » = commandes à préparer + litiges en cours (V91) ; alerte de seuil de score = **1 envoi max par seuil et par semaine** ; alerte de stock bas = 1 envoi par passage sous le seuil.
- **Avis** : poids dans le Trust Score = **20 %** ; réponse privée possible pendant **30 jours** ; échelle 4-5★ = succès, 3★ = neutre, 1-2★ = échec léger.
- **Support vendeur (WhatsApp)** : ouvert **7 h à 21 h** tous les jours ; délai de réponse **24 h ouvrées (Bronze), 4 h (Argent), 2 h (Or)** ; 10 questions fréquentes en console.

### 1.5 Endpoints API et événements mentionnés

**Boutique / horaires / emplacement** :
- `GET /seller/today` (compteurs du menu)
- `GET /shop`, `PUT /shop/hours`
- `POST /shop/closed-today`
- `POST /shop/closures {from, to, reason?}`, `DELETE /shop/closures/{id}`
- `PUT /shop/location {landmark}`

**Équipe / compte / sécurité** :
- `GET / POST / DELETE /shop/members` (rôle `owner | prep`, 403 hors rôle)
- `PUT /me` (langue, `text_scale` 1/1,15/1,3, thème, `data_saver`)
- `GET /money/summary` → `earned_total`
- `GET /devices`, `DELETE /devices/{id}`
- `GET /account/status` → `keep_grid[{family, keep_from, keep_to}]`
- `POST /account/closure`
- `POST /me/export`

**Notifications / avis / messagerie / aide** :
- `GET /notifications?filter=` — types : `order.to_prepare`, `dispute.opened|reminder`, `price.undercut`, `return.reported|arrived`, `parcel.unclaimed`, `sanction.applied`, `tier.down|up`, `score.threshold_near`, `stock.low`, `offer.approved|rejected`, `message.received`, `payout.sent|refused`, `review.received`, `tip.weekly`
- `GET /reviews`, `POST /reviews/{id}/private-reply`
- `GET /threads` (filtre serveur des numéros, e-mails, réseaux sociaux)

**Incohérence de route notée dans le document** : clôture de compte `POST /account/closure` (VD-11) vs `POST /account/close` (VD-02) — action A20/Q04 demande l'harmonisation.

### 1.6 Questions ouvertes à trancher (recopiées telles quelles)

- **VD-D12.Q01** (partie 01) : DEC-15 « zone du vendeur » encore citée comme règle client liée alors que la v3 l'a remplacée par la livrabilité (déjà ouvert, n° 71).
- **VD-D12.Q02** (partie 01) : Menu affiche « Espace vendeur · version 2.0 » alors que les documents sont en version 1.0 (24 sept.) — numérotation à harmoniser.
- **VD-D12.Q03** (partie 01) : HOR-02 fermeture non annoncée = g2 ; RUP-03 non-préparation = g3 + sanction niveau 2 ; VD-02 « échec moyen » — cohérent si g2 = moyen ; à confirmer.
- **VD-D12.Q04** (partie 02) : Route de clôture `/account/closure` (VD-11) contre `/account/close` (VD-02).
- **VD-D12.Q05** (partie 02) : SMS en pidgin proposé côté vendeur alors que côté client les SMS restent en français jusqu'à validation des traductions (CIN-09) — même règle à appliquer ?
- **VD-D12.Q06** (partie 03) : AVI-02 (retrait par un médiateur senior) contre la v3 client (retrait seulement pour insulte, coordonnées, hors sujet) (déjà ouvert, n° 70).
- **VD-D12.Q07** (partie 03) : Fermeture du fil : fin du délai de litige (VD) contre clôture du dossier (v3) (déjà ouvert, n° 51).
- **VD-D12.Q08** (partie 03) : Support vendeur 7 h-21 h comme le client ; relais 8 h-20 h (déjà ouvert, n° 79).
- **VD-D12.Q09** (partie 03) : Réponse privée à un avis via le support côté vendeur ; côté relais, réponse privée à trancher (n° 70).

### 1.7 Contradictions internes ou incohérences apparentes (signalées, non résolues)

1. **DEC-15 « zone du vendeur »** citée comme filtre client actif alors que la v3 client l'a remplacée par la livrabilité (Q01/A09).
2. **Numérotation de version** : « Espace vendeur · version 2.0 » affiché dans le Menu alors que tous les documents du paquet sont en version 1.0 (Q02).
3. **Gravité de la fermeture non annoncée** : HOR-02 la classe en g2 (Ponctualité), RUP-03 classe la non-préparation en g3 + sanction niveau 2, VD-02 parle d'« échec moyen » — cohérence à confirmer (Q03).
4. **Route de clôture de compte dupliquée** : `POST /account/closure` (VD-11) vs `POST /account/close` (VD-02) (Q04/A20).
5. **Pidgin dans les SMS vendeur** proposé (PAR-02 : « application, notifications, SMS ») alors que la règle client impose le français tant que les traductions ne sont pas validées (CIN-09) (Q05).
6. **AVI-02 contredit une action du même document** : la règle AVI-02 est listée « Décidé » (« un avis manifestement injuste peut être retiré par un médiateur senior »), mais l'action VD-D12.A24 demande explicitement de **retirer** cette règle pour l'aligner sur la v3 client (retrait seulement pour insulte, coordonnées, hors sujet) (Q06).
7. **Fermeture du fil de messagerie** : MSG-02 dit « fermé à la fin du délai de litige » (VD), la v3 client dit « à la clôture du dossier » — deux moments potentiellement différents (Q07).
8. **Horaires de support asymétriques** : vendeur 7 h-21 h (comme client) vs relais 8 h-20 h, sans justification donnée (Q08).
9. **Modalité de réponse privée à un avis** définie côté vendeur (via le support) mais pas encore côté relais (Q09).

---

## 2. VD-12 — Registre, mise à niveau, tests et lexique

- **Titre exact** : « VD-12 — Registre, mise à niveau, tests et lexique »
- **Code / identifiant de suivi des actions** : VD-D13 (actions `VD-D13.A01…`, questions `VD-D13.Q01…`)
- **Pages** : 38 · **Parties** : 3 (Partie 01 p.1-11, Partie 02 p.12-25, Partie 03 p.26-38) · **Actions** : 13 (VD-D13.A01 à A13)
- Document d'origine : `01_Documents/VD-12_Registre_Mise-a-niveau_Tests_Lexique.pdf`
- **Ce document est le document d'acceptation/registre** : il referme les questions ouvertes des autres documents VD, donne le plan de mise à niveau, les scénarios de test bout-en-bout, le lexique FR-EN, et le **registre complet des 345 règles vendeur + 139 règles client**.

### 2.1 Structure du document

#### A. Arbitrages : les réponses aux questions ouvertes (p.2-5)
20 arbitrages, **statut « Recommandé »** pour l'ensemble du bloc.

#### B. Plan de mise à niveau pour les développeurs (p.6-7)
- Ordre des **10 lots** de mise à niveau :
  1. Fondations (VD-01, VD-02)
  2. Commission officielle (VD-02)
  3. Argent (VD-09)
  4. Anonymat (VD-11)
  5. Commandes (VD-04, VD-05, VD-06)
  6. Litiges et retours (VD-07)
  7. Ouverture en trois temps (VD-03)
  8. Trust Score (VD-10)
  9. Catalogue (VD-08)
  10. Croissance et compte (VD-10, VD-11)
- **Tâches v1.1 annulées** : taux de commission unique par plan, retrait de fonds à la demande avec frais.
- **15 éléments à retirer de la production** (liste ci-dessous, section 2.4).
- Méthode : traiter écran par écran.

#### C. Scénarios de test de bout en bout T1 à T12 (p.8-9)
Voir liste complète en section 2.5.

#### D. Lexique français-anglais (p.10-11)
Voir extraits en section 2.4 (règles et valeurs) — lexique complet listé tel que donné dans le document.

#### E. Registre complet des règles du vendeur (p.12-31)
**345 règles**, présentées comme « **Ce tableau fait foi** » — couvre VD-01 à VD-11 en totalité :
- VD-01 : GEN-01 à GEN-12, NAV-01 à NAV-09, DS-01 à DS-14, SPL-01 à SPL-11
- VD-03 : CNX-01 à CNX-07, OUV-01 à OUV-05, KYC-01 à KYC-09, SAI-01 à SAI-04, INS-01 à INS-03
- VD-04 : ACC-01 à ACC-09, ACC-17 à ACC-19, ACC-22 à ACC-27, ACC-10 à ACC-16, ACC-20, ACC-21, OFF-01 à OFF-05, SUS-01 à SUS-03
- VD-05 : CMD-01 à CMD-10, PRE-01 à PRE-06, RUP-01 à RUP-04, DEL-01 à DEL-04, BON-01, BON-02, JRN-01, JRN-02
- VD-06 : REM-01 à REM-09, RCU-01 à RCU-04, ERR-01 à ERR-04
- VD-07 : LIT-01 à LIT-05, REP-01 à REP-06, DCS-01 à DCS-04, RET-01 à RET-08, INP-01 à INP-03, RMP-01 à RMP-03
- VD-08 : PRD-01 à PRD-07, OFR-01 à OFR-05, NOF-01 à NOF-05, FCH-01, FCH-02, PHO-01 à PHO-04, PRX-01 à PRX-09, REC-01, REC-02, PUB-01, DUP-01 à DUP-04
- VD-09 : ARG-01 à ARG-07, LIB-01 à LIB-03, GEL-01 à GEL-03, GAI-01 à GAI-03, DOC-01 à DOC-04, VER-01 à VER-05, NUM-01 à NUM-07
- VD-10 : TRU-01 à TRU-07, SCO-01 à SCO-06, PAL-01 à PAL-04, SAN-01 à SAN-06, CON-01, CON-02, PLN-01 à PLN-07, SIM-01, SIM-02, VIS-01 à VIS-06, SRV-01 à SRV-03, CHF-01 à CHF-04
- VD-11 : MEN-01 à MEN-04, BOU-01 à BOU-03, HOR-01 à HOR-05, EMP-01, EMP-02, EQU-01 à EQU-04, PAR-01 à PAR-06, SEC-01 à SEC-06, VNO-01 à VNO-06, AVI-01, AVI-02, MSG-01 à MSG-03, AID-01 à AID-03

Statuts rappelés dans ce registre :
- **Recommandé** : SPL-01 à SPL-11, ACC-23, ACC-27, ACC-12, ACC-14, REM-08, REM-09, RCU-04, ERR-03, ERR-04, OFR-05, ARG-07, VER-03, VER-05, NUM-05, NUM-07, SAN-06, PLN-04, PLN-05, VIS-06, SRV-03, DOC-04, HOR-05, SEC-06, VNO-06
- **Proposé** : CNX-03, CNX-04, CNX-06, CNX-07, OUV-05, KYC-06 à KYC-09, SAI-03, SAI-04, ACC-25, ACC-16, RUP-03, PRX-05, PRX-09, PAL-03, PLN-02, PLN-06, HOR-02 à HOR-04, EMP-01, EMP-02, EQU-02, EQU-04, PAR-04, PAR-05, MEN-03, MEN-04, AID-03
- **Décidé** : toutes les autres règles du registre.

#### F. Toutes les règles du client (p.31-38)
Les **139 anciennes règles client** (`client_rules.json`, antérieures à la v3 du 25 septembre) : CNV-01 à 06, CDS-01 à 06, CCA-01 à 07, CDR-01, CNO-01, CNO-02, CEX-01 à 05, ENT-01 à 08, DEC-01 à 17, FIC-01 à 11, PAN-01 à 21, CDE-01 à 21, PBL-01 à 14, CPT-01 à 15, NOT-01 à 05.
- Toutes **Décidé** sauf 3 **Recommandé** : CDE-09 (contrôle poussé au comptoir), CDE-13 (colis de valeur : porteur nommé, pièce vérifiée), CDE-18 (annulation par boutique, bouton grisé dès la collecte).
- **48 règles marquées « Vendeur »** (changent ce que le vendeur voit ou fait), dont CNV-06, CCA-05, CDR-01…
- Règles explicitement **remplacées par la v3** (cf. CL-16 partie 10) mais encore citées ici : CNV-01, CNV-02, CNV-04, CDS-05, CCA-04, CNO-02, NOT-01, DEC-03, DEC-07, DEC-15, CDE-21, PBL-12, PBL-14, CDE-13.

### 2.2 Tableau des actions numérotées (VD-D13.A01 → A13)

| ID | Description courte | Statut / Partie |
|---|---|---|
| VD-D13.A01 | Suivre l'ordre des 10 lots de mise à niveau ; arrêter les tâches v1.1 annulées, reprendre au lot 2 | partie 01 |
| VD-D13.A02 | Retirer de la production les 15 éléments listés | partie 01 |
| VD-D13.A03 | Afficher avant publication « Sous 3 043 F, la commission minimale de 700 F s'applique » (arbitrage 2) | partie 01 |
| VD-D13.A04 | Harmoniser le contrat : « de 76 à 98 % » (arbitrage 13) vs « de 76,5 à 98 % » (VD-03 Fig. 8) | partie 01 |
| VD-D13.A05 | Automatiser T1 à T12 en tests d'intégration sur le jeu d'essai | partie 01 |
| VD-D13.A06 | Revoir T6 (arbitrage automatique à 48 h) pour la règle v3 « présomption, BelivaY décide, jamais de remboursement automatique à l'échéance » (CL-16 n° 32) | partie 01 |
| VD-D13.A07 | Aligner le lexique anglais sur celui du client (« Validée » = *Order validated*, pas *Confirmed* ; « Payable au retrait » = *Validated · pay at pickup* ; « pickup » réservé au retrait client, « Ramassage » traduit autrement) | partie 01 |
| VD-D13.A08 | Aligner le pidgin des SMS (arbitrage 12) sur la règle client (SMS en français tant que traduction non validée, CIN-09) | partie 01 |
| VD-D13.A09 | Aucune action nouvelle : le registre fait foi, appliquer les actions déjà consignées dans les fiches VD-01 à VD-09 | partie 02 |
| VD-D13.A10 | Reporter dans le registre les corrections du tableau inter-espaces CL-16 (ACC-05, LIT-02 formule du silence ; RET-02 défaut caché ; RMP-02 remplacement ; OFR-05 vente flash sous FF-FLASH) une fois tranchées | partie 02 |
| VD-D13.A11 | Remplacer les anciennes règles client par les règles actuelles selon la table de correspondance CL-16 (CCA-04, CNO-02, NOT-01, CDE-21, DEC-03, DEC-07, CDS-05, DEC-15, PBL-12, PBL-14, CDE-13) | partie 03 |
| VD-D13.A12 | Marquer comme remplacées CNO-02, CDE-21, CDS-05, DEC-07 dans VD-12 (demandé par CL-16 n° 59, 63, 73) | partie 03 |
| VD-D13.A13 | Préciser la cohérence SMS : PLN-06 (rappel de renouvellement par SMS) contre VNO/VD-02 (SMS seulement commande à préparer et litige) | partie 03 |

### 2.3 Liste complète des 20 arbitrages (question ouverte → décision finale)

Tous les arbitrages ont le statut **Recommandé**.

1. **Formation obligatoire du vendeur ?** → **Pas de formation obligatoire** (AID-01).
2. **Comportement sous le seuil de commission ?** → **Prix minimum 500 F** ; message affiché avant publication : « Sous 3 043 F, la commission minimale de 700 F s'applique » (PRX-03). *(Exemple chiffré : à 600 F, net = −100 F.)*
3. **Arrondi des montants ?** → **Francs entiers, arrondi au franc** (DS-10).
4. **Application du plancher de 700 F après remboursement partiel ?** → **Le plancher 700 F n'est pas appliqué** après un remboursement partiel (VD-02).
5. **Que compte-t-on dans les « 50 commandes » du KYC ?** → Le compteur = commandes **encaissées et non remboursées** (KYC-05).
6. **Conservation Or/Platine en cas de rétrogradation ?** → **Or et Platine J+1 conservé** (règle datée du 21 sept.), reprise datée (H7) (GAI, RET-06).
7. **Poids d'un avis 1-2★ ?** → **= g1** (échec léger) (SCO-01).
8. **Comment prolonger un délai en retard ?** → **Prolongation en 3 paliers : +1 h, +2 h, demain à l'ouverture** (V07) (DEL-03).
9. **Couleur d'affichage de « Se libère » (statut de l'argent) ?** → **Orange** (GEN-12).
10. **Pages manquantes à dessiner ?** → **Toutes les « pages à ajouter » doivent être dessinées** (DUP, OFR, CON, SAN, ACC, JRN).
11. **Faut-il garder 2 écrans de compte (FR/EN) ?** → **Un seul écran « Paramètres »**, traduit (PAR).
12. **Le pidgin doit-il couvrir les SMS ?** → **Oui** : pidgin devient la **3e langue de l'application, des notifications et des SMS**, fichier `pcm` (décision M2) (GEN-10). *(Contredit ensuite par la règle client CIN-09 — voir contradictions.)*
13. **Quelle est la vraie fourchette du contrat de commission ?** → **« de 76 à 98 % selon la catégorie, le prix et le palier »**, minimum 700 F ; grille affichée dans Sécurité (KYC, SEC-05). *(Écart chiffré : la spec V10 disait 76,5-98 % ou 79-95 % selon la source — voir contradictions ; exemple : iPhone du jeu d'essai à 95,8 %.)*
14. **Comment calculer la remise d'abonnement (V13) ?** → **5 % (Boost) et 10 % (Pro) de la commission des commandes payées du mois**, restituée si remboursée, plafonnée au prix (V15) (PLN, SIM). *(Exemple chiffré à 60 000 F : Free = 53 520 F, Boost = 51 344 F, Pro = 46 668 F.)*
15. **Comment gérer plans/visibilité/services payants ?** → **Paiement par MoMo avec confirmation**, facture dans Documents (PLN-04, VIS-06, SRV-03, DOC-04).
16. **Quelles promotions autoriser ?** → **Seulement par vente flash**, prix barré réellement pratiqué (OFR-05).
17. **Où envoyer le second facteur ?** → **Toujours par SMS au téléphone personnel** (SEC-04, NUM-07).
18. **Comment organiser le menu ?** → **Par usage + groupe replié** (MEN).
19. **Le Trust Score de test est-il correct ?** → **Trust Score 62,7 vérifié** (test SCO T7).
20. **Où placer les fonctionnalités IA avancées ?** → **Pages de l'assistant IA rattachées aux écrans existants** ; comparaison entre vendeurs, calendrier saisonnier, planification de stock renvoyés en **phase 2**.

### 2.4 Règles métier et calculs clés (chiffres exacts) — hors arbitrages

- **15 éléments à retirer de la production** : plans Gratuit/Starter/Pro/Business (taux **20 %, 18 %, 12 %, 10 %, 5 %**) et réductions **−1/−2/−3 %** ; lignes de commission ; cinq pages financières ; bouton « Retirer » avec minimum **1 000 F** et frais **1,5 %** ; tuiles/graphique/heatmap, objectif **500 000 F**, « Clients uniques » ; bannière Plan Pro, « Analytiques IA », « Boost & Pub », « Boost Buy Box » ; page boutique publique, QR, WhatsApp public ; ville/quartier/relais/mode de livraison du client (visibles vendeur) ; commandes non payées, stepper, statuts techniques ; consignes d'emballage ; points des certifications et « Diamant » ; catalogue de démonstration et création de fiche ; captures WhatsApp comme preuves ; 144 sessions avec IP, trois numéros confondus, « My account » ; libellés sans accents, « reversement », « acheteur », « escrow », anglais dans l'interface française.
- **Registre — valeurs reprises des fiches VD-01 à VD-09** : versement le **vendredi avant 12 h**, arrêté le **jeudi minuit** ; code de remise **6 chiffres** ; **3 accès employés** ; OTP **10 min** ; **5 essais ⇒ blocage 15 min** ; plafond de démarrage **500 000 F / 10 commandes** ; saisie assistée **5 000 F** ; échéance absolue **24 h** ; hors connexion **72 h** ; photos **3 à 8**, **800 × 800 px** ; prix minimum **500 F** ; remplacement **72 h ouvrées** ; trajet **500 F** ; vice caché **100 jours** ; libération **3 j / 1 j**.
- **Exemples d'anciennes règles client (registre partie 03)** : CCA-01 relais **900 F = 500 + 400**, domicile **1 500 F = 500 + 1 000** ; CCA-02 **380 F même zone, 500 F autre zone** ; CCA-03 livraison offerte dès **30 000 / 50 000 F** ; CCA-04 garde **0/100/100/200/200/400/400 + 500 F**, colis L doublé ; CCA-05 annulation **84 380 F** (exemple) ; CCA-06 carte **2 %** ; CCA-07 poids **÷ 5 000** ; CNV-05 en-tête **52 px**, contenu remonté de **150 px** ; CNV-06 Dynamic Island **124 × 36 px**, barre d'accueil **136 × 5 px** ; CDS-02 flou **20 à 24 px**, saturation **180 %**.
- **48 règles client marquées « Vendeur »** (dont CNV-06, CCA-05, CDR-01…).

### 2.5 Scénarios de test de bout en bout (T1 à T12)

1. **T1 — journée normale** : commande BLV-00008 payée **08 h 42** ; « C'est prêt » à **10 h 05** ; le livreur (Serge M.) saisit le code **481729** à **14 h 22** ; versement « Versé » BLV-VS-nnnn de **17 840 F**, **0 F de frais**.
2. **T2 — payable au retrait** : BLV-00009 validée **09 h 05** ; refus au comptoir → annulée, aucun effet ; payée au comptoir → « Payée », **17 840 F figé**.
3. **T3 — rupture** : gravité **g1**, stock à 0, écart de prix **≤ +5 %** payé par BelivaY.
4. **T4 — plus de temps** : prolongation **+1 h ⇒ 13 h 42** ; au-delà, grisé mardi **08 h 42**.
5. **T5 — litige contesté et gagné** : **335 324 F** gelés, « il reste 19 h 42 », gagné, libéré aussitôt.
6. **T6 — litige sans réponse** : BLV-00006, à **mer. 23 à 06 h 02** sans réponse → arbitrage appliqué automatiquement en faveur du client ; **g1 ou g3**.
7. **T7 — retour et inspection** : BLV-00004 signalé **30 h après**, **17 840 F gelés** ; inspection jusqu'au **jeu. 24 à 16 h** ; conforme → remplacement **72 h ouvrées**, **500 F**, **g3** ; sans décision à **48 h** → remboursement.
8. **T8 — nouvelle offre au prix conseillé** : **21 000 F → 18 800 F** ; conseil **18 900 F → 16 859 F** ; badge « Meilleur prix ».
9. **T9 — changement de numéro** : **655** accepté (Orange), **677** refusé ; délai **7 jours** ; versement du **25** après revue.
10. **T10 — hors connexion** : coupure à **09 h 14** ; tolérance **72 h**.
11. **T11 — employé** : scénario avec Aïcha N. (accès Préparation).
12. **T12 — fermé aujourd'hui** : boutique fermée jusqu'à **demain 08 h**.

### 2.6 Lexique français-anglais (extraits donnés dans le document)

| Français | Anglais |
|---|---|
| Espace vendeur | Seller space |
| Accueil · Commandes · Produits · Argent | Home · Orders · Products · Money |
| C'est prêt | It's ready |
| Rupture | Out of stock |
| Bon de préparation | Picking slip |
| Livreur | Courier |
| Code de remise | Handover code |
| Ramassage | Pickup |
| Classe du colis | Parcel class |
| Payée · Validée | Paid · Confirmed |
| Payable au retrait | Pay on pickup |
| Paiement au comptoir | Pay at the counter |
| Litige — gelé | Dispute — frozen |
| Vous gardez | You keep |
| Gagné avec BelivaY | Earned with BelivaY |
| À verser · Se libère · En cours · Gelé | To be paid out · Releasing · In progress · Frozen |
| Palier (Bronze, Argent, Or, Platine) | Tier (Bronze, Silver, Gold, Platinum) |
| Sponsorisé | Sponsored |
| Contester | Appeal |
| Taille du texte | Text size: Normal · Large · Extra large |
| Montants | « 17,840 F » (format) |
| Heures | « 12:42 pm » (format) |

*Remarque : ce lexique est celui du document VD-12 lui-même — l'action VD-D13.A07 demande de le corriger pour l'aligner sur le lexique client (« Validée » ≠ « Confirmed », « pickup » ≠ « ramassage »), donc le tableau ci-dessus contient volontairement les termes que le document demande ensuite de changer (voir contradictions).*

### 2.7 Questions ouvertes à trancher (au-delà des arbitrages)

- **VD-D13.Q01** (partie 01) : T6 — arbitrage automatique en faveur du client à 48 h (VD) contre décision humaine (v3) (déjà ouvert, n° 32).
- **VD-D13.Q02** (partie 01) : Lexique — « Validée » traduit « Confirmed » (VD) contre « validated » (client) ; « Pickup » = ramassage (VD) contre retrait (client, convention CL-16) — risque de confusion à trancher.
- **VD-D13.Q03** (partie 01) : Plage « vous gardez » du contrat — 76 % ou 76,5 % ?
- **VD-D13.Q04** (partie 01) : Pidgin dans les SMS vendeur (arbitrage 12) contre SMS client en français jusqu'à validation.
- **VD-D13.Q05** (partie 02) : Mêmes écarts que ceux relevés dans les fiches VD-04, VD-07, VD-08 (silence du vendeur, défaut caché, remplacement, vente flash) — déjà ouverts.
- **VD-D13.Q06** (partie 03) : Le paquet vendeur (v1.0, 24 sept.) s'appuie sur l'ancienne liste de 139 règles client, antérieure à la v3 du 25 sept. — plusieurs règles citées sont remplacées (déjà ouvert).
- **VD-D13.Q07** (partie 03) : PLN-06 SMS de rappel contre la règle « SMS seulement pour commande à préparer et litige ».

### 2.8 Contradictions internes ou incohérences apparentes (signalées, non résolues)

1. **Le document se contredit lui-même sur le pourcentage de commission** : l'arbitrage 13 tranche « de 76 à 98 % » alors que VD-03 Fig. 8 dit « de 76,5 à 98 % » et que la spec V10 mentionnait encore une autre fourchette (79-95 %) — trois valeurs différentes pour la même donnée contractuelle (Q03/A04).
2. **Le lexique anglais publié dans ce même document est explicitement jugé fautif par l'action A07** : « Validée » = *Confirmed* et « Ramassage » = *Pickup* sont les termes utilisés dans VD-12, mais l'action demande de les remplacer (*Order validated*, autre mot que *pickup*) pour coller au lexique client — le document livre donc un lexique qu'il qualifie lui-même de à corriger (Q02).
3. **Arbitrage 12 (pidgin dans les SMS) contredit la règle client CIN-09** (SMS en français tant que la traduction n'est pas validée) — l'arbitrage recommandé n'est pas encore aligné avec la règle client en vigueur (Q04/A08).
4. **T6 contredit potentiellement la doctrine v3 des litiges** : le scénario de test formalise un arbitrage automatique en faveur du client à 48 h sans réponse, alors que la règle v3 (CL-16 n° 32) impose une présomption suivie d'une décision humaine BelivaY, « jamais de remboursement automatique à l'échéance » (Q01/A06).
5. **Le paquet entier repose sur une base client obsolète** : les 139 règles client citées dans le registre (partie 03) datent d'avant la v3 du 25 septembre ; au moins 11 règles sont déjà marquées comme remplacées dans le texte lui-même (CNV-01, CNV-02, CNV-04, CDS-05, CCA-04, CNO-02, NOT-01, DEC-03, DEC-07, DEC-15, CDE-21, PBL-12, PBL-14, CDE-13) — un décalage de version structurel entre le paquet vendeur et le référentiel client (Q06).
6. **PLN-06 (rappel de renouvellement d'abonnement par SMS) contredit la règle générale des notifications** (VNO / VD-02 : SMS réservé uniquement à « commande à préparer » et « litige ») — incohérence interne signalée mais non résolue par le document (Q07/A13).
7. **Écarts déjà ouverts ailleurs** repris tels quels sans arbitrage supplémentaire : silence du vendeur (ACC-05/LIT-02), défaut caché (RET-02), remplacement accepté/refusé par le client (RMP-02), vente flash (OFR-05) — le registre note leur existence sans trancher (Q05).

---

## 3. Récapitulatif inter-documents (VD-11 ↔ VD-12)

VD-12 est conçu comme le document qui ferme les questions ouvertes de VD-11 (et des 10 autres fiches VD). Cependant, la comparaison directe montre que **VD-12 ne referme pas toutes les questions posées par VD-11** :
- Q06/AVI-02 (VD-11) et Q06 (VD-12 Q-list) restent alignées : la contradiction AVI-02 vs v3 client n'est **pas arbitrée** dans la liste des 20 arbitrages de VD-12 — elle réapparaît telle quelle comme question ouverte.
- Q07/MSG-02 (fermeture du fil de messagerie) n'est pas non plus arbitrée : reste question ouverte n° 51.
- Q04 (route `/account/closure` vs `/account/close`) n'est pas arbitrée dans les 20 arbitrages : reste ouverte.
- Q05 (pidgin SMS vendeur vs français client) est explicitement traitée comme contradiction par l'action A08 de VD-12, qui demande d'aligner l'arbitrage 12 sur la règle client — c'est-à-dire que **VD-12 corrige son propre arbitrage a posteriori**.

Autrement dit : sur les 9 questions ouvertes de VD-11, seule une partie (celles liées au pidgin/lexique et à la commission) trouve une réponse concrète dans les 20 arbitrages de VD-12 ; les questions de fond sur les litiges (arbitrage automatique T6, fermeture de fil AVI-02/MSG-02) restent en suspens dans les deux documents.

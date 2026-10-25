// Registre des connecteurs de l'espace point relais : pour chaque méthode de la SourceRelais (« domaine.methode »), la
// route du serveur qui la sert (/api/relay/…, kit backend-kit/apps/relais_compte et relais_guichet, PR-02 « API de
// référence » v2.0) et son état. Le type garantit qu'aucune méthode n'est oubliée. Une seule vérité, lue par
// backend-kit/outils/generer-openapi.mts (contrat openapi.yaml, étiquette « Espace point relais »),
// outils/connecteurs.mjs (tableau de CONNECTEURS-RELAIS.md), src/api/connecteurs.test.ts et le test du kit
// apps/relais_core/tests/test_contrat_relais.py (chaque route servie, chaque champ du corps lu par le serveur).
// Pendants côté livreur : dépôt au relais POST /api/courier/stops/{id}/relay-drop/confirm (la garde passe au relais à
// cette confirmation) ; sortie POST /api/courier/stops/{id}/departures/{colis}/confirm puis /departures/confirm.
//   route  : « MÉTHODE /api/relay/chemin {corps} (Idempotency-Key) »
//   echange: « → Type ; refus métier » (refus en 200 { ok: false, raison })
import type { NomDomaine, SourceRelais } from '../donnees/source'

/** branche : appel réel (src/api/domaines) ; telephone : servi sur le téléphone, sans route (file hors connexion,
 * brouillon) ; demo : geste d'une autre interface (application du client, agrégateur, console), propre à la
 * démonstration — sur le serveur d'essai, les routes /api/_essai/relais/… le remplacent. */
export type EtatConnecteur = 'branche' | 'telephone' | 'demo'
export interface Connecteur {
  etat: EtatConnecteur
  route: string
  echange?: string
  note?: string
}
export type MethodeRelais = { [D in NomDomaine]: `${D}.${Extract<keyof SourceRelais[D], string>}` }[NomDomaine]

const b = (route: string, echange?: string, note?: string): Connecteur => ({ etat: 'branche', route, echange, note })
const tel = (note: string): Connecteur => ({ etat: 'telephone', route: '—', note })
const IK = ' (Idempotency-Key)'

export const CONNECTEURS_RELAIS: Record<MethodeRelais, Connecteur> = {
  'session.session': b('GET /api/relay/me', '→ SessionRelais', 'profil, statut, capacité, trust, palier, compteurs de l’en-tête'),
  'session.ecranConnexion': b('GET /api/relay/auth/state', '→ EcranConnexion', 'étape de cet appareil (en-tête X-Device-Id, CNX-04) ; numéro toujours masqué'),
  'session.commencer': b('POST /api/relay/auth/start {phone, origine}', '→ Resultat {etape} inconnu | acces_retire | numero_invalide | candidature_en_cours', 'PR-03 /auth/relay/start → needs_otp (PAR-02)'),
  'session.verifierCode': b('POST /api/relay/auth/otp {code, origine}', '→ Resultat {etape} code_faux | expire | bloque', 'OTP-LONGUEUR, OTP-DUREE, sms_essais_code ; lie l’appareil'),
  'session.renvoyerCode': b('POST /api/relay/auth/otp/resend {origine}', '→ Resultat trop_tot | trop_d_envois', 'OTP-RENVOI'),
  'session.connecter': b('POST /api/relay/auth/pin {pin, origine}', '→ Resultat pin_faux | bloque | acces_retire', 'PIN-ESSAIS faux : blocage PR-PIN-BLOCAGE-MIN, gérant prévenu (CNX-03) ; PIN haché Argon2'),
  'session.pinOublie': b('POST /api/relay/auth/pin/forgot {origine}', '→ Resultat trop_d_envois', 'code SMS au numéro du compte'),
  'session.creerPin': b('POST /api/relay/auth/pin/new {pin, origine}', '→ Resultat pin_trop_simple | code_requis', 'après un code SMS vérifié'),
  'session.changerNumero': b('DELETE /api/relay/auth/device', undefined, 'délie cet appareil'),
  'session.deconnecter': b('POST /api/relay/logout'),

  'acces.invitation': b('GET /api/relay/invitations/{jeton}', '→ Invitation ; 404 → null'),
  'acces.accepterInvitation': b('POST /api/relay/invitations/{jeton}/accept {pin, origine}' + IK, '→ Resultat expiree | pin_trop_simple | deja_utilisee | retiree | equipe_complete'),
  'acces.redemanderInvitation': b('POST /api/relay/invitations/{jeton}/renew {origine}' + IK, '→ Resultat introuvable', 'le gérant est prévenu (INV-01)'),
  'acces.formation': b('GET /api/relay/me/training', '→ FormationMembre'),
  'acces.quartiers': b('GET /api/relay/applications/areas', '→ QuartierCandidat[]', 'table quartier → zone, ZONES-EXPLOITEES, RELAIS-PAR-ZONE'),
  'acces.brouillon': tel('brouillon gardé sur le téléphone, localStorage « blv_r_brouillon » (INS-01) ; part avec la candidature'),
  'acces.enregistrerBrouillon': tel('brouillon gardé sur le téléphone, localStorage « blv_r_brouillon » (INS-01) ; part avec la candidature'),
  'acces.envoyerCodeVersement': b('POST /api/relay/applications/payout-number/otp {operateur, numero, origine}', '→ Resultat {expireA} prefixe | numero_invalide | trop_tot', 'PR-PREFIXES-MOMO (INS-03)'),
  'acces.verifierCodeVersement': b('POST /api/relay/applications/payout-number/verify {code, origine}', '→ Resultat code_faux | expire'),
  'acces.candidater': b('POST /api/relay/applications {brouillon, pieces, signature, origine}' + IK, '→ Resultat {reference} deja_candidat | incomplet | versement_non_verifie | convention_non_signee', 'crée un relais « candidat » en console (PR03-R06) ; hors zone : liste d’attente'),
  'acces.candidature': b('GET /api/relay/applications/mine', '→ Candidature ; 404 → null'),
  'acces.programme': b('GET /api/relay/training/program', '→ ModuleVu[]'),
  'acces.activation': b('GET /api/relay/activation', '→ Activation'),
  'acces.statut': b('GET /api/relay/status', '→ StatutDetail'),
  'acces.contester': b('POST /api/relay/decisions/{id}/contest {texte, origine}' + IK, '→ Resultat {reponseAvant} deja_contestee | non_contestable', 'une fois, PR-CONTEST-H (STA-03)'),
  'acces.annulerFin': b('DELETE /api/relay/account/closure', '→ Resultat aucune | deja_prononcee', 'ARL-26, DP-67'),

  'aujourdhui.aujourdhui': b('GET /api/relay/today', '→ Aujourdhui', 'gains et caisse à null pour un employé'),

  'reception.lots': b('GET /api/relay/missions?status=announced', '→ Lot[]', 'lots annoncés ; un lot vu sur ce téléphone puis confirmé par le livreur est relu (GET missions/{id}) et gardé le jour même'),
  'reception.lot': b('GET /api/relay/missions/{id}', '→ Lot ; 404 → null'),
  'reception.regles': b('GET /api/relay/config/reception', '→ ReglesReception', 'lu dans la configuration versionnée (CODE-*, PIN-LONGUEUR, PR-LOT-CONFIRM-MIN, RELAIS-PLACES, PR-SATURATION, PHOTO-MAX-KO)'),
  'reception.scannerEtiquette': b('POST /api/relay/missions/{id}/scan {etiquette, origine}' + IK, '→ IssueScan dans_le_lot | deja_scanne | pas_pour_ce_relais | en_trop | illisible', 'PR-RC-04 : étiquette d’un autre relais, incident « mauvais relais » côté entreprise'),
  'reception.verifierCodeDepot': b('POST /api/relay/missions/verify-code {code, origine}' + IK, '→ Resultat {lot} code_faux | bloque | deja_valide', 'code de dépôt en 6 chiffres ou jeton du QR du livreur (DP-62) ; jamais renvoyé'),
  'reception.resultat': b('POST /api/relay/missions/{id}/items/{parcel} {resultat, scelle, photos, note, motif, origine}' + IK, '→ Resultat photo_manquante | transition_interdite'),
  'reception.colisEnTrop': b('POST /api/relay/missions/{id}/items/{parcel} {resultat: "en_trop", classe, photos, origine}' + IK, '→ Resultat'),
  'reception.validerLot': b('POST /api/relay/missions/{id}/validate {photo, pin, origine}' + IK, '→ Resultat {emplacements} colis_sans_resultat | photo_manquante | pin_requis', 'garde au relais à POST /api/courier/stops/{id}/relay-drop/confirm'),

  'retrait.verifierCode': b('POST /api/relay/handover/verify {methode, valeur, remise, origine}' + IK, '→ Resultat {remise} code_faux | bloque | trop_de_codes | deja_remis | non_remettable | pas_au_relais | etiquette', 'un code par colis (ARL-01) ; le code n’est jamais renvoyé ; detail : essais restants, fin du blocage, état'),
  'retrait.rechercher': b('GET /api/relay/handover/search?ref=|phone=', '→ Remise ; 404 → null', 'commande payable au retrait ; le numéro n’est jamais renvoyé (PR-RC-11)'),
  'retrait.remise': b('GET /api/relay/handover/{id}', '→ Remise ; 404 → null', 'gain filtré pour l’employé (PR-RC-09)'),
  'retrait.demanderPaiement': b('POST /api/relay/handover/{id}/payment {origine}' + IK, '→ Resultat reseau_requis', 'demande CamPay ; statut par webhook (PR-PAY-COMPTOIR-DELAI-MIN) ; jamais hors ligne (OFF-02)'),
  'retrait.annulerPaiement': b('DELETE /api/relay/handover/{id}/payment {origine}' + IK, '→ Resultat transition_interdite', 'abandonne une demande non confirmée'),
  'retrait.confirmerEncaissement': b('POST /api/relay/handover/{id}/cash {recu, origine}' + IK, '→ Resultat {monnaie} montant_insuffisant', 'espèces de garde, une fois par groupe (ARL-02) ; journal signé (ARL-32) ; storage.cash.collected'),
  'retrait.inviterControle': b('POST /api/relay/handover/{id}/check-request {origine}' + IK, '→ Resultat reseau_requis', 'DP-28 : la confirmation vient de l’application du client (handover.all_in_order)'),
  'retrait.nePasOuvrir': b('POST /api/relay/handover/{id}/check {controle: "sans_ouverture", origine}' + IK, '→ Resultat', 'ARL-36 : inscrit au journal, fenêtre de retour ouverte'),
  'retrait.poserPreuve': b('POST /api/relay/handover/{id}/proof {photo, porteur, nomPorteur, pieceVerifiee, origine}' + IK, '→ Resultat photo_manquante | porteur_requis | porteur_non_autorise | piece_non_verifiee'),
  'retrait.remettre': b('POST /api/relay/handover/{id}/complete {pin, origine}' + IK, '→ Resultat {remise} encaissement_non_confirme | paiement_requis | photo_manquante | pin_faux | pin_bloque | remise_annulee | plafond_hors_ligne', 'handover.completed ; 3 PIN faux : handover.pin_cancelled + storage.cash.reversed (ARL-42)'),
  'retrait.refusSansMotif': b('POST /api/relay/handover/{id}/refuse {pin, origine}' + IK, '→ Resultat', 'DP-24 : garde retenue sur la livraison payée'),
  'retrait.abandonner': b('POST /api/relay/handover/{id}/cancel {motif, constat, origine}' + IK, '→ Resultat {especesRendues}', 'contre-écriture des espèces (PR-RC-31)'),
  'retrait.presentables': { etat: 'demo', route: '—', note: 'application du client (essai : /api/_essai/relais/…)' },
  'retrait.simulerPresentation': { etat: 'demo', route: '—', note: 'application du client (essai : /api/_essai/relais/…)' },
  'retrait.simulerRefusPaiement': { etat: 'demo', route: '—', note: 'agrégateur Mobile Money' },

  'stock.stock': b('GET /api/relay/stock?filter=&q=', '→ Stock'),
  'stock.fiche': b('GET /api/relay/parcels/{ref}', '→ ColisRelais ; 404 → null'),
  'stock.plan': b('GET /api/relay/slots', '→ Case[]'),
  'stock.deplacer': b('POST /api/relay/parcels/{ref}/move {emplacement, origine}' + IK, '→ Resultat case_pleine | etagere_interdite'),
  'stock.vue': b('GET /api/relay/stock?tab=&q=&class=&blocked=&counter=&slot=', '→ VueStock', 'part du relais à null pour l’employé (PR-RC-09)'),
  'stock.ficheComplete': b('GET /api/relay/parcels/{ref}?detail=full', '→ FicheColis ; 404 → null', 'parcours, garde jour par jour, preuves, journal ; aucune donnée personnelle (FIC-01)'),
  'stock.inventaire': b('GET /api/relay/inventory', '→ Inventaire | null'),
  'stock.commencerInventaire': b('POST /api/relay/inventory {origine}' + IK, '→ Resultat {id} inventaire_en_cours'),
  'stock.pointer': b('POST /api/relay/inventory/{id}/check {colis, trouve_en, origine}' + IK, '→ Resultat {ecart} pas_au_relais | deja_pointe', 'id « courant » : l’inventaire en cours (même chemin au rejeu hors connexion)'),
  'stock.terminerInventaire': b('POST /api/relay/inventory/{id}/close {pin, origine}' + IK, '→ Resultat {bilan} pin_requis | aucun_inventaire', 'id lu par GET /api/relay/inventory ; manquants signalés à la console (relay.inventory.missing)'),

  'departs.departs': b('GET /api/relay/departures', '→ Departs'),
  'departs.regles': b('GET /api/relay/config?scope=departures', '→ ReglesDeparts', 'PIN-LONGUEUR, PR-DEP-ALERTE-H, TRANSFERT-RELAIS, GARDE-GRILLE, GARDE-RENVOI'),
  'departs.scanner': b('POST /api/relay/departures/{id}/scan {colis, origine}' + IK, '→ Resultat'),
  'departs.annulerScan': b('DELETE /api/relay/departures/{id}/scan/{colis} {origine}' + IK, '→ Resultat deja_validee'),
  'departs.marquerAbsent': b('POST /api/relay/departures/{id}/scan {colis, absent: motif, origine}' + IK, '→ Resultat', 'DEP-02 : absent avec motif ; introuvable alerte le support'),
  'departs.annulerAbsent': b('DELETE /api/relay/departures/{id}/absent/{colis} {origine}' + IK, '→ Resultat deja_validee'),
  'departs.valider': b('POST /api/relay/departures/{id}/validate {photo, pin, origine}' + IK, '→ Resultat {partis}', 'pendant livreur : POST /api/courier/stops/{id}/departures/confirm'),

  'incidents.dossiers': b('GET /api/relay/claims', '→ Dossier[]', 'étape et échéance calculées par le serveur (DP-35) ; retenue à null pour un employé'),
  'incidents.dossier': b('GET /api/relay/claims/{id}', '→ Dossier ; 404 → null', 'fil lisible PR-PREUVES-CONSERV-J jours après la clôture (ARL-40)'),
  'incidents.colisPourConstat': b('GET /api/relay/claims/parcel?ref=', '→ ColisPourConstat ; 404 → null'),
  'incidents.ouvrirConstat': b('POST /api/relay/claims {colis, motif, photos, note, devantLeClient, pin, origine}' + IK, '→ Resultat {id} motif_requis | photo_manquante | non_constatable | pin_faux | bloque', 'délais depuis la réception par le serveur (OFF-01) ; événement claim.opened'),
  'incidents.ajouterPhotos': b('POST /api/relay/claims/{id}/photos {photos, origine}' + IK, '→ Resultat clos', 'répond à claim.photo_requested'),
  'incidents.ecrire': b('POST /api/relay/claims/{id}/messages {texte, photos, origine}' + IK, '→ Resultat {id} fil_ferme | vide'),
  'incidents.contester': b('POST /api/relay/claims/{id}/contest {motif, origine}' + IK, '→ Resultat non_contestable | deja_contestee | delai_depasse', 'gérant seulement (403 owner_only), une fois, PR-CONTESTATION-H'),
  'incidents.retours': b('GET /api/relay/returns', '→ RetourVu[]'),
  'incidents.verifierRetour': b('GET /api/relay/returns/{reference}', '→ Resultat {retour} non_valide | deja_depose ; 404 → introuvable', 'LIT-05 : un retour non validé ne se prend pas'),
  'incidents.deposerRetour': b('POST /api/relay/returns/drop {reference, scelle, photos, pin, origine}' + IK, '→ Resultat {emplacement} non_valide | photo_manquante | pin_faux', 'hors capacité, jamais facturé, payé comme une remise (ARL-39)'),

  'fermeture.fermetures': b('GET /api/relay/closures', '→ Fermeture[]'),
  'fermeture.apercu': b('POST /api/relay/closures/preview {type, motif, du, au}', '→ ApercuFermeture', 'conséquence selon la durée (ARL-20, DP-42), colis concernés, refus éventuel'),
  'fermeture.declarer': b('POST /api/relay/closures {type, motif, du, au, origine}' + IK, '→ Resultat {id, rouvreLe} droit_refuse | preavis_insuffisant | motif_interdit | chevauchement | dates_invalides', 'événement relay.closure.declared'),
  'fermeture.annuler': b('DELETE /api/relay/closures/{id}', '→ Resultat deja_commencee | droit_refuse'),
  'fermeture.rouvrir': b('POST /api/relay/closures/{id}/reopen {origine}' + IK, '→ Resultat pas_en_cours'),
  'fermeture.joindreJustificatif': b('POST /api/relay/closures/{id}/proof {photo, origine}' + IK, '→ Resultat non_demande'),

  'historique.historique': b('GET /api/relay/history?period=&type=&q=', '→ Historique', 'aucun montant pour un employé (HIS-03)'),
  'historique.exporter': b('GET /api/relay/history/export?period=&type=&q=', '→ CSV ; 403 owner_only'),

  'notifications.notifications': b('GET /api/relay/notifications', '→ Notification[]'),
  'notifications.lire': b('POST /api/relay/notifications/{id}/read'),
  'notifications.toutLire': b('POST /api/relay/notifications/read-all'),
  'notifications.centre': b('GET /api/relay/notifications/center', '→ CentreNotifications', 'filtrées selon le rôle ; résumé du matin ; réglages du membre'),
  'notifications.regler': b('PUT /api/relay/notifications/settings {push, approche, versements, heureResume, origine}', '→ Resultat {reglages} trop_tot | trop_tard | reserve_au_gerant', 'NTF-01 : jamais avant PR-NTF-RESUME-H'),

  'messages.fils': b('GET /api/relay/threads', '→ Fil[]'),
  'messages.fil': b('GET /api/relay/threads/{id}', '→ Fil ; 404 → null'),
  'messages.envoyer': b('POST /api/relay/threads/{id}/messages {texte, pieces, origine}' + IK, '→ Resultat {id}'),
  'messages.demanderRappel': b('POST /api/relay/support/callback {motif, origine}' + IK, '→ Resultat {rappelAvant, programme} deja_demande'),
  'messages.repondreVite': b('POST /api/relay/threads/{id}/quick-replies/{n} {origine}' + IK, '→ Resultat {id, rappelAvant?} ferme | deja_demande', 'MSG-06 : seule écriture du fil logistique'),
  'messages.ecrireAuSupport': b('POST /api/relay/support/requests {categorie, reference, texte, pieces, origine}' + IK, '→ Resultat {filId} reserve_au_gerant | reference_invalide', 'AID-03 : crée un fil Support'),
  'messages.support': b('GET /api/relay/support', '→ Support', 'SUP-HORAIRES, SUP-DELAI, moyenne 7 jours, rappel en attente'),
  'messages.joignables': b('GET /api/relay/calls/reachable', '→ Joignable[]', 'DP-61 : livreur pendant sa mission, support pendant ses heures'),
  'messages.appels': b('GET /api/relay/calls', '→ Appel[]', 'journal sans contenu'),
  'messages.appeler': b('POST /api/relay/calls {cible, origine}' + IK, '→ Resultat {appel} ferme | deja_en_cours', 'numéro masqué, jamais le vrai numéro'),
  'messages.raccrocher': b('POST /api/relay/calls/{id}/end {origine}' + IK, '→ Resultat {appel}'),

  'aide.aide': b('GET /api/relay/help', '→ Aide', 'réponses éditées en console (AID-02), filtrées selon le rôle'),
  'aide.fiche': b('GET /api/relay/help/sheets/{id}', '→ FicheAide ; 404 → null'),
  'aide.registre': b('GET /api/relay/paper-register', '→ RegistrePapier'),
  'aide.saisirLigne': b('POST /api/relay/paper-register/lines {panne, reference, code, heure, pieceVerifiee, signature, photo, pin, origine}' + IK, '→ Resultat {ligne} montant_du | code_faux | delai_depasse | hors_panne', 'AID-04 : colis sans montant seulement, PR-PAPIER-SAISIE-H'),

  'argent.argent': b('GET /api/relay/payouts/next', '→ Argent', 'gérant seul ; prochain versement (provisoire avant l’arrêté du jeudi minuit), caisse du jour, numéro, changement en cours, dette'),
  'argent.versements': b('GET /api/relay/payouts', '→ Versement[]', 'relevé ligne par ligne, états prévu · envoyé · crédité · refusé · suspendu'),
  'argent.versement': b('GET /api/relay/payouts/{id}', '→ Versement ; 404 → null'),
  'argent.signalerNonRecu': b('POST /api/relay/payouts/{id}/not-received {origine}' + IK, '→ Resultat {reponseAvant} pas_encore_envoye | deja_signale', 'VER-05 : réponse avant le lundi midi suivant, preuve de l’opérateur'),
  'argent.changerNumero': b('POST /api/relay/payout-number {operateur, numero, origine}' + IK, '→ Resultat {codesEnvoyes, expireA} prefixe_inconnu | prefixe_operateur | meme_numero | verification_en_cours', 'réseau obligatoire ; deux codes SMS (nouveau numéro, téléphone du gérant)'),
  'argent.renvoyerCodes': b('POST /api/relay/payout-number/resend {origine}' + IK, '→ Resultat {expireA} trop_tot', 'OTP-RENVOI'),
  'argent.confirmerNumero': b('POST /api/relay/payout-number/confirm {codes, origine}' + IK, '→ Resultat {suspendusJusqua, premierVersementLe} code_faux | code_expire | trop_essais', 'vérification par une personne (PR-NUM-VERIF-J) ; SMS « Ce n’est pas vous ? » à l’ancien numéro'),
  'argent.annulerChangement': b('DELETE /api/relay/payout-number/pending {origine}', '→ Resultat aucune_demande'),
  'argent.reverserDette': b('POST /api/relay/debt/pay {origine}' + IK, '→ Resultat {reference} aucune_dette | deja_en_cours', 'ARL-05 : demande de paiement Mobile Money vers le numéro marchand BelivaY ; réseau obligatoire'),
  'argent.rapport': b('GET /api/relay/reports?period=month|quarter|since_opening', '→ Rapport', 'RAP-01 à RAP-04'),
  'argent.releve': b('GET /api/relay/reports/statement?period=&format=pdf|csv', '→ FichierReleve', 'RAP-03'),

  'qualite.trust': b('GET /api/relay/trust', '→ Trust', 'score, critères, tenue, alerte de seuil (ARL-15), journal des événements et des décisions'),
  'qualite.avis': b('GET /api/relay/reviews', '→ Avis[]', 'anonymes (GEN-01)'),
  'qualite.repondreAvis': b('POST /api/relay/reviews/{id}/reply {texte, origine}' + IK, '→ Resultat deja_repondu | texte_vide', 'DP-39 : réponse privée dans la messagerie du client, jamais publiée'),
  'qualite.signalerAvis': b('POST /api/relay/reviews/{id}/report {motif, origine}' + IK, '→ Resultat deja_signale', 'AVI-04 : insulte, donnée personnelle, hors-sujet'),
  'qualite.paliers': b('GET /api/relay/tiers', '→ Palier[]'),
  'qualite.contester': b('POST /api/relay/trust/{id}/contest {texte, origine}' + IK, '→ Resultat {reponseAvant} deja_contestee | hors_delai | non_contestable', 'TRU-07 : une fois, réponse sous PR-CONTESTATION-H'),

  'relais.relais': b('GET /api/relay/me/profile', '→ FicheRelais'),
  'relais.demanderCapacite': b('POST /api/relay/capacity/requests {placesDeclarees, origine}' + IK, '→ Resultat {verification} sous_occupees | identique | deja_demandee', 'contractuel : demande à BelivaY (CAP-01, CAP-02, PAL-04 ; ARL-120)'),
  'relais.annulerDemandeCapacite': b('DELETE /api/relay/capacity/requests/current {origine}', '→ Resultat aucune_demande'),
  'relais.demanderHoraires': b('POST /api/relay/hours/requests {semaine, origine}' + IK, '→ Resultat deja_demandee | invalide | identique', 'contractuel : demande à BelivaY (ARL-121)'),
  'relais.annulerDemandeHoraires': b('DELETE /api/relay/hours/requests/current {origine}', '→ Resultat aucune_demande'),
  'relais.demanderCodeEquipe': b('POST /api/relay/members/otp {origine}' + IK, '→ Resultat {expireA}'),
  'relais.ajouterEmploye': b('POST /api/relay/members {prenom, nom, telephone, droits, codeSms, origine}' + IK, '→ Resultat {id} equipe_complete | code_faux | invalide', 'SMS d’invitation valable PR-INVITATION-H'),
  'relais.retirerEmploye': b('DELETE /api/relay/members/{id} {codeSms, origine}', '→ Resultat code_faux', 'jetons et appareils du membre révoqués (EQU-03)'),
  'relais.reglerDroits': b('PUT /api/relay/members/{id}/rights {droits, origine}', '→ Resultat invalide'),
  'relais.reinitialiserPin': b('POST /api/relay/members/{id}/pin-reset {origine}' + IK, '→ Resultat', 'SMS de création d’un nouveau PIN (EQU-04)'),
  'relais.module': b('GET /api/relay/training/{module}', '→ ContenuModule ; 404 → null', 'sans les bonnes réponses'),
  'relais.repondreQuiz': b('POST /api/relay/training/{module}/quiz {membre, reponses, origine}' + IK, '→ Resultat {score, reussi, fausses}', 'corrigé au serveur, seuil PR-FORMATION-QUIZ-PCT'),
  'relais.reglerParametres': b('PUT /api/relay/settings {langue, origine}', '→ Resultat invalide', 'heure du résumé : notifications.regler (ARL-100)'),
  'relais.deconnecterAppareil': b('DELETE /api/relay/account/devices/{id}', '→ Resultat'),
  'relais.envoyerDocument': b('POST /api/relay/documents/{type} {photo, origine}' + IK, '→ Resultat non_demandee', 'seulement demandée, refusée, à fournir ou bientôt expirée (ARL-124)'),
  'relais.contrat': b('GET /api/relay/agreement', '→ Contrat', 'convention signée, annexes, fiche d’ouverture'),
  'relais.demanderModificationFiche': b('POST /api/relay/profile/requests {nom, repere, motif, origine}' + IK, '→ Resultat deja_demandee | identique', 'PAR-03 : validation BelivaY'),
  'relais.changerPin': b('POST /api/relay/auth/pin/change {ancien, nouveau, origine}' + IK, '→ Resultat pin_faux | pin_trop_simple | bloque | identique'),
  'relais.demanderDonnees': b('POST /api/relay/account/data-requests {origine}' + IK, '→ Resultat {pretLe} deja_demandee', 'loi n° 2024/017, PR-DONNEES-DELAI-J'),
  'relais.demanderFin': b('POST /api/relay/account/closure {motif, origine}' + IK, '→ Resultat {effetLe} deja_demandee', 'BelivaY prononce la fin (ARL-26) ; même route que le client et le vendeur'),
  'relais.annulerFin': b('DELETE /api/relay/account/closure {origine}', '→ Resultat aucune_demande', 'même route que acces.annulerFin : « aucune » du serveur devient « aucune_demande »'),
  'relais.changerPhoto': b('POST /api/relay/me/avatar {photo|null, origine}' + IK, '→ Resultat invalide', 'image carrée recadrée sur le téléphone ; relaya : POST /api/auth/profile/avatar/ existe'),
  'relais.simulerAccord': { etat: 'demo', route: '—', note: 'console BelivaY : accord d’une demande d’horaires ou de places' },

  'horsligne.file': tel('file sur le téléphone, localStorage « blv_r_file » ; actions expirées après PR-OFF-EXPIRATION-H (OFF-05)'),
  'horsligne.regles': b('GET /api/relay/config?codes=PR-OFF-EXPIRATION-H,PHOTO-MAX-KO,PR-HL-REMISES,PR-PAPIER-SAISIE-H', '→ ReglesFile'),
  'horsligne.mettreEnFile': tel('charge {domaine, methode, args} sans PIN ; geste signé : preuve HMAC-SHA256(clé de l’appareil, origine.cle)'),
  'horsligne.envoyerFile': b('POST /api/relay/sync/batch {actions}', '→ bilan', 'chaque action rejouée avec sa clé d’idempotence'),
  'horsligne.noterReseau': tel('heure de la perte du réseau'),
  'horsligne.marquerRefaite': tel('action expirée refaite : gardée au journal du téléphone'),
}

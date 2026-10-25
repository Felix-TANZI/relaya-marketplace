// Connecteurs du domaine « pilotage » (backend-kit/apps/console : registre.py, interrupteurs.py, formes_console.py).
import { c, type ConnecteursDe } from './types'

const D = 'Pilotage'

export const ROUTES_PILOTAGE: ConnecteursDe<'pilotage'> = {
  'pilotage.parametres': c(D, 'branche', 'GET /api/console/vues/parametres', '→ ParametreVu[]', 'statut et famille du registre en vigueur (parametres-en-vigueur.json) ; critique = gouvernance N3'),
  'pilotage.propositions': c(D, 'branche', 'GET /api/console/vues/propositions', '→ PropositionParametre[]', 'simulation : cas types et contrôles de la page (regles-s5.ts, simuler) ; la valeur est relue par les moteurs du kit (422 parametre_invalide) ; référence'),
  'pilotage.versions': c(D, 'branche', 'GET /api/console/vues/versions?code=', '→ VersionParametre[]'),
  'pilotage.preparer': c(D, 'branche', 'POST /api/console/parametres/{code}/propositions {valeur, motif, effetLe, brouillon: true, reference} (Idempotency-Key)', '→ {ok, id} ; 422 parametre_invalide → bloquee ; 404 → inconnu', 'préparée (simulee), rien n’est soumis ; texte en vigueur gardé, seul son nombre change ; relue par les moteurs'),
  'pilotage.soumettre': c(D, 'branche', 'POST /api/console/propositions/{id}/soumettre (Idempotency-Key)', '→ {ok, etat}', 'par son auteur seulement (pas_demandeur) ; bloquee si la simulation échoue ; elle attend la décision d’une autre personne'),
  'pilotage.retirer': c(D, 'branche', 'POST /api/console/propositions/{id}/retirer (Idempotency-Key)', '→ {ok}', 'par son auteur, préparée ou soumise, avant toute décision'),
  'pilotage.promotions': c(D, 'branche', 'GET /api/console/vues/promotions', '→ VuePromotions', 'ventes flash des vendeurs (vendeur_croissance.VenteFlash : prix de référence le plus bas sur 30 jours, jamais saisi) ; une vente relue (remise au-delà de VD-VISIBILITE) attend la console : brouillon ; prix barrés (vendeur_core.Offre) et jours vraiment pratiqués (historique de l’offre) ; chiffres du mois (commandes des vendeurs, gestes) ; emplacements de l’accueil (publicité) ; disposition et fêtes : donnees/accueil-console.json'),
  'pilotage.simulerFlash': c(D, 'branche', 'POST /api/console/vues/promotions/flash/{id}/simuler (Idempotency-Key)', '→ {ok} ; 409 etat', 'promotions.programmer (Direction) ; journal de la vente'),
  'pilotage.programmerFlash': c(D, 'branche', 'POST /api/console/vues/promotions/flash/{id}/programmer (Idempotency-Key)', '→ {ok} ; 422 controle ; 409 etat, ferme, non_simulee', 'contrôles : prix barré pratiqué 7 jours, FLASH-REMISE-MIN, ADM-GENEROSITE-LANCEMENT, FLASH-DUREE-MAX, stock, ciblage, début futur ; la relecture levée, la vente part à son heure ; vendeur prévenu'),
  'pilotage.annulerFlash': c(D, 'branche', 'POST /api/console/vues/promotions/flash/{id}/annuler {motif} (Idempotency-Key)', '→ {ok} ; 409 etat', 'avant son début seulement (vendeur_croissance.promotions.arreter)'),
  'pilotage.arreterFlash': c(D, 'branche', 'POST /api/console/vues/promotions/flash/{id}/arreter {motif} (Idempotency-Key)', '→ {ok} ; 409 etat', 'Direction ou Service client ; les clients qui ont payé gardent leur prix'),
  'pilotage.retirerRabais': c(D, 'branche', 'POST /api/console/vues/promotions/rabais/{id}/retirer {motif} (Idempotency-Key)', '→ {ok} ; 409 etat', 'prix barré remis à vide sur l’offre, publiée au site ; vendeur prévenu'),
  'pilotage.contenuSite': c(D, 'branche', 'GET /api/console/contenu-site', '→ ContenuSite', 'le kit garde les réglages publiés ; titres et accroches des moments : site/src/donnees/moments.ts'),
  'pilotage.publierContenu': c(D, 'branche', 'POST /api/console/contenu-site {moments, categories, motif} (Idempotency-Key)', '→ {version} ; 422 dates ; 409 moments_reserves ; 403', 'lu par le site dans GET /api/content/home (momentsReglages, carrousel réordonné)'),
  'pilotage.modules': c(D, 'branche', 'GET /api/console/interrupteurs · GET /api/console/vues/quatre-yeux?vue=attente', '→ InterrupteurVu[]', 'paramètres liés et leur statut ; bloqué si l’un est « À trancher » (module_bloque, avant la contre-signature) ; valeur du registre pour le site ; dix dernières bascules'),
  'pilotage.interrupteurs': c(D, 'branche', 'GET /api/console/interrupteurs · GET /api/console/vues/quatre-yeux?vue=attente', '→ InterrupteurVu[]', 'comme modules'),
  'pilotage.demanderBascule': c(D, 'branche', 'POST /api/console/decisions {action: interrupteur, donnees: {code, ouvert}} (Idempotency-Key)', '→ {ok, id} (202, toujours à quatre yeux) ; 422 interrupteur_inconnu → inconnu'),
  'pilotage.promotionsPlateforme': c(D, 'branche', 'GET /api/console/vues/promotions-plateforme', '→ VuePromotionsPlateforme', 'catégories de l’accueil, zones exploitées, vitrines approuvées ; remise au plus ADM-GENEROSITE-LANCEMENT'),
  'pilotage.creerPromotion': c(D, 'branche', 'POST /api/console/vues/promotions-plateforme {titre, remise, debut, fin, cible, motif} (Idempotency-Key)', '→ {ok, id} ; 422 titre, remise, cible, dates', 'Direction seule ; reflétée sur l’accueil du site pendant sa fenêtre (contenus.PromotionProgrammee) ; annoncée aux clients et aux vendeurs'),
  'pilotage.lancerPromotion': c(D, 'branche', 'POST /api/console/vues/promotions-plateforme/{id}/lancer {motif} (Idempotency-Key)', '→ {ok} ; 409 etat'),
  'pilotage.arreterPromotion': c(D, 'branche', 'POST /api/console/vues/promotions-plateforme/{id}/arreter {motif} (Idempotency-Key)', '→ {ok} ; 409 etat', 'Direction ou Service client ; les commandes payées gardent leur prix'),
  'pilotage.photos': c(D, 'branche', 'GET /api/console/photos', '→ PhotoConsole[]', 'celles que le rôle voit (la pièce d’un dossier : rôles des pièces)'),
  'pilotage.remplacerPhoto': c(D, 'branche', 'POST /api/console/photos {cible, id, libelle, photo, motif} (Idempotency-Key)', '→ {ok} ; 422 photo ; 404 inconnu', 'image réduite sur l’appareil ; photos publiées gardées par contenus (téléversement) ; la pièce d’un dossier reste dans la console'),
  'pilotage.retirerPhoto': c(D, 'branche', 'POST /api/console/photos/{cible}/{id}/retirer {motif} (Idempotency-Key)', '→ {ok} ; 409 sans_effet', 'la photo d’origine revient'),
}

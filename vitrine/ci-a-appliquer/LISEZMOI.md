# Workflows à appliquer par l'équipe (CI et déploiement de la vitrine)

GitHub refuse qu'une application sans l'autorisation « workflow » modifie `.github/workflows/`. Les deux fichiers
modifiés pour la vitrine sont donc livrés ici, prêts à être posés par un développeur :

- `ci.yml` : ajoute le job « Vitrine » (tests des comptes, construction des six espaces, image Docker vérifiée).
- `deploy.yml` : passe les variables `COMPTES_*` (environnement GitHub « Belivay Prod ») au déploiement.

Appliquer : `git apply vitrine/ci-a-appliquer/workflows.patch` (ou copier les deux fichiers dans `.github/workflows/`),
relire, commiter sur cette branche. Sans `deploy.yml`, le service des comptes démarre sans ses variables et la vitrine
reste en démonstration seule (aucun risque pour le reste de la production).

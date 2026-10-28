# Vitrine BelivaY : les six espaces web (client /, /vendeur/, /entreprise/, /livreur/, /relais/, /admin/) en
# démonstration, avec les comptes réels. Deux cibles, une par service du docker-compose.prod.yml :
#   --target web      les fichiers construits + serveur/vitrine.mjs en MODE=fichiers (aucun secret) ;
#   --target comptes  serveur/vitrine.mjs en MODE=comptes (site/serveur/, base Neon par DATABASE_URL) ; ne
#                     construit pas les applications (BuildKit saute l'étape « construction »).
# Contexte : ce dossier (vitrine/). Voir PR-VITRINE.md à la racine du dépôt.

# ── Dépendances de production du serveur (deux paquets, versions figées par serveur/package-lock.json) ──
FROM node:22-alpine AS dependances
WORKDIR /app
COPY serveur/package.json serveur/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ── Serveur commun aux deux cibles ──
FROM node:22-alpine AS serveur
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=dependances /app/node_modules ./node_modules
COPY serveur/package.json ./package.json
COPY serveur/vitrine.mjs ./serveur/vitrine.mjs
# site/package.json : « type: module » des fichiers .js de site/serveur ; vercel.json : les règles appliquées.
COPY site/package.json site/vercel.json ./site/
COPY site/serveur/ ./site/serveur/
# Ni les tests ni la base en mémoire (PGlite, dépendance de développement) dans l'image.
RUN rm -f site/serveur/*.test.mjs site/serveur/base-memoire.js
USER node
EXPOSE 8080
CMD ["node", "serveur/vitrine.mjs"]

# ── Cible « comptes » ──
FROM serveur AS comptes
ENV MODE=comptes

# ── Construction des six espaces (comme sur Vercel : site/outils/construire-tout.sh) ──
FROM node:22-alpine AS construction
WORKDIR /vitrine
# Dépendances d'abord (cache des couches tant que les verrous ne changent pas). Une application à la fois : la
# mémoire du serveur reste basse (deploy.sh construit déjà les images une par une pour la même raison).
COPY site/package.json site/package-lock.json site/
COPY espace-vendeur/package.json espace-vendeur/package-lock.json espace-vendeur/
COPY espace-entreprise/package.json espace-entreprise/package-lock.json espace-entreprise/
COPY espace-livreur/package.json espace-livreur/package-lock.json espace-livreur/
COPY espace-relais/package.json espace-relais/package-lock.json espace-relais/
COPY espace-admin/package.json espace-admin/package-lock.json espace-admin/
RUN for d in site espace-vendeur espace-entreprise espace-livreur espace-relais espace-admin; do \
      (cd "$d" && npm ci --no-audit --no-fund) || exit 1; \
    done
COPY . .
# Mêmes variables que le projet Vercel (site/vercel.json, build.env) ; SITE_URL : adresse canonique, robots.txt, sitemap.
ARG SITE_URL=https://belivay.com
ENV VITE_DEMO=1 VITE_SOURCE=hybride SITE_URL=${SITE_URL} SANS_INSTALLATION=1
RUN sh site/outils/construire-tout.sh && node serveur/compresser.mjs site/dist

# ── Cible « web » (dernière : cible par défaut) ──
FROM serveur AS web
ENV MODE=fichiers
COPY --from=construction --chown=root:root /vitrine/site/dist ./site/dist

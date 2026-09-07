FROM node:22-alpine

WORKDIR /app

# Les dependances sont installees DANS L'IMAGE, et non au demarrage.
#
# docker-compose.yml monte un volume anonyme sur /app/node_modules pour
# isoler les binaires Linux du conteneur du dossier Windows de l'hote. Or un
# volume anonyme est initialise depuis L'IMAGE, jamais depuis le montage de
# l'hote : sans cette etape il naissait vide, et les six conteneurs de
# portail echouaient sur « sh: vite: not found » (code 127).
COPY package*.json ./

# --legacy-peer-deps : @codetrix-studio/capacitor-google-auth (connexion
# Google native des apps mobiles) demande @capacitor/core@^6, alors que le
# projet est sur @capacitor/core@^7. Aucune version publiee du plugin ne
# supporte la v7. Meme contournement qu'en production (voir Dockerfile.prod).
RUN npm ci --legacy-peer-deps

EXPOSE 5173

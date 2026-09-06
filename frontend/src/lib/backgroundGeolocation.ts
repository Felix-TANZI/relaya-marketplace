// frontend/src/lib/backgroundGeolocation.ts
// Enregistre le plugin communautaire Capacitor pour la geolocalisation en
// arriere-plan. Le plugin ne fournit pas d'export pret a l'emploi : il faut
// l'enregistrer soi-meme via registerPlugin, cf. sa documentation.

import { registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

export const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  "BackgroundGeolocation",
);

export type { Location as BackgroundGeolocationFix } from "@capacitor-community/background-geolocation";

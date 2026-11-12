/**
 * Les visuels d'illustration du site réel, en un seul endroit.
 *
 * DEV-SRV-01 v1.8, C03 : plus aucune photo Unsplash sur le site réel. En attendant les photos de l'équipe
 * marketing, des visuels neutres BelivaY (frontend/public/visuels/*.svg : un dégradé à la couleur du thème).
 *
 * Pour poser une photo du marketing : déposer le fichier dans frontend/public/visuels/ et changer son chemin ici
 * (ex. "theme-femme.svg" -> "theme-femme.jpg"). Formats conseillés : bannières 2400 × 900, bandeaux 1200 × 600.
 * Unsplash reste permis sur la vitrine (vitrine/), pas ici.
 */
const dossier = `${import.meta.env.BASE_URL}visuels/`;

/** Grand visuel de l'accueil (première frame du carrousel). */
export const VISUEL_ACCUEIL = `${dossier}accueil.svg`;

/** Un visuel par thème de la boutique (même slug que frontend/src/data/categoryThemes.ts). */
export const VISUELS_THEMES: Record<string, string> = {
  all: `${dossier}theme-all.svg`,
  femme: `${dossier}theme-femme.svg`,
  homme: `${dossier}theme-homme.svg`,
  tech: `${dossier}theme-tech.svg`,
  phone: `${dossier}theme-phone.svg`,
  beaute: `${dossier}theme-beaute.svg`,
  maison: `${dossier}theme-maison.svg`,
  super: `${dossier}theme-super.svg`,
  shoes: `${dossier}theme-shoes.svg`,
  sport: `${dossier}theme-sport.svg`,
  bebe: `${dossier}theme-bebe.svg`,
};

/** Les bandeaux de confiance de l'accueil, dans l'ordre d'affichage. */
export const VISUELS_CONFIANCE = [
  `${dossier}confiance-escrow.svg`,
  `${dossier}confiance-vendeurs.svg`,
  `${dossier}confiance-livraison.svg`,
  `${dossier}confiance-retour.svg`,
  `${dossier}confiance-support.svg`,
];

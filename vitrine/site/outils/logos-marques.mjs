// Logos de marques imposés aux générateurs d'icônes (site, vendeur, entreprise, console, relais). Les prototypes HTML
// dessinent « apple » avec une pomme-fruit (tracé à la main) : ce n'est pas le logo d'Apple. Chaque générateur
// (outils/prototype.mjs) écrase donc l'icône `apple` par le tracé officiel ci-dessous, pour qu'aucune régénération ne
// puisse la ramener. Même tracé que LogoApple (site/src/compte/acces.tsx, viewBox 0 0 814 1000), ramené au cadre
// 24 × 24 des icônes (16,9 × 20,8, centré). Google : le « G » quatre couleurs reste LogoGoogle (jamais une icône).
export const APPLE_TRACE =
  'M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z'
export const APPLE_ICONE = `<path transform="translate(3.55 1.6) scale(.0208)" d="${APPLE_TRACE}" fill="currentColor" stroke="none"/>`

/** Remplace, dans une table d'icônes { nom: corps SVG }, les logos de marques par leur tracé officiel. */
export const logosOfficiels = (icones) => ({ ...icones, apple: APPLE_ICONE })

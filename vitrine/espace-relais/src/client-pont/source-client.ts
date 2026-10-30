// Remplace site/src/donnees/source pour le code du client réutilisé (vite.config.ts, REDIRECTIONS) : seul
// site/src/composants/Sons.ts l'importe, pour brancher des sons sur les méthodes de la source du CLIENT (panier,
// paiement…). Ces méthodes n'existent pas au relais : l'objet est vide, l'enveloppe de Sons ne fait rien. Les
// écrans du relais jouent leurs sons eux-mêmes (signal() de composants/signaux.ts).
export const source = {}
export type Source = Record<string, never>

// Commandes du jeu d'essai (D.orders du prototype ; DP-54) : la journée de référence est le jeudi 24 sept. 2026.
import type { CommandeClient } from '../donnees/source'

// Jours écrits en septembre, décalés de 19 jours vers le jour de la démonstration (13 oct.) ; heure de Yaoundé (UTC + 1).
const U = (j: number, h: number, m = 0) => Date.UTC(2026, 8, j + 19, h - 1, m)

export const COMMANDES: CommandeClient[] = [
  {
    ref: 'BLV-52018', etat: 'retirable', payeeLe: U(19, 9, 14), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 33780, livraison: 900,
    colis: [
      { n: 1, p: 'manuels-scolaires', produit: 'Manuels scolaires illustrés Edicef, lot de 4 · CM1', dessin: 'produit:manuels-scolaires', prix: 18500, qte: 1, boutique: 'Boutique A', etagere: 'B-12', arrive: true },
      { n: 2, p: 'beb-couches', produit: 'Couches Pampers Premium Protection taille 3', dessin: 'produit:beb-couches', prix: 14900, qte: 1, boutique: 'Boutique B', etagere: 'B-13', arrive: true },
    ],
    code: '604318', codeBio: false, arriveeLe: U(20, 9, 40), pretLe: U(20, 9, 40), garde: { du: 600, demain: 1000, jour: 4 }, comptoir: null, litige: null,
    retireeLe: null, retourJusqua: null, annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: U(19, 9, 14) }, { titre: 'Préparée par les vendeurs', le: U(19, 16, 5) }, { titre: 'Arrivée au relais', le: U(20, 9, 40) }, { titre: 'Retirée', le: null }],
  },
  {
    ref: 'BLV-52107', etat: 'preparation', payeeLe: U(24, 9, 2), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 180280, livraison: 1880,
    colis: [
      { n: 1, p: 'cha-sandale-p', produit: 'adidas Samba OG · pointure 42', dessin: 'produit:cha-sandale-p', prix: 89900, qte: 1, boutique: 'Boutique A', etagere: null, arrive: false, statut: 'pret' },
      { n: 2, p: 'hom-polo', produit: 'Polo Lacoste en coton piqué · taille L', dessin: 'produit:hom-polo', prix: 64000, qte: 1, boutique: 'Boutique B', etagere: null, arrive: false, statut: 'preparation' },
      { n: 3, p: 'boites-rangement', produit: 'Boîtes de rangement IKEA SAMLA 22 L, lot de 6', dessin: 'produit:boites-rangement', prix: 24500, qte: 1, boutique: 'Boutique C', etagere: null, arrive: false, statut: 'attente', gros: true },
    ],
    code: '281907', codeBio: true, arriveeLe: null, pretLe: U(24, 15), garde: null, comptoir: null, litige: null,
    retireeLe: null, retourJusqua: null, annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: U(24, 9, 2) }, { titre: 'Préparée par les vendeurs', le: null }, { titre: 'Arrivée au relais', le: null }, { titre: 'Retirée', le: null }],
  },
  {
    ref: 'BLV-52089', etat: 'route', payeeLe: U(23, 18, 40), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 36080, livraison: 780,
    colis: [
      { n: 1, p: '', produit: 'Liste CE1 · 6 livres', dessin: '6cec3f239dd5', prix: 24500, qte: 1, boutique: 'Boutique A', etagere: 'C-02', arrive: true },
      { n: 2, p: '', produit: 'Liste CE1 · 8 fournitures', dessin: '0e81c8abcd72', prix: 10800, qte: 1, boutique: 'Boutique B', etagere: null, arrive: false, statut: 'recupere' },
    ],
    code: '385207', codeBio: false, arriveeLe: null, pretLe: U(24, 11, 30), garde: null, comptoir: null, litige: null,
    retireeLe: null, retourJusqua: null, annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: U(23, 18, 40) }, { titre: 'Préparée par les vendeurs', le: U(24, 8, 0) }, { titre: 'Toute la liste au relais', le: null }, { titre: 'Retirée', le: null }],
  },
  {
    ref: 'BLV-51940', etat: 'comptoir', payeeLe: U(22, 10, 15), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 24900, livraison: 900,
    colis: [{ n: 1, p: 'hom-chemise-w', produit: 'Chemise en wax manches courtes, coupe slim · taille M', dessin: 'produit:hom-chemise-w', prix: 24000, qte: 1, boutique: 'Boutique B', etagere: 'A-04', arrive: true }],
    code: '719452', codeBio: false, arriveeLe: U(24, 8, 50), pretLe: U(24, 8, 50), garde: { du: 0, demain: 100, jour: 1 }, comptoir: { livraisonPayee: 900, du: 24000 }, litige: null,
    retireeLe: null, retourJusqua: null, annulee: null, delegue: null,
    etapes: [{ titre: 'Validée (livraison payée)', le: U(22, 10, 15) }, { titre: 'Préparée par le vendeur', le: U(23, 16, 0) }, { titre: 'Arrivée au relais', le: U(24, 8, 50) }, { titre: 'Payée et retirée', le: null }],
  },
  {
    ref: 'BLV-51877', etat: 'litige', payeeLe: U(20, 11, 0), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 16700, livraison: 900,
    colis: [{ n: 1, p: 'panier-linge', produit: 'Panier à linge tressé main, 60 L', dessin: 'produit:panier-linge', prix: 15800, qte: 1, boutique: 'Boutique C', etagere: 'C-02', arrive: true }],
    code: null, codeBio: false, arriveeLe: U(23, 16, 0), pretLe: U(23, 16, 0), garde: null, comptoir: null, litige: 'LIT-3042',
    retireeLe: null, retourJusqua: null, annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: U(20, 11, 0) }, { titre: 'Arrivée au relais', le: U(23, 16, 0) }, { titre: 'Constat au comptoir : litige ouvert', le: U(23, 17, 15) }, { titre: 'Décision', le: null }],
  },
  {
    ref: 'BLV-51655', etat: 'litige', payeeLe: U(18, 12, 0), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 37000, livraison: 0,
    colis: [{ n: 1, p: 'service-table', produit: 'Service de table en grès Luminarc, 16 pièces', dessin: 'produit:service-table', prix: 37000, qte: 1, boutique: 'Boutique C', etagere: null, arrive: true }],
    code: null, codeBio: false, arriveeLe: U(20, 15, 0), pretLe: U(20, 15, 0), garde: null, comptoir: null, litige: 'LIT-3041',
    retireeLe: U(21, 10, 5), retourJusqua: U(28, 23, 59), annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: U(18, 12, 0) }, { titre: 'Arrivée au relais', le: U(20, 15, 0) }, { titre: 'Retirée', le: U(21, 10, 5) }, { titre: 'Remplacement en cours', le: U(23, 11, 0) }],
  },
  {
    ref: 'BLV-51702', etat: 'retiree', payeeLe: U(17, 18, 20), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 23900, livraison: 900,
    colis: [{ n: 1, p: 'romans', produit: 'Romans contemporains Folio, sélection de 5', dessin: 'produit:romans', prix: 23000, qte: 1, boutique: 'Boutique A', etagere: null, arrive: true }],
    code: null, codeBio: false, arriveeLe: U(18, 17, 0), pretLe: U(18, 17, 0), garde: null, comptoir: null, litige: null,
    retireeLe: U(19, 11, 32), retourJusqua: U(26, 23, 59), annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: U(17, 18, 20) }, { titre: 'Arrivée au relais', le: U(18, 17, 0) }, { titre: 'Retirée', le: U(19, 11, 32) }],
  },
  {
    ref: 'BLV-51533', etat: 'annulee', payeeLe: U(11, 20, 0), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 22900, livraison: 900,
    colis: [{ n: 1, p: 'livres-enfants', produit: 'Coffret L’École des loisirs, 6 albums jeunesse', dessin: 'produit:livres-enfants', prix: 22000, qte: 1, boutique: 'Boutique D', etagere: null, arrive: false }],
    code: null, codeBio: false, arriveeLe: null, pretLe: null, garde: null, comptoir: null, litige: null,
    retireeLe: null, retourJusqua: null, annulee: { le: U(12, 9, 0), rembourse: 22900 }, delegue: null,
    etapes: [{ titre: 'Payée', le: U(11, 20, 0) }, { titre: 'Annulée par toi, remboursée', le: U(12, 9, 0) }],
  },
  {
    ref: 'BLV-51388', etat: 'retiree', payeeLe: U(26, 9, 0) - 29 * 864e5, mode: 'relais', lieu: 'Relais Mvog-Ada', total: 8700, livraison: 900,
    colis: [{ n: 1, p: 'lait-poudre', produit: 'Lait en poudre entier Bonnet Rouge 900 g', dessin: 'produit:lait-poudre', prix: 7800, qte: 1, boutique: 'Boutique A', etagere: null, arrive: true }],
    code: null, codeBio: false, arriveeLe: null, pretLe: null, garde: null, comptoir: null, litige: null,
    retireeLe: Date.UTC(2026, 8, 16, 10), retourJusqua: Date.UTC(2026, 8, 23, 22), annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: Date.UTC(2026, 8, 14, 9) }, { titre: 'Retirée', le: Date.UTC(2026, 8, 16, 10) }],
  },
  {
    ref: 'BLV-51206', etat: 'retiree', payeeLe: Date.UTC(2026, 7, 25, 9), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 12900, livraison: 900,
    colis: [{ n: 1, p: 'beb-biberon', produit: 'Biberon Philips Avent Natural 260 ml, lot de 2', dessin: 'produit:beb-biberon', prix: 12000, qte: 1, boutique: 'Boutique B', etagere: null, arrive: true }],
    code: null, codeBio: false, arriveeLe: null, pretLe: null, garde: null, comptoir: null, litige: null,
    retireeLe: Date.UTC(2026, 7, 27, 10), retourJusqua: Date.UTC(2026, 8, 3, 22), annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: Date.UTC(2026, 7, 25, 9) }, { titre: 'Retirée', le: Date.UTC(2026, 7, 27, 10) }],
  },
]

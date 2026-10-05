// Commandes du jeu d'essai (D.orders du prototype ; DP-54) : la journée de référence est le jeudi 24 sept. 2026.
import type { CommandeClient } from '../donnees/source'

const U = (j: number, h: number, m = 0) => Date.UTC(2026, 8, j, h - 1, m) // heure de Yaoundé (UTC + 1)

export const COMMANDES: CommandeClient[] = [
  {
    ref: 'BLV-52018', etat: 'retirable', payeeLe: U(21, 9, 14), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 33780, livraison: 900,
    colis: [
      { n: 1, p: 'pagne', produit: 'Pagne wax 6 yards · motif soleil orange', dessin: 'bf4e892644c3', prix: 18500, qte: 1, boutique: 'Boutique A', etagere: 'B-12', arrive: true },
      { n: 2, p: 'sandales', produit: 'Sandales cuir femme · pointure 39', dessin: 'd904fc29309b', prix: 14900, qte: 1, boutique: 'Boutique B', etagere: 'B-13', arrive: true },
    ],
    code: '604318', codeBio: false, arriveeLe: U(21, 17, 40), pretLe: U(21, 17, 40), garde: { du: 300, demain: 500, jour: 4 }, comptoir: null, litige: null,
    retireeLe: null, retourJusqua: null, annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: U(21, 9, 14) }, { titre: 'Préparée par les vendeurs', le: U(21, 13, 5) }, { titre: 'Arrivée au relais', le: U(21, 17, 40) }, { titre: 'Retirée', le: null }],
  },
  {
    ref: 'BLV-52107', etat: 'preparation', payeeLe: U(24, 9, 2), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 180280, livraison: 1880,
    colis: [
      { n: 1, p: 'galaxya15', produit: 'Samsung Galaxy A15 · 128 Go', dessin: '96013188e842', prix: 89900, qte: 1, boutique: 'Boutique A', etagere: null, arrive: false, statut: 'pret' },
      { n: 2, p: 'tablette8', produit: 'Tablette 8″ · 64 Go', dessin: '6d95c1664bef', prix: 64000, qte: 1, boutique: 'Boutique B', etagere: null, arrive: false, statut: 'preparation' },
      { n: 3, p: 'ventilo', produit: 'Ventilateur sur pied 16″', dessin: '02cc832346b3', prix: 24500, qte: 1, boutique: 'Boutique C', etagere: null, arrive: false, statut: 'attente', gros: true },
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
    colis: [{ n: 1, p: 'robewax', produit: 'Robe wax longue · taille M', dessin: 'ebe6ccc0fef4', prix: 24000, qte: 1, boutique: 'Boutique B', etagere: 'A-04', arrive: true }],
    code: '719452', codeBio: false, arriveeLe: U(24, 8, 50), pretLe: U(24, 8, 50), garde: { du: 0, demain: 100, jour: 1 }, comptoir: { livraisonPayee: 900, du: 24000 }, litige: null,
    retireeLe: null, retourJusqua: null, annulee: null, delegue: null,
    etapes: [{ titre: 'Validée (livraison payée)', le: U(22, 10, 15) }, { titre: 'Préparée par le vendeur', le: U(23, 16, 0) }, { titre: 'Arrivée au relais', le: U(24, 8, 50) }, { titre: 'Payée et retirée', le: null }],
  },
  {
    ref: 'BLV-51877', etat: 'litige', payeeLe: U(20, 11, 0), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 16700, livraison: 900,
    colis: [{ n: 1, p: 'fer', produit: 'Fer à repasser vapeur 2 200 W', dessin: '3626f48d73f7', prix: 15800, qte: 1, boutique: 'Boutique C', etagere: 'C-02', arrive: true }],
    code: null, codeBio: false, arriveeLe: U(23, 16, 0), pretLe: U(23, 16, 0), garde: null, comptoir: null, litige: 'LIT-3042',
    retireeLe: null, retourJusqua: null, annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: U(20, 11, 0) }, { titre: 'Arrivée au relais', le: U(23, 16, 0) }, { titre: 'Constat au comptoir : litige ouvert', le: U(23, 17, 15) }, { titre: 'Décision', le: null }],
  },
  {
    ref: 'BLV-51655', etat: 'litige', payeeLe: U(18, 12, 0), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 37000, livraison: 0,
    colis: [{ n: 1, p: 'mixeur', produit: 'Mixeur-blender 2 L · 600 W', dessin: '1bf387ebd71e', prix: 37000, qte: 1, boutique: 'Boutique C', etagere: null, arrive: true }],
    code: null, codeBio: false, arriveeLe: U(20, 15, 0), pretLe: U(20, 15, 0), garde: null, comptoir: null, litige: 'LIT-3041',
    retireeLe: U(21, 10, 5), retourJusqua: U(28, 23, 59), annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: U(18, 12, 0) }, { titre: 'Arrivée au relais', le: U(20, 15, 0) }, { titre: 'Retirée', le: U(21, 10, 5) }, { titre: 'Remplacement en cours', le: U(23, 11, 0) }],
  },
  {
    ref: 'BLV-51702', etat: 'retiree', payeeLe: U(17, 18, 20), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 23900, livraison: 900,
    colis: [{ n: 1, p: 'ecouteurs', produit: 'Écouteurs sans fil · blanc', dessin: '2b5bcef070f6', prix: 23000, qte: 1, boutique: 'Boutique A', etagere: null, arrive: true }],
    code: null, codeBio: false, arriveeLe: U(18, 17, 0), pretLe: U(18, 17, 0), garde: null, comptoir: null, litige: null,
    retireeLe: U(19, 11, 32), retourJusqua: U(26, 23, 59), annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: U(17, 18, 20) }, { titre: 'Arrivée au relais', le: U(18, 17, 0) }, { titre: 'Retirée', le: U(19, 11, 32) }],
  },
  {
    ref: 'BLV-51533', etat: 'annulee', payeeLe: U(11, 20, 0), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 22900, livraison: 900,
    colis: [{ n: 1, p: 'montre', produit: 'Montre acier bracelet cuir', dessin: '4241cc89c7cc', prix: 22000, qte: 1, boutique: 'Boutique D', etagere: null, arrive: false }],
    code: null, codeBio: false, arriveeLe: null, pretLe: null, garde: null, comptoir: null, litige: null,
    retireeLe: null, retourJusqua: null, annulee: { le: U(12, 9, 0), rembourse: 22900 }, delegue: null,
    etapes: [{ titre: 'Payée', le: U(11, 20, 0) }, { titre: 'Annulée par toi, remboursée', le: U(12, 9, 0) }],
  },
  {
    ref: 'BLV-51388', etat: 'retiree', payeeLe: U(26, 9, 0) - 29 * 864e5, mode: 'relais', lieu: 'Relais Mvog-Ada', total: 8700, livraison: 900,
    colis: [{ n: 1, p: 'karite', produit: 'Beurre de karité pur 500 g × 2', dessin: '603cb36e1d48', prix: 7800, qte: 1, boutique: 'Boutique A', etagere: null, arrive: true }],
    code: null, codeBio: false, arriveeLe: null, pretLe: null, garde: null, comptoir: null, litige: null,
    retireeLe: Date.UTC(2026, 7, 28, 10), retourJusqua: Date.UTC(2026, 8, 4, 22), annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: Date.UTC(2026, 7, 26, 9) }, { titre: 'Retirée', le: Date.UTC(2026, 7, 28, 10) }],
  },
  {
    ref: 'BLV-51206', etat: 'retiree', payeeLe: Date.UTC(2026, 7, 6, 9), mode: 'relais', lieu: 'Relais Mvog-Ada', total: 12900, livraison: 900,
    colis: [{ n: 1, p: 'chemise', produit: 'Chemise bazin brodée · L', dessin: 'd526d9d3fe62', prix: 12000, qte: 1, boutique: 'Boutique B', etagere: null, arrive: true }],
    code: null, codeBio: false, arriveeLe: null, pretLe: null, garde: null, comptoir: null, litige: null,
    retireeLe: Date.UTC(2026, 7, 8, 10), retourJusqua: Date.UTC(2026, 7, 15, 22), annulee: null, delegue: null,
    etapes: [{ titre: 'Payée', le: Date.UTC(2026, 7, 6, 9) }, { titre: 'Retirée', le: Date.UTC(2026, 7, 8, 10) }],
  },
]

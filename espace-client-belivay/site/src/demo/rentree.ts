// DONNÉES DE DÉMONSTRATION — rentrée 2026-2027 (CL-15 ; EX-01) : écoles vérifiées et leurs listes officielles.
import type { ArticleRentree, Ecole, ListeRentree } from '../donnees/source'

export const ECOLES: Ecole[] = [
  { id: 'flamboyants', nom: 'Groupe scolaire bilingue Les Flamboyants', quartier: 'Mvog-Ada', verifiee: true, depuis: Date.UTC(2026, 6, 2) },
  { id: 'manguiers', nom: 'Collège bilingue Les Manguiers', quartier: 'Mvog-Ada', verifiee: true, depuis: Date.UTC(2026, 6, 3) },
  { id: 'grace', nom: 'École primaire La Grâce', quartier: 'Essos', verifiee: true, depuis: Date.UTC(2026, 6, 8) },
]
const A = { boutique: 'Boutique A', zone: 'Mvog-Ada' }
const B = { boutique: 'Boutique B', zone: 'Mvog-Ada' }
const C = { boutique: 'Boutique C', zone: 'Essos' }
const DESSINS: Record<string, string> = { lecture: '6cec3f239dd5', maths: '944967dd3cb8', english: '8b52f0c40100', sciences: '349f36ab3b72', activites: '3afb47418093', dico: '47aa4dfef2e8', c96: '1a112ef2b5aa', c200: '45d2e673f3e4', dessin: 'f2900fd35896', ardoise: '55bc380e42a9', couleurs: 'b257f54b6ffa', stylos: '0e81c8abcd72', regle: 'dedf8016585c', hb: 'b64440e63d11', cartable: 'bfb8686109b5' }
const art = (id: string, titre: string, groupe: string, qte: number, prixUnitaire: number, b: typeof A, o: Partial<ArticleRentree> = {}): ArticleRentree => ({ id, titre, groupe, qte, prixUnitaire, ...b, consigne: null, exigee: false, equivalent: null, dessin: DESSINS[id], ...o })
const CE1: ArticleRentree[] = [
  art('lecture', 'Livre de lecture CE1', 'Livres', 1, 4200, A, { consigne: 'Édition demandée par l’école' }),
  art('maths', 'Livre de mathématiques CE1', 'Livres', 1, 3900, A),
  art('english', 'English Reader CE1', 'Livres', 1, 3500, A),
  art('sciences', 'Livre de sciences CE1', 'Livres', 1, 3600, A),
  art('activites', 'Cahier d’activités de français CE1', 'Livres', 1, 2800, A),
  art('dico', 'Dictionnaire junior illustré', 'Livres', 1, 6500, A, { consigne: 'Édition exigée : pas d’équivalent', exigee: true }),
  art('c96', 'Cahier 96 pages, grands carreaux', 'Cahiers et fournitures', 8, 300, B),
  art('c200', 'Cahier 200 pages, grands carreaux', 'Cahiers et fournitures', 4, 650, B),
  art('dessin', 'Cahier de dessin 32 pages', 'Cahiers et fournitures', 2, 450, B),
  art('ardoise', 'Ardoise et boîte de craies', 'Cahiers et fournitures', 1, 1300, B),
  art('couleurs', 'Boîte de 12 crayons de couleur', 'Cahiers et fournitures', 1, 1500, B, { consigne: 'Boîte de 12 crayons de couleur', equivalent: { titre: '12 crayons de couleur, autre fabricant', prixUnitaire: 1100 } }),
  art('stylos', 'Lot de 4 stylos à bille', 'Cahiers et fournitures', 1, 600, B),
  art('regle', 'Règle 30 cm et équerre', 'Cahiers et fournitures', 1, 700, B),
  art('hb', '3 crayons HB, gomme et taille-crayon', 'Cahiers et fournitures', 1, 800, B),
  art('cartable', 'Cartable scolaire 16″', 'Sac', 1, 12500, C),
]
// Les autres classes : la même trame, adaptée (livres de la classe, fournitures en plus ou en moins).
function liste(ecole: string, classe: string, section: 'fr' | 'en', n: number, publieeLe: number | null): ListeRentree {
  const articles = CE1.slice(0, n).map((a) => ({ ...a, titre: a.titre.replace('CE1', classe) }))
  return { id: `${ecole}-${classe}`.toLowerCase().replace(/\s+/g, ''), ecole, classe, section, statut: publieeLe ? 'publiee' : 'brouillon', publieeLe, historique: publieeLe ? [{ le: publieeLe, texte: `Liste publiée · ${articles.length} articles` }] : [], articles }
}
const P = Date.UTC(2026, 6, 6, 8)
export const LISTES_RENTREE: ListeRentree[] = [
  liste('flamboyants', 'SIL', 'fr', 11, P),
  liste('flamboyants', 'CP', 'fr', 13, P),
  { ...liste('flamboyants', 'CE1', 'fr', 15, P), articles: CE1, historique: [{ le: Date.UTC(2026, 8, 22, 9), texte: 'Cahier de dessin 32 pages : 1 → 2' }, { le: P, texte: 'Liste publiée · 15 articles' }] },
  liste('flamboyants', 'CE2', 'fr', 15, P),
  liste('flamboyants', 'CM1', 'fr', 15, P),
  liste('flamboyants', 'CM2', 'fr', 15, P),
  liste('flamboyants', 'Class 1', 'en', 12, P),
  liste('flamboyants', 'Class 6', 'en', 15, null),
  liste('manguiers', '6e', 'fr', 15, Date.UTC(2026, 6, 7)),
  liste('manguiers', '5e', 'fr', 15, Date.UTC(2026, 6, 7)),
  liste('grace', 'CP', 'fr', 13, Date.UTC(2026, 6, 9)),
  liste('grace', 'CE1', 'fr', 15, Date.UTC(2026, 6, 9)),
]

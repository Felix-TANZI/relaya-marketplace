// DONNÉES DE DÉMONSTRATION — domaine « catalogue » (S3) : demandes de création, appariements IA, fiches maîtres et
// taxonomie (ADM-P13), modération des offres et des prix (ADM-P14), avis et droit de réponse (ADM-P15). Mêmes boutiques
// que le jeu d'essai (Tonton PG, Maman Wax Mokolo, Techno Bastos, Saveurs du Pays, Beauté Melen, Pièces Auto Biyem) et
// mêmes offres signalées (OF-7781, OF-7790, OF-7794). La source applique les règles de regles.ts comme le serveur.
import type { Role } from '../donnees/communs'
import type { Controle } from '../donnees/domaines/acteurs'
import type { Appariement, Avis, Categorie, DemandeCreation, DomaineCatalogue, FicheMaitre, OffreAModerer } from '../donnees/domaines/catalogue'
import { MINUTE } from '../calculs/temps'
import * as R from '../pages/ADM-06/calculs/regles'
import { creerSanction, decisionPrise, geste, publierS3, refus } from './acteurs'
import { maintenant } from './horloge'
import { agentCourant, exigerPage, roleCourant } from './acces'
import { journaliser } from './journal'
import { HEURE, JOUR, T } from './jeu-essai'
import { ACTEURS_DEMO, evenementsPour, type Evenement } from './pont'
import { magasin, repondre } from './stockage'

const P = R.P3
const J = (j: number) => T((j * JOUR) / MINUTE)
const H = (h: number) => T((h * HEURE) / MINUTE)
const ok = (texte: string): Controle => ({ ton: 'ok', texte })
const doute = (texte: string): Controle => ({ ton: 'doute', texte })
const info = (texte: string): Controle => ({ ton: 'info', texte })
const serie = (n: number, ...blocs: [number, number][]) => blocs.flatMap(([prix, jours]) => Array<number>(jours).fill(prix)).slice(-n)
const LIE: Record<string, string> = { 'v-tontonpg': 'a-franck' }
const conflit = (vendeurId: string) => R.conflitInterets(agentCourant().id, LIE[vendeurId])
const DECIDEURS: Role[] = ['superviseur', 'verification']
const decideur = () => DECIDEURS.includes(roleCourant())

function fiches(): FicheMaitre[] {
  const f = (o: Partial<FicheMaitre> & Pick<FicheMaitre, 'id' | 'titre' | 'categorie' | 'classe' | 'poids' | 'dimensions'>): FicheMaitre => ({ attributs: [], note: null, nbAvis: 0, repartition: [0, 0, 0, 0, 0], offres: [], publieeLe: J(-60), fusion: null, photos: 4, ...o })
  return [
    f({ id: 'FM-00412', titre: 'ITEL AC52 · 32 Go · noir', categorie: 'Téléphones et accessoires › Smartphones', classe: 'S', poids: 0.4, dimensions: [16, 8, 5], attributs: [['Marque', 'ITEL'], ['Modèle', 'AC52'], ['Variantes', 'Couleur : noir, bleu · Mémoire : 32 Go'], ['Réseau', '4G · double SIM'], ['Nom de boutique', 'Jamais affiché sur une fiche maître']], note: 4.4, nbAvis: 23, repartition: [14, 6, 1, 1, 1], publieeLe: J(-71), offres: [{ vendeur: 'Tonton PG', prix: 20000, stock: 3, zone: 'Z10', trust: 62.7, coutLivre: 20900, etat: 'attribuee' }, { vendeur: 'Techno Bastos', prix: 21000, stock: 6, zone: 'Z1', trust: 88.1, coutLivre: 21900, etat: 'suivante' }, { vendeur: 'Techno Bastos', prix: 2000, stock: 5, zone: 'Z1', trust: 88.1, coutLivre: null, etat: 'moderation' }] }),
    f({ id: 'FM-01307', titre: 'Itel AC52 - Noir (32GB)', categorie: 'Téléphones et accessoires › Smartphones', classe: 'S', poids: 0.4, dimensions: [16, 8, 5], note: 4.0, nbAvis: 2, repartition: [1, 0, 1, 0, 0], publieeLe: J(-24), photos: 2, offres: [{ vendeur: 'Techno Bastos', prix: 21500, stock: 2, zone: 'Z1', trust: 88.1, coutLivre: 22400, etat: 'attribuee' }] }),
    f({ id: 'FM-01020', titre: 'iPhone 15 Pro Max · 256 Go', categorie: 'Téléphones et accessoires › Smartphones', classe: 'S', poids: 0.5, dimensions: [18, 10, 6], note: 4.7, nbAvis: 9, repartition: [7, 2, 0, 0, 0], offres: [{ vendeur: 'Techno Bastos', prix: 210000, stock: 2, zone: 'Z1', trust: 88.1, coutLivre: null, etat: 'moderation' }] }),
    f({ id: 'FM-00871', titre: 'Pagne wax 6 yards', categorie: 'Mode › Pagnes', classe: 'S', poids: 0.6, dimensions: [30, 25, 4], attributs: [['Matière', 'Coton imprimé'], ['Variantes', 'Motifs : 14 · Longueur : 6 yards'], ['Fabrication', 'Made in Cameroon (badge interne)']], note: 4.5, nbAvis: 41, repartition: [27, 10, 2, 1, 1], offres: [{ vendeur: 'Maman Wax Mokolo', prix: 13500, stock: 22, zone: 'Z3', trust: 78.4, coutLivre: 14400, etat: 'attribuee' }, { vendeur: 'Maman Wax Mokolo', prix: 39000, stock: 7, zone: 'Z3', trust: 78.4, coutLivre: null, etat: 'moderation' }] }),
    f({ id: 'FM-00933', titre: 'Crème « Teint parfait » 250 ml', categorie: 'Beauté › Soins du corps', classe: 'S', poids: 0.3, dimensions: [12, 6, 6], offres: [{ vendeur: 'Beauté Melen', prix: 6500, stock: 12, zone: 'Z6', trust: 74, coutLivre: null, etat: 'moderation' }] }),
    f({ id: 'FM-00980', titre: 'Lait corporel 400 ml', categorie: 'Beauté › Soins du corps', classe: 'S', poids: 0.45, dimensions: [20, 7, 7], note: 4.1, nbAvis: 12, repartition: [6, 3, 1, 1, 1], offres: [{ vendeur: 'Beauté Melen', prix: 3900, stock: 18, zone: 'Z6', trust: 74, coutLivre: 4800, etat: 'suivante' }] }),
    f({ id: 'FM-00702', titre: 'Jus de bissap 1 L × 6', categorie: 'Épicerie › Boissons', classe: 'M', poids: 6.6, dimensions: [26, 18, 30], note: 3.9, nbAvis: 7, repartition: [3, 2, 0, 2, 0], offres: [{ vendeur: 'Saveurs du Pays', prix: 9800, stock: 14, zone: 'Z6', trust: 55.2, coutLivre: 11000, etat: 'attribuee' }] }),
    f({ id: 'FM-00655', titre: 'Kit plaquettes de frein moto', categorie: 'Auto et moto › Freinage', classe: 'S', poids: 0.9, dimensions: [20, 12, 6], offres: [{ vendeur: 'Pièces Auto Biyem', prix: 64500, stock: 0, zone: 'Z6', trust: 41.8, coutLivre: null, etat: 'sanction' }] }),
  ]
}

function demandes(): DemandeCreation[] {
  const d = (o: Omit<DemandeCreation, 'echeance' | 'etat' | 'conflit' | 'decision'>): DemandeCreation => ({ ...o, echeance: R.echeanceOuvree(o.recueLe, o.prioritaire ? P.fichePrioriteH : P.ficheDelaiH), etat: 'a_traiter', conflit: false, decision: null })
  return [
    d({ id: 'DC-0041', produit: 'Pagne wax 6 yards · motif Ndop', categorie: 'Mode › Pagnes', vendeur: 'Maman Wax Mokolo', vendeurId: 'v-maman-wax', zone: 'Z3', prix: 14500, stock: 10, recueLe: H(-41), prioritaire: false, recherches: [{ requete: '« pagne wax »', resultats: '14 résultats', le: H(-41.2) }, { requete: '« pagne ndop »', resultats: '0 résultat', le: H(-41.1) }, { requete: '« wax 6 yards »', resultats: '3 résultats · « Pagne wax 6 yards » ouverte', le: H(-41) }], proches: [{ fiche: 'FM-00871', titre: 'Pagne wax 6 yards', detail: 'Mode › Pagnes · 14 motifs · 2 offres', similarite: 0.91, justification: 'Même tissu, même longueur ; seul le motif diffère : variante.' }, { fiche: 'FM-01311', titre: 'Pagne wax hollandais 6 yards', detail: 'Mode › Pagnes · 1 offre', similarite: 0.62, justification: 'Fabrication et gamme de prix différentes : produit distinct.' }], interdit: null, photos: ['vendeur · pagne plié', 'vendeur · motif Ndop', 'vendeur · étiquette'], poids: 0.6, dimensions: [30, 25, 4], classe: 'S' }),
    d({ id: 'DC-0042', produit: 'Amoxicilline 500 mg (boîte de 12)', categorie: 'Beauté › Soins', vendeur: 'Beauté Melen', vendeurId: 'v-beaute', zone: 'Z6', prix: 2500, stock: 30, recueLe: H(-6), prioritaire: false, recherches: [{ requete: '« amoxicilline »', resultats: '0 résultat', le: H(-6.1) }, { requete: '« antibiotique »', resultats: '0 résultat', le: H(-6) }], proches: [], interdit: 'Médicament : catégorie interdite (CAT-INTERDITS, liste à valider par le juriste ; loi camerounaise et catégories évidentes en attendant)', photos: ['vendeur · boîte'], poids: 0.05, dimensions: [10, 5, 3], classe: 'S' }),
    d({ id: 'DC-0043', produit: 'Miel d’Oku 500 g', categorie: 'Épicerie › Miel et confitures', vendeur: 'Saveurs du Pays', vendeurId: 'v-saveurs', zone: 'Z6', prix: 6500, stock: 20, recueLe: H(-4), prioritaire: true, recherches: [{ requete: '« miel »', resultats: '1 résultat · « Miel de forêt 1 kg »', le: H(-4.1) }, { requete: '« miel oku »', resultats: '0 résultat', le: H(-4) }], proches: [{ fiche: 'FM-00715', titre: 'Miel de forêt 1 kg', detail: 'Épicerie › Miel et confitures · 1 offre', similarite: 0.42, justification: 'Origine, contenance et prix différents : produit distinct.' }], interdit: null, photos: ['vendeur · pot', 'vendeur · étiquette', 'agent terrain · pesée 0,7 kg'], poids: 0.7, dimensions: [10, 10, 12], classe: 'S' }),
    d({ id: 'DC-0044', produit: 'Écouteurs sans fil à réduction de bruit', categorie: 'Téléphones et accessoires › Écouteurs', vendeur: 'Tonton PG', vendeurId: 'v-tontonpg', zone: 'Z10', prix: 9500, stock: 6, recueLe: H(-2), prioritaire: false, recherches: [{ requete: '« écouteurs sans fil »', resultats: '4 résultats', le: H(-2.1) }], proches: [{ fiche: 'FM-00590', titre: 'Écouteurs sans fil Bluetooth', detail: 'Téléphones et accessoires › Écouteurs · 3 offres', similarite: 0.88, justification: 'Même usage ; la réduction de bruit est une caractéristique, pas un autre produit.' }], interdit: null, photos: ['vendeur · boîte', 'vendeur · écouteurs'], poids: 0.2, dimensions: [12, 10, 5], classe: 'S' }),
  ]
}

function appariements(): Appariement[] {
  return [
    { id: 'AP-0007', similarite: 0.97, gardee: { id: 'FM-00412', titre: 'ITEL AC52 · 32 Go · noir', categorie: 'Téléphones et accessoires › Smartphones', offres: '3 · Tonton PG, Techno Bastos', avis: '4,4 ★ · 23 avis', creee: '3 août · Support' }, double: { id: 'FM-01307', titre: 'Itel AC52 - Noir (32GB)', categorie: 'Téléphones et accessoires › Smartphones', offres: '1 · Techno Bastos', avis: '4,0 ★ · 2 avis', creee: '19 sept. · saisie assistée' }, justification: [ok('Titre : même marque, même modèle, même capacité, même couleur (écriture différente)'), ok('Photos : même appareil, même face arrière (0,98)'), ok('Attributs : 32 Go, double SIM, 4G identiques'), doute('Effet sur le client : la recherche « itel ac52 » renvoie aujourd’hui les deux fiches')], avant: [['Fiche gardée', '2 fiches', 'FM-00412 · ITEL AC52 · 32 Go · noir'], ['Offres', '3 + 1', '4 offres sur la même fiche'], ['Avis', '23 + 2', '25 avis cumulés'], ['Historique des prix', '2 historiques', 'fusionnés, rien n’est perdu']], etat: 'propose', proposeLe: H(-7), fusionLe: null, reversibleJusqua: null, decision: null },
    { id: 'AP-0008', similarite: 0.89, gardee: { id: 'FM-00871', titre: 'Pagne wax 6 yards', categorie: 'Mode › Pagnes', offres: '2 · Maman Wax Mokolo', avis: '4,5 ★ · 41 avis', creee: '2 août · Support' }, double: { id: 'FM-01311', titre: 'Pagne wax hollandais 6 yards', categorie: 'Mode › Pagnes', offres: '1 · Maman Wax Mokolo', avis: 'aucun avis', creee: '30 sept. · Support' }, justification: [ok('Même longueur, même usage'), doute('Fabrication différente (hollandais) et prix trois fois plus élevé : produits distincts ?')], avant: [['Fiche gardée', '2 fiches', 'FM-00871'], ['Offres', '2 + 1', '3 offres'], ['Avis', '41 + 0', '41 avis cumulés']], etat: 'propose', proposeLe: H(-30), fusionLe: null, reversibleJusqua: null, decision: null },
  ]
}

function taxonomie(): Categorie[] {
  return [
    { nom: 'Téléphones et accessoires', fiches: 214, sous: [{ nom: 'Smartphones', fiches: 96, filtres: 'Mémoire, double SIM, couleur, prix' }, { nom: 'Chargeurs et câbles', fiches: 48, filtres: 'Puissance, connecteur, prix' }, { nom: 'Écouteurs', fiches: 39, filtres: 'Sans fil, réduction de bruit, prix' }] },
    { nom: 'Informatique', fiches: 122, sous: [{ nom: 'Ordinateurs', fiches: 41, filtres: 'Processeur, mémoire, prix' }, { nom: 'Accessoires informatiques', fiches: 81, filtres: 'Connexion, compatibilité, prix' }] },
    { nom: 'Mode', fiches: 402, sous: [{ nom: 'Pagnes', fiches: 88, filtres: 'Motif, longueur, prix' }, { nom: 'Bazin', fiches: 54, filtres: 'Taille, couleur, broderie, prix' }] },
    { nom: 'Beauté', fiches: 256, sous: [{ nom: 'Soins du corps', fiches: 112, filtres: 'Type de peau, contenance, prix' }, { nom: 'Parfums', fiches: 64, filtres: 'Famille, contenance, prix' }] },
    { nom: 'Épicerie', fiches: 131, sous: [{ nom: 'Boissons', fiches: 47, filtres: 'Contenance, conditionnement, prix' }, { nom: 'Miel et confitures', fiches: 12, filtres: 'Origine, contenance, prix' }] },
    { nom: 'Auto et moto', fiches: 77, sous: [{ nom: 'Freinage', fiches: 18, filtres: 'Véhicule, marque, prix' }] },
  ]
}

function offres(): OffreAModerer[] {
  const o = (x: Omit<OffreAModerer, 'etat' | 'recours' | 'decision' | 'suggestion' | 'conflit'> & Partial<Pick<OffreAModerer, 'etat' | 'recours' | 'decision'>>): OffreAModerer => ({ etat: 'a_moderer', recours: null, decision: null, suggestion: null, conflit: false, ...x })
  return [
    o({ id: 'OF-7805', titre: 'ITEL AC52 noir', vendeur: 'Techno Bastos', vendeurId: 'v-techno', zone: 'Z1', fiche: 'FM-00412', prix: 2000, prixBarre: null, offresMaitre: [20000, 21000, 21500], historique: serie(30, [21000, 29], [2000, 1]), prixPratiques: serie(30, [20000, 15], [21000, 15]), motif: 'prix_bas', detail: 'Prix anormalement bas : erreur de saisie probable. Offre suspendue, vendeur prévenu ; aucune commande prise à ce prix sans sa confirmation.', signaleeLe: T(-138), commandesEnCours: 0 }),
    o({ id: 'OF-7781', titre: 'iPhone 15 Pro Max · 256 Go', vendeur: 'Techno Bastos', vendeurId: 'v-techno', zone: 'Z1', fiche: 'FM-01020', prix: 210000, prixBarre: null, offresMaitre: [345000, 350000, 355000, 362000], historique: serie(30, [340000, 20], [210000, 10]), prixPratiques: serie(30, [345000, 10], [350000, 10], [355000, 10]), motif: 'signalement', detail: 'Prix 40 % sous la médiane des offres : signalé par un client (contrefaçon ?)', signaleeLe: T(-50), commandesEnCours: 1 }),
    o({ id: 'OF-7790', titre: 'Crème éclaircissante « Teint parfait »', vendeur: 'Beauté Melen', vendeurId: 'v-beaute', zone: 'Z6', fiche: 'FM-00933', prix: 6500, prixBarre: null, offresMaitre: [6500], historique: serie(30, [6500, 30]), prixPratiques: serie(30, [6500, 30]), motif: 'interdit', detail: 'Produit peut-être interdit : hydroquinone lue sur l’étiquette (liste des produits interdits)', signaleeLe: T(-35), commandesEnCours: 0 }),
    o({ id: 'OF-7794', titre: 'Pagne wax 6 yards · lot de 3', vendeur: 'Maman Wax Mokolo', vendeurId: 'v-maman-wax', zone: 'Z3', fiche: 'FM-00871', prix: 39000, prixBarre: null, offresMaitre: [13500, 39000], historique: serie(30, [39000, 30]), prixPratiques: serie(30, [13500, 30]), motif: 'photo', detail: 'Photo reprise d’une autre boutique (empreinte d’image identique)', signaleeLe: T(-12), commandesEnCours: 0 }),
    o({ id: 'OF-7802', titre: 'Coffret parfum 3 pièces', vendeur: 'Beauté Melen', vendeurId: 'v-beaute', zone: 'Z6', fiche: 'FM-00990', prix: 18000, prixBarre: 30000, offresMaitre: [17500, 18000, 19000], historique: serie(30, [30000, 3], [18000, 27]), prixPratiques: serie(30, [18000, 30]), motif: 'prix_barre', detail: 'Prix barré 30 000 F pratiqué 3 jours sur 30 : retiré automatiquement', signaleeLe: T(-233), commandesEnCours: 2 }),
    o({ id: 'OF-7766', titre: 'Parfum « Sauvage » réplique 100 ml', vendeur: 'Beauté Melen', vendeurId: 'v-beaute', zone: 'Z6', fiche: 'FM-00991', prix: 7500, prixBarre: null, offresMaitre: [7500], historique: serie(30, [7500, 30]), prixPratiques: serie(30, [7500, 30]), motif: 'interdit', detail: 'Mot « réplique » : contrefaçon présumée', signaleeLe: J(-3), commandesEnCours: 0, etat: 'depubliee', recours: { texte: 'C’est un parfum générique sans marque ; « Sauvage » est le nom de la senteur écrit sur la boîte, pas une copie. Je joins la photo de l’emballage.', le: J(-2) }, decision: { quoi: 'Dépubliée', par: 'Armand Kouam · Vérification et modération', parId: 'a-armand', le: J(-3), motif: 'Le titre présente le produit comme la réplique d’un parfum de marque : la contrefaçon est interdite, l’offre est dépubliée et un dossier est ouvert.' } }),
    o({ id: 'OF-7771', titre: 'Jus de bissap 1 L × 6', vendeur: 'Saveurs du Pays', vendeurId: 'v-saveurs', zone: 'Z6', fiche: 'FM-00702', prix: 9800, prixBarre: null, offresMaitre: [9800], historique: serie(30, [9800, 30]), prixPratiques: serie(30, [9800, 30]), motif: 'ecart', detail: 'Première offre du maître : écart non calculable, relue', signaleeLe: J(-1), commandesEnCours: 0, etat: 'acceptee', decision: { quoi: 'Publication validée', par: 'Armand Kouam · Vérification et modération', parId: 'a-armand', le: H(-20), motif: 'Seule offre du maître, prix conforme aux prix du marché de Melen relevés en visite.' } }),
  ]
}

function avis(): Avis[] {
  const a = (x: Omit<Avis, 'finReponse' | 'conflit' | 'decision'> & { decision?: Avis['decision'] }): Avis => ({ decision: null, ...x, finReponse: R.finDroitReponse(x.le), conflit: conflit(x.vendeurId) })
  return [
    a({ id: 'AV-0311', fiche: 'Jus de bissap 1 L × 6', ficheId: 'FM-00702', client: 'Client ••• 2954', note: 2, texte: '« Bouteilles reçues tièdes, une fuyait dans le carton. Le goût est bon mais je suis déçue. »', passage: null, commande: 'BLV-52198', recuLe: J(-2), le: J(-1), photos: [{ legende: 'photo de la cliente · carton mouillé', floutee: false }], vendeur: 'Saveurs du Pays', vendeurId: 'v-saveurs', signalement: { motif: 'faux_avis', par: 'Saveurs du Pays', le: H(-20), texte: 'Cette cliente ment, les bouteilles étaient fraîches et bien fermées. Je demande la suppression de cet avis.' }, etat: 'signale', verifs: [ok('Achat vérifié : BLV-52198 retirée au Relais Melen Université'), info('Photos du livreur au ramassage : carton fermé, pas d’humidité visible (contrôle C1)'), doute('Aucun litige ouvert par la cliente : l’avis reste son droit'), info('Droit de réponse privé du vendeur ouvert')], reponse: null }),
    a({ id: 'AV-0312', fiche: 'Pagne wax 6 yards', ficheId: 'FM-00871', client: 'Client ••• 7731', note: 1, texte: '« Le matelas est arrivé plié et il sent mauvais. Je ne recommande pas. »', passage: null, commande: 'BLV-51990', recuLe: J(-6), le: J(-4), photos: [], vendeur: 'Maman Wax Mokolo', vendeurId: 'v-maman-wax', signalement: { motif: 'hors_sujet', par: 'Client ••• 0388', le: J(-3), texte: 'Cet avis parle d’un matelas, pas du pagne.' }, etat: 'signale', verifs: [ok('Achat vérifié : BLV-51990 (pagne wax) retirée au Relais Mokolo Marché'), doute('Le texte décrit un autre produit que la fiche')], reponse: null }),
    a({ id: 'AV-0313', fiche: 'Lait corporel 400 ml', ficheId: 'FM-00980', client: 'Client ••• 6120', note: 1, texte: '« Produit correct mais la vendeuse est une voleuse et une menteuse. Livraison rapide. »', passage: 'une voleuse et une menteuse', commande: 'BLV-52018', recuLe: J(-9), le: J(-8), photos: [], vendeur: 'Beauté Melen', vendeurId: 'v-beaute', signalement: { motif: 'insulte', par: 'Beauté Melen', le: J(-7), texte: 'Insulte envers moi.' }, etat: 'signale', verifs: [ok('Achat vérifié : BLV-52018'), doute('Insulte envers la vendeuse : contenu illicite'), info('Seule la partie illicite est masquée ; la note et le reste restent publiés')], reponse: null }),
    a({ id: 'AV-0314', fiche: 'Pagne wax 6 yards', ficheId: 'FM-00871', client: 'Client ••• 4217', note: 2, texte: '« Couleurs moins vives que sur la photo. »', passage: null, commande: 'BLV-52089', recuLe: J(-5), le: J(-5), photos: [], vendeur: 'Maman Wax Mokolo', vendeurId: 'v-maman-wax', signalement: { motif: 'chantage', par: 'Client ••• 4217', le: J(-1), texte: 'La vendeuse m’a proposé 3 000 F pour remonter ma note.' }, etat: 'signale', verifs: [ok('Achat vérifié : BLV-52089'), { ton: 'ko', texte: 'Offre d’argent contre une note : interdit, motif de sanction de niveau 3 (ADM-P15R-04)' }], reponse: null }),
    a({ id: 'AV-0305', fiche: 'ITEL AC52 · 32 Go · noir', ficheId: 'FM-00412', client: 'Client ••• 0388', note: 2, texte: '« Écran rayé à la réception. J’ai écrit au vendeur deux fois. »', passage: null, commande: 'BLV-51902', recuLe: J(-11), le: J(-10), photos: [{ legende: 'photo du client', floutee: false }, { legende: 'visage flouté', floutee: true }], vendeur: 'Tonton PG', vendeurId: 'v-tontonpg', signalement: null, etat: 'publie', verifs: [ok('Achat vérifié : BLV-51902')], reponse: { texte: 'Bonjour, je suis désolé pour la rayure. Appelez-moi au 6 77 12 42 17, je vous l’échange.', le: J(-9) } }),
    a({ id: 'AV-0302', fiche: 'Pagne wax 6 yards', ficheId: 'FM-00871', client: 'Client ••• 2954', note: 3, texte: '« Taille un peu courte, appelez-moi au 6 90 45 29 54 pour un échange. »', passage: 'appelez-moi au 6 90 45 29 54', commande: 'BLV-51875', recuLe: J(-15), le: J(-14), photos: [], vendeur: 'Maman Wax Mokolo', vendeurId: 'v-maman-wax', signalement: { motif: 'donnee_personnelle', par: 'Système', le: J(-14), texte: 'Numéro de téléphone dans l’avis.' }, etat: 'masque', verifs: [ok('Masquage automatique de la donnée ; l’avis reste publié')], reponse: null, decision: { quoi: 'Donnée personnelle masquée', par: 'Système', parId: 'systeme', le: J(-14), motif: 'Numéro de téléphone dans un avis publié.' } }),
  ]
}

interface EtatCatalogue {
  demandes: DemandeCreation[]
  appariements: Appariement[]
  fiches: FicheMaitre[]
  taxonomie: Categorie[]
  offres: OffreAModerer[]
  avis: Avis[]
}
export const catalogueDemo = magasin<EtatCatalogue>('catalogue', () => ({ demandes: demandes(), appariements: appariements(), fiches: fiches(), taxonomie: taxonomie(), offres: offres(), avis: avis() }))

// ── Signalements venus du pont (report.filed) sur un produit ou une offre ─────────────────────────────────────
/** Un signalement porte sur une offre ou un produit : identifiant d'offre, de fiche, ou produit vendu par le pont. */
function produitDuPont(objet: string): { titre: string; prix: number; vendeur: string } | null {
  for (const e of evenementsPour('admin'))
    if (e.type === 'order.paid')
      for (const c of e.colis) {
        const l = c.lignes.find((x) => x.produit === objet)
        if (l) return { titre: l.titre, prix: l.prix, vendeur: c.boutique }
      }
  return objet === ACTEURS_DEMO.produit.id ? { titre: ACTEURS_DEMO.produit.titre, prix: 0, vendeur: ACTEURS_DEMO.vendeur.vitrine } : null
}
/** Une carte de modération par signalement d'offre ou de produit (une fois par clé). */
function offresDuPont(): OffreAModerer[] {
  const gardees = catalogueDemo.lire().offres
  const l: OffreAModerer[] = []
  for (const e of evenementsPour('admin')) {
    if (e.type !== 'report.filed') continue
    const x = e as Extract<Evenement, { type: 'report.filed' }>
    const id = `SG-${x.cle.replace(/\W+/g, '').slice(-8).toUpperCase()}`
    if (gardees.some((o) => o.id === id) || l.some((o) => o.id === id)) continue
    const connue = gardees.find((o) => o.id === x.objet)
    const p = connue ? { titre: connue.titre, prix: connue.prix, vendeur: connue.vendeur } : produitDuPont(x.objet)
    if (!p && !/^(OF|FM)-/.test(x.objet)) continue // ni offre ni produit : relève de la fraude (gouvernance)
    const vendeur = p?.vendeur ?? '—'
    l.push({
      id, titre: p?.titre ?? x.objet, vendeur, vendeurId: vendeur === ACTEURS_DEMO.vendeur.vitrine ? ACTEURS_DEMO.vendeur.lieu : vendeur, zone: ACTEURS_DEMO.vendeur.zone, fiche: connue?.fiche ?? '—', prix: p?.prix ?? 0, prixBarre: null,
      offresMaitre: [], historique: [], prixPratiques: [], motif: 'signalement', detail: `${x.gravite === 'grave' ? 'Signalement grave' : 'Signalement'} · ${x.motif}`,
      signaleeLe: x.le, etat: 'a_moderer', commandesEnCours: 0, recours: null, decision: null, suggestion: null, conflit: false,
    })
  }
  // Les signalements graves d'abord.
  return l.sort((a, b) => Number(b.detail.startsWith('Signalement grave')) - Number(a.detail.startsWith('Signalement grave')))
}
const offresToutes = () => [...offresDuPont(), ...catalogueDemo.lire().offres]

/** Offres qui attendent la modération (compteurs et File d'action à l'intégration). */
export const offresAModerer = () => offresToutes().filter((o) => o.etat === 'a_moderer')

const motifOk = (m: string) => R.motifValable(m)
const avecConflit = <X extends { vendeurId: string }>(x: X): X & { conflit: boolean } => ({ ...x, conflit: conflit(x.vendeurId) })

export const demoCatalogue: DomaineCatalogue = {
  async demandes() {
    exigerPage('catalogue', 'Catalogue')
    return repondre(catalogueDemo.lire().demandes.map(avecConflit))
  },
  async deciderDemande(id, d) {
    const r = geste('catalogue', 'Catalogue')
    if (r) return refus(r)
    if (!decideur()) return refus('lecture_seule')
    const x = catalogueDemo.lire().demandes.find((y) => y.id === id)
    if (!x) throw new Error(`demande inconnue : ${id}`)
    if (x.etat !== 'a_traiter') return refus('deja_traite')
    if (conflit(x.vendeurId)) return refus('conflit_interets')
    if (d.action === 'refuser' && !motifOk(d.motif)) return refus('motif_court')
    if (d.action === 'rattacher' && !d.fiche) return refus('sans_evenement')
    const etat = d.action === 'rattacher' ? 'rattachee' : d.action === 'creer' ? 'creee' : 'refusee'
    catalogueDemo.ecrire((s) => {
      const y = s.demandes.find((z) => z.id === id)!
      y.etat = etat
      y.decision = decisionPrise(d.action === 'rattacher' ? `Rattachée à ${d.fiche}` : d.action === 'creer' ? 'Fiche maître créée' : 'Refusée avec motif', d.motif.trim() || null)
      if (d.action === 'creer') s.fiches.push({ id: `FM-0${1400 + s.fiches.length}`, titre: y.produit, categorie: y.categorie, classe: y.classe, poids: y.poids, dimensions: y.dimensions, attributs: [], note: null, nbAvis: 0, repartition: [0, 0, 0, 0, 0], offres: [{ vendeur: y.vendeur, prix: y.prix, stock: y.stock, zone: y.zone, trust: 0, coutLivre: null, etat: 'moderation' }], publieeLe: maintenant(), fusion: null, photos: y.photos.length })
      // Produit interdit signalé : la modération le voit dans ses offres à relire.
      if (d.action === 'refuser' && d.signaler) s.offres.unshift({ id: `OF-${7900 + s.offres.length}`, titre: y.produit, vendeur: y.vendeur, vendeurId: y.vendeurId, zone: y.zone, fiche: '—', prix: y.prix, prixBarre: null, offresMaitre: [], historique: [], prixPratiques: [], motif: 'interdit', detail: `Signalé par le catalogue (${id}) : ${y.interdit ?? 'produit refusé'}`, signaleeLe: maintenant(), etat: 'a_moderer', commandesEnCours: 0, recours: null, decision: null, suggestion: null, conflit: false })
    })
    await journaliser({ action: `catalogue.${d.action}`, objet: `${id} · ${x.produit}${d.fiche ? ' → ' + d.fiche : ''}`, motif: d.motif.trim() || undefined })
    publierS3({ type: 'fiche_decidee', demande: id, vendeurId: x.vendeurId, decision: etat, motif: d.motif.trim() || null }, `fiche-${id}-${etat}`)
    return { ok: true, etat }
  },
  async appariements() {
    exigerPage('catalogue', 'Catalogue')
    return repondre([...catalogueDemo.lire().appariements].sort((a, b) => Number(R.fusionEnTete(b.similarite)) - Number(R.fusionEnTete(a.similarite)) || b.similarite - a.similarite))
  },
  async deciderAppariement(id, action, motif) {
    const r = geste('catalogue', 'Catalogue')
    if (r) return refus(r)
    if (!decideur()) return refus('lecture_seule')
    const x = catalogueDemo.lire().appariements.find((y) => y.id === id)
    if (!x) throw new Error(`appariement inconnu : ${id}`)
    if (action === 'annuler') {
      if (x.etat !== 'fusionne') return refus('deja_traite')
      if (!x.reversibleJusqua || maintenant() > x.reversibleJusqua) return refus('delai_depasse')
      if (!motifOk(motif)) return refus('motif_court')
    } else if (x.etat !== 'propose') return refus('deja_traite')
    const etat = action === 'fusionner' ? 'fusionne' : action === 'distincts' ? 'distincts' : action === 'separer' ? 'separe' : 'annule'
    catalogueDemo.ecrire((s) => {
      const y = s.appariements.find((z) => z.id === id)!
      y.etat = etat
      y.decision = decisionPrise({ fusionne: 'Fusion validée', distincts: 'Gardées distinctes', separe: 'Offres séparées', annule: 'Fusion annulée' }[etat]!, motif.trim() || null)
      if (etat === 'fusionne') {
        y.fusionLe = maintenant()
        y.reversibleJusqua = R.fusionReversibleJusqua(maintenant())
        const g = s.fiches.find((f) => f.id === y.gardee.id)
        const dbl = s.fiches.find((f) => f.id === y.double.id)
        if (g && dbl) {
          g.offres.push(...dbl.offres)
          g.nbAvis += dbl.nbAvis
          g.repartition = g.repartition.map((n, i) => n + dbl.repartition[i])
          g.fusion = { de: dbl.id, reversibleJusqua: y.reversibleJusqua }
          s.fiches = s.fiches.filter((f) => f.id !== dbl.id)
        }
      }
      if (etat === 'annule') {
        const g = s.fiches.find((f) => f.id === y.gardee.id)
        if (g) g.fusion = null
        s.fiches.push(fiches().find((f) => f.id === y.double.id)!)
      }
    })
    await journaliser({ action: `catalogue.${action}`, objet: `${id} · ${x.gardee.id} ⇄ ${x.double.id}`, motif: motif.trim() || undefined })
    return { ok: true, etat }
  },
  async fiches() {
    exigerPage('catalogue', 'Catalogue')
    return repondre(catalogueDemo.lire().fiches)
  },
  async modifierFiche(id, titre, motif) {
    const r = geste('catalogue', 'Catalogue')
    if (r) return refus(r)
    if (!decideur()) return refus('lecture_seule')
    if (!titre.trim()) return refus('sans_evenement')
    if (!motifOk(motif)) return refus('motif_court')
    const f = catalogueDemo.lire().fiches.find((x) => x.id === id)
    if (!f) throw new Error(`fiche inconnue : ${id}`)
    catalogueDemo.ecrire((s) => void (s.fiches.find((x) => x.id === id)!.titre = titre.trim()))
    await journaliser({ action: 'catalogue.modifier', objet: `${id} · « ${f.titre} » → « ${titre.trim()} »`, motif: motif.trim() })
    return { ok: true }
  },
  async taxonomie() {
    exigerPage('catalogue', 'Catalogue')
    return repondre(catalogueDemo.lire().taxonomie)
  },
  async creerSousCategorie(parent, nom) {
    const r = geste('catalogue', 'Catalogue')
    if (r || !decideur()) return { ok: false, raison: 'lecture_seule' }
    if (!nom.trim()) return { ok: false, raison: 'vide' }
    const t = catalogueDemo.lire().taxonomie
    const existe = R.sousCategorieEnDouble(nom, t.flatMap((c) => c.sous.map((s) => s.nom)))
    if (existe) {
      const ou = t.find((c) => c.sous.some((s) => s.nom === existe))!.nom
      return { ok: false, raison: 'doublon', existe: ou }
    }
    catalogueDemo.ecrire((s) => s.taxonomie.find((c) => c.nom === parent)?.sous.push({ nom: nom.trim(), fiches: 0, filtres: 'à définir' }))
    await journaliser({ action: 'taxonomie.creer', objet: `${parent} › ${nom.trim()}` })
    return { ok: true }
  },

  async aModerer() {
    exigerPage('moderation', 'Modération des offres')
    return repondre(offresToutes().map(avecConflit))
  },
  async deciderOffre(id, d) {
    const r = geste('moderation', 'Modération des offres')
    if (r) return refus(r)
    if (!decideur()) return refus('lecture_seule')
    const o = offresToutes().find((x) => x.id === id)
    if (!o) throw new Error(`offre inconnue : ${id}`)
    // Une carte du pont entre dans l'état gardé au premier geste.
    if (!catalogueDemo.lire().offres.some((x) => x.id === id)) catalogueDemo.ecrire((s) => void s.offres.unshift(structuredClone(o)))
    if (conflit(o.vendeurId)) return refus('conflit_interets')
    const recours = d.action.startsWith('recours_')
    if (recours ? !o.recours : o.etat !== 'a_moderer') return refus('deja_traite')
    if (!motifOk(d.motif)) return refus('motif_court')
    if (d.action === 'retirer_barre' && o.prixBarre !== null && R.prixBarreValide(o.historique, o.prixBarre)) return refus('barre_valide')
    const etat: OffreAModerer['etat'] = d.action === 'valider' || d.action === 'retirer_barre' || d.action === 'recours_accepter' ? 'acceptee' : d.action === 'correction' ? 'correction' : 'depubliee'
    const suggestion = d.suggestion ? R.prixConseille(o.prixPratiques) : null
    catalogueDemo.ecrire((s) => {
      const y = s.offres.find((z) => z.id === id)!
      y.etat = etat
      if (recours) y.recours = null
      if (d.action === 'retirer_barre') y.prixBarre = null
      y.suggestion = suggestion
      y.decision = decisionPrise({ valider: 'Publication validée', correction: 'Correction demandée', depublier: 'Dépubliée', retirer_barre: 'Prix barré retiré', recours_maintenir: 'Recours : dépublication maintenue', recours_accepter: 'Recours accepté : nouveau titre demandé' }[d.action], d.motif.trim())
    })
    await journaliser({ action: `moderation.${d.action}`, objet: `${id} · ${o.titre} · ${o.vendeur}`, motif: d.motif.trim(), zone: o.zone })
    // Produit interdit dépublié : dossier de sanction ouvert (ADM-P14R-03).
    if (d.action === 'depublier' && o.motif === 'interdit') await creerSanction({ acteurId: o.vendeurId, acteur: o.vendeur, espace: 'vendeur', zone: o.zone, niveau: 2, motif: d.motif.trim(), origine: `Modération · ${id} · produit interdit` })
    publierS3({ type: 'offre_moderee', offre: id, vendeurId: o.vendeurId, decision: etat, motif: d.motif.trim(), suggestion }, `offre-${id}-${d.action}`)
    return { ok: true, etat }
  },

  async avis() {
    exigerPage('avis', 'Avis')
    return repondre(catalogueDemo.lire().avis.map(avecConflit))
  },
  async deciderAvis(id, d) {
    const r = geste('avis', 'Avis')
    if (r) return refus(r)
    const a = catalogueDemo.lire().avis.find((x) => x.id === id)
    if (!a) throw new Error(`avis inconnu : ${id}`)
    // Retrait : décision du médiateur senior (la Direction au lancement) ; refuser ou masquer : Vérification.
    const roles: Role[] = d.action === 'retirer' ? ['superviseur', 'mediation'] : ['superviseur', 'verification']
    if (!roles.includes(roleCourant())) return refus('role')
    if (conflit(a.vendeurId)) return refus('conflit_interets')
    if (a.etat !== 'signale') return refus('deja_traite')
    if (!motifOk(d.motif)) return refus('motif_court')
    if (d.action === 'masquer' && (!a.signalement || !R.masquagePossible(a.signalement.motif) || !a.passage)) return refus('masquage_impossible')
    if (d.action === 'retirer' && !d.raison) return refus('sans_evenement')
    const etat: Avis['etat'] = d.action === 'refuser' ? 'publie' : d.action === 'masquer' ? 'masque' : 'retire'
    catalogueDemo.ecrire((s) => {
      const y = s.avis.find((z) => z.id === id)!
      y.etat = etat
      if (etat === 'masque' && y.passage) y.texte = y.texte.replace(y.passage, '[contenu masqué par la modération]')
      y.decision = decisionPrise({ publie: 'Signalement refusé : avis maintenu', masque: 'Contenu illicite masqué', retire: `Avis retiré (${d.raison === 'sans_lien' ? 'sans lien avec le produit' : d.raison === 'faux' ? 'faux avis établi' : 'contenu illicite'})`, signale: '' }[etat], d.motif.trim())
    })
    await journaliser({ action: `avis.${d.action}`, objet: `${id} · ${a.fiche}`, motif: d.motif.trim() })
    publierS3({ type: 'avis_modere', avis: id, decision: etat, motif: d.motif.trim() }, `avis-${id}-${etat}`)
    return { ok: true, etat }
  },
}

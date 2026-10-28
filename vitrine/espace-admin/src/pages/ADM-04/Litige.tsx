// Dossier de litige et arbitrage (ADM-P03), en poste de travail (logique-metier/DECISIONS-ENCADREES.md) : la structure
// du prototype est gardée et enrichie — bandeau du dossier (ce qu'il faut décider, échéance, montant, niveau requis),
// chaîne de preuves (frise alimentée par le pont, visionneuse, comparaison côte à côte), positions des parties,
// décision (suggestion de la règle, issues permises, bloquées avec leur raison, motif écrit, effets calculés). En plus :
// liste de contrôle des preuves par type de litige, appels notés, transmission au niveau supérieur, prolongation unique,
// file par échéance et décision en lot. Règles tenues par la source (src/demo/decisions.ts, calculs/decisions.ts) :
// niveau 1 au Support, niveau 2 et recours à la Médiation ; la Finance n'ouvre pas le contenu ; remboursement toujours
// au moyen d'origine, à quatre yeux au-delà du seuil ; aucune décision tant que le vendeur peut répondre.
import { Poste } from '../../composants/poste/Poste'

export default function Litige() {
  return <Poste route="litige" genre="litige" />
}

// DONNÉES DE DÉMONSTRATION — la source de démonstration : un objet par domaine. Tout le dossier src/demo se supprime
// d'un bloc quand la source API sera complète (VITE_SOURCE=api). Un groupe qui sort son domaine de lectures.ts le
// branche ici (une ligne).
import type { SourceAdmin } from '../donnees/source'
import { demoActeurs } from './acteurs'
import { demoArgent } from './argent'
import { demoCatalogue } from './catalogue'
import { demoCommandes } from './commandes'
import { demoCommunication } from './communication'
import { demoDecisions } from './decisions'
import { demoDirect } from './direct'
import { demoEquipe } from './equipe'
import { demoLitiges } from './litiges'
import { demoLogistique } from './logistique'
import { demoPilotage } from './pilotage'
import { demoFiles } from './files'
import { demoGouvernance } from './gouvernance'
import { demoQuatreYeux } from './quatreyeux'
import { demoSession } from './session'
import { demoSysteme } from './systeme'
import { demoAccesActeurs, demoPhotos, demoPromotionsPlateforme } from './surveiller'

export const sourceDemo: SourceAdmin = {
  session: demoSession,
  direct: demoDirect,
  files: demoFiles,
  quatreyeux: demoQuatreYeux,
  litiges: demoLitiges,
  commandes: demoCommandes,
  argent: demoArgent,
  acteurs: { ...demoActeurs, ...demoAccesActeurs },
  catalogue: demoCatalogue,
  logistique: demoLogistique,
  pilotage: { ...demoPilotage, ...demoPromotionsPlateforme, ...demoPhotos },
  communication: demoCommunication,
  gouvernance: demoGouvernance,
  systeme: demoSysteme,
  equipe: demoEquipe,
  decisions: demoDecisions,
}

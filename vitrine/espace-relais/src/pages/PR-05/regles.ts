// Règles du guichet de retrait lues au registre (CCH-15 : aucune valeur dans un écran), par PARAMETRES.relais et
// PARAMETRES_MOTEURS.
import { PARAMETRES_MOTEURS } from '../../calculs/parametres-moteurs'
import { PARAMETRES } from '../../calculs/registre'

const P = PARAMETRES.relais
const C = PARAMETRES.connexion

export const REGLES = {
  codeLongueur: P.code.longueur,
  codeEssais: P.code.essais,
  codeBlocageH: P.code.blocageHeures,
  codeRenvois: P.code.renvoisPar24h,
  pinLongueur: C.pinLongueur,
  pinEssaisRemise: PARAMETRES_MOTEURS.pinRemiseEssais,
  pinEssais: C.pinEssais,
  pinBlocageMin: C.pinBlocageMin,
  paiementDelaiMin: P.paiementComptoirDelaiMin,
  porteurSeuil: P.porteurPieceDes,
  avisJours: P.avisFenetreJours,
  retourJours: P.retourFenetreJours,
  viceJours: P.viceCacheJours,
  transfert: P.transfert,
  constatPhotos: P.constatPhotosMin,
  horsLigneRemises: P.horsLigneRemisesParJour,
  refusAvantAvance: P.comptoir.refusAvantAvance,
  photoMaxKo: P.photoMaxKo,
  gainColis: P.gainColis,
}

// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Inscription · Devenir point relais) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-03/Inscription.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import logo from '../../../assets/logo-belivay.png'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Inscription du relais (prototype : Inscription · {"ws":"s1"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-g9jysb">
          <img src={logo} alt="BelivaY" className="p-e23hqk" />
          <div className="p-nvoomp">
            {t("Devenez point relais BelivaY")}
          </div>
          <div className="p-g987ge">
            {t("Un revenu en plus dans votre commerce, sans rien avancer : 200 F par petit colis remis, 100 F par jour de garde facturé, payés par BelivaY chaque vendredi.")}
          </div>
          <div className="p-8dmjde">
            <span className="p-3298ie">
              {t("Zéro caution")}
            </span>
            <span className="p-3298ie">
              {t("Matériel fourni")}
            </span>
            <span className="p-3298ie">
              {t("Réponse sous 48 h")}
            </span>
          </div>
        </div>
        <div className="p-oqlq8x">
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Commerce")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Gérant")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Local")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Versement")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Convention")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Votre commerce")}
            </h2>
          </div>
          <label className="p-ky12xr">
            {t("NOM DU COMMERCE")}
            <input type="text" placeholder={t("Ex. Boutique Mama René")} defaultValue="" className="p-afs6hh" />
          </label>
          <div className="p-yscrc8">
            {t("TYPE")}
          </div>
          <div className="p-8dmjde">
            <span className="p-rpzy79">
              {t("Boutique")}
            </span>
            <span className="p-6z26dm">
              {t("Pharmacie")}
            </span>
            <span className="p-6z26dm">
              {t("Papeterie")}
            </span>
            <span className="p-6z26dm">
              {t("Salon")}
            </span>
            <span className="p-6z26dm">
              {t("Station")}
            </span>
            <span className="p-6z26dm">
              {t("Autre")}
            </span>
          </div>
          <label className="p-ky12xr">
            {t("QUARTIER")}
            <input type="text" placeholder={t("Ex. Mvog-Ada")} defaultValue="" className="p-afs6hh" />
          </label>
          <label className="p-ky12xr">
            {t("REPÈRE")}
            <input type="text" placeholder={t("Ex. face pharmacie, enseigne jaune")} defaultValue="" className="p-afs6hh" />
          </label>
          <button type="button" className="p-rbzobc">
            <Icone nom="r-lieu" taille={18} className="p-672m16" />
            {t("Placer mon commerce sur la carte")}
          </button>
          <div className="p-lndmsc">
            <span />
            <button type="button" className="p-ncx7qc">
              {t("Continuer")}
            </button>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Après votre demande")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telephone" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Appel sous 48 h")}
              </div>
              <div className="p-dfa05r">
                {t("Un agent confirme votre dossier")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-lieu" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Visite du local")}
              </div>
              <div className="p-dfa05r">
                {t("Rangement et comptoir contrôlés")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Formation")}
              </div>
              <div className="p-dfa05r">
                {t("5 modules, environ 46 min au total")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-boutique" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Ouverture")}
              </div>
              <div className="p-dfa05r">
                {t("Votre relais apparaît sur la carte des clients")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Étape 2 · le gérant (prototype : Inscription · {"ws":"s2"}) — ?etat=s2 */
export function EtatS2() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-g9jysb">
          <img src={logo} alt="BelivaY" className="p-e23hqk" />
          <div className="p-nvoomp">
            {t("Devenez point relais BelivaY")}
          </div>
          <div className="p-g987ge">
            {t("Un revenu en plus dans votre commerce, sans rien avancer : 200 F par petit colis remis, 100 F par jour de garde facturé, payés par BelivaY chaque vendredi.")}
          </div>
          <div className="p-8dmjde">
            <span className="p-3298ie">
              {t("Zéro caution")}
            </span>
            <span className="p-3298ie">
              {t("Matériel fourni")}
            </span>
            <span className="p-3298ie">
              {t("Réponse sous 48 h")}
            </span>
          </div>
        </div>
        <div className="p-oqlq8x">
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Commerce")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Gérant")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Local")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Versement")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Convention")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Le gérant")}
            </h2>
          </div>
          <label className="p-ky12xr">
            {t("NOM ET PRÉNOM")}
            <input type="text" placeholder={t("Tel que sur la pièce")} defaultValue="" className="p-afs6hh" />
          </label>
          <label className="p-ky12xr">
            {t("TÉLÉPHONE")}
            <input type="text" placeholder={t("6XX XX XX XX")} defaultValue="" className="p-afs6hh" />
          </label>
          <div className="p-0cipe3">
            <button type="button" className="p-g9a5yq">
              <Icone nom="r-document" taille={22} className="p-672m16" />
              {t("CNI recto verso")}
            </button>
            <button type="button" className="p-g9a5yq">
              <Icone nom="r-personne" taille={22} className="p-672m16" />
              {t("Votre portrait")}
            </button>
          </div>
          <div className="p-81u2s6">
            {t("Vérification automatique en quelques minutes. Votre pièce n’est jamais montrée. Les clients voient votre prénom et votre portrait, pour vous reconnaître au comptoir.")}
          </div>
          <div className="p-lndmsc">
            <button type="button" className="p-rbzobc">
              {t("Retour")}
            </button>
            <button type="button" className="p-ncx7qc">
              {t("Continuer")}
            </button>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Après votre demande")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telephone" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Appel sous 48 h")}
              </div>
              <div className="p-dfa05r">
                {t("Un agent confirme votre dossier")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-lieu" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Visite du local")}
              </div>
              <div className="p-dfa05r">
                {t("Rangement et comptoir contrôlés")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Formation")}
              </div>
              <div className="p-dfa05r">
                {t("5 modules, environ 46 min au total")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-boutique" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Ouverture")}
              </div>
              <div className="p-dfa05r">
                {t("Votre relais apparaît sur la carte des clients")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Étape 3 · le local (prototype : Inscription · {"ws":"s3"}) — ?etat=s3 */
export function EtatS3() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-g9jysb">
          <img src={logo} alt="BelivaY" className="p-e23hqk" />
          <div className="p-nvoomp">
            {t("Devenez point relais BelivaY")}
          </div>
          <div className="p-g987ge">
            {t("Un revenu en plus dans votre commerce, sans rien avancer : 200 F par petit colis remis, 100 F par jour de garde facturé, payés par BelivaY chaque vendredi.")}
          </div>
          <div className="p-8dmjde">
            <span className="p-3298ie">
              {t("Zéro caution")}
            </span>
            <span className="p-3298ie">
              {t("Matériel fourni")}
            </span>
            <span className="p-3298ie">
              {t("Réponse sous 48 h")}
            </span>
          </div>
        </div>
        <div className="p-oqlq8x">
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Commerce")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Gérant")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Local")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Versement")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Convention")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Votre local")}
            </h2>
          </div>
          <div className="p-zmtdxo">
            <button type="button" className="p-3n03l6">
              <Icone nom="r-appareil-photo" taille={20} className="p-672m16" />
              {t("Façade")}
            </button>
            <button type="button" className="p-3n03l6">
              <Icone nom="r-appareil-photo" taille={20} className="p-672m16" />
              {t("Rangement")}
            </button>
            <button type="button" className="p-3n03l6">
              <Icone nom="r-appareil-photo" taille={20} className="p-672m16" />
              {t("Comptoir")}
            </button>
          </div>
          <label className="p-ky12xr">
            {t("PLACES ESTIMÉES")}
            <input type="text" placeholder={t("Ex. 30")} defaultValue="30" className="p-afs6hh" />
          </label>
          <label className="p-ky12xr">
            {t("HORAIRES HABITUELS")}
            <input type="text" placeholder={t("Ex. 8 h – 19 h, lun. à sam.")} defaultValue="" className="p-afs6hh" />
          </label>
          <div className="p-81u2s6">
            {t("Il faut un coin sec, à l’abri des regards, et un comptoir où remettre. La photo de la façade aide les clients à trouver le relais. BelivaY vérifie lors de la visite.")}
          </div>
          <div className="p-lndmsc">
            <button type="button" className="p-rbzobc">
              {t("Retour")}
            </button>
            <button type="button" className="p-ncx7qc">
              {t("Continuer")}
            </button>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Après votre demande")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telephone" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Appel sous 48 h")}
              </div>
              <div className="p-dfa05r">
                {t("Un agent confirme votre dossier")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-lieu" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Visite du local")}
              </div>
              <div className="p-dfa05r">
                {t("Rangement et comptoir contrôlés")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Formation")}
              </div>
              <div className="p-dfa05r">
                {t("5 modules, environ 46 min au total")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-boutique" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Ouverture")}
              </div>
              <div className="p-dfa05r">
                {t("Votre relais apparaît sur la carte des clients")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Étape 4 · le versement (prototype : Inscription · {"ws":"s4"}) — ?etat=s4 */
export function EtatS4() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-g9jysb">
          <img src={logo} alt="BelivaY" className="p-e23hqk" />
          <div className="p-nvoomp">
            {t("Devenez point relais BelivaY")}
          </div>
          <div className="p-g987ge">
            {t("Un revenu en plus dans votre commerce, sans rien avancer : 200 F par petit colis remis, 100 F par jour de garde facturé, payés par BelivaY chaque vendredi.")}
          </div>
          <div className="p-8dmjde">
            <span className="p-3298ie">
              {t("Zéro caution")}
            </span>
            <span className="p-3298ie">
              {t("Matériel fourni")}
            </span>
            <span className="p-3298ie">
              {t("Réponse sous 48 h")}
            </span>
          </div>
        </div>
        <div className="p-oqlq8x">
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Commerce")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Gérant")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Local")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Versement")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Convention")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Où recevoir vos gains")}
            </h2>
          </div>
          <div className="p-mm2ujz">
            <span className="p-rpzy79">
              {t("MTN MoMo")}
            </span>
            <span className="p-6z26dm">
              {t("Orange Money")}
            </span>
          </div>
          <label className="p-ky12xr">
            {t("NUMÉRO DE VERSEMENT")}
            <input type="text" placeholder={t("6XX XX XX XX")} defaultValue="" className="p-afs6hh" />
          </label>
          <button type="button" className="p-v96i0s">
            <Icone nom="r-telephone" taille={18} className="p-7dsggt" />
            {t("Recevoir le code")}
          </button>
          <label className="p-ky12xr">
            {t("CODE REÇU")}
            <input type="text" placeholder={t("000000")} defaultValue="" className="p-vust5v" />
          </label>
          <div className="p-81u2s6">
            {t("Le numéro doit être au nom du gérant. Préfixe vérifié : MTN 67X, 68X, 650 à 654 · Orange 69X, 655 à 659. Un seul numéro actif à la fois.")}
          </div>
          <div className="p-lndmsc">
            <button type="button" className="p-rbzobc">
              {t("Retour")}
            </button>
            <button type="button" className="p-ncx7qc">
              {t("Continuer")}
            </button>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Après votre demande")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telephone" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Appel sous 48 h")}
              </div>
              <div className="p-dfa05r">
                {t("Un agent confirme votre dossier")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-lieu" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Visite du local")}
              </div>
              <div className="p-dfa05r">
                {t("Rangement et comptoir contrôlés")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Formation")}
              </div>
              <div className="p-dfa05r">
                {t("5 modules, environ 46 min au total")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-boutique" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Ouverture")}
              </div>
              <div className="p-dfa05r">
                {t("Votre relais apparaît sur la carte des clients")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Étape 5 · la convention (prototype : Inscription · {"ws":"s5"}) — ?etat=s5 */
export function EtatS5() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-g9jysb">
          <img src={logo} alt="BelivaY" className="p-e23hqk" />
          <div className="p-nvoomp">
            {t("Devenez point relais BelivaY")}
          </div>
          <div className="p-g987ge">
            {t("Un revenu en plus dans votre commerce, sans rien avancer : 200 F par petit colis remis, 100 F par jour de garde facturé, payés par BelivaY chaque vendredi.")}
          </div>
          <div className="p-8dmjde">
            <span className="p-3298ie">
              {t("Zéro caution")}
            </span>
            <span className="p-3298ie">
              {t("Matériel fourni")}
            </span>
            <span className="p-3298ie">
              {t("Réponse sous 48 h")}
            </span>
          </div>
        </div>
        <div className="p-oqlq8x">
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Commerce")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Gérant")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Local")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Versement")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Convention")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("La convention")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Caution")}
            </span>
            <span className="p-enqpyq">
              {t("aucune")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Frais d’entrée")}
            </span>
            <span className="p-enqpyq">
              {t("aucun")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Rémunération")}
            </span>
            <span className="p-2vq92h">
              {t("200 / 250 / 400 F par colis")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Garde")}
            </span>
            <span className="p-2vq92h">
              {t("100 F par jour facturé")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Versement")}
            </span>
            <span className="p-2vq92h">
              {t("chaque vendredi")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Exclusivité (50 premiers)")}
            </span>
            <span className="p-2vq92h">
              {t("300 m · 6 mois")}
            </span>
          </div>
          <div className="p-pfxfo4">
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-bgyo12">
              <span className="p-p91l1v" />
            </button>
            <div className="p-2qny0z">
              {t("J’ai lu la convention et je l’accepte")}
            </div>
          </div>
          <div className="p-c35ppc">
            {t("Signez ici avec le doigt")}
          </div>
          <div className="p-lndmsc">
            <button type="button" className="p-rbzobc">
              {t("Retour")}
            </button>
            <button type="button" className="p-ncx7qc">
              {t("Envoyer ma demande")}
            </button>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Après votre demande")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telephone" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Appel sous 48 h")}
              </div>
              <div className="p-dfa05r">
                {t("Un agent confirme votre dossier")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-lieu" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Visite du local")}
              </div>
              <div className="p-dfa05r">
                {t("Rangement et comptoir contrôlés")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Formation")}
              </div>
              <div className="p-dfa05r">
                {t("5 modules, environ 46 min au total")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-boutique" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Ouverture")}
              </div>
              <div className="p-dfa05r">
                {t("Votre relais apparaît sur la carte des clients")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Demande envoyée (prototype : Inscription · {"ws":"ok"}) — ?etat=ok */
export function EtatOk() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-g9jysb">
          <img src={logo} alt="BelivaY" className="p-e23hqk" />
          <div className="p-nvoomp">
            {t("Devenez point relais BelivaY")}
          </div>
          <div className="p-g987ge">
            {t("Un revenu en plus dans votre commerce, sans rien avancer : 200 F par petit colis remis, 100 F par jour de garde facturé, payés par BelivaY chaque vendredi.")}
          </div>
          <div className="p-8dmjde">
            <span className="p-3298ie">
              {t("Zéro caution")}
            </span>
            <span className="p-3298ie">
              {t("Matériel fourni")}
            </span>
            <span className="p-3298ie">
              {t("Réponse sous 48 h")}
            </span>
          </div>
        </div>
        <div className="p-oqlq8x">
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Commerce")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Gérant")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Local")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Versement")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Convention")}
            </span>
          </div>
        </div>
        <div className="p-c1r1yj">
          <div className="p-vhxw8h">
            <Icone nom="check" taille={32} trait={2.6} className="p-q7qjlz" />
          </div>
          <div className="p-fdt7cn">
            {t("Demande envoyée")}
          </div>
          <div className="p-uzhe04">
            {t("Un agent BelivaY vous appelle sous 48 h pour fixer la visite. Pendant ce temps, commencez la formation : 5 modules courts, sur votre téléphone.")}
          </div>
          <Link to={chemin("formation")} className="p-ncx7qc">
            <Icone nom="r-formation" taille={18} className="p-7dsggt" />
            {t("Commencer la formation")}
          </Link>
          <button type="button" className="p-rbzobc">
            {t("Revoir ma demande")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Après votre demande")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telephone" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Appel sous 48 h")}
              </div>
              <div className="p-dfa05r">
                {t("Un agent confirme votre dossier")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-lieu" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Visite du local")}
              </div>
              <div className="p-dfa05r">
                {t("Rangement et comptoir contrôlés")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Formation")}
              </div>
              <div className="p-dfa05r">
                {t("5 modules, environ 46 min au total")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-boutique" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Ouverture")}
              </div>
              <div className="p-dfa05r">
                {t("Votre relais apparaît sur la carte des clients")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Inscription du relais", Rendu: EtatDefaut },
  { id: "s2", libelle: "Étape 2 · le gérant", Rendu: EtatS2 },
  { id: "s3", libelle: "Étape 3 · le local", Rendu: EtatS3 },
  { id: "s4", libelle: "Étape 4 · le versement", Rendu: EtatS4 },
  { id: "s5", libelle: "Étape 5 · la convention", Rendu: EtatS5 },
  { id: "ok", libelle: "Demande envoyée", Rendu: EtatOk },
]

export default function InscriptionProvisoire() {
  return <PageProvisoire route="inscription" etats={ETATS} />
}

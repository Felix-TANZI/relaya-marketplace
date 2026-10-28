// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Connexion · Connexion) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-03/Connexion.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import logo from '../../../assets/logo-belivay.png'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Connexion (prototype : Connexion · {"lg":"tel"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-c31dz9 r-pile">
        <div className="p-mb91o7">
          <img src={logo} alt="BelivaY" className="p-vwp2xk" />
          <div className="p-7yh7mn">
            <span className="p-jldqhz" />
            <span className="p-fy5sn3">
              {t("ESPACE POINT RELAIS")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Connexion")}
            </h2>
          </div>
          <div className="p-ug5qrn">
            {t("Entrez le numéro de téléphone enregistré pour votre relais (gérant ou employé).")}
          </div>
          <label className="p-ky12xr">
            {t("NUMÉRO DE TÉLÉPHONE")}
            <div className="p-ko4uav">
              <span className="p-im8mop">
                {"+237"}
              </span>
              <input type="text" defaultValue="6 91 24 83 50" aria-label={t("Numéro")} className="p-im8rz3" />
            </div>
          </label>
          <button type="button" className="p-ncx7qc">
            {t("Continuer")}
          </button>
          <div className="p-81u2s6">
            {t("Première connexion sur ce téléphone : un code à 6 chiffres vous est envoyé par SMS avant le PIN (double vérification).")}
          </div>
        </div>
        <Link to={chemin("inscription")} className="p-rbzobc">
          <Icone nom="r-boutique" taille={18} className="p-emic6i" />
          {t("Devenir point relais")}
        </Link>
        <Link to={chemin("installer")} className="p-ja9yqp">
          {t("Installer l’application sur ce téléphone")}
        </Link>
      </div>
    </>
  )
}

/** Saisie du code PIN (prototype : Connexion · {"lg":"pin"}) — ?etat=pin */
export function EtatPin() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-c31dz9 r-pile">
        <div className="p-mb91o7">
          <img src={logo} alt="BelivaY" className="p-vwp2xk" />
          <div className="p-7yh7mn">
            <span className="p-jldqhz" />
            <span className="p-fy5sn3">
              {t("ESPACE POINT RELAIS")}
            </span>
          </div>
        </div>
        <div className="p-txto41">
          <div className="p-fdt7cn">
            {t("Bonjour Franck")}
          </div>
          <div className="p-ietgpj">
            {t("Entrez votre code PIN à 4 chiffres")}
          </div>
        </div>
        <div className="p-j3bvre">
          <span className="p-au0k5d" />
          <span className="p-au0k5d" />
          <span className="p-3z2zrb" />
          <span className="p-3z2zrb" />
        </div>
        <div className="p-a71a3h">
          <button type="button" aria-label={t("1")} className="p-3ml6k6">
            {"1"}
          </button>
          <button type="button" aria-label={t("2")} className="p-3ml6k6">
            {"2"}
          </button>
          <button type="button" aria-label={t("3")} className="p-3ml6k6">
            {"3"}
          </button>
          <button type="button" aria-label={t("4")} className="p-3ml6k6">
            {"4"}
          </button>
          <button type="button" aria-label={t("5")} className="p-3ml6k6">
            {"5"}
          </button>
          <button type="button" aria-label={t("6")} className="p-3ml6k6">
            {"6"}
          </button>
          <button type="button" aria-label={t("7")} className="p-3ml6k6">
            {"7"}
          </button>
          <button type="button" aria-label={t("8")} className="p-3ml6k6">
            {"8"}
          </button>
          <button type="button" aria-label={t("9")} className="p-3ml6k6">
            {"9"}
          </button>
          <span />
          <button type="button" aria-label={t("0")} className="p-3ml6k6">
            {"0"}
          </button>
          <button type="button" aria-label={t("Effacer")} className="p-3ml6k6">
            {"⌫"}
          </button>
        </div>
        <div className="p-h6lji0">
          <button type="button" className="p-3b809k">
            {t("Changer de numéro")}
          </button>
          <button type="button" className="p-hw1nv0">
            {t("PIN oublié ?")}
          </button>
        </div>
        <Link to={chemin("accueil")} className="p-ncx7qc">
          {t("Se connecter")}
        </Link>
        <div className="p-16950n">
          {t("5 PIN faux de suite : connexion bloquée 30 minutes, le gérant est prévenu.")}
        </div>
      </div>
    </>
  )
}

/** PIN oublié (prototype : Connexion · {"lg":"oubli"}) — ?etat=oubli */
export function EtatOubli() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-c31dz9 r-pile">
        <div className="p-mb91o7">
          <img src={logo} alt="BelivaY" className="p-vwp2xk" />
          <div className="p-7yh7mn">
            <span className="p-jldqhz" />
            <span className="p-fy5sn3">
              {t("ESPACE POINT RELAIS")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("PIN oublié")}
            </h2>
          </div>
          <div className="p-ug5qrn">
            {t("Un code de réinitialisation est envoyé par SMS au numéro du compte. Un employé peut aussi demander au gérant de réinitialiser son PIN depuis « Mon équipe ».")}
          </div>
          <label className="p-ky12xr">
            {t("CODE REÇU PAR SMS")}
            <input type="text" placeholder={t("000000")} defaultValue="" className="p-9dfvp5" />
          </label>
          <button type="button" className="p-ncx7qc">
            {t("Créer un nouveau PIN")}
          </button>
          <button type="button" className="p-rbzobc">
            {t("Retour")}
          </button>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Connexion", Rendu: EtatDefaut },
  { id: "pin", libelle: "Saisie du code PIN", Rendu: EtatPin },
  { id: "oubli", libelle: "PIN oublié", Rendu: EtatOubli },
]

export default function ConnexionProvisoire() {
  return <PageProvisoire route="connexion" etats={ETATS} />
}

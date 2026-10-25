// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Installer · Installer l’application) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-03/Installer.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import marque from '../../../assets/marque-belivay.png'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { usePreferences } from '../../../preferences'

/** Installer l’application (prototype : Installer · {"os":"ios"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-908no5">
          <div className="p-78e8u1">
            <img src={marque} alt="" className="p-w1wmof" />
          </div>
          <div className="p-blzquz">
            {t("Installer BelivaY Relais")}
          </div>
          <div className="p-ietgpj">
            {t("Une icône sur l’écran d’accueil, sans passer par un store")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-h01hlk">
            {t("iPhone")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Android")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-ek1p8z">
            <span className="p-mb8x3g">
              {"1"}
            </span>
            <div>
              <div className="p-dfc4i3">
                {t("Ouvrez ce lien dans Safari")}
              </div>
              <div className="p-l750d6">
                {t("L’installation n’est possible que depuis Safari")}
              </div>
            </div>
          </div>
          <div className="p-ek1p8z">
            <span className="p-mb8x3g">
              {"2"}
            </span>
            <div>
              <div className="p-dfc4i3">
                {t("Touchez le bouton Partager")}
              </div>
              <div className="p-l750d6">
                {t("Le carré avec une flèche, en bas de l’écran")}
              </div>
            </div>
          </div>
          <div className="p-ek1p8z">
            <span className="p-mb8x3g">
              {"3"}
            </span>
            <div>
              <div className="p-dfc4i3">
                {t("« Sur l’écran d’accueil »")}
              </div>
              <div className="p-l750d6">
                {t("Faites défiler la liste si besoin")}
              </div>
            </div>
          </div>
          <div className="p-ek1p8z">
            <span className="p-mb8x3g">
              {"4"}
            </span>
            <div>
              <div className="p-dfc4i3">
                {t("Touchez « Ajouter »")}
              </div>
              <div className="p-l750d6">
                {t("L’icône BelivaY apparaît sur votre écran")}
              </div>
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Pourquoi l’installer")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-reseau" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Marche sans réseau")}
              </div>
              <div className="p-dfa05r">
                {t("Réceptions et remises enregistrées hors connexion")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-cloche" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Notifications")}
              </div>
              <div className="p-dfa05r">
                {t("Livreur en approche, résumé du matin")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telecharger" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Léger")}
              </div>
              <div className="p-dfa05r">
                {t("Moins de 5 Mo, peu de données consommées")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Android (prototype : Installer · {"os":"and"}) — ?etat=and */
export function EtatAnd() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-908no5">
          <div className="p-78e8u1">
            <img src={marque} alt="" className="p-w1wmof" />
          </div>
          <div className="p-blzquz">
            {t("Installer BelivaY Relais")}
          </div>
          <div className="p-ietgpj">
            {t("Une icône sur l’écran d’accueil, sans passer par un store")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("iPhone")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Android")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-ek1p8z">
            <span className="p-mb8x3g">
              {"1"}
            </span>
            <div>
              <div className="p-dfc4i3">
                {t("Touchez « Installer » ci-dessous")}
              </div>
              <div className="p-l750d6">
                {t("Ou le menu ⋮ de Chrome → « Installer l’application »")}
              </div>
            </div>
          </div>
          <div className="p-ek1p8z">
            <span className="p-mb8x3g">
              {"2"}
            </span>
            <div>
              <div className="p-dfc4i3">
                {t("Confirmez")}
              </div>
              <div className="p-l750d6">
                {t("L’icône BelivaY apparaît dans vos applications")}
              </div>
            </div>
          </div>
          <button type="button" className="p-ncx7qc">
            <Icone nom="r-telecharger" taille={18} className="p-7dsggt" />
            {t("Installer")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Pourquoi l’installer")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-reseau" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Marche sans réseau")}
              </div>
              <div className="p-dfa05r">
                {t("Réceptions et remises enregistrées hors connexion")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-cloche" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Notifications")}
              </div>
              <div className="p-dfa05r">
                {t("Livreur en approche, résumé du matin")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telecharger" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Léger")}
              </div>
              <div className="p-dfa05r">
                {t("Moins de 5 Mo, peu de données consommées")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Installer l’application", Rendu: EtatDefaut },
  { id: "and", libelle: "Android", Rendu: EtatAnd },
]

export default function InstallerProvisoire() {
  return <PageProvisoire route="installer" etats={ETATS} />
}

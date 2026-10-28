// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Activation · Activation et partenariat) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-03/Activation.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import logo from '../../../assets/logo-belivay.png'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { usePreferences } from '../../../preferences'

/** Activation en 6 étapes (prototype : Activation) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-o4e1px">
          <img src={logo} alt="BelivaY" className="p-j6jhv3" />
          <div className="p-ctvg7v">
            {t("PARTENAIRE FONDATEUR · 50 PREMIERS RELAIS")}
          </div>
          <div className="p-31yzrb">
            {t("Mama René · Mvog-Ada")}
          </div>
          <div className="p-5g7m7p">
            {t("Point relais partenaire indépendant · ouvert le 16 juillet 2026")}
          </div>
          <div className="p-kxe5yr" />
          <div className="p-ci9b6x">
            <div className="p-r4zqjk">
              <Icone nom="r-lieu" taille={18} className="p-672m16" />
              <div>
                <div className="p-cp89bh">
                  {t("Exclusivité 300 m")}
                </div>
                <div className="p-g7lwlw">
                  {t("pendant 6 mois")}
                </div>
              </div>
            </div>
            <div className="p-r4zqjk">
              <Icone nom="r-bouclier" taille={18} className="p-672m16" />
              <div>
                <div className="p-cp89bh">
                  {t("Zéro caution")}
                </div>
                <div className="p-g7lwlw">
                  {t("rien à avancer")}
                </div>
              </div>
            </div>
            <div className="p-r4zqjk">
              <Icone nom="r-etiquette" taille={18} className="p-672m16" />
              <div>
                <div className="p-cp89bh">
                  {t("Matériel fourni")}
                </div>
                <div className="p-g7lwlw">
                  {t("étiquettes et sacs")}
                </div>
              </div>
            </div>
            <div className="p-r4zqjk">
              <Icone nom="r-carte-paiement" taille={18} className="p-672m16" />
              <div>
                <div className="p-cp89bh">
                  {t("Payé le vendredi")}
                </div>
                <div className="p-g7lwlw">
                  {t("sans frais")}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Les 6 étapes d’activation")}
            </h2>
            <span className="p-nax3x4">
              {"6 / 6"}
            </span>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <div className="p-pneplq">
                <Icone nom="check" taille={15} trait={2.8} className="p-gqbtfa" />
              </div>
              <div className="p-k92ss3" />
            </div>
            <div className="p-8fadah">
              <div className="p-dfc4i3">
                {t("1. Dossier du gérant")}
              </div>
              <div className="p-hmchcr">
                {t("Pièce d’identité, votre portrait et la façade")}
              </div>
            </div>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <div className="p-pneplq">
                <Icone nom="check" taille={15} trait={2.8} className="p-gqbtfa" />
              </div>
              <div className="p-k92ss3" />
            </div>
            <div className="p-8fadah">
              <div className="p-dfc4i3">
                {t("2. Numéro de versement vérifié")}
              </div>
              <div className="p-hmchcr">
                {t("Confirmé par code SMS, reçoit les versements")}
              </div>
            </div>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <div className="p-pneplq">
                <Icone nom="check" taille={15} trait={2.8} className="p-gqbtfa" />
              </div>
              <div className="p-k92ss3" />
            </div>
            <div className="p-8fadah">
              <div className="p-dfc4i3">
                {t("3. Convention signée")}
              </div>
              <div className="p-hmchcr">
                {t("Sans caution, sans dépôt, sans frais d’entrée")}
              </div>
            </div>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <div className="p-pneplq">
                <Icone nom="check" taille={15} trait={2.8} className="p-gqbtfa" />
              </div>
              <div className="p-k92ss3" />
            </div>
            <div className="p-8fadah">
              <div className="p-dfc4i3">
                {t("4. Visite de BelivaY")}
              </div>
              <div className="p-hmchcr">
                {t("Local, rangement et zone de remise contrôlés")}
              </div>
            </div>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <div className="p-pneplq">
                <Icone nom="check" taille={15} trait={2.8} className="p-gqbtfa" />
              </div>
              <div className="p-kf3cbz" />
            </div>
            <div className="p-8fadah">
              <div className="p-dfc4i3">
                {t("5. Formation suivie")}
              </div>
              <div className="p-hmchcr">
                {t("Les 5 modules obligatoires")}
              </div>
            </div>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <div className="p-pneplq">
                <Icone nom="check" taille={15} trait={2.8} className="p-gqbtfa" />
              </div>
            </div>
            <div className="p-2z0wdo">
              <div className="p-dfc4i3">
                {t("6. Capacité et horaires déclarés")}
              </div>
              <div className="p-hmchcr">
                {t("Le relais passe « Ouvert » pour les clients")}
              </div>
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-document" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Convention de partenariat")}
              </div>
              <div className="p-dfa05r">
                {t("Version 1 · signée le 12 juillet 2026")}
              </div>
            </div>
            <Icone nom="r-telecharger" taille={20} className="p-672m16" />
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Activation en 6 étapes", Rendu: EtatDefaut },
]

export default function ActivationProvisoire() {
  return <PageProvisoire route="activation" etats={ETATS} />
}

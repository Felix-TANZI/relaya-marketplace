// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (PinRemise · PIN de remise) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-05/PinRemise.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Code PIN de remise (prototype : PinRemise · {"pn":"ok"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-x1yexf">
          <div className="p-rv5edl">
            {t("B-04")}
          </div>
          <div className="p-lmo74g">
            <div className="p-hz5rr5">
              {t("BLV-40231")}
            </div>
            <div className="p-t1lapd">
              {t("400 F payés · photo prise")}
            </div>
          </div>
          <span className="p-nax3x4">
            {t("Prêt à remettre")}
          </span>
        </div>
        <div className="p-tw87fq">
          <div className="p-4kp1y3">
            <Icone nom="r-cadenas" taille={26} className="p-672m16" />
          </div>
          <div className="p-7qbps6">
            {t("Confirmez la remise")}
          </div>
          <div className="p-ietgpj">
            {t("Votre code PIN personnel signe l’opération")}
          </div>
        </div>
        <div className="p-j3bvre">
          <span className="p-au0k5d" />
          <span className="p-au0k5d" />
          <span className="p-au0k5d" />
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
        <div className="p-0cipe3">
          <button type="button" className="p-rbzobc">
            {t("Tester une erreur")}
          </button>
          <Link to={chemin("retrait")} className="p-ncx7qc">
            {t("Valider")}
          </Link>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-bouclier" taille={18} className="p-672m16" />
          <div>
            {t("Le PIN est demandé à chaque remise si le réglage est actif (par défaut : oui). Il identifie qui a remis le colis. 3 PIN faux : la remise est annulée et le gérant est prévenu.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** PIN erroné (prototype : PinRemise · {"pn":"err"}) — ?etat=err */
export function EtatErr() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-x1yexf">
          <div className="p-rv5edl">
            {t("B-04")}
          </div>
          <div className="p-lmo74g">
            <div className="p-hz5rr5">
              {t("BLV-40231")}
            </div>
            <div className="p-t1lapd">
              {t("400 F payés · photo prise")}
            </div>
          </div>
          <span className="p-nax3x4">
            {t("Prêt à remettre")}
          </span>
        </div>
        <div className="p-tw87fq">
          <div className="p-4kp1y3">
            <Icone nom="r-cadenas" taille={26} className="p-672m16" />
          </div>
          <div className="p-7qbps6">
            {t("Confirmez la remise")}
          </div>
          <div className="p-ietgpj">
            {t("Votre code PIN personnel signe l’opération")}
          </div>
        </div>
        <div className="p-j3bvre">
          <span className="p-xu43sj" />
          <span className="p-xu43sj" />
          <span className="p-xu43sj" />
          <span className="p-xu43sj" />
        </div>
        <div className="p-nhw7ne">
          {t("PIN incorrect · encore 2 essais")}
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
        <div className="p-0cipe3">
          <button type="button" className="p-rbzobc">
            {t("Tester une erreur")}
          </button>
          <Link to={chemin("retrait")} className="p-ncx7qc">
            {t("Valider")}
          </Link>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-bouclier" taille={18} className="p-672m16" />
          <div>
            {t("Le PIN est demandé à chaque remise si le réglage est actif (par défaut : oui). Il identifie qui a remis le colis. 3 PIN faux : la remise est annulée et le gérant est prévenu.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Code PIN de remise", Rendu: EtatDefaut },
  { id: "err", libelle: "PIN erroné", Rendu: EtatErr },
]

export default function PinRemiseProvisoire() {
  return <PageProvisoire route="pin-remise" etats={ETATS} />
}

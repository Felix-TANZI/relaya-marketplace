// Page provisoire « Journal de la commande » (VD-05) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (3 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Journal() {
  const { t } = usePreferences()
  switch (useEtat("journal")) {
    case "journal?ref=BLV-00008":
    case "journal?ref=BLV-00009":
    default:
      return (
        <Ecran route="journal" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Journal de la commande")}
            </h1>
            <p className="pg-s">
              {t("Qui a fait quoi, et quand, sur cette commande. Chaque action est signée.")}
            </p>
          </div>
          <div className="card">
            <div className="tl" style={{ "marginTop": "4px" }}>
              <div className="ti done">
                <div className="row" style={{ "alignItems": "flex-start" }}>
                  <div className="grow">
                    <div className="tt">
                      {t("Stock de l’ITEL AC52 noir mis à jour")}
                    </div>
                    <div className="td">
                      {t("Aïcha N. · accès préparation")}
                    </div>
                    <div className="row mt6" style={{ "gap": "6px" }}>
                      <span className="pill ink sm">
                        {t("4")}
                      </span>
                      <Icone nom="arrow-right" taille={14} style={{ "color": "var(--ink-3)" }} />
                      <span className="pill or sm">
                        {t("3")}
                      </span>
                    </div>
                  </div>
                  <span className="t12 b8 c3 nw">
                    {t("09\u00A0h\u00A020")}
                  </span>
                </div>
              </div>
              <div className="ti done">
                <div className="row" style={{ "alignItems": "flex-start" }}>
                  <div className="grow">
                    <div className="tt">
                      {t("Bon de préparation ouvert")}
                    </div>
                    <div className="td">
                      {t("Franck Penga · propriétaire")}
                    </div>
                  </div>
                  <span className="t12 b8 c3 nw">
                    {t("09\u00A0h\u00A012")}
                  </span>
                </div>
              </div>
              <div className="ti done">
                <div className="row" style={{ "alignItems": "flex-start" }}>
                  <div className="grow">
                    <div className="tt">
                      {t("Entrée dans la file à préparer")}
                    </div>
                    <div className="td">
                      {t("Système BelivaY · prête avant 12\u00A0h\u00A042")}
                    </div>
                  </div>
                  <span className="t12 b8 c3 nw">
                    {t("08\u00A0h\u00A042")}
                  </span>
                </div>
              </div>
              <div className="ti done">
                <div className="row" style={{ "alignItems": "flex-start" }}>
                  <div className="grow">
                    <div className="tt">
                      {t("Commande payée par le client")}
                    </div>
                    <div className="td">
                      {t("Encaissée par BelivaY · Mobile Money")}
                    </div>
                  </div>
                  <span className="t12 b8 c3 nw">
                    {t("08\u00A0h\u00A042")}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="note ink">
            <Icone nom="lock" taille={18} />
            <div>
              {t("Personne ne peut modifier ni effacer ce journal. Il sert de preuve en cas de litige.")}
            </div>
          </div>
        </Ecran>
      )
  }
}

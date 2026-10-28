// Page provisoire « Bon de préparation » (VD-05) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (3 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import img_be926f70d2b8_png from '../../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Bon() {
  const { t } = usePreferences()
  switch (useEtat("bon")) {
    case "bon?ref=BLV-00008":
    default:
      return (
        <Ecran route="bon" parEtat>
          <div className="card" style={{ "marginTop": "16px", "padding": "0", "overflow": "hidden" }}>
            <div className="hero night" style={{ "margin": "0", "borderRadius": "0", "padding": "16px 16px 14px", "boxShadow": "none" }}>
              <div className="row">
                <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "24px" }} />
                <span className="grow"></span>
                <span className="hk">
                  {t("Bon de préparation")}
                </span>
              </div>
              <div className="row mt10">
                <span className="grow b8" style={{ "fontSize": "20px", "letterSpacing": ".02em" }}>
                  {t("BLV-00008")}
                </span>
                <span className="pill dk sm">
                  {t("Colis S")}
                </span>
              </div>
              <div className="t12 mt4" style={{ "color": "rgba(255,255,255,.72)" }}>
                {t("Payée mar. 13 oct. à 08\u00A0h\u00A042 · prête avant 12\u00A0h\u00A042")}
              </div>
            </div>
            <div style={{ "padding": "16px" }}>
              <div className="art" style={{ "marginTop": "0" }}>
                <span className="thumb" style={{ "width": "64px", "height": "64px", "borderRadius": "16px" }}>
                  <Dessin id="c90a68b1a1ff" />
                </span>
                <div className="grow">
                  <div className="an" style={{ "fontSize": "24px", "letterSpacing": "-.02em" }}>
                    {t("ITEL AC52")}
                  </div>
                  <div className="b8 mt4" style={{ "fontSize": "18px", "letterSpacing": ".06em", "color": "var(--or-txt)" }}>
                    {t("NOIR · NEUF · ×1")}
                  </div>
                  <div className="av mono">
                    {t("ITL-AC52-NR")}
                  </div>
                </div>
              </div>
              <div className="hr"></div>
              <div className="kick">
                {t("À vérifier avant l’arrivée du livreur")}
              </div>
              <div className="mt4">
                <div className="check">
                  <span className="cb on">
                    <Icone nom="check" taille={14} trait={3} />
                  </span>
                  <span className="grow">
                    {t("Bon modèle et bonne couleur\u00A0: ITEL AC52 noir")}
                  </span>
                </div>
                <div className="check">
                  <span className="cb on">
                    <Icone nom="check" taille={14} trait={3} />
                  </span>
                  <span className="grow">
                    {t("Article neuf, allumé et testé")}
                  </span>
                </div>
                <div className="check">
                  <span className="cb"></span>
                  <span className="grow">
                    {t("Chargeur et câble mis de côté")}
                  </span>
                </div>
                <div className="check">
                  <span className="cb"></span>
                  <span className="grow">
                    {t("Boîte d’origine prête")}
                  </span>
                </div>
              </div>
              <div className="note or">
                <Icone nom="package-open" taille={18} />
                <div>
                  <b>
                    {t("Ne fermez rien.")}
                  </b>
                  {t(" Le livreur contrôle, emballe dans un emballage BelivaY et scelle devant vous.")}
                </div>
              </div>
              <div className="hr"></div>
              <div className="kick">
                {t("Ramassage chez vous")}
              </div>
              <div className="row mt8">
                <span style={{ "width": "44px", "height": "44px", "borderRadius": "50%", "overflow": "hidden", "flexShrink": "0" }}>
                  <Dessin id="ee6a780b5a64" />
                </span>
                <div className="grow">
                  <div className="b8 t14">
                    {t("Serge M. · aujourd’hui entre 14\u00A0h et 16\u00A0h")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("Donnez-lui le code de remise seulement après avoir vérifié sa photo dans l’application.")}
                  </div>
                </div>
              </div>
              <div className="hr"></div>
              <div className="row" style={{ "alignItems": "flex-start" }}>
                <div className="grow">
                  <div className="t14 b7">
                    {t("Vous gardez")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("Libéré 3\u00A0jours après la confirmation du client")}
                  </div>
                </div>
                <span className="b8 t17 cg nw">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="t12 c3 mt10">
                <Icone nom="shield-check" taille={13} style={{ "verticalAlign": "-2px" }} />
                {t(" Aucune donnée du client ne figure sur ce bon.")}
              </div>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="printer" taille={18} />
              <span>
                {t("Imprimer")}
              </span>
            </button>
          </div>
          <div className="mt8">
            <button type="button" className="btn secondary">
              <Icone nom="file-down" taille={18} />
              <span>
                {t("Partager en PDF")}
              </span>
            </button>
          </div>
        </Ecran>
      )
    case "bon?ref=BLV-00009":
      return (
        <Ecran route="bon" parEtat>
          <div className="card" style={{ "marginTop": "16px", "padding": "0", "overflow": "hidden" }}>
            <div className="hero night" style={{ "margin": "0", "borderRadius": "0", "padding": "16px 16px 14px", "boxShadow": "none" }}>
              <div className="row">
                <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "24px" }} />
                <span className="grow"></span>
                <span className="hk">
                  {t("Bon de préparation")}
                </span>
              </div>
              <div className="row mt10">
                <span className="grow b8" style={{ "fontSize": "20px", "letterSpacing": ".02em" }}>
                  {t("BLV-00009")}
                </span>
                <span className="pill dk sm">
                  {t("Colis S")}
                </span>
              </div>
              <div className="t12 mt4" style={{ "color": "rgba(255,255,255,.72)" }}>
                {t("Payée mar. 13 oct. à 08\u00A0h\u00A042 · prête avant 12\u00A0h\u00A042")}
              </div>
            </div>
            <div style={{ "padding": "16px" }}>
              <div className="art" style={{ "marginTop": "0" }}>
                <span className="thumb" style={{ "width": "64px", "height": "64px", "borderRadius": "16px" }}>
                  <Dessin id="c90a68b1a1ff" />
                </span>
                <div className="grow">
                  <div className="an" style={{ "fontSize": "24px", "letterSpacing": "-.02em" }}>
                    {t("ITEL AC52")}
                  </div>
                  <div className="b8 mt4" style={{ "fontSize": "18px", "letterSpacing": ".06em", "color": "var(--or-txt)" }}>
                    {t("NOIR · NEUF · ×1")}
                  </div>
                  <div className="av mono">
                    {t("ITL-AC52-NR")}
                  </div>
                </div>
              </div>
              <div className="hr"></div>
              <div className="kick">
                {t("À vérifier avant l’arrivée du livreur")}
              </div>
              <div className="mt4">
                <div className="check">
                  <span className="cb on">
                    <Icone nom="check" taille={14} trait={3} />
                  </span>
                  <span className="grow">
                    {t("Bon modèle et bonne couleur\u00A0: ITEL AC52 noir")}
                  </span>
                </div>
                <div className="check">
                  <span className="cb on">
                    <Icone nom="check" taille={14} trait={3} />
                  </span>
                  <span className="grow">
                    {t("Article neuf, allumé et testé")}
                  </span>
                </div>
                <div className="check">
                  <span className="cb"></span>
                  <span className="grow">
                    {t("Chargeur et câble mis de côté")}
                  </span>
                </div>
                <div className="check">
                  <span className="cb"></span>
                  <span className="grow">
                    {t("Boîte d’origine prête")}
                  </span>
                </div>
              </div>
              <div className="note or">
                <Icone nom="package-open" taille={18} />
                <div>
                  <b>
                    {t("Ne fermez rien.")}
                  </b>
                  {t(" Le livreur contrôle, emballe dans un emballage BelivaY et scelle devant vous.")}
                </div>
              </div>
              <div className="hr"></div>
              <div className="kick">
                {t("Ramassage chez vous")}
              </div>
              <div className="row mt8">
                <span style={{ "width": "44px", "height": "44px", "borderRadius": "50%", "overflow": "hidden", "flexShrink": "0" }}>
                  <Dessin id="ee6a780b5a64" />
                </span>
                <div className="grow">
                  <div className="b8 t14">
                    {t("Serge M. · aujourd’hui entre 14\u00A0h et 16\u00A0h")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("Donnez-lui le code de remise seulement après avoir vérifié sa photo dans l’application.")}
                  </div>
                </div>
              </div>
              <div className="hr"></div>
              <div className="row" style={{ "alignItems": "flex-start" }}>
                <div className="grow">
                  <div className="t14 b7">
                    {t("Vous gardez")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("Libéré 3\u00A0jours après la confirmation du client")}
                  </div>
                </div>
                <span className="b8 t17 cg nw">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="t12 c3 mt10">
                <Icone nom="shield-check" taille={13} style={{ "verticalAlign": "-2px" }} />
                {t(" Aucune donnée du client ne figure sur ce bon.")}
              </div>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="printer" taille={18} />
              <span>
                {t("Imprimer")}
              </span>
            </button>
          </div>
          <div className="mt8">
            <button type="button" className="btn secondary">
              <Icone nom="file-down" taille={18} />
              <span>
                {t("Partager en PDF")}
              </span>
            </button>
          </div>
        </Ecran>
      )
  }
}

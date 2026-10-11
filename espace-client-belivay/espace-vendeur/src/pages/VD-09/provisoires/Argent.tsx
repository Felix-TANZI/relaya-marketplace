// Page provisoire « Mon argent » (VD-09) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (4 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Argent() {
  const { t } = usePreferences()
  switch (useEtat("argent")) {
    case "argent?pop=profil":
    default:
      return (
        <Ecran route="argent" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Mon argent")}
            </h1>
            <p className="pg-s">
              {t("Où est chaque franc, et quand il arrive.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/argent" style={{ "height": "44px" }} className="on">
              {t("Résumé")}
            </Link>
            <Link to="/se_libere" style={{ "height": "44px" }} className="">
              {t("Se libère")}
            </Link>
            <Link to="/gele" style={{ "height": "44px" }} className="">
              {t("Gelé")}
            </Link>
            <Link to="/gains" style={{ "height": "44px" }} className="">
              {t("Mes gains")}
            </Link>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("À verser vendredi 25 sept.")}
            </div>
            <div className="big">
              {t("17\u00A0840")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("Passe à ")}
              <b>
                {t("35\u00A0680\u00A0F")}
              </b>
              {t(" ce soir, quand BLV-00007 se libère.")}
            </div>
            <div className="hline"></div>
            <div className="row">
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "11px", "background": "#FFCB05", "color": "#1A1A1A", "fontWeight": "800", "fontSize": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("MTN")}
              </span>
              <div className="grow">
                <div className="t15 b8">
                  {t("Sur MTN\u00A0····\u00A04\u00A0217, avant 12\u00A0h")}
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.74)" }}>
                  {t("Automatique · vérifié · sans frais")}
                </div>
              </div>
            </div>
            <Link to="/versements" className="row t14 b8" style={{ "color": "var(--gold-l)", "minHeight": "44px", "marginTop": "6px", "gap": "4px" }}>
              {t("Voir le prochain versement ")}
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
          <div className="card">
            <h3>
              {t("Où est votre argent")}
            </h3>
            <div style={{ "display": "flex", "height": "10px", "borderRadius": "999px", "overflow": "hidden", "marginTop": "12px", "gap": "2px" }} aria-hidden="true">
              <i style={{ "display": "block", "flex": "0.045", "background": "var(--green)" }}></i>
              <i style={{ "display": "block", "flex": "0.045", "background": "var(--or)" }}></i>
              <i style={{ "display": "block", "flex": "0.045", "background": "var(--gold)" }}></i>
              <i style={{ "display": "block", "flex": "0.9278713976129638", "background": "var(--red)" }}></i>
            </div>
            <div className="mt6">
              <Link to="/versements" className="li">
                <span style={{ "width": "12px", "height": "12px", "borderRadius": "50%", "background": "var(--green)", "flexShrink": "0", "margin": "0 4px 0 2px" }}></span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("À verser")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Libéré · part vendredi")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <Link to="/se_libere" className="li">
                <span style={{ "width": "12px", "height": "12px", "borderRadius": "50%", "background": "var(--or)", "flexShrink": "0", "margin": "0 4px 0 2px" }}></span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Se libère")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-00007 · ce soir à 18\u00A0h")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <Link to="/commande?ref=BLV-00008" className="li">
                <span style={{ "width": "12px", "height": "12px", "borderRadius": "50%", "background": "var(--gold)", "flexShrink": "0", "margin": "0 4px 0 2px" }}></span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("En cours")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-00008 · pas encore retirée")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <Link to="/gele" className="li">
                <span style={{ "width": "12px", "height": "12px", "borderRadius": "50%", "background": "var(--red)", "flexShrink": "0", "margin": "0 4px 0 2px" }}></span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Gelé")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("2 litiges et 1 retour · sans date")}
                  </span>
                </span>
                <span className="rv">
                  {t("688\u00A0488\u00A0F")}
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            </div>
            <div className="row" style={{ "paddingTop": "12px", "borderTop": "1.5px solid var(--line-2)" }}>
              <span className="grow">
                <span className="t15 b8" style={{ "display": "block" }}>
                  {t("En circulation")}
                </span>
                <span className="t12 c3" style={{ "display": "block", "marginTop": "2px" }}>
                  {t("La somme des quatre lignes")}
                </span>
              </span>
              <span className="b8 nw" style={{ "fontSize": "20px", "letterSpacing": "-.02em" }}>
                {t("742\u00A0008\u00A0F")}
              </span>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Ce que vous gardez")}
            </h3>
            <div className="row mt10" style={{ "alignItems": "flex-end" }}>
              <div className="grow">
                <div className="t14 b7">
                  {t("Ce mois-ci")}
                </div>
                <div className="t13 c3 mt4">
                  {t("sur 60\u00A0000\u00A0F de ventes")}
                </div>
              </div>
              <div className="b8 cg nw" style={{ "fontSize": "22px", "letterSpacing": "-.02em" }}>
                {t("53\u00A0520\u00A0F")}
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Sur une vente de 20\u00A0000\u00A0F, vous gardez 17\u00A0840\u00A0F, versés sans frais.")}
              </span>
            </div>
            <div className="mt6">
              <Link to="/documents" className="li" style={{ "borderTop": "1px solid var(--line)" }}>
                <span className="ic or">
                  <Icone nom="file-text" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Relevés et documents")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Relevé CSV, relevé mensuel, factures")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            </div>
          </div>
          <div className="note green">
            <Icone nom="shield-check" taille={18} />
            <div>
              {t("BelivaY ne vous demande jamais votre code secret Mobile Money. Un message qui le demande est une fraude.")}
            </div>
          </div>
        </Ecran>
      )
    case "argent?role=prep":
    case "argent?pop=profil&role=prep":
      return (
        <Ecran route="argent" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Mon argent")}
            </h1>
          </div>
          <div className="card">
            <div className="empty" style={{ "padding": "18px 4px 4px" }}>
              <div className="ei" style={{ "background": "var(--sand-3)", "color": "var(--ink-2)" }}>
                <Icone nom="lock" taille={26} />
              </div>
              <h3>
                {t("Réservé au propriétaire")}
              </h3>
              <p>
                {t("Les montants, versements et documents sont visibles par Franck Penga seulement.")}
              </p>
            </div>
            <div className="row t13 c2" style={{ "gap": "9px", "alignItems": "flex-start", "lineHeight": "1.45", "marginTop": "14px", "paddingTop": "14px", "borderTop": "1px solid var(--line)" }}>
              <Icone nom="circle-check" taille={17} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--green)" }} />
              <span>
                {t("Vous pouvez toujours préparer les commandes, les remettre au livreur, répondre aux litiges et inspecter les retours.")}
              </span>
            </div>
            <div className="mt14">
              <Link to="/commandes?role=prep" className="btn primary">
                <Icone nom="package" taille={18} />
                <span>
                  {t("Voir les commandes à préparer")}
                </span>
              </Link>
            </div>
          </div>
        </Ecran>
      )
  }
}

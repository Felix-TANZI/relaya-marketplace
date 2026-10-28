// Page provisoire « Le simulateur » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Plans() {
  const { t } = usePreferences()
  switch (useEtat("plans")) {
    default:
      return (
        <Ecran route="plans" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Le simulateur")}
            </h1>
            <p className="pg-s">
              {t("Ce que vous garderiez ce mois-ci avec chaque plan.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/plans_liste" className="">
              {t("Les plans")}
            </Link>
            <Link to="/plans" className="on">
              {t("Simulateur")}
            </Link>
          </div>
          <div className="hero night">
            <div className="otop">
              <span className="hk">
                {t("Vos ventes du mois")}
              </span>
              <span className="pill dk sm" style={{ "fontSize": "12px" }}>
                {t("Téléphones · Bronze")}
              </span>
            </div>
            <div className="big">
              {t("60\u00A0000")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div style={{ "position": "relative", "height": "28px", "marginTop": "10px" }}>
              <div style={{ "position": "absolute", "top": "12px", "left": "0", "right": "0", "height": "5px", "borderRadius": "3px", "background": "rgba(255,255,255,.18)" }}></div>
              <div style={{ "position": "absolute", "top": "12px", "left": "0", "width": "6%", "height": "5px", "borderRadius": "3px", "background": "var(--gold-l)" }}></div>
              <div style={{ "position": "absolute", "top": "4px", "left": "calc(6% - 11px)", "width": "22px", "height": "22px", "borderRadius": "50%", "background": "#fff", "boxShadow": "0 2px 8px rgba(0,0,0,.4)" }}></div>
            </div>
            <div className="row t12" style={{ "color": "rgba(255,255,255,.7)" }}>
              <span className="grow">
                {t("0")}
              </span>
              <span>
                {t("1\u00A0000\u00A0000\u00A0F")}
              </span>
            </div>
          </div>
          <div className="kick" style={{ "fontSize": "12px", "margin": "18px 4px 8px" }}>
            {t("Vous gardez")}
          </div>
          <div className="split3">
            <div className="mini" style={{ "boxShadow": "0 0 0 2px var(--green)", "padding": "12px 6px" }}>
              <div className="mk" style={{ "fontSize": "12px" }}>
                {t("Free")}
              </div>
              <div className="mv cg" style={{ "fontSize": "16px" }}>
                {t("53\u00A0520\u00A0F")}
              </div>
              <div className="t12 c3 mt4" style={{ "lineHeight": "1.3" }}>
                {t("Garde le plus")}
              </div>
            </div>
            <div className="mini" style={{ "padding": "12px 6px" }}>
              <div className="mk" style={{ "fontSize": "12px" }}>
                {t("Boost")}
              </div>
              <div className="mv " style={{ "fontSize": "16px" }}>
                {t("51\u00A0344\u00A0F")}
              </div>
              <div className="t12 c3 mt4" style={{ "lineHeight": "1.3" }}>
                {t("Vaut pour ses 2 mises en avant")}
              </div>
            </div>
            <div className="mini" style={{ "padding": "12px 6px" }}>
              <div className="mk" style={{ "fontSize": "12px" }}>
                {t("Pro")}
              </div>
              <div className="mv " style={{ "fontSize": "16px" }}>
                {t("46\u00A0668\u00A0F")}
              </div>
              <div className="t12 c3 mt4" style={{ "lineHeight": "1.3" }}>
                {t("Pas encore remboursé")}
              </div>
            </div>
          </div>
          <div className="note green">
            <Icone nom="badge-check" taille={18} />
            <div>
              <b>
                {t("Ce mois-ci, Free vous fait garder le plus.")}
              </b>
              {t(" Le simulateur vous le dit, même quand un plan ne vaut pas le coup.")}
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Quand un plan est remboursé")}
            </h3>
            <p className="t13 c3" style={{ "margin": "6px 0 6px", "lineHeight": "1.45" }}>
              {t("Au-delà de ces ventes, ce qu’il vous fait garder en plus paie tout son prix.")}
            </p>
            <div className="kv">
              <span className="k">
                {t("Boost")}
              </span>
              <span className="v ">
                {t("dès 463\u00A0000\u00A0F de ventes")}
              </span>
            </div>
            <div className="kv">
              <span className="k">
                {t("Pro")}
              </span>
              <span className="v ">
                {t("dès 694\u00A0000\u00A0F de ventes")}
              </span>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="list" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir le détail")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <table className="tbl">
                  <tbody>
                    <tr>
                      <th style={{ "fontSize": "12px" }}>
                        {t("Ventes")}
                      </th>
                      <th className="r" style={{ "fontSize": "12px" }}>
                        {t("Free")}
                      </th>
                      <th className="r" style={{ "fontSize": "12px" }}>
                        {t("Boost")}
                      </th>
                      <th className="r" style={{ "fontSize": "12px" }}>
                        {t("Pro")}
                      </th>
                    </tr>
                    <tr>
                      <td className="b7">
                        {t("60\u00A0000\u00A0F")}
                      </td>
                      <td className="r b8 cg">
                        {t("53\u00A0520")}
                      </td>
                      <td className="r">
                        {t("51\u00A0344")}
                      </td>
                      <td className="r">
                        {t("46\u00A0668")}
                      </td>
                    </tr>
                    <tr>
                      <td className="b7">
                        {t("500\u00A0000\u00A0F")}
                      </td>
                      <td className="r">
                        {t("446\u00A0000")}
                      </td>
                      <td className="r b8 cg">
                        {t("446\u00A0000")}
                      </td>
                      <td className="r">
                        {t("443\u00A0900")}
                      </td>
                    </tr>
                    <tr>
                      <td className="b7">
                        {t("700\u00A0000\u00A0F")}
                      </td>
                      <td className="r">
                        {t("624\u00A0400")}
                      </td>
                      <td className="r">
                        {t("624\u00A0400")}
                      </td>
                      <td className="r b8 cg">
                        {t("624\u00A0400")}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt8">
                  {t("À 500\u00A0000\u00A0F, Boost est remboursé\u00A0: ses mises en avant sont gratuites. À 700\u00A0000\u00A0F, les deux plans le sont.")}
                </p>
                <p>
                  {t("Calcul pour les téléphones, palier Bronze, offre de découverte comprise.")}
                </p>
              </div>
            </details>
          </div>
          <div className="mt16">
            <Link to="/visibilite" className="btn primary">
              <Icone nom="check" taille={18} />
              <span>
                {t("Rester en Free")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}

// Page provisoire « Mes gains » (VD-09) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Gains() {
  const { t } = usePreferences()
  switch (useEtat("gains")) {
    default:
      return (
        <Ecran route="gains" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Mes gains")}
            </h1>
            <p className="pg-s">
              {t("Ce que vous avez gardé, vente par vente.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/argent" style={{ "height": "44px" }} className="">
              {t("Résumé")}
            </Link>
            <Link to="/se_libere" style={{ "height": "44px" }} className="">
              {t("Se libère")}
            </Link>
            <Link to="/gele" style={{ "height": "44px" }} className="">
              {t("Gelé")}
            </Link>
            <Link to="/gains" style={{ "height": "44px" }} className="on">
              {t("Mes gains")}
            </Link>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("Septembre · vous avez gardé")}
            </div>
            <div className="big">
              {t("53\u00A0520")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("sur 60\u00A0000\u00A0F de ventes libérées ce mois-ci.")}
            </div>
            <div className="hline"></div>
            <div className="row" style={{ "alignItems": "flex-end" }}>
              <div className="grow">
                <div className="t12 b8" style={{ "letterSpacing": ".06em", "textTransform": "uppercase", "color": "rgba(255,255,255,.74)" }}>
                  {t("Gagné avec BelivaY")}
                </div>
                <div className="b8 t17 mt4">
                  {t("53\u00A0520\u00A0F")}
                </div>
                <div className="t12 mt4" style={{ "color": "rgba(255,255,255,.74)" }}>
                  {t("depuis votre inscription")}
                </div>
              </div>
              <div className="right">
                <div className="t12 b8" style={{ "letterSpacing": ".06em", "textTransform": "uppercase", "color": "rgba(255,255,255,.74)" }}>
                  {t("Ce soir à 18\u00A0h")}
                </div>
                <div className="b8 t17 mt4" style={{ "color": "var(--gold-l)" }}>
                  {t("71\u00A0360\u00A0F")}
                </div>
                <div className="t12 mt4" style={{ "color": "rgba(255,255,255,.74)" }}>
                  {t("avec BLV-00007")}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="otop">
              <h3>
                {t("Par vente")}
              </h3>
              <span className="t12 b8 c3">
                {t("Vous gardez")}
              </span>
            </div>
            <div className="mt6">
              <div className="li">
                <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                  <Dessin id="8ba395f7ffc2" />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("BLV-00003 · ITEL AC52")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Vendu 20\u00A0000\u00A0F · libéré le 12 oct.")}
                  </span>
                </span>
                <span className="b8 t15 cg nw">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="li">
                <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                  <Dessin id="8ba395f7ffc2" />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("BLV-00002 · ITEL AC52")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Vendu 20\u00A0000\u00A0F · libéré le 8 oct.")}
                  </span>
                </span>
                <span className="b8 t15 cg nw">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="li">
                <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                  <Dessin id="8ba395f7ffc2" />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("BLV-00001 · ITEL AC52")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Vendu 20\u00A0000\u00A0F · libéré le 24 sept.")}
                  </span>
                </span>
                <span className="b8 t15 cg nw">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Par produit")}
            </h3>
            <div className="hbar mt8">
              <span className="hl">
                {t("ITEL AC52 × 3")}
              </span>
              <span className="hb">
                <i style={{ "width": "100%" }}></i>
              </span>
              <span className="hv" style={{ "width": "78px" }}>
                {t("53\u00A0520\u00A0F")}
              </span>
            </div>
            <p className="t13 c3" style={{ "margin": "6px 0 0" }}>
              {t("Votre produit qui rapporte le plus ce mois.")}
            </p>
          </div>
          <div className="card">
            <div className="otop">
              <h3>
                {t("Versé et à verser")}
              </h3>
              <Link to="/versements" className="row t13 b8 cor" style={{ "gap": "2px", "minHeight": "44px" }}>
                {t("Versements")}
                <Icone nom="chevron-right" taille={16} />
              </Link>
            </div>
            <div className="kv">
              <span className="k">
                {t("Déjà versés · 0\u00A0F de frais")}
              </span>
              <span className="v ">
                {t("35\u00A0680\u00A0F")}
              </span>
            </div>
            <div className="kv">
              <span className="k">
                {t("À verser samedi 17 oct.")}
              </span>
              <span className="v ">
                {t("17\u00A0840\u00A0F")}
              </span>
            </div>
          </div>
          <div className="split2 mt12">
            <div className="tile">
              <div className="tk" style={{ "fontSize": "12px" }}>
                {t("Impayés")}
              </div>
              <div className="tv cg">
                {t("0")}
                <small>
                  {t("F")}
                </small>
              </div>
              <div className="ts">
                {t("Toutes vos ventes payées d’avance")}
              </div>
            </div>
            <div className="tile">
              <div className="tk" style={{ "fontSize": "12px" }}>
                {t("Transport")}
              </div>
              <div className="tv cg">
                {t("0")}
                <small>
                  {t("F")}
                </small>
              </div>
              <div className="ts">
                {t("Livraison gérée\u00A0: 0 déplacement")}
              </div>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                {t("Une vente apparaît ici quand son argent se libère. Une vente gelée, remboursée ou pas encore livrée n’y est pas encore.")}
              </p>
              <p>
                {t("Une seule ligne peut être négative\u00A0: la ")}
                <b>
                  {t("reprise")}
                </b>
                {t(". C’est quand un défaut caché est jugé contre vous après la libération. Elle est datée, avec son motif.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}

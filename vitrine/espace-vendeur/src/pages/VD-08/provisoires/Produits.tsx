// Page provisoire « Mes produits » (VD-08) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (3 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Produits() {
  const { t } = usePreferences()
  switch (useEtat("produits")) {
    case "produits?role=prep":
    case "produits?pop=profil":
    default:
      return (
        <Ecran route="produits" parEtat>
          <div className="row" style={{ "alignItems": "flex-start" }}>
            <div className="grow">
              <div className="pg">
                <h1 className="pg-t">
                  {t("Mes produits")}
                </h1>
                <p className="pg-s">
                  {t("3 produits · 2 en vente · 1 en vérification")}
                </p>
              </div>
            </div>
            <button type="button" className="ibtn" aria-label="Importer, exporter" style={{ "marginTop": "12px", "width": "44px", "height": "44px", "background": "var(--card)", "boxShadow": "var(--shadow-card)" }}>
              <Icone nom="ellipsis-vertical" taille={20} />
            </button>
          </div>
          <div className="mt12">
            <Link to="/offre1" className="btn primary">
              <Icone nom="plus" taille={18} />
              <span>
                {t("Nouvelle offre")}
              </span>
            </Link>
          </div>
          <div className="divider-t">
            {t("Le plus urgent en haut")}
          </div>
          <div className="card ord green">
            <Link to="/offre_detail" className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <span className="grow">
                <span className="an" style={{ "display": "block", "fontSize": "16px" }}>
                  {t("ITEL AC52 · noir")}
                </span>
                <span className="av" style={{ "display": "block" }}>
                  {t("Téléphones · neuf · colis S")}
                </span>
                <span className="meta" style={{ "marginTop": "6px" }}>
                  <span className="pill green sm">
                    <i className="d"></i>
                    {t("En vente")}
                  </span>
                </span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0", "marginTop": "2px" }} />
            </Link>
            <div className="row mt12" style={{ "padding": "10px 12px", "gap": "8px", "borderRadius": "12px", "background": "var(--sand-2)", "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="t12 c3">
                  {t("Prix")}
                </div>
                <div className="b8 t15 mt4 ">
                  {t("20\u00A0000\u00A0F")}
                </div>
              </div>
              <div className="grow">
                <div className="t12 cg b7">
                  {t("Vous gardez")}
                </div>
                <div className="b8 t15 mt4 cg">
                  {t("17\u00A0840\u00A0F")}
                </div>
              </div>
              <div className="grow right">
                <div className="t12 c3">
                  {t("Stock")}
                </div>
                <div className="b8 t15 mt4 cr">
                  {t("3")}
                </div>
              </div>
            </div>
            <Link to="/offre3" className="row mt8" style={{ "minHeight": "44px", "padding": "8px 12px", "gap": "10px", "borderRadius": "12px", "background": "var(--red-soft)", "border": "1px solid var(--red-line)" }}>
              <Icone nom="package" taille={18} style={{ "color": "var(--red)", "flexShrink": "0" }} />
              <span className="grow t13" style={{ "lineHeight": "1.35" }}>
                <b style={{ "display": "block", "color": "var(--red)" }}>
                  {t("Stock bas")}
                </b>
                <span className="c2" style={{ "display": "block", "fontSize": "12.5px", "marginTop": "1px" }}>
                  {t("Seuil réglé à 5")}
                </span>
              </span>
              <span className="row t13 b8 nw" style={{ "gap": "2px", "color": "var(--red)" }}>
                {t("Réapprovisionner")}
                <Icone nom="chevron-right" taille={16} />
              </span>
            </Link>
            <Link to="/offre3" className="row mt8" style={{ "minHeight": "44px", "padding": "8px 12px", "gap": "10px", "borderRadius": "12px", "background": "var(--or-soft)", "border": "1px solid var(--or-line)" }}>
              <Icone nom="trending-up" taille={18} style={{ "color": "var(--or-deep)", "flexShrink": "0" }} />
              <span className="grow t13" style={{ "lineHeight": "1.35" }}>
                <b style={{ "display": "block", "color": "var(--or-deep)" }}>
                  {t("Un vendeur est passé à 19\u00A0000\u00A0F")}
                </b>
              </span>
              <span className="row t13 b8 nw" style={{ "gap": "2px", "color": "var(--or-deep)" }}>
                {t("Ajuster")}
                <Icone nom="chevron-right" taille={16} />
              </span>
            </Link>
            <div className="row mt4" style={{ "gap": "8px", "marginBottom": "-8px" }}>
              <span className="grow t13 c3">
                {t("Ce mois\u00A0: 3 ventes · ")}
                <b className="cg">
                  {t("53\u00A0520\u00A0F gardés")}
                </b>
              </span>
              <Link to="/dupliquer" className="row t13 b8 cor nw" style={{ "gap": "5px", "minHeight": "44px" }}>
                <Icone nom="copy" taille={15} />
                {t("Dupliquer")}
              </Link>
            </div>
          </div>
          <div className="card ord amber">
            <Link to="/offre_detail?v=verif" className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <span className="grow">
                <span className="an" style={{ "display": "block", "fontSize": "16px" }}>
                  {t("ITEL AC52 · bleu")}
                </span>
                <span className="av" style={{ "display": "block" }}>
                  {t("Téléphones · neuf · dupliqué du noir")}
                </span>
                <span className="meta" style={{ "marginTop": "6px" }}>
                  <span className="pill amber sm">
                    <Icone nom="hourglass" taille={13} />
                    {t("En vérification")}
                  </span>
                </span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0", "marginTop": "2px" }} />
            </Link>
            <div className="row mt12" style={{ "padding": "10px 12px", "gap": "8px", "borderRadius": "12px", "background": "var(--sand-2)", "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="t12 c3">
                  {t("Prix")}
                </div>
                <div className="b8 t15 mt4 ">
                  {t("20\u00A0000\u00A0F")}
                </div>
              </div>
              <div className="grow">
                <div className="t12 cg b7">
                  {t("Vous gardez")}
                </div>
                <div className="b8 t15 mt4 cg">
                  {t("17\u00A0840\u00A0F")}
                </div>
              </div>
              <div className="grow right">
                <div className="t12 c3">
                  {t("Stock")}
                </div>
                <div className="b8 t15 mt4 ">
                  {t("5")}
                </div>
              </div>
            </div>
            <div className="row mt8" style={{ "minHeight": "44px", "padding": "8px 12px", "gap": "10px", "borderRadius": "12px", "background": "var(--amber-soft)", "border": "1px solid var(--amber-line)" }}>
              <Icone nom="calendar-clock" taille={18} style={{ "color": "var(--amber)", "flexShrink": "0" }} />
              <span className="grow t13" style={{ "lineHeight": "1.35" }}>
                <b style={{ "display": "block", "color": "var(--amber)" }}>
                  {t("Réponse avant mer. 14 oct. à 16\u00A0h\u00A010")}
                </b>
                <span className="c2" style={{ "display": "block", "fontSize": "12.5px", "marginTop": "1px" }}>
                  {t("Envoyée lun. 12 oct. à 16\u00A0h\u00A010 · pas encore visible des clients")}
                </span>
              </span>
            </div>
            <div className="row mt4" style={{ "gap": "8px", "marginBottom": "-8px" }}>
              <span className="grow t13 c3"></span>
              <Link to="/dupliquer" className="row t13 b8 cor nw" style={{ "gap": "5px", "minHeight": "44px" }}>
                <Icone nom="copy" taille={15} />
                {t("Dupliquer")}
              </Link>
            </div>
          </div>
          <div className="card ord green">
            <Link to="/offre_detail?p=iphone" className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="802e49afebed" />
              </span>
              <span className="grow">
                <span className="an" style={{ "display": "block", "fontSize": "16px" }}>
                  {t("iPhone 15 Pro Max · 256 Go")}
                </span>
                <span className="av" style={{ "display": "block" }}>
                  {t("Téléphones · neuf · colis S")}
                </span>
                <span className="meta" style={{ "marginTop": "6px" }}>
                  <span className="pill green sm">
                    <i className="d"></i>
                    {t("En vente")}
                  </span>
                </span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0", "marginTop": "2px" }} />
            </Link>
            <div className="row mt12" style={{ "padding": "10px 12px", "gap": "8px", "borderRadius": "12px", "background": "var(--sand-2)", "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="t12 c3">
                  {t("Prix")}
                </div>
                <div className="b8 t15 mt4 ">
                  {t("350\u00A0000\u00A0F")}
                </div>
              </div>
              <div className="grow">
                <div className="t12 cg b7">
                  {t("Vous gardez")}
                </div>
                <div className="b8 t15 mt4 cg">
                  {t("335\u00A0324\u00A0F")}
                </div>
              </div>
              <div className="grow right">
                <div className="t12 c3">
                  {t("Stock")}
                </div>
                <div className="b8 t15 mt4 ">
                  {t("1")}
                </div>
              </div>
            </div>
            <Link to="/litiges" className="row mt8" style={{ "minHeight": "44px", "padding": "8px 12px", "gap": "10px", "borderRadius": "12px", "background": "var(--red-soft)", "border": "1px solid var(--red-line)" }}>
              <Icone nom="scale" taille={18} style={{ "color": "var(--red)", "flexShrink": "0" }} />
              <span className="grow t13" style={{ "lineHeight": "1.35" }}>
                <b style={{ "display": "block", "color": "var(--red)" }}>
                  {t("Ce mois\u00A0: 2 ventes en litige")}
                </b>
                <span className="c2" style={{ "display": "block", "fontSize": "12.5px", "marginTop": "1px" }}>
                  {t("670\u00A0648\u00A0F gelés, pas encore gardés")}
                </span>
              </span>
              <span className="row t13 b8 nw" style={{ "gap": "2px", "color": "var(--red)" }}>
                {t("Voir")}
                <Icone nom="chevron-right" taille={16} />
              </span>
            </Link>
            <div className="row mt4" style={{ "gap": "8px", "marginBottom": "-8px" }}>
              <span className="grow t13 c3"></span>
              <Link to="/dupliquer" className="row t13 b8 cor nw" style={{ "gap": "5px", "minHeight": "44px" }}>
                <Icone nom="copy" taille={15} />
                {t("Dupliquer")}
              </Link>
            </div>
          </div>
        </Ecran>
      )
  }
}

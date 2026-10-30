// Page provisoire « Nouvelle offre — le produit » (VD-08) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (5 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Offre1() {
  const { t } = usePreferences()
  switch (useEtat("offre1")) {
    default:
      return (
        <Ecran route="offre1" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Étape 1 sur 4")}
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className=""></i>
            <i className=""></i>
            <i className=""></i>
          </div>
          <div className="row" style={{ "gap": "6px", "marginTop": "6px" }}>
            <span className="grow t12 b8 cor">
              {t("Produit")}
            </span>
            <span className="grow t12 c3">
              {t("Photos")}
            </span>
            <span className="grow t12 c3">
              {t("Prix")}
            </span>
            <span className="grow t12 c3">
              {t("Publier")}
            </span>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "14px" }}>
            {t("Quel produit vendez-vous\u00A0?")}
          </h1>
          <p className="pg-s">
            {t("Cherchez-le d’abord\u00A0: s’il est déjà au catalogue, un geste suffit.")}
          </p>
          <div className="fld">
            <div className="inp focus">
              <Icone nom="search" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow">
                {t("itel ac52")}
              </span>
              <span className="suf">
                <Icone nom="x" taille={16} />
              </span>
            </div>
          </div>
          <div className="split3 mt10">
            <Link to="/camera?mode=scan" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="scan-barcode" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Code-barres")}
              </span>
            </Link>
            <Link to="/camera?mode=photo" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="camera" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Photo")}
              </span>
            </Link>
            <Link to="/offre1" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="mic" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Dicter")}
              </span>
            </Link>
          </div>
          <Link to="/dupliquer" className="card flat" style={{ "display": "flex", "alignItems": "center", "gap": "12px", "padding": "12px 14px" }}>
            <Icone nom="copy" taille={20} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
            <span className="grow">
              <span className="b8 t14" style={{ "display": "block" }}>
                {t("Partir d’un de mes produits")}
              </span>
              <span className="t12 c3">
                {t("Même article, autre couleur ou autre taille")}
              </span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
          </Link>
          <div className="divider-t">
            {t("3 produits trouvés")}
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir, bleu, vert")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 19\u00A0000 – 20\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 89\u00A0% à 20\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52 · 64 Go")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 23\u00A0000 – 24\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 90\u00A0% à 24\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="9c7844db694a" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("Coque ITEL AC52 · silicone")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir, transparent")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 1\u00A0500 – 2\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 65\u00A0% à 2\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <Link to="/fiche" className="row" style={{ "justifyContent": "center", "gap": "4px", "minHeight": "44px", "marginTop": "10px", "color": "var(--or-txt)" }}>
            <span className="t14 b8">
              {t("Aucun de ces produits")}
            </span>
            <Icone nom="chevron-right" taille={16} />
          </Link>
          <p className="t12 c3 center" style={{ "margin": "0" }}>
            {t("BelivaY l’ajoutera au catalogue pour vous.")}
          </p>
        </Ecran>
      )
    case "offre1?q=chargeur":
      return (
        <Ecran route="offre1" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Étape 1 sur 4")}
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className=""></i>
            <i className=""></i>
            <i className=""></i>
          </div>
          <div className="row" style={{ "gap": "6px", "marginTop": "6px" }}>
            <span className="grow t12 b8 cor">
              {t("Produit")}
            </span>
            <span className="grow t12 c3">
              {t("Photos")}
            </span>
            <span className="grow t12 c3">
              {t("Prix")}
            </span>
            <span className="grow t12 c3">
              {t("Publier")}
            </span>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "14px" }}>
            {t("Quel produit vendez-vous\u00A0?")}
          </h1>
          <p className="pg-s">
            {t("Cherchez-le d’abord\u00A0: s’il est déjà au catalogue, un geste suffit.")}
          </p>
          <div className="fld">
            <div className="inp focus">
              <Icone nom="search" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow">
                {t("chargeur")}
              </span>
              <span className="suf">
                <Icone nom="x" taille={16} />
              </span>
            </div>
          </div>
          <div className="split3 mt10">
            <Link to="/camera?mode=scan" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="scan-barcode" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Code-barres")}
              </span>
            </Link>
            <Link to="/camera?mode=photo" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="camera" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Photo")}
              </span>
            </Link>
            <Link to="/offre1" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="mic" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Dicter")}
              </span>
            </Link>
          </div>
          <Link to="/dupliquer" className="card flat" style={{ "display": "flex", "alignItems": "center", "gap": "12px", "padding": "12px 14px" }}>
            <Icone nom="copy" taille={20} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
            <span className="grow">
              <span className="b8 t14" style={{ "display": "block" }}>
                {t("Partir d’un de mes produits")}
              </span>
              <span className="t12 c3">
                {t("Même article, autre couleur ou autre taille")}
              </span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
          </Link>
          <div className="divider-t">
            {t("Pas de résultat exact · produits proches")}
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="69a52217ca4e" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("Chargeur rapide 18 W · USB-C")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · blanc")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 3\u00A0500 – 4\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 83\u00A0% à 4\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="4c684b384c4c" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("Écouteurs filaires · jack 3,5 mm")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir, blanc")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 2\u00A0000 – 3\u00A0000\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 72\u00A0% à 2\u00A0500\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card" style={{ "border": "1.5px dashed var(--or-line)", "boxShadow": "none", "background": "var(--or-soft)" }}>
            <div className="b8 t15">
              {t("Aucun de ces produits\u00A0?")}
            </div>
            <div className="t13 c2 mt6" style={{ "lineHeight": "1.45" }}>
              {t("«\u00A0chargeur itel\u00A0»\u00A0: cherché 14 fois près de chez vous, sans résultat. BelivaY peut l’ajouter au catalogue.")}
            </div>
            <div className="mt12">
              <Link to="/fiche" className="btn primary">
                <Icone nom="file-pen" taille={18} />
                <span>
                  {t("Demander une fiche")}
                </span>
              </Link>
            </div>
          </div>
        </Ecran>
      )
    case "offre1?q=chargeur+itel":
      return (
        <Ecran route="offre1" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Étape 1 sur 4")}
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className=""></i>
            <i className=""></i>
            <i className=""></i>
          </div>
          <div className="row" style={{ "gap": "6px", "marginTop": "6px" }}>
            <span className="grow t12 b8 cor">
              {t("Produit")}
            </span>
            <span className="grow t12 c3">
              {t("Photos")}
            </span>
            <span className="grow t12 c3">
              {t("Prix")}
            </span>
            <span className="grow t12 c3">
              {t("Publier")}
            </span>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "14px" }}>
            {t("Quel produit vendez-vous\u00A0?")}
          </h1>
          <p className="pg-s">
            {t("Cherchez-le d’abord\u00A0: s’il est déjà au catalogue, un geste suffit.")}
          </p>
          <div className="fld">
            <div className="inp focus">
              <Icone nom="search" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow">
                {t("chargeur itel")}
              </span>
              <span className="suf">
                <Icone nom="x" taille={16} />
              </span>
            </div>
          </div>
          <div className="split3 mt10">
            <Link to="/camera?mode=scan" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="scan-barcode" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Code-barres")}
              </span>
            </Link>
            <Link to="/camera?mode=photo" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="camera" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Photo")}
              </span>
            </Link>
            <Link to="/offre1" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="mic" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Dicter")}
              </span>
            </Link>
          </div>
          <Link to="/dupliquer" className="card flat" style={{ "display": "flex", "alignItems": "center", "gap": "12px", "padding": "12px 14px" }}>
            <Icone nom="copy" taille={20} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
            <span className="grow">
              <span className="b8 t14" style={{ "display": "block" }}>
                {t("Partir d’un de mes produits")}
              </span>
              <span className="t12 c3">
                {t("Même article, autre couleur ou autre taille")}
              </span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
          </Link>
          <div className="divider-t">
            {t("Pas de résultat exact · produits proches")}
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="69a52217ca4e" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("Chargeur rapide 18 W · USB-C")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · blanc")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 3\u00A0500 – 4\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 83\u00A0% à 4\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="4c684b384c4c" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("Écouteurs filaires · jack 3,5 mm")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir, blanc")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 2\u00A0000 – 3\u00A0000\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 72\u00A0% à 2\u00A0500\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card" style={{ "border": "1.5px dashed var(--or-line)", "boxShadow": "none", "background": "var(--or-soft)" }}>
            <div className="b8 t15">
              {t("Aucun de ces produits\u00A0?")}
            </div>
            <div className="t13 c2 mt6" style={{ "lineHeight": "1.45" }}>
              {t("«\u00A0chargeur itel\u00A0»\u00A0: cherché 14 fois près de chez vous, sans résultat. BelivaY peut l’ajouter au catalogue.")}
            </div>
            <div className="mt12">
              <Link to="/fiche" className="btn primary">
                <Icone nom="file-pen" taille={18} />
                <span>
                  {t("Demander une fiche")}
                </span>
              </Link>
            </div>
          </div>
        </Ecran>
      )
    case "offre1?q=coque+iphone+15":
      return (
        <Ecran route="offre1" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Étape 1 sur 4")}
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className=""></i>
            <i className=""></i>
            <i className=""></i>
          </div>
          <div className="row" style={{ "gap": "6px", "marginTop": "6px" }}>
            <span className="grow t12 b8 cor">
              {t("Produit")}
            </span>
            <span className="grow t12 c3">
              {t("Photos")}
            </span>
            <span className="grow t12 c3">
              {t("Prix")}
            </span>
            <span className="grow t12 c3">
              {t("Publier")}
            </span>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "14px" }}>
            {t("Quel produit vendez-vous\u00A0?")}
          </h1>
          <p className="pg-s">
            {t("Cherchez-le d’abord\u00A0: s’il est déjà au catalogue, un geste suffit.")}
          </p>
          <div className="fld">
            <div className="inp focus">
              <Icone nom="search" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow">
                {t("coque iphone 15")}
              </span>
              <span className="suf">
                <Icone nom="x" taille={16} />
              </span>
            </div>
          </div>
          <div className="split3 mt10">
            <Link to="/camera?mode=scan" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="scan-barcode" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Code-barres")}
              </span>
            </Link>
            <Link to="/camera?mode=photo" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="camera" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Photo")}
              </span>
            </Link>
            <Link to="/offre1" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="mic" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Dicter")}
              </span>
            </Link>
          </div>
          <Link to="/dupliquer" className="card flat" style={{ "display": "flex", "alignItems": "center", "gap": "12px", "padding": "12px 14px" }}>
            <Icone nom="copy" taille={20} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
            <span className="grow">
              <span className="b8 t14" style={{ "display": "block" }}>
                {t("Partir d’un de mes produits")}
              </span>
              <span className="t12 c3">
                {t("Même article, autre couleur ou autre taille")}
              </span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
          </Link>
          <div className="divider-t">
            {t("3 produits trouvés")}
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir, bleu, vert")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 19\u00A0000 – 20\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 89\u00A0% à 20\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52 · 64 Go")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 23\u00A0000 – 24\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 90\u00A0% à 24\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="9c7844db694a" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("Coque ITEL AC52 · silicone")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir, transparent")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 1\u00A0500 – 2\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 65\u00A0% à 2\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <Link to="/fiche" className="row" style={{ "justifyContent": "center", "gap": "4px", "minHeight": "44px", "marginTop": "10px", "color": "var(--or-txt)" }}>
            <span className="t14 b8">
              {t("Aucun de ces produits")}
            </span>
            <Icone nom="chevron-right" taille={16} />
          </Link>
          <p className="t12 c3 center" style={{ "margin": "0" }}>
            {t("BelivaY l’ajoutera au catalogue pour vous.")}
          </p>
        </Ecran>
      )
    case "offre1?q=%C3%A9couteurs+sans+fil":
      return (
        <Ecran route="offre1" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Étape 1 sur 4")}
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className=""></i>
            <i className=""></i>
            <i className=""></i>
          </div>
          <div className="row" style={{ "gap": "6px", "marginTop": "6px" }}>
            <span className="grow t12 b8 cor">
              {t("Produit")}
            </span>
            <span className="grow t12 c3">
              {t("Photos")}
            </span>
            <span className="grow t12 c3">
              {t("Prix")}
            </span>
            <span className="grow t12 c3">
              {t("Publier")}
            </span>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "14px" }}>
            {t("Quel produit vendez-vous\u00A0?")}
          </h1>
          <p className="pg-s">
            {t("Cherchez-le d’abord\u00A0: s’il est déjà au catalogue, un geste suffit.")}
          </p>
          <div className="fld">
            <div className="inp focus">
              <Icone nom="search" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow">
                {t("écouteurs sans fil")}
              </span>
              <span className="suf">
                <Icone nom="x" taille={16} />
              </span>
            </div>
          </div>
          <div className="split3 mt10">
            <Link to="/camera?mode=scan" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="scan-barcode" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Code-barres")}
              </span>
            </Link>
            <Link to="/camera?mode=photo" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="camera" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Photo")}
              </span>
            </Link>
            <Link to="/offre1" className="mini" style={{ "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "6px", "color": "var(--or-txt)" }}>
              <Icone nom="mic" taille={22} />
              <span className="t13 b8" style={{ "color": "var(--ink)" }}>
                {t("Dicter")}
              </span>
            </Link>
          </div>
          <Link to="/dupliquer" className="card flat" style={{ "display": "flex", "alignItems": "center", "gap": "12px", "padding": "12px 14px" }}>
            <Icone nom="copy" taille={20} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
            <span className="grow">
              <span className="b8 t14" style={{ "display": "block" }}>
                {t("Partir d’un de mes produits")}
              </span>
              <span className="t12 c3">
                {t("Même article, autre couleur ou autre taille")}
              </span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
          </Link>
          <div className="divider-t">
            {t("3 produits trouvés")}
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir, bleu, vert")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 19\u00A0000 – 20\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 89\u00A0% à 20\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52 · 64 Go")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 23\u00A0000 – 24\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 90\u00A0% à 24\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0", "alignItems": "flex-start" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="9c7844db694a" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("Coque ITEL AC52 · silicone")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · noir, transparent")}
                </div>
                <div className="av">
                  {t("Prix du marché\u00A0: 1\u00A0500 – 2\u00A0500\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt10" style={{ "gap": "10px" }}>
              <span className="grow t12 b7 cg nw">
                {t("Vous gardez 65\u00A0% à 2\u00A0000\u00A0F")}
              </span>
              <Link to="/offre2" className="btn soft auto">
                <Icone nom="check" taille={18} />
                <span>
                  {t("C’est celui-là")}
                </span>
              </Link>
            </div>
          </div>
          <Link to="/fiche" className="row" style={{ "justifyContent": "center", "gap": "4px", "minHeight": "44px", "marginTop": "10px", "color": "var(--or-txt)" }}>
            <span className="t14 b8">
              {t("Aucun de ces produits")}
            </span>
            <Icone nom="chevron-right" taille={16} />
          </Link>
          <p className="t12 c3 center" style={{ "margin": "0" }}>
            {t("BelivaY l’ajoutera au catalogue pour vous.")}
          </p>
        </Ecran>
      )
  }
}

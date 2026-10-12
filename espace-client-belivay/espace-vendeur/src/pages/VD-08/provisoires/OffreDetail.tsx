// Page provisoire « Une offre » (VD-08) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (4 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function OffreDetail() {
  const { t } = usePreferences()
  switch (useEtat("offre_detail")) {
    case "offre_detail?role=prep":
    case "offre_detail?p=iphone":
    default:
      return (
        <Ecran route="offre_detail" parEtat>
          <div className="card" style={{ "marginTop": "16px" }}>
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "64px", "height": "64px", "borderRadius": "16px" }}>
                <Dessin id="c90a68b1a1ff" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "19px" }}>
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · neuf")}
                </div>
                <div className="meta" style={{ "marginTop": "6px" }}>
                  <span className="pill green sm">
                    <i className="d"></i>
                    {t("En vente")}
                  </span>
                  <span className="pill ink sm">
                    {t("Vérifiée le 12 mai")}
                  </span>
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row">
              <span className="grow t13 c3">
                {t("Ce mois")}
              </span>
              <span className="t15 b8">
                {t("3 ventes · ")}
                <span className="cg">
                  {t("53\u00A0520\u00A0F gardés")}
                </span>
              </span>
            </div>
          </div>
          <div className="hero night">
            <div className="otop">
              <span className="hk">
                {t("Où les clients vous voient")}
              </span>
              <Icone nom="map-pin" taille={18} style={{ "color": "var(--gold-l)" }} />
            </div>
            <div className="big">
              {t("2 zones")}
              <small>
                {t("sur 6")}
              </small>
            </div>
            <div className="hs">
              {t("Vous passez en premier à ")}
              <b>
                {t("Mvog-Ada")}
              </b>
              {t(" (votre zone) et à ")}
              <b>
                {t("Mvog-Mbi")}
              </b>
              {t(".")}
            </div>
            <div className="t12 mt8" style={{ "color": "rgba(255,255,255,.7)", "lineHeight": "1.45" }}>
              {t("Le client ne choisit pas le vendeur\u00A0: l’offre livrée la moins chère passe en premier.")}
            </div>
            <div className="hline"></div>
            <div className="row" style={{ "alignItems": "flex-start", "gap": "10px" }}>
              <Icone nom="trending-up" taille={18} style={{ "color": "var(--gold-l)", "flexShrink": "0", "marginTop": "2px" }} />
              <div className="t14" style={{ "lineHeight": "1.45" }}>
                {t("Un vendeur est passé à ")}
                <b>
                  {t("19\u00A0000\u00A0F")}
                </b>
                {t(". À ")}
                <b>
                  {t("18\u00A0900\u00A0F")}
                </b>
                {t(", vous passez en premier dans ")}
                <b>
                  {t("5 zones sur 6")}
                </b>
                {t(".")}
              </div>
            </div>
            <div className="mt14">
              <Link to="/offre3" className="btn white">
                <Icone nom="pencil" taille={18} />
                <span>
                  {t("Modifier le prix")}
                </span>
              </Link>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="map-pin" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Voir le détail des 6 zones")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <div className="row" style={{ "padding": "8px 0", "borderTop": "1px solid var(--line)", "gap": "10px" }}>
                <Icone nom="circle-check" taille={18} style={{ "flexShrink": "0", "color": "var(--green)" }} />
                <span className="grow t14 b7">
                  {t("Mvog-Ada · votre zone")}
                </span>
                <span className="t12 cg b7">
                  {t("En premier")}
                </span>
              </div>
              <div className="row" style={{ "padding": "8px 0", "borderTop": "1px solid var(--line)", "gap": "10px" }}>
                <Icone nom="circle-check" taille={18} style={{ "flexShrink": "0", "color": "var(--green)" }} />
                <span className="grow t14 b7">
                  {t("Mvog-Mbi")}
                </span>
                <span className="t12 cg b7">
                  {t("En premier")}
                </span>
              </div>
              <div className="row" style={{ "padding": "8px 0", "borderTop": "1px solid var(--line)", "gap": "10px" }}>
                <Icone nom="circle" taille={18} style={{ "flexShrink": "0", "color": "var(--ink-4)" }} />
                <span className="grow t14 b7">
                  {t("Biyem-Assi")}
                </span>
                <span className="t12 c3">
                  {t("Une offre moins chère passe devant")}
                </span>
              </div>
              <div className="row" style={{ "padding": "8px 0", "borderTop": "1px solid var(--line)", "gap": "10px" }}>
                <Icone nom="circle" taille={18} style={{ "flexShrink": "0", "color": "var(--ink-4)" }} />
                <span className="grow t14 b7">
                  {t("Bastos")}
                </span>
                <span className="t12 c3">
                  {t("Une offre moins chère passe devant")}
                </span>
              </div>
              <div className="row" style={{ "padding": "8px 0", "borderTop": "1px solid var(--line)", "gap": "10px" }}>
                <Icone nom="circle" taille={18} style={{ "flexShrink": "0", "color": "var(--ink-4)" }} />
                <span className="grow t14 b7">
                  {t("Essos")}
                </span>
                <span className="t12 c3">
                  {t("Une offre moins chère passe devant")}
                </span>
              </div>
              <div className="row" style={{ "padding": "8px 0", "borderTop": "1px solid var(--line)", "gap": "10px" }}>
                <Icone nom="circle" taille={18} style={{ "flexShrink": "0", "color": "var(--ink-4)" }} />
                <span className="grow t14 b7">
                  {t("Mendong")}
                </span>
                <span className="t12 c3">
                  {t("Une offre moins chère passe devant")}
                </span>
              </div>
            </div>
          </details>
          <div className="card">
            <div className="otop">
              <h3>
                {t("Votre offre")}
              </h3>
              <Link to="/offre3" className="row t14 b8 cor" style={{ "gap": "5px", "minHeight": "44px" }}>
                <Icone nom="pencil" taille={15} />
                {t("Modifier")}
              </Link>
            </div>
            <div className="hint-l">
              <Icone nom="lock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Titre, description et photos de référence\u00A0: c’est la fiche, rédigée par BelivaY.")}
              </span>
            </div>
            <div className="mt8">
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Vous gardez par vente")}
                </span>
                <span className="v ">
                  <span className="cg">
                    {t("17\u00A0840\u00A0F")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Stock")}
                </span>
                <span className="v ">
                  <span className="cr">
                    {t("3 · seuil d’alerte 5")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("État")}
                </span>
                <span className="v ">
                  {t("Neuf")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Délai de préparation")}
                </span>
                <span className="v ">
                  {t("4\u00A0h ouvrées")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Photos réelles")}
                </span>
                <span className="v ">
                  {t("3 · prises le 12 mai")}
                </span>
              </div>
            </div>
            <div className="row" style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <div className="grow">
                <div className="b8 t14">
                  {t("Accepter le paiement au retrait")}
                </div>
                <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                  {t("Coupé, le client doit payer ce produit d’avance.")}
                </div>
              </div>
              <button type="button" className="tg on" role="switch" aria-checked="true"></button>
            </div>
            <div className="row" style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <div className="grow">
                <div className="b8 t14">
                  {t("Prix automatique")}
                </div>
                <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                  {t("Baisse seulement, 3\u00A0% par semaine au plus, jamais sous votre prix plancher.")}
                </div>
              </div>
              <button type="button" className="tg" role="switch" aria-checked="false"></button>
            </div>
            <Link to="/visibilite" className="row" style={{ "padding": "12px 0 2px", "borderTop": "1px solid var(--line)", "gap": "10px", "minHeight": "44px" }}>
              <span className="grow">
                <span className="b8 t14" style={{ "display": "block", "color": "var(--ink)" }}>
                  {t("Faire une promotion")}
                </span>
                <span className="t12 c3 mt4" style={{ "display": "block", "lineHeight": "1.4" }}>
                  {t("Vente flash\u00A0: remise réelle de 10\u00A0% au moins, prix barré affiché seulement s’il a été pratiqué.")}
                </span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </Link>
          </div>
          <div className="btns" style={{ "marginTop": "14px" }}>
            <Link to="/dupliquer" style={{ "height": "44px" }} className="btn secondary">
              <Icone nom="copy" taille={18} />
              <span>
                {t("Dupliquer")}
              </span>
            </Link>
            <Link to="/produits" style={{ "height": "44px" }} className="btn secondary">
              <Icone nom="pause" taille={18} />
              <span>
                {t("Mettre en pause")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
    case "offre_detail?v=verif":
      return (
        <Ecran route="offre_detail" parEtat>
          <div className="card" style={{ "marginTop": "16px" }}>
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "64px", "height": "64px", "borderRadius": "16px" }}>
                <Dessin id="c90a68b1a1ff" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "19px" }}>
                  {t("ITEL AC52 · bleu")}
                </div>
                <div className="av">
                  {t("Téléphones & accessoires · neuf")}
                </div>
                <div className="meta" style={{ "marginTop": "6px" }}>
                  <span className="pill amber sm">
                    <Icone nom="hourglass" taille={13} />
                    {t("En vérification")}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--amber-line)", "background": "var(--amber-soft)" }}>
            <div className="b8" style={{ "fontSize": "19px", "lineHeight": "1.25" }}>
              {t("Réponse avant mar. 22 sept. à 16\u00A0h\u00A010")}
            </div>
            <div className="t13 c2 mt6" style={{ "lineHeight": "1.45" }}>
              {t("Envoyée dim. 20 sept. à 16\u00A0h\u00A010. Pas encore visible des clients.")}
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("La vérification dure 48\u00A0h au plus. Elle porte sur l’offre, jamais sur vous.")}
                </p>
                <p>
                  {t("Son motif est toujours écrit\u00A0: en cas de refus, vous savez quoi corriger.")}
                </p>
              </div>
            </details>
          </div>
          <div className="card">
            <div className="otop">
              <h3>
                {t("Votre offre")}
              </h3>
              <Link to="/offre3" className="row t14 b8 cor" style={{ "gap": "5px", "minHeight": "44px" }}>
                <Icone nom="pencil" taille={15} />
                {t("Modifier")}
              </Link>
            </div>
            <div className="hint-l">
              <Icone nom="lock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Titre, description et photos de référence\u00A0: c’est la fiche, rédigée par BelivaY.")}
              </span>
            </div>
            <div className="mt8">
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Vous gardez par vente")}
                </span>
                <span className="v ">
                  <span className="cg">
                    {t("17\u00A0840\u00A0F")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Stock")}
                </span>
                <span className="v ">
                  {t("5")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("État")}
                </span>
                <span className="v ">
                  {t("Neuf")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Délai de préparation")}
                </span>
                <span className="v ">
                  {t("4\u00A0h ouvrées")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Photos réelles")}
                </span>
                <span className="v ">
                  {t("3 · prises le 12 mai")}
                </span>
              </div>
            </div>
            <div className="row" style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <div className="grow">
                <div className="b8 t14">
                  {t("Accepter le paiement au retrait")}
                </div>
                <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                  {t("Coupé, le client doit payer ce produit d’avance.")}
                </div>
              </div>
              <button type="button" className="tg on" role="switch" aria-checked="true"></button>
            </div>
            <div className="row" style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <div className="grow">
                <div className="b8 t14">
                  {t("Prix automatique")}
                </div>
                <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                  {t("Baisse seulement, 3\u00A0% par semaine au plus, jamais sous votre prix plancher.")}
                </div>
              </div>
              <button type="button" className="tg" role="switch" aria-checked="false"></button>
            </div>
          </div>
          <div className="btns" style={{ "marginTop": "14px" }}>
            <Link to="/dupliquer" style={{ "height": "44px" }} className="btn secondary">
              <Icone nom="copy" taille={18} />
              <span>
                {t("Dupliquer")}
              </span>
            </Link>
            <Link to="/produits" style={{ "height": "44px" }} className="btn secondary">
              <Icone nom="pause" taille={18} />
              <span>
                {t("Mettre en pause")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}

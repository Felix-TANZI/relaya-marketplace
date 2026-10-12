// Page provisoire « Rupture » (VD-05) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (5 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Rupture() {
  const { t } = usePreferences()
  switch (useEtat("rupture")) {
    case "rupture?ref=BLV-00008":
    case "rupture?ref=BLV-00008&role=prep":
    default:
      return (
        <Ecran route="rupture" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Signaler une rupture")}
            </h1>
            <p className="pg-s">
              {t("Vous n’avez plus l’article\u00A0? Dites-le maintenant\u00A0: signaler tôt coûte peu, se taire coûte cher.")}
            </p>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "48px", "height": "48px", "borderRadius": "12px" }}>
                <Dessin id="39004c36072c" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("BLV-00008 · prête avant 12\u00A0h\u00A042")}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Ce qui va se passer")}
            </h3>
            <div className="mt8">
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "alignItems": "flex-start" }}>
                <Icone nom="repeat" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Un autre vendeur reprend la commande.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="undo-2" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Sinon, le client est remboursé aujourd’hui.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="circle-check" taille={18} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Vous ne payez aucun frais.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="gauge" taille={18} style={{ "color": "var(--amber)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Effet léger sur votre Ponctualité.")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("La part du Trust Score qui compte vos délais tenus.")}
                  </div>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Comment ça marche")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  <b>
                    {t("Le vendeur suivant")}
                  </b>
                  {t(" a un Trust Score de 75 au moins et un prix livré au plus 5\u00A0% plus cher. L’écart est payé par BelivaY, jamais par le client. Sans vendeur suivant, le client est remboursé intégralement, le jour même.")}
                </p>
                <p>
                  <b>
                    {t("Votre Ponctualité.")}
                  </b>
                  {t(" Rupture signalée avant 12\u00A0h\u00A042\u00A0: échec léger. Commande non préparée\u00A0: échec grave et sanction de niveau 2.")}
                </p>
                <p>
                  <b>
                    {t("Commande avec d’autres articles.")}
                  </b>
                  {t(" Elle se dissocie\u00A0: seul votre article change de vendeur. Vous ne voyez pas les autres vendeurs.")}
                </p>
              </div>
            </details>
          </div>
          <div className="card">
            <div className="row">
              <div className="grow">
                <div className="b8 t14">
                  {t("Mettre le stock de l’ITEL AC52 noir à 0")}
                </div>
                <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                  {t("Plus aucune commande sur cette variante jusqu’à votre réapprovisionnement.")}
                </div>
              </div>
              <button type="button" className="tg on" role="switch" aria-checked="true"></button>
            </div>
          </div>
          <div className="mt16">
            <Link to="/commandes" className="btn primary">
              <Icone nom="package-x" taille={18} />
              <span>
                {t("Signaler la rupture")}
              </span>
            </Link>
          </div>
          <div className="mt8">
            <Link to="/commande?ref=BLV-00008" className="btn ghost">
              <span>
                {t("Annuler")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
    case "rupture?ref=BLV-00009":
    case "rupture?ref=BLV-00009&role=prep":
      return (
        <Ecran route="rupture" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Signaler une rupture")}
            </h1>
            <p className="pg-s">
              {t("Vous n’avez plus l’article\u00A0? Dites-le maintenant\u00A0: signaler tôt coûte peu, se taire coûte cher.")}
            </p>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "48px", "height": "48px", "borderRadius": "12px" }}>
                <Dessin id="39004c36072c" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("BLV-00009 · prête avant 12\u00A0h\u00A042")}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Ce qui va se passer")}
            </h3>
            <div className="mt8">
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "alignItems": "flex-start" }}>
                <Icone nom="repeat" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Un autre vendeur reprend la commande.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="undo-2" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Sinon, le client est remboursé aujourd’hui.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="circle-check" taille={18} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Vous ne payez aucun frais.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="gauge" taille={18} style={{ "color": "var(--amber)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Effet léger sur votre Ponctualité.")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("La part du Trust Score qui compte vos délais tenus.")}
                  </div>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Comment ça marche")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  <b>
                    {t("Le vendeur suivant")}
                  </b>
                  {t(" a un Trust Score de 75 au moins et un prix livré au plus 5\u00A0% plus cher. L’écart est payé par BelivaY, jamais par le client. Sans vendeur suivant, le client est remboursé intégralement, le jour même.")}
                </p>
                <p>
                  <b>
                    {t("Votre Ponctualité.")}
                  </b>
                  {t(" Rupture signalée avant 12\u00A0h\u00A042\u00A0: échec léger. Commande non préparée\u00A0: échec grave et sanction de niveau 2.")}
                </p>
                <p>
                  <b>
                    {t("Commande avec d’autres articles.")}
                  </b>
                  {t(" Elle se dissocie\u00A0: seul votre article change de vendeur. Vous ne voyez pas les autres vendeurs.")}
                </p>
              </div>
            </details>
          </div>
          <div className="card">
            <div className="row">
              <div className="grow">
                <div className="b8 t14">
                  {t("Mettre le stock de l’ITEL AC52 noir à 0")}
                </div>
                <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                  {t("Plus aucune commande sur cette variante jusqu’à votre réapprovisionnement.")}
                </div>
              </div>
              <button type="button" className="tg on" role="switch" aria-checked="true"></button>
            </div>
          </div>
          <div className="mt16">
            <Link to="/commandes" className="btn primary">
              <Icone nom="package-x" taille={18} />
              <span>
                {t("Signaler la rupture")}
              </span>
            </Link>
          </div>
          <div className="mt8">
            <Link to="/commande?ref=BLV-00009" className="btn ghost">
              <span>
                {t("Annuler")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}

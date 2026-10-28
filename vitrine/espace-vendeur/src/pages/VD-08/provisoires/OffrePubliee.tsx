// Page provisoire « Offre publiée » (VD-08) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function OffrePubliee() {
  const { t } = usePreferences()
  switch (useEtat("offre_publiee")) {
    default:
      return (
        <Ecran route="offre_publiee" parEtat>
          <div className="center" style={{ "paddingTop": "22px" }}>
            <div style={{ "width": "76px", "height": "76px", "borderRadius": "50%", "margin": "0 auto", "background": "var(--or-soft-2)", "color": "var(--or-txt)", "display": "flex", "alignItems": "center", "justifyContent": "center", "boxShadow": "0 0 0 8px var(--or-soft)" }}>
              <Icone nom="send" taille={34} />
            </div>
            <h1 className="pg-t" style={{ "marginTop": "16px" }}>
              {t("Offre envoyée")}
            </h1>
            <p className="pg-s">
              {t("ITEL AC52 noir à 18\u00A0900\u00A0F.")}
              <br />
              {t("Réponse au plus tard jeu. 15 oct. à 09\u00A0h\u00A048, motif toujours écrit.")}
            </p>
          </div>
          <div className="hero night">
            <div className="otop">
              <span className="hk">
                {t("Meilleur prix")}
              </span>
              <Icone nom="award" taille={20} style={{ "color": "var(--gold-l)" }} />
            </div>
            <div className="b8 mt8" style={{ "fontSize": "22px", "lineHeight": "1.25" }}>
              {t("Votre offre est la moins chère livrée dans 5 zones sur 6")}
            </div>
            <div className="hline"></div>
            <div className="t13" style={{ "color": "rgba(255,255,255,.8)" }}>
              {t("Ce que vous gagnez ce mois\u00A0:")}
            </div>
            <div className="mt4">
              <div className="row" style={{ "padding": "7px 0" }}>
                <Icone nom="badge-check" taille={18} style={{ "flexShrink": "0", "color": "var(--gold-l)" }} />
                <span className="t14 b7">
                  {t("Le badge «\u00A0Meilleur prix\u00A0» sur l’offre")}
                </span>
              </div>
              <div className="row" style={{ "padding": "7px 0" }}>
                <Icone nom="zap" taille={18} style={{ "flexShrink": "0", "color": "var(--gold-l)" }} />
                <span className="t14 b7">
                  {t("Une vente flash offerte")}
                </span>
              </div>
              <div className="row" style={{ "padding": "7px 0" }}>
                <Icone nom="store" taille={18} style={{ "flexShrink": "0", "color": "var(--gold-l)" }} />
                <span className="t14 b7">
                  {t("Une vitrine de quartier offerte")}
                </span>
              </div>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="bell" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                <b>
                  {t("Garder le badge")}
                </b>
                {t("\u00A0: une hausse de plus de 10\u00A0% en 7\u00A0jours fait perdre le badge et les ventes flash.")}
              </p>
              <p>
                <b>
                  {t("Suivi du marché, à la baisse seulement")}
                </b>
                {t("\u00A0: on vous prévient au plus une fois par semaine, et seulement si un vendeur passe moins cher.")}
              </p>
            </div>
          </details>
          <div className="mt16">
            <Link to="/produits" className="btn primary">
              <Icone nom="package" taille={18} />
              <span>
                {t("Voir mes produits")}
              </span>
            </Link>
          </div>
          <div className="mt8">
            <Link to="/dupliquer" style={{ "height": "44px" }} className="btn ghost">
              <Icone nom="copy" taille={18} />
              <span>
                {t("Ajouter une autre couleur")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}

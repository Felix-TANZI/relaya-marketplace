// Page provisoire « Dupliquer un produit » (VD-08) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Dupliquer() {
  const { t } = usePreferences()
  switch (useEtat("dupliquer")) {
    default:
      return (
        <Ecran route="dupliquer" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Dupliquer un produit")}
            </h1>
            <p className="pg-s">
              {t("Même article, autre couleur ou autre taille. Le reste est repris.")}
            </p>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("Depuis\u00A0: ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("20\u00A0000\u00A0F · en vente")}
                </div>
              </div>
            </div>
          </div>
          <div className="divider-t">
            {t("La nouvelle variante")}
          </div>
          <div className="chips">
            <Link to="/dupliquer" className="chip on">
              <Icone nom="check" taille={15} />
              {t("Vert")}
            </Link>
            <Link to="/dupliquer" className="chip">
              <Icone nom="plus" taille={15} />
              {t("Autre…")}
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Déjà créées\u00A0: noir (en vente), bleu (en vérification).")}
            </span>
          </div>
          <div className="note green">
            <Icone nom="link" taille={18} />
            <div>
              {t("Le vert existe déjà au catalogue\u00A0: votre offre y sera rattachée.")}
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Photos réelles du vert ")}
              <span className="req">
                {t("*")}
              </span>
            </label>
            <div className="photos" style={{ "marginTop": "0" }}>
              <Link to="/camera?mode=photo" className="addph">
                <Icone nom="camera" taille={22} />
                <span>
                  {t("Prendre")}
                </span>
              </Link>
              <div className="addph" style={{ "opacity": ".55" }}>
                <Icone nom="image" taille={22} />
                <span>
                  {t("2")}
                </span>
              </div>
              <div className="addph" style={{ "opacity": ".55" }}>
                <Icone nom="image" taille={22} />
                <span>
                  {t("3")}
                </span>
              </div>
            </div>
            <div className="hint">
              {t("Jamais copiées\u00A0: elles montrent l’article vendu.")}
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="copy" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Voir le détail")}
                <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "1px" }}>
                  {t("Ce qui est repris du noir")}
                </span>
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <div>
                <div className="row" style={{ "gap": "10px", "padding": "9px 0" }}>
                  <Icone nom="check" taille={17} trait={2.6} style={{ "color": "var(--green)", "flexShrink": "0" }} />
                  <span className="grow t14" style={{ "color": "var(--ink)" }}>
                    {t("Fiche et photos de référence")}
                  </span>
                </div>
                <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)" }}>
                  <Icone nom="check" taille={17} trait={2.6} style={{ "color": "var(--green)", "flexShrink": "0" }} />
                  <span className="grow t14" style={{ "color": "var(--ink)" }}>
                    {t("Catégorie et gabarit du colis")}
                  </span>
                </div>
                <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)" }}>
                  <Icone nom="check" taille={17} trait={2.6} style={{ "color": "var(--green)", "flexShrink": "0" }} />
                  <span className="grow t14" style={{ "color": "var(--ink)" }}>
                    {t("Poids et dimensions")}
                  </span>
                </div>
                <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)" }}>
                  <Icone nom="check" taille={17} trait={2.6} style={{ "color": "var(--green)", "flexShrink": "0" }} />
                  <span className="grow t14" style={{ "color": "var(--ink)" }}>
                    {t("Délai de préparation et paiement au retrait")}
                  </span>
                </div>
              </div>
              <p className="mt8">
                {t("Restent à saisir\u00A0: la variante, les photos réelles, puis le stock et le prix.")}
              </p>
              <p>
                {t("La copie passe toujours par la recherche\u00A0: si la variante existe déjà, votre offre y est rattachée.")}
              </p>
            </div>
          </details>
          <div className="mt16">
            <Link to="/offre3" className="btn primary">
              <Icone nom="copy" taille={18} />
              <span>
                {t("Créer le brouillon")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Ensuite\u00A0: votre stock et votre prix, avec le prix conseillé.")}
          </p>
        </Ecran>
      )
  }
}

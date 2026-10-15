// Page provisoire « Arrivée depuis l’espace client » (VD-03) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function BienvenueClient() {
  const { t } = usePreferences()
  switch (useEtat("bienvenue_client")) {
    default:
      return (
        <Ecran route="bienvenue_client" parEtat>
          <div className="row" aria-label="Étape 1 sur 3" style={{ "gap": "8px", "alignItems": "flex-start", "marginTop": "14px" }}>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "linear-gradient(90deg,var(--gold),var(--braise-1))" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--or-txt)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "background": "var(--or-soft)", "border": "1px solid var(--or-line)" }}>
                  {t("1")}
                </span>
                <span className="t13 b8">
                  {t("Ouvrir")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Produits en brouillon")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "var(--sand-3)" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--ink-3)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "border": "1.5px solid var(--line-2)" }}>
                  {t("2")}
                </span>
                <span className="t13 b8">
                  {t("Publier")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Mise en ligne")}
              </div>
            </div>
            <div className="grow">
              <i style={{ "display": "block", "height": "6px", "borderRadius": "999px", "background": "var(--sand-3)" }}></i>
              <div className="row mt8" style={{ "gap": "5px", "color": "var(--ink-3)" }}>
                <span style={{ "width": "18px", "height": "18px", "borderRadius": "50%", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "fontSize": "12px", "fontWeight": "800", "flexShrink": "0", "border": "1.5px solid var(--line-2)" }}>
                  {t("3")}
                </span>
                <span className="t13 b8">
                  {t("Être payé")}
                </span>
              </div>
              <div className="t12 c3" style={{ "marginTop": "2px", "lineHeight": "1.3" }}>
                {t("Premier versement")}
              </div>
            </div>
          </div>
          <div className="vx-from">
            <Icone nom="badge-check" taille={22} />
            <span>
              {t("Votre demande VD-2026-0913 arrive de votre compte client BelivaY. Rien à ressaisir.")}
            </span>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "16px" }}>
            {t("Bienvenue, Carine")}
          </h1>
          <p className="pg-s">
            {t("Vérifiez, posez le point de votre boutique, et c’est ouvert.")}
          </p>
          <div className="fld">
            <label>
              {t("Nom de la boutique")}
            </label>
            <div className="inp ok">
              <span className="grow">
                {t("Carine Mode")}
              </span>
              <span className="suf">
                <span className="vx-lock">
                  <Icone nom="lock" taille={13} />
                  {t("repris")}
                </span>
              </span>
            </div>
            <div className="hint">
              {t("Jamais montré aux clients. Ils voient seulement votre palier et votre Trust Score.")}
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Catégorie")}
            </label>
            <div className="inp ok">
              <span className="grow">
                {t("Mode, beauté")}
              </span>
              <span className="suf">
                <span className="vx-lock">
                  <Icone nom="lock" taille={13} />
                  {t("repris")}
                </span>
              </span>
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Vous vendez en tant que")}
            </label>
            <div className="inp ok">
              <span className="grow">
                {t("Particulier")}
              </span>
              <span className="suf">
                <span className="vx-lock">
                  <Icone nom="lock" taille={13} />
                  {t("repris")}
                </span>
              </span>
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Votre numéro")}
            </label>
            <div className="inp ok">
              <span className="b8 c2 row" style={{ "gap": "6px", "paddingRight": "8px", "borderRight": "1px solid var(--line-2)" }}>
                <Dessin id="81b1dee44510" />
                {t("+237")}
              </span>
              <span className="grow">
                {t("677 58 32 41")}
              </span>
              <span className="suf">
                <span className="vx-lock" style={{ "color": "var(--green)" }}>
                  <Icone nom="circle-check" taille={13} />
                  {t("vérifié")}
                </span>
              </span>
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Le point de votre boutique ")}
              <span className="req">
                {t("*")}
              </span>
            </label>
            <div className="map" style={{ "height": "120px", "marginTop": "0" }}>
              <Dessin id="56ffc96b4fa9" />
            </div>
            <div className="hint">
              {t("Le seul élément à ajouter\u00A0: il sert au livreur et au calcul de la livraison.")}
            </div>
          </div>
          <div className="mt16">
            <Link to="/faceid?nouveau=1&next=%23kyc" className="btn primary">
              <Icone nom="store" taille={18} />
              <span>
                {t("Confirmer et ouvrir mon espace")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Vous ajoutez vos produits tout de suite. Ils passent en ligne quand votre pièce est vérifiée.")}
          </p>
        </Ecran>
      )
  }
}

// Page provisoire « Ouvrir — deux minutes » (VD-03) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'
import { BOUTIQUE } from '../../../demo/jeu-essai'

export default function Ouvrir() {
  const { t } = usePreferences()
  switch (useEtat("ouvrir")) {
    default:
      return (
        <Ecran route="ouvrir" parEtat>
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
          <h1 className="pg-t" style={{ "marginTop": "18px" }}>
            {t("Ouvrir ma boutique")}
          </h1>
          <p className="pg-s">
            {t("Deux minutes, sans aucun papier.")}
          </p>
          <div className="fld">
            <label>
              {t("Nom de la boutique ")}
              <span className="req">
                {t("*")}
              </span>
            </label>
            <div className="inp ok">
              <span className="grow">
                {BOUTIQUE.nom}
              </span>
            </div>
            <div className="hint">
              {t("Jamais montré aux clients. Ils voient seulement votre palier (niveau) et votre Trust Score (note sur 100).")}
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Catégorie ")}
              <span className="req">
                {t("*")}
              </span>
            </label>
            <div className="inp ok">
              <span className="grow">
                {t("Téléphones & accessoires")}
              </span>
              <span className="suf">
                <Icone nom="chevron-down" taille={18} />
              </span>
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Vous vendez en tant que ")}
              <span className="req">
                {t("*")}
              </span>
            </label>
            <div className="seg" style={{ "margin": "0" }}>
              <a className="on" style={{ "height": "44px" }}>
                {t("Particulier")}
              </a>
              <a style={{ "height": "44px" }}>
                {t("Entreprise")}
              </a>
            </div>
            <div className="hint">
              {t("Une entreprise ajoute son RCCM et son NIU plus tard\u00A0; un particulier, rien.")}
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Votre numéro ")}
              <span className="req">
                {t("*")}
              </span>
            </label>
            <div className="inp">
              <span className="b8 c2 row" style={{ "gap": "6px", "paddingRight": "8px", "borderRight": "1px solid var(--line-2)" }}>
                <Dessin id="81b1dee44510" />
                {t("+237")}
              </span>
              <span className="grow">
                {t("677 42 18 90")}
              </span>
            </div>
            <div className="hint">
              {t("Vérifié par un code reçu par SMS.")}
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Le point de votre boutique ")}
              <span className="req">
                {t("*")}
              </span>
            </label>
            <div className="map" style={{ "height": "150px", "marginTop": "0" }}>
              <Dessin id="f347fb8dc6b6" />
              <button type="button" style={{ "position": "absolute", "right": "10px", "bottom": "10px", "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "44px", "padding": "0 14px", "borderRadius": "12px", "border": "1px solid var(--line-2)", "background": "var(--card)", "color": "var(--or-txt)", "fontSize": "13.5px", "fontWeight": "800", "boxShadow": "var(--shadow-card)" }}>
                <Icone nom="locate-fixed" taille={16} />
                {t("Me localiser")}
              </button>
            </div>
            <div className="row mt8" style={{ "gap": "6px" }}>
              <Icone nom="map-pin" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="t13 b7">
                {t("Z4 · Mvog-Mbi / Mvog-Ada")}
              </span>
            </div>
            <div className="hint">
              {t("Posez le point depuis votre boutique\u00A0: il sert à calculer la livraison.")}
            </div>
          </div>
          <div className="mt20">
            <Link to="/otp" className="btn primary">
              <Icone nom="store" taille={18} />
              <span>
                {t("Ouvrir ma boutique")}
              </span>
            </Link>
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
              <div className="row" style={{ "alignItems": "flex-start", "gap": "10px", "padding": "8px 0", "borderTop": "1px solid var(--line)" }}>
                <span className="badge-num">
                  {t("1")}
                </span>
                <div className="grow">
                  <div className="b8 t14" style={{ "color": "var(--ink)" }}>
                    {t("Ouvrir")}
                  </div>
                  <div className="t13 c2">
                    {t("Nom, catégorie, particulier ou entreprise, numéro vérifié, point sur la carte.")}
                  </div>
                  <div className="t13 cg b7">
                    {t("Vous ajoutez vos produits en brouillon.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "alignItems": "flex-start", "gap": "10px", "padding": "8px 0", "borderTop": "1px solid var(--line)" }}>
                <span className="badge-num">
                  {t("2")}
                </span>
                <div className="grow">
                  <div className="b8 t14" style={{ "color": "var(--ink)" }}>
                    {t("Publier")}
                  </div>
                  <div className="t13 c2">
                    {t("CNI recto et verso, selfie vidéo avec la pièce, numéro Mobile Money.")}
                  </div>
                  <div className="t13 cg b7">
                    {t("Vos produits passent en ligne.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "alignItems": "flex-start", "gap": "10px", "padding": "8px 0", "borderTop": "1px solid var(--line)" }}>
                <span className="badge-num">
                  {t("3")}
                </span>
                <div className="grow">
                  <div className="b8 t14" style={{ "color": "var(--ink)" }}>
                    {t("Être payé")}
                  </div>
                  <div className="t13 c2">
                    {t("Contrat signé.")}
                  </div>
                  <div className="t13 cg b7">
                    {t("Votre premier versement part.")}
                  </div>
                </div>
              </div>
              <p style={{ "margin": "8px 0 0" }}>
                {t("Aucune caution, aucun dépôt, aucun frais d’entrée.")}
              </p>
            </div>
          </details>
          <Link to="/bienvenue_client" className="vx-from" style={{ "textDecoration": "none" }}>
            <Icone nom="badge-check" taille={22} />
            <span>
              {t("Déjà client BelivaY\u00A0? Ouvrez votre boutique depuis l’app\u00A0: rien à ressaisir.")}
            </span>
          </Link>
          <p className="scrim-note" style={{ "marginTop": "8px" }}>
            {t("Déjà vendeur\u00A0? ")}
            <Link to="/connexion" className="t13 b8 cor" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px" }}>
              {t("Se connecter")}
            </Link>
          </p>
        </Ecran>
      )
  }
}

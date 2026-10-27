// Page provisoire « Emplacement » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Emplacement() {
  const { t } = usePreferences()
  switch (useEtat("emplacement")) {
    default:
      return (
        <Ecran route="emplacement" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Emplacement")}
            </h1>
            <p className="pg-s">
              {t("Votre prix + la livraison depuis ici\u00A0: le total le plus bas l’emporte.")}
            </p>
          </div>
          <div className="map">
            <Dessin id="732aae44d0dd" />
          </div>
          <div className="card">
            <div className="row">
              <div className="grow b8 t17">
                {t("Z4 · Mvog-Mbi / Mvog-Ada")}
              </div>
              <span className="pill green sm">
                <Icone nom="circle-check" taille={13} />
                {t("Vérifié")}
              </span>
            </div>
            <div className="mt8">
              <div className="kv">
                <span className="k">
                  {t("Coordonnées")}
                </span>
                <span className="v ">
                  {t("3,652° N · 11,517° E")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Point posé")}
                </span>
                <span className="v ">
                  {t("Depuis la boutique, le 7 mai")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Vérifié")}
                </span>
                <span className="v ">
                  {t("Le 9 mai")}
                </span>
              </div>
            </div>
            <div className="fld">
              <label>
                {t("Repère pour le livreur")}
              </label>
              <div className="inp">
                <Icone nom="map-pin" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Face à la pharmacie du carrefour")}
                </span>
              </div>
              <div className="hint">
                {t("Une phrase simple pour trouver la boutique.")}
              </div>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="calculator" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                <b>
                  {t("Coût total livré")}
                </b>
                {t(" = votre prix + la livraison réelle depuis votre boutique. Le plus bas reçoit la commande.")}
              </p>
              <p>
                <b>
                  {t("À coût égal")}
                </b>
                {t(", le meilleur Trust Score passe devant.")}
              </p>
              <p>
                <b>
                  {t("Rupture, lenteur ou refus")}
                </b>
                {t("\u00A0: la commande passe au vendeur suivant.")}
              </p>
              <p>
                <b>
                  {t("Le client ne choisit pas de vendeur")}
                </b>
                {t("\u00A0: il choisit un produit, BelivaY choisit l’offre.")}
              </p>
            </div>
          </details>
          <div className="mt16">
            <button type="button" className="btn secondary">
              <Icone nom="map-pin" taille={18} />
              <span>
                {t("Replacer le point depuis la boutique")}
              </span>
            </button>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("À faire sur place. Au-delà de 200\u00A0m, une nouvelle vérification suit.")}
            </span>
          </div>
          <div className="mt16">
            <Link to="/boutique" className="btn primary">
              <Icone nom="check" taille={18} />
              <span>
                {t("Enregistrer")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}

// Page provisoire « Demander une fiche » (VD-08) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Fiche() {
  const { t } = usePreferences()
  switch (useEtat("fiche")) {
    default:
      return (
        <Ecran route="fiche" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Demander une fiche")}
            </h1>
            <p className="pg-s">
              {t("La fiche, c’est la page du produit au catalogue. BelivaY l’écrit pour vous.")}
            </p>
          </div>
          <div className="fld">
            <label>
              {t("Ce que vous avez cherché")}
            </label>
            <div className="inp ok">
              <Icone nom="search" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow">
                {t("chargeur itel")}
              </span>
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Marque")}
            </label>
            <div className="inp">
              <span className="grow">
                {t("itel")}
              </span>
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Catégorie")}
            </label>
            <div className="inp">
              <span className="grow">
                {t("Téléphones & accessoires")}
              </span>
              <span className="suf">
                <Icone nom="chevron-down" taille={16} />
              </span>
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Votre photo du produit")}
            </label>
            <div className="split3">
              <div className="photo">
                <Dessin id="97f264a1205c" />
                <span className="ts">
                  {t("09\u00A0h\u00A044 · Mvog-Ada")}
                </span>
              </div>
              <Link to="/camera?mode=photo" className="addph">
                <Icone nom="camera" taille={22} />
                <span>
                  {t("Ajouter")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="row">
              <div className="grow">
                <div className="b8 t14">
                  {t("Fiche prioritaire · 1\u00A0000\u00A0F")}
                </div>
                <div className="t12 c3 mt4">
                  {t("Écrite sous 24\u00A0h au lieu de 48\u00A0h")}
                </div>
              </div>
              <button type="button" className="tg" role="switch" aria-checked="false"></button>
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
              <div className="tl" style={{ "marginTop": "4px" }}>
                <div className="ti cur">
                  <div className="tt">
                    {t("BelivaY vérifie les doublons")}
                  </div>
                  <div className="td">
                    {t("Si le produit existe déjà, votre offre y est rattachée. Vous ne perdez rien de ce que vous avez saisi.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("La fiche est écrite sous 48\u00A0h")}
                  </div>
                  <div className="td">
                    {t("24\u00A0h avec la fiche prioritaire. Votre offre attend en brouillon.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("Vous finissez l’offre")}
                  </div>
                  <div className="td">
                    {t("Stock, prix, trois photos réelles, publier.")}
                  </div>
                </div>
              </div>
              <p>
                {t("Vous ne créez jamais une fiche vous-même\u00A0: c’est ce qui garde le catalogue sans doublons.")}
              </p>
            </div>
          </details>
          <div className="mt16">
            <Link to="/produits" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Envoyer la demande")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Votre offre attend en brouillon dans Mes produits.")}
          </p>
        </Ecran>
      )
  }
}

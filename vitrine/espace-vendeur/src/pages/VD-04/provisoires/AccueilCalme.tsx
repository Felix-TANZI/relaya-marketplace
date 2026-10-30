// Page provisoire « Rien à faire » (VD-04) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function AccueilCalme() {
  const { t } = usePreferences()
  switch (useEtat("accueil_calme")) {
    case "accueil_calme?pop=profil":
    default:
      return (
        <Ecran route="accueil_calme" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Bonjour Franck · mardi 13 octobre")}
          </div>
          <div className="card" style={{ "padding": "10px 12px 10px 16px" }}>
            <div className="row">
              <span style={{ "width": "10px", "height": "10px", "borderRadius": "50%", "background": "var(--green)", "boxShadow": "0 0 0 4px var(--green-soft)", "flexShrink": "0" }}></span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Boutique ouverte")}
                </div>
                <div className="t13 c3 mt4">
                  {t("Jusqu’à 18\u00A0h")}
                </div>
              </div>
              <Link to="/?closed=1" style={{ "height": "44px" }} className="btn secondary sm">
                <span>
                  {t("Fermer aujourd’hui")}
                </span>
              </Link>
            </div>
          </div>
          <div className="pg" style={{ "paddingTop": "18px" }}>
            <h1 className="pg-t">
              {t("Rien à faire pour l’instant")}
            </h1>
            <p className="pg-s">
              {t("Toutes vos commandes sont prêtes. On vous prévient dès qu’une nouvelle arrive.")}
            </p>
          </div>
          <div className="hero night">
            <div className="otop">
              <span className="hk">
                {t("Gagné avec BelivaY")}
              </span>
              <Icone nom="sparkles" taille={18} style={{ "color": "var(--gold-l)" }} />
            </div>
            <div className="big">
              {t("53\u00A0520")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("Depuis votre inscription")}
            </div>
            <div className="hs" style={{ "marginTop": "2px" }}>
              <b>
                {t("71\u00A0360\u00A0F ce soir")}
              </b>
              {t(" à 18\u00A0h, quand BLV-00007 se libère")}
            </div>
            <div className="hline"></div>
            <div className="row" style={{ "alignItems": "flex-end" }}>
              <div className="grow">
                <div className="t12" style={{ "color": "rgba(255,255,255,.75)", "fontWeight": "800", "letterSpacing": ".06em", "textTransform": "uppercase" }}>
                  {t("Prochain versement")}
                </div>
                <div className="b8 t15 mt4">
                  {t("Samedi 17 oct.")}
                </div>
              </div>
              <div className="b8" style={{ "fontSize": "24px", "letterSpacing": "-.02em", "whiteSpace": "nowrap" }}>
                {t("35\u00A0680\u00A0F")}
              </div>
            </div>
            <div className="t13 mt6" style={{ "color": "rgba(255,255,255,.78)" }}>
              {t("17\u00A0840\u00A0F déjà prêts, plus 17\u00A0840\u00A0F libérés ce soir · vers MTN\u00A0····\u00A04\u00A0217, sans frais")}
            </div>
          </div>
          <div className="card" style={{ "border": "1.5px dashed var(--or-line)", "boxShadow": "none", "background": "var(--or-soft)" }}>
            <div className="kick" style={{ "color": "var(--or-txt)", "fontSize": "12px" }}>
              {t("Une idée pour vendre plus")}
            </div>
            <div className="b8 t15 mt6" style={{ "lineHeight": "1.35" }}>
              {t("«\u00A0chargeur itel\u00A0»\u00A0: cherché 14 fois près de chez vous, sans résultat")}
            </div>
            <div className="mt12">
              <Link to="/offre1?q=chargeur%20itel" className="btn primary">
                <Icone nom="plus" taille={18} />
                <span>
                  {t("Ajouter ce produit")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Votre mois de septembre")}
            </h3>
            <p className="t14 c2" style={{ "margin": "8px 0 0", "lineHeight": "1.5" }}>
              {t("Vous avez gardé ")}
              <b>
                {t("53\u00A0520\u00A0F")}
              </b>
              {t(" sur ")}
              <b>
                {t("60\u00A0000\u00A0F")}
              </b>
              {t(" de ventes libérées.")}
            </p>
            <div className="split3 mt12">
              <div className="mini">
                <div className="mk" style={{ "fontSize": "12px", "letterSpacing": ".04em" }}>
                  {t("Commandes")}
                </div>
                <div className="mv ">
                  {t("9")}
                </div>
              </div>
              <div className="mini">
                <div className="mk" style={{ "fontSize": "12px", "letterSpacing": ".04em" }}>
                  {t("Impayés")}
                </div>
                <div className="mv cg">
                  {t("0\u00A0F")}
                </div>
              </div>
              <div className="mini">
                <div className="mk" style={{ "fontSize": "12px", "letterSpacing": ".04em" }}>
                  {t("Transport")}
                </div>
                <div className="mv cg">
                  {t("0\u00A0F")}
                </div>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="circle-check" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Un refus ne vous coûte rien, et le livreur vient chez vous.")}
              </span>
            </div>
          </div>
          <div className="card">
            <Link to="/gains" className="li">
              <span className="ic or">
                <Icone nom="trophy" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Votre produit qui rapporte le plus")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("ITEL AC52 · 3 ventes")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/palier" className="li">
              <span className="ic or">
                <Icone nom="award" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Au palier Argent, vous garderez 324\u00A0F de plus par ITEL")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Il vous manque 2 points de Trust Score et 3\u00A0commandes livrées")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Palier\u00A0: votre niveau de vendeur, qui suit votre Trust Score (note de confiance sur 100).")}
              </span>
            </div>
          </div>
          <div className="foot">
            <Icone nom="wifi" taille={16} />
            <span>
              {t("Connecté · aucune action en attente d’envoi")}
            </span>
          </div>
        </Ecran>
      )
  }
}

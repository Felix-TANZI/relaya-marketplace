// Page provisoire « Hors connexion » (VD-04) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Horsligne() {
  const { t } = usePreferences()
  switch (useEtat("horsligne")) {
    case "horsligne?pop=profil":
    default:
      return (
        <Ecran route="horsligne" parEtat>
          <div className="offline-banner">
            <Icone nom="wifi-off" taille={18} />
            <span>
              <b>
                {t("Pas de connexion.")}
              </b>
              {t(" Données de 09\u00A0h\u00A014. Ce que vous faites partira au retour du réseau.")}
            </span>
          </div>
          <div className="pg" style={{ "paddingTop": "16px" }}>
            <h1 className="pg-t">
              {t("Hors connexion")}
            </h1>
            <p className="pg-s">
              {t("La préparation et le code de remise marchent sans réseau.")}
            </p>
          </div>
          <div className="card ord">
            <div className="otop">
              <span className="oref">
                {t("À PRÉPARER · BLV-00008")}
              </span>
              <span className="cd">
                <Icone nom="timer" taille={14} />
                {t("il reste 2\u00A0h\u00A054")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Prête avant 12\u00A0h\u00A042")}
                </div>
                <div className="av" style={{ "marginTop": "1px" }}>
                  {t("Livreur Serge M. entre 14\u00A0h et 16\u00A0h")}
                </div>
              </div>
            </div>
            <div className="btns" style={{ "marginTop": "12px" }}>
              <Link to="/commande_prete?ref=BLV-00008" className="btn primary">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
              <Link to="/commande_prete?ref=BLV-00008&code=1" style={{ "height": "48px" }} className="btn secondary">
                <Icone nom="key-round" taille={18} />
                <span>
                  {t("Code de remise")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="row">
              <div className="grow">
                <h3>
                  {t("3 actions en attente")}
                </h3>
                <div className="t13 c3 mt4">
                  {t("2 photos · 1 stock mis à jour")}
                </div>
              </div>
              <button style={{ "height": "44px" }} type="button" className="btn secondary sm">
                <Icone nom="refresh-cw" taille={16} />
                <span>
                  {t("Réessayer")}
                </span>
              </button>
            </div>
            <div className="mt8" style={{ "borderTop": "1px solid var(--line)" }}>
              <div className="li">
                <span className="ic ">
                  <Icone nom="camera" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Photo · ITEL AC52 bleu")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Prise à 09\u00A0h\u00A031 · Mvog-Ada")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic ">
                  <Icone nom="camera" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Photo · ITEL AC52 bleu")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Prise à 09\u00A0h\u00A032 · Mvog-Ada")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic ">
                  <Icone nom="boxes" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Stock · ITEL AC52 noir\u00A0: 3")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Modifié à 09\u00A0h\u00A040 · par Franck")}
                  </span>
                </span>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="clock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Chaque action garde l’heure et le lieu où vous l’avez faite.")}
              </span>
            </div>
            <div className="hint-l">
              <Icone nom="triangle-alert" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Une action en attente depuis plus de 72\u00A0h expire\u00A0: il faudra la refaire.")}
              </span>
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
              <div className="li">
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Marche sans réseau")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Voir les commandes à préparer · voir le code de remise, à donner au livreur même sans réseau")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic amber">
                  <Icone nom="clock" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Mis en file, envoyé au retour du réseau")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Marquer prêt · photographier un produit · mettre à jour un stock. Les montants s’affichent datés.")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic red">
                  <Icone nom="wifi-off" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Attend le réseau")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Changer de numéro de versement · répondre à un litige · publier une offre")}
                  </span>
                </span>
              </div>
            </div>
          </details>
        </Ecran>
      )
  }
}

// Page provisoire « Gelé — pourquoi » (VD-09) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Gele() {
  const { t } = usePreferences()
  switch (useEtat("gele")) {
    default:
      return (
        <Ecran route="gele" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Gelé")}
            </h1>
            <p className="pg-s">
              {t("Bloqué pendant un litige ou un retour. Aucune date de versement.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/argent" style={{ "height": "44px" }} className="">
              {t("Résumé")}
            </Link>
            <Link to="/se_libere" style={{ "height": "44px" }} className="">
              {t("Se libère")}
            </Link>
            <Link to="/gele" style={{ "height": "44px" }} className="on">
              {t("Gelé")}
            </Link>
            <Link to="/gains" style={{ "height": "44px" }} className="">
              {t("Mes gains")}
            </Link>
          </div>
          <div className="hero red">
            <div className="otop">
              <span className="hk">
                {t("Gelé · 3\u00A0commandes")}
              </span>
              <span className="pill dk">
                {t("Sans date de versement")}
              </span>
            </div>
            <div className="big">
              {t("688\u00A0488")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("335\u00A0324 + 335\u00A0324 + 17\u00A0840\u00A0F")}
            </div>
            <div className="hline"></div>
            <div className="row t13" style={{ "gap": "8px", "alignItems": "flex-start", "lineHeight": "1.45", "color": "rgba(255,255,255,.9)" }}>
              <Icone nom="badge-check" taille={18} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Litige gagné\u00A0: la somme se libère aussitôt et part le vendredi suivant.")}
              </span>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("À faire pour débloquer")}
            </h2>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Litige\u00A0: 48\u00A0h pour répondre. Retour\u00A0: 48\u00A0h pour inspecter le produit.")}
            </span>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00005")}
              </span>
              <span className="b8 t15 cr nw">
                {t("335\u00A0324\u00A0F")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "48px", "height": "48px", "borderRadius": "12px" }}>
                <Dessin id="f80d84fe1c49" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "15.5px" }}>
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("«\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
              </div>
            </div>
            <div className="row t13 b7 mt10" style={{ "gap": "7px", "alignItems": "flex-start", "color": "var(--red)" }}>
              <Icone nom="clock" taille={16} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Répondez avant demain à 05\u00A0h\u00A030")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00005" className="btn primary">
                <Icone nom="arrow-right" taille={18} />
                <span>
                  {t("Répondre au litige")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00006")}
              </span>
              <span className="b8 t15 cr nw">
                {t("335\u00A0324\u00A0F")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "48px", "height": "48px", "borderRadius": "12px" }}>
                <Dessin id="f80d84fe1c49" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "15.5px" }}>
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("«\u00A0Colis abîmé\u00A0»")}
                </div>
              </div>
            </div>
            <div className="row t13 b7 mt10" style={{ "gap": "7px", "alignItems": "flex-start", "color": "var(--ink-2)" }}>
              <Icone nom="clock" taille={16} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Répondez avant jeu. 15 oct. à 06\u00A0h\u00A002")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00006" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="arrow-right" taille={18} />
                <span>
                  {t("Répondre au litige")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("RETOUR · BLV-00004")}
              </span>
              <span className="b8 t15 cr nw">
                {t("17\u00A0840\u00A0F")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "48px", "height": "48px", "borderRadius": "12px" }}>
                <Dessin id="39004c36072c" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "15.5px" }}>
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Défaut caché · arrive demain")}
                </div>
              </div>
            </div>
            <div className="row t13 b7 mt10" style={{ "gap": "7px", "alignItems": "flex-start", "color": "var(--ink-2)" }}>
              <Icone nom="search" taille={16} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Inspectez-le avant ven. 16 oct. à 16\u00A0h")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/retours" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="arrow-right" taille={18} />
                <span>
                  {t("Voir le retour")}
                </span>
              </Link>
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
              <p className="b8" style={{ "color": "var(--ink)" }}>
                {t("Ce qui peut geler")}
              </p>
              <div className="li">
                <span className="ic red">
                  <Icone nom="scale" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Un litige ouvert par le client")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic red">
                  <Icone nom="undo-2" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Un retour après un problème signalé")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic red">
                  <Icone nom="shield-alert" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Une vérification anti-fraude")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Motif écrit sous 48\u00A0h")}
                  </span>
                </span>
              </div>
              <p className="mt8">
                {t("Un gel est toujours attaché à une commande précise.")}
              </p>
              <p>
                {t("Petit remboursement automatique au client (3\u00A0000\u00A0F, ou 10\u00A0000\u00A0F pour un client de niveau Élevé)\u00A0: BelivaY le paie. Vous êtes payé normalement.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}

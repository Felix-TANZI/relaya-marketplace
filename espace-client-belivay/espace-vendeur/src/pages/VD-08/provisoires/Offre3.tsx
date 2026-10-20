// Page provisoire « Nouvelle offre — le prix » (VD-08) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Offre3() {
  const { t } = usePreferences()
  switch (useEtat("offre3")) {
    default:
      return (
        <Ecran route="offre3" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Étape 3 sur 4")}
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className="on"></i>
            <i className="on"></i>
            <i className=""></i>
          </div>
          <div className="row" style={{ "gap": "6px", "marginTop": "6px" }}>
            <span className="grow t12 b7 c2">
              {t("Produit")}
            </span>
            <span className="grow t12 b7 c2">
              {t("Photos")}
            </span>
            <span className="grow t12 b8 cor">
              {t("Prix")}
            </span>
            <span className="grow t12 c3">
              {t("Publier")}
            </span>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "14px" }}>
            {t("Votre stock et votre prix")}
          </h1>
          <div className="split2">
            <div className="fld">
              <label>
                {t("Couleur")}
              </label>
              <div className="inp">
                <span className="grow">
                  {t("Noir")}
                </span>
                <span className="suf">
                  <Icone nom="chevron-down" taille={16} />
                </span>
              </div>
            </div>
            <div className="fld">
              <label>
                {t("Stock ")}
                <span className="req">
                  {t("*")}
                </span>
              </label>
              <div className="inp ph">
                <span className="grow">
                  {t("Ex.\u00A0: 12")}
                </span>
              </div>
            </div>
          </div>
          <div className="fld">
            <label>
              {t("État ")}
              <span className="req">
                {t("*")}
              </span>
            </label>
            <div className="inp">
              <span className="grow">
                {t("Neuf")}
              </span>
              <span className="suf">
                <Icone nom="chevron-down" taille={16} />
              </span>
            </div>
            <div className="hint">
              {t("Neuf · neuf sans emballage · reconditionné · occasion comme neuf · occasion bon état · occasion état correct")}
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="sliders-horizontal" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                <span style={{ "display": "block" }}>
                  {t("Autres réglages · déjà remplis")}
                </span>
                <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "1px" }}>
                  {t("Seuil, délai, paiement au retrait, colis")}
                </span>
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <div className="split2">
                <div className="fld">
                  <label>
                    {t("Seuil d’alerte")}
                  </label>
                  <div className="inp ph">
                    <span className="grow">
                      {t("Ex.\u00A0: 5")}
                    </span>
                  </div>
                </div>
                <div className="fld">
                  <label>
                    {t("Délai de préparation")}
                  </label>
                  <div className="inp">
                    <span className="grow">
                      {t("4\u00A0h ouvrées")}
                    </span>
                    <span className="suf">
                      <Icone nom="chevron-down" taille={16} />
                    </span>
                  </div>
                </div>
              </div>
              <div className="hint">
                {t("Seuil\u00A0: on vous prévient quand le stock y descend.")}
              </div>
              <div className="hint">
                {t("Sur commande ou sur-mesure\u00A0: jusqu’à 7\u00A0jours de préparation.")}
              </div>
              <div className="mt8">
                <div className="row" style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
                  <div className="grow">
                    <div className="b8 t14" style={{ "color": "var(--ink)" }}>
                      {t("Paiement au retrait accepté")}
                    </div>
                    <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                      {t("Rien n’est encaissé avant le retrait\u00A0; un refus ne vous coûte rien")}
                    </div>
                  </div>
                  <button type="button" className="tg on" role="switch" aria-checked="true"></button>
                </div>
                <div className="row" style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
                  <div className="grow">
                    <div className="b8 t14" style={{ "color": "var(--ink)" }}>
                      {t("Made in Cameroon")}
                    </div>
                    <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                      {t("Sur certificat · vous gardez 2 points de plus")}
                    </div>
                  </div>
                  <button type="button" className="tg" role="switch" aria-checked="false"></button>
                </div>
              </div>
              <div className="row" style={{ "padding": "12px 0 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="package" taille={20} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <div className="grow">
                  <div className="b8 t14" style={{ "color": "var(--ink)" }}>
                    {t("Colis S · rien à déclarer")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("Poids et dimensions deviennent obligatoires au-delà de 5\u00A0kg ou 50\u00A0cm\u00A0: l’écran affiche alors la classe du colis et son tarif.")}
                  </div>
                </div>
              </div>
            </div>
          </details>
          <div className="divider-t">
            {t("Votre prix")}
          </div>
          <div className="fld">
            <label>
              {t("Prix de vente ")}
              <span className="req">
                {t("*")}
              </span>
            </label>
            <div className="inp focus">
              <span className="grow">
                {t("21\u00A0000")}
              </span>
              <span className="suf">
                {t("F")}
              </span>
            </div>
            <div className="hint">
              {t("Prix payé par le client, sans la livraison. 500\u00A0F minimum.")}
            </div>
          </div>
          <div className="keep">
            <span className="kl">
              {t("À 21\u00A0000\u00A0F, vous gardez par vente")}
            </span>
            <span className="kv2">
              <span style={{ "display": "block" }}>
                {t("18\u00A0800\u00A0F")}
              </span>
              <span style={{ "display": "block", "textAlign": "right", "fontSize": "12.5px", "fontWeight": "700", "letterSpacing": "0", "marginTop": "1px" }}>
                {t("soit 89,5\u00A0%")}
              </span>
            </span>
          </div>
          <div className="hero night">
            <div className="otop">
              <span className="hk">
                {t("Pour vendre plus")}
              </span>
              <Icone nom="trending-up" taille={18} style={{ "color": "var(--gold-l)" }} />
            </div>
            <div className="t14 mt8" style={{ "lineHeight": "1.45" }}>
              {t("D’autres vendeurs vendent déjà à ")}
              <b>
                {t("19\u00A0000\u00A0F")}
              </b>
              {t(".")}
            </div>
            <div className="row mt12" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="t12 b7" style={{ "color": "rgba(255,255,255,.72)" }}>
                  {t("Prix conseillé")}
                </div>
                <div className="b8" style={{ "fontSize": "30px", "letterSpacing": "-.03em", "lineHeight": "1.1", "marginTop": "4px" }}>
                  {t("18\u00A0900\u00A0F")}
                </div>
              </div>
              <div className="right">
                <div className="t12 b7" style={{ "color": "rgba(255,255,255,.72)" }}>
                  {t("Vous gardez")}
                </div>
                <div className="b8" style={{ "fontSize": "30px", "letterSpacing": "-.03em", "lineHeight": "1.1", "marginTop": "4px" }}>
                  {t("16\u00A0859\u00A0F")}
                </div>
                <div className="t12 b7 mt4" style={{ "color": "rgba(255,255,255,.72)" }}>
                  {t("soit 89,2\u00A0%")}
                </div>
              </div>
            </div>
            <div className="hline" style={{ "margin": "12px 0" }}></div>
            <div className="row" style={{ "gap": "8px", "alignItems": "flex-start" }}>
              <Icone nom="circle-check" taille={17} style={{ "color": "var(--gold-l)", "flexShrink": "0", "marginTop": "1px" }} />
              <span className="t13" style={{ "lineHeight": "1.45", "color": "rgba(255,255,255,.9)" }}>
                {t("Les clients de ")}
                <b style={{ "color": "#fff" }}>
                  {t("5 zones sur 6")}
                </b>
                {t(" voient votre offre en premier.")}
              </span>
            </div>
            <details className="more flat" style={{ "borderTopColor": "rgba(255,255,255,.16)", "marginTop": "12px" }}>
              <summary style={{ "color": "#fff" }}>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--gold-l)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi ce prix\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "rgba(255,255,255,.7)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b" style={{ "color": "rgba(255,255,255,.84)" }}>
                <p>
                  {t("3 offres sont en vente, de 19\u00A0000 à 20\u00A0500\u00A0F.")}
                </p>
                <p>
                  {t("Le client paie 1\u00A0500\u00A0F de moins qu’avec l’offre la plus proche\u00A0: c’est lui qui revient.")}
                </p>
                <p>
                  {t("Cette semaine, 340 clients ont regardé ce produit. Les moins chers ont reçu 9\u00A0commandes sur 10.")}
                </p>
                <p>
                  {t("BelivaY ne conseille jamais un prix plus haut. Le choix reste le vôtre\u00A0: à 21\u00A0000\u00A0F, aucun rappel avant 7\u00A0jours.")}
                </p>
              </div>
            </details>
            <div className="mt12">
              <Link to="/offre4" className="btn white">
                <Icone nom="check" taille={18} />
                <span>
                  {t("Ajuster à 18\u00A0900\u00A0F")}
                </span>
              </Link>
            </div>
            <div className="mt8">
              <Link to="/offre4?keep=1" style={{ "height": "44px" }} className="btn dark">
                <span>
                  {t("Rester à 21\u00A0000\u00A0F")}
                </span>
              </Link>
            </div>
          </div>
        </Ecran>
      )
  }
}

// Page provisoire « Nouvelle offre — récapitulatif » (VD-08) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Offre4() {
  const { t } = usePreferences()
  switch (useEtat("offre4")) {
    default:
      return (
        <Ecran route="offre4" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Étape 4 sur 4")}
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className="on"></i>
            <i className="on"></i>
            <i className="on"></i>
          </div>
          <div className="row" style={{ "gap": "6px", "marginTop": "6px" }}>
            <span className="grow t12 b7 c2">
              {t("Produit")}
            </span>
            <span className="grow t12 b7 c2">
              {t("Photos")}
            </span>
            <span className="grow t12 b7 c2">
              {t("Prix")}
            </span>
            <span className="grow t12 b8 cor">
              {t("Publier")}
            </span>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "14px" }}>
            {t("Relisez, puis publiez")}
          </h1>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "17px" }}>
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Déjà au catalogue · Téléphones")}
                </div>
              </div>
            </div>
            <div className="row mt12">
              <span className="grow t14 c3">
                {t("Prix de vente")}
              </span>
              <span className="b8 t17">
                {t("18\u00A0900\u00A0F")}
              </span>
            </div>
            <div className="keep">
              <span className="kl">
                {t("Vous gardez par vente")}
              </span>
              <span className="kv2">
                {t("16\u00A0859\u00A0F")}
              </span>
            </div>
            <div className="mt8">
              <div className="kv">
                <span className="k">
                  {t("État")}
                </span>
                <span className="v ">
                  {t("Neuf")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Stock")}
                </span>
                <span className="v ">
                  {t("12 · alerte à 5")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Délai de préparation")}
                </span>
                <span className="v ">
                  {t("4\u00A0h ouvrées")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Paiement au retrait")}
                </span>
                <span className="v ">
                  {t("Accepté")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Photos réelles")}
                </span>
                <span className="v ">
                  {t("3 · heure et lieu gardés")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Colis")}
                </span>
                <span className="v ">
                  {t("Classe S")}
                </span>
              </div>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="wallet" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
                <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "1px" }}>
                  {t("Quand l’argent arrive, en 4 temps")}
                </span>
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <div className="tl" style={{ "marginTop": "4px" }}>
                <div className="ti">
                  <div className="tt">
                    {t("1 · Le client paie")}
                  </div>
                  <div className="td">
                    {t("BelivaY encaisse et garde tout\u00A0: vous êtes couvert.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("2 · Le client confirme")}
                  </div>
                  <div className="td">
                    {t("«\u00A0Tout est en ordre\u00A0» au retrait, ou 7\u00A0jours sans problème.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("3 · L’argent se libère")}
                  </div>
                  <div className="td">
                    {t("3\u00A0jours plus tard (Bronze et Argent), 1\u00A0jour (Or et Platine).")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("4 · Versé le vendredi")}
                  </div>
                  <div className="td">
                    {t("Vers MTN\u00A0····\u00A04\u00A0217, sans frais, sans rien demander.")}
                  </div>
                </div>
              </div>
            </div>
          </details>
          <div className="mt16">
            <Link to="/offre_publiee" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Publier · vérification sous 48\u00A0h")}
              </span>
            </Link>
          </div>
          <div className="mt8">
            <Link to="/produits" style={{ "height": "44px" }} className="btn ghost">
              <Icone nom="archive" taille={18} />
              <span>
                {t("Garder en brouillon")}
              </span>
            </Link>
          </div>
          <p className="scrim-note" style={{ "marginTop": "6px" }}>
            {t("Hors connexion, l’offre est gardée et part au retour du réseau.")}
          </p>
        </Ecran>
      )
    case "offre4?keep=1":
      return (
        <Ecran route="offre4" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Étape 4 sur 4")}
          </div>
          <div className="steps">
            <i className="on"></i>
            <i className="on"></i>
            <i className="on"></i>
            <i className="on"></i>
          </div>
          <div className="row" style={{ "gap": "6px", "marginTop": "6px" }}>
            <span className="grow t12 b7 c2">
              {t("Produit")}
            </span>
            <span className="grow t12 b7 c2">
              {t("Photos")}
            </span>
            <span className="grow t12 b7 c2">
              {t("Prix")}
            </span>
            <span className="grow t12 b8 cor">
              {t("Publier")}
            </span>
          </div>
          <h1 className="pg-t" style={{ "marginTop": "14px" }}>
            {t("Relisez, puis publiez")}
          </h1>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="529c6ff24ab4" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "17px" }}>
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Déjà au catalogue · Téléphones")}
                </div>
              </div>
            </div>
            <div className="row mt12">
              <span className="grow t14 c3">
                {t("Prix de vente")}
              </span>
              <span className="b8 t17">
                {t("21\u00A0000\u00A0F")}
              </span>
            </div>
            <div className="keep">
              <span className="kl">
                {t("Vous gardez par vente")}
              </span>
              <span className="kv2">
                {t("18\u00A0800\u00A0F")}
              </span>
            </div>
            <div className="mt8">
              <div className="kv">
                <span className="k">
                  {t("État")}
                </span>
                <span className="v ">
                  {t("Neuf")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Stock")}
                </span>
                <span className="v ">
                  {t("12 · alerte à 5")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Délai de préparation")}
                </span>
                <span className="v ">
                  {t("4\u00A0h ouvrées")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Paiement au retrait")}
                </span>
                <span className="v ">
                  {t("Accepté")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Photos réelles")}
                </span>
                <span className="v ">
                  {t("3 · heure et lieu gardés")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Colis")}
                </span>
                <span className="v ">
                  {t("Classe S")}
                </span>
              </div>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="wallet" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
                <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "1px" }}>
                  {t("Quand l’argent arrive, en 4 temps")}
                </span>
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <div className="tl" style={{ "marginTop": "4px" }}>
                <div className="ti">
                  <div className="tt">
                    {t("1 · Le client paie")}
                  </div>
                  <div className="td">
                    {t("BelivaY encaisse et garde tout\u00A0: vous êtes couvert.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("2 · Le client confirme")}
                  </div>
                  <div className="td">
                    {t("«\u00A0Tout est en ordre\u00A0» au retrait, ou 7\u00A0jours sans problème.")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("3 · L’argent se libère")}
                  </div>
                  <div className="td">
                    {t("3\u00A0jours plus tard (Bronze et Argent), 1\u00A0jour (Or et Platine).")}
                  </div>
                </div>
                <div className="ti">
                  <div className="tt">
                    {t("4 · Versé le vendredi")}
                  </div>
                  <div className="td">
                    {t("Vers MTN\u00A0····\u00A04\u00A0217, sans frais, sans rien demander.")}
                  </div>
                </div>
              </div>
            </div>
          </details>
          <div className="mt16">
            <Link to="/offre_publiee" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Publier · vérification sous 48\u00A0h")}
              </span>
            </Link>
          </div>
          <div className="mt8">
            <Link to="/produits" style={{ "height": "44px" }} className="btn ghost">
              <Icone nom="archive" taille={18} />
              <span>
                {t("Garder en brouillon")}
              </span>
            </Link>
          </div>
          <p className="scrim-note" style={{ "marginTop": "6px" }}>
            {t("Hors connexion, l’offre est gardée et part au retour du réseau.")}
          </p>
        </Ecran>
      )
  }
}

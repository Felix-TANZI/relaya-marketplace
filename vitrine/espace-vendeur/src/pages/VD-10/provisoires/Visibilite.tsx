// Page provisoire « Catalogue de visibilité » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Visibilite() {
  const { t } = usePreferences()
  switch (useEtat("visibilite")) {
    default:
      return (
        <Ecran route="visibilite" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Se faire voir")}
            </h1>
            <p className="pg-s">
              {t("Des emplacements pour montrer vos offres. Toujours marqués «\u00A0Sponsorisé\u00A0», jamais dans la recherche.")}
            </p>
          </div>
          <div className="hero night">
            <div className="otop">
              <span className="hk">
                {t("Offert ce mois")}
              </span>
              <Icone nom="gift" taille={20} style={{ "color": "var(--gold-l)" }} />
            </div>
            <div className="b8 mt8" style={{ "fontSize": "20px", "lineHeight": "1.3" }}>
              {t("1 vente flash et 1 vitrine de quartier")}
            </div>
            <div className="hs">
              {t("Votre récompense\u00A0: votre ITEL AC52 à 18\u00A0900\u00A0F a le meilleur prix.")}
            </div>
          </div>
          <div className="card">
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic or">
                  <Icone nom="megaphone" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="row">
                  <span className="grow b8 t15">
                    {t("Mise en avant 24\u00A0h")}
                  </span>
                  <span className="b8 t15 cor">
                    {t("500\u00A0F")}
                  </span>
                </div>
                <div className="t13 c3 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Bande «\u00A0Sponsorisé\u00A0» de l’accueil et de la catégorie")}
                </div>
              </div>
            </div>
            <div className="mt12">
              <Link to="/visibilite?achat=1" className="btn primary">
                <Icone nom="megaphone" taille={18} />
                <span>
                  {t("Mettre en avant l’ITEL AC52")}
                </span>
              </Link>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("Autres emplacements")}
            </h2>
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <div className="li">
              <span className="ic or">
                <Icone nom="layers" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Boost de catégorie · 7\u00A0jours")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("En tête de la bande «\u00A0Sponsorisé\u00A0» de la catégorie")}
                </span>
              </span>
              <span className="b8 t14 cor nw" style={{ "alignSelf": "flex-start", "marginTop": "2px" }}>
                {t("2\u00A0000\u00A0F")}
              </span>
            </div>
            <div className="li">
              <span className="ic or">
                <Icone nom="store" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Vitrine de quartier · 7\u00A0jours")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Montrée aux clients dont le relais est dans votre zone")}
                </span>
              </span>
              <span className="b8 t14 cor nw" style={{ "alignSelf": "flex-start", "marginTop": "2px" }}>
                {t("1\u00A0500\u00A0F")}
              </span>
            </div>
            <div className="li">
              <span className="ic or">
                <Icone nom="target" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Boost au résultat")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vous ne payez que si vous vendez")}
                </span>
              </span>
              <span className="b8 t14 cor nw" style={{ "alignSelf": "flex-start", "marginTop": "2px" }}>
                {t("0\u00A0F d’avance")}
              </span>
            </div>
            <div className="li">
              <span className="ic or">
                <Icone nom="heart" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Campagne «\u00A0favoris\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Prévient les clients qui ont gardé votre produit")}
                </span>
              </span>
              <span className="b8 t14 cor nw" style={{ "alignSelf": "flex-start", "marginTop": "2px" }}>
                {t("25\u00A0F / client")}
              </span>
            </div>
            <div className="li">
              <span className="ic or">
                <Icone nom="zap" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Vente flash")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Remise réelle de 10\u00A0% au moins")}
                </span>
              </span>
              <span className="b8 t14 cor nw" style={{ "alignSelf": "flex-start", "marginTop": "2px" }}>
                {t("Gratuite")}
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
              <p>
                <b>
                  {t("Vitrine de quartier\u00A0:")}
                </b>
                {t(" chaque vente remplit une tournée déjà prévue.")}
              </p>
              <p>
                <b>
                  {t("Boost au résultat\u00A0:")}
                </b>
                {t(" sur les seules ventes venues de l’emplacement, vous gardez 3\u00A0% du prix en moins, soit 600\u00A0F sur un ITEL à 20\u00A0000\u00A0F.")}
              </p>
              <p>
                <b>
                  {t("Campagne «\u00A0favoris\u00A0»\u00A0:")}
                </b>
                {t(" un message sur une baisse de prix ou un retour en stock.")}
              </p>
              <p>
                <b>
                  {t("Vente flash\u00A0:")}
                </b>
                {t(" créneaux et zones choisis par BelivaY pour remplir les tournées.")}
              </p>
              <p className="b8" style={{ "marginTop": "14px" }}>
                {t("Les garde-fous")}
              </p>
              <p>
                {t("La recherche ne se vend pas\u00A0: aucun contenu payé dans les résultats, ni dans l’attribution d’une commande.")}
              </p>
              <p>
                {t("Pas de visibilité sans stock, ni sous 50 de Trust Score.")}
              </p>
              <p>
                {t("Une carte sponsorisée sur six au plus.")}
              </p>
              <p>
                {t("10 à 20\u00A0% des emplacements sont réservés gratuitement aux nouveaux vendeurs.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "visibilite?achat=1":
      return (
        <Ecran route="visibilite" parEtat fixes={
          <>
          <div className="veil"></div>
          <div className="sheet">
            <div className="grab"></div>
            <div className="row" style={{ "gap": "8px" }}>
              <h3 style={{ "margin": "0", "fontSize": "19px", "fontWeight": "800" }}>
                {t("Mettre en avant l’ITEL AC52")}
              </h3>
            </div>
            <div className="mt8">
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic or" style={{ "width": "36px", "height": "36px", "borderRadius": "50%" }}>
                  <Icone nom="megaphone" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  {t("24\u00A0h dans la bande «\u00A0Sponsorisé\u00A0» de l’accueil et de la catégorie.")}
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic " style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "background": "var(--sand-3)" }}>
                  <Icone nom="smartphone" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  {t("Payé par Mobile Money (MTN\u00A0····\u00A04\u00A0217), confirmé sur votre téléphone.")}
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic " style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "background": "var(--sand-3)" }}>
                  <Icone nom="file-text" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  {t("La facture arrive dans Documents.")}
                </span>
              </div>
            </div>
            <div className="mt14">
              <Link to="/visibilite" className="btn primary">
                <Icone nom="smartphone" taille={18} />
                <span>
                  {t("Payer 500\u00A0F")}
                </span>
              </Link>
            </div>
            <div className="mt8">
              <Link to="/visibilite" className="btn ghost">
                <span>
                  {t("Annuler")}
                </span>
              </Link>
            </div>
          </div>
          </>
        }>
          <div className="pg">
            <h1 className="pg-t">
              {t("Se faire voir")}
            </h1>
            <p className="pg-s">
              {t("Des emplacements pour montrer vos offres. Toujours marqués «\u00A0Sponsorisé\u00A0», jamais dans la recherche.")}
            </p>
          </div>
          <div className="hero night">
            <div className="otop">
              <span className="hk">
                {t("Offert ce mois")}
              </span>
              <Icone nom="gift" taille={20} style={{ "color": "var(--gold-l)" }} />
            </div>
            <div className="b8 mt8" style={{ "fontSize": "20px", "lineHeight": "1.3" }}>
              {t("1 vente flash et 1 vitrine de quartier")}
            </div>
            <div className="hs">
              {t("Votre récompense\u00A0: votre ITEL AC52 à 18\u00A0900\u00A0F a le meilleur prix.")}
            </div>
          </div>
          <div className="card">
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic or">
                  <Icone nom="megaphone" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="row">
                  <span className="grow b8 t15">
                    {t("Mise en avant 24\u00A0h")}
                  </span>
                  <span className="b8 t15 cor">
                    {t("500\u00A0F")}
                  </span>
                </div>
                <div className="t13 c3 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Bande «\u00A0Sponsorisé\u00A0» de l’accueil et de la catégorie")}
                </div>
              </div>
            </div>
            <div className="mt12">
              <Link to="/visibilite?achat=1" className="btn primary">
                <Icone nom="megaphone" taille={18} />
                <span>
                  {t("Mettre en avant l’ITEL AC52")}
                </span>
              </Link>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("Autres emplacements")}
            </h2>
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <div className="li">
              <span className="ic or">
                <Icone nom="layers" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Boost de catégorie · 7\u00A0jours")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("En tête de la bande «\u00A0Sponsorisé\u00A0» de la catégorie")}
                </span>
              </span>
              <span className="b8 t14 cor nw" style={{ "alignSelf": "flex-start", "marginTop": "2px" }}>
                {t("2\u00A0000\u00A0F")}
              </span>
            </div>
            <div className="li">
              <span className="ic or">
                <Icone nom="store" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Vitrine de quartier · 7\u00A0jours")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Montrée aux clients dont le relais est dans votre zone")}
                </span>
              </span>
              <span className="b8 t14 cor nw" style={{ "alignSelf": "flex-start", "marginTop": "2px" }}>
                {t("1\u00A0500\u00A0F")}
              </span>
            </div>
            <div className="li">
              <span className="ic or">
                <Icone nom="target" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Boost au résultat")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vous ne payez que si vous vendez")}
                </span>
              </span>
              <span className="b8 t14 cor nw" style={{ "alignSelf": "flex-start", "marginTop": "2px" }}>
                {t("0\u00A0F d’avance")}
              </span>
            </div>
            <div className="li">
              <span className="ic or">
                <Icone nom="heart" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Campagne «\u00A0favoris\u00A0»")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Prévient les clients qui ont gardé votre produit")}
                </span>
              </span>
              <span className="b8 t14 cor nw" style={{ "alignSelf": "flex-start", "marginTop": "2px" }}>
                {t("25\u00A0F / client")}
              </span>
            </div>
            <div className="li">
              <span className="ic or">
                <Icone nom="zap" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Vente flash")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Remise réelle de 10\u00A0% au moins")}
                </span>
              </span>
              <span className="b8 t14 cor nw" style={{ "alignSelf": "flex-start", "marginTop": "2px" }}>
                {t("Gratuite")}
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
              <p>
                <b>
                  {t("Vitrine de quartier\u00A0:")}
                </b>
                {t(" chaque vente remplit une tournée déjà prévue.")}
              </p>
              <p>
                <b>
                  {t("Boost au résultat\u00A0:")}
                </b>
                {t(" sur les seules ventes venues de l’emplacement, vous gardez 3\u00A0% du prix en moins, soit 600\u00A0F sur un ITEL à 20\u00A0000\u00A0F.")}
              </p>
              <p>
                <b>
                  {t("Campagne «\u00A0favoris\u00A0»\u00A0:")}
                </b>
                {t(" un message sur une baisse de prix ou un retour en stock.")}
              </p>
              <p>
                <b>
                  {t("Vente flash\u00A0:")}
                </b>
                {t(" créneaux et zones choisis par BelivaY pour remplir les tournées.")}
              </p>
              <p className="b8" style={{ "marginTop": "14px" }}>
                {t("Les garde-fous")}
              </p>
              <p>
                {t("La recherche ne se vend pas\u00A0: aucun contenu payé dans les résultats, ni dans l’attribution d’une commande.")}
              </p>
              <p>
                {t("Pas de visibilité sans stock, ni sous 50 de Trust Score.")}
              </p>
              <p>
                {t("Une carte sponsorisée sur six au plus.")}
              </p>
              <p>
                {t("10 à 20\u00A0% des emplacements sont réservés gratuitement aux nouveaux vendeurs.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}

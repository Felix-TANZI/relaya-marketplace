// Page provisoire « Commandes reçues » (VD-05) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (10 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Commandes() {
  const { t } = usePreferences()
  switch (useEtat("commandes")) {
    case "commandes?role=prep":
    case "commandes?pop=profil":
    case "commandes?f=prep":
    default:
      return (
        <Ecran route="commandes" parEtat>
          <div className="row" style={{ "alignItems": "flex-start" }}>
            <div className="grow">
              <div className="pg">
                <h1 className="pg-t">
                  {t("Commandes reçues")}
                </h1>
                <p className="pg-s">
                  {t("9\u00A0commandes · 2 à préparer · 2 en litige · 1 en retour · 4 terminées")}
                </p>
              </div>
            </div>
            <button type="button" className="ibtn" aria-label="Exporter, factures" style={{ "width": "44px", "height": "44px", "marginTop": "12px", "background": "var(--card)", "boxShadow": "var(--shadow-card)" }}>
              <Icone nom="ellipsis-vertical" taille={20} />
            </button>
          </div>
          <div className="seg stack">
            <Link to="/commandes?f=prep" className="on">
              <b>
                {t("2")}
              </b>
              <span>
                {t("À préparer")}
              </span>
            </Link>
            <Link to="/commandes?f=cours" className="">
              <b>
                {t("0")}
              </b>
              <span>
                {t("En cours")}
              </span>
            </Link>
            <Link to="/commandes?f=fin" className="">
              <b>
                {t("4")}
              </b>
              <span>
                {t("Terminées")}
              </span>
            </Link>
            <Link to="/commandes?f=pb" className="">
              <b>
                {t("3")}
              </b>
              <span>
                {t("Problèmes")}
              </span>
            </Link>
          </div>
          <div className="card ord">
            <Link to="/commande?ref=BLV-00008" style={{ "display": "block" }}>
              <div className="otop">
                <span className="row b8 t15" style={{ "gap": "6px" }}>
                  <Icone nom="timer" taille={17} style={{ "color": "var(--or-txt)" }} />
                  <span>
                    {t("Prête avant 12\u00A0h\u00A042")}
                  </span>
                </span>
                <span className="cd">
                  {t("il reste 2\u00A0h\u00A054")}
                </span>
              </div>
              <div className="art">
                <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                  <Dessin id="529c6ff24ab4" />
                </span>
                <div className="grow">
                  <div className="an">
                    {t("ITEL AC52 · ")}
                    <span style={{ "letterSpacing": ".02em" }}>
                      {t("NOIR")}
                    </span>
                  </div>
                  <div className="av">
                    {t("Neuf · ×1 · colis S · 20\u00A0000\u00A0F")}
                  </div>
                  <div className="av">
                    {t("BLV-00008 · payée à 08\u00A0h\u00A042")}
                  </div>
                </div>
                <span className="c4" style={{ "flexShrink": "0" }}>
                  <Icone nom="chevron-right" taille={20} />
                </span>
              </div>
              <div className="keep">
                <span className="kl">
                  {t("Vous gardez")}
                </span>
                <span className="kv2">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
            </Link>
            <div className="row mt10 t13 c3" style={{ "gap": "8px" }}>
              <Icone nom="truck" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Livreur Serge M. chez vous entre 14\u00A0h et 16\u00A0h")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/commande_prete?ref=BLV-00008" className="btn primary">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "marginTop": "4px", "gap": "4px" }}>
              <Link to="/rupture?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 4px" }}>
                {t("Rupture")}
              </Link>
              <span className="c4" aria-hidden="true" style={{ "alignSelf": "center" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 4px" }}>
                {t("Plus de temps")}
              </Link>
              <span className="c4" aria-hidden="true" style={{ "alignSelf": "center" }}>
                {t("·")}
              </span>
              <Link to="/bon?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 4px" }}>
                {t("Bon de préparation")}
              </Link>
            </div>
          </div>
          <div className="card ord amber">
            <Link to="/commande?ref=BLV-00009" style={{ "display": "block" }}>
              <div className="otop">
                <span className="row b8 t15" style={{ "gap": "6px" }}>
                  <Icone nom="timer" taille={17} style={{ "color": "var(--or-txt)" }} />
                  <span>
                    {t("Prête avant 13\u00A0h\u00A005")}
                  </span>
                </span>
                <span className="cd">
                  {t("il reste 3\u00A0h\u00A017")}
                </span>
              </div>
              <div className="meta">
                <span className="pill amber sm">
                  <Icone nom="hand-coins" taille={13} />
                  {t("Payable au retrait")}
                </span>
              </div>
              <div className="art">
                <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                  <Dessin id="529c6ff24ab4" />
                </span>
                <div className="grow">
                  <div className="an">
                    {t("ITEL AC52 · ")}
                    <span style={{ "letterSpacing": ".02em" }}>
                      {t("NOIR")}
                    </span>
                  </div>
                  <div className="av">
                    {t("Neuf · ×1 · colis S · 20\u00A0000\u00A0F")}
                  </div>
                  <div className="av">
                    {t("BLV-00009 · validée à 09\u00A0h\u00A005")}
                  </div>
                </div>
                <span className="c4" style={{ "flexShrink": "0" }}>
                  <Icone nom="chevron-right" taille={20} />
                </span>
              </div>
              <div className="keep" style={{ "gap": "10px", "background": "var(--amber-soft)", "borderColor": "var(--amber-line)" }}>
                <span className="kl" style={{ "color": "var(--amber)" }}>
                  {t("Vous garderez · rien n’est encaissé")}
                </span>
                <span className="kv2" style={{ "color": "var(--amber)" }}>
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
            </Link>
            <div className="row mt10 t13 c3" style={{ "gap": "8px" }}>
              <Icone nom="truck" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Livreur Serge M. chez vous entre 14\u00A0h et 16\u00A0h")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/commande_prete?ref=BLV-00009" className="btn soft">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "marginTop": "4px", "gap": "4px" }}>
              <Link to="/rupture?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 4px" }}>
                {t("Rupture")}
              </Link>
              <span className="c4" aria-hidden="true" style={{ "alignSelf": "center" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 4px" }}>
                {t("Plus de temps")}
              </Link>
              <span className="c4" aria-hidden="true" style={{ "alignSelf": "center" }}>
                {t("·")}
              </span>
              <Link to="/bon?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 4px" }}>
                {t("Bon de préparation")}
              </Link>
            </div>
          </div>
          <p className="t12 c3 center" style={{ "margin": "16px 10px 0", "lineHeight": "1.5" }}>
            <Icone nom="shield-check" taille={14} style={{ "verticalAlign": "-2px" }} />
            {t(" Vous ne voyez ni le client, ni son quartier, ni son relais.")}
            <br />
            {t("Le client ne voit pas votre boutique.")}
          </p>
        </Ecran>
      )
    case "commandes?f=cours":
    case "commandes?f=cours&pop=profil":
      return (
        <Ecran route="commandes" parEtat>
          <div className="row" style={{ "alignItems": "flex-start" }}>
            <div className="grow">
              <div className="pg">
                <h1 className="pg-t">
                  {t("Commandes reçues")}
                </h1>
                <p className="pg-s">
                  {t("9\u00A0commandes · 2 à préparer · 2 en litige · 1 en retour · 4 terminées")}
                </p>
              </div>
            </div>
            <button type="button" className="ibtn" aria-label="Exporter, factures" style={{ "width": "44px", "height": "44px", "marginTop": "12px", "background": "var(--card)", "boxShadow": "var(--shadow-card)" }}>
              <Icone nom="ellipsis-vertical" taille={20} />
            </button>
          </div>
          <div className="seg stack">
            <Link to="/commandes?f=prep" className="">
              <b>
                {t("2")}
              </b>
              <span>
                {t("À préparer")}
              </span>
            </Link>
            <Link to="/commandes?f=cours" className="on">
              <b>
                {t("0")}
              </b>
              <span>
                {t("En cours")}
              </span>
            </Link>
            <Link to="/commandes?f=fin" className="">
              <b>
                {t("4")}
              </b>
              <span>
                {t("Terminées")}
              </span>
            </Link>
            <Link to="/commandes?f=pb" className="">
              <b>
                {t("3")}
              </b>
              <span>
                {t("Problèmes")}
              </span>
            </Link>
          </div>
          <div className="card ">
            <div className="empty">
              <div className="ei">
                <Icone nom="truck" taille={26} />
              </div>
              <h3>
                {t("Aucune commande en route")}
              </h3>
              <p>
                {t("Une commande remise au livreur reste ici jusqu’au retrait par le client.")}
              </p>
              <div className="mt14">
                <Link to="/commandes?f=prep" className="btn primary">
                  <Icone nom="package" taille={18} />
                  <span>
                    {t("Voir les 2\u00A0commandes à préparer")}
                  </span>
                </Link>
              </div>
            </div>
          </div>
          <p className="t12 c3 center" style={{ "margin": "16px 10px 0", "lineHeight": "1.5" }}>
            <Icone nom="shield-check" taille={14} style={{ "verticalAlign": "-2px" }} />
            {t(" Vous ne voyez ni le client, ni son quartier, ni son relais.")}
            <br />
            {t("Le client ne voit pas votre boutique.")}
          </p>
        </Ecran>
      )
    case "commandes?f=fin":
    case "commandes?f=fin&pop=profil":
      return (
        <Ecran route="commandes" parEtat>
          <div className="row" style={{ "alignItems": "flex-start" }}>
            <div className="grow">
              <div className="pg">
                <h1 className="pg-t">
                  {t("Commandes reçues")}
                </h1>
                <p className="pg-s">
                  {t("9\u00A0commandes · 2 à préparer · 2 en litige · 1 en retour · 4 terminées")}
                </p>
              </div>
            </div>
            <button type="button" className="ibtn" aria-label="Exporter, factures" style={{ "width": "44px", "height": "44px", "marginTop": "12px", "background": "var(--card)", "boxShadow": "var(--shadow-card)" }}>
              <Icone nom="ellipsis-vertical" taille={20} />
            </button>
          </div>
          <div className="seg stack">
            <Link to="/commandes?f=prep" className="">
              <b>
                {t("2")}
              </b>
              <span>
                {t("À préparer")}
              </span>
            </Link>
            <Link to="/commandes?f=cours" className="">
              <b>
                {t("0")}
              </b>
              <span>
                {t("En cours")}
              </span>
            </Link>
            <Link to="/commandes?f=fin" className="on">
              <b>
                {t("4")}
              </b>
              <span>
                {t("Terminées")}
              </span>
            </Link>
            <Link to="/commandes?f=pb" className="">
              <b>
                {t("3")}
              </b>
              <span>
                {t("Problèmes")}
              </span>
            </Link>
          </div>
          <Link to="/recu" className="card ord " style={{ "display": "block" }}>
            <div className="otop">
              <span className="pill or sm">
                {t("Se libère aujourd’hui à 18\u00A0h")}
              </span>
              <span className="oref">
                {t("BLV-00007")}
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
                  {t("Livrée le 10 oct.")}
                </div>
                <div className="av">
                  {t("Confirmée par le client")}
                </div>
              </div>
              <div className="right" style={{ "flexShrink": "0" }}>
                <div className="t12 b7 c3">
                  {t("Vous gardez")}
                </div>
                <div className="b8 t15 mt4">
                  {t("17\u00A0840\u00A0F")}
                </div>
              </div>
            </div>
          </Link>
          <Link to="/recu" className="card ord green" style={{ "display": "block" }}>
            <div className="otop">
              <span className="pill green sm">
                {t("À verser samedi 17 oct.")}
              </span>
              <span className="oref">
                {t("BLV-00003")}
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
                  {t("Livrée le 9 oct.")}
                </div>
                <div className="av">
                  {t("Libérée le 12 oct.")}
                </div>
              </div>
              <div className="right" style={{ "flexShrink": "0" }}>
                <div className="t12 b7 c3">
                  {t("Vous gardez")}
                </div>
                <div className="b8 t15 mt4">
                  {t("17\u00A0840\u00A0F")}
                </div>
              </div>
            </div>
          </Link>
          <Link to="/recu" className="card ord ink" style={{ "display": "block" }}>
            <div className="otop">
              <span className="pill ink sm">
                {t("Versé le 10 oct.")}
              </span>
              <span className="oref">
                {t("BLV-00002")}
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
                  {t("Livrée le 3 oct.")}
                </div>
                <div className="av">
                  {t("Versement BLV-VS-3612")}
                </div>
              </div>
              <div className="right" style={{ "flexShrink": "0" }}>
                <div className="t12 b7 c3">
                  {t("Vous gardez")}
                </div>
                <div className="b8 t15 mt4">
                  {t("17\u00A0840\u00A0F")}
                </div>
              </div>
            </div>
          </Link>
          <Link to="/recu" className="card ord ink" style={{ "display": "block" }}>
            <div className="otop">
              <span className="pill ink sm">
                {t("Versé le 26 sept.")}
              </span>
              <span className="oref">
                {t("BLV-00001")}
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
                  {t("Livrée le 19 sept.")}
                </div>
                <div className="av">
                  {t("Versement BLV-VS-3204")}
                </div>
              </div>
              <div className="right" style={{ "flexShrink": "0" }}>
                <div className="t12 b7 c3">
                  {t("Vous gardez")}
                </div>
                <div className="b8 t15 mt4">
                  {t("17\u00A0840\u00A0F")}
                </div>
              </div>
            </div>
          </Link>
          <p className="t12 c3 center" style={{ "margin": "16px 10px 0", "lineHeight": "1.5" }}>
            <Icone nom="shield-check" taille={14} style={{ "verticalAlign": "-2px" }} />
            {t(" Vous ne voyez ni le client, ni son quartier, ni son relais.")}
            <br />
            {t("Le client ne voit pas votre boutique.")}
          </p>
        </Ecran>
      )
    case "commandes?f=pb":
    case "commandes?f=pb&pop=profil":
      return (
        <Ecran route="commandes" parEtat>
          <div className="row" style={{ "alignItems": "flex-start" }}>
            <div className="grow">
              <div className="pg">
                <h1 className="pg-t">
                  {t("Commandes reçues")}
                </h1>
                <p className="pg-s">
                  {t("9\u00A0commandes · 2 à préparer · 2 en litige · 1 en retour · 4 terminées")}
                </p>
              </div>
            </div>
            <button type="button" className="ibtn" aria-label="Exporter, factures" style={{ "width": "44px", "height": "44px", "marginTop": "12px", "background": "var(--card)", "boxShadow": "var(--shadow-card)" }}>
              <Icone nom="ellipsis-vertical" taille={20} />
            </button>
          </div>
          <div className="seg stack">
            <Link to="/commandes?f=prep" className="">
              <b>
                {t("2")}
              </b>
              <span>
                {t("À préparer")}
              </span>
            </Link>
            <Link to="/commandes?f=cours" className="">
              <b>
                {t("0")}
              </b>
              <span>
                {t("En cours")}
              </span>
            </Link>
            <Link to="/commandes?f=fin" className="">
              <b>
                {t("4")}
              </b>
              <span>
                {t("Terminées")}
              </span>
            </Link>
            <Link to="/commandes?f=pb" className="on">
              <b>
                {t("3")}
              </b>
              <span>
                {t("Problèmes")}
              </span>
            </Link>
          </div>
          <Link to="/litige?ref=BLV-00005" className="card ord red" style={{ "display": "block" }}>
            <div className="otop">
              <span className="pill red sm">
                <Icone nom="lock" taille={13} />
                {t("Litige — gelé")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 19\u00A0h\u00A042")}
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
                  {t("BLV-00005 · «\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
              </div>
              <div className="right" style={{ "flexShrink": "0" }}>
                <div className="t12 b7 c3">
                  {t("Gelé")}
                </div>
                <div className="b8 t15 cr mt4">
                  {t("335\u00A0324\u00A0F")}
                </div>
              </div>
            </div>
            <div className="mt12">
              <button type="button" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre au litige")}
                </span>
              </button>
            </div>
          </Link>
          <Link to="/litige?ref=BLV-00006" className="card ord red" style={{ "display": "block" }}>
            <div className="otop">
              <span className="pill red sm">
                <Icone nom="lock" taille={13} />
                {t("Litige — gelé")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 44\u00A0h\u00A014")}
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
                  {t("BLV-00006 · «\u00A0Colis abîmé\u00A0»")}
                </div>
              </div>
              <div className="right" style={{ "flexShrink": "0" }}>
                <div className="t12 b7 c3">
                  {t("Gelé")}
                </div>
                <div className="b8 t15 cr mt4">
                  {t("335\u00A0324\u00A0F")}
                </div>
              </div>
            </div>
            <div className="mt12">
              <button type="button" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre au litige")}
                </span>
              </button>
            </div>
          </Link>
          <Link to="/retours" className="card ord red" style={{ "display": "block" }}>
            <div className="otop">
              <span className="pill red sm">
                <Icone nom="lock" taille={13} />
                {t("En retour — gelé")}
              </span>
              <span className="cd" style={{ "color": "var(--ink-3)" }}>
                <Icone nom="truck" taille={14} />
                {t("arrive mer. 14")}
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
                  {t("BLV-00004 · défaut caché · inspection 48\u00A0h à réception")}
                </div>
              </div>
              <div className="right" style={{ "flexShrink": "0" }}>
                <div className="t12 b7 c3">
                  {t("Gelé")}
                </div>
                <div className="b8 t15 cr mt4">
                  {t("17\u00A0840\u00A0F")}
                </div>
              </div>
            </div>
            <div className="row mt8 t14 b8 cor" style={{ "justifyContent": "center", "minHeight": "44px", "gap": "4px" }}>
              {t("Voir le retour")}
              <Icone nom="chevron-right" taille={16} />
            </div>
          </Link>
          <p className="t12 c3 center" style={{ "margin": "16px 10px 0", "lineHeight": "1.5" }}>
            <Icone nom="shield-check" taille={14} style={{ "verticalAlign": "-2px" }} />
            {t(" Vous ne voyez ni le client, ni son quartier, ni son relais.")}
            <br />
            {t("Le client ne voit pas votre boutique.")}
          </p>
        </Ecran>
      )
  }
}

// Page provisoire « Accueil » (VD-04) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (9 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Accueil() {
  const { t } = usePreferences()
  switch (useEtat("accueil")) {
    case "accueil?pop=profil":
    default:
      return (
        <Ecran route="accueil" parEtat>
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
              {t("Cinq choses à faire")}
            </h1>
            <p className="pg-s">
              {t("La plus urgente d’abord")}
            </p>
          </div>
          <div className="meta" style={{ "marginTop": "10px" }}>
            <span className="pill or">
              {t("2 à préparer")}
            </span>
            <span className="pill red">
              {t("2 litiges")}
            </span>
            <span className="pill ink">
              {t("1 retour")}
            </span>
          </div>
          <div className="hero orange">
            <div className="otop">
              <span className="hk" style={{ "color": "#fff" }}>
                {t("À préparer · BLV-00008")}
              </span>
              <span className="pill" style={{ "background": "var(--braise-2)", "color": "#fff", "borderColor": "rgba(255,255,255,.35)" }}>
                <Icone nom="timer" taille={13} />
                {t("il reste 2\u00A0h\u00A054")}
              </span>
            </div>
            <div className="art" style={{ "marginTop": "12px" }}>
              <span className="thumb" style={{ "width": "60px", "height": "60px", "borderRadius": "15px" }}>
                <Dessin id="49f8d8f86c84" />
              </span>
              <div className="grow">
                <div className="an" style={{ "color": "#fff", "fontSize": "21px" }}>
                  {t("ITEL AC52 · NOIR")}
                </div>
                <div className="av" style={{ "color": "#fff" }}>
                  {t("Neuf · ×1 · colis S · payée à 08\u00A0h\u00A042")}
                </div>
              </div>
            </div>
            <div className="row t14" style={{ "gap": "8px", "marginTop": "14px", "color": "#fff" }}>
              <Icone nom="clock" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Prête avant ")}
                <b>
                  {t("12\u00A0h\u00A042")}
                </b>
              </span>
            </div>
            <div className="row t14" style={{ "gap": "8px", "marginTop": "6px", "color": "#fff" }}>
              <Icone nom="truck" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Livreur chez vous ")}
                <b>
                  {t("entre 14\u00A0h et 16\u00A0h")}
                </b>
              </span>
            </div>
            <div className="row" style={{ "marginTop": "12px", "padding": "10px 12px", "borderRadius": "12px", "background": "var(--braise-2)", "border": "1px solid rgba(255,255,255,.25)" }}>
              <span className="grow t14 b7">
                {t("Vous gardez")}
              </span>
              <span className="b8" style={{ "fontSize": "22px", "letterSpacing": "-.02em" }}>
                {t("17\u00A0840\u00A0F")}
              </span>
            </div>
            <div style={{ "marginTop": "12px" }}>
              <Link to="/commande_prete?ref=BLV-00008" className="btn white">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "margin": "2px 0 -10px", "alignItems": "center", "gap": "2px" }}>
              <Link to="/rupture?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Rupture")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Plus de temps")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/commande?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Détail")}
              </Link>
            </div>
          </div>
          <div className="card ord amber">
            <div className="otop">
              <span className="oref">
                {t("À PRÉPARER · BLV-00009")}
              </span>
              <span className="cd">
                <Icone nom="timer" taille={14} />
                {t("il reste 3\u00A0h\u00A017")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Neuf · ×1 · colis S · validée à 09\u00A0h\u00A005")}
                </div>
              </div>
            </div>
            <div className="row t13 c2" style={{ "gap": "8px", "marginTop": "10px", "lineHeight": "1.4" }}>
              <Icone nom="clock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span>
                {t("Prête avant ")}
                <b>
                  {t("13\u00A0h\u00A005")}
                </b>
                {t(" · livreur ")}
                <b>
                  {t("14\u00A0h – 16\u00A0h")}
                </b>
              </span>
            </div>
            <div className="keep" style={{ "display": "block", "background": "var(--amber-soft)", "borderColor": "var(--amber-line)" }}>
              <div className="row" style={{ "gap": "8px" }}>
                <Icone nom="hand-coins" taille={16} style={{ "color": "var(--amber)", "flexShrink": "0" }} />
                <span className="grow kl" style={{ "color": "var(--amber)", "fontSize": "13px" }}>
                  {t("Vous garderez")}
                </span>
                <span className="kv2" style={{ "color": "var(--amber)", "fontSize": "18px" }}>
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="t13 c2" style={{ "marginTop": "6px", "lineHeight": "1.45" }}>
                <b>
                  {t("Payable au retrait.")}
                </b>
                {t(" Rien n’est encaissé\u00A0: préparez-la pareil. Un refus ou un non-retrait ne vous coûte rien.")}
              </div>
            </div>
            <div className="mt12">
              <Link to="/commande_prete?ref=BLV-00009" className="btn soft">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "margin": "2px 0 -10px", "alignItems": "center", "gap": "2px" }}>
              <Link to="/rupture?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Rupture")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Plus de temps")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/commande?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Détail")}
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00005")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 19\u00A0h\u00A042")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("Le client dit\u00A0: «\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "gap": "8px", "marginTop": "10px", "padding": "9px 12px", "borderRadius": "12px", "background": "var(--sand-2)", "border": "1px solid var(--line-2)" }}>
              <Icone nom="lock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow t13 b7 c2">
                {t("Gelé jusqu’à la décision")}
              </span>
              <span className="b8 t15">
                {t("335\u00A0324\u00A0F")}
              </span>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Répondez avant ")}
              <b>
                {t("demain à 05\u00A0h\u00A030")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00005" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00006")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 44\u00A0h\u00A014")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("Le client dit\u00A0: «\u00A0Colis abîmé\u00A0»")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "gap": "8px", "marginTop": "10px", "padding": "9px 12px", "borderRadius": "12px", "background": "var(--sand-2)", "border": "1px solid var(--line-2)" }}>
              <Icone nom="lock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow t13 b7 c2">
                {t("Gelé jusqu’à la décision")}
              </span>
              <span className="b8 t15">
                {t("335\u00A0324\u00A0F")}
              </span>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Répondez avant ")}
              <b>
                {t("jeudi 15 oct. à 06\u00A0h\u00A002")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00006" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord ink">
            <div className="otop">
              <span className="oref">
                {t("RETOUR · BLV-00004")}
              </span>
              <span className="cd" style={{ "color": "var(--ink-3)" }}>
                <Icone nom="truck" taille={14} />
                {t("arrive demain")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Motif\u00A0: défaut caché, signalé 30\u00A0h après le retrait")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "gap": "8px", "marginTop": "10px", "padding": "9px 12px", "borderRadius": "12px", "background": "var(--sand-2)", "border": "1px solid var(--line-2)" }}>
              <Icone nom="lock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow t13 b7 c2">
                {t("Gelé jusqu’à l’inspection")}
              </span>
              <span className="b8 t15">
                {t("17\u00A0840\u00A0F")}
              </span>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Livré chez vous mercredi 14 entre 14\u00A0h et 16\u00A0h. Vous aurez 48\u00A0h pour l’inspecter.")}
            </p>
            <div className="mt12">
              <Link to="/retours" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="undo-2" taille={18} />
                <span>
                  {t("Voir le retour")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card flat tight" style={{ "marginTop": "18px" }}>
            <Link to="/offre_detail" className="li">
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Stock bas · ITEL AC52")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("3 restants, seuil réglé à 5")}
                  <b className="cor" style={{ "display": "block", "marginTop": "2px" }}>
                    {t("Réapprovisionner")}
                  </b>
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="foot">
            <Icone nom="wifi" taille={16} />
            <span>
              {t("Connecté · aucune action en attente d’envoi")}
            </span>
          </div>
        </Ecran>
      )
    case "accueil?closed=1":
    case "accueil?closed=1&pop=profil":
      return (
        <Ecran route="accueil" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Bonjour Franck · mardi 13 octobre")}
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--red-line)", "background": "var(--red-soft)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--card)", "color": "var(--red)" }}>
                <Icone nom="calendar-x" taille={20} />
              </span>
              <div className="grow">
                <div className="b8 t15 cr">
                  {t("Boutique fermée aujourd’hui")}
                </div>
                <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Les nouvelles commandes vont à d’autres vendeurs jusqu’à demain 08\u00A0h.")}
                </div>
                <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Les 2\u00A0commandes déjà reçues restent à préparer.")}
                </div>
              </div>
            </div>
            <div className="mt12">
              <Link to="/" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="store" taille={18} />
                <span>
                  {t("Rouvrir maintenant")}
                </span>
              </Link>
            </div>
          </div>
          <div className="pg" style={{ "paddingTop": "18px" }}>
            <h1 className="pg-t">
              {t("Cinq choses à faire")}
            </h1>
            <p className="pg-s">
              {t("La plus urgente d’abord")}
            </p>
          </div>
          <div className="meta" style={{ "marginTop": "10px" }}>
            <span className="pill or">
              {t("2 à préparer")}
            </span>
            <span className="pill red">
              {t("2 litiges")}
            </span>
            <span className="pill ink">
              {t("1 retour")}
            </span>
          </div>
          <div className="hero orange">
            <div className="otop">
              <span className="hk" style={{ "color": "#fff" }}>
                {t("À préparer · BLV-00008")}
              </span>
              <span className="pill" style={{ "background": "var(--braise-2)", "color": "#fff", "borderColor": "rgba(255,255,255,.35)" }}>
                <Icone nom="timer" taille={13} />
                {t("il reste 2\u00A0h\u00A054")}
              </span>
            </div>
            <div className="art" style={{ "marginTop": "12px" }}>
              <span className="thumb" style={{ "width": "60px", "height": "60px", "borderRadius": "15px" }}>
                <Dessin id="49f8d8f86c84" />
              </span>
              <div className="grow">
                <div className="an" style={{ "color": "#fff", "fontSize": "21px" }}>
                  {t("ITEL AC52 · NOIR")}
                </div>
                <div className="av" style={{ "color": "#fff" }}>
                  {t("Neuf · ×1 · colis S · payée à 08\u00A0h\u00A042")}
                </div>
              </div>
            </div>
            <div className="row t14" style={{ "gap": "8px", "marginTop": "14px", "color": "#fff" }}>
              <Icone nom="clock" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Prête avant ")}
                <b>
                  {t("12\u00A0h\u00A042")}
                </b>
              </span>
            </div>
            <div className="row t14" style={{ "gap": "8px", "marginTop": "6px", "color": "#fff" }}>
              <Icone nom="truck" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Livreur chez vous ")}
                <b>
                  {t("entre 14\u00A0h et 16\u00A0h")}
                </b>
              </span>
            </div>
            <div className="row" style={{ "marginTop": "12px", "padding": "10px 12px", "borderRadius": "12px", "background": "var(--braise-2)", "border": "1px solid rgba(255,255,255,.25)" }}>
              <span className="grow t14 b7">
                {t("Vous gardez")}
              </span>
              <span className="b8" style={{ "fontSize": "22px", "letterSpacing": "-.02em" }}>
                {t("17\u00A0840\u00A0F")}
              </span>
            </div>
            <div style={{ "marginTop": "12px" }}>
              <Link to="/commande_prete?ref=BLV-00008" className="btn white">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "margin": "2px 0 -10px", "alignItems": "center", "gap": "2px" }}>
              <Link to="/rupture?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Rupture")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Plus de temps")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/commande?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Détail")}
              </Link>
            </div>
          </div>
          <div className="card ord amber">
            <div className="otop">
              <span className="oref">
                {t("À PRÉPARER · BLV-00009")}
              </span>
              <span className="cd">
                <Icone nom="timer" taille={14} />
                {t("il reste 3\u00A0h\u00A017")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Neuf · ×1 · colis S · validée à 09\u00A0h\u00A005")}
                </div>
              </div>
            </div>
            <div className="row t13 c2" style={{ "gap": "8px", "marginTop": "10px", "lineHeight": "1.4" }}>
              <Icone nom="clock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span>
                {t("Prête avant ")}
                <b>
                  {t("13\u00A0h\u00A005")}
                </b>
                {t(" · livreur ")}
                <b>
                  {t("14\u00A0h – 16\u00A0h")}
                </b>
              </span>
            </div>
            <div className="keep" style={{ "display": "block", "background": "var(--amber-soft)", "borderColor": "var(--amber-line)" }}>
              <div className="row" style={{ "gap": "8px" }}>
                <Icone nom="hand-coins" taille={16} style={{ "color": "var(--amber)", "flexShrink": "0" }} />
                <span className="grow kl" style={{ "color": "var(--amber)", "fontSize": "13px" }}>
                  {t("Vous garderez")}
                </span>
                <span className="kv2" style={{ "color": "var(--amber)", "fontSize": "18px" }}>
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="t13 c2" style={{ "marginTop": "6px", "lineHeight": "1.45" }}>
                <b>
                  {t("Payable au retrait.")}
                </b>
                {t(" Rien n’est encaissé\u00A0: préparez-la pareil. Un refus ou un non-retrait ne vous coûte rien.")}
              </div>
            </div>
            <div className="mt12">
              <Link to="/commande_prete?ref=BLV-00009" className="btn soft">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "margin": "2px 0 -10px", "alignItems": "center", "gap": "2px" }}>
              <Link to="/rupture?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Rupture")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Plus de temps")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/commande?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Détail")}
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00005")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 19\u00A0h\u00A042")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("Le client dit\u00A0: «\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "gap": "8px", "marginTop": "10px", "padding": "9px 12px", "borderRadius": "12px", "background": "var(--sand-2)", "border": "1px solid var(--line-2)" }}>
              <Icone nom="lock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow t13 b7 c2">
                {t("Gelé jusqu’à la décision")}
              </span>
              <span className="b8 t15">
                {t("335\u00A0324\u00A0F")}
              </span>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Répondez avant ")}
              <b>
                {t("demain à 05\u00A0h\u00A030")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00005" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00006")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 44\u00A0h\u00A014")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("Le client dit\u00A0: «\u00A0Colis abîmé\u00A0»")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "gap": "8px", "marginTop": "10px", "padding": "9px 12px", "borderRadius": "12px", "background": "var(--sand-2)", "border": "1px solid var(--line-2)" }}>
              <Icone nom="lock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow t13 b7 c2">
                {t("Gelé jusqu’à la décision")}
              </span>
              <span className="b8 t15">
                {t("335\u00A0324\u00A0F")}
              </span>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Répondez avant ")}
              <b>
                {t("jeudi 15 oct. à 06\u00A0h\u00A002")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00006" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord ink">
            <div className="otop">
              <span className="oref">
                {t("RETOUR · BLV-00004")}
              </span>
              <span className="cd" style={{ "color": "var(--ink-3)" }}>
                <Icone nom="truck" taille={14} />
                {t("arrive demain")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Motif\u00A0: défaut caché, signalé 30\u00A0h après le retrait")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "gap": "8px", "marginTop": "10px", "padding": "9px 12px", "borderRadius": "12px", "background": "var(--sand-2)", "border": "1px solid var(--line-2)" }}>
              <Icone nom="lock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow t13 b7 c2">
                {t("Gelé jusqu’à l’inspection")}
              </span>
              <span className="b8 t15">
                {t("17\u00A0840\u00A0F")}
              </span>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Livré chez vous mercredi 14 entre 14\u00A0h et 16\u00A0h. Vous aurez 48\u00A0h pour l’inspecter.")}
            </p>
            <div className="mt12">
              <Link to="/retours" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="undo-2" taille={18} />
                <span>
                  {t("Voir le retour")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card flat tight" style={{ "marginTop": "18px" }}>
            <Link to="/offre_detail" className="li">
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Stock bas · ITEL AC52")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("3 restants, seuil réglé à 5")}
                  <b className="cor" style={{ "display": "block", "marginTop": "2px" }}>
                    {t("Réapprovisionner")}
                  </b>
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="foot">
            <Icone nom="wifi" taille={16} />
            <span>
              {t("Connecté · aucune action en attente d’envoi")}
            </span>
          </div>
        </Ecran>
      )
    case "accueil?alerte=1":
    case "accueil?alerte=1&pop=profil":
      return (
        <Ecran route="accueil" parEtat>
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
              {t("Cinq choses à faire")}
            </h1>
            <p className="pg-s">
              {t("La plus urgente d’abord")}
            </p>
          </div>
          <div className="meta" style={{ "marginTop": "10px" }}>
            <span className="pill or">
              {t("2 à préparer")}
            </span>
            <span className="pill red">
              {t("2 litiges")}
            </span>
            <span className="pill ink">
              {t("1 retour")}
            </span>
          </div>
          <div className="hero orange">
            <div className="otop">
              <span className="hk" style={{ "color": "#fff" }}>
                {t("À préparer · BLV-00008")}
              </span>
              <span className="pill" style={{ "background": "var(--braise-2)", "color": "#fff", "borderColor": "rgba(255,255,255,.35)" }}>
                <Icone nom="timer" taille={13} />
                {t("il reste 2\u00A0h\u00A054")}
              </span>
            </div>
            <div className="art" style={{ "marginTop": "12px" }}>
              <span className="thumb" style={{ "width": "60px", "height": "60px", "borderRadius": "15px" }}>
                <Dessin id="49f8d8f86c84" />
              </span>
              <div className="grow">
                <div className="an" style={{ "color": "#fff", "fontSize": "21px" }}>
                  {t("ITEL AC52 · NOIR")}
                </div>
                <div className="av" style={{ "color": "#fff" }}>
                  {t("Neuf · ×1 · colis S · payée à 08\u00A0h\u00A042")}
                </div>
              </div>
            </div>
            <div className="row t14" style={{ "gap": "8px", "marginTop": "14px", "color": "#fff" }}>
              <Icone nom="clock" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Prête avant ")}
                <b>
                  {t("12\u00A0h\u00A042")}
                </b>
              </span>
            </div>
            <div className="row t14" style={{ "gap": "8px", "marginTop": "6px", "color": "#fff" }}>
              <Icone nom="truck" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Livreur chez vous ")}
                <b>
                  {t("entre 14\u00A0h et 16\u00A0h")}
                </b>
              </span>
            </div>
            <div className="row" style={{ "marginTop": "12px", "padding": "10px 12px", "borderRadius": "12px", "background": "var(--braise-2)", "border": "1px solid rgba(255,255,255,.25)" }}>
              <span className="grow t14 b7">
                {t("Vous gardez")}
              </span>
              <span className="b8" style={{ "fontSize": "22px", "letterSpacing": "-.02em" }}>
                {t("17\u00A0840\u00A0F")}
              </span>
            </div>
            <div style={{ "marginTop": "12px" }}>
              <Link to="/commande_prete?ref=BLV-00008" className="btn white">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "margin": "2px 0 -10px", "alignItems": "center", "gap": "2px" }}>
              <Link to="/rupture?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Rupture")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Plus de temps")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/commande?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Détail")}
              </Link>
            </div>
          </div>
          <div className="card ord amber">
            <div className="otop">
              <span className="oref">
                {t("À PRÉPARER · BLV-00009")}
              </span>
              <span className="cd">
                <Icone nom="timer" taille={14} />
                {t("il reste 3\u00A0h\u00A017")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Neuf · ×1 · colis S · validée à 09\u00A0h\u00A005")}
                </div>
              </div>
            </div>
            <div className="row t13 c2" style={{ "gap": "8px", "marginTop": "10px", "lineHeight": "1.4" }}>
              <Icone nom="clock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span>
                {t("Prête avant ")}
                <b>
                  {t("13\u00A0h\u00A005")}
                </b>
                {t(" · livreur ")}
                <b>
                  {t("14\u00A0h – 16\u00A0h")}
                </b>
              </span>
            </div>
            <div className="keep" style={{ "display": "block", "background": "var(--amber-soft)", "borderColor": "var(--amber-line)" }}>
              <div className="row" style={{ "gap": "8px" }}>
                <Icone nom="hand-coins" taille={16} style={{ "color": "var(--amber)", "flexShrink": "0" }} />
                <span className="grow kl" style={{ "color": "var(--amber)", "fontSize": "13px" }}>
                  {t("Vous garderez")}
                </span>
                <span className="kv2" style={{ "color": "var(--amber)", "fontSize": "18px" }}>
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="t13 c2" style={{ "marginTop": "6px", "lineHeight": "1.45" }}>
                <b>
                  {t("Payable au retrait.")}
                </b>
                {t(" Rien n’est encaissé\u00A0: préparez-la pareil. Un refus ou un non-retrait ne vous coûte rien.")}
              </div>
            </div>
            <div className="mt12">
              <Link to="/commande_prete?ref=BLV-00009" className="btn soft">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "margin": "2px 0 -10px", "alignItems": "center", "gap": "2px" }}>
              <Link to="/rupture?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Rupture")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Plus de temps")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/commande?ref=BLV-00009" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Détail")}
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00005")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 19\u00A0h\u00A042")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("Le client dit\u00A0: «\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "gap": "8px", "marginTop": "10px", "padding": "9px 12px", "borderRadius": "12px", "background": "var(--sand-2)", "border": "1px solid var(--line-2)" }}>
              <Icone nom="lock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow t13 b7 c2">
                {t("Gelé jusqu’à la décision")}
              </span>
              <span className="b8 t15">
                {t("335\u00A0324\u00A0F")}
              </span>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Répondez avant ")}
              <b>
                {t("demain à 05\u00A0h\u00A030")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00005" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00006")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 44\u00A0h\u00A014")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("Le client dit\u00A0: «\u00A0Colis abîmé\u00A0»")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "gap": "8px", "marginTop": "10px", "padding": "9px 12px", "borderRadius": "12px", "background": "var(--sand-2)", "border": "1px solid var(--line-2)" }}>
              <Icone nom="lock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow t13 b7 c2">
                {t("Gelé jusqu’à la décision")}
              </span>
              <span className="b8 t15">
                {t("335\u00A0324\u00A0F")}
              </span>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Répondez avant ")}
              <b>
                {t("jeudi 15 oct. à 06\u00A0h\u00A002")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00006" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord ink">
            <div className="otop">
              <span className="oref">
                {t("RETOUR · BLV-00004")}
              </span>
              <span className="cd" style={{ "color": "var(--ink-3)" }}>
                <Icone nom="truck" taille={14} />
                {t("arrive demain")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Motif\u00A0: défaut caché, signalé 30\u00A0h après le retrait")}
                </div>
              </div>
            </div>
            <div className="row" style={{ "gap": "8px", "marginTop": "10px", "padding": "9px 12px", "borderRadius": "12px", "background": "var(--sand-2)", "border": "1px solid var(--line-2)" }}>
              <Icone nom="lock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span className="grow t13 b7 c2">
                {t("Gelé jusqu’à l’inspection")}
              </span>
              <span className="b8 t15">
                {t("17\u00A0840\u00A0F")}
              </span>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Livré chez vous mercredi 14 entre 14\u00A0h et 16\u00A0h. Vous aurez 48\u00A0h pour l’inspecter.")}
            </p>
            <div className="mt12">
              <Link to="/retours" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="undo-2" taille={18} />
                <span>
                  {t("Voir le retour")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card" style={{ "marginTop": "18px", "border": "1.5px solid var(--amber-line)", "background": "var(--amber-soft)", "boxShadow": "none" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--card)", "color": "var(--amber)" }}>
                <Icone nom="trending-up" taille={20} />
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Votre score approche de 65")}
                </div>
                <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Plus que 2 points pour passer Argent et garder 324\u00A0F de plus par ITEL.")}
                </div>
              </div>
            </div>
            <div className="t12 b8 ca" style={{ "marginTop": "14px", "letterSpacing": ".06em", "textTransform": "uppercase" }}>
              {t("Pour y arriver")}
            </div>
            <div className="row t13 c2" style={{ "gap": "10px", "marginTop": "8px", "lineHeight": "1.4", "alignItems": "flex-start" }}>
              <Icone nom="package-check" taille={16} style={{ "color": "var(--amber)", "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Préparez à l’heure les 2\u00A0commandes du jour")}
              </span>
            </div>
            <div className="row t13 c2" style={{ "gap": "10px", "marginTop": "8px", "lineHeight": "1.4", "alignItems": "flex-start" }}>
              <Icone nom="scale" taille={16} style={{ "color": "var(--amber)", "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Répondez aux 2 litiges avant l’échéance")}
              </span>
            </div>
            <div className="row t13 c2" style={{ "gap": "10px", "marginTop": "8px", "lineHeight": "1.4", "alignItems": "flex-start" }}>
              <Icone nom="truck" taille={16} style={{ "color": "var(--amber)", "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Encore 3\u00A0commandes livrées, pour arriver à 10")}
              </span>
            </div>
            <div className="row mt12" style={{ "gap": "4px" }}>
              <div className="grow">
                <Link to="/palier" style={{ "height": "44px" }} className="btn secondary">
                  <Icone nom="award" taille={18} />
                  <span>
                    {t("Voir mon palier")}
                  </span>
                </Link>
              </div>
              <Link to="/" className="t13 b7 c2" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 12px" }}>
                {t("Masquer")}
              </Link>
            </div>
          </div>
          <div className="card flat tight" style={{ "marginTop": "18px" }}>
            <Link to="/offre_detail" className="li">
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Stock bas · ITEL AC52")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("3 restants, seuil réglé à 5")}
                  <b className="cor" style={{ "display": "block", "marginTop": "2px" }}>
                    {t("Réapprovisionner")}
                  </b>
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="foot">
            <Icone nom="wifi" taille={16} />
            <span>
              {t("Connecté · aucune action en attente d’envoi")}
            </span>
          </div>
        </Ecran>
      )
    case "accueil?role=prep":
    case "accueil?pop=profil&role=prep":
      return (
        <Ecran route="accueil" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Bonjour Aïcha · accès Préparation")}
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
              <Link to="/?closed=1&role=prep" style={{ "height": "44px" }} className="btn secondary sm">
                <span>
                  {t("Fermer aujourd’hui")}
                </span>
              </Link>
            </div>
          </div>
          <div className="pg" style={{ "paddingTop": "18px" }}>
            <h1 className="pg-t">
              {t("Cinq choses à faire")}
            </h1>
            <p className="pg-s">
              {t("La plus urgente d’abord")}
            </p>
          </div>
          <div className="meta" style={{ "marginTop": "10px" }}>
            <span className="pill or">
              {t("2 à préparer")}
            </span>
            <span className="pill red">
              {t("2 litiges")}
            </span>
            <span className="pill ink">
              {t("1 retour")}
            </span>
          </div>
          <div className="hero orange">
            <div className="otop">
              <span className="hk" style={{ "color": "#fff" }}>
                {t("À préparer · BLV-00008")}
              </span>
              <span className="pill" style={{ "background": "var(--braise-2)", "color": "#fff", "borderColor": "rgba(255,255,255,.35)" }}>
                <Icone nom="timer" taille={13} />
                {t("il reste 2\u00A0h\u00A054")}
              </span>
            </div>
            <div className="art" style={{ "marginTop": "12px" }}>
              <span className="thumb" style={{ "width": "60px", "height": "60px", "borderRadius": "15px" }}>
                <Dessin id="49f8d8f86c84" />
              </span>
              <div className="grow">
                <div className="an" style={{ "color": "#fff", "fontSize": "21px" }}>
                  {t("ITEL AC52 · NOIR")}
                </div>
                <div className="av" style={{ "color": "#fff" }}>
                  {t("Neuf · ×1 · colis S · payée à 08\u00A0h\u00A042")}
                </div>
              </div>
            </div>
            <div className="row t14" style={{ "gap": "8px", "marginTop": "14px", "color": "#fff" }}>
              <Icone nom="clock" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Prête avant ")}
                <b>
                  {t("12\u00A0h\u00A042")}
                </b>
              </span>
            </div>
            <div className="row t14" style={{ "gap": "8px", "marginTop": "6px", "color": "#fff" }}>
              <Icone nom="truck" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Livreur chez vous ")}
                <b>
                  {t("entre 14\u00A0h et 16\u00A0h")}
                </b>
              </span>
            </div>
            <div style={{ "marginTop": "16px" }}>
              <Link to="/commande_prete?ref=BLV-00008&role=prep" className="btn white">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "margin": "2px 0 -10px", "alignItems": "center", "gap": "2px" }}>
              <Link to="/rupture?ref=BLV-00008&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Rupture")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00008&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Plus de temps")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/commande?ref=BLV-00008&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Détail")}
              </Link>
            </div>
          </div>
          <div className="card ord amber">
            <div className="otop">
              <span className="oref">
                {t("À PRÉPARER · BLV-00009")}
              </span>
              <span className="cd">
                <Icone nom="timer" taille={14} />
                {t("il reste 3\u00A0h\u00A017")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Neuf · ×1 · colis S · validée à 09\u00A0h\u00A005")}
                </div>
              </div>
            </div>
            <div className="row t13 c2" style={{ "gap": "8px", "marginTop": "10px", "lineHeight": "1.4" }}>
              <Icone nom="clock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span>
                {t("Prête avant ")}
                <b>
                  {t("13\u00A0h\u00A005")}
                </b>
                {t(" · livreur ")}
                <b>
                  {t("14\u00A0h – 16\u00A0h")}
                </b>
              </span>
            </div>
            <div className="row t13 c2" style={{ "gap": "8px", "marginTop": "10px", "lineHeight": "1.4" }}>
              <Icone nom="hand-coins" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span>
                <b>
                  {t("Payable au retrait\u00A0:")}
                </b>
                {t(" préparez-la pareil.")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/commande_prete?ref=BLV-00009&role=prep" className="btn soft">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "margin": "2px 0 -10px", "alignItems": "center", "gap": "2px" }}>
              <Link to="/rupture?ref=BLV-00009&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Rupture")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00009&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Plus de temps")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/commande?ref=BLV-00009&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Détail")}
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00005")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 19\u00A0h\u00A042")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("Le client dit\u00A0: «\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
              </div>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Répondez avant ")}
              <b>
                {t("demain à 05\u00A0h\u00A030")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00005&role=prep" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00006")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 44\u00A0h\u00A014")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("Le client dit\u00A0: «\u00A0Colis abîmé\u00A0»")}
                </div>
              </div>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Répondez avant ")}
              <b>
                {t("jeudi 15 oct. à 06\u00A0h\u00A002")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00006&role=prep" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord ink">
            <div className="otop">
              <span className="oref">
                {t("RETOUR · BLV-00004")}
              </span>
              <span className="cd" style={{ "color": "var(--ink-3)" }}>
                <Icone nom="truck" taille={14} />
                {t("arrive demain")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Motif\u00A0: défaut caché, signalé 30\u00A0h après le retrait")}
                </div>
              </div>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Livré chez vous mercredi 14 entre 14\u00A0h et 16\u00A0h. Vous aurez 48\u00A0h pour l’inspecter.")}
            </p>
            <div className="mt12">
              <Link to="/retours?role=prep" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="undo-2" taille={18} />
                <span>
                  {t("Voir le retour")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card flat tight" style={{ "marginTop": "18px" }}>
            <Link to="/offre_detail?role=prep" className="li">
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Stock bas · ITEL AC52")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("3 restants, seuil réglé à 5")}
                  <b className="cor" style={{ "display": "block", "marginTop": "2px" }}>
                    {t("Réapprovisionner")}
                  </b>
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="lock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Les montants et les versements sont réservés à Franck Penga, propriétaire.")}
            </span>
          </div>
          <div className="foot">
            <Icone nom="wifi" taille={16} />
            <span>
              {t("Connecté · aucune action en attente d’envoi")}
            </span>
          </div>
        </Ecran>
      )
    case "accueil?closed=1&role=prep":
      return (
        <Ecran route="accueil" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Bonjour Aïcha · accès Préparation")}
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--red-line)", "background": "var(--red-soft)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--card)", "color": "var(--red)" }}>
                <Icone nom="calendar-x" taille={20} />
              </span>
              <div className="grow">
                <div className="b8 t15 cr">
                  {t("Boutique fermée aujourd’hui")}
                </div>
                <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Les nouvelles commandes vont à d’autres vendeurs jusqu’à demain 08\u00A0h.")}
                </div>
                <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Les 2\u00A0commandes déjà reçues restent à préparer.")}
                </div>
              </div>
            </div>
            <div className="mt12">
              <Link to="/?role=prep" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="store" taille={18} />
                <span>
                  {t("Rouvrir maintenant")}
                </span>
              </Link>
            </div>
          </div>
          <div className="pg" style={{ "paddingTop": "18px" }}>
            <h1 className="pg-t">
              {t("Cinq choses à faire")}
            </h1>
            <p className="pg-s">
              {t("La plus urgente d’abord")}
            </p>
          </div>
          <div className="meta" style={{ "marginTop": "10px" }}>
            <span className="pill or">
              {t("2 à préparer")}
            </span>
            <span className="pill red">
              {t("2 litiges")}
            </span>
            <span className="pill ink">
              {t("1 retour")}
            </span>
          </div>
          <div className="hero orange">
            <div className="otop">
              <span className="hk" style={{ "color": "#fff" }}>
                {t("À préparer · BLV-00008")}
              </span>
              <span className="pill" style={{ "background": "var(--braise-2)", "color": "#fff", "borderColor": "rgba(255,255,255,.35)" }}>
                <Icone nom="timer" taille={13} />
                {t("il reste 2\u00A0h\u00A054")}
              </span>
            </div>
            <div className="art" style={{ "marginTop": "12px" }}>
              <span className="thumb" style={{ "width": "60px", "height": "60px", "borderRadius": "15px" }}>
                <Dessin id="49f8d8f86c84" />
              </span>
              <div className="grow">
                <div className="an" style={{ "color": "#fff", "fontSize": "21px" }}>
                  {t("ITEL AC52 · NOIR")}
                </div>
                <div className="av" style={{ "color": "#fff" }}>
                  {t("Neuf · ×1 · colis S · payée à 08\u00A0h\u00A042")}
                </div>
              </div>
            </div>
            <div className="row t14" style={{ "gap": "8px", "marginTop": "14px", "color": "#fff" }}>
              <Icone nom="clock" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Prête avant ")}
                <b>
                  {t("12\u00A0h\u00A042")}
                </b>
              </span>
            </div>
            <div className="row t14" style={{ "gap": "8px", "marginTop": "6px", "color": "#fff" }}>
              <Icone nom="truck" taille={16} style={{ "flexShrink": "0" }} />
              <span>
                {t("Livreur chez vous ")}
                <b>
                  {t("entre 14\u00A0h et 16\u00A0h")}
                </b>
              </span>
            </div>
            <div style={{ "marginTop": "16px" }}>
              <Link to="/commande_prete?ref=BLV-00008&role=prep" className="btn white">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "margin": "2px 0 -10px", "alignItems": "center", "gap": "2px" }}>
              <Link to="/rupture?ref=BLV-00008&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Rupture")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00008&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Plus de temps")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/commande?ref=BLV-00008&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Détail")}
              </Link>
            </div>
          </div>
          <div className="card ord amber">
            <div className="otop">
              <span className="oref">
                {t("À PRÉPARER · BLV-00009")}
              </span>
              <span className="cd">
                <Icone nom="timer" taille={14} />
                {t("il reste 3\u00A0h\u00A017")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Neuf · ×1 · colis S · validée à 09\u00A0h\u00A005")}
                </div>
              </div>
            </div>
            <div className="row t13 c2" style={{ "gap": "8px", "marginTop": "10px", "lineHeight": "1.4" }}>
              <Icone nom="clock" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span>
                {t("Prête avant ")}
                <b>
                  {t("13\u00A0h\u00A005")}
                </b>
                {t(" · livreur ")}
                <b>
                  {t("14\u00A0h – 16\u00A0h")}
                </b>
              </span>
            </div>
            <div className="row t13 c2" style={{ "gap": "8px", "marginTop": "10px", "lineHeight": "1.4" }}>
              <Icone nom="hand-coins" taille={16} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
              <span>
                <b>
                  {t("Payable au retrait\u00A0:")}
                </b>
                {t(" préparez-la pareil.")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/commande_prete?ref=BLV-00009&role=prep" className="btn soft">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "margin": "2px 0 -10px", "alignItems": "center", "gap": "2px" }}>
              <Link to="/rupture?ref=BLV-00009&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Rupture")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/delai?ref=BLV-00009&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Plus de temps")}
              </Link>
              <span aria-hidden="true" style={{ "opacity": ".5" }}>
                {t("·")}
              </span>
              <Link to="/commande?ref=BLV-00009&role=prep" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px", "padding": "0 6px" }}>
                {t("Détail")}
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00005")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 19\u00A0h\u00A042")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("Le client dit\u00A0: «\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
              </div>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Répondez avant ")}
              <b>
                {t("demain à 05\u00A0h\u00A030")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00005&role=prep" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord red">
            <div className="otop">
              <span className="oref">
                {t("LITIGE · BLV-00006")}
              </span>
              <span className="cd red">
                <Icone nom="hourglass" taille={14} />
                {t("il reste 44\u00A0h\u00A014")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av">
                  {t("Le client dit\u00A0: «\u00A0Colis abîmé\u00A0»")}
                </div>
              </div>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Répondez avant ")}
              <b>
                {t("jeudi 15 oct. à 06\u00A0h\u00A002")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
            <div className="mt12">
              <Link to="/litige?ref=BLV-00006&role=prep" className="btn danger">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card ord ink">
            <div className="otop">
              <span className="oref">
                {t("RETOUR · BLV-00004")}
              </span>
              <span className="cd" style={{ "color": "var(--ink-3)" }}>
                <Icone nom="truck" taille={14} />
                {t("arrive demain")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av">
                  {t("Motif\u00A0: défaut caché, signalé 30\u00A0h après le retrait")}
                </div>
              </div>
            </div>
            <p className="t13 c2" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Livré chez vous mercredi 14 entre 14\u00A0h et 16\u00A0h. Vous aurez 48\u00A0h pour l’inspecter.")}
            </p>
            <div className="mt12">
              <Link to="/retours?role=prep" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="undo-2" taille={18} />
                <span>
                  {t("Voir le retour")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card flat tight" style={{ "marginTop": "18px" }}>
            <Link to="/offre_detail?role=prep" className="li">
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Stock bas · ITEL AC52")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("3 restants, seuil réglé à 5")}
                  <b className="cor" style={{ "display": "block", "marginTop": "2px" }}>
                    {t("Réapprovisionner")}
                  </b>
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="lock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Les montants et les versements sont réservés à Franck Penga, propriétaire.")}
            </span>
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

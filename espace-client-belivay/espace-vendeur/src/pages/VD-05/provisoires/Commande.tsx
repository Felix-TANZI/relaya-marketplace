// Page provisoire « Commande à préparer » (VD-05) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (5 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Commande() {
  const { t } = usePreferences()
  switch (useEtat("commande")) {
    case "commande?ref=BLV-00008":
    case "commande?ref=BLV-00008&role=prep":
    default:
      return (
        <Ecran route="commande" parEtat>
          <div className="meta" style={{ "marginTop": "14px" }}>
            <span className="pill or">
              <i className="d"></i>
              {t("À préparer")}
            </span>
            <span className="pill green">
              <Icone nom="circle-check" taille={13} />
              {t("Payée")}
            </span>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("Prête aujourd’hui avant ")}
              <span className="nu">
                {t("12\u00A0h\u00A042")}
              </span>
            </div>
            <div className="big">
              {t("2\u00A0h\u00A054")}
              <small>
                {t("restantes")}
              </small>
            </div>
            <div className="bar mt10">
              <i style={{ "width": "28%" }}></i>
            </div>
            <div className="t12 mt6" style={{ "color": "rgba(255,255,255,.72)" }}>
              {t("Payée à 08\u00A0h\u00A042 · 4\u00A0h ouvrées (boutique ouverte)")}
            </div>
            <div className="hline"></div>
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "64px", "height": "64px", "borderRadius": "16px" }}>
                <Dessin id="c90a68b1a1ff" />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "21px", "letterSpacing": "-.01em", "lineHeight": "1.15" }}>
                  {t("ITEL AC52")}
                </div>
                <div className="b8 mt4" style={{ "fontSize": "18px", "letterSpacing": ".05em", "color": "var(--gold-l)" }}>
                  {t("NOIR")}
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.78)" }}>
                  {t("Neuf · ×1 · colis S · réf. ITL-AC52-NR")}
                </div>
              </div>
            </div>
            <div className="hs" style={{ "marginTop": "12px" }}>
              {t("Mettez de côté\u00A0: ")}
              <b>
                {t("chargeur, câble, boîte d’origine")}
              </b>
            </div>
            <div className="mt14">
              <Link to="/commande_prete?ref=BLV-00008" className="btn primary">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="t15 b8">
                  {t("Vous gardez")}
                </div>
                <div className="t13 c3 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Versés sans frais le vendredi qui suit la libération")}
                </div>
              </div>
              <div className="b8 nw" style={{ "fontSize": "24px", "letterSpacing": "-.02em", "color": "var(--green)" }}>
                {t("17\u00A0840\u00A0F")}
              </div>
            </div>
            <div className="hr"></div>
            <div className="kv">
              <span className="k">
                {t("Payé par le client")}
              </span>
              <span className="v ">
                <span className="vx-pay">
                  <Icone nom="smartphone" taille={15} />
                  {t("MTN Mobile Money")}
                </span>
              </span>
            </div>
            <div className="hr"></div>
            <div>
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="kick">
              {t("Ramassage chez vous")}
            </div>
            <div className="row mt10">
              <span style={{ "width": "48px", "height": "48px", "borderRadius": "50%", "overflow": "hidden", "flexShrink": "0", "boxShadow": "0 0 0 2px var(--or-line)" }}>
                <Dessin id="6b9886fd0395" />
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Serge M. · Wink Express")}
                </div>
                <div className="t13 c3 mt4">
                  {t("Aujourd’hui entre 14\u00A0h et 16\u00A0h")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "alignItems": "flex-start", "gap": "10px" }}>
              <Icone nom="package-open" taille={20} style={{ "color": "var(--or-txt)", "flexShrink": "0", "marginTop": "1px" }} />
              <div className="grow">
                <div className="b8 t14">
                  {t("Vous ne faites pas le colis")}
                </div>
                <div className="t13 c3 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Le livreur emballe et scelle devant vous.")}
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Comment ça marche")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Le livreur contrôle l’article devant vous. Il prend deux photos\u00A0: l’article à découvert, puis le colis fermé et étiqueté.")}
                </p>
                <p>
                  {t("Il l’emballe dans un emballage BelivaY, le scelle et pose l’étiquette.")}
                </p>
                <p>
                  {t("La classe du colis (S) fixe le véhicule et le tarif de livraison.")}
                </p>
              </div>
            </details>
          </div>
          <div className="sec">
            <h2>
              {t("Autres actions")}
            </h2>
          </div>
          <div className="card tight">
            <Link to="/delai?ref=BLV-00008" className="li">
              <span className="ic ">
                <Icone nom="clock" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Plus de temps")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Une seule fois par commande")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/rupture?ref=BLV-00008" className="li">
              <span className="ic ">
                <Icone nom="package-x" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Rupture")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vous n’avez plus l’article")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/bon?ref=BLV-00008" className="li">
              <span className="ic ">
                <Icone nom="clipboard-list" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Bon de préparation")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("À imprimer ou à partager")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/journal?ref=BLV-00008" className="li">
              <span className="ic ">
                <Icone nom="list" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Journal de la commande")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Qui a fait quoi, et quand")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Vous ne voyez ni le nom, ni le numéro, ni l’adresse du client, ni son relais, ni les autres vendeurs de la commande.")}
            </span>
          </div>
        </Ecran>
      )
    case "commande?ref=BLV-00009":
    case "commande?ref=BLV-00009&role=prep":
      return (
        <Ecran route="commande" parEtat>
          <div className="meta" style={{ "marginTop": "14px" }}>
            <span className="pill or">
              <i className="d"></i>
              {t("À préparer")}
            </span>
            <span className="pill amber">
              <Icone nom="hand-coins" taille={13} />
              {t("Payable au retrait")}
            </span>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("Prête aujourd’hui avant ")}
              <span className="nu">
                {t("13\u00A0h\u00A005")}
              </span>
            </div>
            <div className="big">
              {t("3\u00A0h\u00A017")}
              <small>
                {t("restantes")}
              </small>
            </div>
            <div className="bar mt10">
              <i style={{ "width": "18%" }}></i>
            </div>
            <div className="t12 mt6" style={{ "color": "rgba(255,255,255,.72)" }}>
              {t("Validée à 09\u00A0h\u00A005 · 4\u00A0h ouvrées (boutique ouverte)")}
            </div>
            <div className="hline"></div>
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "64px", "height": "64px", "borderRadius": "16px" }}>
                <Dessin id="c90a68b1a1ff" />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "21px", "letterSpacing": "-.01em", "lineHeight": "1.15" }}>
                  {t("ITEL AC52")}
                </div>
                <div className="b8 mt4" style={{ "fontSize": "18px", "letterSpacing": ".05em", "color": "var(--gold-l)" }}>
                  {t("NOIR")}
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.78)" }}>
                  {t("Neuf · ×1 · colis S · réf. ITL-AC52-NR")}
                </div>
              </div>
            </div>
            <div className="hs" style={{ "marginTop": "12px" }}>
              {t("Mettez de côté\u00A0: ")}
              <b>
                {t("chargeur, câble, boîte d’origine")}
              </b>
            </div>
            <div className="mt14">
              <Link to="/commande_prete?ref=BLV-00009" className="btn primary">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="t15 b8">
                  {t("Vous garderez")}
                </div>
                <div className="t13 c3 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Rien n’est encaissé\u00A0: le client paie au retrait. Un refus ou un non-retrait ne vous coûte rien.")}
                </div>
              </div>
              <div className="b8 nw" style={{ "fontSize": "24px", "letterSpacing": "-.02em", "color": "var(--amber)" }}>
                {t("17\u00A0840\u00A0F")}
              </div>
            </div>
            <div className="hr"></div>
            <div>
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="kick">
              {t("Ramassage chez vous")}
            </div>
            <div className="row mt10">
              <span style={{ "width": "48px", "height": "48px", "borderRadius": "50%", "overflow": "hidden", "flexShrink": "0", "boxShadow": "0 0 0 2px var(--or-line)" }}>
                <Dessin id="6b9886fd0395" />
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Serge M. · Wink Express")}
                </div>
                <div className="t13 c3 mt4">
                  {t("Aujourd’hui entre 14\u00A0h et 16\u00A0h")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "alignItems": "flex-start", "gap": "10px" }}>
              <Icone nom="package-open" taille={20} style={{ "color": "var(--or-txt)", "flexShrink": "0", "marginTop": "1px" }} />
              <div className="grow">
                <div className="b8 t14">
                  {t("Vous ne faites pas le colis")}
                </div>
                <div className="t13 c3 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Le livreur emballe et scelle devant vous.")}
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Comment ça marche")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Le livreur contrôle l’article devant vous. Il prend deux photos\u00A0: l’article à découvert, puis le colis fermé et étiqueté.")}
                </p>
                <p>
                  {t("Il l’emballe dans un emballage BelivaY, le scelle et pose l’étiquette.")}
                </p>
                <p>
                  {t("La classe du colis (S) fixe le véhicule et le tarif de livraison.")}
                </p>
              </div>
            </details>
          </div>
          <div className="sec">
            <h2>
              {t("Autres actions")}
            </h2>
          </div>
          <div className="card tight">
            <Link to="/delai?ref=BLV-00009" className="li">
              <span className="ic ">
                <Icone nom="clock" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Plus de temps")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Une seule fois par commande")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/rupture?ref=BLV-00009" className="li">
              <span className="ic ">
                <Icone nom="package-x" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Rupture")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vous n’avez plus l’article")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/bon?ref=BLV-00009" className="li">
              <span className="ic ">
                <Icone nom="clipboard-list" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Bon de préparation")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("À imprimer ou à partager")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/journal?ref=BLV-00009" className="li">
              <span className="ic ">
                <Icone nom="list" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Journal de la commande")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Qui a fait quoi, et quand")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Vous ne voyez ni le nom, ni le numéro, ni l’adresse du client, ni son relais, ni les autres vendeurs de la commande.")}
            </span>
          </div>
        </Ecran>
      )
  }
}

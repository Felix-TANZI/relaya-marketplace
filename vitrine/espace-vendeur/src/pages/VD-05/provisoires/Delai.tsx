// Page provisoire « Besoin de plus de temps » (VD-05) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (8 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Delai() {
  const { t } = usePreferences()
  switch (useEtat("delai")) {
    case "delai?ref=BLV-00008":
    case "delai?ref=BLV-00008&role=prep":
    case "delai?c=1&ref=BLV-00008":
    default:
      return (
        <Ecran route="delai" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Besoin de plus de temps")}
            </h1>
            <p className="pg-s">
              {t("Choisissez une nouvelle heure, puis tenez-la. Une seule fois par commande.")}
            </p>
          </div>
          <div className="card">
            <div className="row">
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic or">
                  <Icone nom="timer" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Prête aujourd’hui avant 12\u00A0h\u00A042")}
                </div>
                <div className="t12 c3 mt4">
                  {t("BLV-00008 · ITEL AC52 noir · il reste 2\u00A0h\u00A054")}
                </div>
              </div>
            </div>
          </div>
          <div className="divider-t">
            {t("Nouvelle heure")}
          </div>
          <Link to="/delai?ref=BLV-00008&c=1" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("+ 1\u00A0h · prête avant 13\u00A0h\u00A042")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur passe toujours entre 14\u00A0h et 16\u00A0h")}
              </span>
            </span>
          </Link>
          <Link to="/delai?ref=BLV-00008&c=2" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("+ 2\u00A0h · prête avant 14\u00A0h\u00A042")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur attendra la fin de la préparation")}
              </span>
            </span>
          </Link>
          <Link to="/delai?ref=BLV-00008&c=d" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Demain à l’ouverture · 08\u00A0h")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur passe demain entre 14\u00A0h et 16\u00A0h")}
              </span>
            </span>
          </Link>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Au plus tard mercredi 14 oct. à 08\u00A0h\u00A042, 24\u00A0h après le paiement. Un choix au-delà est grisé.")}
            </span>
          </div>
          <div className="card">
            <h3>
              {t("Ce qui va se passer")}
            </h3>
            <div className="mt8">
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "alignItems": "flex-start" }}>
                <Icone nom="bell" taille={18} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Le client et le livreur sont prévenus.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="gauge" taille={18} style={{ "color": "var(--amber)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Effet léger sur votre Ponctualité.")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("La part du Trust Score qui compte vos délais tenus.")}
                  </div>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Délai demandé puis tenu\u00A0: échec léger.")}
                </p>
                <p>
                  {t("Retard sans rien dire\u00A0: échec moyen.")}
                </p>
                <p>
                  {t("Demander du temps coûte donc moins que se taire. Le client et le livreur reçoivent la nouvelle heure automatiquement.")}
                </p>
              </div>
            </details>
          </div>
          <div className="mt16">
            <Link to="/commande?ref=BLV-00008" className="btn primary">
              <Icone nom="clock" taille={18} />
              <span>
                {t("Demander 1 heure de plus")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
    case "delai?ref=BLV-00009":
    case "delai?ref=BLV-00009&role=prep":
      return (
        <Ecran route="delai" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Besoin de plus de temps")}
            </h1>
            <p className="pg-s">
              {t("Choisissez une nouvelle heure, puis tenez-la. Une seule fois par commande.")}
            </p>
          </div>
          <div className="card">
            <div className="row">
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic or">
                  <Icone nom="timer" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Prête aujourd’hui avant 12\u00A0h\u00A042")}
                </div>
                <div className="t12 c3 mt4">
                  {t("BLV-00009 · ITEL AC52 noir · il reste 2\u00A0h\u00A054")}
                </div>
              </div>
            </div>
          </div>
          <div className="divider-t">
            {t("Nouvelle heure")}
          </div>
          <Link to="/delai?ref=BLV-00009&c=1" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("+ 1\u00A0h · prête avant 13\u00A0h\u00A042")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur passe toujours entre 14\u00A0h et 16\u00A0h")}
              </span>
            </span>
          </Link>
          <Link to="/delai?ref=BLV-00009&c=2" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("+ 2\u00A0h · prête avant 14\u00A0h\u00A042")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur attendra la fin de la préparation")}
              </span>
            </span>
          </Link>
          <Link to="/delai?ref=BLV-00009&c=d" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Demain à l’ouverture · 08\u00A0h")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur passe demain entre 14\u00A0h et 16\u00A0h")}
              </span>
            </span>
          </Link>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Au plus tard mercredi 14 oct. à 08\u00A0h\u00A042, 24\u00A0h après le paiement. Un choix au-delà est grisé.")}
            </span>
          </div>
          <div className="card">
            <h3>
              {t("Ce qui va se passer")}
            </h3>
            <div className="mt8">
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "alignItems": "flex-start" }}>
                <Icone nom="bell" taille={18} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Le client et le livreur sont prévenus.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="gauge" taille={18} style={{ "color": "var(--amber)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Effet léger sur votre Ponctualité.")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("La part du Trust Score qui compte vos délais tenus.")}
                  </div>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Délai demandé puis tenu\u00A0: échec léger.")}
                </p>
                <p>
                  {t("Retard sans rien dire\u00A0: échec moyen.")}
                </p>
                <p>
                  {t("Demander du temps coûte donc moins que se taire. Le client et le livreur reçoivent la nouvelle heure automatiquement.")}
                </p>
              </div>
            </details>
          </div>
          <div className="mt16">
            <Link to="/commande?ref=BLV-00009" className="btn primary">
              <Icone nom="clock" taille={18} />
              <span>
                {t("Demander 1 heure de plus")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
    case "delai?c=2&ref=BLV-00008":
      return (
        <Ecran route="delai" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Besoin de plus de temps")}
            </h1>
            <p className="pg-s">
              {t("Choisissez une nouvelle heure, puis tenez-la. Une seule fois par commande.")}
            </p>
          </div>
          <div className="card">
            <div className="row">
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic or">
                  <Icone nom="timer" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Prête aujourd’hui avant 12\u00A0h\u00A042")}
                </div>
                <div className="t12 c3 mt4">
                  {t("BLV-00008 · ITEL AC52 noir · il reste 2\u00A0h\u00A054")}
                </div>
              </div>
            </div>
          </div>
          <div className="divider-t">
            {t("Nouvelle heure")}
          </div>
          <Link to="/delai?ref=BLV-00008&c=1" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("+ 1\u00A0h · prête avant 13\u00A0h\u00A042")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur passe toujours entre 14\u00A0h et 16\u00A0h")}
              </span>
            </span>
          </Link>
          <Link to="/delai?ref=BLV-00008&c=2" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("+ 2\u00A0h · prête avant 14\u00A0h\u00A042")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur attendra la fin de la préparation")}
              </span>
            </span>
          </Link>
          <Link to="/delai?ref=BLV-00008&c=d" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Demain à l’ouverture · 08\u00A0h")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur passe demain entre 14\u00A0h et 16\u00A0h")}
              </span>
            </span>
          </Link>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Au plus tard mercredi 14 oct. à 08\u00A0h\u00A042, 24\u00A0h après le paiement. Un choix au-delà est grisé.")}
            </span>
          </div>
          <div className="card">
            <h3>
              {t("Ce qui va se passer")}
            </h3>
            <div className="mt8">
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "alignItems": "flex-start" }}>
                <Icone nom="bell" taille={18} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Le client et le livreur sont prévenus.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="gauge" taille={18} style={{ "color": "var(--amber)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Effet léger sur votre Ponctualité.")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("La part du Trust Score qui compte vos délais tenus.")}
                  </div>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Délai demandé puis tenu\u00A0: échec léger.")}
                </p>
                <p>
                  {t("Retard sans rien dire\u00A0: échec moyen.")}
                </p>
                <p>
                  {t("Demander du temps coûte donc moins que se taire. Le client et le livreur reçoivent la nouvelle heure automatiquement.")}
                </p>
              </div>
            </details>
          </div>
          <div className="mt16">
            <Link to="/commande?ref=BLV-00008" className="btn primary">
              <Icone nom="clock" taille={18} />
              <span>
                {t("Demander 2 heures de plus")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
    case "delai?c=d&ref=BLV-00008":
      return (
        <Ecran route="delai" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Besoin de plus de temps")}
            </h1>
            <p className="pg-s">
              {t("Choisissez une nouvelle heure, puis tenez-la. Une seule fois par commande.")}
            </p>
          </div>
          <div className="card">
            <div className="row">
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic or">
                  <Icone nom="timer" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Prête aujourd’hui avant 12\u00A0h\u00A042")}
                </div>
                <div className="t12 c3 mt4">
                  {t("BLV-00008 · ITEL AC52 noir · il reste 2\u00A0h\u00A054")}
                </div>
              </div>
            </div>
          </div>
          <div className="divider-t">
            {t("Nouvelle heure")}
          </div>
          <Link to="/delai?ref=BLV-00008&c=1" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("+ 1\u00A0h · prête avant 13\u00A0h\u00A042")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur passe toujours entre 14\u00A0h et 16\u00A0h")}
              </span>
            </span>
          </Link>
          <Link to="/delai?ref=BLV-00008&c=2" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("+ 2\u00A0h · prête avant 14\u00A0h\u00A042")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur attendra la fin de la préparation")}
              </span>
            </span>
          </Link>
          <Link to="/delai?ref=BLV-00008&c=d" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Demain à l’ouverture · 08\u00A0h")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le livreur passe demain entre 14\u00A0h et 16\u00A0h")}
              </span>
            </span>
          </Link>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("Au plus tard mercredi 14 oct. à 08\u00A0h\u00A042, 24\u00A0h après le paiement. Un choix au-delà est grisé.")}
            </span>
          </div>
          <div className="card">
            <h3>
              {t("Ce qui va se passer")}
            </h3>
            <div className="mt8">
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "alignItems": "flex-start" }}>
                <Icone nom="bell" taille={18} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Le client et le livreur sont prévenus.")}
                  </div>
                </div>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
                <Icone nom="gauge" taille={18} style={{ "color": "var(--amber)", "flexShrink": "0", "marginTop": "1px" }} />
                <div className="grow">
                  <div className="t14 b6" style={{ "lineHeight": "1.4", "color": "var(--ink)" }}>
                    {t("Effet léger sur votre Ponctualité.")}
                  </div>
                  <div className="t12 c3 mt4" style={{ "lineHeight": "1.4" }}>
                    {t("La part du Trust Score qui compte vos délais tenus.")}
                  </div>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Délai demandé puis tenu\u00A0: échec léger.")}
                </p>
                <p>
                  {t("Retard sans rien dire\u00A0: échec moyen.")}
                </p>
                <p>
                  {t("Demander du temps coûte donc moins que se taire. Le client et le livreur reçoivent la nouvelle heure automatiquement.")}
                </p>
              </div>
            </details>
          </div>
          <div className="mt16">
            <Link to="/commande?ref=BLV-00008" className="btn primary">
              <Icone nom="clock" taille={18} />
              <span>
                {t("Demander jusqu’à demain 08\u00A0h")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}

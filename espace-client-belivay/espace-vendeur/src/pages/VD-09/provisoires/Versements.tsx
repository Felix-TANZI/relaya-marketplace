// Page provisoire « Versements » (VD-09) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (8 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Versements() {
  const { t } = usePreferences()
  switch (useEtat("versements")) {
    case "versements?periode=3":
    default:
      return (
        <Ecran route="versements" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Prochain versement")}
          </div>
          <h1 className="pg-t">
            {t("Vendredi 25 septembre")}
          </h1>
          <p className="pg-s">
            {t("Avant 12\u00A0h. Automatique, sans frais, sans minimum\u00A0: rien à demander.")}
          </p>
          <div className="hero night">
            <div className="hk">
              {t("À verser")}
            </div>
            <div className="big">
              {t("17\u00A0840")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("Passe à ")}
              <b>
                {t("35\u00A0680\u00A0F")}
              </b>
              {t(" ce soir, quand BLV-00007 se libère.")}
            </div>
            <div className="hline"></div>
            <div className="row">
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "11px", "background": "#FFCB05", "color": "#1A1A1A", "fontWeight": "800", "fontSize": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("MTN")}
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Sur MTN\u00A0····\u00A04\u00A0217")}
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.74)" }}>
                  {t("Vérifié · au nom de Franck Penga")}
                </div>
              </div>
            </div>
            <div className="t13 mt12" style={{ "lineHeight": "1.45", "color": "rgba(255,255,255,.86)" }}>
              {t("Référence prévue ")}
              <b className="nw">
                {t("BLV-VS-4092")}
              </b>
              {t(". Vous la verrez sur votre relevé MTN\u00A0: c’est votre preuve.")}
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Commandes couvertes")}
            </h3>
            <table className="tbl mt10">
              <tbody>
                <tr>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Commande")}
                  </th>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Libérée")}
                  </th>
                  <th className="r" style={{ "fontSize": "12px" }}>
                    {t("Montant")}
                  </th>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00003")}
                  </td>
                  <td className="c3">
                    {t("20 sept.")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00007")}
                  </td>
                  <td className="c3">
                    {t("aujourd’hui 18\u00A0h")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b8">
                    {t("Total prévu")}
                  </td>
                  <td></td>
                  <td className="r b8 cor">
                    {t("35\u00A0680\u00A0F")}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="hint-l">
              <Icone nom="calendar" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Tout ce qui se libère avant jeudi minuit part ce vendredi.")}
              </span>
            </div>
          </div>
          <div className="chips" role="group" aria-label="Période" style={{ "marginTop": "18px" }}>
            <Link to="/versements?periode=3" className="chip on">
              {t("3\u00A0mois")}
            </Link>
            <Link to="/versements?periode=12" className="chip">
              {t("12\u00A0mois")}
            </Link>
            <Link to="/versements?periode=tout" className="chip">
              {t("Tout")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "10px" }}>
            <div className="otop">
              <h3>
                {t("Déjà reçus")}
              </h3>
              <span className="b8 t17 nw">
                {t("35\u00A0680\u00A0F")}
              </span>
            </div>
            <div className="t13 c3 mt4">
              {t("2 versements en 3\u00A0mois · 0\u00A0F de frais")}
            </div>
            <div className="mt6">
              <div className="li" style={{ "borderTop": "1px solid var(--line)" }}>
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 18 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3612 · couvre BLV-00002")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="li">
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 4 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3204 · couvre BLV-00001")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
            </div>
          </div>
          <div className="card tight">
            <Link to="/messages" className="li">
              <span className="ic or">
                <Icone nom="circle-help" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Signaler un versement non reçu")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Avec la référence · réponse avant lundi midi")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/numero_versement" className="li">
              <span className="ic green">
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Changer de numéro de versement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vérifié le 9 mai · 7\u00A0jours de revue avant le premier versement")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
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
                {t("Les frais Mobile Money sont payés par BelivaY.")}
              </p>
              <p>
                <b>
                  {t("Si l’opérateur refuse")}
                </b>
                {t(", le motif est écrit. Il n’y en a que trois\u00A0: numéro au nom d’un tiers, compte plein, préfixe qui ne correspond pas à l’opérateur.")}
              </p>
              <p>
                {t("BelivaY réessaie 3 fois, un jour d’intervalle. Ensuite, les versements sont suspendus et le support vous appelle. Votre argent reste à vous.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "versements?refus=1":
    case "versements?periode=3&refus=1":
      return (
        <Ecran route="versements" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Versement en attente")}
          </div>
          <h1 className="pg-t">
            {t("Nouvel essai samedi 26 sept.")}
          </h1>
          <p className="pg-s">
            {t("À 12\u00A0h, sans frais. Votre argent reste à vous.")}
          </p>
          <div className="card" style={{ "border": "1.5px solid var(--red-line)", "background": "var(--red-soft)" }}>
            <div className="row" style={{ "gap": "10px" }}>
              <Icone nom="circle-alert" taille={22} style={{ "color": "var(--red)", "flexShrink": "0" }} />
              <div className="grow b8 t15 cr">
                {t("MTN a refusé le versement du vendredi 25 sept.")}
              </div>
            </div>
            <div className="t14 mt8" style={{ "lineHeight": "1.45" }}>
              {t("Motif\u00A0: ")}
              <b>
                {t("compte plein")}
              </b>
              {t(". Votre argent reste à vous, sans frais.")}
            </div>
            <div className="row t13 c2 mt8" style={{ "gap": "9px", "alignItems": "flex-start", "lineHeight": "1.45" }}>
              <Icone nom="wallet" taille={17} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
              <span>
                {t("À faire\u00A0: retirez un peu d’argent de votre compte MTN.")}
              </span>
            </div>
            <div className="row t13 c2 mt8" style={{ "gap": "9px", "alignItems": "flex-start", "lineHeight": "1.45" }}>
              <Icone nom="refresh-cw" taille={17} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
              <span>
                {t("Nouvel essai samedi 26 à 12\u00A0h (1 sur 3), puis dimanche 27 et lundi 28.")}
              </span>
            </div>
            <div className="row t13 c2 mt8" style={{ "gap": "9px", "alignItems": "flex-start", "lineHeight": "1.45" }}>
              <Icone nom="headset" taille={17} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
              <span>
                {t("Après 3 échecs, les versements sont suspendus et le support vous appelle.")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/messages" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="message-circle" taille={18} />
                <span>
                  {t("Écrire au support")}
                </span>
              </Link>
            </div>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("En attente")}
            </div>
            <div className="big">
              {t("35\u00A0680")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("Repart samedi 26 à 12\u00A0h, sans frais.")}
            </div>
            <div className="hline"></div>
            <div className="row">
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "11px", "background": "#FFCB05", "color": "#1A1A1A", "fontWeight": "800", "fontSize": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("MTN")}
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Sur MTN\u00A0····\u00A04\u00A0217")}
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.74)" }}>
                  {t("Vérifié · au nom de Franck Penga")}
                </div>
              </div>
            </div>
            <div className="t13 mt12" style={{ "lineHeight": "1.45", "color": "rgba(255,255,255,.86)" }}>
              {t("Référence prévue ")}
              <b className="nw">
                {t("BLV-VS-4092")}
              </b>
              {t(". Vous la verrez sur votre relevé MTN\u00A0: c’est votre preuve.")}
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Commandes couvertes")}
            </h3>
            <table className="tbl mt10">
              <tbody>
                <tr>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Commande")}
                  </th>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Libérée")}
                  </th>
                  <th className="r" style={{ "fontSize": "12px" }}>
                    {t("Montant")}
                  </th>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00003")}
                  </td>
                  <td className="c3">
                    {t("20 sept.")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00007")}
                  </td>
                  <td className="c3">
                    {t("aujourd’hui 18\u00A0h")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b8">
                    {t("Total prévu")}
                  </td>
                  <td></td>
                  <td className="r b8 cor">
                    {t("35\u00A0680\u00A0F")}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="hint-l">
              <Icone nom="calendar" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Tout ce qui se libère avant jeudi minuit part ce vendredi.")}
              </span>
            </div>
          </div>
          <div className="chips" role="group" aria-label="Période" style={{ "marginTop": "18px" }}>
            <Link to="/versements?refus=1&periode=3" className="chip on">
              {t("3\u00A0mois")}
            </Link>
            <Link to="/versements?refus=1&periode=12" className="chip">
              {t("12\u00A0mois")}
            </Link>
            <Link to="/versements?refus=1&periode=tout" className="chip">
              {t("Tout")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "10px" }}>
            <div className="otop">
              <h3>
                {t("Déjà reçus")}
              </h3>
              <span className="b8 t17 nw">
                {t("35\u00A0680\u00A0F")}
              </span>
            </div>
            <div className="t13 c3 mt4">
              {t("2 versements en 3\u00A0mois · 0\u00A0F de frais")}
            </div>
            <div className="mt6">
              <div className="li" style={{ "borderTop": "1px solid var(--line)" }}>
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 18 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3612 · couvre BLV-00002")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="li">
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 4 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3204 · couvre BLV-00001")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
            </div>
          </div>
          <div className="card tight">
            <Link to="/messages" className="li">
              <span className="ic or">
                <Icone nom="circle-help" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Signaler un versement non reçu")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Avec la référence · réponse avant lundi midi")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/numero_versement" className="li">
              <span className="ic green">
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Changer de numéro de versement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vérifié le 9 mai · 7\u00A0jours de revue avant le premier versement")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
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
                {t("Les frais Mobile Money sont payés par BelivaY.")}
              </p>
              <p>
                <b>
                  {t("Si l’opérateur refuse")}
                </b>
                {t(", le motif est écrit. Il n’y en a que trois\u00A0: numéro au nom d’un tiers, compte plein, préfixe qui ne correspond pas à l’opérateur.")}
              </p>
              <p>
                {t("BelivaY réessaie 3 fois, un jour d’intervalle. Ensuite, les versements sont suspendus et le support vous appelle. Votre argent reste à vous.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "versements?periode=12":
      return (
        <Ecran route="versements" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Prochain versement")}
          </div>
          <h1 className="pg-t">
            {t("Vendredi 25 septembre")}
          </h1>
          <p className="pg-s">
            {t("Avant 12\u00A0h. Automatique, sans frais, sans minimum\u00A0: rien à demander.")}
          </p>
          <div className="hero night">
            <div className="hk">
              {t("À verser")}
            </div>
            <div className="big">
              {t("17\u00A0840")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("Passe à ")}
              <b>
                {t("35\u00A0680\u00A0F")}
              </b>
              {t(" ce soir, quand BLV-00007 se libère.")}
            </div>
            <div className="hline"></div>
            <div className="row">
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "11px", "background": "#FFCB05", "color": "#1A1A1A", "fontWeight": "800", "fontSize": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("MTN")}
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Sur MTN\u00A0····\u00A04\u00A0217")}
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.74)" }}>
                  {t("Vérifié · au nom de Franck Penga")}
                </div>
              </div>
            </div>
            <div className="t13 mt12" style={{ "lineHeight": "1.45", "color": "rgba(255,255,255,.86)" }}>
              {t("Référence prévue ")}
              <b className="nw">
                {t("BLV-VS-4092")}
              </b>
              {t(". Vous la verrez sur votre relevé MTN\u00A0: c’est votre preuve.")}
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Commandes couvertes")}
            </h3>
            <table className="tbl mt10">
              <tbody>
                <tr>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Commande")}
                  </th>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Libérée")}
                  </th>
                  <th className="r" style={{ "fontSize": "12px" }}>
                    {t("Montant")}
                  </th>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00003")}
                  </td>
                  <td className="c3">
                    {t("20 sept.")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00007")}
                  </td>
                  <td className="c3">
                    {t("aujourd’hui 18\u00A0h")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b8">
                    {t("Total prévu")}
                  </td>
                  <td></td>
                  <td className="r b8 cor">
                    {t("35\u00A0680\u00A0F")}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="hint-l">
              <Icone nom="calendar" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Tout ce qui se libère avant jeudi minuit part ce vendredi.")}
              </span>
            </div>
          </div>
          <div className="chips" role="group" aria-label="Période" style={{ "marginTop": "18px" }}>
            <Link to="/versements?periode=3" className="chip">
              {t("3\u00A0mois")}
            </Link>
            <Link to="/versements?periode=12" className="chip on">
              {t("12\u00A0mois")}
            </Link>
            <Link to="/versements?periode=tout" className="chip">
              {t("Tout")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "10px" }}>
            <div className="otop">
              <h3>
                {t("Déjà reçus")}
              </h3>
              <span className="b8 t17 nw">
                {t("35\u00A0680\u00A0F")}
              </span>
            </div>
            <div className="t13 c3 mt4">
              {t("2 versements en 12\u00A0mois · 0\u00A0F de frais")}
            </div>
            <div className="mt6">
              <div className="li" style={{ "borderTop": "1px solid var(--line)" }}>
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 18 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3612 · couvre BLV-00002")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="li">
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 4 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3204 · couvre BLV-00001")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
            </div>
          </div>
          <div className="card tight">
            <Link to="/messages" className="li">
              <span className="ic or">
                <Icone nom="circle-help" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Signaler un versement non reçu")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Avec la référence · réponse avant lundi midi")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/numero_versement" className="li">
              <span className="ic green">
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Changer de numéro de versement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vérifié le 9 mai · 7\u00A0jours de revue avant le premier versement")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
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
                {t("Les frais Mobile Money sont payés par BelivaY.")}
              </p>
              <p>
                <b>
                  {t("Si l’opérateur refuse")}
                </b>
                {t(", le motif est écrit. Il n’y en a que trois\u00A0: numéro au nom d’un tiers, compte plein, préfixe qui ne correspond pas à l’opérateur.")}
              </p>
              <p>
                {t("BelivaY réessaie 3 fois, un jour d’intervalle. Ensuite, les versements sont suspendus et le support vous appelle. Votre argent reste à vous.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "versements?periode=tout":
      return (
        <Ecran route="versements" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Prochain versement")}
          </div>
          <h1 className="pg-t">
            {t("Vendredi 25 septembre")}
          </h1>
          <p className="pg-s">
            {t("Avant 12\u00A0h. Automatique, sans frais, sans minimum\u00A0: rien à demander.")}
          </p>
          <div className="hero night">
            <div className="hk">
              {t("À verser")}
            </div>
            <div className="big">
              {t("17\u00A0840")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("Passe à ")}
              <b>
                {t("35\u00A0680\u00A0F")}
              </b>
              {t(" ce soir, quand BLV-00007 se libère.")}
            </div>
            <div className="hline"></div>
            <div className="row">
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "11px", "background": "#FFCB05", "color": "#1A1A1A", "fontWeight": "800", "fontSize": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("MTN")}
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Sur MTN\u00A0····\u00A04\u00A0217")}
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.74)" }}>
                  {t("Vérifié · au nom de Franck Penga")}
                </div>
              </div>
            </div>
            <div className="t13 mt12" style={{ "lineHeight": "1.45", "color": "rgba(255,255,255,.86)" }}>
              {t("Référence prévue ")}
              <b className="nw">
                {t("BLV-VS-4092")}
              </b>
              {t(". Vous la verrez sur votre relevé MTN\u00A0: c’est votre preuve.")}
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Commandes couvertes")}
            </h3>
            <table className="tbl mt10">
              <tbody>
                <tr>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Commande")}
                  </th>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Libérée")}
                  </th>
                  <th className="r" style={{ "fontSize": "12px" }}>
                    {t("Montant")}
                  </th>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00003")}
                  </td>
                  <td className="c3">
                    {t("20 sept.")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00007")}
                  </td>
                  <td className="c3">
                    {t("aujourd’hui 18\u00A0h")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b8">
                    {t("Total prévu")}
                  </td>
                  <td></td>
                  <td className="r b8 cor">
                    {t("35\u00A0680\u00A0F")}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="hint-l">
              <Icone nom="calendar" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Tout ce qui se libère avant jeudi minuit part ce vendredi.")}
              </span>
            </div>
          </div>
          <div className="chips" role="group" aria-label="Période" style={{ "marginTop": "18px" }}>
            <Link to="/versements?periode=3" className="chip">
              {t("3\u00A0mois")}
            </Link>
            <Link to="/versements?periode=12" className="chip">
              {t("12\u00A0mois")}
            </Link>
            <Link to="/versements?periode=tout" className="chip on">
              {t("Tout")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "10px" }}>
            <div className="otop">
              <h3>
                {t("Déjà reçus")}
              </h3>
              <span className="b8 t17 nw">
                {t("35\u00A0680\u00A0F")}
              </span>
            </div>
            <div className="t13 c3 mt4">
              {t("2 versements depuis le 7 mai · 0\u00A0F de frais")}
            </div>
            <div className="mt6">
              <div className="li" style={{ "borderTop": "1px solid var(--line)" }}>
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 18 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3612 · couvre BLV-00002")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="li">
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 4 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3204 · couvre BLV-00001")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
            </div>
          </div>
          <div className="card tight">
            <Link to="/messages" className="li">
              <span className="ic or">
                <Icone nom="circle-help" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Signaler un versement non reçu")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Avec la référence · réponse avant lundi midi")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/numero_versement" className="li">
              <span className="ic green">
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Changer de numéro de versement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vérifié le 9 mai · 7\u00A0jours de revue avant le premier versement")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
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
                {t("Les frais Mobile Money sont payés par BelivaY.")}
              </p>
              <p>
                <b>
                  {t("Si l’opérateur refuse")}
                </b>
                {t(", le motif est écrit. Il n’y en a que trois\u00A0: numéro au nom d’un tiers, compte plein, préfixe qui ne correspond pas à l’opérateur.")}
              </p>
              <p>
                {t("BelivaY réessaie 3 fois, un jour d’intervalle. Ensuite, les versements sont suspendus et le support vous appelle. Votre argent reste à vous.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "versements?periode=12&refus=1":
      return (
        <Ecran route="versements" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Versement en attente")}
          </div>
          <h1 className="pg-t">
            {t("Nouvel essai samedi 26 sept.")}
          </h1>
          <p className="pg-s">
            {t("À 12\u00A0h, sans frais. Votre argent reste à vous.")}
          </p>
          <div className="card" style={{ "border": "1.5px solid var(--red-line)", "background": "var(--red-soft)" }}>
            <div className="row" style={{ "gap": "10px" }}>
              <Icone nom="circle-alert" taille={22} style={{ "color": "var(--red)", "flexShrink": "0" }} />
              <div className="grow b8 t15 cr">
                {t("MTN a refusé le versement du vendredi 25 sept.")}
              </div>
            </div>
            <div className="t14 mt8" style={{ "lineHeight": "1.45" }}>
              {t("Motif\u00A0: ")}
              <b>
                {t("compte plein")}
              </b>
              {t(". Votre argent reste à vous, sans frais.")}
            </div>
            <div className="row t13 c2 mt8" style={{ "gap": "9px", "alignItems": "flex-start", "lineHeight": "1.45" }}>
              <Icone nom="wallet" taille={17} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
              <span>
                {t("À faire\u00A0: retirez un peu d’argent de votre compte MTN.")}
              </span>
            </div>
            <div className="row t13 c2 mt8" style={{ "gap": "9px", "alignItems": "flex-start", "lineHeight": "1.45" }}>
              <Icone nom="refresh-cw" taille={17} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
              <span>
                {t("Nouvel essai samedi 26 à 12\u00A0h (1 sur 3), puis dimanche 27 et lundi 28.")}
              </span>
            </div>
            <div className="row t13 c2 mt8" style={{ "gap": "9px", "alignItems": "flex-start", "lineHeight": "1.45" }}>
              <Icone nom="headset" taille={17} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
              <span>
                {t("Après 3 échecs, les versements sont suspendus et le support vous appelle.")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/messages" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="message-circle" taille={18} />
                <span>
                  {t("Écrire au support")}
                </span>
              </Link>
            </div>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("En attente")}
            </div>
            <div className="big">
              {t("35\u00A0680")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("Repart samedi 26 à 12\u00A0h, sans frais.")}
            </div>
            <div className="hline"></div>
            <div className="row">
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "11px", "background": "#FFCB05", "color": "#1A1A1A", "fontWeight": "800", "fontSize": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("MTN")}
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Sur MTN\u00A0····\u00A04\u00A0217")}
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.74)" }}>
                  {t("Vérifié · au nom de Franck Penga")}
                </div>
              </div>
            </div>
            <div className="t13 mt12" style={{ "lineHeight": "1.45", "color": "rgba(255,255,255,.86)" }}>
              {t("Référence prévue ")}
              <b className="nw">
                {t("BLV-VS-4092")}
              </b>
              {t(". Vous la verrez sur votre relevé MTN\u00A0: c’est votre preuve.")}
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Commandes couvertes")}
            </h3>
            <table className="tbl mt10">
              <tbody>
                <tr>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Commande")}
                  </th>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Libérée")}
                  </th>
                  <th className="r" style={{ "fontSize": "12px" }}>
                    {t("Montant")}
                  </th>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00003")}
                  </td>
                  <td className="c3">
                    {t("20 sept.")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00007")}
                  </td>
                  <td className="c3">
                    {t("aujourd’hui 18\u00A0h")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b8">
                    {t("Total prévu")}
                  </td>
                  <td></td>
                  <td className="r b8 cor">
                    {t("35\u00A0680\u00A0F")}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="hint-l">
              <Icone nom="calendar" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Tout ce qui se libère avant jeudi minuit part ce vendredi.")}
              </span>
            </div>
          </div>
          <div className="chips" role="group" aria-label="Période" style={{ "marginTop": "18px" }}>
            <Link to="/versements?refus=1&periode=3" className="chip">
              {t("3\u00A0mois")}
            </Link>
            <Link to="/versements?refus=1&periode=12" className="chip on">
              {t("12\u00A0mois")}
            </Link>
            <Link to="/versements?refus=1&periode=tout" className="chip">
              {t("Tout")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "10px" }}>
            <div className="otop">
              <h3>
                {t("Déjà reçus")}
              </h3>
              <span className="b8 t17 nw">
                {t("35\u00A0680\u00A0F")}
              </span>
            </div>
            <div className="t13 c3 mt4">
              {t("2 versements en 12\u00A0mois · 0\u00A0F de frais")}
            </div>
            <div className="mt6">
              <div className="li" style={{ "borderTop": "1px solid var(--line)" }}>
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 18 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3612 · couvre BLV-00002")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="li">
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 4 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3204 · couvre BLV-00001")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
            </div>
          </div>
          <div className="card tight">
            <Link to="/messages" className="li">
              <span className="ic or">
                <Icone nom="circle-help" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Signaler un versement non reçu")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Avec la référence · réponse avant lundi midi")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/numero_versement" className="li">
              <span className="ic green">
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Changer de numéro de versement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vérifié le 9 mai · 7\u00A0jours de revue avant le premier versement")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
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
                {t("Les frais Mobile Money sont payés par BelivaY.")}
              </p>
              <p>
                <b>
                  {t("Si l’opérateur refuse")}
                </b>
                {t(", le motif est écrit. Il n’y en a que trois\u00A0: numéro au nom d’un tiers, compte plein, préfixe qui ne correspond pas à l’opérateur.")}
              </p>
              <p>
                {t("BelivaY réessaie 3 fois, un jour d’intervalle. Ensuite, les versements sont suspendus et le support vous appelle. Votre argent reste à vous.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "versements?periode=tout&refus=1":
      return (
        <Ecran route="versements" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Versement en attente")}
          </div>
          <h1 className="pg-t">
            {t("Nouvel essai samedi 26 sept.")}
          </h1>
          <p className="pg-s">
            {t("À 12\u00A0h, sans frais. Votre argent reste à vous.")}
          </p>
          <div className="card" style={{ "border": "1.5px solid var(--red-line)", "background": "var(--red-soft)" }}>
            <div className="row" style={{ "gap": "10px" }}>
              <Icone nom="circle-alert" taille={22} style={{ "color": "var(--red)", "flexShrink": "0" }} />
              <div className="grow b8 t15 cr">
                {t("MTN a refusé le versement du vendredi 25 sept.")}
              </div>
            </div>
            <div className="t14 mt8" style={{ "lineHeight": "1.45" }}>
              {t("Motif\u00A0: ")}
              <b>
                {t("compte plein")}
              </b>
              {t(". Votre argent reste à vous, sans frais.")}
            </div>
            <div className="row t13 c2 mt8" style={{ "gap": "9px", "alignItems": "flex-start", "lineHeight": "1.45" }}>
              <Icone nom="wallet" taille={17} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
              <span>
                {t("À faire\u00A0: retirez un peu d’argent de votre compte MTN.")}
              </span>
            </div>
            <div className="row t13 c2 mt8" style={{ "gap": "9px", "alignItems": "flex-start", "lineHeight": "1.45" }}>
              <Icone nom="refresh-cw" taille={17} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
              <span>
                {t("Nouvel essai samedi 26 à 12\u00A0h (1 sur 3), puis dimanche 27 et lundi 28.")}
              </span>
            </div>
            <div className="row t13 c2 mt8" style={{ "gap": "9px", "alignItems": "flex-start", "lineHeight": "1.45" }}>
              <Icone nom="headset" taille={17} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
              <span>
                {t("Après 3 échecs, les versements sont suspendus et le support vous appelle.")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/messages" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="message-circle" taille={18} />
                <span>
                  {t("Écrire au support")}
                </span>
              </Link>
            </div>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("En attente")}
            </div>
            <div className="big">
              {t("35\u00A0680")}
              <small>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("Repart samedi 26 à 12\u00A0h, sans frais.")}
            </div>
            <div className="hline"></div>
            <div className="row">
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "11px", "background": "#FFCB05", "color": "#1A1A1A", "fontWeight": "800", "fontSize": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("MTN")}
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Sur MTN\u00A0····\u00A04\u00A0217")}
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.74)" }}>
                  {t("Vérifié · au nom de Franck Penga")}
                </div>
              </div>
            </div>
            <div className="t13 mt12" style={{ "lineHeight": "1.45", "color": "rgba(255,255,255,.86)" }}>
              {t("Référence prévue ")}
              <b className="nw">
                {t("BLV-VS-4092")}
              </b>
              {t(". Vous la verrez sur votre relevé MTN\u00A0: c’est votre preuve.")}
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Commandes couvertes")}
            </h3>
            <table className="tbl mt10">
              <tbody>
                <tr>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Commande")}
                  </th>
                  <th style={{ "fontSize": "12px" }}>
                    {t("Libérée")}
                  </th>
                  <th className="r" style={{ "fontSize": "12px" }}>
                    {t("Montant")}
                  </th>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00003")}
                  </td>
                  <td className="c3">
                    {t("20 sept.")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b7">
                    {t("BLV-00007")}
                  </td>
                  <td className="c3">
                    {t("aujourd’hui 18\u00A0h")}
                  </td>
                  <td className="r b7">
                    {t("17\u00A0840\u00A0F")}
                  </td>
                </tr>
                <tr>
                  <td className="b8">
                    {t("Total prévu")}
                  </td>
                  <td></td>
                  <td className="r b8 cor">
                    {t("35\u00A0680\u00A0F")}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="hint-l">
              <Icone nom="calendar" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Tout ce qui se libère avant jeudi minuit part ce vendredi.")}
              </span>
            </div>
          </div>
          <div className="chips" role="group" aria-label="Période" style={{ "marginTop": "18px" }}>
            <Link to="/versements?refus=1&periode=3" className="chip">
              {t("3\u00A0mois")}
            </Link>
            <Link to="/versements?refus=1&periode=12" className="chip">
              {t("12\u00A0mois")}
            </Link>
            <Link to="/versements?refus=1&periode=tout" className="chip on">
              {t("Tout")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "10px" }}>
            <div className="otop">
              <h3>
                {t("Déjà reçus")}
              </h3>
              <span className="b8 t17 nw">
                {t("35\u00A0680\u00A0F")}
              </span>
            </div>
            <div className="t13 c3 mt4">
              {t("2 versements depuis le 7 mai · 0\u00A0F de frais")}
            </div>
            <div className="mt6">
              <div className="li" style={{ "borderTop": "1px solid var(--line)" }}>
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 18 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3612 · couvre BLV-00002")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="li">
                <span className="ic green">
                  <Icone nom="circle-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Vendredi 4 sept.")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("BLV-VS-3204 · couvre BLV-00001")}
                  </span>
                </span>
                <span className="rv">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
            </div>
          </div>
          <div className="card tight">
            <Link to="/messages" className="li">
              <span className="ic or">
                <Icone nom="circle-help" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Signaler un versement non reçu")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Avec la référence · réponse avant lundi midi")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/numero_versement" className="li">
              <span className="ic green">
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Changer de numéro de versement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vérifié le 9 mai · 7\u00A0jours de revue avant le premier versement")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
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
                {t("Les frais Mobile Money sont payés par BelivaY.")}
              </p>
              <p>
                <b>
                  {t("Si l’opérateur refuse")}
                </b>
                {t(", le motif est écrit. Il n’y en a que trois\u00A0: numéro au nom d’un tiers, compte plein, préfixe qui ne correspond pas à l’opérateur.")}
              </p>
              <p>
                {t("BelivaY réessaie 3 fois, un jour d’intervalle. Ensuite, les versements sont suspendus et le support vous appelle. Votre argent reste à vous.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}

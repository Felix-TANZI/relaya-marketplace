// Page provisoire « Mon score » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Score() {
  const { t } = usePreferences()
  switch (useEtat("score")) {
    default:
      return (
        <Ecran route="score" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Mon score")}
            </h1>
            <p className="pg-s">
              {t("Six critères font votre Trust Score. Voici ce qui le fait bouger.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/palier" className="">
              {t("Mon palier")}
            </Link>
            <Link to="/score" className="on">
              {t("Mon score")}
            </Link>
            <Link to="/paliers" className="">
              {t("Les paliers")}
            </Link>
          </div>
          <div className="card">
            <div className="row">
              <div className="ring" style={{ "width": "76px", "height": "76px" }}>
                <Dessin id="4d7f63fbcec1" />
                <b>
                  {t("63")}
                </b>
              </div>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "20px" }}>
                  {t("Votre Trust Score")}
                </div>
                <div className="t13 c3 mt4">
                  {t("Sur 100 · recalculé chaque nuit")}
                </div>
              </div>
            </div>
            <div className="mt12"></div>
            <div className="li">
              <span className="ic green">
                <Icone nom="trending-up" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Ce qui le fait monter")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Commandes prêtes à l’heure, sans retour ni litige. Avis de 4 ou 5 ★.")}
                </span>
              </span>
            </div>
            <div className="li">
              <span className="ic red">
                <Icone nom="arrow-down-right" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Ce qui le fait baisser")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Retard, commande non préparée, retour non conforme, litige perdu. Avis de 1 ou 2 ★.")}
                </span>
              </span>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Vos six critères")}
            </h3>
            <p className="t13 c3" style={{ "margin": "6px 0 4px" }}>
              {t("Chacun a une note sur 100 et compte pour une part du score.")}
            </p>
            <div style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <div className="row">
                <span className="grow">
                  <span className="b8 t14">
                    {t("Ponctualité")}
                  </span>
                  {" "}
                  <span className="c3 b6 t12">
                    {t("· 25\u00A0%")}
                  </span>
                </span>
                <span className="b8 t15">
                  {t("69,6")}
                </span>
              </div>
              <div className="bar mt8">
                <i style={{ "width": "69.6%" }}></i>
              </div>
              <div className="t12 c3 mt6">
                {t("7\u00A0commandes prêtes dans le délai")}
              </div>
            </div>
            <div style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <div className="row">
                <span className="grow">
                  <span className="b8 t14">
                    {t("Qualité")}
                  </span>
                  {" "}
                  <span className="c3 b6 t12">
                    {t("· 20\u00A0%")}
                  </span>
                </span>
                <span className="b8 t15">
                  {t("63,5")}
                </span>
              </div>
              <div className="bar mt8">
                <i style={{ "width": "63.5%" }}></i>
              </div>
              <div className="t12 c3 mt6">
                {t("4\u00A0commandes closes sans retour")}
              </div>
            </div>
            <div style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <div className="row">
                <span className="grow">
                  <span className="b8 t14">
                    {t("Satisfaction")}
                  </span>
                  {" "}
                  <span className="c3 b6 t12">
                    {t("· 20\u00A0%")}
                  </span>
                </span>
                <span className="b8 t15">
                  {t("54,5")}
                </span>
              </div>
              <div className="bar mt8">
                <i style={{ "width": "54.5%" }}></i>
              </div>
              <div className="t12 c3 mt6">
                {t("1 avis 5 ★\u00A0; l’avis 3 ★ ne compte ni pour ni contre")}
              </div>
            </div>
            <div style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <div className="row">
                <span className="grow">
                  <span className="b8 t14">
                    {t("Litiges")}
                  </span>
                  {" "}
                  <span className="c3 b6 t12">
                    {t("· 15\u00A0%")}
                  </span>
                </span>
                <span className="b8 t15">
                  {t("63,3")}
                </span>
              </div>
              <div className="bar mt8">
                <i style={{ "width": "63.3%" }}></i>
              </div>
              <div className="t12 c3 mt6">
                {t("4\u00A0commandes closes sans litige\u00A0; 2 en cours non comptés")}
              </div>
            </div>
            <div style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <div className="row">
                <span className="grow">
                  <span className="b8 t14">
                    {t("Documents")}
                  </span>
                  {" "}
                  <span className="c3 b6 t12">
                    {t("· 10\u00A0%")}
                  </span>
                </span>
                <span className="b8 t15">
                  {t("100")}
                </span>
              </div>
              <div className="bar mt8">
                <i style={{ "width": "100%" }}></i>
              </div>
              <div className="t12 c3 mt6">
                {t("CNI valide, selfie vérifié")}
              </div>
            </div>
            <div style={{ "padding": "12px 0", "borderTop": "1px solid var(--line)" }}>
              <div className="row">
                <span className="grow">
                  <span className="b8 t14">
                    {t("Ancienneté")}
                  </span>
                  {" "}
                  <span className="c3 b6 t12">
                    {t("· 10\u00A0%")}
                  </span>
                </span>
                <span className="b8 t15">
                  {t("22")}
                </span>
              </div>
              <div className="bar mt8">
                <i style={{ "width": "22%" }}></i>
              </div>
              <div className="t12 c3 mt6">
                {t("4\u00A0mois et demi\u00A0; 7\u00A0commandes livrées")}
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi 63\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <table className="tbl">
                  <tbody>
                    <tr>
                      <th style={{ "fontSize": "12px" }}>
                        {t("Critère")}
                      </th>
                      <th className="r" style={{ "fontSize": "12px" }}>
                        {t("Note")}
                      </th>
                      <th className="r" style={{ "fontSize": "12px" }}>
                        {t("Part")}
                      </th>
                      <th className="r" style={{ "fontSize": "12px" }}>
                        {t("Points")}
                      </th>
                    </tr>
                    <tr>
                      <td>
                        {t("Ponctualité")}
                      </td>
                      <td className="r">
                        {t("69,6")}
                      </td>
                      <td className="r">
                        {t("25\u00A0%")}
                      </td>
                      <td className="r b8">
                        {t("17,4")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Qualité")}
                      </td>
                      <td className="r">
                        {t("63,5")}
                      </td>
                      <td className="r">
                        {t("20\u00A0%")}
                      </td>
                      <td className="r b8">
                        {t("12,7")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Satisfaction")}
                      </td>
                      <td className="r">
                        {t("54,5")}
                      </td>
                      <td className="r">
                        {t("20\u00A0%")}
                      </td>
                      <td className="r b8">
                        {t("10,9")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Litiges")}
                      </td>
                      <td className="r">
                        {t("63,3")}
                      </td>
                      <td className="r">
                        {t("15\u00A0%")}
                      </td>
                      <td className="r b8">
                        {t("9,5")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Documents")}
                      </td>
                      <td className="r">
                        {t("100")}
                      </td>
                      <td className="r">
                        {t("10\u00A0%")}
                      </td>
                      <td className="r b8">
                        {t("10,0")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Ancienneté")}
                      </td>
                      <td className="r">
                        {t("22")}
                      </td>
                      <td className="r">
                        {t("10\u00A0%")}
                      </td>
                      <td className="r b8">
                        {t("2,2")}
                      </td>
                    </tr>
                    <tr>
                      <td className="b8">
                        {t("Total")}
                      </td>
                      <td></td>
                      <td className="r">
                        {t("100\u00A0%")}
                      </td>
                      <td className="r b8">
                        {t("62,7")}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt8">
                  {t("Note × part = points. Le total, 62,7, s’affiche arrondi\u00A0: 63.")}
                </p>
              </div>
            </details>
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
                {t("Chaque commande, retour ou avis compte comme un succès, un échec ou rien.")}
              </p>
              <table className="tbl" style={{ "margin": "4px 0 10px" }}>
                <tbody>
                  <tr>
                    <th style={{ "fontSize": "12px" }}>
                      {t("Événement")}
                    </th>
                    <th className="r" style={{ "fontSize": "12px" }}>
                      {t("Effet")}
                    </th>
                  </tr>
                  <tr>
                    <td>
                      {t("Prête dans le délai")}
                    </td>
                    <td className="r b8 cg">
                      {t("Succès")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Retard toléré")}
                    </td>
                    <td className="r b8 ca">
                      {t("Échec léger")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Retard au-delà du délai")}
                    </td>
                    <td className="r b8 cr">
                      {t("Échec moyen")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Non-préparation")}
                    </td>
                    <td className="r b8 cr">
                      {t("Échec grave + sanction niveau 2")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Rupture signalée avant l’échéance")}
                    </td>
                    <td className="r b8 ca">
                      {t("Échec léger")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Délai demandé puis tenu")}
                    </td>
                    <td className="r b8 ca">
                      {t("Échec léger")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Fermeture non annoncée au passage du livreur")}
                    </td>
                    <td className="r b8 cr">
                      {t("Échec moyen")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Annulation par le client")}
                    </td>
                    <td className="r b8 c3">
                      {t("Aucun effet")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Retour non conforme mineur")}
                    </td>
                    <td className="r b8 ca">
                      {t("Échec léger")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Défectueux, faux ou vice caché confirmé")}
                    </td>
                    <td className="r b8 cr">
                      {t("Échec grave")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Avis 4 ou 5 ★")}
                    </td>
                    <td className="r b8 cg">
                      {t("Succès")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Avis 3 ★")}
                    </td>
                    <td className="r b8 c3">
                      {t("Neutre")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Avis 1 ou 2 ★")}
                    </td>
                    <td className="r b8 ca">
                      {t("Échec léger")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      {t("Document expiré")}
                    </td>
                    <td className="r b8 cr">
                      {t("Documents à zéro jusqu’au renouvellement")}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p>
                {t("Un succès pèse 1. Un échec léger pèse 1, moyen 2, grave 4. Chaque événement perd la moitié de son poids en 90\u00A0jours.")}
              </p>
              <p>
                {t("Un litige en cours ne compte pas\u00A0; gagné, il est neutre.")}
              </p>
              <p>
                {t("Sans activité pendant 30\u00A0jours, vos critères sont gelés\u00A0; BelivaY les revoit à 90\u00A0jours.")}
              </p>
              <p>
                {t("Votre score baisse de 8 points au plus par recalcul. Il n’est jamais modifié à la main, et chaque calcul peut être rejoué.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}

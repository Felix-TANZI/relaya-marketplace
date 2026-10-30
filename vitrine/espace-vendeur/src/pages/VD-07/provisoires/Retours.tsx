// Page provisoire « Retours en cours » (VD-07) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Retours() {
  const { t } = usePreferences()
  switch (useEtat("retours")) {
    case "retours?role=prep":
    default:
      return (
        <Ecran route="retours" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Retours en cours")}
            </h1>
            <p className="pg-s">
              {t("Un retour n’est pas un litige\u00A0: le client renvoie l’article pour un motif précis. Vous l’inspectez à réception.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/retours" className="">
              {t("À décider ")}
              <span className="n">
                {t("0")}
              </span>
            </Link>
            <Link to="/retours" className="on">
              {t("En route ")}
              <span className="n">
                {t("1")}
              </span>
            </Link>
            <Link to="/retours" className="">
              {t("Clos ")}
              <span className="n">
                {t("0")}
              </span>
            </Link>
          </div>
          <div className="card ord ink">
            <div className="otop">
              <span className="oref">
                {t("RETOUR · BLV-00004")}
              </span>
              <span className="pill amber sm">
                <Icone nom="truck" taille={13} />
                {t("En route")}
              </span>
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av" style={{ "fontSize": "13px" }}>
                  {t("Motif\u00A0: défaut caché · «\u00A0L’écran reste noir après une journée\u00A0»")}
                </div>
              </div>
            </div>
            <div className="mt8">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Arrive chez vous")}
                  </span>
                  <span className="v ">
                    {t("demain, entre 14\u00A0h et 16\u00A0h")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Inspectez avant")}
                  </span>
                  <span className="v ">
                    {t("vendredi 16 oct. à 16\u00A0h")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Gelé jusqu’à l’inspection")}
                  </span>
                  <span className="v ">
                    <span className="cr b8">
                      {t("17\u00A0840\u00A0F")}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir le détail")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div>
                  <div className="kv">
                    <span className="k">
                      {t("Retirée par le client")}
                    </span>
                    <span className="v ">
                      {t("dim. 11 oct. à 10\u00A0h")}
                    </span>
                  </div>
                  <div className="kv">
                    <span className="k">
                      {t("Défaut signalé")}
                    </span>
                    <span className="v ">
                      {t("lun. 12 oct. à 16\u00A0h")}
                    </span>
                  </div>
                  <div className="kv">
                    <span className="k">
                      {t("Délai")}
                    </span>
                    <span className="v ">
                      {t("30\u00A0h après le retrait\u00A0: recevable")}
                    </span>
                  </div>
                </div>
                <div className="hint-l">
                  <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
                  <span>
                    {t("Un défaut caché se signale dans les 48\u00A0h après le retrait.")}
                  </span>
                </div>
              </div>
            </details>
            <div className="mt8">
              <Link to="/inspection" className="btn primary">
                <Icone nom="search" taille={18} />
                <span>
                  {t("Préparer l’inspection")}
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
              <div>
                <div className="li">
                  <span className="ic or">
                    <Icone nom="list-checks" taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ "display": "block" }}>
                      {t("Jamais de retour sans motif")}
                    </span>
                    <span className="ls" style={{ "display": "block" }}>
                      {t("Non conforme, abîmé, contrefaçon, défaut caché.")}
                    </span>
                  </span>
                </div>
                <div className="li">
                  <span className="ic or">
                    <Icone nom="calendar-clock" taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ "display": "block" }}>
                      {t("7\u00A0jours après le retrait")}
                    </span>
                    <span className="ls" style={{ "display": "block" }}>
                      {t("Fermé plus tôt si le client confirme «\u00A0Tout est en ordre\u00A0». Défaut caché\u00A0: 48\u00A0h, même après confirmation.")}
                    </span>
                  </span>
                </div>
                <div className="li">
                  <span className="ic or">
                    <Icone nom="search" taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ "display": "block" }}>
                      {t("Remboursé à l’inspection, jamais à la demande")}
                    </span>
                    <span className="ls" style={{ "display": "block" }}>
                      {t("Vous avez 48\u00A0h après réception\u00A0; au-delà, le remboursement part seul.")}
                    </span>
                  </span>
                </div>
                <div className="li">
                  <span className="ic or">
                    <Icone nom="truck" taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ "display": "block" }}>
                      {t("Trajet retour\u00A0: 500\u00A0F à la partie en tort")}
                    </span>
                    <span className="ls" style={{ "display": "block" }}>
                      {t("Vous si le défaut est confirmé, le transporteur si c’est abîmé en route, le client s’il a tort.")}
                    </span>
                  </span>
                </div>
                <div className="li">
                  <span className="ic or">
                    <Icone nom="repeat" taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ "display": "block" }}>
                      {t("Remplacement sous 72\u00A0h ouvrées")}
                    </span>
                    <span className="ls" style={{ "display": "block" }}>
                      {t("Sinon, remboursement automatique.")}
                    </span>
                  </span>
                </div>
                <div className="li">
                  <span className="ic or">
                    <Icone nom="shield-alert" taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ "display": "block" }}>
                      {t("Vice caché\u00A0: jusqu’à 100\u00A0jours")}
                    </span>
                    <span className="ls" style={{ "display": "block" }}>
                      {t("Un défaut grave découvert plus tard. Perdu après la libération\u00A0: la somme est reprise, avec une ligne datée dans Mes gains.")}
                    </span>
                  </span>
                </div>
                <div className="li">
                  <span className="ic or">
                    <Icone nom="store" taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ "display": "block" }}>
                      {t("Dépôt au relais par défaut")}
                    </span>
                    <span className="ls" style={{ "display": "block" }}>
                      {t("Ramassage chez le client pour les volumineux. Aucun frais de stockage sur un colis en retour.")}
                    </span>
                  </span>
                </div>
              </div>
              <p style={{ "margin": "12px 0 0", "paddingTop": "12px", "borderTop": "1px solid var(--line)" }}>
                <b>
                  {t("Colis non retiré\u00A0:")}
                </b>
                {t(" le relais le garde 7\u00A0jours, puis il vous revient sans frais et sans effet sur votre Trust Score. Remettez-le en stock à l’arrivée.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}

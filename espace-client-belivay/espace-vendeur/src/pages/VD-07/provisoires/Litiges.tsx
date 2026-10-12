// Page provisoire « Litiges reçus » (VD-07) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Litiges() {
  const { t } = usePreferences()
  switch (useEtat("litiges")) {
    default:
      return (
        <Ecran route="litiges" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Litiges reçus")}
            </h1>
            <p className="pg-s">
              {t("Un client signale un problème. Vous répondez, puis un médiateur BelivaY neutre décide.")}
            </p>
          </div>
          <div className="hero night">
            <div className="otop">
              <span className="hk">
                {t("Argent gelé")}
              </span>
              <span className="pill dk sm">
                {t("2 litiges")}
              </span>
            </div>
            <div className="big" style={{ "color": "#FF9C8F" }}>
              {t("670\u00A0648")}
              <small style={{ "color": "#fff" }}>
                {t("FCFA")}
              </small>
            </div>
            <div className="hs">
              {t("Sans date de versement pendant les litiges.")}
              <br />
              {t("Gagner libère la somme aussitôt.")}
            </div>
            <div className="hline"></div>
            <div className="row" style={{ "alignItems": "flex-start", "gap": "10px" }}>
              <Icone nom="clock" taille={18} style={{ "color": "var(--gold-l)", "flexShrink": "0", "marginTop": "2px" }} />
              <div className="t14" style={{ "lineHeight": "1.45" }}>
                <b>
                  {t("Vous avez 48\u00A0h pour répondre.")}
                </b>
                {t(" Sans réponse, la décision est prise en faveur du client.")}
              </div>
            </div>
          </div>
          <div className="chips">
            <Link to="/litiges" className="chip on">
              {t("À répondre ")}
              <span className="n">
                {t("2")}
              </span>
            </Link>
            <Link to="/litiges" className="chip">
              {t("En médiation ")}
              <span className="n">
                {t("0")}
              </span>
            </Link>
            <Link to="/litiges" className="chip">
              {t("Clos ")}
              <span className="n">
                {t("0")}
              </span>
            </Link>
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
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av" style={{ "fontSize": "13px" }}>
                  {t("Le client dit\u00A0: «\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
              </div>
            </div>
            <div className="mt8">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Répondez avant")}
                  </span>
                  <span className="v ">
                    {t("demain à 05\u00A0h\u00A030")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Gelé jusqu’à la décision")}
                  </span>
                  <span className="v ">
                    <span className="cr">
                      {t("335\u00A0324\u00A0F")}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="mt8">
              <Link to="/litige?ref=BLV-00005" className="btn primary">
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
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="av" style={{ "fontSize": "13px" }}>
                  {t("Le client dit\u00A0: «\u00A0Colis abîmé\u00A0»")}
                </div>
              </div>
            </div>
            <div className="mt8">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Répondez avant")}
                  </span>
                  <span className="v ">
                    {t("mercredi 23 sept. à 06\u00A0h\u00A002")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Gelé jusqu’à la décision")}
                  </span>
                  <span className="v ">
                    <span className="cr">
                      {t("335\u00A0324\u00A0F")}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="mt8">
              <Link to="/litige?ref=BLV-00006" className="btn soft">
                <Icone nom="scale" taille={18} />
                <span>
                  {t("Répondre")}
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
              <div style={{ "margin": "0 0 14px" }}>
                <div className="row" style={{ "gap": "0", "marginTop": "12px", "alignItems": "flex-start" }}>
                  <div className="grow center" style={{ "position": "relative" }}>
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--or-soft)", "color": "var(--or-txt)", "border": "2px solid var(--braise-1)" }}>
                      {t("1")}
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--or-txt)", "lineHeight": "1.25" }}>
                      {t("Litige reçu")}
                    </div>
                  </div>
                  <div className="grow center" style={{ "position": "relative" }}>
                    <span style={{ "position": "absolute", "top": "13px", "right": "50%", "width": "100%", "height": "2px", "zIndex": "0", "background": "var(--line-2)" }}></span>
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--sand-2)", "color": "var(--ink-3)", "border": "2px solid var(--line-2)" }}>
                      {t("2")}
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--ink-3)", "lineHeight": "1.25" }}>
                      {t("Votre réponse")}
                    </div>
                  </div>
                  <div className="grow center" style={{ "position": "relative" }}>
                    <span style={{ "position": "absolute", "top": "13px", "right": "50%", "width": "100%", "height": "2px", "zIndex": "0", "background": "var(--line-2)" }}></span>
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--sand-2)", "color": "var(--ink-3)", "border": "2px solid var(--line-2)" }}>
                      {t("3")}
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--ink-3)", "lineHeight": "1.25" }}>
                      {t("Médiation")}
                    </div>
                  </div>
                  <div className="grow center" style={{ "position": "relative" }}>
                    <span style={{ "position": "absolute", "top": "13px", "right": "50%", "width": "100%", "height": "2px", "zIndex": "0", "background": "var(--line-2)" }}></span>
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--sand-2)", "color": "var(--ink-3)", "border": "2px solid var(--line-2)" }}>
                      {t("4")}
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--ink-3)", "lineHeight": "1.25" }}>
                      {t("Décision")}
                    </div>
                  </div>
                </div>
              </div>
              <p>
                <b>
                  {t("Délai.")}
                </b>
                {t(" Vous avez 48\u00A0h pour répondre. Sans réponse, la décision est prise en faveur du client.")}
              </p>
              <p>
                <b>
                  {t("Médiation.")}
                </b>
                {t(" Après votre réponse, un médiateur BelivaY décide sous 48\u00A0h, avec un motif écrit.")}
              </p>
              <p>
                <b>
                  {t("Contestation.")}
                </b>
                {t(" Chacun peut contester une fois\u00A0: un médiateur senior décide alors sous 3\u00A0jours.")}
              </p>
              <p>
                <b>
                  {t("Trust Score.")}
                </b>
                {t(" Un litige en cours n’a aucun effet\u00A0; seul un litige perdu compte.")}
              </p>
              <p>
                <b>
                  {t("Preuves.")}
                </b>
                {t(" Les photos du contrôle au ramassage et de la remise sont déjà au dossier. Une capture WhatsApp n’est pas une preuve.")}
              </p>
              <p>
                <b>
                  {t("Votre argent.")}
                </b>
                {t(" Gagné\u00A0: libéré aussitôt, versé le vendredi suivant. Perdu\u00A0: le client est remboursé, sans frais pour vous.")}
              </p>
              <p>
                <b>
                  {t("Petit montant.")}
                </b>
                {t(" Jusqu’à 3\u00A0000\u00A0F (10\u00A0000\u00A0F pour un client très fiable), BelivaY rembourse lui-même\u00A0: vous êtes payé, votre score ne bouge pas.")}
              </p>
            </div>
          </details>
          <details className="more">
            <summary>
              <Icone nom="lightbulb" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Éviter les litiges")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                {t("Décrivez l’article exactement\u00A0: modèle, capacité, couleur, état.")}
              </p>
              <p>
                {t("Au ramassage, montrez au livreur le modèle et la capacité\u00A0: ses photos vous protègent.")}
              </p>
              <p>
                {t("Répondez aux questions du client dans la messagerie BelivaY.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}

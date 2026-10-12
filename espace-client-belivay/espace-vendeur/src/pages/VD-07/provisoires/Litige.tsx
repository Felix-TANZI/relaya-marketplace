// Page provisoire « Répondre » (VD-07) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (10 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Litige() {
  const { t } = usePreferences()
  switch (useEtat("litige")) {
    case "litige?ref=BLV-00005":
    case "litige?ref=BLV-00005&role=prep":
    case "litige?pos=conteste&ref=BLV-00005":
    default:
      return (
        <Ecran route="litige" parEtat>
          <div className="pg">
            <div className="pg-k" style={{ "color": "var(--red)" }}>
              <Icone nom="hourglass" taille={14} style={{ "verticalAlign": "-2px" }} />
              {t(" Il reste ")}
              <span className="nu">
                {t("19\u00A0h\u00A042")}
              </span>
            </div>
            <h1 className="pg-t">
              {t("Répondre au litige")}
            </h1>
            <p className="pg-s">
              {t("Répondez avant ")}
              <b className="c2">
                {t("demain, mardi 22 sept. à 05\u00A0h\u00A030")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
          </div>
          <div className="card ord red">
            <div className="kick">
              {t("Ce que dit le client")}
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("«\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
                <div className="av" style={{ "fontSize": "13px" }}>
                  {t("iPhone 15 Pro Max · il attend un remboursement")}
                </div>
              </div>
            </div>
            <div className="mt8">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Gelé jusqu’à la décision")}
                  </span>
                  <span className="v ">
                    <span className="cr b8">
                      {t("335\u00A0324\u00A0F")}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="image" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir les photos du client")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div className="t13 c3">
                  {t("Litige ouvert dimanche 20 sept. à 05\u00A0h\u00A030.")}
                </div>
                <div className="split2 mt8">
                  <div className="photo">
                    <Dessin id="658cb831b69e" />
                    <span className="ts">
                      {t("Photo du client · au relais")}
                    </span>
                  </div>
                  <div className="photo">
                    <Dessin id="97f264a1205c" />
                    <span className="ts">
                      {t("Photo du client · au relais")}
                    </span>
                  </div>
                </div>
              </div>
            </details>
          </div>
          <div className="divider-t">
            {t("Ce que vous décidez")}
          </div>
          <Link to="/litige?ref=BLV-00005&pos=accepte" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("J’accepte")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le client est remboursé. Le litige est clos aujourd’hui.")}
              </span>
            </span>
          </Link>
          <Link to="/litige?ref=BLV-00005&pos=conteste" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Je conteste")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Vous montrez vos preuves. La médiation BelivaY décide.")}
              </span>
            </span>
          </Link>
          <Link to="/litige?ref=BLV-00005&pos=arrangement" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Je propose un arrangement")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Un remplacement ou une remise partielle.")}
              </span>
            </span>
          </Link>
          <div className="mt4">
            <div className="fld">
              <label>
                {t("Ce que vous constatez ")}
                <span className="req">
                  {t("*")}
                </span>
              </label>
              <div className="inp focus area">
                <span className="grow">
                  {t("Le livreur a contrôlé l’iPhone 15 Pro Max titane naturel 256 Go devant moi le 12 sept. à 14\u00A0h\u00A020. Ses deux photos au dossier montrent le modèle commandé.")}
                </span>
              </div>
              <div className="hint">
                {t("Décrivez les faits, pas le client.")}
              </div>
            </div>
            <details className="more" open>
              <summary>
                <Icone nom="camera" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Vos preuves · 2 photos déjà au dossier")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div className="t13 c3">
                  {t("Versées automatiquement, vous pouvez en ajouter\u00A0:")}
                </div>
                <div className="photos">
                  <div className="photo">
                    <Dessin id="31d53847e649" />
                    <span className="ts">
                      {t("Ramassage · 12 sept. 14\u00A0h\u00A020")}
                    </span>
                  </div>
                  <div className="photo">
                    <Dessin id="97f264a1205c" />
                    <span className="ts">
                      {t("Scellé · 12 sept. 14\u00A0h\u00A021")}
                    </span>
                  </div>
                  <div className="addph">
                    <Icone nom="camera" taille={22} />
                    <span>
                      {t("Ajouter")}
                    </span>
                  </div>
                </div>
                <div className="hint-l">
                  <Icone nom="ban" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
                  <span>
                    {t("Une capture WhatsApp n’est pas une preuve\u00A0: le fil de la messagerie BelivaY l’est.")}
                  </span>
                </div>
                <Link to="/messages" className="row t14 b7 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                  {t("Relire les messages de la commande")}
                  <Icone nom="chevron-right" taille={16} />
                </Link>
              </div>
            </details>
          </div>
          <div className="mt16">
            <Link to="/litige_envoye?ref=BLV-00005" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Envoyer ma réponse")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Une fois envoyée, votre réponse ne se modifie plus.")}
            <br />
            {t("La médiation décide ensuite sous 48\u00A0h.")}
          </p>
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
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--green-soft)", "color": "var(--green)", "border": "2px solid var(--green)" }}>
                      <Icone nom="check" taille={14} trait={3} />
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--ink-3)", "lineHeight": "1.25" }}>
                      {t("Litige reçu")}
                    </div>
                  </div>
                  <div className="grow center" style={{ "position": "relative" }}>
                    <span style={{ "position": "absolute", "top": "13px", "right": "50%", "width": "100%", "height": "2px", "zIndex": "0", "background": "var(--green)" }}></span>
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--or-soft)", "color": "var(--or-txt)", "border": "2px solid var(--braise-1)" }}>
                      {t("2")}
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--or-txt)", "lineHeight": "1.25" }}>
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
            </div>
          </details>
        </Ecran>
      )
    case "litige?pos=arrangement":
    case "litige?pos=arrangement&ref=BLV-00005":
      return (
        <Ecran route="litige" parEtat>
          <div className="pg">
            <div className="pg-k" style={{ "color": "var(--red)" }}>
              <Icone nom="hourglass" taille={14} style={{ "verticalAlign": "-2px" }} />
              {t(" Il reste ")}
              <span className="nu">
                {t("19\u00A0h\u00A042")}
              </span>
            </div>
            <h1 className="pg-t">
              {t("Répondre au litige")}
            </h1>
            <p className="pg-s">
              {t("Répondez avant ")}
              <b className="c2">
                {t("demain, mardi 22 sept. à 05\u00A0h\u00A030")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
          </div>
          <div className="card ord red">
            <div className="kick">
              {t("Ce que dit le client")}
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("«\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
                <div className="av" style={{ "fontSize": "13px" }}>
                  {t("iPhone 15 Pro Max · il attend un remboursement")}
                </div>
              </div>
            </div>
            <div className="mt8">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Gelé jusqu’à la décision")}
                  </span>
                  <span className="v ">
                    <span className="cr b8">
                      {t("335\u00A0324\u00A0F")}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="image" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir les photos du client")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div className="t13 c3">
                  {t("Litige ouvert dimanche 20 sept. à 05\u00A0h\u00A030.")}
                </div>
                <div className="split2 mt8">
                  <div className="photo">
                    <Dessin id="658cb831b69e" />
                    <span className="ts">
                      {t("Photo du client · au relais")}
                    </span>
                  </div>
                  <div className="photo">
                    <Dessin id="97f264a1205c" />
                    <span className="ts">
                      {t("Photo du client · au relais")}
                    </span>
                  </div>
                </div>
              </div>
            </details>
          </div>
          <div className="divider-t">
            {t("Ce que vous décidez")}
          </div>
          <Link to="/litige?ref=BLV-00005&pos=accepte" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("J’accepte")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le client est remboursé. Le litige est clos aujourd’hui.")}
              </span>
            </span>
          </Link>
          <Link to="/litige?ref=BLV-00005&pos=conteste" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Je conteste")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Vous montrez vos preuves. La médiation BelivaY décide.")}
              </span>
            </span>
          </Link>
          <Link to="/litige?ref=BLV-00005&pos=arrangement" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Je propose un arrangement")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Un remplacement ou une remise partielle.")}
              </span>
            </span>
          </Link>
          <div className="mt4">
            <div className="chips">
              <Link to="/litige?ref=BLV-00005&pos=arrangement" className="chip on">
                <Icone nom="repeat" taille={15} />
                {t("Remplacement")}
              </Link>
              <Link to="/litige?ref=BLV-00005&pos=arrangement" className="chip">
                <Icone nom="hand-coins" taille={15} />
                {t("Remise partielle")}
              </Link>
            </div>
            <div className="fld">
              <label>
                {t("Votre proposition ")}
                <span className="req">
                  {t("*")}
                </span>
              </label>
              <div className="inp area focus">
                {t("Je propose un remplacement par un iPhone 15 Pro Max neuf de la même couleur, expédié sous 72\u00A0h ouvrées.")}
              </div>
              <div className="cnt ok">
                {t("103 caractères · 40 au moins ✓")}
              </div>
            </div>
            <div className="note amber">
              <Icone nom="clock" taille={18} />
              <div>
                {t("Un remplacement accepté part sous ")}
                <b>
                  {t("72\u00A0h ouvrées")}
                </b>
                {t(". Passé ce délai, le client est remboursé automatiquement.")}
              </div>
            </div>
            <details className="more">
              <summary>
                <Icone nom="camera" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Vos preuves · 2 photos déjà au dossier")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div className="t13 c3">
                  {t("Versées automatiquement, vous pouvez en ajouter\u00A0:")}
                </div>
                <div className="photos">
                  <div className="photo">
                    <Dessin id="31d53847e649" />
                    <span className="ts">
                      {t("Ramassage · 12 sept. 14\u00A0h\u00A020")}
                    </span>
                  </div>
                  <div className="photo">
                    <Dessin id="97f264a1205c" />
                    <span className="ts">
                      {t("Scellé · 12 sept. 14\u00A0h\u00A021")}
                    </span>
                  </div>
                  <div className="addph">
                    <Icone nom="camera" taille={22} />
                    <span>
                      {t("Ajouter")}
                    </span>
                  </div>
                </div>
                <div className="hint-l">
                  <Icone nom="ban" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
                  <span>
                    {t("Une capture WhatsApp n’est pas une preuve\u00A0: le fil de la messagerie BelivaY l’est.")}
                  </span>
                </div>
                <Link to="/messages" className="row t14 b7 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                  {t("Relire les messages de la commande")}
                  <Icone nom="chevron-right" taille={16} />
                </Link>
              </div>
            </details>
          </div>
          <div className="mt16">
            <Link to="/litige_envoye?ref=BLV-00005" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Envoyer ma réponse")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Une fois envoyée, votre réponse ne se modifie plus.")}
            <br />
            {t("La médiation décide ensuite sous 48\u00A0h.")}
          </p>
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
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--green-soft)", "color": "var(--green)", "border": "2px solid var(--green)" }}>
                      <Icone nom="check" taille={14} trait={3} />
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--ink-3)", "lineHeight": "1.25" }}>
                      {t("Litige reçu")}
                    </div>
                  </div>
                  <div className="grow center" style={{ "position": "relative" }}>
                    <span style={{ "position": "absolute", "top": "13px", "right": "50%", "width": "100%", "height": "2px", "zIndex": "0", "background": "var(--green)" }}></span>
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--or-soft)", "color": "var(--or-txt)", "border": "2px solid var(--braise-1)" }}>
                      {t("2")}
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--or-txt)", "lineHeight": "1.25" }}>
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
            </div>
          </details>
        </Ecran>
      )
    case "litige?pos=accepte":
    case "litige?pos=accepte&ref=BLV-00005":
      return (
        <Ecran route="litige" parEtat>
          <div className="pg">
            <div className="pg-k" style={{ "color": "var(--red)" }}>
              <Icone nom="hourglass" taille={14} style={{ "verticalAlign": "-2px" }} />
              {t(" Il reste ")}
              <span className="nu">
                {t("19\u00A0h\u00A042")}
              </span>
            </div>
            <h1 className="pg-t">
              {t("Répondre au litige")}
            </h1>
            <p className="pg-s">
              {t("Répondez avant ")}
              <b className="c2">
                {t("demain, mardi 22 sept. à 05\u00A0h\u00A030")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
          </div>
          <div className="card ord red">
            <div className="kick">
              {t("Ce que dit le client")}
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("«\u00A0Ce n’est pas le bon produit\u00A0»")}
                </div>
                <div className="av" style={{ "fontSize": "13px" }}>
                  {t("iPhone 15 Pro Max · il attend un remboursement")}
                </div>
              </div>
            </div>
            <div className="mt8">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Gelé jusqu’à la décision")}
                  </span>
                  <span className="v ">
                    <span className="cr b8">
                      {t("335\u00A0324\u00A0F")}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="image" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir les photos du client")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div className="t13 c3">
                  {t("Litige ouvert dimanche 20 sept. à 05\u00A0h\u00A030.")}
                </div>
                <div className="split2 mt8">
                  <div className="photo">
                    <Dessin id="658cb831b69e" />
                    <span className="ts">
                      {t("Photo du client · au relais")}
                    </span>
                  </div>
                  <div className="photo">
                    <Dessin id="97f264a1205c" />
                    <span className="ts">
                      {t("Photo du client · au relais")}
                    </span>
                  </div>
                </div>
              </div>
            </details>
          </div>
          <div className="divider-t">
            {t("Ce que vous décidez")}
          </div>
          <Link to="/litige?ref=BLV-00005&pos=accepte" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("J’accepte")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le client est remboursé. Le litige est clos aujourd’hui.")}
              </span>
            </span>
          </Link>
          <Link to="/litige?ref=BLV-00005&pos=conteste" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Je conteste")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Vous montrez vos preuves. La médiation BelivaY décide.")}
              </span>
            </span>
          </Link>
          <Link to="/litige?ref=BLV-00005&pos=arrangement" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Je propose un arrangement")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Un remplacement ou une remise partielle.")}
              </span>
            </span>
          </Link>
          <div className="mt4">
            <div className="note amber">
              <Icone nom="undo-2" taille={18} />
              <div>
                <b>
                  {t("Ce qui se passe si vous acceptez")}
                </b>
                <br />
                {t("Le client est remboursé aujourd’hui.")}
                <br />
                {t("Vous ne gardez rien sur cette vente et vous ne payez aucun frais.")}
                <br />
                {t("L’article vous revient par le relais.")}
              </div>
            </div>
          </div>
          <div className="mt16">
            <Link to="/litige_envoye?ref=BLV-00005&issue=accepte" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Envoyer ma réponse")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Une fois envoyée, votre réponse ne se modifie plus.")}
            <br />
            {t("Le litige est clos aussitôt.")}
          </p>
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
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--green-soft)", "color": "var(--green)", "border": "2px solid var(--green)" }}>
                      <Icone nom="check" taille={14} trait={3} />
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--ink-3)", "lineHeight": "1.25" }}>
                      {t("Litige reçu")}
                    </div>
                  </div>
                  <div className="grow center" style={{ "position": "relative" }}>
                    <span style={{ "position": "absolute", "top": "13px", "right": "50%", "width": "100%", "height": "2px", "zIndex": "0", "background": "var(--green)" }}></span>
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--or-soft)", "color": "var(--or-txt)", "border": "2px solid var(--braise-1)" }}>
                      {t("2")}
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--or-txt)", "lineHeight": "1.25" }}>
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
            </div>
          </details>
        </Ecran>
      )
    case "litige?ref=BLV-00006":
    case "litige?ref=BLV-00006&role=prep":
      return (
        <Ecran route="litige" parEtat>
          <div className="pg">
            <div className="pg-k" style={{ "color": "var(--red)" }}>
              <Icone nom="hourglass" taille={14} style={{ "verticalAlign": "-2px" }} />
              {t(" Il reste ")}
              <span className="nu">
                {t("44\u00A0h\u00A014")}
              </span>
            </div>
            <h1 className="pg-t">
              {t("Répondre au litige")}
            </h1>
            <p className="pg-s">
              {t("Répondez avant ")}
              <b className="c2">
                {t("mercredi 23 sept. à 06\u00A0h\u00A002")}
              </b>
              {t(". Sans réponse, la décision est prise en faveur du client.")}
            </p>
          </div>
          <div className="card ord red">
            <div className="kick">
              {t("Ce que dit le client")}
            </div>
            <div className="art">
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="31bc76de2a59" />
              </span>
              <div className="grow">
                <div className="an">
                  {t("«\u00A0Colis abîmé\u00A0»")}
                </div>
                <div className="av" style={{ "fontSize": "13px" }}>
                  {t("iPhone 15 Pro Max · il attend un remplacement")}
                </div>
              </div>
            </div>
            <div className="mt8">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Gelé jusqu’à la décision")}
                  </span>
                  <span className="v ">
                    <span className="cr b8">
                      {t("335\u00A0324\u00A0F")}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="image" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir les photos du client")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div className="t13 c3">
                  {t("Litige ouvert aujourd’hui à 06\u00A0h\u00A002.")}
                </div>
                <div className="split2 mt8">
                  <div className="photo">
                    <Dessin id="97f264a1205c" />
                    <span className="ts">
                      {t("Photo du client · au relais")}
                    </span>
                  </div>
                  <div className="photo">
                    <Dessin id="5ad4d4dd2824" />
                    <span className="ts">
                      {t("Photo du client · au relais")}
                    </span>
                  </div>
                </div>
              </div>
            </details>
          </div>
          <div className="divider-t">
            {t("Ce que vous décidez")}
          </div>
          <Link to="/litige?ref=BLV-00006&pos=accepte" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("J’accepte")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le client est remboursé. Le litige est clos aujourd’hui.")}
              </span>
            </span>
          </Link>
          <Link to="/litige?ref=BLV-00006&pos=conteste" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Je conteste")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Vous montrez vos preuves. La médiation BelivaY décide.")}
              </span>
            </span>
          </Link>
          <Link to="/litige?ref=BLV-00006&pos=arrangement" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Je propose un arrangement")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Un remplacement ou une remise partielle.")}
              </span>
            </span>
          </Link>
          <div className="mt4">
            <div className="fld">
              <label>
                {t("Ce que vous constatez ")}
                <span className="req">
                  {t("*")}
                </span>
              </label>
              <div className="inp focus area">
                <span className="grow">
                  {t("Le livreur a contrôlé l’iPhone 15 Pro Max titane naturel 256 Go devant moi le 12 sept. à 14\u00A0h\u00A020. Ses deux photos au dossier montrent le modèle commandé.")}
                </span>
              </div>
              <div className="hint">
                {t("Décrivez les faits, pas le client.")}
              </div>
            </div>
            <details className="more" open>
              <summary>
                <Icone nom="camera" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Vos preuves · 2 photos déjà au dossier")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div className="t13 c3">
                  {t("Versées automatiquement, vous pouvez en ajouter\u00A0:")}
                </div>
                <div className="photos">
                  <div className="photo">
                    <Dessin id="31d53847e649" />
                    <span className="ts">
                      {t("Ramassage · 12 sept. 14\u00A0h\u00A020")}
                    </span>
                  </div>
                  <div className="photo">
                    <Dessin id="97f264a1205c" />
                    <span className="ts">
                      {t("Scellé · 12 sept. 14\u00A0h\u00A021")}
                    </span>
                  </div>
                  <div className="addph">
                    <Icone nom="camera" taille={22} />
                    <span>
                      {t("Ajouter")}
                    </span>
                  </div>
                </div>
                <div className="hint-l">
                  <Icone nom="ban" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
                  <span>
                    {t("Une capture WhatsApp n’est pas une preuve\u00A0: le fil de la messagerie BelivaY l’est.")}
                  </span>
                </div>
                <Link to="/messages" className="row t14 b7 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                  {t("Relire les messages de la commande")}
                  <Icone nom="chevron-right" taille={16} />
                </Link>
              </div>
            </details>
          </div>
          <div className="mt16">
            <Link to="/litige_envoye?ref=BLV-00006" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Envoyer ma réponse")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Une fois envoyée, votre réponse ne se modifie plus.")}
            <br />
            {t("La médiation décide ensuite sous 48\u00A0h.")}
          </p>
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
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--green-soft)", "color": "var(--green)", "border": "2px solid var(--green)" }}>
                      <Icone nom="check" taille={14} trait={3} />
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--ink-3)", "lineHeight": "1.25" }}>
                      {t("Litige reçu")}
                    </div>
                  </div>
                  <div className="grow center" style={{ "position": "relative" }}>
                    <span style={{ "position": "absolute", "top": "13px", "right": "50%", "width": "100%", "height": "2px", "zIndex": "0", "background": "var(--green)" }}></span>
                    <span style={{ "position": "relative", "zIndex": "1", "width": "28px", "height": "28px", "borderRadius": "50%", "margin": "0 auto", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "800", "background": "var(--or-soft)", "color": "var(--or-txt)", "border": "2px solid var(--braise-1)" }}>
                      {t("2")}
                    </span>
                    <div className="t12 b7 mt6" style={{ "color": "var(--or-txt)", "lineHeight": "1.25" }}>
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
            </div>
          </details>
        </Ecran>
      )
  }
}

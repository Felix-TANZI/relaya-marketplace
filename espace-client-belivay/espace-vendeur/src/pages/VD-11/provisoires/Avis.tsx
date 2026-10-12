// Page provisoire « Avis et droit de réponse » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Avis() {
  const { t } = usePreferences()
  switch (useEtat("avis")) {
    default:
      return (
        <Ecran route="avis" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Avis")}
            </h1>
            <p className="pg-s">
              {t("Seuls les clients qui ont payé et retiré peuvent noter.")}
            </p>
          </div>
          <div className="hero night">
            <div className="row">
              <div className="big" style={{ "margin": "0" }}>
                {t("4,0")}
              </div>
              <div className="grow">
                <div style={{ "fontSize": "20px" }}>
                  <span style={{ "color": "var(--gold)", "letterSpacing": "1px" }}>
                    {t("★★★★")}
                    <span style={{ "color": "rgba(255,255,255,.25)" }}>
                      {t("★")}
                    </span>
                  </span>
                </div>
                <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.78)" }}>
                  {t("2 avis · achats vérifiés")}
                </div>
              </div>
            </div>
            <div className="hs mt10">
              {t("Les avis comptent pour 20\u00A0% de votre Trust Score, votre note de confiance.")}
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="star" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                <b>
                  {t("Ce qui compte\u00A0:")}
                </b>
                {t(" un avis 4 ou 5 ★ est un succès. Un 3 ★ ne compte ni pour ni contre. 1 ou 2 ★ est un échec léger.")}
              </p>
              <p>
                <b>
                  {t("Votre réponse\u00A0:")}
                </b>
                {t(" privée, transmise par le support, pendant 30\u00A0jours après l’avis.")}
              </p>
              <p>
                <b>
                  {t("Ce qui est interdit\u00A0:")}
                </b>
                {t(" répondre publiquement à un avis, négocier un avis contre un remboursement, supprimer un avis.")}
              </p>
              <p>
                {t("Un avis manifestement injuste peut être retiré par un médiateur senior de BelivaY.")}
              </p>
            </div>
          </details>
          <div className="card">
            <div className="row">
              <span className="grow">
                <span style={{ "color": "var(--gold)", "letterSpacing": "1px" }}>
                  {t("★★★")}
                  <span style={{ "color": "var(--sand-4)" }}>
                    {t("★★")}
                  </span>
                </span>
              </span>
              <span className="pill green sm">
                <Icone nom="badge-check" taille={13} />
                {t("Achat vérifié")}
              </span>
            </div>
            <div className="t14 c2 mt8" style={{ "lineHeight": "1.5" }}>
              {t("«\u00A0Bon téléphone, mais la boîte était un peu abîmée.\u00A0»")}
            </div>
            <div className="t12 c3 mt6">
              {t("BLV-00002 · il y a 5\u00A0jours · client anonyme")}
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="list" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir le détail")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div className="kick" style={{ "marginBottom": "4px" }}>
                  {t("Le journal de la commande")}
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Prête")}
                  </span>
                  <span className="v ">
                    {t("1\u00A0h\u00A050 avant l’échéance")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Ramassage")}
                  </span>
                  <span className="v ">
                    {t("Contrôlé et scellé à 14\u00A0h\u00A032 · 2 photos")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Tournée")}
                  </span>
                  <span className="v ">
                    {t("Retirée au relais le lendemain")}
                  </span>
                </div>
              </div>
            </details>
            <div className="mt4">
              <Link to="/messages" className="btn primary">
                <Icone nom="message-circle" taille={18} />
                <span>
                  {t("Répondre en privé")}
                </span>
              </Link>
            </div>
            <div className="hint-l">
              <Icone nom="eye-off" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Via le support, sans le nom de votre boutique. Jusqu’au 14 octobre.")}
              </span>
            </div>
          </div>
          <div className="card">
            <div className="row">
              <span className="grow">
                <span style={{ "color": "var(--gold)", "letterSpacing": "1px" }}>
                  {t("★★★★★")}
                  <span style={{ "color": "var(--sand-4)" }}></span>
                </span>
              </span>
              <span className="pill green sm">
                <Icone nom="badge-check" taille={13} />
                {t("Achat vérifié")}
              </span>
            </div>
            <div className="t14 c2 mt8">
              {t("Note seule, sans commentaire.")}
            </div>
            <div className="t12 c3 mt6">
              {t("BLV-00001 · il y a 3 semaines")}
            </div>
          </div>
        </Ecran>
      )
  }
}

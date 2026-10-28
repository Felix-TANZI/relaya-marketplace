// Page provisoire « Reçu vendeur » (VD-06) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (8 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import img_be926f70d2b8_png from '../../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Recu() {
  const { t } = usePreferences()
  switch (useEtat("recu")) {
    default:
      return (
        <Ecran route="recu" parEtat>
          <div className="vx-chips" role="group" aria-label="Exemples de moyens de paiement">
            <Link to="/recu" className="on">
              <Icone nom="smartphone" taille={14} />
              {t("MoMo")}
            </Link>
            <Link to="/recu?pay=carte" className="">
              <Icone nom="credit-card" taille={14} />
              {t("Carte")}
            </Link>
            <Link to="/recu?pay=apple" className="">
              <Icone nom="apple" taille={14} />
              {t("Apple Pay")}
            </Link>
            <Link to="/recu?pay=google" className="">
              <Icone nom="gpay-g" taille={14} />
              {t("Google Pay")}
            </Link>
            <Link to="/recu?pay=wallet" className="">
              <Icone nom="wallet" taille={14} />
              {t("Wallet")}
            </Link>
            <Link to="/recu?pay=usd" className="">
              <Icone nom="globe" taille={14} />
              {t("$")}
            </Link>
            <Link to="/recu?pay=eur" className="">
              <Icone nom="globe" taille={14} />
              {t("€")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "16px", "padding": "0", "overflow": "hidden" }}>
            <div className="hero night" style={{ "margin": "0", "borderRadius": "0", "padding": "18px 16px", "boxShadow": "none" }}>
              <div className="row">
                <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "24px" }} />
                <span className="grow"></span>
                <span className="hk">
                  {t("Reçu vendeur")}
                </span>
              </div>
              <div className="b8 mt12" style={{ "fontSize": "22px", "letterSpacing": "-.01em" }}>
                {t("BLV-00008")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.8)" }}>
                {t("Encaissé le mar. 13 oct. 2026 à 08\u00A0h\u00A042")}
              </div>
            </div>
            <div style={{ "padding": "6px 16px 16px" }}>
              <div className="kv">
                <span className="k">
                  {t("Article")}
                </span>
                <span className="v ">
                  {t("ITEL AC52 · noir · neuf · ×1")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Classe du colis")}
                </span>
                <span className="v ">
                  {t("S")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Client")}
                </span>
                <span className="v ">
                  {t("Identité masquée")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("ni nom, ni numéro, ni adresse, ni relais")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Encaissé par")}
                </span>
                <span className="v ">
                  {t("BelivaY, mandataire")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("c’est-à-dire pour votre compte")}
                  </span>
                </span>
              </div>
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
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
              <div className="keep" style={{ "marginTop": "12px" }}>
                <span className="kl">
                  {t("Vous gardez · versés sans frais")}
                </span>
                <span className="kv2">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <p className="t12 c3" style={{ "margin": "12px 0 0", "lineHeight": "1.5" }}>
                {t("Ce reçu n’est pas une facture fiscale. La facture de BelivaY est mensuelle\u00A0: elle est rangée dans Documents.")}
              </p>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Partager le reçu")}
              </span>
            </button>
          </div>
          <div className="links">
            <Link to="/documents" style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "44px" }}>
              <Icone nom="file-text" taille={17} />
              {t("Voir mes documents")}
            </Link>
          </div>
        </Ecran>
      )
    case "recu?pay=carte":
      return (
        <Ecran route="recu" parEtat>
          <div className="vx-chips" role="group" aria-label="Exemples de moyens de paiement">
            <Link to="/recu" className="">
              <Icone nom="smartphone" taille={14} />
              {t("MoMo")}
            </Link>
            <Link to="/recu?pay=carte" className="on">
              <Icone nom="credit-card" taille={14} />
              {t("Carte")}
            </Link>
            <Link to="/recu?pay=apple" className="">
              <Icone nom="apple" taille={14} />
              {t("Apple Pay")}
            </Link>
            <Link to="/recu?pay=google" className="">
              <Icone nom="gpay-g" taille={14} />
              {t("Google Pay")}
            </Link>
            <Link to="/recu?pay=wallet" className="">
              <Icone nom="wallet" taille={14} />
              {t("Wallet")}
            </Link>
            <Link to="/recu?pay=usd" className="">
              <Icone nom="globe" taille={14} />
              {t("$")}
            </Link>
            <Link to="/recu?pay=eur" className="">
              <Icone nom="globe" taille={14} />
              {t("€")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "16px", "padding": "0", "overflow": "hidden" }}>
            <div className="hero night" style={{ "margin": "0", "borderRadius": "0", "padding": "18px 16px", "boxShadow": "none" }}>
              <div className="row">
                <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "24px" }} />
                <span className="grow"></span>
                <span className="hk">
                  {t("Reçu vendeur")}
                </span>
              </div>
              <div className="b8 mt12" style={{ "fontSize": "22px", "letterSpacing": "-.01em" }}>
                {t("BLV-00008")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.8)" }}>
                {t("Encaissé le mar. 13 oct. 2026 à 08\u00A0h\u00A042")}
              </div>
            </div>
            <div style={{ "padding": "6px 16px 16px" }}>
              <div className="kv">
                <span className="k">
                  {t("Article")}
                </span>
                <span className="v ">
                  {t("ITEL AC52 · noir · neuf · ×1")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Classe du colis")}
                </span>
                <span className="v ">
                  {t("S")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Client")}
                </span>
                <span className="v ">
                  {t("Identité masquée")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("ni nom, ni numéro, ni adresse, ni relais")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Encaissé par")}
                </span>
                <span className="v ">
                  {t("BelivaY, mandataire")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("c’est-à-dire pour votre compte")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Payé par le client")}
                </span>
                <span className="v ">
                  <span className="vx-pay">
                    <Icone nom="credit-card" taille={15} />
                    {t("Carte bancaire")}
                  </span>
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("Frais de carte (2\u00A0%) payés par le client")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
              <div className="keep" style={{ "marginTop": "12px" }}>
                <span className="kl">
                  {t("Vous gardez · versés sans frais")}
                </span>
                <span className="kv2">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <p className="t12 c3" style={{ "margin": "12px 0 0", "lineHeight": "1.5" }}>
                {t("Ce reçu n’est pas une facture fiscale. La facture de BelivaY est mensuelle\u00A0: elle est rangée dans Documents.")}
              </p>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Partager le reçu")}
              </span>
            </button>
          </div>
          <div className="links">
            <Link to="/documents" style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "44px" }}>
              <Icone nom="file-text" taille={17} />
              {t("Voir mes documents")}
            </Link>
          </div>
        </Ecran>
      )
    case "recu?pay=apple":
      return (
        <Ecran route="recu" parEtat>
          <div className="vx-chips" role="group" aria-label="Exemples de moyens de paiement">
            <Link to="/recu" className="">
              <Icone nom="smartphone" taille={14} />
              {t("MoMo")}
            </Link>
            <Link to="/recu?pay=carte" className="">
              <Icone nom="credit-card" taille={14} />
              {t("Carte")}
            </Link>
            <Link to="/recu?pay=apple" className="on">
              <Icone nom="apple" taille={14} />
              {t("Apple Pay")}
            </Link>
            <Link to="/recu?pay=google" className="">
              <Icone nom="gpay-g" taille={14} />
              {t("Google Pay")}
            </Link>
            <Link to="/recu?pay=wallet" className="">
              <Icone nom="wallet" taille={14} />
              {t("Wallet")}
            </Link>
            <Link to="/recu?pay=usd" className="">
              <Icone nom="globe" taille={14} />
              {t("$")}
            </Link>
            <Link to="/recu?pay=eur" className="">
              <Icone nom="globe" taille={14} />
              {t("€")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "16px", "padding": "0", "overflow": "hidden" }}>
            <div className="hero night" style={{ "margin": "0", "borderRadius": "0", "padding": "18px 16px", "boxShadow": "none" }}>
              <div className="row">
                <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "24px" }} />
                <span className="grow"></span>
                <span className="hk">
                  {t("Reçu vendeur")}
                </span>
              </div>
              <div className="b8 mt12" style={{ "fontSize": "22px", "letterSpacing": "-.01em" }}>
                {t("BLV-00008")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.8)" }}>
                {t("Encaissé le mar. 13 oct. 2026 à 08\u00A0h\u00A042")}
              </div>
            </div>
            <div style={{ "padding": "6px 16px 16px" }}>
              <div className="kv">
                <span className="k">
                  {t("Article")}
                </span>
                <span className="v ">
                  {t("ITEL AC52 · noir · neuf · ×1")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Classe du colis")}
                </span>
                <span className="v ">
                  {t("S")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Client")}
                </span>
                <span className="v ">
                  {t("Identité masquée")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("ni nom, ni numéro, ni adresse, ni relais")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Encaissé par")}
                </span>
                <span className="v ">
                  {t("BelivaY, mandataire")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("c’est-à-dire pour votre compte")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Payé par le client")}
                </span>
                <span className="v ">
                  <span className="vx-pay">
                    <Icone nom="apple" taille={15} />
                    {t("Apple Pay")}
                  </span>
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("Frais de carte (2\u00A0%) payés par le client")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
              <div className="keep" style={{ "marginTop": "12px" }}>
                <span className="kl">
                  {t("Vous gardez · versés sans frais")}
                </span>
                <span className="kv2">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <p className="t12 c3" style={{ "margin": "12px 0 0", "lineHeight": "1.5" }}>
                {t("Ce reçu n’est pas une facture fiscale. La facture de BelivaY est mensuelle\u00A0: elle est rangée dans Documents.")}
              </p>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Partager le reçu")}
              </span>
            </button>
          </div>
          <div className="links">
            <Link to="/documents" style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "44px" }}>
              <Icone nom="file-text" taille={17} />
              {t("Voir mes documents")}
            </Link>
          </div>
        </Ecran>
      )
    case "recu?pay=google":
      return (
        <Ecran route="recu" parEtat>
          <div className="vx-chips" role="group" aria-label="Exemples de moyens de paiement">
            <Link to="/recu" className="">
              <Icone nom="smartphone" taille={14} />
              {t("MoMo")}
            </Link>
            <Link to="/recu?pay=carte" className="">
              <Icone nom="credit-card" taille={14} />
              {t("Carte")}
            </Link>
            <Link to="/recu?pay=apple" className="">
              <Icone nom="apple" taille={14} />
              {t("Apple Pay")}
            </Link>
            <Link to="/recu?pay=google" className="on">
              <Icone nom="gpay-g" taille={14} />
              {t("Google Pay")}
            </Link>
            <Link to="/recu?pay=wallet" className="">
              <Icone nom="wallet" taille={14} />
              {t("Wallet")}
            </Link>
            <Link to="/recu?pay=usd" className="">
              <Icone nom="globe" taille={14} />
              {t("$")}
            </Link>
            <Link to="/recu?pay=eur" className="">
              <Icone nom="globe" taille={14} />
              {t("€")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "16px", "padding": "0", "overflow": "hidden" }}>
            <div className="hero night" style={{ "margin": "0", "borderRadius": "0", "padding": "18px 16px", "boxShadow": "none" }}>
              <div className="row">
                <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "24px" }} />
                <span className="grow"></span>
                <span className="hk">
                  {t("Reçu vendeur")}
                </span>
              </div>
              <div className="b8 mt12" style={{ "fontSize": "22px", "letterSpacing": "-.01em" }}>
                {t("BLV-00008")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.8)" }}>
                {t("Encaissé le mar. 13 oct. 2026 à 08\u00A0h\u00A042")}
              </div>
            </div>
            <div style={{ "padding": "6px 16px 16px" }}>
              <div className="kv">
                <span className="k">
                  {t("Article")}
                </span>
                <span className="v ">
                  {t("ITEL AC52 · noir · neuf · ×1")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Classe du colis")}
                </span>
                <span className="v ">
                  {t("S")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Client")}
                </span>
                <span className="v ">
                  {t("Identité masquée")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("ni nom, ni numéro, ni adresse, ni relais")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Encaissé par")}
                </span>
                <span className="v ">
                  {t("BelivaY, mandataire")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("c’est-à-dire pour votre compte")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Payé par le client")}
                </span>
                <span className="v ">
                  <span className="vx-pay">
                    <Icone nom="gpay-g" taille={15} />
                    {t("Google Pay")}
                  </span>
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("Frais de carte (2\u00A0%) payés par le client")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
              <div className="keep" style={{ "marginTop": "12px" }}>
                <span className="kl">
                  {t("Vous gardez · versés sans frais")}
                </span>
                <span className="kv2">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <p className="t12 c3" style={{ "margin": "12px 0 0", "lineHeight": "1.5" }}>
                {t("Ce reçu n’est pas une facture fiscale. La facture de BelivaY est mensuelle\u00A0: elle est rangée dans Documents.")}
              </p>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Partager le reçu")}
              </span>
            </button>
          </div>
          <div className="links">
            <Link to="/documents" style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "44px" }}>
              <Icone nom="file-text" taille={17} />
              {t("Voir mes documents")}
            </Link>
          </div>
        </Ecran>
      )
    case "recu?pay=wallet":
      return (
        <Ecran route="recu" parEtat>
          <div className="vx-chips" role="group" aria-label="Exemples de moyens de paiement">
            <Link to="/recu" className="">
              <Icone nom="smartphone" taille={14} />
              {t("MoMo")}
            </Link>
            <Link to="/recu?pay=carte" className="">
              <Icone nom="credit-card" taille={14} />
              {t("Carte")}
            </Link>
            <Link to="/recu?pay=apple" className="">
              <Icone nom="apple" taille={14} />
              {t("Apple Pay")}
            </Link>
            <Link to="/recu?pay=google" className="">
              <Icone nom="gpay-g" taille={14} />
              {t("Google Pay")}
            </Link>
            <Link to="/recu?pay=wallet" className="on">
              <Icone nom="wallet" taille={14} />
              {t("Wallet")}
            </Link>
            <Link to="/recu?pay=usd" className="">
              <Icone nom="globe" taille={14} />
              {t("$")}
            </Link>
            <Link to="/recu?pay=eur" className="">
              <Icone nom="globe" taille={14} />
              {t("€")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "16px", "padding": "0", "overflow": "hidden" }}>
            <div className="hero night" style={{ "margin": "0", "borderRadius": "0", "padding": "18px 16px", "boxShadow": "none" }}>
              <div className="row">
                <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "24px" }} />
                <span className="grow"></span>
                <span className="hk">
                  {t("Reçu vendeur")}
                </span>
              </div>
              <div className="b8 mt12" style={{ "fontSize": "22px", "letterSpacing": "-.01em" }}>
                {t("BLV-00008")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.8)" }}>
                {t("Encaissé le mar. 13 oct. 2026 à 08\u00A0h\u00A042")}
              </div>
            </div>
            <div style={{ "padding": "6px 16px 16px" }}>
              <div className="kv">
                <span className="k">
                  {t("Article")}
                </span>
                <span className="v ">
                  {t("ITEL AC52 · noir · neuf · ×1")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Classe du colis")}
                </span>
                <span className="v ">
                  {t("S")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Client")}
                </span>
                <span className="v ">
                  {t("Identité masquée")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("ni nom, ni numéro, ni adresse, ni relais")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Encaissé par")}
                </span>
                <span className="v ">
                  {t("BelivaY, mandataire")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("c’est-à-dire pour votre compte")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Payé par le client")}
                </span>
                <span className="v ">
                  <span className="vx-pay">
                    <Icone nom="wallet" taille={15} />
                    {t("Wallet BelivaY du client")}
                  </span>
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("Sans frais")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
              <div className="keep" style={{ "marginTop": "12px" }}>
                <span className="kl">
                  {t("Vous gardez · versés sans frais")}
                </span>
                <span className="kv2">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <p className="t12 c3" style={{ "margin": "12px 0 0", "lineHeight": "1.5" }}>
                {t("Ce reçu n’est pas une facture fiscale. La facture de BelivaY est mensuelle\u00A0: elle est rangée dans Documents.")}
              </p>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Partager le reçu")}
              </span>
            </button>
          </div>
          <div className="links">
            <Link to="/documents" style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "44px" }}>
              <Icone nom="file-text" taille={17} />
              {t("Voir mes documents")}
            </Link>
          </div>
        </Ecran>
      )
    case "recu?pay=usd":
      return (
        <Ecran route="recu" parEtat>
          <div className="vx-chips" role="group" aria-label="Exemples de moyens de paiement">
            <Link to="/recu" className="">
              <Icone nom="smartphone" taille={14} />
              {t("MoMo")}
            </Link>
            <Link to="/recu?pay=carte" className="">
              <Icone nom="credit-card" taille={14} />
              {t("Carte")}
            </Link>
            <Link to="/recu?pay=apple" className="">
              <Icone nom="apple" taille={14} />
              {t("Apple Pay")}
            </Link>
            <Link to="/recu?pay=google" className="">
              <Icone nom="gpay-g" taille={14} />
              {t("Google Pay")}
            </Link>
            <Link to="/recu?pay=wallet" className="">
              <Icone nom="wallet" taille={14} />
              {t("Wallet")}
            </Link>
            <Link to="/recu?pay=usd" className="on">
              <Icone nom="globe" taille={14} />
              {t("$")}
            </Link>
            <Link to="/recu?pay=eur" className="">
              <Icone nom="globe" taille={14} />
              {t("€")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "16px", "padding": "0", "overflow": "hidden" }}>
            <div className="hero night" style={{ "margin": "0", "borderRadius": "0", "padding": "18px 16px", "boxShadow": "none" }}>
              <div className="row">
                <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "24px" }} />
                <span className="grow"></span>
                <span className="hk">
                  {t("Reçu vendeur")}
                </span>
              </div>
              <div className="b8 mt12" style={{ "fontSize": "22px", "letterSpacing": "-.01em" }}>
                {t("BLV-00008")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.8)" }}>
                {t("Encaissé le mar. 13 oct. 2026 à 08\u00A0h\u00A042")}
              </div>
            </div>
            <div style={{ "padding": "6px 16px 16px" }}>
              <div className="kv">
                <span className="k">
                  {t("Article")}
                </span>
                <span className="v ">
                  {t("ITEL AC52 · noir · neuf · ×1")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Classe du colis")}
                </span>
                <span className="v ">
                  {t("S")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Client")}
                </span>
                <span className="v ">
                  {t("Identité masquée")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("ni nom, ni numéro, ni adresse, ni relais")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Encaissé par")}
                </span>
                <span className="v ">
                  {t("BelivaY, mandataire")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("c’est-à-dire pour votre compte")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Payé par le client")}
                </span>
                <span className="v ">
                  <span className="vx-pay">
                    <Icone nom="globe" taille={15} />
                    {t("Depuis l’étranger · 35,26 $")}
                  </span>
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("Carte en dollars US, frais compris, payés par le client")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
              <div className="keep" style={{ "marginTop": "12px" }}>
                <span className="kl">
                  {t("Vous gardez · versés sans frais")}
                </span>
                <span className="kv2">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="hint-l">
                <Icone nom="globe" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
                <span>
                  {t("Le client a payé en dollars\u00A0: vous recevez vos 17\u00A0840\u00A0F en francs, sans frais de change.")}
                </span>
              </div>
              <p className="t12 c3" style={{ "margin": "12px 0 0", "lineHeight": "1.5" }}>
                {t("Ce reçu n’est pas une facture fiscale. La facture de BelivaY est mensuelle\u00A0: elle est rangée dans Documents.")}
              </p>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Partager le reçu")}
              </span>
            </button>
          </div>
          <div className="links">
            <Link to="/documents" style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "44px" }}>
              <Icone nom="file-text" taille={17} />
              {t("Voir mes documents")}
            </Link>
          </div>
        </Ecran>
      )
    case "recu?pay=eur":
      return (
        <Ecran route="recu" parEtat>
          <div className="vx-chips" role="group" aria-label="Exemples de moyens de paiement">
            <Link to="/recu" className="">
              <Icone nom="smartphone" taille={14} />
              {t("MoMo")}
            </Link>
            <Link to="/recu?pay=carte" className="">
              <Icone nom="credit-card" taille={14} />
              {t("Carte")}
            </Link>
            <Link to="/recu?pay=apple" className="">
              <Icone nom="apple" taille={14} />
              {t("Apple Pay")}
            </Link>
            <Link to="/recu?pay=google" className="">
              <Icone nom="gpay-g" taille={14} />
              {t("Google Pay")}
            </Link>
            <Link to="/recu?pay=wallet" className="">
              <Icone nom="wallet" taille={14} />
              {t("Wallet")}
            </Link>
            <Link to="/recu?pay=usd" className="">
              <Icone nom="globe" taille={14} />
              {t("$")}
            </Link>
            <Link to="/recu?pay=eur" className="on">
              <Icone nom="globe" taille={14} />
              {t("€")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "16px", "padding": "0", "overflow": "hidden" }}>
            <div className="hero night" style={{ "margin": "0", "borderRadius": "0", "padding": "18px 16px", "boxShadow": "none" }}>
              <div className="row">
                <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "24px" }} />
                <span className="grow"></span>
                <span className="hk">
                  {t("Reçu vendeur")}
                </span>
              </div>
              <div className="b8 mt12" style={{ "fontSize": "22px", "letterSpacing": "-.01em" }}>
                {t("BLV-00008")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.8)" }}>
                {t("Encaissé le mar. 13 oct. 2026 à 08\u00A0h\u00A042")}
              </div>
            </div>
            <div style={{ "padding": "6px 16px 16px" }}>
              <div className="kv">
                <span className="k">
                  {t("Article")}
                </span>
                <span className="v ">
                  {t("ITEL AC52 · noir · neuf · ×1")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Classe du colis")}
                </span>
                <span className="v ">
                  {t("S")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Client")}
                </span>
                <span className="v ">
                  {t("Identité masquée")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("ni nom, ni numéro, ni adresse, ni relais")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Encaissé par")}
                </span>
                <span className="v ">
                  {t("BelivaY, mandataire")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("c’est-à-dire pour votre compte")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Payé par le client")}
                </span>
                <span className="v ">
                  <span className="vx-pay">
                    <Icone nom="globe" taille={15} />
                    {t("Depuis l’étranger · 31,10\u00A0€")}
                  </span>
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("Carte en euros, frais compris, payés par le client")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
              <div className="keep" style={{ "marginTop": "12px" }}>
                <span className="kl">
                  {t("Vous gardez · versés sans frais")}
                </span>
                <span className="kv2">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <div className="hint-l">
                <Icone nom="globe" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
                <span>
                  {t("Le client a payé en euros\u00A0: vous recevez vos 17\u00A0840\u00A0F en francs, sans frais de change.")}
                </span>
              </div>
              <p className="t12 c3" style={{ "margin": "12px 0 0", "lineHeight": "1.5" }}>
                {t("Ce reçu n’est pas une facture fiscale. La facture de BelivaY est mensuelle\u00A0: elle est rangée dans Documents.")}
              </p>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Partager le reçu")}
              </span>
            </button>
          </div>
          <div className="links">
            <Link to="/documents" style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "44px" }}>
              <Icone nom="file-text" taille={17} />
              {t("Voir mes documents")}
            </Link>
          </div>
        </Ecran>
      )
    case "recu?ref=BLV-00008":
      return (
        <Ecran route="recu" parEtat>
          <div className="vx-chips" role="group" aria-label="Exemples de moyens de paiement">
            <Link to="/recu?ref=BLV-00008" className="on">
              <Icone nom="smartphone" taille={14} />
              {t("MoMo")}
            </Link>
            <Link to="/recu?ref=BLV-00008&pay=carte" className="">
              <Icone nom="credit-card" taille={14} />
              {t("Carte")}
            </Link>
            <Link to="/recu?ref=BLV-00008&pay=apple" className="">
              <Icone nom="apple" taille={14} />
              {t("Apple Pay")}
            </Link>
            <Link to="/recu?ref=BLV-00008&pay=google" className="">
              <Icone nom="gpay-g" taille={14} />
              {t("Google Pay")}
            </Link>
            <Link to="/recu?ref=BLV-00008&pay=wallet" className="">
              <Icone nom="wallet" taille={14} />
              {t("Wallet")}
            </Link>
            <Link to="/recu?ref=BLV-00008&pay=usd" className="">
              <Icone nom="globe" taille={14} />
              {t("$")}
            </Link>
            <Link to="/recu?ref=BLV-00008&pay=eur" className="">
              <Icone nom="globe" taille={14} />
              {t("€")}
            </Link>
          </div>
          <div className="card" style={{ "marginTop": "16px", "padding": "0", "overflow": "hidden" }}>
            <div className="hero night" style={{ "margin": "0", "borderRadius": "0", "padding": "18px 16px", "boxShadow": "none" }}>
              <div className="row">
                <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "24px" }} />
                <span className="grow"></span>
                <span className="hk">
                  {t("Reçu vendeur")}
                </span>
              </div>
              <div className="b8 mt12" style={{ "fontSize": "22px", "letterSpacing": "-.01em" }}>
                {t("BLV-00008")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.8)" }}>
                {t("Encaissé le mar. 13 oct. 2026 à 08\u00A0h\u00A042")}
              </div>
            </div>
            <div style={{ "padding": "6px 16px 16px" }}>
              <div className="kv">
                <span className="k">
                  {t("Article")}
                </span>
                <span className="v ">
                  {t("ITEL AC52 · noir · neuf · ×1")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Classe du colis")}
                </span>
                <span className="v ">
                  {t("S")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Client")}
                </span>
                <span className="v ">
                  {t("Identité masquée")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("ni nom, ni numéro, ni adresse, ni relais")}
                  </span>
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Encaissé par")}
                </span>
                <span className="v ">
                  {t("BelivaY, mandataire")}
                  <span className="t12 c3" style={{ "display": "block", "fontWeight": "600", "marginTop": "2px" }}>
                    {t("c’est-à-dire pour votre compte")}
                  </span>
                </span>
              </div>
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
              <div className="kv">
                <span className="k">
                  {t("Prix de vente")}
                </span>
                <span className="v ">
                  {t("20\u00A0000\u00A0F")}
                </span>
              </div>
              <div className="keep" style={{ "marginTop": "12px" }}>
                <span className="kl">
                  {t("Vous gardez · versés sans frais")}
                </span>
                <span className="kv2">
                  {t("17\u00A0840\u00A0F")}
                </span>
              </div>
              <p className="t12 c3" style={{ "margin": "12px 0 0", "lineHeight": "1.5" }}>
                {t("Ce reçu n’est pas une facture fiscale. La facture de BelivaY est mensuelle\u00A0: elle est rangée dans Documents.")}
              </p>
            </div>
          </div>
          <div className="mt16">
            <button type="button" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Partager le reçu")}
              </span>
            </button>
          </div>
          <div className="links">
            <Link to="/documents" style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "minHeight": "44px" }}>
              <Icone nom="file-text" taille={17} />
              {t("Voir mes documents")}
            </Link>
          </div>
        </Ecran>
      )
  }
}

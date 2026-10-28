// Page provisoire « Relevé, reçu et facture » (VD-09) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Documents() {
  const { t } = usePreferences()
  switch (useEtat("documents")) {
    default:
      return (
        <Ecran route="documents" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Documents")}
            </h1>
            <p className="pg-s">
              {t("Pour votre comptabilité ou le support.")}
            </p>
          </div>
          <div className="divider-t" style={{ "fontSize": "12px" }}>
            {t("Relevés et reçus")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <div className="li">
              <span className="ic or">
                <Icone nom="file-down" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Relevé de septembre")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("En cours · par vente\u00A0: prix de vente et ce que vous avez gardé")}
                </span>
              </span>
              <span className="row t12 b8 cor nw" style={{ "gap": "4px", "minHeight": "44px" }}>
                <Icone nom="download" taille={16} />
                {t("CSV")}
              </span>
            </div>
            <div className="li">
              <span className="ic or">
                <Icone nom="calendar-days" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Relevés mensuels")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Le mois complet, le 1er du mois suivant")}
                </span>
              </span>
            </div>
            <div className="li" style={{ "marginLeft": "52px", "minHeight": "52px" }}>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Août 2026")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Émis le 1er septembre")}
                </span>
              </span>
              <span className="row" style={{ "gap": "14px" }}>
                <span className="row t12 b8 cor nw" style={{ "gap": "4px", "minHeight": "44px" }}>
                  <Icone nom="download" taille={16} />
                  {t("PDF")}
                </span>
                <span className="row t12 b8 cor nw" style={{ "gap": "4px", "minHeight": "44px" }}>
                  <Icone nom="download" taille={16} />
                  {t("CSV")}
                </span>
              </span>
            </div>
            <div className="li" style={{ "marginLeft": "52px", "minHeight": "52px" }}>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Juillet 2026")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Émis le 1er août")}
                </span>
              </span>
              <span className="row" style={{ "gap": "14px" }}>
                <span className="row t12 b8 cor nw" style={{ "gap": "4px", "minHeight": "44px" }}>
                  <Icone nom="download" taille={16} />
                  {t("PDF")}
                </span>
                <span className="row t12 b8 cor nw" style={{ "gap": "4px", "minHeight": "44px" }}>
                  <Icone nom="download" taille={16} />
                  {t("CSV")}
                </span>
              </span>
            </div>
            <Link to="/recu" className="li">
              <span className="ic or">
                <Icone nom="receipt" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Reçus de commande")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("9 reçus, BLV-00001 à BLV-00009 · sans donnée du client")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="divider-t" style={{ "fontSize": "12px" }}>
            {t("Factures")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <div className="li">
              <span className="ic ">
                <Icone nom="file-text" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Factures des commissions")}
                </span>
              </span>
            </div>
            <div className="li" style={{ "marginLeft": "52px", "minHeight": "52px" }}>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Août 2026")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Émise le 1er septembre")}
                </span>
              </span>
              <span className="row t12 b8 cor nw" style={{ "gap": "4px", "minHeight": "44px" }}>
                <Icone nom="download" taille={16} />
                {t("PDF")}
              </span>
            </div>
            <div className="li" style={{ "marginLeft": "52px", "minHeight": "52px" }}>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Septembre 2026")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Disponible le 1er octobre")}
                </span>
              </span>
            </div>
            <div className="li">
              <span className="ic ">
                <Icone nom="sparkles" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Factures d’abonnement et de visibilité")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Aucune pour l’instant\u00A0: vous êtes sur Free. Vos paiements de plan ou de visibilité apparaîtront ici.")}
                </span>
              </span>
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Document comptable obligatoire.")}
              </span>
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
                <p>
                  {t("La facture est complète dès que vous déclarez un RCCM (registre du commerce) et un NIU (numéro fiscal).")}
                </p>
                <p>
                  {t("Elle porte alors\u00A0: dénomination, forme, capital, siège, RCCM, NIU et TVA le cas échéant.")}
                </p>
              </div>
            </details>
          </div>
          <div className="divider-t" style={{ "fontSize": "12px" }}>
            {t("Contrat et données")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <div className="li">
              <span className="ic green">
                <Icone nom="signature" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Contrat vendeur")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Signé électroniquement le 29 mai 2026 · grille «\u00A0part que vous gardez\u00A0»")}
                </span>
              </span>
              <span className="row t12 b8 cor nw" style={{ "gap": "4px", "minHeight": "44px" }}>
                <Icone nom="download" taille={16} />
                {t("PDF")}
              </span>
            </div>
            <Link to="/securite" className="li">
              <span className="ic ">
                <Icone nom="database" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Mes données")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Consulter, corriger, exporter · loi n°\u00A02024/017")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}

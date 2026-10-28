// Page provisoire « Aide » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Aide() {
  const { t } = usePreferences()
  switch (useEtat("aide")) {
    default:
      return (
        <Ecran route="aide" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Aide")}
            </h1>
            <p className="pg-s">
              {t("Une réponse tout de suite, ou une personne sur WhatsApp.")}
            </p>
          </div>
          <div className="hero green">
            <div className="otop">
              <span className="hk" style={{ "color": "#9BF0C4" }}>
                {t("Support vendeur · WhatsApp")}
              </span>
              <Icone nom="message-circle" taille={20} style={{ "color": "#9BF0C4" }} />
            </div>
            <div className="b8 mt8" style={{ "fontSize": "20px", "lineHeight": "1.25" }}>
              {t("Une personne vous répond")}
            </div>
            <div className="hs">
              {t("Tous les jours de 7\u00A0h à 21\u00A0h. Réponse en 24\u00A0h ouvrées (Bronze), 4\u00A0h (Argent), 2\u00A0h (Or).")}
            </div>
            <div className="mt12">
              <button type="button" className="btn white">
                <Icone nom="message-circle" taille={18} />
                <span>
                  {t("Écrire au support")}
                </span>
              </button>
            </div>
            <div className="t12 mt10" style={{ "color": "rgba(255,255,255,.8)" }}>
              {t("Pour l’aide seulement\u00A0: commandes et preuves restent dans l’application.")}
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Questions fréquentes")}
            </h3>
            <div className="mt4">
              <details className="more flat" style={{ "marginTop": "0", "borderTop": "0" }} open>
                <summary>
                  <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Quand suis-je payé\u00A0?")}
                  </span>
                  <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
                </summary>
                <div className="more-b">
                  <p>
                    {t("Chaque vendredi avant 12\u00A0h, sans frais et sans minimum, pour tout ce qui s’est libéré avant jeudi minuit. Vous n’avez rien à demander.")}
                  </p>
                  <Link to="/versements" className="row t13 b8 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                    {t("Voir mes versements")}
                    <Icone nom="chevron-right" taille={16} />
                  </Link>
                </div>
              </details>
              <details className="more flat" style={{ "marginTop": "0" }}>
                <summary>
                  <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Combien je garde sur une vente\u00A0?")}
                  </span>
                  <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
                </summary>
                <div className="more-b">
                  <p>
                    {t("Chaque commande affiche «\u00A0Vous gardez\u00A0» avant que vous la prépariez. Exemple\u00A0: un ITEL AC52 vendu 20\u00A0000\u00A0F, vous gardez 17\u00A0840\u00A0F.")}
                  </p>
                  <Link to="/argent" className="row t13 b8 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                    {t("Voir mon argent")}
                    <Icone nom="chevron-right" taille={16} />
                  </Link>
                </div>
              </details>
              <details className="more flat" style={{ "marginTop": "0" }}>
                <summary>
                  <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Pourquoi mon argent est-il gelé\u00A0?")}
                  </span>
                  <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
                </summary>
                <div className="more-b">
                  <p>
                    {t("Un litige, un retour ou une vérification est en cours sur la commande. L’argent se libère dès que le dossier est réglé.")}
                  </p>
                  <Link to="/gele" className="row t13 b8 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                    {t("Voir l’argent gelé")}
                    <Icone nom="chevron-right" taille={16} />
                  </Link>
                </div>
              </details>
              <details className="more flat" style={{ "marginTop": "0" }}>
                <summary>
                  <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Je n’ai plus le produit\u00A0: que faire\u00A0?")}
                  </span>
                  <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
                </summary>
                <div className="more-b">
                  <p>
                    {t("Ouvrez la commande et touchez «\u00A0Rupture\u00A0», le plus tôt possible. BelivaY confie la commande à un autre vendeur. Signaler tôt coûte peu.")}
                  </p>
                  <Link to="/commandes" className="row t13 b8 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                    {t("Voir mes commandes")}
                    <Icone nom="chevron-right" taille={16} />
                  </Link>
                </div>
              </details>
              <details className="more flat" style={{ "marginTop": "0" }}>
                <summary>
                  <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Le livreur ne vient pas")}
                  </span>
                  <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
                </summary>
                <div className="more-b">
                  <p>
                    {t("Votre délai est suspendu jusqu’à son prochain passage\u00A0: aucun effet pour vous. Gardez le colis prêt.")}
                  </p>
                </div>
              </details>
              <details className="more flat" style={{ "marginTop": "0" }}>
                <summary>
                  <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Un client ouvre un litige\u00A0: que faire\u00A0?")}
                  </span>
                  <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
                </summary>
                <div className="more-b">
                  <p>
                    {t("Répondez dans les 48\u00A0h\u00A0: acceptez, contestez avec vos preuves, ou proposez un arrangement. Sans réponse, décision en faveur du client.")}
                  </p>
                  <Link to="/litiges" className="row t13 b8 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                    {t("Voir mes litiges")}
                    <Icone nom="chevron-right" taille={16} />
                  </Link>
                </div>
              </details>
              <details className="more flat" style={{ "marginTop": "0" }}>
                <summary>
                  <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Un produit me revient\u00A0: que faire\u00A0?")}
                  </span>
                  <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
                </summary>
                <div className="more-b">
                  <p>
                    {t("Inspectez-le dans les 48\u00A0h après réception. Si le défaut est réel\u00A0: remboursement, ou remplacement sous 72\u00A0h ouvrées. Le trajet retour de 500\u00A0F est alors à votre charge.")}
                  </p>
                  <Link to="/retours" className="row t13 b8 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                    {t("Voir mes retours")}
                    <Icone nom="chevron-right" taille={16} />
                  </Link>
                </div>
              </details>
              <details className="more flat" style={{ "marginTop": "0" }}>
                <summary>
                  <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Comment passer au palier Argent\u00A0?")}
                  </span>
                  <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
                </summary>
                <div className="more-b">
                  <p>
                    {t("Trois conditions, tenues 14\u00A0jours\u00A0: Trust Score 65 au moins, 10\u00A0commandes livrées, note de 4,0 au moins. Vous garderez alors 18\u00A0164\u00A0F au lieu de 17\u00A0840\u00A0F par ITEL.")}
                  </p>
                  <Link to="/palier" className="row t13 b8 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                    {t("Voir mon palier")}
                    <Icone nom="chevron-right" taille={16} />
                  </Link>
                </div>
              </details>
              <details className="more flat" style={{ "marginTop": "0" }}>
                <summary>
                  <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Qui voit le nom de ma boutique\u00A0?")}
                  </span>
                  <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
                </summary>
                <div className="more-b">
                  <p>
                    {t("Vous et BelivaY seulement. Le client voit «\u00A0Vendeur certifié Bronze · Trust Score 63\u00A0», rien d’autre.")}
                  </p>
                </div>
              </details>
              <details className="more flat" style={{ "marginTop": "0" }}>
                <summary>
                  <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Quels produits sont interdits\u00A0?")}
                  </span>
                  <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
                </summary>
                <div className="more-b">
                  <p>
                    {t("Une offre sur ces produits est refusée et peut mener à l’exclusion.")}
                  </p>
                  <div className="row" style={{ "gap": "10px", "padding": "5px 0" }}>
                    <Icone nom="ban" taille={16} style={{ "color": "var(--red)", "flexShrink": "0" }} />
                    <span className="t13 c2">
                      {t("Armes, munitions et explosifs")}
                    </span>
                  </div>
                  <div className="row" style={{ "gap": "10px", "padding": "5px 0" }}>
                    <Icone nom="ban" taille={16} style={{ "color": "var(--red)", "flexShrink": "0" }} />
                    <span className="t13 c2">
                      {t("Drogues et médicaments")}
                    </span>
                  </div>
                  <div className="row" style={{ "gap": "10px", "padding": "5px 0" }}>
                    <Icone nom="ban" taille={16} style={{ "color": "var(--red)", "flexShrink": "0" }} />
                    <span className="t13 c2">
                      {t("Contrefaçons et copies de marque")}
                    </span>
                  </div>
                  <div className="row" style={{ "gap": "10px", "padding": "5px 0" }}>
                    <Icone nom="ban" taille={16} style={{ "color": "var(--red)", "flexShrink": "0" }} />
                    <span className="t13 c2">
                      {t("Produits volés ou sans preuve d’origine")}
                    </span>
                  </div>
                  <div className="row" style={{ "gap": "10px", "padding": "5px 0" }}>
                    <Icone nom="ban" taille={16} style={{ "color": "var(--red)", "flexShrink": "0" }} />
                    <span className="t13 c2">
                      {t("Espèces protégées\u00A0: ivoire, écailles, peaux")}
                    </span>
                  </div>
                  <div className="row" style={{ "gap": "10px", "padding": "5px 0" }}>
                    <Icone nom="ban" taille={16} style={{ "color": "var(--red)", "flexShrink": "0" }} />
                    <span className="t13 c2">
                      {t("Documents officiels et moyens de paiement")}
                    </span>
                  </div>
                </div>
              </details>
            </div>
          </div>
          <div className="note red">
            <Icone nom="shield-alert" taille={18} />
            <div>
              <b>
                {t("BelivaY ne vous demande jamais votre code secret Mobile Money.")}
              </b>
              {t(" Un message qui le demande est une fraude\u00A0: ne répondez pas et signalez-le.")}
            </div>
          </div>
          <div className="card tight">
            <Link to="/documents" className="li">
              <span className="ic ">
                <Icone nom="file-text" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Mon contrat")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Et la grille «\u00A0part que vous gardez\u00A0»")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <div className="li">
              <span className="ic ">
                <Icone nom="book-open" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Un conseil court chaque semaine")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Photos, prix, délais\u00A0: 2 minutes de lecture, en notification")}
                </span>
              </span>
            </div>
          </div>
        </Ecran>
      )
  }
}

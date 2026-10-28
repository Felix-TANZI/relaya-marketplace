// Page provisoire « Premier jour » (VD-04) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function PremierJour() {
  const { t } = usePreferences()
  switch (useEtat("premier_jour")) {
    case "premier_jour?pop=profil":
    default:
      return (
        <Ecran route="premier_jour" parEtat>
          <div className="pg-k" style={{ "marginTop": "14px" }}>
            {t("Bienvenue Franck · jour 1")}
          </div>
          <div className="pg" style={{ "paddingTop": "4px" }}>
            <h1 className="pg-t">
              {t("Trois gestes pour commencer")}
            </h1>
            <p className="pg-s">
              {t("Votre boutique est ouverte. Faites ces trois gestes et vos premières commandes arrivent.")}
            </p>
          </div>
          <div className="card tight">
            <div className="li" style={{ "flexWrap": "wrap", "padding": "14px 0" }}>
              <span className="ic or" style={{ "borderRadius": "50%" }}>
                <b className="t15">
                  {t("1")}
                </b>
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Ajouter vos produits")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Moins d’une minute par produit déjà connu")}
                </span>
              </span>
              <div style={{ "flexBasis": "100%" }}>
                <Link to="/offre1" className="btn primary">
                  <Icone nom="plus" taille={18} />
                  <span>
                    {t("Ajouter un produit")}
                  </span>
                </Link>
              </div>
            </div>
            <Link to="/horaires" className="li">
              <span className="ic or" style={{ "borderRadius": "50%" }}>
                <b className="t15">
                  {t("2")}
                </b>
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Régler vos horaires")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Et les heures de passage du livreur")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/numero_versement" className="li">
              <span className="ic green" style={{ "borderRadius": "50%" }}>
                <Icone nom="check" taille={20} trait={2.6} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Vérifier votre numéro de versement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("MTN\u00A0····\u00A04\u00A0217 · vérifié")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="card">
            <h3>
              {t("Plus vous publiez, plus vous gardez")}
            </h3>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Palier\u00A0: votre niveau de vendeur. Plus il est haut, plus vous gardez.")}
              </span>
            </div>
            <div className="row mt12">
              <span className="medal bronze">
                <Icone nom="award" taille={22} />
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Palier de lancement\u00A0: Bronze")}
                </div>
                <div className="t13 c3 mt4">
                  {t("0 produit en vente aujourd’hui · 15 pour passer Argent")}
                </div>
              </div>
            </div>
            <div className="bar mt10">
              <i style={{ "width": "2%" }}></i>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Comment ça marche")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Pendant les deux premiers mois après la signature, votre palier suit vos produits en vente. Ensuite, c’est votre Trust Score qui décide.")}
                </p>
                <div>
                  <div className="row" style={{ "padding": "8px 0", "borderTop": "1px solid var(--line)" }}>
                    <span className="medal bronze">
                      <Icone nom="award" taille={22} />
                    </span>
                    <div className="grow">
                      <div className="b8 t14">
                        {t("Bronze")}
                      </div>
                      <div className="t13 c3">
                        {t("dès le départ")}
                      </div>
                    </div>
                    <span className="pill or">
                      {t("Vous")}
                    </span>
                  </div>
                  <div className="row" style={{ "padding": "8px 0", "borderTop": "1px solid var(--line)" }}>
                    <span className="medal argent">
                      <Icone nom="award" taille={22} />
                    </span>
                    <div className="grow">
                      <div className="b8 t14">
                        {t("Argent\u2060")}
                      </div>
                      <div className="t13 c3">
                        {t("15 produits en vente")}
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ "padding": "8px 0", "borderTop": "1px solid var(--line)" }}>
                    <span className="medal or">
                      <Icone nom="award" taille={22} />
                    </span>
                    <div className="grow">
                      <div className="b8 t14">
                        {t("Or")}
                      </div>
                      <div className="t13 c3">
                        {t("40 produits en vente")}
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ "padding": "8px 0", "borderTop": "1px solid var(--line)" }}>
                    <span className="medal platine">
                      <Icone nom="award" taille={22} />
                    </span>
                    <div className="grow">
                      <div className="b8 t14">
                        {t("Platine")}
                      </div>
                      <div className="t13 c3">
                        {t("80 produits en vente")}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt8">
                  {t("Trust Score\u00A0: votre note de confiance, sur 100.")}
                </p>
              </div>
            </details>
          </div>
          <div className="card">
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--green-soft)", "color": "var(--green)" }}>
                <Icone nom="gift" taille={20} />
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Offre de découverte")}
                </div>
                <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Vous gardez 3 points de plus (3\u00A0% du prix) sur chaque vente.")}
                </div>
                <div className="t13 c3 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Dès votre première commande payée, pendant 3\u00A0mois ou 50\u00A0commandes.")}
                </div>
              </div>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("Besoin d’aide\u00A0?")}
            </h2>
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/saisie_assistee" className="li">
              <span className="ic or">
                <Icone nom="users" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Un agent BelivaY peut saisir vos produits")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Photos prises chez vous, vous validez chaque fiche · gratuit pour les premières boutiques")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/aide" className="li">
              <span className="ic green">
                <Icone nom="message-circle" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Une question\u00A0? Le support vendeur sur WhatsApp")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Aide seulement\u00A0: jamais de commande ni de preuve")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="foot">
            <Icone nom="wifi" taille={16} />
            <span>
              {t("Connecté · aucune action en attente d’envoi")}
            </span>
          </div>
        </Ecran>
      )
  }
}

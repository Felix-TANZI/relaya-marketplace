// Page provisoire « Les plans » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (3 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function PlansListe() {
  const { t } = usePreferences()
  switch (useEtat("plans_liste")) {
    default:
      return (
        <Ecran route="plans_liste" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Plans & tarifs")}
            </h1>
            <p className="pg-s">
              {t("Ce que coûte chaque plan, et ce qu’il vous rend.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/plans_liste" className="on">
              {t("Les plans")}
            </Link>
            <Link to="/plans" className="">
              {t("Simulateur")}
            </Link>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--green-line)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Free")}
                  </span>
                  <span className="pill green">
                    {t("Votre plan")}
                  </span>
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("0\u00A0F")}
                </div>
                <div className="t12 c3">
                  {t("par mois")}
                </div>
              </div>
            </div>
            <div className="card flat" style={{ "marginTop": "14px", "padding": "14px" }}>
              <div className="row" style={{ "alignItems": "flex-start" }}>
                <span style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--green-soft)", "color": "var(--green)" }}>
                  <Icone nom="gift" taille={18} />
                </span>
                <div className="grow">
                  <div className="b8 t14">
                    {t("Offre de découverte")}
                  </div>
                  <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                    {t("Vous gardez 3 points de plus (3\u00A0% du prix) sur chaque vente.")}
                  </div>
                </div>
              </div>
              <div className="bar mt12">
                <i style={{ "width": "18%" }}></i>
              </div>
              <div className="row t13 b7 mt8">
                <span className="grow">
                  {t("9\u00A0commandes sur 50")}
                </span>
                <span className="nw">
                  {t("jusqu’au 27 nov.")}
                </span>
              </div>
              <div className="t12 c3 mt4" style={{ "lineHeight": "1.45" }}>
                {t("Elle s’arrête dès que l’une des deux limites est atteinte.")}
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vendre sur BelivaY, versement chaque vendredi sans frais")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vos chiffres des 30 derniers jours")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Les 3 premières recherches sans résultat de votre zone")}
              </span>
            </div>
            <div className="note green">
              <Icone nom="badge-check" taille={18} />
              <div>
                <b>
                  {t("Ce mois-ci, Free vous fait garder le plus.")}
                </b>
              </div>
            </div>
            <div className="mt12">
              <Link to="/plans" className="btn primary">
                <Icone nom="calculator" taille={18} />
                <span>
                  {t("Comparer avec mes ventes")}
                </span>
              </Link>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("Les autres plans")}
            </h2>
          </div>
          <div className="card" style={{ "marginTop": "0" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Boost")}
                  </span>
                </div>
                <div className="t12 c3 mt4">
                  {t("Ou 25\u00A0000\u00A0F par an · 10\u00A0mois payés")}
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("2\u00A0500\u00A0F")}
                </div>
                <div className="t12 c3">
                  {t("par mois")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vous gardez un peu plus sur chaque vente, jusqu’au prix du plan")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("2 mises en avant de 24\u00A0h par mois (valeur 1\u00A0000\u00A0F)")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vos chiffres sur 3 et 12\u00A0mois")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Alerte quand un produit est cherché sans résultat dans votre zone")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/plans_liste?essai=boost" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="gift" taille={18} />
                <span>
                  {t("Essayer un mois offert")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--violet-line)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Pro")}
                  </span>
                  <Icone nom="sparkles" taille={18} style={{ "color": "var(--violet-txt)" }} />
                </div>
                <div className="t12 c3 mt4">
                  {t("Ou 75\u00A0000\u00A0F par an · 10\u00A0mois payés")}
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("7\u00A0500\u00A0F")}
                </div>
                <div className="t12 c3">
                  {t("par mois")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vous gardez encore plus sur chaque vente, jusqu’au prix du plan")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("4 mises en avant, 1 boost de catégorie (valeur 4\u00A0000\u00A0F) et 1 campagne «\u00A0favoris\u00A0»")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Chiffres par offre et par quartier, prix conseillé")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Support prioritaire et badge Pro dans votre espace")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/plans_liste?essai=pro" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="gift" taille={18} />
                <span>
                  {t("Essayer un mois offert")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Sur-mesure")}
                  </span>
                </div>
                <div className="t12 c3 mt4">
                  {t("Dès 1\u00A0000\u00A0000\u00A0F de ventes par mois")}
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("Négocié")}
                </div>
                <div className="t12 c3">
                  {t("selon contrat")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Responsable de compte")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Import de votre catalogue")}
              </span>
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
              <p>
                <b>
                  {t("Essai\u00A0:")}
                </b>
                {t(" un mois offert.")}
              </p>
              <p>
                <b>
                  {t("Paiement\u00A0:")}
                </b>
                {t(" par Mobile Money, sur votre numéro de versement. Vous confirmez chaque paiement sur votre téléphone\u00A0; la facture arrive dans Documents.")}
              </p>
              <p>
                <b>
                  {t("À l’année\u00A0:")}
                </b>
                {t(" 10\u00A0mois payés pour 12.")}
              </p>
              <p>
                <b>
                  {t("Changement de plan\u00A0:")}
                </b>
                {t(" au prorata.")}
              </p>
              <p>
                <b>
                  {t("Si le paiement échoue\u00A0:")}
                </b>
                {t(" 7\u00A0jours de grâce, puis Free, sans rien perdre.")}
              </p>
              <p>
                <b>
                  {t("Visibilité incluse non utilisée\u00A0:")}
                </b>
                {t(" elle ne passe pas au mois suivant.")}
              </p>
              <p>
                {t("Ce qu’un plan vous fait garder en plus ne dépasse jamais son prix.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "plans_liste?essai=boost":
      return (
        <Ecran route="plans_liste" parEtat fixes={
          <>
          <div className="veil"></div>
          <div className="sheet">
            <div className="grab"></div>
            <div className="row" style={{ "gap": "8px" }}>
              <h3 style={{ "margin": "0", "fontSize": "19px", "fontWeight": "800" }}>
                {t("Essayer Boost un mois")}
              </h3>
            </div>
            <div className="mt8">
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic green" style={{ "width": "36px", "height": "36px", "borderRadius": "50%" }}>
                  <Icone nom="gift" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  <b style={{ "color": "var(--ink)" }}>
                    {t("Aujourd’hui\u00A0: 0\u00A0F.")}
                  </b>
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic " style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "background": "var(--sand-3)" }}>
                  <Icone nom="smartphone" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  {t("Ensuite\u00A0: ")}
                  <b style={{ "color": "var(--ink)" }}>
                    {t("2\u00A0500\u00A0F par mois")}
                  </b>
                  {t(", payés par Mobile Money (MTN\u00A0····\u00A04\u00A0217), confirmés sur votre téléphone.")}
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic " style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "background": "var(--sand-3)" }}>
                  <Icone nom="bell" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  {t("Arrêtez quand vous voulez, sans frais\u00A0; un rappel 3\u00A0jours avant la fin de l’essai.")}
                </span>
              </div>
            </div>
            <div className="mt14">
              <Link to="/plans_liste" className="btn primary">
                <Icone nom="gift" taille={18} />
                <span>
                  {t("Commencer l’essai")}
                </span>
              </Link>
            </div>
            <div className="mt8">
              <Link to="/plans_liste" className="btn ghost">
                <span>
                  {t("Annuler")}
                </span>
              </Link>
            </div>
          </div>
          </>
        }>
          <div className="pg">
            <h1 className="pg-t">
              {t("Plans & tarifs")}
            </h1>
            <p className="pg-s">
              {t("Ce que coûte chaque plan, et ce qu’il vous rend.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/plans_liste" className="on">
              {t("Les plans")}
            </Link>
            <Link to="/plans" className="">
              {t("Simulateur")}
            </Link>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--green-line)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Free")}
                  </span>
                  <span className="pill green">
                    {t("Votre plan")}
                  </span>
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("0\u00A0F")}
                </div>
                <div className="t12 c3">
                  {t("par mois")}
                </div>
              </div>
            </div>
            <div className="card flat" style={{ "marginTop": "14px", "padding": "14px" }}>
              <div className="row" style={{ "alignItems": "flex-start" }}>
                <span style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--green-soft)", "color": "var(--green)" }}>
                  <Icone nom="gift" taille={18} />
                </span>
                <div className="grow">
                  <div className="b8 t14">
                    {t("Offre de découverte")}
                  </div>
                  <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                    {t("Vous gardez 3 points de plus (3\u00A0% du prix) sur chaque vente.")}
                  </div>
                </div>
              </div>
              <div className="bar mt12">
                <i style={{ "width": "18%" }}></i>
              </div>
              <div className="row t13 b7 mt8">
                <span className="grow">
                  {t("9\u00A0commandes sur 50")}
                </span>
                <span className="nw">
                  {t("jusqu’au 27 nov.")}
                </span>
              </div>
              <div className="t12 c3 mt4" style={{ "lineHeight": "1.45" }}>
                {t("Elle s’arrête dès que l’une des deux limites est atteinte.")}
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vendre sur BelivaY, versement chaque vendredi sans frais")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vos chiffres des 30 derniers jours")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Les 3 premières recherches sans résultat de votre zone")}
              </span>
            </div>
            <div className="note green">
              <Icone nom="badge-check" taille={18} />
              <div>
                <b>
                  {t("Ce mois-ci, Free vous fait garder le plus.")}
                </b>
              </div>
            </div>
            <div className="mt12">
              <Link to="/plans" className="btn primary">
                <Icone nom="calculator" taille={18} />
                <span>
                  {t("Comparer avec mes ventes")}
                </span>
              </Link>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("Les autres plans")}
            </h2>
          </div>
          <div className="card" style={{ "marginTop": "0" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Boost")}
                  </span>
                </div>
                <div className="t12 c3 mt4">
                  {t("Ou 25\u00A0000\u00A0F par an · 10\u00A0mois payés")}
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("2\u00A0500\u00A0F")}
                </div>
                <div className="t12 c3">
                  {t("par mois")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vous gardez un peu plus sur chaque vente, jusqu’au prix du plan")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("2 mises en avant de 24\u00A0h par mois (valeur 1\u00A0000\u00A0F)")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vos chiffres sur 3 et 12\u00A0mois")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Alerte quand un produit est cherché sans résultat dans votre zone")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/plans_liste?essai=boost" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="gift" taille={18} />
                <span>
                  {t("Essayer un mois offert")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--violet-line)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Pro")}
                  </span>
                  <Icone nom="sparkles" taille={18} style={{ "color": "var(--violet-txt)" }} />
                </div>
                <div className="t12 c3 mt4">
                  {t("Ou 75\u00A0000\u00A0F par an · 10\u00A0mois payés")}
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("7\u00A0500\u00A0F")}
                </div>
                <div className="t12 c3">
                  {t("par mois")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vous gardez encore plus sur chaque vente, jusqu’au prix du plan")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("4 mises en avant, 1 boost de catégorie (valeur 4\u00A0000\u00A0F) et 1 campagne «\u00A0favoris\u00A0»")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Chiffres par offre et par quartier, prix conseillé")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Support prioritaire et badge Pro dans votre espace")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/plans_liste?essai=pro" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="gift" taille={18} />
                <span>
                  {t("Essayer un mois offert")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Sur-mesure")}
                  </span>
                </div>
                <div className="t12 c3 mt4">
                  {t("Dès 1\u00A0000\u00A0000\u00A0F de ventes par mois")}
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("Négocié")}
                </div>
                <div className="t12 c3">
                  {t("selon contrat")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Responsable de compte")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Import de votre catalogue")}
              </span>
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
              <p>
                <b>
                  {t("Essai\u00A0:")}
                </b>
                {t(" un mois offert.")}
              </p>
              <p>
                <b>
                  {t("Paiement\u00A0:")}
                </b>
                {t(" par Mobile Money, sur votre numéro de versement. Vous confirmez chaque paiement sur votre téléphone\u00A0; la facture arrive dans Documents.")}
              </p>
              <p>
                <b>
                  {t("À l’année\u00A0:")}
                </b>
                {t(" 10\u00A0mois payés pour 12.")}
              </p>
              <p>
                <b>
                  {t("Changement de plan\u00A0:")}
                </b>
                {t(" au prorata.")}
              </p>
              <p>
                <b>
                  {t("Si le paiement échoue\u00A0:")}
                </b>
                {t(" 7\u00A0jours de grâce, puis Free, sans rien perdre.")}
              </p>
              <p>
                <b>
                  {t("Visibilité incluse non utilisée\u00A0:")}
                </b>
                {t(" elle ne passe pas au mois suivant.")}
              </p>
              <p>
                {t("Ce qu’un plan vous fait garder en plus ne dépasse jamais son prix.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "plans_liste?essai=pro":
      return (
        <Ecran route="plans_liste" parEtat fixes={
          <>
          <div className="veil"></div>
          <div className="sheet">
            <div className="grab"></div>
            <div className="row" style={{ "gap": "8px" }}>
              <h3 style={{ "margin": "0", "fontSize": "19px", "fontWeight": "800" }}>
                {t("Essayer Pro un mois")}
              </h3>
              <Icone nom="sparkles" taille={18} style={{ "color": "var(--violet-txt)" }} />
            </div>
            <div className="mt8">
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic green" style={{ "width": "36px", "height": "36px", "borderRadius": "50%" }}>
                  <Icone nom="gift" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  <b style={{ "color": "var(--ink)" }}>
                    {t("Aujourd’hui\u00A0: 0\u00A0F.")}
                  </b>
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic " style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "background": "var(--sand-3)" }}>
                  <Icone nom="smartphone" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  {t("Ensuite\u00A0: ")}
                  <b style={{ "color": "var(--ink)" }}>
                    {t("7\u00A0500\u00A0F par mois")}
                  </b>
                  {t(", payés par Mobile Money (MTN\u00A0····\u00A04\u00A0217), confirmés sur votre téléphone.")}
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "11px 0", "alignItems": "flex-start" }}>
                <span className="ic " style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "background": "var(--sand-3)" }}>
                  <Icone nom="bell" taille={18} />
                </span>
                <span className="grow t14 c2" style={{ "lineHeight": "1.45", "paddingTop": "7px" }}>
                  {t("Arrêtez quand vous voulez, sans frais\u00A0; un rappel 3\u00A0jours avant la fin de l’essai.")}
                </span>
              </div>
            </div>
            <div className="mt14">
              <Link to="/plans_liste" className="btn primary">
                <Icone nom="gift" taille={18} />
                <span>
                  {t("Commencer l’essai")}
                </span>
              </Link>
            </div>
            <div className="mt8">
              <Link to="/plans_liste" className="btn ghost">
                <span>
                  {t("Annuler")}
                </span>
              </Link>
            </div>
          </div>
          </>
        }>
          <div className="pg">
            <h1 className="pg-t">
              {t("Plans & tarifs")}
            </h1>
            <p className="pg-s">
              {t("Ce que coûte chaque plan, et ce qu’il vous rend.")}
            </p>
          </div>
          <div className="seg">
            <Link to="/plans_liste" className="on">
              {t("Les plans")}
            </Link>
            <Link to="/plans" className="">
              {t("Simulateur")}
            </Link>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--green-line)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Free")}
                  </span>
                  <span className="pill green">
                    {t("Votre plan")}
                  </span>
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("0\u00A0F")}
                </div>
                <div className="t12 c3">
                  {t("par mois")}
                </div>
              </div>
            </div>
            <div className="card flat" style={{ "marginTop": "14px", "padding": "14px" }}>
              <div className="row" style={{ "alignItems": "flex-start" }}>
                <span style={{ "width": "36px", "height": "36px", "borderRadius": "50%", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--green-soft)", "color": "var(--green)" }}>
                  <Icone nom="gift" taille={18} />
                </span>
                <div className="grow">
                  <div className="b8 t14">
                    {t("Offre de découverte")}
                  </div>
                  <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                    {t("Vous gardez 3 points de plus (3\u00A0% du prix) sur chaque vente.")}
                  </div>
                </div>
              </div>
              <div className="bar mt12">
                <i style={{ "width": "18%" }}></i>
              </div>
              <div className="row t13 b7 mt8">
                <span className="grow">
                  {t("9\u00A0commandes sur 50")}
                </span>
                <span className="nw">
                  {t("jusqu’au 27 nov.")}
                </span>
              </div>
              <div className="t12 c3 mt4" style={{ "lineHeight": "1.45" }}>
                {t("Elle s’arrête dès que l’une des deux limites est atteinte.")}
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vendre sur BelivaY, versement chaque vendredi sans frais")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vos chiffres des 30 derniers jours")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Les 3 premières recherches sans résultat de votre zone")}
              </span>
            </div>
            <div className="note green">
              <Icone nom="badge-check" taille={18} />
              <div>
                <b>
                  {t("Ce mois-ci, Free vous fait garder le plus.")}
                </b>
              </div>
            </div>
            <div className="mt12">
              <Link to="/plans" className="btn primary">
                <Icone nom="calculator" taille={18} />
                <span>
                  {t("Comparer avec mes ventes")}
                </span>
              </Link>
            </div>
          </div>
          <div className="sec">
            <h2>
              {t("Les autres plans")}
            </h2>
          </div>
          <div className="card" style={{ "marginTop": "0" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Boost")}
                  </span>
                </div>
                <div className="t12 c3 mt4">
                  {t("Ou 25\u00A0000\u00A0F par an · 10\u00A0mois payés")}
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("2\u00A0500\u00A0F")}
                </div>
                <div className="t12 c3">
                  {t("par mois")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vous gardez un peu plus sur chaque vente, jusqu’au prix du plan")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("2 mises en avant de 24\u00A0h par mois (valeur 1\u00A0000\u00A0F)")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vos chiffres sur 3 et 12\u00A0mois")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Alerte quand un produit est cherché sans résultat dans votre zone")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/plans_liste?essai=boost" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="gift" taille={18} />
                <span>
                  {t("Essayer un mois offert")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--violet-line)" }}>
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Pro")}
                  </span>
                  <Icone nom="sparkles" taille={18} style={{ "color": "var(--violet-txt)" }} />
                </div>
                <div className="t12 c3 mt4">
                  {t("Ou 75\u00A0000\u00A0F par an · 10\u00A0mois payés")}
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("7\u00A0500\u00A0F")}
                </div>
                <div className="t12 c3">
                  {t("par mois")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Vous gardez encore plus sur chaque vente, jusqu’au prix du plan")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("4 mises en avant, 1 boost de catégorie (valeur 4\u00A0000\u00A0F) et 1 campagne «\u00A0favoris\u00A0»")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Chiffres par offre et par quartier, prix conseillé")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Support prioritaire et badge Pro dans votre espace")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/plans_liste?essai=pro" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="gift" taille={18} />
                <span>
                  {t("Essayer un mois offert")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="row" style={{ "alignItems": "flex-start" }}>
              <div className="grow">
                <div className="row" style={{ "gap": "8px" }}>
                  <span className="b8" style={{ "fontSize": "19px" }}>
                    {t("Sur-mesure")}
                  </span>
                </div>
                <div className="t12 c3 mt4">
                  {t("Dès 1\u00A0000\u00A0000\u00A0F de ventes par mois")}
                </div>
              </div>
              <div className="right">
                <div className="b8 nw" style={{ "fontSize": "22px" }}>
                  {t("Négocié")}
                </div>
                <div className="t12 c3">
                  {t("selon contrat")}
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Responsable de compte")}
              </span>
            </div>
            <div className="row" style={{ "padding": "5px 0", "alignItems": "flex-start" }}>
              <Icone nom="check" taille={16} trait={2.4} style={{ "color": "var(--green)", "flexShrink": "0", "marginTop": "2px" }} />
              <span className="t13 c2" style={{ "lineHeight": "1.45" }}>
                {t("Import de votre catalogue")}
              </span>
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
              <p>
                <b>
                  {t("Essai\u00A0:")}
                </b>
                {t(" un mois offert.")}
              </p>
              <p>
                <b>
                  {t("Paiement\u00A0:")}
                </b>
                {t(" par Mobile Money, sur votre numéro de versement. Vous confirmez chaque paiement sur votre téléphone\u00A0; la facture arrive dans Documents.")}
              </p>
              <p>
                <b>
                  {t("À l’année\u00A0:")}
                </b>
                {t(" 10\u00A0mois payés pour 12.")}
              </p>
              <p>
                <b>
                  {t("Changement de plan\u00A0:")}
                </b>
                {t(" au prorata.")}
              </p>
              <p>
                <b>
                  {t("Si le paiement échoue\u00A0:")}
                </b>
                {t(" 7\u00A0jours de grâce, puis Free, sans rien perdre.")}
              </p>
              <p>
                <b>
                  {t("Visibilité incluse non utilisée\u00A0:")}
                </b>
                {t(" elle ne passe pas au mois suivant.")}
              </p>
              <p>
                {t("Ce qu’un plan vous fait garder en plus ne dépasse jamais son prix.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}

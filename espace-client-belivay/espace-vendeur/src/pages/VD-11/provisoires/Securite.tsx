// Page provisoire « Sécurité, appareils et données » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Securite() {
  const { t } = usePreferences()
  switch (useEtat("securite")) {
    default:
      return (
        <Ecran route="securite" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Sécurité, appareils et données")}
            </h1>
            <p className="pg-s">
              {t("Qui utilise votre compte, et comment il est protégé.")}
            </p>
          </div>
          <div className="card">
            <div className="otop">
              <h3>
                {t("Appareils connectés")}
              </h3>
              <span className="pill ink sm">
                {t("2")}
              </span>
            </div>
            <div className="mt6">
              <div className="li" style={{ "alignItems": "flex-start" }}>
                <span className="ic green">
                  <Icone nom="smartphone" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("iPhone · Safari")}
                  </span>
                  <span className="pill green sm" style={{ "marginTop": "4px" }}>
                    {t("Cet appareil")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Yaoundé · actif maintenant")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Depuis le 7 mai · 138 ouvertures")}
                  </span>
                </span>
              </div>
              <div className="li" style={{ "alignItems": "flex-start" }}>
                <span className="ic ">
                  <Icone nom="smartphone" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Android · Chrome")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Yaoundé · il y a 7\u00A0jours")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Depuis le 12 sept. · 3 ouvertures")}
                  </span>
                  <Link to="/securite" className="btn danger sm" style={{ "height": "44px", "display": "inline-flex", "marginTop": "8px" }}>
                    <Icone nom="log-out" taille={16} />
                    <span>
                      {t("Déconnecter")}
                    </span>
                  </Link>
                </span>
              </div>
            </div>
            <div className="note amber">
              <Icone nom="triangle-alert" taille={18} />
              <div>
                {t("Un appareil inconnu\u00A0? Déconnectez-le, changez votre mot de passe et vérifiez votre numéro de versement. Cela n’annule aucune commande.")}
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Mot de passe et second facteur")}
            </h3>
            <div className="hint-l">
              <Icone nom="key-round" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Mot de passe\u00A0: 8 caractères au minimum, dont un chiffre.")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/connexion?s=oubli" className="btn secondary">
                <Icone nom="key-round" taille={18} />
                <span>
                  {t("Changer mon mot de passe")}
                </span>
              </Link>
            </div>
            <div className="mt8" style={{ "borderTop": "1px solid var(--line)" }}>
              <div className="li">
                <span className="ic green">
                  <Icone nom="smartphone" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Second facteur\u00A0: un code par SMS")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Envoyé au 6••\u00A0••\u00A0••\u00A090, votre téléphone personnel. Demandé pour un nouvel appareil, un nouveau numéro de versement ou un accès d’équipe.")}
                  </span>
                </span>
              </div>
            </div>
            <div className="li">
              <span className="ic green">
                <Icone nom="scan-face" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Face ID ou empreinte\u00A0: activé")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Pour ouvrir l’espace, voir votre argent et changer de numéro de versement. Reste dans votre téléphone.")}
                </span>
              </span>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="shield-check" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir le détail")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <table className="tbl">
                  <tbody>
                    <tr>
                      <th>
                        {t("Situation")}
                      </th>
                      <th className="r">
                        {t("Code SMS")}
                      </th>
                    </tr>
                    <tr>
                      <td>
                        {t("Connexion depuis un appareil inconnu")}
                      </td>
                      <td className="r b8 cor">
                        {t("Oui")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Changement du numéro de versement")}
                      </td>
                      <td className="r b8 cr">
                        {t("Toujours")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Ajout d’un accès employé")}
                      </td>
                      <td className="r b8 cr">
                        {t("Toujours")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Changement de mot de passe")}
                      </td>
                      <td className="r b8 cr">
                        {t("Toujours")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Ouverture ordinaire")}
                      </td>
                      <td className="r b8 c3">
                        {t("Jamais")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>
          </div>
          <div className="card">
            <h3>
              {t("Statut du compte")}
            </h3>
            <div className="mt8">
              <div className="kv">
                <span className="k">
                  {t("Créé · approuvé")}
                </span>
                <span className="v ">
                  {t("7 mai · 9 mai 2026")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Contrat")}
                </span>
                <span className="v ">
                  {t("Signé le 7 mai 2026")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Palier · Trust Score")}
                </span>
                <span className="v ">
                  {t("Bronze · 63")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Plan")}
                </span>
                <span className="v ">
                  {t("Free · offre de découverte")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Vous gardez · votre grille")}
                </span>
                <span className="v ">
                  {t("Selon la catégorie")}
                </span>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="percent" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir la grille par catégorie")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Palier Bronze. Plus le prix est haut, plus vous gardez.")}
                </p>
                <table className="tbl mt8">
                  <tbody>
                    <tr>
                      <th>
                        {t("Catégorie")}
                      </th>
                      <th className="r">
                        {t("Vous gardez")}
                      </th>
                    </tr>
                    <tr>
                      <td>
                        {t("Électronique, électroménager")}
                      </td>
                      <td className="r b8 cg nw">
                        {t("86,5 à 98\u00A0%")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Mode, beauté")}
                      </td>
                      <td className="r b8 cg nw">
                        {t("76,5 à 86,5\u00A0%")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Supermarché, frais")}
                      </td>
                      <td className="r b8 cg nw">
                        {t("92,5 à 95\u00A0%")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Maison, sport, bébé, animaux")}
                      </td>
                      <td className="r b8 cg nw">
                        {t("85 à 91,5\u00A0%")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Livres, médias")}
                      </td>
                      <td className="r b8 cg nw">
                        {t("87,5 à 91\u00A0%")}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt8">
                  {t("Avec l’offre de découverte, 3 points de plus jusqu’au 27 nov. Minimum 700\u00A0F par commande sur les petits prix.")}
                </p>
              </div>
            </details>
          </div>
          <div className="card">
            <h3>
              {t("Mes données")}
            </h3>
            <div className="hint-l">
              <Icone nom="scroll-text" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Loi n° 2024/017\u00A0: vous pouvez consulter, corriger et exporter vos données.")}
              </span>
            </div>
            <div className="mt6">
              <Link to="/parametres" className="li">
                <span className="ic ">
                  <Icone nom="eye" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Consulter et corriger")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <Link to="/securite" className="li">
                <span className="ic ">
                  <Icone nom="download" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Exporter mes données")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Fichier envoyé par e-mail sous 48\u00A0h")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <div className="li">
                <span className="ic ">
                  <Icone nom="archive" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Preuves conservées 180\u00A0jours")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Photos, journaux et conversations des commandes")}
                  </span>
                </span>
              </div>
              <Link to="/securite?cloture=1" className="li">
                <span className="ic red">
                  <Icone nom="power" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Clôturer mon compte")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Possible une fois commandes, litiges et versements soldés · 30\u00A0jours de préavis")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            </div>
          </div>
        </Ecran>
      )
    case "securite?cloture=1":
      return (
        <Ecran route="securite" parEtat fixes={
          <>
          <div className="veil"></div>
          <div className="sheet">
            <div className="grab"></div>
            <h3 style={{ "margin": "0", "fontSize": "19px", "fontWeight": "800" }}>
              {t("Clôturer mon compte\u00A0?")}
            </h3>
            <p className="t13 c3" style={{ "margin": "6px 0 10px", "lineHeight": "1.45" }}>
              {t("Voici ce qui se passe, dans l’ordre.")}
            </p>
            <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
              <Icone nom="package-check" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0", "marginTop": "1px" }} />
              <span className="grow t14" style={{ "lineHeight": "1.45", "color": "var(--ink)" }}>
                {t("Vos commandes, litiges et versements en cours se terminent d’abord.")}
              </span>
            </div>
            <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
              <Icone nom="calendar-clock" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0", "marginTop": "1px" }} />
              <span className="grow t14" style={{ "lineHeight": "1.45", "color": "var(--ink)" }}>
                {t("La clôture a lieu 30\u00A0jours après votre demande\u00A0: vous pouvez changer d’avis d’ici là.")}
              </span>
            </div>
            <div className="row" style={{ "gap": "10px", "padding": "9px 0", "borderTop": "1px solid var(--line)", "alignItems": "flex-start" }}>
              <Icone nom="archive" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0", "marginTop": "1px" }} />
              <span className="grow t14" style={{ "lineHeight": "1.45", "color": "var(--ink)" }}>
                {t("Vos données sont gardées le temps prévu par la loi, puis effacées.")}
              </span>
            </div>
            <div className="mt14">
              <Link to="/securite" className="btn primary">
                <Icone nom="power" taille={18} />
                <span>
                  {t("Demander la clôture")}
                </span>
              </Link>
            </div>
            <div className="mt8">
              <Link to="/securite" className="btn ghost">
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
              {t("Sécurité, appareils et données")}
            </h1>
            <p className="pg-s">
              {t("Qui utilise votre compte, et comment il est protégé.")}
            </p>
          </div>
          <div className="card">
            <div className="otop">
              <h3>
                {t("Appareils connectés")}
              </h3>
              <span className="pill ink sm">
                {t("2")}
              </span>
            </div>
            <div className="mt6">
              <div className="li" style={{ "alignItems": "flex-start" }}>
                <span className="ic green">
                  <Icone nom="smartphone" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("iPhone · Safari")}
                  </span>
                  <span className="pill green sm" style={{ "marginTop": "4px" }}>
                    {t("Cet appareil")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Yaoundé · actif maintenant")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Depuis le 7 mai · 138 ouvertures")}
                  </span>
                </span>
              </div>
              <div className="li" style={{ "alignItems": "flex-start" }}>
                <span className="ic ">
                  <Icone nom="smartphone" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Android · Chrome")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Yaoundé · il y a 7\u00A0jours")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Depuis le 12 sept. · 3 ouvertures")}
                  </span>
                  <Link to="/securite" className="btn danger sm" style={{ "height": "44px", "display": "inline-flex", "marginTop": "8px" }}>
                    <Icone nom="log-out" taille={16} />
                    <span>
                      {t("Déconnecter")}
                    </span>
                  </Link>
                </span>
              </div>
            </div>
            <div className="note amber">
              <Icone nom="triangle-alert" taille={18} />
              <div>
                {t("Un appareil inconnu\u00A0? Déconnectez-le, changez votre mot de passe et vérifiez votre numéro de versement. Cela n’annule aucune commande.")}
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Mot de passe et second facteur")}
            </h3>
            <div className="hint-l">
              <Icone nom="key-round" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Mot de passe\u00A0: 8 caractères au minimum, dont un chiffre.")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/connexion?s=oubli" className="btn secondary">
                <Icone nom="key-round" taille={18} />
                <span>
                  {t("Changer mon mot de passe")}
                </span>
              </Link>
            </div>
            <div className="mt8" style={{ "borderTop": "1px solid var(--line)" }}>
              <div className="li">
                <span className="ic green">
                  <Icone nom="smartphone" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Second facteur\u00A0: un code par SMS")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Envoyé au 6••\u00A0••\u00A0••\u00A090, votre téléphone personnel. Demandé pour un nouvel appareil, un nouveau numéro de versement ou un accès d’équipe.")}
                  </span>
                </span>
              </div>
            </div>
            <div className="li">
              <span className="ic green">
                <Icone nom="scan-face" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Face ID ou empreinte\u00A0: activé")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Pour ouvrir l’espace, voir votre argent et changer de numéro de versement. Reste dans votre téléphone.")}
                </span>
              </span>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="shield-check" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir le détail")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <table className="tbl">
                  <tbody>
                    <tr>
                      <th>
                        {t("Situation")}
                      </th>
                      <th className="r">
                        {t("Code SMS")}
                      </th>
                    </tr>
                    <tr>
                      <td>
                        {t("Connexion depuis un appareil inconnu")}
                      </td>
                      <td className="r b8 cor">
                        {t("Oui")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Changement du numéro de versement")}
                      </td>
                      <td className="r b8 cr">
                        {t("Toujours")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Ajout d’un accès employé")}
                      </td>
                      <td className="r b8 cr">
                        {t("Toujours")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Changement de mot de passe")}
                      </td>
                      <td className="r b8 cr">
                        {t("Toujours")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Ouverture ordinaire")}
                      </td>
                      <td className="r b8 c3">
                        {t("Jamais")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>
          </div>
          <div className="card">
            <h3>
              {t("Statut du compte")}
            </h3>
            <div className="mt8">
              <div className="kv">
                <span className="k">
                  {t("Créé · approuvé")}
                </span>
                <span className="v ">
                  {t("7 mai · 9 mai 2026")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Contrat")}
                </span>
                <span className="v ">
                  {t("Signé le 7 mai 2026")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Palier · Trust Score")}
                </span>
                <span className="v ">
                  {t("Bronze · 63")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Plan")}
                </span>
                <span className="v ">
                  {t("Free · offre de découverte")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Vous gardez · votre grille")}
                </span>
                <span className="v ">
                  {t("Selon la catégorie")}
                </span>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="percent" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Voir la grille par catégorie")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Palier Bronze. Plus le prix est haut, plus vous gardez.")}
                </p>
                <table className="tbl mt8">
                  <tbody>
                    <tr>
                      <th>
                        {t("Catégorie")}
                      </th>
                      <th className="r">
                        {t("Vous gardez")}
                      </th>
                    </tr>
                    <tr>
                      <td>
                        {t("Électronique, électroménager")}
                      </td>
                      <td className="r b8 cg nw">
                        {t("86,5 à 98\u00A0%")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Mode, beauté")}
                      </td>
                      <td className="r b8 cg nw">
                        {t("76,5 à 86,5\u00A0%")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Supermarché, frais")}
                      </td>
                      <td className="r b8 cg nw">
                        {t("92,5 à 95\u00A0%")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Maison, sport, bébé, animaux")}
                      </td>
                      <td className="r b8 cg nw">
                        {t("85 à 91,5\u00A0%")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("Livres, médias")}
                      </td>
                      <td className="r b8 cg nw">
                        {t("87,5 à 91\u00A0%")}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt8">
                  {t("Avec l’offre de découverte, 3 points de plus jusqu’au 27 nov. Minimum 700\u00A0F par commande sur les petits prix.")}
                </p>
              </div>
            </details>
          </div>
          <div className="card">
            <h3>
              {t("Mes données")}
            </h3>
            <div className="hint-l">
              <Icone nom="scroll-text" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Loi n° 2024/017\u00A0: vous pouvez consulter, corriger et exporter vos données.")}
              </span>
            </div>
            <div className="mt6">
              <Link to="/parametres" className="li">
                <span className="ic ">
                  <Icone nom="eye" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Consulter et corriger")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <Link to="/securite" className="li">
                <span className="ic ">
                  <Icone nom="download" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Exporter mes données")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Fichier envoyé par e-mail sous 48\u00A0h")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <div className="li">
                <span className="ic ">
                  <Icone nom="archive" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Preuves conservées 180\u00A0jours")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Photos, journaux et conversations des commandes")}
                  </span>
                </span>
              </div>
              <Link to="/securite?cloture=1" className="li">
                <span className="ic red">
                  <Icone nom="power" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Clôturer mon compte")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Possible une fois commandes, litiges et versements soldés · 30\u00A0jours de préavis")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            </div>
          </div>
        </Ecran>
      )
  }
}

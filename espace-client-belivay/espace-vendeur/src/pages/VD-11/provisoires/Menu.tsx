// Page provisoire « Menu » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import img_be926f70d2b8_png from '../../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Menu() {
  const { t } = usePreferences()
  switch (useEtat("menu")) {
    default:
      return (
        <Ecran route="menu" parEtat>
          <div className="hero night" style={{ "marginTop": "14px", "padding": "14px 16px" }}>
            <div className="row">
              <span className="avatar" style={{ "boxShadow": "0 0 0 2.5px var(--gold-l)", "margin": "0" }}>
                {t("FP")}
              </span>
              <div className="grow">
                <div className="b8 t17">
                  {t("Tonton PG")}
                </div>
                <div className="t13" style={{ "color": "rgba(255,255,255,.75)" }}>
                  {t("Franck Penga · propriétaire")}
                </div>
              </div>
              <span className="pill green sm">
                <i className="d"></i>
                {t("Ouverte")}
              </span>
            </div>
            <div className="meta">
              <span className="pill dk sm">
                {t("Bronze · 63")}
              </span>
              <span className="pill dk sm">
                {t("Free · découverte")}
              </span>
            </div>
          </div>
          <div className="divider-t">
            {t("À traiter")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/commandes" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="package-check" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("À préparer")}
                </span>
              </span>
              <span className="badge-num">
                {t("2")}
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/litiges" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="scale" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Litiges")}
                </span>
              </span>
              <span className="badge-num red">
                {t("2")}
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/retours" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="undo-2" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Retours")}
                </span>
              </span>
              <span className="badge-num">
                {t("1")}
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
          </div>
          <div className="divider-t">
            {t("Messages et aide")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/notifications" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="bell" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Notifications")}
                </span>
              </span>
              <span className="badge-num">
                {t("4")}
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/messages" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="messages-square" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Messagerie")}
                </span>
              </span>
              <span className="badge-num">
                {t("1")}
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/aide" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="circle-help" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Aide")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Questions fréquentes · support WhatsApp")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
          </div>
          <div className="divider-t">
            {t("Mon argent")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/argent" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="wallet" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Mon argent")}
                </span>
              </span>
              <span className="t13 b8 cg nw">
                {t("17\u00A0840\u00A0F à verser")}
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/versements" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="banknote" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Versements")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Chaque vendredi, sans frais")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/documents" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="file-text" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Documents")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Contrat, factures, relevés")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
          </div>
          <div className="divider-t">
            {t("Mon catalogue")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/produits" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="package" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Mes produits")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("3 produits · 1 en vérification")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/offre1" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="plus" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Nouvelle offre")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/saisie_assistee" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="users" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Saisie assistée")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Un agent BelivaY saisit vos fiches")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
          </div>
          <div className="divider-t">
            {t("Vendre plus")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/palier" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="award" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Trust Score et palier")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Votre note de confiance, sur 100")}
                </span>
              </span>
              <span className="t13 b8 cor">
                {t("63")}
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/chiffres" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="chart-column" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Mes chiffres")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/plans_liste" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="sparkles" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Plans & tarifs")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/visibilite" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="megaphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Se faire voir")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Mettre vos offres en avant")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
          </div>
          <div className="divider-t">
            {t("Ma boutique")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/boutique" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="store" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Ma boutique")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Ce que voit le client")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/horaires" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="clock" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Horaires et fermetures")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/avis" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="star" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Avis")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/equipe" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="users" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Mon équipe")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/emplacement" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="map-pin" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Emplacement")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
          </div>
          <div className="divider-t">
            {t("Nouveautés")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/ile" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("L’île BelivaY")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Île dynamique, écran verrouillé, animations")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
          </div>
          <div className="divider-t">
            {t("Mon compte")}
          </div>
          <div className="card tight" style={{ "marginTop": "0" }}>
            <Link to="/parametres" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="settings" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Paramètres")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Langue, taille du texte, notifications")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/securite" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="shield-check" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Sécurité, appareils et données")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/installer" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="download" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Installer l’application")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/connexion" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
              <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                <Icone nom="log-out" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                  {t("Se déconnecter")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
          </div>
          <div className="mt20">
            <details className="more">
              <summary>
                <Icone nom="layers" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Écrans d’état et d’accès")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <div>
                  <Link to="/lancement" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="rocket" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Ouverture de l’app")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/ouvrir" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="store" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Ouvrir ma boutique")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/bienvenue_client" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="badge-check" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Arrivée depuis l’espace client")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/faceid?nouveau=1" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="scan-face" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Face ID proposé une fois")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/kyc?s=refusee" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="id-card" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Pièce refusée")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/kyc" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="id-card" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Publier et être payé")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/premier_jour" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="sparkles" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Premier jour")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/accueil_calme" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="sun" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Rien à faire")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/?closed=1" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="calendar-x" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Fermé aujourd’hui")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/horsligne" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="wifi-off" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Hors connexion")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/suspendu" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="shield-alert" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Compte suspendu")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/erreurs" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="triangle-alert" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("États d’erreur")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                  <Link to="/camera" className="li" style={{ "minHeight": "52px", "padding": "10px 0" }}>
                    <span style={{ "color": "var(--ink-2)", "display": "flex", "flexShrink": "0" }}>
                      <Icone nom="camera" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt" style={{ "display": "block", "fontSize": "14.5px" }}>
                        {t("Caméra")}
                      </span>
                    </span>
                    <span className="chev">
                      <Icone nom="chevron-right" taille={17} />
                    </span>
                  </Link>
                </div>
              </div>
            </details>
          </div>
          <div className="center" style={{ "marginTop": "22px" }}>
            <img src={img_be926f70d2b8_png} alt="BelivaY" style={{ "height": "26px", "opacity": ".9" }} />
            <div className="t12 c3 mt6">
              {t("Espace vendeur · version 2.0")}
            </div>
          </div>
        </Ecran>
      )
  }
}

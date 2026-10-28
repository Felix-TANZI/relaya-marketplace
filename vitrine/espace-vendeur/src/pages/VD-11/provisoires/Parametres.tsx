// Page provisoire « Paramètres » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'
import { BOUTIQUE } from '../../../demo/jeu-essai'

export default function Parametres() {
  const { t, tf } = usePreferences()
  switch (useEtat("parametres")) {
    default:
      return (
        <Ecran route="parametres" parEtat>
          <div className="card" style={{ "marginTop": "14px" }}>
            <div className="row">
              <span className="avatar" style={{ "width": "56px", "height": "56px", "fontSize": "19px", "margin": "0" }}>
                {t("FP")}
              </span>
              <div className="grow">
                <div className="b8 t17">
                  {t("Franck Penga")}
                </div>
                <div className="t13 c3 mt4">
                  {tf("@Penga12 · propriétaire · {b}", { b: BOUTIQUE.nom })}
                </div>
              </div>
            </div>
            <div className="meta">
              <span className="pill green sm">
                <Icone nom="badge-check" taille={13} />
                {t("Identité vérifiée")}
              </span>
              <span className="pill bronze sm">
                <Icone nom="award" taille={13} />
                {t("Bronze · 63")}
              </span>
            </div>
            <div className="row" style={{ "gap": "10px", "marginTop": "12px", "paddingTop": "10px", "borderTop": "1px solid var(--line)" }}>
              <Icone nom="coins" taille={18} style={{ "color": "var(--green)", "flexShrink": "0" }} />
              <div className="grow">
                <div className="t14 b7">
                  {t("Gagné avec BelivaY")}
                </div>
                <div className="t12 c3">
                  {t("Depuis votre inscription")}
                </div>
              </div>
              <span className="b8 t17 cg nw">
                {t("53\u00A0520\u00A0F")}
              </span>
            </div>
            <div className="hint-l">
              <Icone nom="lock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("L’identifiant ne change jamais. Le nom suit votre pièce d’identité.")}
              </span>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Affichage et langue")}
            </h3>
            <div className="mt6">
              <div className="li" style={{ "flexWrap": "wrap", "padding": "12px 0" }}>
                <span className="ic">
                  <Icone nom="languages" taille={19} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Langue")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("L’application, les notifications et les SMS")}
                  </span>
                </span>
                <div className="seg" style={{ "margin": "10px 0 0", "width": "100%" }}>
                  <a data-act="set-lang" data-v="fr" className="on" style={{ "height": "44px" }}>
                    {t("Français")}
                  </a>
                  <a data-act="set-lang" data-v="en" className="" style={{ "height": "44px" }}>
                    {t("English")}
                  </a>
                  <a data-act="set-lang" data-v="pg" className="" style={{ "height": "44px" }}>
                    {t("Pidgin")}
                  </a>
                </div>
              </div>
              <div className="li" style={{ "flexWrap": "wrap", "padding": "12px 0" }}>
                <span className="ic" style={{ "fontSize": "15px", "fontWeight": "800", "letterSpacing": "-.02em" }}>
                  {t("Aa")}
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Taille du texte")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Plus grand, plus facile à lire, sur tous les écrans.")}
                  </span>
                </span>
                <div className="seg" style={{ "margin": "10px 0 0", "width": "100%" }}>
                  <a data-act="set-text" data-v="normale" className="on" style={{ "height": "44px", "fontSize": "13px" }}>
                    {t("Normale")}
                  </a>
                  <a data-act="set-text" data-v="grande" className="" style={{ "height": "44px", "fontSize": "14.5px" }}>
                    {t("Grande")}
                  </a>
                  <a data-act="set-text" data-v="tres" className="" style={{ "height": "44px", "fontSize": "16px" }}>
                    {t("Très grande")}
                  </a>
                </div>
              </div>
              <div className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
                <span className="ic">
                  <Icone nom="moon" taille={19} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Thème sombre")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Aussi avec la lune, en haut de l’accueil")}
                  </span>
                </span>
                <span data-act="set-theme" data-v="dark">
                  <button type="button" className="tg" role="switch" aria-checked="false"></button>
                </span>
              </div>
              <div className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
                <span className="ic">
                  <Icone nom="database" taille={19} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Économie de données")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Moins de forfait internet\u00A0: photos allégées")}
                  </span>
                </span>
                <button type="button" className="tg on" role="switch" aria-checked="true"></button>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Notifications")}
            </h3>
            <div className="mt6">
              <div className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
                <span className="ic">
                  <Icone nom="shopping-bag" taille={19} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Commandes et litiges")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Toujours actives · notification et SMS")}
                  </span>
                </span>
                <button type="button" className="tg on lock" role="switch" aria-checked="true"></button>
              </div>
              <div className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
                <span className="ic">
                  <Icone nom="banknote" taille={19} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Versements du vendredi")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Notification")}
                  </span>
                </span>
                <button type="button" className="tg on" role="switch" aria-checked="true"></button>
              </div>
              <div className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
                <span className="ic">
                  <Icone nom="star" taille={19} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Avis")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Notification")}
                  </span>
                </span>
                <button type="button" className="tg on" role="switch" aria-checked="true"></button>
              </div>
              <div className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
                <span className="ic">
                  <Icone nom="lightbulb" taille={19} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Conseils")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Une fois par semaine au plus")}
                  </span>
                </span>
                <button type="button" className="tg on" role="switch" aria-checked="true"></button>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="message-square" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Jamais de promotion par SMS.")}
              </span>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Boutique")}
            </h3>
            <div className="mt6">
              <div className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
                <span className="ic">
                  <Icone nom="circle-pause" taille={19} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Mettre la boutique en pause")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Plus aucune offre attribuée. Les commandes reçues restent à préparer.")}
                  </span>
                </span>
                <button type="button" className="tg" role="switch" aria-checked="false"></button>
              </div>
            </div>
            <Link to="/horaires" className="row t13 b7 cor" style={{ "gap": "8px", "minHeight": "44px", "marginTop": "4px" }}>
              <Icone nom="calendar-x" taille={17} style={{ "flexShrink": "0" }} />
              <span className="grow">
                {t("Pour un seul jour\u00A0: «\u00A0Fermé aujourd’hui\u00A0»")}
              </span>
              <Icone nom="chevron-right" taille={16} style={{ "flexShrink": "0" }} />
            </Link>
          </div>
          <div className="card">
            <h3>
              {t("Profil")}
            </h3>
            <div className="fld">
              <label>
                {t("Téléphone personnel")}
              </label>
              <div className="inp">
                <span className="b8 c2 row" style={{ "gap": "6px", "paddingRight": "8px", "borderRight": "1px solid var(--line-2)" }}>
                  <Dessin id="81b1dee44510" />
                  {t("+237")}
                </span>
                <span className="grow">
                  {t("6•• •• •• 90")}
                </span>
              </div>
              <div className="hint">
                {t("Pour que le support vous joigne. Ce n’est pas votre numéro de versement.")}
              </div>
            </div>
            <div className="fld">
              <label>
                {t("E-mail")}
              </label>
              <div className="inp">
                <span className="grow">
                  {t("f•••••@gmail.com")}
                </span>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Mobile Money")}
            </h3>
            <div className="mt6">
              <Link to="/numero_versement" className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
                <span className="ic">
                  <Icone nom="smartphone" taille={19} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Numéro de versement")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("MTN\u00A0····\u00A04\u00A0217 · vérifié · au nom du titulaire")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={17} />
                </span>
              </Link>
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Ce n’est ni votre téléphone personnel, ni un numéro connu des clients.")}
              </span>
            </div>
          </div>
          <div className="card tight">
            <Link to="/securite" className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
              <span className="ic">
                <Icone nom="shield-check" taille={19} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Sécurité, appareils et données")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("2 appareils · code par SMS au 6••\u00A0••\u00A0••\u00A090")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/documents" className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
              <span className="ic">
                <Icone nom="file-text" taille={19} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
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
            <Link to="/messages" className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
              <span className="ic">
                <Icone nom="messages-square" taille={19} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Messagerie")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
            <Link to="/installer" className="li" style={{ "minHeight": "56px", "padding": "10px 0" }}>
              <span className="ic">
                <Icone nom="download" taille={19} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Installer l’application")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={17} />
              </span>
            </Link>
          </div>
          <div className="mt16">
            <Link to="/" className="btn primary">
              <Icone nom="check" taille={18} />
              <span>
                {t("Enregistrer")}
              </span>
            </Link>
          </div>
          <div className="mt10">
            <Link to="/connexion" className="btn danger">
              <Icone nom="log-out" taille={18} />
              <span>
                {t("Se déconnecter")}
              </span>
            </Link>
          </div>
          <p className="t12 c3 center" style={{ "margin": "16px 0 0", "lineHeight": "1.6" }}>
            {t("BelivaY Vendeur 2.0 · septembre 2026")}
            <br />
            {t("Conformité\u00A0: ANTIC · OHADA · loi n° 2024/017")}
          </p>
        </Ecran>
      )
  }
}

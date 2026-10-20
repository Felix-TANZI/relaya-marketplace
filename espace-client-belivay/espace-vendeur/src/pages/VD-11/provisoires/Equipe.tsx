// Page provisoire « Équipe » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Equipe() {
  const { t } = usePreferences()
  switch (useEtat("equipe")) {
    default:
      return (
        <Ecran route="equipe" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Mon équipe")}
            </h1>
            <p className="pg-s">
              {t("Un accès par personne\u00A0: on sait toujours qui a fait quoi.")}
            </p>
          </div>
          <div className="card tight">
            <div className="li">
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "50%", "background": "var(--ink)", "color": "var(--card)", "fontWeight": "800", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("FP")}
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px", "flexWrap": "wrap" }}>
                  <span className="lt">
                    {t("Franck Penga")}
                  </span>
                  <span className="pill or sm">
                    {t("Propriétaire")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vous · tout, dont l’argent et les prix")}
                </span>
              </span>
            </div>
            <div className="li">
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "50%", "background": "var(--bronze)", "color": "var(--card)", "fontWeight": "800", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("AN")}
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px", "flexWrap": "wrap" }}>
                  <span className="lt">
                    {t("Aïcha N.")}
                  </span>
                  <span className="pill ink sm">
                    {t("Préparation")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Dernière action\u00A0: stock mis à jour à 09\u00A0h\u00A020")}
                </span>
              </span>
              <Link to="/equipe" className="btn danger sm" style={{ "height": "44px" }}>
                {t("Retirer")}
              </Link>
            </div>
          </div>
          <div className="hint-l">
            <Icone nom="users" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("1 accès employé sur 3 · sur tous les plans")}
            </span>
          </div>
          <div className="mt16">
            <Link to="/equipe?add=1" className="btn primary">
              <Icone nom="user-plus" taille={18} />
              <span>
                {t("Ajouter un accès")}
              </span>
            </Link>
          </div>
          <div className="note ink">
            <Icone nom="ban" taille={18} />
            <div>
              {t("Ne partagez jamais votre compte\u00A0: en cas de litige, on doit savoir qui a fait quoi.")}
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="eye" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Ce que voit un accès Préparation")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <div className="kick">
                {t("Peut faire")}
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="check" taille={17} trait={2.6} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--green)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("Préparer, «\u00A0C’est prêt\u00A0», rupture, délai")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="check" taille={17} trait={2.6} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--green)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("Stock, photos, code de remise")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="check" taille={17} trait={2.6} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--green)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("Répondre aux litiges, inspecter les retours")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="check" taille={17} trait={2.6} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--green)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("«\u00A0Fermer aujourd’hui\u00A0»")}
                </span>
              </div>
              <div className="kick" style={{ "marginTop": "10px" }}>
                {t("Ne voit jamais")}
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="x" taille={17} trait={2} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("L’argent, les versements, les documents")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="x" taille={17} trait={2} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("Les prix, la publication, les plans")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="x" taille={17} trait={2} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("Le numéro de versement, l’équipe")}
                </span>
              </div>
              <p className="mt8">
                {t("Vous, propriétaire, pouvez tout faire.")}
              </p>
              <Link to="/?role=prep" className="row t14 b7 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                {t("Voir l’accueil d’Aïcha")}
                <Icone nom="chevron-right" taille={16} />
              </Link>
            </div>
          </details>
          <details className="more">
            <summary>
              <Icone nom="users" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                {t("Ajouter ou retirer un accès demande un code reçu par SMS au 6••\u00A0••\u00A0••\u00A090\u00A0: c’est votre second facteur.")}
              </p>
              <p>
                {t("Chaque action est signée par son auteur et visible dans le journal de la commande.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
    case "equipe?add=1":
      return (
        <Ecran route="equipe" parEtat fixes={
          <>
          <div className="veil"></div>
          <div className="sheet">
            <div className="grab"></div>
            <h3 style={{ "margin": "0", "fontSize": "19px", "fontWeight": "800" }}>
              {t("Ajouter un accès")}
            </h3>
            <p className="t13 c3" style={{ "margin": "6px 0 0", "lineHeight": "1.45" }}>
              {t("La personne reçoit un SMS pour installer l’application et choisir son mot de passe.")}
            </p>
            <div className="fld">
              <label>
                {t("Prénom et nom")}
              </label>
              <div className="inp focus">
                <span className="grow">
                  {t("Paul Ekambi")}
                </span>
              </div>
            </div>
            <div className="fld">
              <label>
                {t("Téléphone")}
              </label>
              <div className="inp">
                <span className="b8 c2 row" style={{ "gap": "6px", "paddingRight": "8px", "borderRight": "1px solid var(--line-2)" }}>
                  <Dessin id="81b1dee44510" />
                  {t("+237")}
                </span>
                <span className="grow">
                  {t("677 12 34 56")}
                </span>
              </div>
            </div>
            <div className="card flat" style={{ "marginTop": "14px" }}>
              <div className="b8 t14">
                {t("Accès «\u00A0Préparation\u00A0»")}
              </div>
              <div className="t13 c2 mt4" style={{ "lineHeight": "1.45" }}>
                {t("Commandes, stock, photos, code de remise, litiges, retours, «\u00A0Fermer aujourd’hui\u00A0».")}
              </div>
              <div className="t13 c3 mt4" style={{ "lineHeight": "1.45" }}>
                {t("Jamais\u00A0: argent, versements, documents, prix, publication, plans, équipe.")}
              </div>
            </div>
            <div className="mt14">
              <Link to="/equipe" className="btn primary">
                <Icone nom="send" taille={18} />
                <span>
                  {t("Envoyer l’invitation")}
                </span>
              </Link>
            </div>
            <div className="hint-l">
              <Icone nom="shield-check" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Pour confirmer, un code vous est envoyé par SMS au 6••\u00A0••\u00A0••\u00A090.")}
              </span>
            </div>
            <div className="mt8">
              <Link to="/equipe" className="btn ghost">
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
              {t("Mon équipe")}
            </h1>
            <p className="pg-s">
              {t("Un accès par personne\u00A0: on sait toujours qui a fait quoi.")}
            </p>
          </div>
          <div className="card tight">
            <div className="li">
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "50%", "background": "var(--ink)", "color": "var(--card)", "fontWeight": "800", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("FP")}
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px", "flexWrap": "wrap" }}>
                  <span className="lt">
                    {t("Franck Penga")}
                  </span>
                  <span className="pill or sm">
                    {t("Propriétaire")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Vous · tout, dont l’argent et les prix")}
                </span>
              </span>
            </div>
            <div className="li">
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "50%", "background": "var(--bronze)", "color": "var(--card)", "fontWeight": "800", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0" }}>
                {t("AN")}
              </span>
              <span className="grow">
                <span className="row" style={{ "gap": "6px", "flexWrap": "wrap" }}>
                  <span className="lt">
                    {t("Aïcha N.")}
                  </span>
                  <span className="pill ink sm">
                    {t("Préparation")}
                  </span>
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Dernière action\u00A0: stock mis à jour à 09\u00A0h\u00A020")}
                </span>
              </span>
              <Link to="/equipe" className="btn danger sm" style={{ "height": "44px" }}>
                {t("Retirer")}
              </Link>
            </div>
          </div>
          <div className="hint-l">
            <Icone nom="users" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
            <span>
              {t("1 accès employé sur 3 · sur tous les plans")}
            </span>
          </div>
          <div className="mt16">
            <Link to="/equipe?add=1" className="btn primary">
              <Icone nom="user-plus" taille={18} />
              <span>
                {t("Ajouter un accès")}
              </span>
            </Link>
          </div>
          <div className="note ink">
            <Icone nom="ban" taille={18} />
            <div>
              {t("Ne partagez jamais votre compte\u00A0: en cas de litige, on doit savoir qui a fait quoi.")}
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="eye" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Ce que voit un accès Préparation")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <div className="kick">
                {t("Peut faire")}
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="check" taille={17} trait={2.6} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--green)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("Préparer, «\u00A0C’est prêt\u00A0», rupture, délai")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="check" taille={17} trait={2.6} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--green)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("Stock, photos, code de remise")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="check" taille={17} trait={2.6} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--green)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("Répondre aux litiges, inspecter les retours")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="check" taille={17} trait={2.6} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--green)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("«\u00A0Fermer aujourd’hui\u00A0»")}
                </span>
              </div>
              <div className="kick" style={{ "marginTop": "10px" }}>
                {t("Ne voit jamais")}
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="x" taille={17} trait={2} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("L’argent, les versements, les documents")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="x" taille={17} trait={2} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("Les prix, la publication, les plans")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "padding": "7px 0", "alignItems": "flex-start" }}>
                <Icone nom="x" taille={17} trait={2} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
                <span className="grow t14" style={{ "color": "var(--ink)" }}>
                  {t("Le numéro de versement, l’équipe")}
                </span>
              </div>
              <p className="mt8">
                {t("Vous, propriétaire, pouvez tout faire.")}
              </p>
              <Link to="/?role=prep" className="row t14 b7 cor" style={{ "gap": "4px", "minHeight": "44px" }}>
                {t("Voir l’accueil d’Aïcha")}
                <Icone nom="chevron-right" taille={16} />
              </Link>
            </div>
          </details>
          <details className="more">
            <summary>
              <Icone nom="users" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                {t("Ajouter ou retirer un accès demande un code reçu par SMS au 6••\u00A0••\u00A0••\u00A090\u00A0: c’est votre second facteur.")}
              </p>
              <p>
                {t("Chaque action est signée par son auteur et visible dans le journal de la commande.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}

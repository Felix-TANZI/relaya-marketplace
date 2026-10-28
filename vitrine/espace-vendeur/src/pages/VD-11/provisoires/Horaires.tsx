// Page provisoire « Horaires et fermetures » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'
import { LIVREUR } from '../../../demo/jeu-essai'

export default function Horaires() {
  const { t, tf } = usePreferences()
  switch (useEtat("horaires")) {
    default:
      return (
        <Ecran route="horaires" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Horaires et fermetures")}
            </h1>
            <p className="pg-s">
              {t("Le délai de préparation ne court que pendant vos heures d’ouverture.")}
            </p>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--line-2)" }}>
            <div className="row">
              <div className="grow">
                <div className="b8 t17">
                  {t("Fermé aujourd’hui")}
                </div>
                <div className="row t13 b7 cg mt4" style={{ "gap": "6px" }}>
                  <i style={{ "width": "8px", "height": "8px", "borderRadius": "50%", "background": "currentColor", "display": "block", "flexShrink": "0" }}></i>
                  {t("Ouverte aujourd’hui jusqu’à 18\u00A0h")}
                </div>
              </div>
              <button type="button" className="tg" role="switch" aria-checked="false"></button>
            </div>
            <p className="t13 c3" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Activé\u00A0: plus de nouvelle commande jusqu’à demain 08\u00A0h. Les commandes déjà reçues restent à préparer.")}
            </p>
          </div>
          <div className="card">
            <h3>
              {t("Horaires d’ouverture")}
            </h3>
            <div className="mt6">
              <div className="li" style={{ "minHeight": "0", "padding": "8px 0" }}>
                <span className="grow t14 b7">
                  {t("Lundi au vendredi")}
                </span>
                <span style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "height": "44px", "padding": "0 10px 0 12px", "borderRadius": "12px", "border": "1.5px solid var(--input-line)", "background": "var(--input-bg)", "fontSize": "14.5px", "fontWeight": "700", "whiteSpace": "nowrap", "color": "var(--ink)" }}>
                  {t("08\u00A0h – 18\u00A0h")}
                  <Icone nom="chevron-down" taille={16} style={{ "color": "var(--ink-3)" }} />
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "8px 0" }}>
                <span className="grow t14 b7">
                  {t("Samedi")}
                </span>
                <span style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "height": "44px", "padding": "0 10px 0 12px", "borderRadius": "12px", "border": "1.5px solid var(--input-line)", "background": "var(--input-bg)", "fontSize": "14.5px", "fontWeight": "700", "whiteSpace": "nowrap", "color": "var(--ink)" }}>
                  {t("08\u00A0h – 14\u00A0h")}
                  <Icone nom="chevron-down" taille={16} style={{ "color": "var(--ink-3)" }} />
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "8px 0" }}>
                <span className="grow t14 b7">
                  {t("Dimanche")}
                </span>
                <span style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "height": "44px", "padding": "0 10px 0 12px", "borderRadius": "12px", "border": "1.5px solid var(--input-line)", "background": "var(--input-bg)", "fontSize": "14.5px", "fontWeight": "700", "whiteSpace": "nowrap", "color": "var(--ink-3)" }}>
                  {t("Fermé")}
                  <Icone nom="chevron-down" taille={16} style={{ "color": "var(--ink-3)" }} />
                </span>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Passage du livreur")}
            </h3>
            <div className="mt8">
              <div className="kv">
                <span className="k">
                  {t("Lundi au vendredi")}
                </span>
                <span className="v ">
                  {t("14\u00A0h – 16\u00A0h")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Samedi")}
                </span>
                <span className="v ">
                  {t("11\u00A0h – 13\u00A0h")}
                </span>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="lock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {tf("Fixé avec {e}, l’entreprise de livraison de votre zone.", { e: LIVREUR.societe })}
              </span>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Fermetures programmées")}
            </h3>
            <div className="mt6">
              <div className="li" style={{ "minHeight": "0", "padding": "10px 0" }}>
                <span className="ic">
                  <Icone nom="calendar" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Fêtes de fin d’année")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Du jeu. 24 au sam. 26 déc. · annoncée le 13 oct.")}
                  </span>
                </span>
                <Link to="/horaires" className="btn ghost sm" style={{ "height": "44px", "padding": "0 8px" }}>
                  {t("Annuler")}
                </Link>
              </div>
            </div>
            <div className="mt10">
              <Link to="/horaires?prog=1" className="btn secondary">
                <Icone nom="plus" taille={18} />
                <span>
                  {t("Programmer une fermeture")}
                </span>
              </Link>
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Au moins 48\u00A0h à l’avance\u00A0: le temps de confier vos commandes à d’autres vendeurs.")}
              </span>
            </div>
          </div>
          <div className="mt16">
            <Link to="/boutique" className="btn primary">
              <Icone nom="check" taille={18} />
              <span>
                {t("Enregistrer")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
    case "horaires?prog=1":
      return (
        <Ecran route="horaires" parEtat fixes={
          <>
          <div className="veil"></div>
          <div className="sheet">
            <div className="grab"></div>
            <h3 style={{ "margin": "0", "fontSize": "19px", "fontWeight": "800" }}>
              {t("Programmer une fermeture")}
            </h3>
            <p className="t13 c3" style={{ "margin": "6px 0 0", "lineHeight": "1.45" }}>
              {t("Aucune nouvelle commande ne vous est confiée pendant ces jours.")}
            </p>
            <div className="split2">
              <div className="fld">
                <label>
                  {t("Premier jour fermé")}
                </label>
                <div className="inp focus">
                  <Icone nom="calendar" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Ven. 23 oct.")}
                  </span>
                </div>
              </div>
              <div className="fld">
                <label>
                  {t("Dernier jour fermé")}
                </label>
                <div className="inp">
                  <Icone nom="calendar" taille={18} style={{ "color": "var(--ink-3)", "flexShrink": "0" }} />
                  <span className="grow">
                    {t("Dim. 25 oct.")}
                  </span>
                </div>
              </div>
            </div>
            <div className="fld">
              <label>
                {t("Motif (facultatif)")}
              </label>
              <div className="inp ph">
                <span className="grow">
                  {t("Ex.\u00A0: voyage, inventaire")}
                </span>
              </div>
              <div className="hint">
                {t("Pour vous seul\u00A0: jamais montré au client.")}
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="clock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Au moins 48\u00A0h à l’avance\u00A0: au plus tôt jeudi 15 oct. à 09\u00A0h\u00A048.")}
              </span>
            </div>
            <div className="mt14">
              <Link to="/horaires" className="btn primary">
                <Icone nom="calendar-check" taille={18} />
                <span>
                  {t("Programmer")}
                </span>
              </Link>
            </div>
            <div className="mt8">
              <Link to="/horaires" className="btn ghost">
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
              {t("Horaires et fermetures")}
            </h1>
            <p className="pg-s">
              {t("Le délai de préparation ne court que pendant vos heures d’ouverture.")}
            </p>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--line-2)" }}>
            <div className="row">
              <div className="grow">
                <div className="b8 t17">
                  {t("Fermé aujourd’hui")}
                </div>
                <div className="row t13 b7 cg mt4" style={{ "gap": "6px" }}>
                  <i style={{ "width": "8px", "height": "8px", "borderRadius": "50%", "background": "currentColor", "display": "block", "flexShrink": "0" }}></i>
                  {t("Ouverte aujourd’hui jusqu’à 18\u00A0h")}
                </div>
              </div>
              <button type="button" className="tg" role="switch" aria-checked="false"></button>
            </div>
            <p className="t13 c3" style={{ "margin": "10px 0 0", "lineHeight": "1.45" }}>
              {t("Activé\u00A0: plus de nouvelle commande jusqu’à demain 08\u00A0h. Les commandes déjà reçues restent à préparer.")}
            </p>
          </div>
          <div className="card">
            <h3>
              {t("Horaires d’ouverture")}
            </h3>
            <div className="mt6">
              <div className="li" style={{ "minHeight": "0", "padding": "8px 0" }}>
                <span className="grow t14 b7">
                  {t("Lundi au vendredi")}
                </span>
                <span style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "height": "44px", "padding": "0 10px 0 12px", "borderRadius": "12px", "border": "1.5px solid var(--input-line)", "background": "var(--input-bg)", "fontSize": "14.5px", "fontWeight": "700", "whiteSpace": "nowrap", "color": "var(--ink)" }}>
                  {t("08\u00A0h – 18\u00A0h")}
                  <Icone nom="chevron-down" taille={16} style={{ "color": "var(--ink-3)" }} />
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "8px 0" }}>
                <span className="grow t14 b7">
                  {t("Samedi")}
                </span>
                <span style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "height": "44px", "padding": "0 10px 0 12px", "borderRadius": "12px", "border": "1.5px solid var(--input-line)", "background": "var(--input-bg)", "fontSize": "14.5px", "fontWeight": "700", "whiteSpace": "nowrap", "color": "var(--ink)" }}>
                  {t("08\u00A0h – 14\u00A0h")}
                  <Icone nom="chevron-down" taille={16} style={{ "color": "var(--ink-3)" }} />
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "8px 0" }}>
                <span className="grow t14 b7">
                  {t("Dimanche")}
                </span>
                <span style={{ "display": "inline-flex", "alignItems": "center", "gap": "6px", "height": "44px", "padding": "0 10px 0 12px", "borderRadius": "12px", "border": "1.5px solid var(--input-line)", "background": "var(--input-bg)", "fontSize": "14.5px", "fontWeight": "700", "whiteSpace": "nowrap", "color": "var(--ink-3)" }}>
                  {t("Fermé")}
                  <Icone nom="chevron-down" taille={16} style={{ "color": "var(--ink-3)" }} />
                </span>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Passage du livreur")}
            </h3>
            <div className="mt8">
              <div className="kv">
                <span className="k">
                  {t("Lundi au vendredi")}
                </span>
                <span className="v ">
                  {t("14\u00A0h – 16\u00A0h")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Samedi")}
                </span>
                <span className="v ">
                  {t("11\u00A0h – 13\u00A0h")}
                </span>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="lock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {tf("Fixé avec {e}, l’entreprise de livraison de votre zone.", { e: LIVREUR.societe })}
              </span>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Fermetures programmées")}
            </h3>
            <div className="mt6">
              <div className="li" style={{ "minHeight": "0", "padding": "10px 0" }}>
                <span className="ic">
                  <Icone nom="calendar" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Fêtes de fin d’année")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Du jeu. 24 au sam. 26 déc. · annoncée le 13 oct.")}
                  </span>
                </span>
                <Link to="/horaires" className="btn ghost sm" style={{ "height": "44px", "padding": "0 8px" }}>
                  {t("Annuler")}
                </Link>
              </div>
            </div>
            <div className="mt10">
              <Link to="/horaires?prog=1" className="btn secondary">
                <Icone nom="plus" taille={18} />
                <span>
                  {t("Programmer une fermeture")}
                </span>
              </Link>
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Au moins 48\u00A0h à l’avance\u00A0: le temps de confier vos commandes à d’autres vendeurs.")}
              </span>
            </div>
          </div>
          <div className="mt16">
            <Link to="/boutique" className="btn primary">
              <Icone nom="check" taille={18} />
              <span>
                {t("Enregistrer")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}

// Page provisoire « États d’erreur » (VD-06) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (7 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Erreurs() {
  const { t } = usePreferences()
  switch (useEtat("erreurs")) {
    case "erreurs?e=absent":
    default:
      return (
        <Ecran route="erreurs" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Quand la remise bloque")}
            </h1>
            <p className="pg-s">
              {t("Chaque message dit ce qui s’est passé et quoi faire.")}
            </p>
          </div>
          <div className="chips">
            <Link to="/erreurs?e=absent" className="chip on" style={{ "padding": "0 11px" }}>
              {t("Livreur absent")}
            </Link>
            <Link to="/erreurs?e=bloque" className="chip" style={{ "padding": "0 11px" }}>
              {t("Remise bloquée")}
            </Link>
            <Link to="/erreurs?e=annulee" className="chip" style={{ "padding": "0 11px" }}>
              {t("Annulée")}
            </Link>
            <Link to="/erreurs?e=depasse" className="chip" style={{ "padding": "0 11px" }}>
              {t("Délai dépassé")}
            </Link>
            <Link to="/erreurs?e=reseau" className="chip" style={{ "padding": "0 11px" }}>
              {t("Pas de réseau")}
            </Link>
            <Link to="/erreurs?e=plafond" className="chip" style={{ "padding": "0 11px" }}>
              {t("Colis de valeur")}
            </Link>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--amber-line)", "background": "var(--amber-soft)" }}>
            <div className="row" style={{ "gap": "10px" }}>
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <div className="grow">
                <div className="t14 b8">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="t12 c3" style={{ "marginTop": "2px" }}>
                  {t("BLV-00008 · colis S")}
                </div>
              </div>
            </div>
            <div className="row mt14" style={{ "alignItems": "flex-start" }}>
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "14px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--card)", "color": "var(--amber)" }}>
                <Icone nom="clock-alert" taille={22} />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "19px", "lineHeight": "1.25", "letterSpacing": "-.01em", "color": "var(--amber)" }}>
                  {t("Le livreur n’est pas venu")}
                </div>
                <div className="t14 c2 mt6" style={{ "lineHeight": "1.45" }}>
                  {t("Serge M. n’est pas passé entre 14\u00A0h et 16\u00A0h.")}
                </div>
              </div>
            </div>
            <div style={{ "marginTop": "14px", "padding": "2px 12px", "borderRadius": "12px", "background": "var(--card)" }}>
              <div className="row" style={{ "gap": "10px", "alignItems": "flex-start", "padding": "10px 0" }}>
                <Icone nom="calendar-clock" taille={18} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--amber)" }} />
                <span className="grow t14" style={{ "lineHeight": "1.4" }}>
                  {t("Il repasse demain entre 14\u00A0h et 16\u00A0h")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "alignItems": "flex-start", "padding": "10px 0", "borderTop": "1px solid var(--line)" }}>
                <Icone nom="shield-check" taille={18} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--amber)" }} />
                <span className="grow t14" style={{ "lineHeight": "1.4" }}>
                  {t("Aucun effet pour vous\u00A0: délai suspendu")}
                </span>
              </div>
            </div>
            <div className="mt14">
              <Link to="/commande_prete?ref=BLV-00008" className="btn primary">
                <Icone nom="calendar-clock" taille={18} />
                <span>
                  {t("Voir le nouveau créneau")}
                </span>
              </Link>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Quand le livreur manque son créneau, votre délai de préparation s’arrête jusqu’à son prochain passage. Cela ne compte jamais contre vous.")}
                </p>
              </div>
            </details>
          </div>
        </Ecran>
      )
    case "erreurs?e=bloque":
      return (
        <Ecran route="erreurs" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Quand la remise bloque")}
            </h1>
            <p className="pg-s">
              {t("Chaque message dit ce qui s’est passé et quoi faire.")}
            </p>
          </div>
          <div className="chips">
            <Link to="/erreurs?e=absent" className="chip" style={{ "padding": "0 11px" }}>
              {t("Livreur absent")}
            </Link>
            <Link to="/erreurs?e=bloque" className="chip on" style={{ "padding": "0 11px" }}>
              {t("Remise bloquée")}
            </Link>
            <Link to="/erreurs?e=annulee" className="chip" style={{ "padding": "0 11px" }}>
              {t("Annulée")}
            </Link>
            <Link to="/erreurs?e=depasse" className="chip" style={{ "padding": "0 11px" }}>
              {t("Délai dépassé")}
            </Link>
            <Link to="/erreurs?e=reseau" className="chip" style={{ "padding": "0 11px" }}>
              {t("Pas de réseau")}
            </Link>
            <Link to="/erreurs?e=plafond" className="chip" style={{ "padding": "0 11px" }}>
              {t("Colis de valeur")}
            </Link>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--red-line)", "background": "var(--red-soft)" }}>
            <div className="row" style={{ "gap": "10px" }}>
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <div className="grow">
                <div className="t14 b8">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="t12 c3" style={{ "marginTop": "2px" }}>
                  {t("BLV-00008 · colis S")}
                </div>
              </div>
            </div>
            <div className="row mt14" style={{ "alignItems": "flex-start" }}>
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "14px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--card)", "color": "var(--red)" }}>
                <Icone nom="lock" taille={22} />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "19px", "lineHeight": "1.25", "letterSpacing": "-.01em", "color": "var(--red)" }}>
                  {t("Remise bloquée 24\u00A0h")}
                </div>
                <div className="t14 c2 mt6" style={{ "lineHeight": "1.45" }}>
                  {t("Trois codes faux ont été saisis. BelivaY est prévenu.")}
                </div>
              </div>
            </div>
            <div style={{ "marginTop": "14px", "padding": "2px 12px", "borderRadius": "12px", "background": "var(--card)" }}>
              <div className="row" style={{ "gap": "10px", "alignItems": "flex-start", "padding": "10px 0" }}>
                <Icone nom="hand" taille={18} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
                <span className="grow t14" style={{ "lineHeight": "1.4" }}>
                  {t("Ne remettez l’article à personne")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "alignItems": "flex-start", "padding": "10px 0", "borderTop": "1px solid var(--line)" }}>
                <Icone nom="clock" taille={18} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
                <span className="grow t14" style={{ "lineHeight": "1.4" }}>
                  {t("Débloquée demain (mercredi 14) à 14\u00A0h\u00A035")}
                </span>
              </div>
            </div>
            <div className="mt14">
              <Link to="/messages" className="btn primary">
                <Icone nom="message-circle" taille={18} />
                <span>
                  {t("Écrire au support")}
                </span>
              </Link>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Après trois codes faux, la remise se bloque 24\u00A0h pour protéger votre article. Chaque essai est enregistré avec son heure.")}
                </p>
              </div>
            </details>
          </div>
        </Ecran>
      )
    case "erreurs?e=annulee":
      return (
        <Ecran route="erreurs" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Quand la remise bloque")}
            </h1>
            <p className="pg-s">
              {t("Chaque message dit ce qui s’est passé et quoi faire.")}
            </p>
          </div>
          <div className="chips">
            <Link to="/erreurs?e=absent" className="chip" style={{ "padding": "0 11px" }}>
              {t("Livreur absent")}
            </Link>
            <Link to="/erreurs?e=bloque" className="chip" style={{ "padding": "0 11px" }}>
              {t("Remise bloquée")}
            </Link>
            <Link to="/erreurs?e=annulee" className="chip on" style={{ "padding": "0 11px" }}>
              {t("Annulée")}
            </Link>
            <Link to="/erreurs?e=depasse" className="chip" style={{ "padding": "0 11px" }}>
              {t("Délai dépassé")}
            </Link>
            <Link to="/erreurs?e=reseau" className="chip" style={{ "padding": "0 11px" }}>
              {t("Pas de réseau")}
            </Link>
            <Link to="/erreurs?e=plafond" className="chip" style={{ "padding": "0 11px" }}>
              {t("Colis de valeur")}
            </Link>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--amber-line)", "background": "var(--amber-soft)" }}>
            <div className="row" style={{ "gap": "10px" }}>
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <div className="grow">
                <div className="t14 b8">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="t12 c3" style={{ "marginTop": "2px" }}>
                  {t("BLV-00008 · colis S")}
                </div>
              </div>
            </div>
            <div className="row mt14" style={{ "alignItems": "flex-start" }}>
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "14px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--card)", "color": "var(--amber)" }}>
                <Icone nom="circle-x" taille={22} />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "19px", "lineHeight": "1.25", "letterSpacing": "-.01em", "color": "var(--amber)" }}>
                  {t("Annulée par le client")}
                </div>
                <div className="t14 c2 mt6" style={{ "lineHeight": "1.45" }}>
                  {t("Il a annulé avant le ramassage\u00A0: ne la préparez plus.")}
                </div>
              </div>
            </div>
            <div style={{ "marginTop": "14px", "padding": "2px 12px", "borderRadius": "12px", "background": "var(--card)" }}>
              <div className="row" style={{ "gap": "10px", "alignItems": "flex-start", "padding": "10px 0" }}>
                <Icone nom="boxes" taille={18} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--amber)" }} />
                <span className="grow t14" style={{ "lineHeight": "1.4" }}>
                  {t("Le stock réservé vous est rendu")}
                </span>
              </div>
              <div className="row" style={{ "gap": "10px", "alignItems": "flex-start", "padding": "10px 0", "borderTop": "1px solid var(--line)" }}>
                <Icone nom="shield-check" taille={18} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--amber)" }} />
                <span className="grow t14" style={{ "lineHeight": "1.4" }}>
                  {t("Aucun effet sur votre Trust Score")}
                </span>
              </div>
            </div>
            <div className="mt14">
              <Link to="/commandes" className="btn primary">
                <Icone nom="arrow-left" taille={18} />
                <span>
                  {t("Retour aux commandes")}
                </span>
              </Link>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Le client peut annuler tant que le livreur n’a pas pris le colis. Ce n’est pas de votre fait\u00A0: cela ne compte pas contre vous. Le Trust Score est votre note de confiance, sur 100.")}
                </p>
              </div>
            </details>
          </div>
        </Ecran>
      )
    case "erreurs?e=depasse":
      return (
        <Ecran route="erreurs" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Quand la remise bloque")}
            </h1>
            <p className="pg-s">
              {t("Chaque message dit ce qui s’est passé et quoi faire.")}
            </p>
          </div>
          <div className="chips">
            <Link to="/erreurs?e=absent" className="chip" style={{ "padding": "0 11px" }}>
              {t("Livreur absent")}
            </Link>
            <Link to="/erreurs?e=bloque" className="chip" style={{ "padding": "0 11px" }}>
              {t("Remise bloquée")}
            </Link>
            <Link to="/erreurs?e=annulee" className="chip" style={{ "padding": "0 11px" }}>
              {t("Annulée")}
            </Link>
            <Link to="/erreurs?e=depasse" className="chip on" style={{ "padding": "0 11px" }}>
              {t("Délai dépassé")}
            </Link>
            <Link to="/erreurs?e=reseau" className="chip" style={{ "padding": "0 11px" }}>
              {t("Pas de réseau")}
            </Link>
            <Link to="/erreurs?e=plafond" className="chip" style={{ "padding": "0 11px" }}>
              {t("Colis de valeur")}
            </Link>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--red-line)", "background": "var(--red-soft)" }}>
            <div className="row" style={{ "gap": "10px" }}>
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <div className="grow">
                <div className="t14 b8">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="t12 c3" style={{ "marginTop": "2px" }}>
                  {t("BLV-00008 · colis S")}
                </div>
              </div>
            </div>
            <div className="row mt14" style={{ "alignItems": "flex-start" }}>
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "14px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--card)", "color": "var(--red)" }}>
                <Icone nom="alarm-clock" taille={22} />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "19px", "lineHeight": "1.25", "letterSpacing": "-.01em", "color": "var(--red)" }}>
                  {t("Délai dépassé")}
                </div>
                <div className="t14 c2 mt6" style={{ "lineHeight": "1.45" }}>
                  {t("La commande devait être prête aujourd’hui avant 12\u00A0h\u00A042.")}
                </div>
              </div>
            </div>
            <div style={{ "marginTop": "14px", "padding": "2px 12px", "borderRadius": "12px", "background": "var(--card)" }}>
              <div className="row" style={{ "gap": "10px", "alignItems": "flex-start", "padding": "10px 0" }}>
                <Icone nom="timer" taille={18} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--red)" }} />
                <span className="grow t14" style={{ "lineHeight": "1.4" }}>
                  {t("Chaque minute de retard compte sur votre Ponctualité")}
                </span>
              </div>
            </div>
            <div className="mt14">
              <Link to="/commande_prete?ref=BLV-00008" className="btn primary">
                <Icone nom="package-check" taille={18} />
                <span>
                  {t("C’est prêt")}
                </span>
              </Link>
            </div>
            <div className="links" style={{ "marginTop": "4px" }}>
              <Link to="/rupture?ref=BLV-00008" style={{ "display": "inline-flex", "alignItems": "center", "minHeight": "44px" }}>
                {t("Plus l’article\u00A0? Signaler une rupture")}
              </Link>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("La Ponctualité est l’un des six critères de votre Trust Score, votre note de confiance sur 100. Un retard au-delà du délai compte comme une faute moyenne. Ne pas préparer du tout compte comme une faute grave, avec sanction.")}
                </p>
              </div>
            </details>
          </div>
        </Ecran>
      )
    case "erreurs?e=reseau":
      return (
        <Ecran route="erreurs" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Quand la remise bloque")}
            </h1>
            <p className="pg-s">
              {t("Chaque message dit ce qui s’est passé et quoi faire.")}
            </p>
          </div>
          <div className="chips">
            <Link to="/erreurs?e=absent" className="chip" style={{ "padding": "0 11px" }}>
              {t("Livreur absent")}
            </Link>
            <Link to="/erreurs?e=bloque" className="chip" style={{ "padding": "0 11px" }}>
              {t("Remise bloquée")}
            </Link>
            <Link to="/erreurs?e=annulee" className="chip" style={{ "padding": "0 11px" }}>
              {t("Annulée")}
            </Link>
            <Link to="/erreurs?e=depasse" className="chip" style={{ "padding": "0 11px" }}>
              {t("Délai dépassé")}
            </Link>
            <Link to="/erreurs?e=reseau" className="chip on" style={{ "padding": "0 11px" }}>
              {t("Pas de réseau")}
            </Link>
            <Link to="/erreurs?e=plafond" className="chip" style={{ "padding": "0 11px" }}>
              {t("Colis de valeur")}
            </Link>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--amber-line)", "background": "var(--amber-soft)" }}>
            <div className="row" style={{ "gap": "10px" }}>
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="8ba395f7ffc2" />
              </span>
              <div className="grow">
                <div className="t14 b8">
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="t12 c3" style={{ "marginTop": "2px" }}>
                  {t("BLV-00008 · colis S")}
                </div>
              </div>
            </div>
            <div className="row mt14" style={{ "alignItems": "flex-start" }}>
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "14px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--card)", "color": "var(--amber)" }}>
                <Icone nom="wifi-off" taille={22} />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "19px", "lineHeight": "1.25", "letterSpacing": "-.01em", "color": "var(--amber)" }}>
                  {t("Pas de réseau")}
                </div>
                <div className="t14 c2 mt6" style={{ "lineHeight": "1.45" }}>
                  {t("Le code de remise marche quand même\u00A0: donnez-le au livreur.")}
                </div>
              </div>
            </div>
            <div style={{ "marginTop": "14px", "padding": "2px 12px", "borderRadius": "12px", "background": "var(--card)" }}>
              <div className="row" style={{ "gap": "10px", "alignItems": "flex-start", "padding": "10px 0" }}>
                <Icone nom="clock" taille={18} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--amber)" }} />
                <span className="grow t14" style={{ "lineHeight": "1.4" }}>
                  {t("«\u00A0C’est prêt\u00A0» partira au retour du réseau, avec son heure d’origine (10\u00A0h\u00A005)")}
                </span>
              </div>
            </div>
            <div className="mt14">
              <Link to="/commande_prete?ref=BLV-00008&code=1" className="btn primary">
                <Icone nom="eye" taille={18} />
                <span>
                  {t("Afficher le code")}
                </span>
              </Link>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Le code est gardé dans votre téléphone. Ce que vous faites sans réseau attend avec son heure, puis part tout seul au retour du réseau, dans les 72\u00A0h.")}
                </p>
              </div>
            </details>
          </div>
        </Ecran>
      )
    case "erreurs?e=plafond":
      return (
        <Ecran route="erreurs" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Quand la remise bloque")}
            </h1>
            <p className="pg-s">
              {t("Chaque message dit ce qui s’est passé et quoi faire.")}
            </p>
          </div>
          <div className="chips">
            <Link to="/erreurs?e=absent" className="chip" style={{ "padding": "0 11px" }}>
              {t("Livreur absent")}
            </Link>
            <Link to="/erreurs?e=bloque" className="chip" style={{ "padding": "0 11px" }}>
              {t("Remise bloquée")}
            </Link>
            <Link to="/erreurs?e=annulee" className="chip" style={{ "padding": "0 11px" }}>
              {t("Annulée")}
            </Link>
            <Link to="/erreurs?e=depasse" className="chip" style={{ "padding": "0 11px" }}>
              {t("Délai dépassé")}
            </Link>
            <Link to="/erreurs?e=reseau" className="chip" style={{ "padding": "0 11px" }}>
              {t("Pas de réseau")}
            </Link>
            <Link to="/erreurs?e=plafond" className="chip on" style={{ "padding": "0 11px" }}>
              {t("Colis de valeur")}
            </Link>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--line-2)", "background": "var(--card)" }}>
            <div className="row" style={{ "gap": "10px" }}>
              <span className="thumb" style={{ "width": "40px", "height": "40px", "borderRadius": "10px" }}>
                <Dessin id="69a73d5e2bed" />
              </span>
              <div className="grow">
                <div className="t14 b8">
                  {t("iPhone 15 Pro Max")}
                </div>
                <div className="t12 c3" style={{ "marginTop": "2px" }}>
                  {t("Commande d’exemple")}
                </div>
              </div>
            </div>
            <div className="row mt14" style={{ "alignItems": "flex-start" }}>
              <span style={{ "width": "44px", "height": "44px", "borderRadius": "14px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--sand-2)", "color": "var(--ink-2)" }}>
                <Icone nom="shield-check" taille={22} />
              </span>
              <div className="grow">
                <div className="b8" style={{ "fontSize": "19px", "lineHeight": "1.25", "letterSpacing": "-.01em", "color": "var(--ink)" }}>
                  {t("Colis de valeur\u00A0: livreur Or")}
                </div>
                <div className="t14 c2 mt6" style={{ "lineHeight": "1.45" }}>
                  {t("Ce colis vaut 350\u00A0000\u00A0F\u00A0: seule une entreprise de livraison Or, assurée, peut le prendre.")}
                </div>
              </div>
            </div>
            <div style={{ "marginTop": "14px", "padding": "2px 12px", "borderRadius": "12px", "background": "var(--sand-2)" }}>
              <div className="row" style={{ "gap": "10px", "alignItems": "flex-start", "padding": "10px 0" }}>
                <Icone nom="hourglass" taille={18} style={{ "flexShrink": "0", "marginTop": "1px", "color": "var(--ink-2)" }} />
                <span className="grow t14" style={{ "lineHeight": "1.4" }}>
                  {t("Votre délai de préparation commence à l’annonce de son créneau")}
                </span>
              </div>
            </div>
            <div className="mt14">
              <Link to="/commandes?f=prep" className="btn primary">
                <Icone nom="package" taille={18} />
                <span>
                  {t("Voir les commandes à préparer")}
                </span>
              </Link>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Chaque entreprise de livraison a un plafond de valeur\u00A0: 75\u00A0000\u00A0F au niveau Nouveau, 250\u00A0000\u00A0F au niveau Confirmé. Au-delà de 250\u00A0000\u00A0F, seul le niveau Or, le plus haut et assuré sans plafond, peut prendre le colis.")}
                </p>
              </div>
            </details>
          </div>
        </Ecran>
      )
  }
}

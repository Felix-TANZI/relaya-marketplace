// Page provisoire « Sanctions et contrôle » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Sanctions() {
  const { t } = usePreferences()
  switch (useEtat("sanctions")) {
    default:
      return (
        <Ecran route="sanctions" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Sanctions et contrôle")}
            </h1>
            <p className="pg-s">
              {t("Des règles écrites d’avance. Un humain valide toute sanction lourde.")}
            </p>
          </div>
          <div className="card" style={{ "border": "1.5px solid var(--green-line)", "background": "var(--green-soft)" }}>
            <div className="row">
              <Icone nom="shield-check" taille={24} style={{ "color": "var(--green)", "flexShrink": "0" }} />
              <div className="grow">
                <div className="b8 t15 cg">
                  {t("Aucune sanction, aucun avertissement")}
                </div>
                <div className="t13 c2 mt4">
                  {t("Vous serez alerté avant chaque seuil.")}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Contrôle au ramassage")}
            </h3>
            <p className="t13 c3" style={{ "margin": "6px 0 6px", "lineHeight": "1.45" }}>
              {t("Le livreur ouvre et vérifie l’article devant vous.")}
            </p>
            <div className="kv">
              <span className="k">
                {t("Pour vous aujourd’hui")}
              </span>
              <span className="v ">
                <span className="cor">
                  {t("1\u00A0commande sur 20")}
                </span>
              </span>
            </div>
            <div className="kv">
              <span className="k">
                {t("À partir de 70 de Trust Score")}
              </span>
              <span className="v ">
                {t("1 sur 100")}
              </span>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
                <span className="grow">
                  {t("Pourquoi 1 sur 20\u00A0?")}
                </span>
                <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
              </summary>
              <div className="more-b">
                <p>
                  {t("Votre Trust Score est sous 70. Vos 5 premières commandes ont toutes été contrôlées. Si votre score chute, toutes le sont de nouveau.")}
                </p>
              </div>
            </details>
          </div>
          <div className="card">
            <h3>
              {t("Les quatre niveaux de sanction")}
            </h3>
            <div className="mt4">
              <div className="li" style={{ "minHeight": "0", "padding": "12px 0" }}>
                <span className="ic amber" style={{ "borderRadius": "50%" }}>
                  <b className="t15">
                    {t("1")}
                  </b>
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Avertissement")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Un message avec le motif et les gestes pour remonter")}
                  </span>
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "12px 0" }}>
                <span className="ic or" style={{ "borderRadius": "50%" }}>
                  <b className="t15">
                    {t("2")}
                  </b>
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Visibilité réduite")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Vos offres passent après celles des autres vendeurs")}
                  </span>
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "12px 0" }}>
                <span className="ic red" style={{ "borderRadius": "50%" }}>
                  <b className="t15">
                    {t("3")}
                  </b>
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Suspension")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Plus de nouvelles commandes\u00A0; score gelé sous 40")}
                  </span>
                </span>
              </div>
              <div className="li" style={{ "minHeight": "0", "padding": "12px 0" }}>
                <span className="ic red" style={{ "borderRadius": "50%" }}>
                  <b className="t15">
                    {t("4")}
                  </b>
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Exclusion")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Pour fraude, contrefaçon ou faux document. Appareil, pièce d’identité et Mobile Money bloqués")}
                  </span>
                </span>
              </div>
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
                  {t("Les niveaux 2 à 4 sont proposés par le système, puis validés par un humain, avec un motif écrit.")}
                </p>
                <p>
                  {t("Vous pouvez contester une fois. Après une suspension, vous revenez par une période probatoire.")}
                </p>
              </div>
            </details>
            <div className="mt12">
              <Link to="/contester" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="gavel" taille={18} />
                <span>
                  {t("Contester une décision")}
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Historique des décisions")}
            </h3>
            <div className="row mt10" style={{ "alignItems": "flex-start", "gap": "12px" }}>
              <span style={{ "width": "40px", "height": "40px", "borderRadius": "12px", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0", "background": "var(--sand-2)", "color": "var(--ink-2)" }}>
                <Icone nom="file-clock" taille={20} />
              </span>
              <div className="grow">
                <div className="b8 t14">
                  {t("Aucune décision pour l’instant.")}
                </div>
                <div className="t13 c3 mt4" style={{ "lineHeight": "1.45" }}>
                  {t("Chaque décision, votre contestation et la réponse restent ici, avec leur motif.")}
                </div>
              </div>
            </div>
          </div>
        </Ecran>
      )
  }
}

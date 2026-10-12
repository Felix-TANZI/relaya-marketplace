// Page provisoire « Compte suspendu » (VD-04) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Suspendu() {
  const { t } = usePreferences()
  switch (useEtat("suspendu")) {
    case "suspendu?pop=profil":
    default:
      return (
        <Ecran route="suspendu" parEtat>
          <div className="hero red">
            <div className="otop">
              <span className="hk" style={{ "color": "rgba(255,255,255,.85)" }}>
                {t("Compte suspendu · niveau 3")}
              </span>
              <Icone nom="shield-alert" taille={20} style={{ "color": "rgba(255,255,255,.85)" }} />
            </div>
            <div className="b8 mt8" style={{ "fontSize": "24px", "letterSpacing": "-.02em", "lineHeight": "1.2" }}>
              {t("Vos nouvelles commandes sont arrêtées")}
            </div>
            <div className="hs">
              {t("Depuis le vendredi 18 septembre à 10\u00A0h\u00A012.")}
            </div>
            <div className="hs" style={{ "marginTop": "2px" }}>
              {t("Proposée par le système, validée par un membre de l’équipe BelivaY.")}
            </div>
            <div className="hline"></div>
            <div className="t12" style={{ "color": "rgba(255,255,255,.75)", "fontWeight": "800", "letterSpacing": ".06em", "textTransform": "uppercase" }}>
              {t("Motif écrit")}
            </div>
            <div className="t14 mt6" style={{ "lineHeight": "1.5" }}>
              {t("Trois commandes non préparées en 30\u00A0jours, sans rupture signalée. Votre Trust Score (note de confiance sur 100) est gelé sous 40 pendant la suspension.")}
            </div>
            <div className="mt14">
              <Link to="/contester" className="btn white">
                <Icone nom="gavel" taille={18} />
                <span>
                  {t("Contester cette décision")}
                </span>
              </Link>
            </div>
            <div className="t13 mt10 center" style={{ "color": "rgba(255,255,255,.85)", "lineHeight": "1.45" }}>
              {t("Une seule fois · un humain vous répond par écrit sous 72\u00A0h ouvrées")}
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Ce que vous pouvez encore faire")}
            </h3>
            <div className="mt8">
              <Link to="/commandes" className="li">
                <span className="ic green">
                  <Icone nom="package-check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Préparer les commandes en cours")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("1\u00A0commande déjà reçue reste à préparer")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <Link to="/argent" className="li">
                <span className="ic green">
                  <Icone nom="wallet" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Voir votre argent")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Votre argent libéré est versé le vendredi, comme d’habitude")}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            </div>
          </div>
          <div className="card">
            <h3>
              {t("Ce qui est bloqué")}
            </h3>
            <div className="mt8">
              <div className="li">
                <span className="ic red">
                  <Icone nom="ban" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Recevoir de nouvelles commandes")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Vos offres ne sont plus proposées aux clients")}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic red">
                  <Icone nom="ban" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Publier ou modifier une offre")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("Vos fiches restent en brouillon")}
                  </span>
                </span>
              </div>
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
                {t("Pour revenir\u00A0: une période probatoire. Le livreur contrôle alors 100\u00A0% de vos commandes au ramassage.")}
              </p>
              <p>
                {t("Il y a 4 niveaux de sanction\u00A0: avertissement, visibilité réduite, suspension (niveau 3), exclusion.")}
              </p>
              <p>
                <Link to="/sanctions" className="b8 cor" style={{ "display": "inline-flex", "alignItems": "center", "gap": "2px", "minHeight": "44px" }}>
                  {t("Voir les niveaux de sanction")}
                  <Icone nom="chevron-right" taille={16} />
                </Link>
              </p>
            </div>
          </details>
          <div className="note ink">
            <Icone nom="info" taille={18} />
            <div>
              {t("Cet écran remplace l’accueil tant que la suspension dure. Il est montré ici sur un exemple\u00A0: la boutique du jeu d’essai n’est pas suspendue.")}
            </div>
          </div>
        </Ecran>
      )
  }
}

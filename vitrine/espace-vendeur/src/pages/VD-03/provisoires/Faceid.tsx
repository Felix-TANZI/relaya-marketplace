// Page provisoire « Face ID ou empreinte » (VD-03) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (4 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Faceid() {
  const { t } = usePreferences()
  switch (useEtat("faceid")) {
    default:
      return (
        <Ecran route="faceid" parEtat>
          <div className="vx-fid">
            <Icone nom="scan-face" taille={50} trait={1.6} />
          </div>
          <h1 className="pg-t" style={{ "textAlign": "center" }}>
            {t("Ouvrez votre espace en un regard")}
          </h1>
          <div className="vx-pts">
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Plus de code ni de mot de passe à chaque ouverture.")}
              </span>
            </div>
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Voir votre argent et changer de numéro de versement se confirment avec votre visage.")}
              </span>
            </div>
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Votre visage reste dans votre téléphone. BelivaY ne le voit jamais.")}
              </span>
            </div>
          </div>
          <div className="mt16">
            <Link to="/" className="btn primary">
              <Icone nom="scan-face" taille={18} />
              <span>
                {t("Activer Face ID")}
              </span>
            </Link>
          </div>
          <div className="mt8">
            <Link to="/" className="btn ghost">
              <span>
                {t("Plus tard")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Proposé une seule fois. Vous pouvez changer ce choix dans Sécurité.")}
          </p>
        </Ecran>
      )
    case "faceid?nouveau=1":
      return (
        <Ecran route="faceid" parEtat>
          <div className="vx-fid">
            <Icone nom="scan-face" taille={50} trait={1.6} />
          </div>
          <h1 className="pg-t" style={{ "textAlign": "center" }}>
            {t("Boutique ouverte\u00A0!")}
            <br />
            {t("Ouvrez votre espace en un regard")}
          </h1>
          <div className="vx-pts">
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Plus de code ni de mot de passe à chaque ouverture.")}
              </span>
            </div>
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Voir votre argent et changer de numéro de versement se confirment avec votre visage.")}
              </span>
            </div>
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Votre visage reste dans votre téléphone. BelivaY ne le voit jamais.")}
              </span>
            </div>
          </div>
          <div className="mt16">
            <Link to="/" className="btn primary">
              <Icone nom="scan-face" taille={18} />
              <span>
                {t("Activer Face ID")}
              </span>
            </Link>
          </div>
          <div className="mt8">
            <Link to="/" className="btn ghost">
              <span>
                {t("Plus tard")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Proposé une seule fois. Vous pouvez changer ce choix dans Sécurité.")}
          </p>
        </Ecran>
      )
    case "faceid?nouveau=1&os=android":
      return (
        <Ecran route="faceid" parEtat>
          <div className="vx-fid">
            <Icone nom="fingerprint" taille={50} trait={1.6} />
          </div>
          <h1 className="pg-t" style={{ "textAlign": "center" }}>
            {t("Boutique ouverte\u00A0!")}
            <br />
            {t("Ouvrez votre espace avec votre empreinte")}
          </h1>
          <div className="vx-pts">
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Plus de code ni de mot de passe à chaque ouverture.")}
              </span>
            </div>
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Voir votre argent et changer de numéro de versement se confirment avec votre doigt.")}
              </span>
            </div>
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Votre empreinte reste dans votre téléphone. BelivaY ne la voit jamais.")}
              </span>
            </div>
          </div>
          <div className="mt16">
            <Link to="/" className="btn primary">
              <Icone nom="fingerprint" taille={18} />
              <span>
                {t("Activer l’empreinte")}
              </span>
            </Link>
          </div>
          <div className="mt8">
            <Link to="/" className="btn ghost">
              <span>
                {t("Plus tard")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Proposé une seule fois. Vous pouvez changer ce choix dans Sécurité.")}
          </p>
        </Ecran>
      )
    case "faceid?next=%23kyc&nouveau=1":
      return (
        <Ecran route="faceid" parEtat>
          <div className="vx-fid">
            <Icone nom="scan-face" taille={50} trait={1.6} />
          </div>
          <h1 className="pg-t" style={{ "textAlign": "center" }}>
            {t("Boutique ouverte\u00A0!")}
            <br />
            {t("Ouvrez votre espace en un regard")}
          </h1>
          <div className="vx-pts">
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Plus de code ni de mot de passe à chaque ouverture.")}
              </span>
            </div>
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Voir votre argent et changer de numéro de versement se confirment avec votre visage.")}
              </span>
            </div>
            <div>
              <Icone nom="circle-check" taille={20} />
              <span>
                {t("Votre visage reste dans votre téléphone. BelivaY ne le voit jamais.")}
              </span>
            </div>
          </div>
          <div className="mt16">
            <Link to="/kyc" className="btn primary">
              <Icone nom="scan-face" taille={18} />
              <span>
                {t("Activer Face ID")}
              </span>
            </Link>
          </div>
          <div className="mt8">
            <Link to="/kyc" className="btn ghost">
              <span>
                {t("Plus tard")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Proposé une seule fois. Vous pouvez changer ce choix dans Sécurité.")}
          </p>
        </Ecran>
      )
  }
}

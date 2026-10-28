// Écran « Bienvenue » (CL-03) : généré par outils/ecran.mjs, puis repris à la main (choix de langue actif) depuis le prototype du 1er octobre, un rendu par
// état (1 adresses). En-tête, barre du bas et marges suivent l'état (Ecran parEtat).
// Les données sont encore écrites dans le rendu (démonstration) ; elles passeront par la source, sous la
// garde des tests au pixel (tests/identique.spec.ts).
import { Link } from 'react-router-dom'
import img_6f8c520ff470_jpg from '../../assets/prototype/6f8c520ff470.jpg'
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { useEtat } from '../../config/etats'
import { chemin } from '../../config/pages'
import { F } from '../../i18n/format'
import { useDes } from '../../composants/ecran'
import { usePreferences } from '../../preferences'
import { GRILLE_GARDE } from '../CL-09/Commun'
import { Partage } from './Arrivee'

// Comment ça marche, en 3 temps (sous l'en-tête, ajouté pour le nouveau client).
const ETAPES: [string, string][] = [
  ['shopping-bag', '1. Tu commandes et tu paies en Mobile Money ou par carte. Ton argent reste bloqué.'],
  ['store', '2. Tes colis arrivent au relais de ton quartier. On t’envoie ton code de retrait à 6 chiffres.'],
  ['package-check', '3. Tu montres ton code au gérant, tu ouvres tes colis devant lui. Tout va bien : le vendeur est payé.'],
]

export function Bienvenue() {
  const { t, tf, langue, setLangue } = usePreferences()
  // Dès 1200 px, le choix de langue passe sous l'illustration, à gauche (§ 5.15) : déplacé, jamais dupliqué.
  const partage = useDes('pc')
  const choixLangue = (
    <>
      <div className="cl03-langl">
        <Icone nom="languages" taille={15} />
        <span>
          {t("Langue")}
        </span>
      </div>
      <div className="seg cl03-lang" role="radiogroup">
        <a href="#" role="radio" aria-checked={langue === 'fr'} onClick={(e) => (e.preventDefault(), setLangue('fr'))} className={langue === 'fr' ? 'on' : ''}>
          {t("Français")}
        </a>
        <a href="#" role="radio" aria-checked={langue === 'en'} onClick={(e) => (e.preventDefault(), setLangue('en'))} className={langue === 'en' ? 'on' : ''}>
          {t("English")}
        </a>
      </div>
    </>
  )
  switch (useEtat("bienvenue")) {
    case "bienvenue":
    default:
      return (
        <Ecran route="bienvenue" parEtat gabarit="arrivee">
        <Styles id="f16ded0d4c" />
        <Partage
          visuel={
            <>
              <Styles id="0b0ccec1e3" />
              <Styles id="1c3d953197" />
              <section className="cx-hero ph tall" style={{ "backgroundImage": `url(${img_6f8c520ff470_jpg})`, "backgroundPosition": "center 30%" }} role="img" aria-label="Retrait au relais">
                <span className="lg">
                  <img src={img_be926f70d2b8_png} alt="" />
                </span>
                <span className="tx">
                  <b>
                    {t("Tout près de toi")}
                  </b>
                  <span>
                    {t("Commande en ligne, retire ton colis au relais de ton quartier, en main propre.")}
                  </span>
                </span>
              </section>
            </>
          }
          sousVisuel={<div className="card cl03-lang-pc">{choixLangue}</div>}
        >
          <div className="cl03-brand">
            <img className="cl03-logo" src={img_be926f70d2b8_png} alt="BelivaY" />
            <h1 className="cl03-tag">
              {t("Tout près de toi")}
            </h1>
          </div>
          <div className="cl03-promise">
            <div className="ps">
              <Icone nom="shield-check" taille={26} />
            </div>
            <p className="pt">
              {t("Ton argent est bloqué jusqu’à ce que tu aies le colis en main.")}
            </p>
            <p className="pl">
              {t("Le vendeur est payé seulement après ta confirmation. Rien n’arrive\u00A0? On te rembourse.")}
            </p>
          </div>
          <div className="cl03-marks">
            <div className="cl03-mark">
              <b>
                {t("Moins de 5\u00A0h")}
              </b>
              <span>
                {t("Livraison dans ta zone")}
              </span>
            </div>
            <div className="cl03-mark">
              <b>
                {t("Retour gratuit")}
              </b>
              <span>
                {t("si problème validé")}
              </span>
            </div>
            <div className="cl03-mark">
              <b>
                {t("MoMo")}
              </b>
              <span>
                {t("MTN, Orange")}
              </span>
            </div>
          </div>
          <div className="sec">
            <h2>{t("Comment ça marche, en 3 temps")}</h2>
          </div>
          <div className="card">
            {ETAPES.map(([ic, x]) => (
              <div key={x} className="cl03-ch">
                <Icone nom={ic} taille={18} />
                <span>{t(x)}</span>
              </div>
            ))}
          </div>
          <div className="hint-l">
            <Icone nom="clock" taille={15} style={{ flexShrink: "0", marginTop: "1px" }} />
            <span>
              {tf("Au relais, le jour d’arrivée est gratuit ; ensuite, la garde coûte de {min} F à {max} F par jour.", { min: F(Math.min(...GRILLE_GARDE.filter((g) => g > 0))), max: F(Math.max(...GRILLE_GARDE)) })}{" "}
              <Link to={chemin("legal-doc", { d: "garde" })}>{t("La politique de garde")}</Link>
            </span>
          </div>
          <div className="hint-l">
            <Icone nom="life-buoy" taille={15} style={{ flexShrink: "0", marginTop: "1px" }} />
            <span>
              {t("Une question avant de commencer ? ")}
              <Link to={chemin("faq", { t: "compte" })}>{t("Questions fréquentes")}</Link>
              {t(" · ")}
              <Link to={chemin("aide")}>{t("Aide et contact")}</Link>
            </span>
          </div>
          {!partage && choixLangue}
          <Link to={chemin('inscription-diaspora')} className="card row cl03-dia" style={{ marginTop: '14px', color: 'inherit' }}>
            <span className="cl03-dia-ic" aria-hidden="true">
              <Icone nom="globe" taille={17} />
            </span>
            <span className="grow">
              <b>{t('Tu vis à l’étranger ?')}</b>
              <small>{t('Compte diaspora : paie et fais livrer tes proches.')}</small>
            </span>
            <Icone nom="chevron-right" taille={20} />
          </Link>
          <div className="mt16">
            <Link to="/interets" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Continuer")}
              </span>
            </Link>
          </div>
          <div className="row" style={{ "gap": "10px", "marginTop": "10px" }}>
            <div className="grow">
              <div className="steps" style={{ "marginTop": "0" }}>
                <i className="cur"></i>
                <i className=""></i>
                <i className=""></i>
              </div>
            </div>
            <span className="t12 b8 c3 nw">
              {t("1 / 3")}
            </span>
          </div>
          <p className="cl03-legal" style={{ "marginTop": "8px" }}>
            {t("Déjà un compte\u00A0? ")}
            <Link to="/connexion" className="cl03-link">
              {t("Se connecter")}
            </Link>
          </p>
        </Partage>
        </Ecran>
      )
  }
}

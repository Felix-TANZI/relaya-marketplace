// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (TrustScore · Trust Score) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-09/TrustScore.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Trust Score (prototype : TrustScore) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-yi6rkz">
          <div className="p-py0ju2">
            <svg width="240" height="136" viewBox="0 0 200 116" aria-label={t("Trust Score 72 sur 100")}>
              <defs>
                <linearGradient id="TrustScore-tg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" className="p-mq57g1" />
                  <stop offset="1" className="p-sgynbu" />
                </linearGradient>
              </defs>
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" strokeWidth="16" strokeLinecap="round" className="p-4qrgzo" />
              <path d="M20 100 A80 80 0 0 1 151.0 38.4" fill="none" stroke="url(#TrustScore-tg)" strokeWidth="16" strokeLinecap="round" />
              <text x="100" y="92" textAnchor="middle" fontSize="40" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif" className="p-6nec68">
                {"72"}
              </text>
              <text x="100" y="112" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" className="p-7jr3u4">
                {t("sur 100")}
              </text>
            </svg>
            <div className="p-8fv312">
              <span className="p-rpzy79">
                {t("Starter")}
              </span>
              <span className="p-nax3x4">
                {t("+2 cette semaine")}
              </span>
            </div>
            <div className="p-dwg6gl">
              {t("Visible par les clients quand ils choisissent leur relais.")}
              <br />
              {t("Au-dessus de 70 depuis")}
              {' '}
              <strong>
                {t("9 jours sur 14")}
              </strong>
              {' '}
              {t(": Confirmé lundi 28.")}
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Les 5 critères")}
            </h2>
          </div>
          <div className="p-jrtuf6">
            <div>
              <div className="p-h6lji0">
                <span className="p-dfc4i3">
                  {t("Ponctualité")}
                </span>
                <span className="p-46lk2m">
                  {t("poids 25 %")}
                </span>
              </div>
              <div className="p-gxltj5">
                <div className="p-47w5eb">
                  <div className="p-7p6eal" />
                </div>
              </div>
            </div>
            <div className="p-pjprtz">
              {"78"}
            </div>
          </div>
          <div className="p-jrtuf6">
            <div>
              <div className="p-h6lji0">
                <span className="p-dfc4i3">
                  {t("Sécurité du stockage")}
                </span>
                <span className="p-46lk2m">
                  {t("poids 25 %")}
                </span>
              </div>
              <div className="p-gxltj5">
                <div className="p-47w5eb">
                  <div className="p-endjdd" />
                </div>
              </div>
            </div>
            <div className="p-pjprtz">
              {"74"}
            </div>
          </div>
          <div className="p-jrtuf6">
            <div>
              <div className="p-h6lji0">
                <span className="p-dfc4i3">
                  {t("Satisfaction")}
                </span>
                <span className="p-46lk2m">
                  {t("poids 20 %")}
                </span>
              </div>
              <div className="p-gxltj5">
                <div className="p-47w5eb">
                  <div className="p-o24hmt" />
                </div>
              </div>
            </div>
            <div className="p-pjprtz">
              {"70"}
            </div>
          </div>
          <div className="p-jrtuf6">
            <div>
              <div className="p-h6lji0">
                <span className="p-dfc4i3">
                  {t("Litiges")}
                </span>
                <span className="p-46lk2m">
                  {t("poids 15 %")}
                </span>
              </div>
              <div className="p-gxltj5">
                <div className="p-47w5eb">
                  <div className="p-hnxu53" />
                </div>
              </div>
            </div>
            <div className="p-pjprtz">
              {"72"}
            </div>
          </div>
          <div className="p-jrtuf6">
            <div>
              <div className="p-h6lji0">
                <span className="p-dfc4i3">
                  {t("Ancienneté")}
                </span>
                <span className="p-46lk2m">
                  {t("poids 15 %")}
                </span>
              </div>
              <div className="p-gxltj5">
                <div className="p-47w5eb">
                  <div className="p-7efg52" />
                </div>
              </div>
            </div>
            <div className="p-pjprtz">
              {"60"}
            </div>
          </div>
          <div className="p-81u2s6">
            {t("Ponctualité : colis reçus à l’heure et remis sans attente. Sécurité : scellés contrôlés, photos de remise, aucun colis perdu. Ancienneté : monte avec le temps sans incident.")}
          </div>
          <div className="p-81u2s6">
            {t("Recalcul chaque nuit, baisse de 8 points au plus par recalcul, score gelé après 30 jours sans activité. Un dossier en cours ne vous pénalise jamais. Chaque calcul et chaque décision restent dans un journal consultable.")}
          </div>
        </div>
        <div className="p-zmtdxo">
          <div className="p-vdxjav">
            <Icone nom="r-appareil-photo" taille={20} className="p-672m16" />
            <div className="p-zwf4r4">
              {t("Photo à chaque remise")}
            </div>
          </div>
          <div className="p-vdxjav">
            <Icone nom="r-horloge" taille={20} className="p-672m16" />
            <div className="p-zwf4r4">
              {t("Horaires tenus")}
            </div>
          </div>
          <div className="p-vdxjav">
            <Icone nom="r-message" taille={20} className="p-672m16" />
            <div className="p-zwf4r4">
              {t("Répondre vite à BelivaY")}
            </div>
          </div>
        </div>
        <div className="p-ga7sqw">
          <Icone nom="r-alerte" taille={18} className="p-woejqv" />
          <div>
            {t("Un colis perdu ou ouvert au relais ouvre une enquête. Une sanction n’est jamais automatique : proposée par le système, elle est validée par une personne, avec un motif écrit, et vous pouvez la contester une fois.")}
          </div>
        </div>
        <div className="p-0cipe3">
          <Link to={chemin("avis")} className="p-rbzobc">
            <Icone nom="r-etoile" taille={18} className="p-emic6i" />
            {t("Avis clients")}
          </Link>
          <Link to={chemin("paliers")} className="p-rbzobc">
            <Icone nom="r-couches" taille={18} className="p-emic6i" />
            {t("Paliers")}
          </Link>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-bouclier" taille={18} className="p-672m16" />
          <div>
            {t("Pas de plafond de valeur par colis pour les relais : la protection vient des preuves photo, du PIN de remise et, dès 100 000 F, du porteur nommé par le client avec pièce vérifiée.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Trust Score", Rendu: EtatDefaut },
]

export default function TrustScoreProvisoire() {
  return <PageProvisoire route="trust" etats={ETATS} />
}

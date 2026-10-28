// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Paliers · Paliers) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-09/Paliers.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { usePreferences } from '../../../preferences'

/** Paliers (prototype : Paliers) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Paliers")}
          </h1>
          <div className="p-t2u0o2">
            {t("Votre palier suit votre Trust Score, tenu dans la durée.")}
          </div>
        </div>
        <div className="p-26n637">
          <div className="p-ulwoc3">
            <div className="p-p0w3jt" />
            <div className="p-own2ns" />
            <div className="p-4ijpis">
              <span className="p-30m9tj">
                {"●"}
              </span>
              <span className="p-j3kuze">
                {t("Starter")}
              </span>
            </div>
            <div className="p-iuudl9">
              <span className="p-zkkpre">
                {"70"}
              </span>
              <span className="p-6kvdjj">
                {t("Confirmé")}
              </span>
            </div>
            <div className="p-rcnre7">
              <span className="p-to7bp5">
                {"85"}
              </span>
              <span className="p-s3255x">
                {t("Premium")}
              </span>
            </div>
          </div>
          <div className="p-yz5dyd">
            {t("72 aujourd’hui · encore 5 jours au-dessus de 70 pour passer Confirmé.")}
          </div>
        </div>
        <div className="p-9f8cs4">
          <div className="p-9rmh6y">
            <div className="p-a81pfk">
              {t("Starter")}
            </div>
            <span className="p-rpzy79">
              {t("Votre palier")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-l3w6sx" />
            <span>
              {t("Colis petits, moyens et encombrants (sauf si vous refusez les encombrants)")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-l3w6sx" />
            <span>
              {t("Versement chaque vendredi, sans frais")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-l3w6sx" />
            <span>
              {t("Accompagnement renforcé du support les 30 premiers jours")}
            </span>
          </div>
        </div>
        <div className="p-9f8cs4">
          <div className="p-9rmh6y">
            <div className="p-a81pfk">
              {t("Confirmé")}
            </div>
            <span className="p-6z26dm">
              {t("≥ 70 tenu 14 jours")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-l3w6sx" />
            <span>
              {t("Badge « Confirmé » visible au choix du relais")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-l3w6sx" />
            <span>
              {t("Proposé en premier aux clients de votre zone")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-l3w6sx" />
            <span>
              {t("Hausse de capacité jusqu’à +20 % validée à distance, sans attendre une visite")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-l3w6sx" />
            <span>
              {t("Colis de plus de 100 000 F orientés en priorité vers vous")}
            </span>
          </div>
        </div>
        <div className="p-b3ppq5">
          <div className="p-9rmh6y">
            <div className="p-a81pfk">
              {t("Premium")}
            </div>
            <span className="p-6z26dm">
              {t("≥ 85 tenu 14 jours")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-ejah56" />
            <span>
              {t("Tous les avantages Confirmé")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-ejah56" />
            <span>
              {t("+25 F par colis remis (bonus qualité)")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-ejah56" />
            <span>
              {t("Étagères BelivaY offertes pour agrandir")}
            </span>
          </div>
          <div className="p-gp5yk6">
            <Icone nom="check" taille={16} className="p-ejah56" />
            <span>
              {t("Relais ambassadeur : prime pour chaque nouveau relais recruté et ouvert")}
            </span>
          </div>
        </div>
        <div className="p-p73eax">
          <Icone nom="r-couches" taille={18} className="p-rd23br" />
          <div>
            {t("Un palier ne se perd qu’après 14 jours sous le seuil, avec 5 points de marge, et la descente est validée par une personne. Vous êtes alerté 3 points avant chaque seuil.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Paliers", Rendu: EtatDefaut },
]

export default function PaliersProvisoire() {
  return <PageProvisoire route="paliers" etats={ETATS} />
}

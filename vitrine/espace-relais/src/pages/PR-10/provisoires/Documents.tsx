// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Documents · Documents) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-10/Documents.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { usePreferences } from '../../../preferences'

/** Documents (prototype : Documents) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-aygyk8">
          <div className="p-rou2l0">
            <Icone nom="r-bouclier" taille={24} className="p-7dsggt" />
          </div>
          <div>
            <div className="p-mhwr8x">
              {t("Dossier complet")}
            </div>
            <div className="p-zxu25x">
              {t("Vérifié le 14 juillet 2026 · vous pouvez recevoir et être payé")}
            </div>
          </div>
        </div>
        <div className="p-0cipe3">
          <div className="p-5x70tq">
            <div className="p-yq5y59">
              <div className="p-0pfxfk">
                <Icone nom="r-personne" taille={20} className="p-gqd75s" />
              </div>
              <span className="p-nax3x4">
                {t("Vérifiée")}
              </span>
            </div>
            <div className="p-4mbhbo">
              {t("Pièce d’identité")}
            </div>
            <div className="p-iiqgjs">
              {t("CNI du gérant · expire en mars 2031")}
            </div>
            <button type="button" className="p-wn9elb">
              {t("Voir")}
            </button>
          </div>
          <div className="p-5x70tq">
            <div className="p-yq5y59">
              <div className="p-liel66">
                <Icone nom="r-boutique" taille={20} className="p-672m16" />
              </div>
              <span className="p-nax3x4">
                {t("Vérifiée")}
              </span>
            </div>
            <div className="p-4mbhbo">
              {t("Preuve d’activité")}
            </div>
            <div className="p-iiqgjs">
              {t("Attestation de commerce")}
            </div>
            <button type="button" className="p-wn9elb">
              {t("Voir")}
            </button>
          </div>
          <div className="p-5x70tq">
            <div className="p-yq5y59">
              <div className="p-liel66">
                <Icone nom="r-telephone" taille={20} className="p-672m16" />
              </div>
              <span className="p-nax3x4">
                {t("Vérifié")}
              </span>
            </div>
            <div className="p-4mbhbo">
              {t("Numéro de versement")}
            </div>
            <div className="p-iiqgjs">
              {t("MTN ···· 8 350 · confirmé par code")}
            </div>
            <button type="button" className="p-wn9elb">
              {t("Changer")}
            </button>
          </div>
          <div className="p-5x70tq">
            <div className="p-yq5y59">
              <div className="p-liel66">
                <Icone nom="r-appareil-photo" taille={20} className="p-672m16" />
              </div>
              <span className="p-nax3x4">
                {t("Vérifiées")}
              </span>
            </div>
            <div className="p-4mbhbo">
              {t("Photos du relais")}
            </div>
            <div className="p-iiqgjs">
              {t("Votre portrait et la façade (vus par les clients), rangement")}
            </div>
            <button type="button" className="p-wn9elb">
              {t("Mettre à jour")}
            </button>
          </div>
          <div className="p-5x70tq">
            <div className="p-yq5y59">
              <div className="p-liel66">
                <Icone nom="r-lieu" taille={20} className="p-672m16" />
              </div>
              <span className="p-nax3x4">
                {t("Validée")}
              </span>
            </div>
            <div className="p-4mbhbo">
              {t("Visite BelivaY")}
            </div>
            <div className="p-iiqgjs">
              {t("Contrôle sur place du 14 juillet")}
            </div>
          </div>
          <div className="p-5x70tq">
            <div className="p-yq5y59">
              <div className="p-liel66">
                <Icone nom="r-document" taille={20} className="p-672m16" />
              </div>
              <span className="p-6z26dm">
                {t("Facultatif")}
              </span>
            </div>
            <div className="p-4mbhbo">
              {t("NIU / patente")}
            </div>
            <div className="p-iiqgjs">
              {t("À ajouter si vous en avez un")}
            </div>
            <button type="button" className="p-wn9elb">
              {t("Ajouter")}
            </button>
          </div>
        </div>
        <div className="p-16950n">
          {t("Une pièce qui expire vous est signalée 30 jours avant. Vos pièces ne sont jamais montrées : les clients voient seulement votre prénom, votre portrait et la façade. Preuves gardées 180 jours : consultez, corrigez, exportez vos données.")}
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Documents", Rendu: EtatDefaut },
]

export default function DocumentsProvisoire() {
  return <PageProvisoire route="documents" etats={ETATS} />
}

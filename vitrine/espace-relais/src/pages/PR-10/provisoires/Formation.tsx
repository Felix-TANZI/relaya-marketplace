// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Formation · Formation) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-10/Formation.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { usePreferences } from '../../../preferences'

/** Formation (prototype : Formation) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-4o1bpr">
          <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true" className="p-bo3n4y">
            <circle cx="46" cy="46" r="38" fill="none" strokeWidth="9" className="p-1gianx" />
            <circle cx="46" cy="46" r="38" fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray="199 239" transform="rotate(-90 46 46)" className="p-vs02iw" />
            <text x="46" y="52" textAnchor="middle" fontSize="20" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif" className="p-rhdq61">
              {"5/6"}
            </text>
          </svg>
          <div>
            <div className="p-6pd2ig">
              {t("OBLIGATOIRES TERMINÉS")}
            </div>
            <div className="p-vhnszu">
              {t("Relais formé")}
            </div>
            <div className="p-kjpa7y">
              {t("Depuis le 14 juillet · 1 module facultatif")}
            </div>
          </div>
        </div>
        <div className="p-0cipe3">
          <div className="p-vdxjav">
            <div className="p-jj5tcs">
              <Icone nom="r-colis" taille={28} className="p-v08d0o" />
            </div>
            <div className="p-g52657">
              {t("MODULE 1 · 12 MIN")}
            </div>
            <div className="p-2z3538">
              {t("Réception et scellés")}
            </div>
            <span className="p-nax3x4">
              {t("Terminé")}
            </span>
          </div>
          <div className="p-vdxjav">
            <div className="p-jj5tcs">
              <Icone nom="r-cle" taille={28} className="p-v08d0o" />
            </div>
            <div className="p-g52657">
              {t("MODULE 2 · 10 MIN")}
            </div>
            <div className="p-2z3538">
              {t("Retrait, codes et tiers")}
            </div>
            <span className="p-nax3x4">
              {t("Terminé")}
            </span>
          </div>
          <div className="p-vdxjav">
            <div className="p-jj5tcs">
              <Icone nom="r-telephone" taille={28} className="p-v08d0o" />
            </div>
            <div className="p-g52657">
              {t("MODULE 3 · 8 MIN")}
            </div>
            <div className="p-2z3538">
              {t("Paiement au comptoir")}
            </div>
            <span className="p-nax3x4">
              {t("Terminé")}
            </span>
          </div>
          <div className="p-vdxjav">
            <div className="p-jj5tcs">
              <Icone nom="r-balance" taille={28} className="p-v08d0o" />
            </div>
            <div className="p-g52657">
              {t("MODULE 4 · 10 MIN")}
            </div>
            <div className="p-2z3538">
              {t("Constat de litige")}
            </div>
            <span className="p-nax3x4">
              {t("Terminé")}
            </span>
          </div>
          <div className="p-vdxjav">
            <div className="p-jj5tcs">
              <Icone nom="r-annuler" taille={28} className="p-v08d0o" />
            </div>
            <div className="p-g52657">
              {t("MODULE 5 · 6 MIN")}
            </div>
            <div className="p-2z3538">
              {t("Dépôt des retours")}
            </div>
            <span className="p-nax3x4">
              {t("Terminé")}
            </span>
          </div>
          <div className="p-vdxjav">
            <div className="p-ba19n3">
              <Icone nom="r-globe" taille={28} className="p-gqbtfa" />
            </div>
            <div className="p-g52657">
              {t("MODULE 6 · 15 MIN · FACULTATIF")}
            </div>
            <div className="p-2z3538">
              {t("Servir en anglais et en pidgin")}
            </div>
            <button type="button" className="p-ncx7qc">
              <Icone nom="r-oeil" taille={18} className="p-7dsggt" />
              {t("Commencer")}
            </button>
          </div>
        </div>
        <div className="p-p73eax">
          <Icone nom="r-formation" taille={18} className="p-rd23br" />
          <div>
            {t("Formation initiale de 2 h : les 5 modules sur téléphone (≈ 46 min) + une séance pratique d’1 h au comptoir lors de la visite BelivaY. Un module compte comme fait seulement s’il est suivi jusqu’au bout, quiz compris.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Formation", Rendu: EtatDefaut },
]

export default function FormationProvisoire() {
  return <PageProvisoire route="formation" etats={ETATS} />
}

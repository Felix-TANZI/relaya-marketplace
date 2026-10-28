// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Messagerie · Messagerie) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-08/Messagerie.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import marque from '../../../assets/marque-belivay.png'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { usePreferences } from '../../../preferences'
import { ENTREPRISE } from '../../../demo/jeu-essai'

/** Messagerie (prototype : Messagerie · {"cv":"lt"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-ax5aok">
          <button type="button" className="p-cbru27">
            <div className="p-04bprg">
              <img src={marque} alt="" className="p-1kg7e8" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-dfc4i3">
                {t("Support BelivaY")}
              </div>
              <div className="p-ljn4n5">
                {t("On regarde votre question sur le lot M-4119.")}
              </div>
            </div>
            <span className="p-rpzy79">
              {"1"}
            </span>
          </button>
          <button type="button" className="p-zfoaot">
            <div className="p-l1wrlu">
              {t("LT")}
            </div>
            <div className="p-rnqj8n">
              <div className="p-dfc4i3">
                {t("Dossier LT-0912")}
              </div>
              <div className="p-ljn4n5">
                {t("Pouvez-vous ajouter une photo de l’étiquette ?")}
              </div>
            </div>
            <span className="p-rpzy79">
              {"1"}
            </span>
          </button>
          <button type="button" className="p-cbru27">
            <div className="p-unri0n">
              <Icone nom="r-camion" taille={20} className="p-v08d0o" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-dfc4i3">
                {t("Collectes et livraisons")}
              </div>
              <div className="p-ljn4n5">
                {t("Collecte de 14 h confirmée : 3 colis.")}
              </div>
            </div>
            <span className="p-46lk2m">
              {"07:40"}
            </span>
          </button>
        </div>
        <div className="p-5whd7g">
          <div className="p-rj1mot">
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Dossier LT-0912")}
              </div>
              <div className="p-46lk2m">
                {t("Non conforme · BLV-40077")}
              </div>
            </div>
            <span className="p-h4wlx0">
              {t("En examen")}
            </span>
          </div>
          <div className="p-smehhy">
            <div className="p-g4xk7z">
              {t("Merci pour le constat. Pouvez-vous ajouter une photo de l’étiquette du colis ?")}
              <div className="p-qi3pmp">
                {t("BelivaY · 08:12")}
              </div>
            </div>
            <div className="p-7nzqjl">
              {t("Oui, je la prends tout de suite.")}
              <div className="p-ej335m">
                {t("Vous · 08:20 · lu")}
              </div>
            </div>
            <div className="p-mh860e">
              <Icone nom="r-appareil-photo" taille={18} className="p-v08d0o" />
              {t("Photo envoyée")}
            </div>
          </div>
          <div className="p-3os40o">
            <span className="p-rpzy79">
              {t("Photo ajoutée")}
            </span>
            <span className="p-rpzy79">
              {t("Le colis est rangé")}
            </span>
            <span className="p-rpzy79">
              {t("Rappelez-moi")}
            </span>
          </div>
          <div className="p-084o8i">
            <button type="button" aria-label={t("Joindre une photo")} className="p-id803n">
              <Icone nom="r-appareil-photo" taille={19} className="p-emic6i" />
            </button>
            <input type="text" placeholder={t("Votre message")} className="p-nmhanx" />
            <button type="button" aria-label={t("Envoyer")} className="p-0iud18">
              <Icone nom="r-envoyer" taille={18} className="p-gqbtfa" />
            </button>
          </div>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-cadenas" taille={18} className="p-672m16" />
          <div>
            {t("Vous échangez uniquement avec BelivaY, jamais directement avec un client, un vendeur ou un livreur. Les messages servent de preuve.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Fil du support (prototype : Messagerie · {"cv":"sup"}) — ?etat=sup */
export function EtatSup() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-ax5aok">
          <button type="button" className="p-zfoaot">
            <div className="p-04bprg">
              <img src={marque} alt="" className="p-1kg7e8" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-dfc4i3">
                {t("Support BelivaY")}
              </div>
              <div className="p-ljn4n5">
                {t("On regarde votre question sur le lot M-4119.")}
              </div>
            </div>
            <span className="p-rpzy79">
              {"1"}
            </span>
          </button>
          <button type="button" className="p-cbru27">
            <div className="p-l1wrlu">
              {t("LT")}
            </div>
            <div className="p-rnqj8n">
              <div className="p-dfc4i3">
                {t("Dossier LT-0912")}
              </div>
              <div className="p-ljn4n5">
                {t("Pouvez-vous ajouter une photo de l’étiquette ?")}
              </div>
            </div>
            <span className="p-rpzy79">
              {"1"}
            </span>
          </button>
          <button type="button" className="p-cbru27">
            <div className="p-unri0n">
              <Icone nom="r-camion" taille={20} className="p-v08d0o" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-dfc4i3">
                {t("Collectes et livraisons")}
              </div>
              <div className="p-ljn4n5">
                {t("Collecte de 14 h confirmée : 3 colis.")}
              </div>
            </div>
            <span className="p-46lk2m">
              {"07:40"}
            </span>
          </button>
        </div>
        <div className="p-5whd7g">
          <div className="p-rj1mot">
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Support BelivaY")}
              </div>
              <div className="p-46lk2m">
                {t("Réponse moyenne : 12 min")}
              </div>
            </div>
            <span className="p-rpzy79">
              {t("Ouvert")}
            </span>
          </div>
          <div className="p-smehhy">
            <div className="p-7nzqjl">
              {t("Le lot M-4119 comptait 5 colis mais l’app en annonçait 6. J’ai signalé l’écart.")}
              <div className="p-ej335m">
                {t("Vous · 08:40")}
              </div>
            </div>
            <div className="p-g4xk7z">
              {tf("Bien reçu, on regarde avec {e}. Vous n’avez rien à faire : l’écart est à la charge du livreur.", { e: ENTREPRISE })}
              <div className="p-qi3pmp">
                {t("Support · 08:52")}
              </div>
            </div>
          </div>
          <div className="p-3os40o">
            <span className="p-rpzy79">
              {t("Merci")}
            </span>
            <span className="p-rpzy79">
              {t("J’ai une autre question")}
            </span>
          </div>
          <div className="p-084o8i">
            <button type="button" aria-label={t("Joindre une photo")} className="p-id803n">
              <Icone nom="r-appareil-photo" taille={19} className="p-emic6i" />
            </button>
            <input type="text" placeholder={t("Votre message")} className="p-nmhanx" />
            <button type="button" aria-label={t("Envoyer")} className="p-0iud18">
              <Icone nom="r-envoyer" taille={18} className="p-gqbtfa" />
            </button>
          </div>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-cadenas" taille={18} className="p-672m16" />
          <div>
            {t("Vous échangez uniquement avec BelivaY, jamais directement avec un client, un vendeur ou un livreur. Les messages servent de preuve.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Fil collectes et livraisons (prototype : Messagerie · {"cv":"log"}) — ?etat=log */
export function EtatLog() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-ax5aok">
          <button type="button" className="p-cbru27">
            <div className="p-04bprg">
              <img src={marque} alt="" className="p-1kg7e8" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-dfc4i3">
                {t("Support BelivaY")}
              </div>
              <div className="p-ljn4n5">
                {t("On regarde votre question sur le lot M-4119.")}
              </div>
            </div>
            <span className="p-rpzy79">
              {"1"}
            </span>
          </button>
          <button type="button" className="p-cbru27">
            <div className="p-l1wrlu">
              {t("LT")}
            </div>
            <div className="p-rnqj8n">
              <div className="p-dfc4i3">
                {t("Dossier LT-0912")}
              </div>
              <div className="p-ljn4n5">
                {t("Pouvez-vous ajouter une photo de l’étiquette ?")}
              </div>
            </div>
            <span className="p-rpzy79">
              {"1"}
            </span>
          </button>
          <button type="button" className="p-zfoaot">
            <div className="p-unri0n">
              <Icone nom="r-camion" taille={20} className="p-v08d0o" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-dfc4i3">
                {t("Collectes et livraisons")}
              </div>
              <div className="p-ljn4n5">
                {t("Collecte de 14 h confirmée : 3 colis.")}
              </div>
            </div>
            <span className="p-46lk2m">
              {"07:40"}
            </span>
          </button>
        </div>
        <div className="p-5whd7g">
          <div className="p-rj1mot">
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Collectes et livraisons")}
              </div>
              <div className="p-46lk2m">
                {t("Messages automatiques · officiel")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Officiel")}
            </span>
          </div>
          <div className="p-smehhy">
            <div className="p-g4xk7z">
              {tf("Collecte de 14 h confirmée avec {e} : 3 colis à remettre (1 renvoi, 1 retour, 1 transfert).", { e: ENTREPRISE })}
              <div className="p-qi3pmp">
                {t("BelivaY · 07:40")}
              </div>
            </div>
            <div className="p-g4xk7z">
              {t("Livraison prévue jeudi 10 h avec Taty’s : ≈ 8 colis.")}
              <div className="p-qi3pmp">
                {t("BelivaY · hier 18:00")}
              </div>
            </div>
          </div>
          <div className="p-3os40o">
            <span className="p-rpzy79">
              {t("Je serai fermé")}
            </span>
            <span className="p-rpzy79">
              {t("Relais presque plein")}
            </span>
          </div>
          <div className="p-084o8i">
            <button type="button" aria-label={t("Joindre une photo")} className="p-id803n">
              <Icone nom="r-appareil-photo" taille={19} className="p-emic6i" />
            </button>
            <input type="text" placeholder={t("Votre message")} className="p-nmhanx" />
            <button type="button" aria-label={t("Envoyer")} className="p-0iud18">
              <Icone nom="r-envoyer" taille={18} className="p-gqbtfa" />
            </button>
          </div>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-cadenas" taille={18} className="p-672m16" />
          <div>
            {t("Vous échangez uniquement avec BelivaY, jamais directement avec un client, un vendeur ou un livreur. Les messages servent de preuve.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Messagerie", Rendu: EtatDefaut },
  { id: "sup", libelle: "Fil du support", Rendu: EtatSup },
  { id: "log", libelle: "Fil collectes et livraisons", Rendu: EtatLog },
]

export default function MessagerieProvisoire() {
  return <PageProvisoire route="messagerie" etats={ETATS} />
}

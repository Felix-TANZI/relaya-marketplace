// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Aide · Aide) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-08/Aide.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import marque from '../../../assets/marque-belivay.png'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Aide (prototype : Aide) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-fr3af5">
          <img src={marque} alt="" className="p-w1wmof" />
          <h1 className="p-mtv6qr">
            {t("Comment peut-on vous aider ?")}
          </h1>
        </div>
        <label className="p-eqo33z">
          <Icone nom="r-recherche" taille={19} className="p-672m16" />
          <input type="text" placeholder={t("Code perdu, relais plein, versement…")} className="p-zg9k0q" />
        </label>
        {' '}
        <Link to={chemin("messagerie")} className="p-fo9gyl">
          <div className="p-mt0bwh">
            <Icone nom="r-message" taille={24} className="p-sl1otg" />
          </div>
          <div className="p-lmo74g">
            <div className="p-buxdaz">
              {t("Parler à quelqu’un")}
            </div>
            <div className="p-fbqx8f">
              {t("Messagerie ou rappel · 8 h – 20 h, 7 j / 7")}
            </div>
          </div>
          <Icone nom="r-chevron-droite" taille={18} className="p-sl1otg" />
        </Link>
        <div className="p-7ywyui">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Questions fréquentes")}
            </h2>
          </div>
          <div>
            <div className="p-jmaj5p">
              <button type="button" className="p-q4rgm6">
                <span className="p-c838vt">
                  {t("Le livreur n’a pas de code de dépôt")}
                </span>
                <Icone nom="minus" taille={18} className="p-672m16" />
              </button>
              <div className="p-ghg8qd">
                {t("Ne prenez pas le lot. Écrivez au support ou demandez un rappel depuis l’app : BelivaY vérifie la mission et vous donne le feu vert, ou fait repartir le livreur. 3 codes faux : le code est bloqué 24 h.")}
              </div>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-q4rgm6">
                <span className="p-c838vt">
                  {t("Le client a perdu son code")}
                </span>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-q4rgm6">
                <span className="p-c838vt">
                  {t("Mon relais est presque plein")}
                </span>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-q4rgm6">
                <span className="p-c838vt">
                  {t("Quand et comment suis-je payé ?")}
                </span>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-q4rgm6">
                <span className="p-c838vt">
                  {t("Un colis est abîmé à l’arrivée")}
                </span>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-q4rgm6">
                <span className="p-c838vt">
                  {t("Un avis me semble injuste")}
                </span>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-q4rgm6">
                <span className="p-c838vt">
                  {t("Panne générale : le mode papier")}
                </span>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Écrire au support")}
            </h2>
          </div>
          <div className="p-8dmjde">
            <span className="p-rpzy79">
              {t("Réception")}
            </span>
            <span className="p-6z26dm">
              {t("Retrait")}
            </span>
            <span className="p-6z26dm">
              {t("Stock")}
            </span>
            <span className="p-6z26dm">
              {t("Argent")}
            </span>
            <span className="p-6z26dm">
              {t("Autre")}
            </span>
          </div>
          <label className="p-ky12xr">
            {t("RÉFÉRENCE DU COLIS (SI CONCERNÉ)")}
            <input type="text" placeholder={t("BLV-00000")} defaultValue="" className="p-vust5v" />
          </label>
          <label className="p-ky12xr">
            {t("MESSAGE")}
            <textarea placeholder={t("Décrivez ce qui se passe")} className="p-p001dn" />
          </label>
          <div className="p-0cipe3">
            <button type="button" className="p-rbzobc">
              <Icone nom="r-appareil-photo" taille={18} className="p-emic6i" />
              {t("Photo")}
            </button>
            <button type="button" className="p-ncx7qc">
              <Icone nom="r-envoyer" taille={18} className="p-7dsggt" />
              {t("Envoyer")}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Aide", Rendu: EtatDefaut },
]

export default function AideProvisoire() {
  return <PageProvisoire route="aide" etats={ETATS} />
}

// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Equipe · Mon équipe) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-10/Equipe.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Équipe et codes PIN (prototype : Equipe · {"ad":"closed"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Mon équipe")}
          </h1>
          <div className="p-t2u0o2">
            {t("Chaque personne a son code : on sait toujours qui a reçu et qui a remis. 3 employés au plus.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-pfxfo4">
            <div className="p-443ep0">
              {t("FP")}
            </div>
            <div className="p-lmo74g">
              <div className="p-buxdaz">
                {t("Franck Penga")}
              </div>
              <div className="p-t1lapd">
                {t("Gérant · connecté")}
              </div>
            </div>
            <span className="p-rpzy79">
              {t("Propriétaire")}
            </span>
          </div>
          <div className="p-8dmjde">
            <span className="p-rpzy79">
              {t("Recevoir")}
            </span>
            <span className="p-rpzy79">
              {t("Remettre")}
            </span>
            <span className="p-rpzy79">
              {t("Argent")}
            </span>
            <span className="p-rpzy79">
              {t("Paramètres")}
            </span>
            <span className="p-rpzy79">
              {t("Équipe")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-pfxfo4">
            <div className="p-nbswn3">
              {t("AN")}
            </div>
            <div className="p-lmo74g">
              <div className="p-buxdaz">
                {t("Aïcha N.")}
              </div>
              <div className="p-t1lapd">
                {t("Employée · a remis 6 colis aujourd’hui")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-8dmjde">
            <span className="p-rpzy79">
              {t("Recevoir")}
            </span>
            <span className="p-rpzy79">
              {t("Remettre")}
            </span>
            <span className="p-6z26dm">
              {t("Argent")}
            </span>
            <span className="p-6z26dm">
              {t("Paramètres")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-pfxfo4">
            <div className="p-laeb3x">
              {t("JM")}
            </div>
            <div className="p-lmo74g">
              <div className="p-buxdaz">
                {t("Junior M.")}
              </div>
              <div className="p-t1lapd">
                {t("Employé · samedi · dernière activité samedi")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-8dmjde">
            <span className="p-rpzy79">
              {t("Recevoir")}
            </span>
            <span className="p-rpzy79">
              {t("Remettre")}
            </span>
            <span className="p-6z26dm">
              {t("Argent")}
            </span>
            <span className="p-6z26dm">
              {t("Paramètres")}
            </span>
          </div>
        </div>
        <button type="button" className="p-ncx7qc">
          <Icone nom="r-plus" taille={18} className="p-7dsggt" />
          {t("Ajouter une personne · 2 / 3")}
        </button>
        <div className="p-fht1zk">
          <Icone nom="r-bouclier" taille={18} className="p-lhsznn" />
          <div>
            {t("Vous restez responsable du relais : les colis perdus ou mal remis par un employé comptent dans votre Trust Score. Retirez un accès dès qu’une personne part : un code SMS vous est demandé.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Qui a fait quoi aujourd’hui")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Aïcha N.")}
            </span>
            <span className="p-2vq92h">
              {t("6 remises · 1 lot reçu")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Franck Penga")}
            </span>
            <span className="p-2vq92h">
              {t("3 remises · 1 constat")}
            </span>
          </div>
          <Link to={chemin("historique")} className="p-4u28q4">
            {t("Voir l’historique complet")}
          </Link>
        </div>
      </div>
    </>
  )
}

/** Ajout d’un employé (prototype : Equipe · {"ad":"open"}) — ?etat=open */
export function EtatOpen() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Mon équipe")}
          </h1>
          <div className="p-t2u0o2">
            {t("Chaque personne a son code : on sait toujours qui a reçu et qui a remis. 3 employés au plus.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-pfxfo4">
            <div className="p-443ep0">
              {t("FP")}
            </div>
            <div className="p-lmo74g">
              <div className="p-buxdaz">
                {t("Franck Penga")}
              </div>
              <div className="p-t1lapd">
                {t("Gérant · connecté")}
              </div>
            </div>
            <span className="p-rpzy79">
              {t("Propriétaire")}
            </span>
          </div>
          <div className="p-8dmjde">
            <span className="p-rpzy79">
              {t("Recevoir")}
            </span>
            <span className="p-rpzy79">
              {t("Remettre")}
            </span>
            <span className="p-rpzy79">
              {t("Argent")}
            </span>
            <span className="p-rpzy79">
              {t("Paramètres")}
            </span>
            <span className="p-rpzy79">
              {t("Équipe")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-pfxfo4">
            <div className="p-nbswn3">
              {t("AN")}
            </div>
            <div className="p-lmo74g">
              <div className="p-buxdaz">
                {t("Aïcha N.")}
              </div>
              <div className="p-t1lapd">
                {t("Employée · a remis 6 colis aujourd’hui")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-8dmjde">
            <span className="p-rpzy79">
              {t("Recevoir")}
            </span>
            <span className="p-rpzy79">
              {t("Remettre")}
            </span>
            <span className="p-6z26dm">
              {t("Argent")}
            </span>
            <span className="p-6z26dm">
              {t("Paramètres")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-pfxfo4">
            <div className="p-laeb3x">
              {t("JM")}
            </div>
            <div className="p-lmo74g">
              <div className="p-buxdaz">
                {t("Junior M.")}
              </div>
              <div className="p-t1lapd">
                {t("Employé · samedi · dernière activité samedi")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-8dmjde">
            <span className="p-rpzy79">
              {t("Recevoir")}
            </span>
            <span className="p-rpzy79">
              {t("Remettre")}
            </span>
            <span className="p-6z26dm">
              {t("Argent")}
            </span>
            <span className="p-6z26dm">
              {t("Paramètres")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Nouvelle personne")}
            </h2>
          </div>
          <label className="p-ky12xr">
            {t("NOM ET PRÉNOM")}
            <input type="text" placeholder={t("Ex. Paul E.")} defaultValue="" className="p-afs6hh" />
          </label>
          <label className="p-ky12xr">
            {t("NUMÉRO DE TÉLÉPHONE")}
            <input type="text" placeholder={t("6XX XX XX XX")} defaultValue="" className="p-afs6hh" />
          </label>
          <div className="p-yscrc8">
            {t("CE QU’ELLE PEUT FAIRE")}
          </div>
          <div className="p-8dmjde">
            <span className="p-rpzy79">
              {t("✓ Recevoir")}
            </span>
            <span className="p-rpzy79">
              {t("✓ Remettre")}
            </span>
            <span className="p-rpzy79">
              {t("✓ Fermeture imprévue du jour")}
            </span>
            <span className="p-6z26dm">
              {t("Argent · réservé au gérant")}
            </span>
            <span className="p-6z26dm">
              {t("Paramètres · réservé au gérant")}
            </span>
          </div>
          <div className="p-81u2s6">
            {t("Un code SMS arrive sur votre téléphone personnel pour confirmer l’ajout (de même pour retirer un accès). Elle reçoit ensuite un SMS pour créer son code PIN et suit les 5 modules de formation avant sa première remise.")}
          </div>
          <div className="p-lndmsc">
            <button type="button" className="p-rbzobc">
              {t("Annuler")}
            </button>
            <button type="button" className="p-ncx7qc">
              {t("Envoyer l’invitation")}
            </button>
          </div>
        </div>
        <div className="p-fht1zk">
          <Icone nom="r-bouclier" taille={18} className="p-lhsznn" />
          <div>
            {t("Vous restez responsable du relais : les colis perdus ou mal remis par un employé comptent dans votre Trust Score. Retirez un accès dès qu’une personne part : un code SMS vous est demandé.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Qui a fait quoi aujourd’hui")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Aïcha N.")}
            </span>
            <span className="p-2vq92h">
              {t("6 remises · 1 lot reçu")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Franck Penga")}
            </span>
            <span className="p-2vq92h">
              {t("3 remises · 1 constat")}
            </span>
          </div>
          <Link to={chemin("historique")} className="p-4u28q4">
            {t("Voir l’historique complet")}
          </Link>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Équipe et codes PIN", Rendu: EtatDefaut },
  { id: "open", libelle: "Ajout d’un employé", Rendu: EtatOpen },
]

export default function EquipeProvisoire() {
  return <PageProvisoire route="equipe" etats={ETATS} />
}

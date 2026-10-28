// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (ChangerMoMo · Numéro de versement) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-09/ChangerMoMo.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Changer le numéro de versement (prototype : ChangerMoMo · {"mm":"saisie"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Changer de numéro de versement")}
          </h1>
          <div className="p-t2u0o2">
            {t("Le numéro où BelivaY verse vos gains chaque vendredi.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-telephone" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Numéro actuel")}
              </div>
              <div className="p-dfa05r">
                {t("MTN MoMo ···· 8 350 · vérifié le 12 juillet")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Actif")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Nouveau numéro")}
            </h2>
          </div>
          <div className="p-w2e4hy">
            <button type="button" className="p-jv7fel">
              {t("MTN MoMo")}
            </button>
            <button type="button" className="p-8xq01w">
              {t("Orange Money")}
            </button>
          </div>
          <label className="p-ky12xr">
            {t("NUMÉRO")}
            <input type="text" placeholder={t("6XX XX XX XX")} defaultValue="6 77 40 21 18" className="p-afs6hh" />
          </label>
          <div className="p-ug5qrn">
            {t("Préfixe vérifié avant l’envoi : MTN 67X, 68X, 650 à 654 · Orange 69X, 655 à 659. Il faut du réseau.")}
          </div>
          <div className="p-gh7puf">
            <Icone nom="r-personne" taille={18} className="p-672m16" />
            <div>
              {t("Le numéro doit être")}
              {' '}
              <strong>
                {t("au nom du gérant")}
              </strong>
              {' '}
              {t(": BelivaY compare le nom du compte MoMo avec votre pièce d’identité.")}
            </div>
          </div>
          <button type="button" className="p-ncx7qc">
            {t("Recevoir les deux codes")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Les règles")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Numéros actifs")}
            </span>
            <span className="p-2vq92h">
              {t("un seul")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Titulaire")}
            </span>
            <span className="p-2vq92h">
              {t("le gérant")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Codes")}
            </span>
            <span className="p-2vq92h">
              {t("2 SMS, dont 1 sur votre téléphone")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Vérification")}
            </span>
            <span className="p-2vq92h">
              {t("7 jours, versements suspendus")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Alerte")}
            </span>
            <span className="p-2vq92h">
              {t("SMS à l’ancien numéro")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Réseau")}
            </span>
            <span className="p-2vq92h">
              {t("obligatoire")}
            </span>
          </div>
        </div>
        <div className="p-fht1zk">
          <Icone nom="r-alerte" taille={18} className="p-lhsznn" />
          <div>
            {t("Réservé au gérant. BelivaY ne vous demande jamais votre code secret Mobile Money. Si vous n’avez pas demandé ce changement, touchez « Ce n’est pas vous ? » dans le SMS d’alerte ou appelez le support : le changement est annulé.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Code de confirmation (prototype : ChangerMoMo · {"mm":"code"}) — ?etat=code */
export function EtatCode() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Changer de numéro de versement")}
          </h1>
          <div className="p-t2u0o2">
            {t("Le numéro où BelivaY verse vos gains chaque vendredi.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-telephone" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Numéro actuel")}
              </div>
              <div className="p-dfa05r">
                {t("MTN MoMo ···· 8 350 · vérifié le 12 juillet")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Actif")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Code de vérification")}
            </h2>
          </div>
          <div className="p-ug5qrn">
            {t("Deux codes à 6 chiffres sont partis par SMS : l’un au nouveau numéro")}
            {' '}
            <strong>
              {"6 77 40 21 18"}
            </strong>
            {t(", l’autre à votre téléphone personnel")}
            {' '}
            <strong>
              {"6 91 24 83 50"}
            </strong>
            {t(". Ils expirent dans 10 minutes.")}
          </div>
          <label className="p-ky12xr">
            {t("CODE REÇU AU NOUVEAU NUMÉRO")}
            <input type="text" placeholder={t("000000")} defaultValue="514 207" className="p-9dfvp5" />
          </label>
          <label className="p-ky12xr">
            {t("CODE REÇU SUR VOTRE TÉLÉPHONE")}
            <input type="text" placeholder={t("000000")} defaultValue="308 961" className="p-9dfvp5" />
          </label>
          <button type="button" className="p-ncx7qc">
            {t("Valider le numéro")}
          </button>
          <button type="button" className="p-rbzobc">
            {t("Renvoyer les codes")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Les règles")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Numéros actifs")}
            </span>
            <span className="p-2vq92h">
              {t("un seul")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Titulaire")}
            </span>
            <span className="p-2vq92h">
              {t("le gérant")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Codes")}
            </span>
            <span className="p-2vq92h">
              {t("2 SMS, dont 1 sur votre téléphone")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Vérification")}
            </span>
            <span className="p-2vq92h">
              {t("7 jours, versements suspendus")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Alerte")}
            </span>
            <span className="p-2vq92h">
              {t("SMS à l’ancien numéro")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Réseau")}
            </span>
            <span className="p-2vq92h">
              {t("obligatoire")}
            </span>
          </div>
        </div>
        <div className="p-fht1zk">
          <Icone nom="r-alerte" taille={18} className="p-lhsznn" />
          <div>
            {t("Réservé au gérant. BelivaY ne vous demande jamais votre code secret Mobile Money. Si vous n’avez pas demandé ce changement, touchez « Ce n’est pas vous ? » dans le SMS d’alerte ou appelez le support : le changement est annulé.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Numéro changé (prototype : ChangerMoMo · {"mm":"ok"}) — ?etat=ok */
export function EtatOk() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Changer de numéro de versement")}
          </h1>
          <div className="p-t2u0o2">
            {t("Le numéro où BelivaY verse vos gains chaque vendredi.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-telephone" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Numéro actuel")}
              </div>
              <div className="p-dfa05r">
                {t("MTN MoMo ···· 8 350 · vérifié le 12 juillet")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Actif")}
            </span>
          </div>
        </div>
        <div className="p-c1r1yj">
          <div className="p-vhxw8h">
            <Icone nom="check" taille={32} trait={2.6} className="p-q7qjlz" />
          </div>
          <div className="p-fdt7cn">
            {t("Nouveau numéro enregistré")}
          </div>
          <div className="p-uzhe04">
            {t("Une personne de BelivaY le vérifie : vos versements sont suspendus 7 jours. MTN ···· 2 118 recevra")}
            {' '}
            <strong>
              {t("le vendredi 2 octobre")}
            </strong>
            {' '}
            {t("le versement de ce vendredi 25 et celui de la semaine : rien n’est perdu. Un SMS d’alerte est parti vers ···· 8 350.")}
          </div>
          <Link to={chemin("versements")} className="p-rbzobc">
            {t("Retour aux versements")}
          </Link>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Les règles")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Numéros actifs")}
            </span>
            <span className="p-2vq92h">
              {t("un seul")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Titulaire")}
            </span>
            <span className="p-2vq92h">
              {t("le gérant")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Codes")}
            </span>
            <span className="p-2vq92h">
              {t("2 SMS, dont 1 sur votre téléphone")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Vérification")}
            </span>
            <span className="p-2vq92h">
              {t("7 jours, versements suspendus")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Alerte")}
            </span>
            <span className="p-2vq92h">
              {t("SMS à l’ancien numéro")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Réseau")}
            </span>
            <span className="p-2vq92h">
              {t("obligatoire")}
            </span>
          </div>
        </div>
        <div className="p-fht1zk">
          <Icone nom="r-alerte" taille={18} className="p-lhsznn" />
          <div>
            {t("Réservé au gérant. BelivaY ne vous demande jamais votre code secret Mobile Money. Si vous n’avez pas demandé ce changement, touchez « Ce n’est pas vous ? » dans le SMS d’alerte ou appelez le support : le changement est annulé.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Changer le numéro de versement", Rendu: EtatDefaut },
  { id: "code", libelle: "Code de confirmation", Rendu: EtatCode },
  { id: "ok", libelle: "Numéro changé", Rendu: EtatOk },
]

export default function ChangerMoMoProvisoire() {
  return <PageProvisoire route="changer-momo" etats={ETATS} />
}

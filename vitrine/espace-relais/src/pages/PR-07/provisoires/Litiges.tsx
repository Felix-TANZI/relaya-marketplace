// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Litiges · Constats et retours) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-07/Litiges.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Constats et litiges (prototype : Litiges · {"lt":"c"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Constats et retours")}
          </h1>
          <div className="p-t2u0o2">
            {t("Le litige se règle au comptoir, colis en main, vous comme témoin.")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-h01hlk">
            {t("Constat")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Dépôt de retour")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Dossiers 1")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-yscrc8">
            {t("1 · SCANNEZ LE COLIS")}
          </div>
          <div className="p-mm2ujz">
            <input type="text" defaultValue="BLV-40077" aria-label={t("Référence du colis")} className="p-py2cpj" />
            <button type="button" aria-label={t("Scanner")} className="p-2xyesk">
              <Icone nom="r-qr" taille={20} className="p-7dsggt" />
            </button>
          </div>
          <div className="p-are0kx">
            {t("Remis il y a 2 jours · dans la fenêtre de 7 jours.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-yscrc8">
            {t("2 · QUE SE PASSE-T-IL ?")}
          </div>
          <div className="p-0cipe3">
            <button type="button" className="p-kvvfz2">
              <Icone nom="r-etiquette" taille={22} className="p-672m16" />
              <span className="p-dfc4i3">
                {t("Non conforme")}
              </span>
            </button>
            <button type="button" className="p-hziafi">
              <Icone nom="r-alerte" taille={22} className="p-672m16" />
              <span className="p-dfc4i3">
                {t("Abîmé")}
              </span>
            </button>
            <button type="button" className="p-kvvfz2">
              <Icone nom="r-bouclier" taille={22} className="p-672m16" />
              <span className="p-dfc4i3">
                {t("Contrefaçon")}
              </span>
            </button>
            <button type="button" className="p-kvvfz2">
              <Icone nom="r-oeil" taille={22} className="p-672m16" />
              <span className="p-dfc4i3">
                {t("Défaut caché")}
              </span>
            </button>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-yscrc8">
            {t("3 · DEUX PHOTOS")}
          </div>
          <div className="p-0cipe3">
            <div className="p-08e163">
              <Icone nom="check" taille={22} className="p-id53ve" />
              {t("Le colis · prise")}
            </div>
            <button type="button" className="p-big7gg">
              <Icone nom="r-appareil-photo" taille={22} className="p-672m16" />
              {t("Le problème")}
            </button>
          </div>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-bouclier" taille={18} className="p-672m16" />
          <div>
            {t("Le colis reste chez vous")}
            {' '}
            <strong>
              {t("sans frais de garde")}
            </strong>
            {' '}
            {t("jusqu’à la décision. Vous constatez ; le vendeur répond sous 48 h, puis la médiation BelivaY tranche sur les photos. Constat possible hors connexion.")}
          </div>
        </div>
        <button type="button" className="p-ncx7qc">
          <Icone nom="r-envoyer" taille={18} className="p-7dsggt" />
          {t("Envoyer le constat")}
        </button>
      </div>
    </>
  )
}

/** Dépôt de retour (prototype : Litiges · {"lt":"r"}) — ?etat=r */
export function EtatR() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Constats et retours")}
          </h1>
          <div className="p-t2u0o2">
            {t("Le litige se règle au comptoir, colis en main, vous comme témoin.")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("Constat")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Dépôt de retour")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Dossiers 1")}
          </button>
        </div>
        <div className="p-26n637">
          <div className="p-xmy0fy">
            {t("DÉPÔT D’UN RETOUR VALIDÉ")}
          </div>
          <div className="p-glnjxu">
            {t("Seul un retour déjà accepté par BelivaY se dépose. Scannez l’étiquette que le client a reçue : si le motif n’est pas validé, le dépôt est refusé.")}
          </div>
          <div className="p-mm2ujz">
            <input type="text" defaultValue="RT-2240" aria-label={t("Numéro du retour")} className="p-ryg5iy" />
            <button type="button" aria-label={t("Scanner l’étiquette")} className="p-dmjvf6">
              <Icone nom="r-qr" taille={20} className="p-gqbtfa" />
            </button>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-9rmh6y">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">
                {t("RT-2240")}
              </h2>
            </div>
            <span className="p-nax3x4">
              {t("Motif validé")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Motif")}
            </span>
            <span className="p-2vq92h">
              {t("produit non conforme")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Taille")}
            </span>
            <span className="p-2vq92h">
              {t("petit · hors capacité")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Ranger en")}
            </span>
            <span className="p-imse89">
              {t("R-02")}
            </span>
          </div>
          <button type="button" className="p-keaeoe">
            <Icone nom="r-appareil-photo" taille={20} className="p-gqd75s" />
            {t("Scellé du retour posé · 2 photos obligatoires")}
          </button>
          <button type="button" className="p-ncx7qc">
            <Icone nom="check" taille={18} className="p-7dsggt" />
            {t("Enregistrer le dépôt")}
          </button>
          <div className="p-81u2s6">
            {t("Jamais facturé, hors capacité. Il part avec la prochaine collecte vers le vendeur, qui l’inspecte sous 48 h ; le trajet (500 F) est payé par la partie en tort. Vous touchez comme un colis remis : 200 F petit, 250 F moyen, 400 F encombrant.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Dossiers en cours (prototype : Litiges · {"lt":"d"}) — ?etat=d */
export function EtatD() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Constats et retours")}
          </h1>
          <div className="p-t2u0o2">
            {t("Le litige se règle au comptoir, colis en main, vous comme témoin.")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("Constat")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Dépôt de retour")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Dossiers 1")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <Link to={chemin("messagerie")} className="p-o24hsm">
            <div className="p-9exjl6">
              <Icone nom="r-balance" taille={20} className="p-lhsznn" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("LT-0912 · BLV-40077")}
              </div>
              <div className="p-dfa05r">
                {t("Non conforme · constat du 22 sept.")}
              </div>
            </div>
            <span className="p-h4wlx0">
              {t("À compléter")}
            </span>
          </Link>
          <div className="p-txcw5t">
            <span className="p-028mkx" />
            <span className="p-k5ae91" />
            <span className="p-rr4m5k" />
            <span className="p-rr4m5k" />
            <span className="p-rr4m5k" />
          </div>
          <div className="p-yryqru">
            <span>
              {t("Constat")}
            </span>
            <span>
              {t("Vendeur 48 h")}
            </span>
            <span>
              {t("Médiation")}
            </span>
            <span>
              {t("Décision")}
            </span>
            <span>
              {t("Recours")}
            </span>
          </div>
          <div className="p-fht1zk">
            <Icone nom="r-appareil-photo" taille={18} className="p-lhsznn" />
            <div>
              {t("BelivaY demande une photo de l’étiquette. Ajoutez-la depuis la Messagerie. Le vendeur a jusqu’au 24 sept. à 15 h pour répondre.")}
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Clos ce mois")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="check" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("LT-0874 · BLV-39910")}
              </div>
              <div className="p-dfa05r">
                {t("Abîmé · remplacement accepté, vous n’êtes pas mis en cause")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Clos")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Les règles")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Le client peut signaler")}
            </span>
            <span className="p-2vq92h">
              {t("7 jours après le retrait")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Défaut caché · vice caché")}
            </span>
            <span className="p-2vq92h">
              {t("48 h · 100 jours")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Pendant le dossier")}
            </span>
            <span className="p-2vq92h">
              {t("ni garde ni renvoi")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Votre rôle")}
            </span>
            <span className="p-2vq92h">
              {t("constater, garder, remettre")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Réponse du vendeur")}
            </span>
            <span className="p-2vq92h">
              {t("48 h, sinon raison au client")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Médiation BelivaY")}
            </span>
            <span className="p-2vq92h">
              {t("décision sous 48 h")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Recours")}
            </span>
            <span className="p-2vq92h">
              {t("un seul, sous 3 jours")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Client sans réponse")}
            </span>
            <span className="p-2vq92h">
              {t("dossier clos après 5 jours")}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Constats et litiges", Rendu: EtatDefaut },
  { id: "r", libelle: "Dépôt de retour", Rendu: EtatR },
  { id: "d", libelle: "Dossiers en cours", Rendu: EtatD },
]

export default function LitigesProvisoire() {
  return <PageProvisoire route="litiges" etats={ETATS} />
}

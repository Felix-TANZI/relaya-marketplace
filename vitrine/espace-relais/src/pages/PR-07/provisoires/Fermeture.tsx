// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Fermeture · Fermeture exceptionnelle) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-07/Fermeture.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { usePreferences } from '../../../preferences'

/** Fermeture déclarée (prototype : Fermeture · {"du":"d3"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Fermeture exceptionnelle")}
          </h1>
          <div className="p-t2u0o2">
            {t("Prévenez BelivaY : on s’occupe des colis et des clients.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Quand ?")}
            </h2>
          </div>
          <div className="p-340snk">
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("lun.")}
              </div>
              <div className="p-a81pfk">
                {"28"}
              </div>
            </div>
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("mar.")}
              </div>
              <div className="p-a81pfk">
                {"29"}
              </div>
            </div>
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("mer.")}
              </div>
              <div className="p-a81pfk">
                {"30"}
              </div>
            </div>
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("jeu.")}
              </div>
              <div className="p-a81pfk">
                {"1"}
              </div>
            </div>
            <div className="p-axsmpa">
              <div className="p-tdwilg">
                {t("ven.")}
              </div>
              <div className="p-a81pfk">
                {"2"}
              </div>
            </div>
            <div className="p-axsmpa">
              <div className="p-tdwilg">
                {t("sam.")}
              </div>
              <div className="p-a81pfk">
                {"3"}
              </div>
            </div>
            <div className="p-axsmpa">
              <div className="p-tdwilg">
                {t("dim.")}
              </div>
              <div className="p-a81pfk">
                {"4"}
              </div>
            </div>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Du")}
            </span>
            <span className="p-2vq92h">
              {t("vendredi 2 octobre")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Au")}
            </span>
            <span className="p-2vq92h">
              {t("dimanche 4 octobre · réouverture lundi 5")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Motif")}
            </h2>
          </div>
          <button type="button" className="p-sl6oyc">
            <Icone nom="r-calendrier" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Congé")}
              </div>
              <div className="p-t1lapd">
                {t("À déclarer 48 h avant · aucun justificatif")}
              </div>
            </div>
          </button>
          <button type="button" className="p-uj7at8">
            <Icone nom="r-alerte" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Maladie")}
              </div>
              <div className="p-t1lapd">
                {t("Le jour même · justificatif sous 48 h")}
              </div>
            </div>
          </button>
          <button type="button" className="p-uj7at8">
            <Icone nom="r-personne" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Urgence familiale")}
              </div>
              <div className="p-t1lapd">
                {t("Le jour même · justificatif sous 7 jours")}
              </div>
            </div>
          </button>
          <button type="button" className="p-uj7at8">
            <Icone nom="r-alerte" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Force majeure")}
              </div>
              <div className="p-t1lapd">
                {t("Coupure, inondation, sinistre")}
              </div>
            </div>
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Durée")}
            </h2>
          </div>
          <div className="p-lvzt0c">
            <button type="button" className="p-bq7aiq">
              {t("< 24 h")}
            </button>
            <button type="button" className="p-h01hlk">
              {t("1 à 3 jours")}
            </button>
            <button type="button" className="p-bq7aiq">
              {t("> 3 jours")}
            </button>
          </div>
          <div className="p-gh7puf">
            <Icone nom="r-camion" taille={18} className="p-672m16" />
            <div>
              {t("Plus aucun nouveau colis dès la veille. Vos 22 colis partent au relais le plus proche (Mvog-Mbi) avec la dernière collecte ; les clients reçoivent la nouvelle adresse et un nouveau code, et leurs jours offerts repartent de zéro.")}
            </div>
          </div>
          <div className="p-81u2s6">
            {t("Les jours de fermeture ne sont jamais facturés au client, et le transfert ne vous coûte rien. Un employé peut déclarer une fermeture imprévue pour aujourd’hui ; les fermetures programmées restent réservées au gérant.")}
          </div>
        </div>
        <button type="button" className="p-ncx7qc">
          <Icone nom="r-fermeture" taille={18} className="p-7dsggt" />
          {t("Déclarer la fermeture")}
        </button>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Fermetures passées")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-calendrier" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("15 août · 1 jour")}
              </div>
              <div className="p-dfa05r">
                {t("Congé · déclaré 3 jours avant")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Sans impact")}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

/** Durée de moins de 24 h (prototype : Fermeture · {"du":"d1"}) — ?etat=d1 */
export function EtatD1() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Fermeture exceptionnelle")}
          </h1>
          <div className="p-t2u0o2">
            {t("Prévenez BelivaY : on s’occupe des colis et des clients.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Quand ?")}
            </h2>
          </div>
          <div className="p-340snk">
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("lun.")}
              </div>
              <div className="p-a81pfk">
                {"28"}
              </div>
            </div>
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("mar.")}
              </div>
              <div className="p-a81pfk">
                {"29"}
              </div>
            </div>
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("mer.")}
              </div>
              <div className="p-a81pfk">
                {"30"}
              </div>
            </div>
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("jeu.")}
              </div>
              <div className="p-a81pfk">
                {"1"}
              </div>
            </div>
            <div className="p-axsmpa">
              <div className="p-tdwilg">
                {t("ven.")}
              </div>
              <div className="p-a81pfk">
                {"2"}
              </div>
            </div>
            <div className="p-axsmpa">
              <div className="p-tdwilg">
                {t("sam.")}
              </div>
              <div className="p-a81pfk">
                {"3"}
              </div>
            </div>
            <div className="p-axsmpa">
              <div className="p-tdwilg">
                {t("dim.")}
              </div>
              <div className="p-a81pfk">
                {"4"}
              </div>
            </div>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Du")}
            </span>
            <span className="p-2vq92h">
              {t("vendredi 2 octobre")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Au")}
            </span>
            <span className="p-2vq92h">
              {t("dimanche 4 octobre · réouverture lundi 5")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Motif")}
            </h2>
          </div>
          <button type="button" className="p-sl6oyc">
            <Icone nom="r-calendrier" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Congé")}
              </div>
              <div className="p-t1lapd">
                {t("À déclarer 48 h avant · aucun justificatif")}
              </div>
            </div>
          </button>
          <button type="button" className="p-uj7at8">
            <Icone nom="r-alerte" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Maladie")}
              </div>
              <div className="p-t1lapd">
                {t("Le jour même · justificatif sous 48 h")}
              </div>
            </div>
          </button>
          <button type="button" className="p-uj7at8">
            <Icone nom="r-personne" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Urgence familiale")}
              </div>
              <div className="p-t1lapd">
                {t("Le jour même · justificatif sous 7 jours")}
              </div>
            </div>
          </button>
          <button type="button" className="p-uj7at8">
            <Icone nom="r-alerte" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Force majeure")}
              </div>
              <div className="p-t1lapd">
                {t("Coupure, inondation, sinistre")}
              </div>
            </div>
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Durée")}
            </h2>
          </div>
          <div className="p-lvzt0c">
            <button type="button" className="p-h01hlk">
              {t("< 24 h")}
            </button>
            <button type="button" className="p-bq7aiq">
              {t("1 à 3 jours")}
            </button>
            <button type="button" className="p-bq7aiq">
              {t("> 3 jours")}
            </button>
          </div>
          <div className="p-7khaoo">
            <Icone nom="r-horloge" taille={18} className="p-q7qjlz" />
            <div>
              {t("Rien ne bouge : vous gardez les colis. Les clients voient « rouvre demain », les livreurs ne passent pas.")}
            </div>
          </div>
          <div className="p-81u2s6">
            {t("Les jours de fermeture ne sont jamais facturés au client, et le transfert ne vous coûte rien. Un employé peut déclarer une fermeture imprévue pour aujourd’hui ; les fermetures programmées restent réservées au gérant.")}
          </div>
        </div>
        <button type="button" className="p-ncx7qc">
          <Icone nom="r-fermeture" taille={18} className="p-7dsggt" />
          {t("Déclarer la fermeture")}
        </button>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Fermetures passées")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-calendrier" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("15 août · 1 jour")}
              </div>
              <div className="p-dfa05r">
                {t("Congé · déclaré 3 jours avant")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Sans impact")}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

/** Durée de plus de 3 jours (prototype : Fermeture · {"du":"d9"}) — ?etat=d9 */
export function EtatD9() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Fermeture exceptionnelle")}
          </h1>
          <div className="p-t2u0o2">
            {t("Prévenez BelivaY : on s’occupe des colis et des clients.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Quand ?")}
            </h2>
          </div>
          <div className="p-340snk">
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("lun.")}
              </div>
              <div className="p-a81pfk">
                {"28"}
              </div>
            </div>
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("mar.")}
              </div>
              <div className="p-a81pfk">
                {"29"}
              </div>
            </div>
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("mer.")}
              </div>
              <div className="p-a81pfk">
                {"30"}
              </div>
            </div>
            <div className="p-rbnapz">
              <div className="p-tdwilg">
                {t("jeu.")}
              </div>
              <div className="p-a81pfk">
                {"1"}
              </div>
            </div>
            <div className="p-axsmpa">
              <div className="p-tdwilg">
                {t("ven.")}
              </div>
              <div className="p-a81pfk">
                {"2"}
              </div>
            </div>
            <div className="p-axsmpa">
              <div className="p-tdwilg">
                {t("sam.")}
              </div>
              <div className="p-a81pfk">
                {"3"}
              </div>
            </div>
            <div className="p-axsmpa">
              <div className="p-tdwilg">
                {t("dim.")}
              </div>
              <div className="p-a81pfk">
                {"4"}
              </div>
            </div>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Du")}
            </span>
            <span className="p-2vq92h">
              {t("vendredi 2 octobre")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Au")}
            </span>
            <span className="p-2vq92h">
              {t("dimanche 4 octobre · réouverture lundi 5")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Motif")}
            </h2>
          </div>
          <button type="button" className="p-sl6oyc">
            <Icone nom="r-calendrier" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Congé")}
              </div>
              <div className="p-t1lapd">
                {t("À déclarer 48 h avant · aucun justificatif")}
              </div>
            </div>
          </button>
          <button type="button" className="p-uj7at8">
            <Icone nom="r-alerte" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Maladie")}
              </div>
              <div className="p-t1lapd">
                {t("Le jour même · justificatif sous 48 h")}
              </div>
            </div>
          </button>
          <button type="button" className="p-uj7at8">
            <Icone nom="r-personne" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Urgence familiale")}
              </div>
              <div className="p-t1lapd">
                {t("Le jour même · justificatif sous 7 jours")}
              </div>
            </div>
          </button>
          <button type="button" className="p-uj7at8">
            <Icone nom="r-alerte" taille={20} className="p-672m16" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Force majeure")}
              </div>
              <div className="p-t1lapd">
                {t("Coupure, inondation, sinistre")}
              </div>
            </div>
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Durée")}
            </h2>
          </div>
          <div className="p-lvzt0c">
            <button type="button" className="p-bq7aiq">
              {t("< 24 h")}
            </button>
            <button type="button" className="p-bq7aiq">
              {t("1 à 3 jours")}
            </button>
            <button type="button" className="p-h01hlk">
              {t("> 3 jours")}
            </button>
          </div>
          <div className="p-fht1zk">
            <Icone nom="r-alerte" taille={18} className="p-lhsznn" />
            <div>
              {t("Idem, et votre relais est masqué du choix des clients jusqu’à votre retour. Au-delà de 14 jours, BelivaY vous appelle pour faire le point.")}
            </div>
          </div>
          <div className="p-81u2s6">
            {t("Les jours de fermeture ne sont jamais facturés au client, et le transfert ne vous coûte rien. Un employé peut déclarer une fermeture imprévue pour aujourd’hui ; les fermetures programmées restent réservées au gérant.")}
          </div>
        </div>
        <button type="button" className="p-ncx7qc">
          <Icone nom="r-fermeture" taille={18} className="p-7dsggt" />
          {t("Déclarer la fermeture")}
        </button>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Fermetures passées")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-calendrier" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("15 août · 1 jour")}
              </div>
              <div className="p-dfa05r">
                {t("Congé · déclaré 3 jours avant")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Sans impact")}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Fermeture déclarée", Rendu: EtatDefaut },
  { id: "d1", libelle: "Durée de moins de 24 h", Rendu: EtatD1 },
  { id: "d9", libelle: "Durée de plus de 3 jours", Rendu: EtatD9 },
]

export default function FermetureProvisoire() {
  return <PageProvisoire route="fermeture" etats={ETATS} />
}

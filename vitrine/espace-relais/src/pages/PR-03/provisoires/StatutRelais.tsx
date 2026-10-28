// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (StatutRelais · Statut du relais) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-03/StatutRelais.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Statut du relais (prototype : StatutRelais · {"sr":"cfg"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Statut du relais")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que voit le gérant quand son relais n’est pas « Ouvert ».")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-h01hlk">
            {t("En configuration")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Suspendu")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Fermé")}
          </button>
        </div>
        <div className="p-26n637">
          <div className="p-xmy0fy">
            {t("EN CONFIGURATION · 4 / 6")}
          </div>
          <div className="p-fdt7cn">
            {t("Encore 2 étapes avant d’ouvrir")}
          </div>
          <div className="p-yz5dyd">
            {t("Tant que le relais n’est pas ouvert, aucun colis ne vous est envoyé et les clients ne vous voient pas.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="check" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Dossier du gérant")}
              </div>
              <div className="p-dfa05r">
                {t("Vérifié")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Fait")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="check" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Numéro de versement")}
              </div>
              <div className="p-dfa05r">
                {t("Vérifié")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Fait")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="check" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Convention")}
              </div>
              <div className="p-dfa05r">
                {t("Signée")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Fait")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="check" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Visite de BelivaY")}
              </div>
              <div className="p-dfa05r">
                {t("Faite le 14 juillet")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Fait")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <Link to={chemin("formation")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Formation")}
              </div>
              <div className="p-dfa05r">
                {t("3 modules sur 5")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("capacite")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-horloge" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Capacité et horaires")}
              </div>
              <div className="p-dfa05r">
                {t("À déclarer")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-boutique" taille={18} className="p-672m16" />
          <div>
            {t("Le statut s’affiche aussi dans la pastille de l’en-tête : « En configuration », « Suspendu » (rouge) ou « Fermé jusqu’au … » (ambre).")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Relais suspendu (prototype : StatutRelais · {"sr":"sus"}) — ?etat=sus */
export function EtatSus() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Statut du relais")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que voit le gérant quand son relais n’est pas « Ouvert ».")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("En configuration")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Suspendu")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Fermé")}
          </button>
        </div>
        <div className="p-9a9wu0">
          <div className="p-wa6ccw">
            <div className="p-lqvhm1">
              <Icone nom="r-alerte" taille={24} className="p-woejqv" />
            </div>
            <div className="p-nlvkht">
              {t("Relais suspendu")}
            </div>
          </div>
          <div className="p-5pu05p">
            {t("Depuis le 20 septembre · niveau 3 sur 4, validé par une personne de BelivaY. Motif écrit : colis BLV-39870 perdu au relais, enquête close. Aucun nouveau colis ne vous est envoyé. Les colis déjà en stock partent vers le relais le plus proche ; les remises en cours restent possibles.")}
          </div>
          <Link to={chemin("messagerie")} className="p-ncx7qc">
            {t("Voir la décision et le motif")}
          </Link>
          <Link to={chemin("aide")} className="p-rbzobc">
            {t("Contester")}
          </Link>
        </div>
        <div className="p-yi6rkz">
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Contestation")}
            </span>
            <span className="p-2vq92h">
              {t("une fois, réponse sous 72 h ouvrées")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Versements")}
            </span>
            <span className="p-2vq92h">
              {t("maintenus pour les opérations faites")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Trust Score")}
            </span>
            <span className="p-lgzow2">
              {t("gelé sous 40 pendant la suspension")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Au retour")}
            </span>
            <span className="p-2vq92h">
              {t("période probatoire")}
            </span>
          </div>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-boutique" taille={18} className="p-672m16" />
          <div>
            {t("Le statut s’affiche aussi dans la pastille de l’en-tête : « En configuration », « Suspendu » (rouge) ou « Fermé jusqu’au … » (ambre).")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Relais fermé (prototype : StatutRelais · {"sr":"fer"}) — ?etat=fer */
export function EtatFer() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Statut du relais")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que voit le gérant quand son relais n’est pas « Ouvert ».")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("En configuration")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Suspendu")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Fermé")}
          </button>
        </div>
        <div className="p-zdebuk">
          <div className="p-wa6ccw">
            <div className="p-o4jtkl">
              <Icone nom="r-fermeture" taille={24} className="p-lhsznn" />
            </div>
            <div className="p-nlvkht">
              {t("Fermé temporairement")}
            </div>
          </div>
          <div className="p-5pu05p">
            {t("Congé du vendredi 2 au dimanche 4 octobre. Réouverture lundi 5 à 8 h. Vos colis ont été transférés à Mvog-Mbi ; les clients sont prévenus et ont reçu un nouveau code.")}
          </div>
          <Link to={chemin("fermeture")} className="p-rbzobc">
            {t("Modifier ou rouvrir plus tôt")}
          </Link>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-boutique" taille={18} className="p-672m16" />
          <div>
            {t("Le statut s’affiche aussi dans la pastille de l’en-tête : « En configuration », « Suspendu » (rouge) ou « Fermé jusqu’au … » (ambre).")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Statut du relais", Rendu: EtatDefaut },
  { id: "sus", libelle: "Relais suspendu", Rendu: EtatSus },
  { id: "fer", libelle: "Relais fermé", Rendu: EtatFer },
]

export default function StatutRelaisProvisoire() {
  return <PageProvisoire route="statut-relais" etats={ETATS} />
}

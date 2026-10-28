// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Capacite · Capacité et horaires) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-10/Capacite.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Capacité et horaires (prototype : Capacite) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Capacité et horaires")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que vous déclarez ici décide des colis qu’on vous envoie.")}
          </div>
        </div>
        <div className="p-tfhltl">
          <div className="p-yscrc8">
            {t("PLACES DE STOCKAGE")}
          </div>
          <div className="p-wxow1i">
            <button type="button" aria-label={t("Retirer une place")} className="p-ou1yyg">
              <Icone nom="minus" taille={22} className="p-emic6i" />
            </button>
            <div className="p-txto41">
              <div className="p-nu35xx">
                {"40"}
              </div>
              <div className="p-nyatr2">
                {t("places déclarées · 31 occupées")}
              </div>
            </div>
            <button type="button" aria-label={t("Ajouter une place")} className="p-n18gp0">
              <Icone nom="r-plus" taille={22} className="p-gqbtfa" />
            </button>
          </div>
          <div className="p-47w5eb">
            <div className="p-ku7dzd" />
          </div>
          <div className="p-0jgkhm">
            <div className="p-xc7iv4">
              <div className="p-egexjc">
                {"1"}
              </div>
              <div className="p-own8v2">
                {t("petit (S)")}
              </div>
            </div>
            <div className="p-xc7iv4">
              <div className="p-egexjc">
                {"2"}
              </div>
              <div className="p-own8v2">
                {t("moyen (M)")}
              </div>
            </div>
            <div className="p-xc7iv4">
              <div className="p-egexjc">
                {"5"}
              </div>
              <div className="p-own8v2">
                {t("encombrant (L)")}
              </div>
            </div>
            <div className="p-ysppsz">
              <div className="p-kxt3jo">
                {"✕"}
              </div>
              <div className="p-own8v2">
                {t("XL, hors gabarit")}
              </div>
            </div>
          </div>
          <div className="p-81u2s6">
            {t("Au-delà de 90 %, les nouveaux clients sont orientés vers un autre relais. Les retours déposés ne comptent pas dans vos places. Toute hausse de places est vérifiée lors d’une visite.")}
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-colis" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Accepter les encombrants")}
              </div>
              <div className="p-dfa05r">
                {t("Si vous les refusez, ils sont signalés dès la commande et ne vous sont jamais attribués")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Horaires d’ouverture")}
            </h2>
          </div>
          <div className="p-lxynlg">
            <span />
            <div className="p-h6lji0">
              <span>
                {t("6 h")}
              </span>
              <span>
                {t("12 h")}
              </span>
              <span>
                {t("18 h")}
              </span>
              <span>
                {t("22 h")}
              </span>
            </div>
          </div>
          <div className="p-ryy194">
            <span className="p-m4p7pl">
              {t("Lun.")}
            </span>
            <div className="p-hvhy64">
              <div className="p-s1houk">
                {t("8 h – 19 h")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-ryy194">
            <span className="p-m4p7pl">
              {t("Mar.")}
            </span>
            <div className="p-hvhy64">
              <div className="p-s1houk">
                {t("8 h – 19 h")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-aobem4">
            <span className="p-t8bz1l">
              {t("Mer.")}
            </span>
            <div className="p-hvhy64">
              <div className="p-s1houk">
                {t("8 h – 19 h")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-ryy194">
            <span className="p-m4p7pl">
              {t("Jeu.")}
            </span>
            <div className="p-hvhy64">
              <div className="p-s1houk">
                {t("8 h – 19 h")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-ryy194">
            <span className="p-m4p7pl">
              {t("Ven.")}
            </span>
            <div className="p-hvhy64">
              <div className="p-s1houk">
                {t("8 h – 19 h")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-ryy194">
            <span className="p-m4p7pl">
              {t("Sam.")}
            </span>
            <div className="p-hvhy64">
              <div className="p-ctu1jq">
                {t("9 h – 17 h")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-ryy194">
            <span className="p-m4p7pl">
              {t("Dim.")}
            </span>
            <div className="p-hvhy64">
              <span className="p-rkvtp4">
                {t("Fermé")}
              </span>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-bgyo12">
              <span className="p-p91l1v" />
            </button>
          </div>
          <div className="p-81u2s6">
            {t("Ces horaires s’affichent quand les clients choisissent leur relais, et les livreurs planifient dessus. Un écart constaté fait baisser la Ponctualité.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Pause déjeuner")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-horloge" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("13 h – 14 h")}
              </div>
              <div className="p-dfa05r">
                {t("Les clients la voient ; aucun livreur n’est envoyé à ce moment")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
        </div>
        <button type="button" className="p-ncx7qc">
          <Icone nom="check" taille={18} className="p-7dsggt" />
          {t("Enregistrer")}
        </button>
        <Link to={chemin("fermeture")} className="p-rbzobc">
          <Icone nom="r-fermeture" taille={18} className="p-emic6i" />
          {t("Fermer exceptionnellement")}
        </Link>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Capacité et horaires", Rendu: EtatDefaut },
]

export default function CapaciteProvisoire() {
  return <PageProvisoire route="capacite" etats={ETATS} />
}

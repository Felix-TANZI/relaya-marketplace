// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Notifications · Notifications) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-08/Notifications.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { usePreferences } from '../../../preferences'

/** Notifications (prototype : Notifications) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Notifications")}
          </h1>
          <div className="p-t2u0o2">
            {t("Un résumé le matin, puis un message seulement quand il faut agir.")}
          </div>
        </div>
        <div className="p-018ssc">
          <div className="p-9rmh6y">
            <div className="p-2ma8mc">
              {t("RÉSUMÉ DU MATIN · 7 H")}
            </div>
            <Icone nom="r-cloche" taille={19} className="p-l3w6sx" />
          </div>
          <div className="p-tkbi2p">
            <div className="p-x46ihd">
              <div className="p-wzc6ur">
                {"≈ 11"}
              </div>
              <div className="p-w6rvyz">
                {t("colis à recevoir")}
              </div>
            </div>
            <div className="p-x46ihd">
              <div className="p-wzc6ur">
                {"9"}
              </div>
              <div className="p-w6rvyz">
                {t("retraits attendus")}
              </div>
            </div>
            <div className="p-x46ihd">
              <div className="p-wzc6ur">
                {"1"}
              </div>
              <div className="p-w6rvyz">
                {t("renvoi")}
              </div>
            </div>
          </div>
          <div className="p-5g7m7p">
            {t("9 places libres ce matin. Bonne journée au guichet.")}
          </div>
        </div>
        <div className="p-yscrc8">
          {t("À TRAITER")}
        </div>
        <div className="p-yi6rkz">
          <div className="p-ek1p8z">
            <div className="p-i7mkvp">
              <Icone nom="r-camion" taille={19} className="p-672m16" />
            </div>
            <div className="p-lmo74g">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("Livreur dans ~12 min")}
                </div>
                <div className="p-07ygos">
                  {"09:48"}
                </div>
              </div>
              <div className="p-ke2wzq">
                {t("Mission M-4127 · 6 colis · 7 places à prévoir")}
              </div>
            </div>
            <span className="p-hjc8oj" />
          </div>
          <div className="p-92xvtp" />
          <div className="p-ek1p8z">
            <div className="p-8177t3">
              <Icone nom="r-annuler" taille={19} className="p-woejqv" />
            </div>
            <div className="p-lmo74g">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("Un colis à renvoyer")}
                </div>
                <div className="p-07ygos">
                  {"07:55"}
                </div>
              </div>
              <div className="p-ke2wzq">
                {t("BLV-40118 · à remettre au livreur de 14 h")}
              </div>
            </div>
            <span className="p-byvapn" />
          </div>
          <div className="p-92xvtp" />
          <div className="p-ek1p8z">
            <div className="p-llm0b3">
              <Icone nom="r-balance" taille={19} className="p-lhsznn" />
            </div>
            <div className="p-lmo74g">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("Photo demandée")}
                </div>
                <div className="p-07ygos">
                  {t("hier")}
                </div>
              </div>
              <div className="p-ke2wzq">
                {t("LT-0912 · ajoutez une photo de l’étiquette")}
              </div>
            </div>
            <span className="p-hjc8oj" />
          </div>
        </div>
        <div className="p-yscrc8">
          {t("POUR INFORMATION")}
        </div>
        <div className="p-yi6rkz">
          <div className="p-ek1p8z">
            <div className="p-me0s4z">
              <Icone nom="r-carte-paiement" taille={19} className="p-q7qjlz" />
            </div>
            <div className="p-lmo74g">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("Versement envoyé")}
                </div>
                <div className="p-07ygos">
                  {t("ven.")}
                </div>
              </div>
              <div className="p-ke2wzq">
                {t("Voir le détail · réf. BLV-VP-2281")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-ek1p8z">
            <div className="p-llm0b3">
              <Icone nom="r-alerte" taille={19} className="p-lhsznn" />
            </div>
            <div className="p-lmo74g">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("Seuil proche")}
                </div>
                <div className="p-07ygos">
                  {t("mar.")}
                </div>
              </div>
              <div className="p-ke2wzq">
                {t("Trust Score 72 : à 2 points du seuil de 70 (Confirmé)")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-ek1p8z">
            <div className="p-ldeopk">
              <Icone nom="r-bouclier" taille={19} className="p-rd23br" />
            </div>
            <div className="p-lmo74g">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("Trust Score +2")}
                </div>
                <div className="p-07ygos">
                  {t("lun.")}
                </div>
              </div>
              <div className="p-ke2wzq">
                {t("Aucune réserve sur vos 30 derniers colis")}
              </div>
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Réglages")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-cloche" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Notifications push")}
              </div>
              <div className="p-dfa05r">
                {t("Gratuites, pour tout ce qui est à faire")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-camion" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Livreur en approche")}
              </div>
              <div className="p-dfa05r">
                {t("15 min avant son arrivée")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-carte-paiement" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Versements")}
              </div>
              <div className="p-dfa05r">
                {t("Envoi ou refus, sans montant : le détail est dans l’app")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-horloge" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Heure du résumé")}
              </div>
              <div className="p-dfa05r">
                {t("Réglable, jamais avant 7 h")}
              </div>
            </div>
            <span className="p-rpzy79">
              {t("7 h 00")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-lune" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Heures calmes")}
              </div>
              <div className="p-dfa05r">
                {t("Rien entre 22 h et 7 h, sauf l’urgent")}
              </div>
            </div>
            <span className="p-rpzy79">
              {t("22 h – 7 h")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-bouclier" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Score et sanctions")}
              </div>
              <div className="p-dfa05r">
                {t("Alerte avant un seuil, sanction ou descente proposée, avec « Contester »")}
              </div>
            </div>
            <span className="p-rpzy79">
              {t("Toujours")}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Notifications", Rendu: EtatDefaut },
]

export default function NotificationsProvisoire() {
  return <PageProvisoire route="notifications" etats={ETATS} />
}

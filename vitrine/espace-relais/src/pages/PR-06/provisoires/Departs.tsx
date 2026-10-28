// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Departs · À faire partir) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-06/Departs.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { usePreferences } from '../../../preferences'
import { ENTREPRISE } from '../../../demo/jeu-essai'

/** Départs et collecte (prototype : Departs · {"dp":"out"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("À faire partir")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que le livreur emporte : renvois, retours, transferts, refus.")}
          </div>
        </div>
        <div className="p-tybbfp">
          <div className="p-1qyup6">
            <Icone nom="r-camion" taille={26} className="p-v08d0o" />
          </div>
          <div className="p-lmo74g">
            <div className="p-ch33fq">
              {t("PROCHAINE COLLECTE")}
            </div>
            <div className="p-fdt7cn">
              {t("Aujourd’hui · 14 h")}
            </div>
            <div className="p-yz5dyd">
              {tf("{e} · 3 colis à remettre", { e: ENTREPRISE })}
            </div>
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-h01hlk">
            {t("À remettre 3")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Collectes")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Partis")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-9rmh6y">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">
                {t("Scannez en sortie")}
              </h2>
            </div>
            <span className="p-t8bz1l">
              {"1 / 3"}
            </span>
          </div>
          <button type="button" className="p-2i75mg">
            <div className="p-hwk5jv">
              <Icone nom="check" taille={18} trait={2.4} className="p-q7qjlz" />
            </div>
            <div className="p-j419vo">
              {t("A-01")}
            </div>
            <div>
              <div className="p-sj6gna">
                {t("BLV-40118")}
              </div>
              <div className="p-46lk2m">
                {t("non retiré (J8) → vendeur")}
              </div>
            </div>
            <span className="p-ekng8o">
              {t("Renvoi")}
            </span>
          </button>
          <div className="p-92xvtp" />
          <button type="button" className="p-2i75mg">
            <div className="p-a38490" />
            <div className="p-j419vo">
              {t("R-01")}
            </div>
            <div>
              <div className="p-sj6gna">
                {t("RT-2231")}
              </div>
              <div className="p-46lk2m">
                {t("retour scellé → vendeur")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Retour")}
            </span>
          </button>
          <div className="p-92xvtp" />
          <button type="button" className="p-2i75mg">
            <div className="p-a38490" />
            <div className="p-j419vo">
              {t("A-11")}
            </div>
            <div>
              <div className="p-sj6gna">
                {t("BLV-40199")}
              </div>
              <div className="p-46lk2m">
                {t("client a changé de relais → Nkolbisson")}
              </div>
            </div>
            <span className="p-rpzy79">
              {t("Transfert")}
            </span>
          </button>
          <div className="p-81u2s6">
            {t("Touchez chaque colis en le tendant au livreur. Il confirme sur son téléphone : la garde lui passe.")}
          </div>
          <button type="button" className="p-ncx7qc">
            <Icone nom="check" taille={18} className="p-7dsggt" />
            {t("Valider la sortie")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Pourquoi un colis part")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Non retiré en 7 jours (J8)")}
            </span>
            <span className="p-2vq92h">
              {t("renvoi, 500 F client")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Retour validé déposé")}
            </span>
            <span className="p-2vq92h">
              {t("vers le vendeur")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Client change de relais")}
            </span>
            <span className="p-2vq92h">
              {t("transfert, 400 F client")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Refus au comptoir")}
            </span>
            <span className="p-2vq92h">
              {t("après constat ou annulation")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Fermeture déclarée")}
            </span>
            <span className="p-2vq92h">
              {t("vers le relais voisin")}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

/** Collectes prévues (prototype : Departs · {"dp":"plan"}) — ?etat=plan */
export function EtatPlan() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("À faire partir")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que le livreur emporte : renvois, retours, transferts, refus.")}
          </div>
        </div>
        <div className="p-tybbfp">
          <div className="p-1qyup6">
            <Icone nom="r-camion" taille={26} className="p-v08d0o" />
          </div>
          <div className="p-lmo74g">
            <div className="p-ch33fq">
              {t("PROCHAINE COLLECTE")}
            </div>
            <div className="p-fdt7cn">
              {t("Aujourd’hui · 14 h")}
            </div>
            <div className="p-yz5dyd">
              {tf("{e} · 3 colis à remettre", { e: ENTREPRISE })}
            </div>
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("À remettre 3")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Collectes")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Partis")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Collectes et livraisons prévues")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-camion" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {tf("Aujourd’hui 14 h · {e}", { e: ENTREPRISE })}
              </div>
              <div className="p-dfa05r">
                {t("Dépose ≈ 5 colis · reprend 3 colis")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-camion" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Jeudi 24 · 10 h · Taty’s")}
              </div>
              <div className="p-dfa05r">
                {t("Dépose ≈ 8 colis")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-camion" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {tf("Jeudi 24 · 16 h · {e}", { e: ENTREPRISE })}
              </div>
              <div className="p-dfa05r">
                {t("Dépose ≈ 4 colis · reprend les départs du jour")}
              </div>
            </div>
          </div>
          <div className="p-gh7puf">
            <Icone nom="r-couches" taille={18} className="p-672m16" />
            <div>
              {t("Les entreprises de livraison choisissent leurs tournées ; BelivaY groupe les colis pour qu’un passage serve à la fois à déposer et à reprendre.")}
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Pourquoi un colis part")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Non retiré en 7 jours (J8)")}
            </span>
            <span className="p-2vq92h">
              {t("renvoi, 500 F client")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Retour validé déposé")}
            </span>
            <span className="p-2vq92h">
              {t("vers le vendeur")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Client change de relais")}
            </span>
            <span className="p-2vq92h">
              {t("transfert, 400 F client")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Refus au comptoir")}
            </span>
            <span className="p-2vq92h">
              {t("après constat ou annulation")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Fermeture déclarée")}
            </span>
            <span className="p-2vq92h">
              {t("vers le relais voisin")}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

/** Colis partis (prototype : Departs · {"dp":"done"}) — ?etat=done */
export function EtatDone() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("À faire partir")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que le livreur emporte : renvois, retours, transferts, refus.")}
          </div>
        </div>
        <div className="p-tybbfp">
          <div className="p-1qyup6">
            <Icone nom="r-camion" taille={26} className="p-v08d0o" />
          </div>
          <div className="p-lmo74g">
            <div className="p-ch33fq">
              {t("PROCHAINE COLLECTE")}
            </div>
            <div className="p-fdt7cn">
              {t("Aujourd’hui · 14 h")}
            </div>
            <div className="p-yz5dyd">
              {tf("{e} · 3 colis à remettre", { e: ENTREPRISE })}
            </div>
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("À remettre 3")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Collectes")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Partis")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Partis cette semaine")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="check" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Mar. 22 · 16 h · 2 colis")}
              </div>
              <div className="p-dfa05r">
                {t("BLV-40022 renvoi · RT-2204 retour · confirmés par le livreur")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Signé")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="check" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Lun. 21 · 14 h · 1 colis")}
              </div>
              <div className="p-dfa05r">
                {t("BLV-39987 transfert → Mvog-Mbi")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Signé")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Pourquoi un colis part")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Non retiré en 7 jours (J8)")}
            </span>
            <span className="p-2vq92h">
              {t("renvoi, 500 F client")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Retour validé déposé")}
            </span>
            <span className="p-2vq92h">
              {t("vers le vendeur")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Client change de relais")}
            </span>
            <span className="p-2vq92h">
              {t("transfert, 400 F client")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Refus au comptoir")}
            </span>
            <span className="p-2vq92h">
              {t("après constat ou annulation")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Fermeture déclarée")}
            </span>
            <span className="p-2vq92h">
              {t("vers le relais voisin")}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Départs et collecte", Rendu: EtatDefaut },
  { id: "plan", libelle: "Collectes prévues", Rendu: EtatPlan },
  { id: "done", libelle: "Colis partis", Rendu: EtatDone },
]

export default function DepartsProvisoire() {
  return <PageProvisoire route="departs" etats={ETATS} />
}

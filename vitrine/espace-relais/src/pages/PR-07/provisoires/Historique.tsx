// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Historique · Historique) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-07/Historique.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'
import { ENTREPRISE } from '../../../demo/jeu-essai'

/** Historique (prototype : Historique) — ?etat=defaut */
export function EtatDefaut() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <label className="p-fyp9fi">
          <Icone nom="r-recherche" taille={19} className="p-672m16" />
          <input type="text" placeholder={t("N° de commande, de colis ou de retour")} className="p-zg9k0q" />
        </label>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("Aujourd’hui")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("7 jours")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("30 jours")}
          </button>
        </div>
        <div className="p-3j2860">
          <div className="p-8eqm49">
            <div className="p-wzc6ur">
              {"58"}
            </div>
            <div className="p-own8v2">
              {t("reçus")}
            </div>
          </div>
          <div className="p-fhd77n">
            <div className="p-4o2c56">
              {"41"}
            </div>
            <div className="p-own8v2">
              {t("remis")}
            </div>
          </div>
          <div className="p-fhd77n">
            <div className="p-wzc6ur">
              {"2"}
            </div>
            <div className="p-own8v2">
              {t("retours")}
            </div>
          </div>
          <div className="p-fhd77n">
            <div className="p-d53iku">
              {"1"}
            </div>
            <div className="p-own8v2">
              {t("constats")}
            </div>
          </div>
        </div>
        <div className="p-8dmjde">
          <span className="p-rpzy79">
            {t("Tous")}
          </span>
          <span className="p-6z26dm">
            {t("Réceptions")}
          </span>
          <span className="p-6z26dm">
            {t("Remises")}
          </span>
          <span className="p-6z26dm">
            {t("Départs")}
          </span>
          <span className="p-6z26dm">
            {t("Retours")}
          </span>
          <span className="p-6z26dm">
            {t("Constats")}
          </span>
        </div>
        <div className="p-yi6rkz">
          <div className="p-yscrc8">
            {t("MERCREDI 23 SEPTEMBRE")}
          </div>
          <div className="p-fkc6m2">
            <div className="p-7o0fo7">
              {"09:42"}
            </div>
            <div className="p-py0ju2">
              <span className="p-l4ui7p" />
              <span className="p-oxoo73" />
            </div>
            <Link to={chemin("colis")} className="p-62xtzw">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("BLV-40231 remis")}
                </div>
                <span className="p-nax3x4">
                  {t("Remis")}
                </span>
              </div>
              <div className="p-dfa05r">
                {t("B-04 · « Tout est en ordre » · photo · 400 F payés en MoMo")}
              </div>
            </Link>
          </div>
          <div className="p-fkc6m2">
            <div className="p-7o0fo7">
              {"09:10"}
            </div>
            <div className="p-py0ju2">
              <span className="p-l4ui7p" />
              <span className="p-oxoo73" />
            </div>
            <Link to={chemin("colis")} className="p-62xtzw">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("BLV-40207 remis")}
                </div>
                <span className="p-nax3x4">
                  {t("Remis")}
                </span>
              </div>
              <div className="p-dfa05r">
                {t("A-11 · retiré par un tiers, nom transmis au client")}
              </div>
            </Link>
          </div>
          <div className="p-fkc6m2">
            <div className="p-7o0fo7">
              {"08:31"}
            </div>
            <div className="p-py0ju2">
              <span className="p-of11wh" />
              <span className="p-oxoo73" />
            </div>
            <Link to={chemin("colis")} className="p-62xtzw">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("Lot M-4119 reçu")}
                </div>
                <span className="p-rpzy79">
                  {t("Reçu")}
                </span>
              </div>
              <div className="p-dfa05r">
                {tf("5 colis · code de dépôt · 5 scellés intacts · {e}", { e: ENTREPRISE })}
              </div>
            </Link>
          </div>
          <div className="p-fkc6m2">
            <div className="p-7o0fo7">
              {"07:55"}
            </div>
            <div className="p-py0ju2">
              <span className="p-n0qstt" />
              <span className="p-oxoo73" />
            </div>
            <Link to={chemin("colis")} className="p-62xtzw">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("BLV-40118 renvoi préparé")}
                </div>
                <span className="p-ekng8o">
                  {t("Départ")}
                </span>
              </div>
              <div className="p-dfa05r">
                {t("Non retiré en 7 jours · collecte de 14 h")}
              </div>
            </Link>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-yscrc8">
            {t("MARDI 22 SEPTEMBRE")}
          </div>
          <div className="p-fkc6m2">
            <div className="p-7o0fo7">
              {"17:20"}
            </div>
            <div className="p-py0ju2">
              <span className="p-6208vl" />
              <span className="p-oxoo73" />
            </div>
            <Link to={chemin("colis")} className="p-62xtzw">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("RT-2231 retour déposé")}
                </div>
                <span className="p-rpzy79">
                  {t("Retour")}
                </span>
              </div>
              <div className="p-dfa05r">
                {t("Étiquette scannée · motif validé : abîmé · scellé posé, 2 photos")}
              </div>
            </Link>
          </div>
          <div className="p-fkc6m2">
            <div className="p-7o0fo7">
              {"16:02"}
            </div>
            <div className="p-py0ju2">
              <span className="p-ynnbhb" />
              <span className="p-oxoo73" />
            </div>
            <Link to={chemin("colis")} className="p-62xtzw">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("2 colis partis")}
                </div>
                <span className="p-6z26dm">
                  {t("Départ")}
                </span>
              </div>
              <div className="p-dfa05r">
                {tf("Collecte {e} · signée par le livreur", { e: ENTREPRISE })}
              </div>
            </Link>
          </div>
          <div className="p-fkc6m2">
            <div className="p-7o0fo7">
              {"15:02"}
            </div>
            <div className="p-py0ju2">
              <span className="p-11478p" />
              <span className="p-oxoo73" />
            </div>
            <Link to={chemin("colis")} className="p-62xtzw">
              <div className="p-bxuikp">
                <div className="p-dfc4i3">
                  {t("LT-0912 constat envoyé")}
                </div>
                <span className="p-h4wlx0">
                  {t("Constat")}
                </span>
              </div>
              <div className="p-dfa05r">
                {t("Non conforme · 2 photos · gardé sans frais")}
              </div>
            </Link>
          </div>
        </div>
        <button type="button" className="p-rbzobc">
          <Icone nom="r-telecharger" taille={18} className="p-emic6i" />
          {t("Exporter la période")}
        </button>
        <div className="p-16950n">
          {t("Chaque opération garde ses preuves (heure, photo, emplacement, personne du guichet) pendant 180 jours. Vous pouvez les consulter et les exporter ; elles ne se modifient jamais.")}
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Historique", Rendu: EtatDefaut },
]

export default function HistoriqueProvisoire() {
  return <PageProvisoire route="historique" etats={ETATS} />
}

// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Stock · Stock et emplacements) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-06/Stock.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Stock et emplacements (prototype : Stock · {"tb":"urg"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Colis en stock")}
          </h1>
          <div className="p-t2u0o2">
            {t("22 colis · 31 places sur 40")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-f623oo">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">
                {t("Plan des étagères")}
              </h2>
            </div>
            <div className="p-q0l0xx">
              {"78 %"}
            </div>
          </div>
          <div className="p-yscrc8">
            {t("ÉTAGÈRE A · PETITS (1 PLACE)")}
          </div>
          <div className="p-dwkjr6">
            <Link to={chemin("colis")} className="p-8orn7h">
              {t("A1")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A2")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A3")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A4")}
            </Link>
            <Link to={chemin("colis")} className="p-fzcjrl">
              {t("A5")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A6")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A7")}
            </Link>
            <Link to={chemin("colis")} className="p-nzpez2">
              {t("A8")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A9")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A10")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A11")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A12")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A13")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A14")}
            </Link>
            <Link to={chemin("colis")} className="p-nzpez2">
              {t("A15")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A16")}
            </Link>
          </div>
          <div className="p-yscrc8">
            {t("ÉTAGÈRE B · MOYENS (2 PLACES)")}
          </div>
          <div className="p-ibectq">
            <Link to={chemin("colis")} className="p-fzcjrl">
              {t("B1")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("B2")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("B3")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("B4")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("B5")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("B6")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("B7")}
            </Link>
          </div>
          <div className="p-yscrc8">
            {t("SOL C · ENCOMBRANTS (5 PLACES)")}
          </div>
          <div className="p-fha0sl">
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("C1")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("C2")}
            </Link>
          </div>
          <div className="p-8dmjde">
            <span className="p-ekng8o">
              {t("À renvoyer")}
            </span>
            <span className="p-h4wlx0">
              {t("Dernier jour")}
            </span>
            <span className="p-yw05h9">
              {t("Garde payante")}
            </span>
            <span className="p-rpzy79">
              {t("Groupage")}
            </span>
            <span className="p-nax3x4">
              {t("Gratuit")}
            </span>
          </div>
          <div className="p-81u2s6">
            {t("Touchez une case pour ouvrir le colis. À 90 %, BelivaY cesse d’envoyer de nouveaux colis ici.")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-h01hlk">
            {t("Urgents 3")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Payants 8")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Groupage 2")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Gratuits 9")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("A-01")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40118")}
              </div>
              <div className="p-t1lapd">
                {t("petit · 8e jour · part à 14 h")}
              </div>
            </div>
            <span className="p-ekng8o">
              {t("À renvoyer")}
            </span>
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("B-01")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40152")}
              </div>
              <div className="p-t1lapd">
                {t("moyen · 7e jour · 1 400 F")}
              </div>
            </div>
            <span className="p-h4wlx0">
              {t("Dernier jour")}
            </span>
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("A-05")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40160")}
              </div>
              <div className="p-t1lapd">
                {t("petit · 7e jour · 1 400 F")}
              </div>
            </div>
            <span className="p-h4wlx0">
              {t("Dernier jour")}
            </span>
          </Link>
        </div>
        <div className="p-26n637">
          <div className="p-xmy0fy">
            {t("LA GRILLE DE GARDE")}
          </div>
          <div className="p-0jgkhm">
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J1")}
              </div>
              <div className="p-xnxtpi">
                {t("0 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J2–J3")}
              </div>
              <div className="p-4sfgcn">
                {t("100 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J4–J5")}
              </div>
              <div className="p-4sfgcn">
                {t("200 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J6–J7")}
              </div>
              <div className="p-3hgrs4">
                {t("400 F")}
              </div>
            </div>
            <div className="p-6fksbw">
              <div className="p-60x9ee">
                {t("J8")}
              </div>
              <div className="p-38tfl1">
                {t("renvoi + 500 F")}
              </div>
            </div>
          </div>
          <div className="p-yz5dyd">
            {t("Vous touchez")}
            {' '}
            <strong className="p-ipp0fd">
              {t("100 F par jour facturé")}
            </strong>
            {t(", jours offerts aux abonnés compris (payés par BelivaY). Encombrant : garde doublée, pas le renvoi. Jamais facturés : fermeture, avis non vu, dossier en cours, groupage ; garde plafonnée à la valeur du colis. Rappel daté au client à la fin des J1, J3 et J5, puis le J7.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Onglet payants (prototype : Stock · {"tb":"pay"}) — ?etat=pay */
export function EtatPay() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Colis en stock")}
          </h1>
          <div className="p-t2u0o2">
            {t("22 colis · 31 places sur 40")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-f623oo">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">
                {t("Plan des étagères")}
              </h2>
            </div>
            <div className="p-q0l0xx">
              {"78 %"}
            </div>
          </div>
          <div className="p-yscrc8">
            {t("ÉTAGÈRE A · PETITS (1 PLACE)")}
          </div>
          <div className="p-dwkjr6">
            <Link to={chemin("colis")} className="p-8orn7h">
              {t("A1")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A2")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A3")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A4")}
            </Link>
            <Link to={chemin("colis")} className="p-fzcjrl">
              {t("A5")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A6")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A7")}
            </Link>
            <Link to={chemin("colis")} className="p-nzpez2">
              {t("A8")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A9")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A10")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A11")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A12")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A13")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A14")}
            </Link>
            <Link to={chemin("colis")} className="p-nzpez2">
              {t("A15")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A16")}
            </Link>
          </div>
          <div className="p-yscrc8">
            {t("ÉTAGÈRE B · MOYENS (2 PLACES)")}
          </div>
          <div className="p-ibectq">
            <Link to={chemin("colis")} className="p-fzcjrl">
              {t("B1")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("B2")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("B3")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("B4")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("B5")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("B6")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("B7")}
            </Link>
          </div>
          <div className="p-yscrc8">
            {t("SOL C · ENCOMBRANTS (5 PLACES)")}
          </div>
          <div className="p-fha0sl">
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("C1")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("C2")}
            </Link>
          </div>
          <div className="p-8dmjde">
            <span className="p-ekng8o">
              {t("À renvoyer")}
            </span>
            <span className="p-h4wlx0">
              {t("Dernier jour")}
            </span>
            <span className="p-yw05h9">
              {t("Garde payante")}
            </span>
            <span className="p-rpzy79">
              {t("Groupage")}
            </span>
            <span className="p-nax3x4">
              {t("Gratuit")}
            </span>
          </div>
          <div className="p-81u2s6">
            {t("Touchez une case pour ouvrir le colis. À 90 %, BelivaY cesse d’envoyer de nouveaux colis ici.")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("Urgents 3")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Payants 8")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Groupage 2")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Gratuits 9")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("B-04")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40231")}
              </div>
              <div className="p-t1lapd">
                {t("moyen · 4e jour · 400 F")}
              </div>
            </div>
            <span className="p-yw05h9">
              {t("Payant")}
            </span>
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("A-09")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40244")}
              </div>
              <div className="p-t1lapd">
                {t("petit · 5e jour · 600 F")}
              </div>
            </div>
            <span className="p-yw05h9">
              {t("Payant")}
            </span>
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("A-12")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40247")}
              </div>
              <div className="p-t1lapd">
                {t("petit · 4e jour · 400 F")}
              </div>
            </div>
            <span className="p-yw05h9">
              {t("Payant")}
            </span>
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("A-06")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40281")}
              </div>
              <div className="p-t1lapd">
                {t("petit · 2e jour · 100 F")}
              </div>
            </div>
            <span className="p-yw05h9">
              {t("Payant")}
            </span>
          </Link>
          <div className="p-nll9kf">
            {t("+ 4 autres colis payants")}
          </div>
        </div>
        <div className="p-26n637">
          <div className="p-xmy0fy">
            {t("LA GRILLE DE GARDE")}
          </div>
          <div className="p-0jgkhm">
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J1")}
              </div>
              <div className="p-xnxtpi">
                {t("0 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J2–J3")}
              </div>
              <div className="p-4sfgcn">
                {t("100 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J4–J5")}
              </div>
              <div className="p-4sfgcn">
                {t("200 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J6–J7")}
              </div>
              <div className="p-3hgrs4">
                {t("400 F")}
              </div>
            </div>
            <div className="p-6fksbw">
              <div className="p-60x9ee">
                {t("J8")}
              </div>
              <div className="p-38tfl1">
                {t("renvoi + 500 F")}
              </div>
            </div>
          </div>
          <div className="p-yz5dyd">
            {t("Vous touchez")}
            {' '}
            <strong className="p-ipp0fd">
              {t("100 F par jour facturé")}
            </strong>
            {t(", jours offerts aux abonnés compris (payés par BelivaY). Encombrant : garde doublée, pas le renvoi. Jamais facturés : fermeture, avis non vu, dossier en cours, groupage ; garde plafonnée à la valeur du colis. Rappel daté au client à la fin des J1, J3 et J5, puis le J7.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Onglet groupage (prototype : Stock · {"tb":"grp"}) — ?etat=grp */
export function EtatGrp() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Colis en stock")}
          </h1>
          <div className="p-t2u0o2">
            {t("22 colis · 31 places sur 40")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-f623oo">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">
                {t("Plan des étagères")}
              </h2>
            </div>
            <div className="p-q0l0xx">
              {"78 %"}
            </div>
          </div>
          <div className="p-yscrc8">
            {t("ÉTAGÈRE A · PETITS (1 PLACE)")}
          </div>
          <div className="p-dwkjr6">
            <Link to={chemin("colis")} className="p-8orn7h">
              {t("A1")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A2")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A3")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A4")}
            </Link>
            <Link to={chemin("colis")} className="p-fzcjrl">
              {t("A5")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A6")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A7")}
            </Link>
            <Link to={chemin("colis")} className="p-nzpez2">
              {t("A8")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A9")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A10")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A11")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A12")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A13")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A14")}
            </Link>
            <Link to={chemin("colis")} className="p-nzpez2">
              {t("A15")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A16")}
            </Link>
          </div>
          <div className="p-yscrc8">
            {t("ÉTAGÈRE B · MOYENS (2 PLACES)")}
          </div>
          <div className="p-ibectq">
            <Link to={chemin("colis")} className="p-fzcjrl">
              {t("B1")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("B2")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("B3")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("B4")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("B5")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("B6")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("B7")}
            </Link>
          </div>
          <div className="p-yscrc8">
            {t("SOL C · ENCOMBRANTS (5 PLACES)")}
          </div>
          <div className="p-fha0sl">
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("C1")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("C2")}
            </Link>
          </div>
          <div className="p-8dmjde">
            <span className="p-ekng8o">
              {t("À renvoyer")}
            </span>
            <span className="p-h4wlx0">
              {t("Dernier jour")}
            </span>
            <span className="p-yw05h9">
              {t("Garde payante")}
            </span>
            <span className="p-rpzy79">
              {t("Groupage")}
            </span>
            <span className="p-nax3x4">
              {t("Gratuit")}
            </span>
          </div>
          <div className="p-81u2s6">
            {t("Touchez une case pour ouvrir le colis. À 90 %, BelivaY cesse d’envoyer de nouveaux colis ici.")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("Urgents 3")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Payants 8")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Groupage 2")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Gratuits 9")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("A-08")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40270")}
              </div>
              <div className="p-t1lapd">
                {t("petit · liste groupée · remise le 2 oct.")}
              </div>
            </div>
            <span className="p-rpzy79">
              {t("Groupage")}
            </span>
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("A-15")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40276")}
              </div>
              <div className="p-t1lapd">
                {t("petit · liste groupée · remise le 2 oct.")}
              </div>
            </div>
            <span className="p-rpzy79">
              {t("Groupage")}
            </span>
          </Link>
          <div className="p-gh7puf">
            <Icone nom="r-couches" taille={18} className="p-672m16" />
            <div>
              {t("Colis d’une liste d’envies : gardé")}
              {' '}
              <strong>
                {t("sans frais")}
              </strong>
              {' '}
              {t("jusqu’à la libération du groupe (date cible, 21 jours après le paiement du premier cadeau, ou « Démarrer maintenant »). Le client n’a pas encore de code. Ensuite, la franchise du propriétaire de la liste s’applique.")}
            </div>
          </div>
        </div>
        <div className="p-26n637">
          <div className="p-xmy0fy">
            {t("LA GRILLE DE GARDE")}
          </div>
          <div className="p-0jgkhm">
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J1")}
              </div>
              <div className="p-xnxtpi">
                {t("0 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J2–J3")}
              </div>
              <div className="p-4sfgcn">
                {t("100 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J4–J5")}
              </div>
              <div className="p-4sfgcn">
                {t("200 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J6–J7")}
              </div>
              <div className="p-3hgrs4">
                {t("400 F")}
              </div>
            </div>
            <div className="p-6fksbw">
              <div className="p-60x9ee">
                {t("J8")}
              </div>
              <div className="p-38tfl1">
                {t("renvoi + 500 F")}
              </div>
            </div>
          </div>
          <div className="p-yz5dyd">
            {t("Vous touchez")}
            {' '}
            <strong className="p-ipp0fd">
              {t("100 F par jour facturé")}
            </strong>
            {t(", jours offerts aux abonnés compris (payés par BelivaY). Encombrant : garde doublée, pas le renvoi. Jamais facturés : fermeture, avis non vu, dossier en cours, groupage ; garde plafonnée à la valeur du colis. Rappel daté au client à la fin des J1, J3 et J5, puis le J7.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Onglet gratuits (prototype : Stock · {"tb":"free"}) — ?etat=free */
export function EtatFree() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Colis en stock")}
          </h1>
          <div className="p-t2u0o2">
            {t("22 colis · 31 places sur 40")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-f623oo">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">
                {t("Plan des étagères")}
              </h2>
            </div>
            <div className="p-q0l0xx">
              {"78 %"}
            </div>
          </div>
          <div className="p-yscrc8">
            {t("ÉTAGÈRE A · PETITS (1 PLACE)")}
          </div>
          <div className="p-dwkjr6">
            <Link to={chemin("colis")} className="p-8orn7h">
              {t("A1")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A2")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A3")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A4")}
            </Link>
            <Link to={chemin("colis")} className="p-fzcjrl">
              {t("A5")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A6")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A7")}
            </Link>
            <Link to={chemin("colis")} className="p-nzpez2">
              {t("A8")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A9")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A10")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A11")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A12")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A13")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("A14")}
            </Link>
            <Link to={chemin("colis")} className="p-nzpez2">
              {t("A15")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("A16")}
            </Link>
          </div>
          <div className="p-yscrc8">
            {t("ÉTAGÈRE B · MOYENS (2 PLACES)")}
          </div>
          <div className="p-ibectq">
            <Link to={chemin("colis")} className="p-fzcjrl">
              {t("B1")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("B2")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("B3")}
            </Link>
            <Link to={chemin("colis")} className="p-dwl9ry">
              {t("B4")}
            </Link>
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("B5")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("B6")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("B7")}
            </Link>
          </div>
          <div className="p-yscrc8">
            {t("SOL C · ENCOMBRANTS (5 PLACES)")}
          </div>
          <div className="p-fha0sl">
            <Link to={chemin("colis")} className="p-e57rxt">
              {t("C1")}
            </Link>
            <Link to={chemin("colis")} className="p-dg5xf2">
              {t("C2")}
            </Link>
          </div>
          <div className="p-8dmjde">
            <span className="p-ekng8o">
              {t("À renvoyer")}
            </span>
            <span className="p-h4wlx0">
              {t("Dernier jour")}
            </span>
            <span className="p-yw05h9">
              {t("Garde payante")}
            </span>
            <span className="p-rpzy79">
              {t("Groupage")}
            </span>
            <span className="p-nax3x4">
              {t("Gratuit")}
            </span>
          </div>
          <div className="p-81u2s6">
            {t("Touchez une case pour ouvrir le colis. À 90 %, BelivaY cesse d’envoyer de nouveaux colis ici.")}
          </div>
        </div>
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("Urgents 3")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Payants 8")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Groupage 2")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Gratuits 9")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("A-03")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40288")}
              </div>
              <div className="p-t1lapd">
                {t("petit · abonné Prime · gratuit jusqu’au 25 sept.")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Gratuit")}
            </span>
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("C-01")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40290")}
              </div>
              <div className="p-t1lapd">
                {t("encombrant · 1er jour")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Gratuit")}
            </span>
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("colis")} className="p-bqlgt9">
            <div className="p-utsv4v">
              {t("B-02")}
            </div>
            <div className="p-lmo74g">
              <div className="p-hz5rr5">
                {t("BLV-40295")}
              </div>
              <div className="p-t1lapd">
                {t("moyen · 1er jour · remplacement")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Gratuit")}
            </span>
          </Link>
          <div className="p-nll9kf">
            {t("+ 6 autres colis gratuits")}
          </div>
        </div>
        <div className="p-26n637">
          <div className="p-xmy0fy">
            {t("LA GRILLE DE GARDE")}
          </div>
          <div className="p-0jgkhm">
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J1")}
              </div>
              <div className="p-xnxtpi">
                {t("0 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J2–J3")}
              </div>
              <div className="p-4sfgcn">
                {t("100 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J4–J5")}
              </div>
              <div className="p-4sfgcn">
                {t("200 F")}
              </div>
            </div>
            <div className="p-nh2jfo">
              <div className="p-60x9ee">
                {t("J6–J7")}
              </div>
              <div className="p-3hgrs4">
                {t("400 F")}
              </div>
            </div>
            <div className="p-6fksbw">
              <div className="p-60x9ee">
                {t("J8")}
              </div>
              <div className="p-38tfl1">
                {t("renvoi + 500 F")}
              </div>
            </div>
          </div>
          <div className="p-yz5dyd">
            {t("Vous touchez")}
            {' '}
            <strong className="p-ipp0fd">
              {t("100 F par jour facturé")}
            </strong>
            {t(", jours offerts aux abonnés compris (payés par BelivaY). Encombrant : garde doublée, pas le renvoi. Jamais facturés : fermeture, avis non vu, dossier en cours, groupage ; garde plafonnée à la valeur du colis. Rappel daté au client à la fin des J1, J3 et J5, puis le J7.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Stock et emplacements", Rendu: EtatDefaut },
  { id: "pay", libelle: "Onglet payants", Rendu: EtatPay },
  { id: "grp", libelle: "Onglet groupage", Rendu: EtatGrp },
  { id: "free", libelle: "Onglet gratuits", Rendu: EtatFree },
]

export default function StockProvisoire() {
  return <PageProvisoire route="stock" etats={ETATS} />
}

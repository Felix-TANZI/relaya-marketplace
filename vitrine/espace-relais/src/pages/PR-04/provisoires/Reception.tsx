// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Reception · Réception d’un lot) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-04/Reception.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'
import { ENTREPRISE } from '../../../demo/jeu-essai'

/** Réception d’un lot (prototype : Reception · {"st":"scan"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-pkdjgs">
          <div className="p-7w9kja">
            <div className="p-7yh7mn">
              <div className="p-gxaql2">
                <span className="p-l3xhlr">
                  {"1"}
                </span>
                <span className="p-9vimvn">
                  {t("Code")}
                </span>
              </div>
              <div className="p-gxaql2">
                <span className="p-lw9at8">
                  {"2"}
                </span>
                <span className="p-9vimvn">
                  {t("Contrôler")}
                </span>
              </div>
              <div className="p-gxaql2">
                <span className="p-lw9at8">
                  {"3"}
                </span>
                <span className="p-9vimvn">
                  {t("Valider")}
                </span>
              </div>
            </div>
            <div className="p-g1lvka">
              <div className="p-5oo8u7">
                <Icone nom="r-cle" taille={44} trait={1.6} className="p-v08d0o" />
              </div>
              <div className="p-lmo74g">
                <div className="p-bbwgsw">
                  {t("Saisissez le code de dépôt")}
                </div>
                <div className="p-avwyd0">
                  {t("6 chiffres donnés par le livreur. Pas de code, pas de lot.")}
                </div>
                <button type="button" className="p-za2bvv">
                  <Icone nom="r-cle" taille={17} className="p-7dsggt" />
                  {t("Saisir le code")}
                </button>
                <Link to={chemin("aide")} className="p-tbdu5s">
                  {t("Le livreur n’a pas de code ?")}
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-cadenas" taille={18} className="p-672m16" />
          <div>
            {t("Vous ne voyez jamais le vendeur ni le client : uniquement la référence BelivaY, la taille et l’emplacement.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Contrôle du lot (prototype : Reception · {"st":"check"}) — ?etat=check */
export function EtatCheck() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-pkdjgs">
          <div className="p-7w9kja">
            <div className="p-7yh7mn">
              <div className="p-gxaql2">
                <span className="p-l3xhlr">
                  {"1"}
                </span>
                <span className="p-9vimvn">
                  {t("Code")}
                </span>
              </div>
              <div className="p-gxaql2">
                <span className="p-l3xhlr">
                  {"2"}
                </span>
                <span className="p-9vimvn">
                  {t("Contrôler")}
                </span>
              </div>
              <div className="p-gxaql2">
                <span className="p-lw9at8">
                  {"3"}
                </span>
                <span className="p-9vimvn">
                  {t("Valider")}
                </span>
              </div>
            </div>
            <div className="p-g1lvka">
              <div className="p-0rhj24">
                <Icone nom="r-camion" taille={26} className="p-v08d0o" />
              </div>
              <div>
                <div className="p-6pd2ig">
                  {t("CODE DE DÉPÔT VALIDÉ")}
                </div>
                <div className="p-ow9b3v">
                  {t("M-4127 · 6 colis · 7 places")}
                </div>
                <div className="p-yz5dyd">
                  {tf("{e} · livreur certifié · repart avec 3 colis", { e: ENTREPRISE })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h1 className="p-bvhkrl">
            {t("Contrôlez chaque colis")}
          </h1>
          <div className="p-t2u0o2">
            {t("Scannez l’étiquette de chaque colis, puis touchez-le si son scellé est intact (le film, pour un encombrant). L’emplacement dépend de la taille.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-9rmh6y">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">
                {t("Le lot")}
              </h2>
            </div>
            <span className="p-t8bz1l">
              {t("3 / 6 contrôlés")}
            </span>
          </div>
          <div className="p-vvja8x">
            <div className="p-5zgzlw" />
          </div>
          <button type="button" className="p-5hwx6v">
            <div className="p-cdtpeg">
              <Icone nom="check" taille={20} trait={2.4} className="p-q7qjlz" />
            </div>
            <div>
              <div className="p-hz5rr5">
                {t("BLV-40301")}
              </div>
              <div className="p-t1lapd">
                {t("petit ·")}
                {t("scellé intact")}
              </div>
            </div>
            <div className="p-06slq2">
              <div className="p-nyatr2">
                {t("RANGER EN")}
              </div>
              <div className="p-a94ugb">
                {t("B-06")}
              </div>
            </div>
          </button>
          <div className="p-92xvtp" />
          <button type="button" className="p-5hwx6v">
            <div className="p-cdtpeg">
              <Icone nom="check" taille={20} trait={2.4} className="p-q7qjlz" />
            </div>
            <div>
              <div className="p-hz5rr5">
                {t("BLV-40302")}
              </div>
              <div className="p-t1lapd">
                {t("petit ·")}
                {t("scellé intact")}
              </div>
            </div>
            <div className="p-06slq2">
              <div className="p-nyatr2">
                {t("RANGER EN")}
              </div>
              <div className="p-a94ugb">
                {t("B-06")}
              </div>
            </div>
          </button>
          <div className="p-92xvtp" />
          <button type="button" className="p-5hwx6v">
            <div className="p-cdtpeg">
              <Icone nom="check" taille={20} trait={2.4} className="p-q7qjlz" />
            </div>
            <div>
              <div className="p-hz5rr5">
                {t("BLV-40305")}
              </div>
              <div className="p-t1lapd">
                {t("moyen · remplacement ·")}
                {t("scellé intact")}
              </div>
            </div>
            <div className="p-06slq2">
              <div className="p-nyatr2">
                {t("RANGER EN")}
              </div>
              <div className="p-a94ugb">
                {t("B-07")}
              </div>
            </div>
          </button>
          <div className="p-92xvtp" />
          <button type="button" className="p-5hwx6v">
            <div className="p-x4nmbz" />
            <div>
              <div className="p-hz5rr5">
                {t("BLV-40309")}
              </div>
              <div className="p-t1lapd">
                {t("petit ·")}
                {t("touchez pour valider le scellé")}
              </div>
            </div>
            <div className="p-06slq2">
              <div className="p-nyatr2">
                {t("RANGER EN")}
              </div>
              <div className="p-a94ugb">
                {t("C-02")}
              </div>
            </div>
          </button>
          <div className="p-92xvtp" />
          <button type="button" className="p-5hwx6v">
            <div className="p-x4nmbz" />
            <div>
              <div className="p-hz5rr5">
                {t("BLV-40311")}
              </div>
              <div className="p-t1lapd">
                {t("petit ·")}
                {t("touchez pour valider le scellé")}
              </div>
            </div>
            <div className="p-06slq2">
              <div className="p-nyatr2">
                {t("RANGER EN")}
              </div>
              <div className="p-a94ugb">
                {t("C-02")}
              </div>
            </div>
          </button>
          <div className="p-92xvtp" />
          <button type="button" className="p-5hwx6v">
            <div className="p-x4nmbz" />
            <div>
              <div className="p-hz5rr5">
                {t("BLV-40314")}
              </div>
              <div className="p-t1lapd">
                {t("petit ·")}
                {t("touchez pour valider le scellé")}
              </div>
            </div>
            <div className="p-06slq2">
              <div className="p-nyatr2">
                {t("RANGER EN")}
              </div>
              <div className="p-a94ugb">
                {t("C-02")}
              </div>
            </div>
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Anomalies du lot")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-9exjl6">
              <Icone nom="r-appareil-photo" taille={20} className="p-lhsznn" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Réserve avec photo")}
              </div>
              <div className="p-dfa05r">
                {t("Angle enfoncé, étiquette abîmée : vous acceptez en le signalant")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-19z9iu">
              <Icone nom="r-fermer" taille={20} className="p-woejqv" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Refuser un colis")}
              </div>
              <div className="p-dfa05r">
                {t("Scellé cassé, mouillé, ouvert : 2 photos, il repart avec le livreur")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-yrqs2p">
              <Icone nom="r-alerte" taille={20} className="p-rd23br" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Colis annoncé absent · colis en trop")}
              </div>
              <div className="p-dfa05r">
                {t("Signalez l’écart : le livreur en répond, pas vous")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </div>
        </div>
        <div className="p-lndmsc">
          <button type="button" className="p-rbzobc">
            {t("Retour")}
          </button>
          <button type="button" className="p-ncx7qc">
            <Icone nom="check" taille={18} className="p-7dsggt" />
            {t("Valider le lot")}
          </button>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-cadenas" taille={18} className="p-672m16" />
          <div>
            {t("Vous ne voyez jamais le vendeur ni le client : uniquement la référence BelivaY, la taille et l’emplacement.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Lot validé (prototype : Reception · {"st":"done"}) — ?etat=done */
export function EtatDone() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-pkdjgs">
          <div className="p-7w9kja">
            <div className="p-7yh7mn">
              <div className="p-gxaql2">
                <span className="p-l3xhlr">
                  {"1"}
                </span>
                <span className="p-9vimvn">
                  {t("Code")}
                </span>
              </div>
              <div className="p-gxaql2">
                <span className="p-l3xhlr">
                  {"2"}
                </span>
                <span className="p-9vimvn">
                  {t("Contrôler")}
                </span>
              </div>
              <div className="p-gxaql2">
                <span className="p-l3xhlr">
                  {"3"}
                </span>
                <span className="p-9vimvn">
                  {t("Valider")}
                </span>
              </div>
            </div>
            <div className="p-g1lvka">
              <div className="p-0rhj24">
                <Icone nom="r-camion" taille={26} className="p-v08d0o" />
              </div>
              <div>
                <div className="p-6pd2ig">
                  {t("CODE DE DÉPÔT VALIDÉ")}
                </div>
                <div className="p-ow9b3v">
                  {t("M-4127 · 6 colis · 7 places")}
                </div>
                <div className="p-yz5dyd">
                  {tf("{e} · livreur certifié · repart avec 3 colis", { e: ENTREPRISE })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-c1r1yj">
          <div className="p-vhxw8h">
            <Icone nom="check" taille={32} trait={2.6} className="p-q7qjlz" />
          </div>
          <div className="p-fdt7cn">
            {t("Lot reçu · 6 colis")}
          </div>
          <div className="p-uzhe04">
            {t("Le livreur a confirmé sur son téléphone à 10:02. La garde est sous votre responsabilité, horodatée.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Ce qui part maintenant")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-cloche" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Clients prévenus")}
              </div>
              <div className="p-dfa05r">
                {t("4 clients : avis d’arrivée puis code, en deux messages · 1 client attend encore 1 colis : simple notification")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-9exjl6">
              <Icone nom="r-pile" taille={20} className="p-lhsznn" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Stock mis à jour")}
              </div>
              <div className="p-dfa05r">
                {t("38 / 40 places · 36 après la collecte de 14 h. Au-dessus de 90 %, BelivaY suspend les nouveaux envois")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <Link to={chemin("departs")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-camion" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Remettez au livreur")}
              </div>
              <div className="p-dfa05r">
                {t("3 colis sortants avant qu’il reparte")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
        </div>
        <button type="button" className="p-v96i0s">
          <Icone nom="r-qr" taille={18} className="p-7dsggt" />
          {t("Nouvelle réception")}
        </button>
        <div className="p-gh7puf">
          <Icone nom="r-cadenas" taille={18} className="p-672m16" />
          <div>
            {t("Vous ne voyez jamais le vendeur ni le client : uniquement la référence BelivaY, la taille et l’emplacement.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Réception d’un lot", Rendu: EtatDefaut },
  { id: "check", libelle: "Contrôle du lot", Rendu: EtatCheck },
  { id: "done", libelle: "Lot validé", Rendu: EtatDone },
]

export default function ReceptionProvisoire() {
  return <PageProvisoire route="reception" etats={ETATS} />
}

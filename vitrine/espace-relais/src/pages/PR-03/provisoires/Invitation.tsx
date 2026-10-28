// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Invitation · Rejoindre un relais) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-03/Invitation.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Invitation du gérant (prototype : Invitation · {"iv":"s1"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-oqlq8x">
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Bienvenue")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Code PIN")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Formation")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Prêt")}
            </span>
          </div>
        </div>
        <div className="p-g9jysb">
          <div className="p-svzvpz">
            {t("INVITATION")}
          </div>
          <div className="p-nu9kw5">
            {t("Franck Penga vous invite au relais Mama René · Mvog-Ada")}
          </div>
          <div className="p-g987ge">
            {t("Vous pourrez recevoir les colis des livreurs et les remettre aux clients. L’argent et les réglages restent au gérant.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Ce que vous pourrez faire")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-colis" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Recevoir")}
              </div>
              <div className="p-dfa05r">
                {t("Code de dépôt du livreur, scan des colis, contrôle des scellés")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-cle" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Remettre")}
              </div>
              <div className="p-dfa05r">
                {t("Vérifier les codes, prendre la photo de remise")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-fermeture" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Fermeture imprévue")}
              </div>
              <div className="p-dfa05r">
                {t("Déclarer une fermeture pour aujourd’hui seulement")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-yrqs2p">
              <Icone nom="r-cadenas" taille={20} className="p-2bmvtm" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Pas d’accès à l’argent")}
              </div>
              <div className="p-dfa05r">
                {t("Versements, rapports et paramètres : gérant uniquement")}
              </div>
            </div>
          </div>
        </div>
        <button type="button" className="p-ncx7qc">
          {t("Accepter l’invitation")}
        </button>
      </div>
    </>
  )
}

/** Création du code PIN (prototype : Invitation · {"iv":"s2"}) — ?etat=s2 */
export function EtatS2() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-oqlq8x">
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Bienvenue")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Code PIN")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Formation")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Prêt")}
            </span>
          </div>
        </div>
        <div className="p-txto41">
          <div className="p-fdt7cn">
            {t("Créez votre code PIN")}
          </div>
          <div className="p-ietgpj">
            {t("4 chiffres, à ne donner à personne. Il signe vos remises.")}
          </div>
        </div>
        <div className="p-j3bvre">
          <span className="p-au0k5d" />
          <span className="p-au0k5d" />
          <span className="p-au0k5d" />
          <span className="p-au0k5d" />
        </div>
        <div className="p-a71a3h">
          <button type="button" aria-label={t("1")} className="p-3ml6k6">
            {"1"}
          </button>
          <button type="button" aria-label={t("2")} className="p-3ml6k6">
            {"2"}
          </button>
          <button type="button" aria-label={t("3")} className="p-3ml6k6">
            {"3"}
          </button>
          <button type="button" aria-label={t("4")} className="p-3ml6k6">
            {"4"}
          </button>
          <button type="button" aria-label={t("5")} className="p-3ml6k6">
            {"5"}
          </button>
          <button type="button" aria-label={t("6")} className="p-3ml6k6">
            {"6"}
          </button>
          <button type="button" aria-label={t("7")} className="p-3ml6k6">
            {"7"}
          </button>
          <button type="button" aria-label={t("8")} className="p-3ml6k6">
            {"8"}
          </button>
          <button type="button" aria-label={t("9")} className="p-3ml6k6">
            {"9"}
          </button>
          <span />
          <button type="button" aria-label={t("0")} className="p-3ml6k6">
            {"0"}
          </button>
          <button type="button" aria-label={t("Effacer")} className="p-3ml6k6">
            {"⌫"}
          </button>
        </div>
        <div className="p-16950n">
          {t("Évitez 1234, 0000 et votre date de naissance : ils sont refusés.")}
        </div>
        <button type="button" className="p-ncx7qc">
          {t("Confirmer le PIN")}
        </button>
      </div>
    </>
  )
}

/** Formation obligatoire (prototype : Invitation · {"iv":"s3"}) — ?etat=s3 */
export function EtatS3() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-oqlq8x">
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Bienvenue")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Code PIN")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Formation")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-hssya8" />
            <span className="p-2erw45">
              {t("Prêt")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Formation obligatoire")}
            </h2>
            <span className="p-yw05h9">
              {"0 / 5"}
            </span>
          </div>
          <div className="p-ug5qrn">
            {t("Avant votre première remise, suivez les 5 modules (≈ 46 min au total, sur ce téléphone).")}
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Réception et scellés")}
              </div>
              <div className="p-dfa05r">
                {t("12 min")}
              </div>
            </div>
            <span className="p-6z26dm">
              {t("À faire")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Retrait, codes et tiers")}
              </div>
              <div className="p-dfa05r">
                {t("10 min")}
              </div>
            </div>
            <span className="p-6z26dm">
              {t("À faire")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Paiement au comptoir")}
              </div>
              <div className="p-dfa05r">
                {t("8 min")}
              </div>
            </div>
            <span className="p-6z26dm">
              {t("À faire")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Constat de litige")}
              </div>
              <div className="p-dfa05r">
                {t("10 min")}
              </div>
            </div>
            <span className="p-6z26dm">
              {t("À faire")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Dépôt des retours")}
              </div>
              <div className="p-dfa05r">
                {t("6 min")}
              </div>
            </div>
            <span className="p-6z26dm">
              {t("À faire")}
            </span>
          </div>
          <Link to={chemin("formation")} className="p-ncx7qc">
            {t("Commencer la formation")}
          </Link>
          <button type="button" className="p-rbzobc">
            {t("Voir l’écran final")}
          </button>
        </div>
      </div>
    </>
  )
}

/** Prêt à travailler (prototype : Invitation · {"iv":"ok"}) — ?etat=ok */
export function EtatOk() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-oqlq8x">
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Bienvenue")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Code PIN")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Formation")}
            </span>
          </div>
          <div className="p-3cmqo0">
            <div className="p-3227v6" />
            <span className="p-2erw45">
              {t("Prêt")}
            </span>
          </div>
        </div>
        <div className="p-c1r1yj">
          <div className="p-vhxw8h">
            <Icone nom="check" taille={32} trait={2.6} className="p-q7qjlz" />
          </div>
          <div className="p-fdt7cn">
            {t("Vous êtes prêt·e")}
          </div>
          <div className="p-uzhe04">
            {t("Formation terminée. Vous pouvez recevoir et remettre des colis au relais Mama René. Chaque opération est signée avec votre PIN.")}
          </div>
          <Link to={chemin("accueil")} className="p-ncx7qc">
            {t("Aller au guichet")}
          </Link>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Invitation du gérant", Rendu: EtatDefaut },
  { id: "s2", libelle: "Création du code PIN", Rendu: EtatS2 },
  { id: "s3", libelle: "Formation obligatoire", Rendu: EtatS3 },
  { id: "ok", libelle: "Prêt à travailler", Rendu: EtatOk },
]

export default function InvitationProvisoire() {
  return <PageProvisoire route="invitation" etats={ETATS} />
}

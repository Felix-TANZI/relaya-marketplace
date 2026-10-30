// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Parametres · Paramètres) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-10/Parametres.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import marque from '../../../assets/marque-belivay.png'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Paramètres (prototype : Parametres) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-gh5llv">
          <img src={marque} alt="" className="p-yavg0h" />
        </div>
        <div className="p-9kvinp">
          <div className="p-2wt0am">
            {t("FP")}
          </div>
          <div className="p-a81pfk">
            {t("Franck Penga")}
          </div>
          <div className="p-2lwm7c">
            {t("Gérant · Mama René, Mvog-Ada")}
          </div>
          <div className="p-oqlq8x">
            <span className="p-nax3x4">
              {t("✓ Relais vérifié")}
            </span>
            <span className="p-rpzy79">
              {t("Partenaire fondateur")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Mon relais")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Nom affiché")}
            </span>
            <span className="p-2vq92h">
              {t("Mama René · Mvog-Ada")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Adresse")}
            </span>
            <span className="p-2vq92h">
              {t("Carrefour Mvog-Ada, face pharmacie")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Repère")}
            </span>
            <span className="p-2vq92h">
              {t("Boutique jaune, enseigne BelivaY")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Ville")}
            </span>
            <span className="p-2vq92h">
              {t("Yaoundé")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Partenaire depuis")}
            </span>
            <span className="p-2vq92h">
              {t("juillet 2026")}
            </span>
          </div>
          <button type="button" className="p-rbzobc">
            <Icone nom="r-reglages" taille={18} className="p-emic6i" />
            {t("Modifier")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Sécurité")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-cadenas" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Code PIN de remise")}
              </div>
              <div className="p-dfa05r">
                {t("Demandé avant chaque remise")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-bouclier" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Double vérification")}
              </div>
              <div className="p-dfa05r">
                {t("Code SMS sur un nouvel appareil")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-tm3tpi">
              <span className="p-u2ffel" />
            </button>
          </div>
          <div className="p-92xvtp" />
          <Link to={chemin("parametres")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telephone" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Appareils connectés")}
              </div>
              <div className="p-dfa05r">
                {t("Ce téléphone et 1 autre · déconnecter à distance")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("equipe")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-personne" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Mon équipe")}
              </div>
              <div className="p-dfa05r">
                {t("2 employés sur 3 au plus · ils reçoivent et remettent, sans voir l’argent")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Affichage et application")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-lune" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Thème sombre")}
              </div>
              <div className="p-dfa05r">
                {t("Pour le guichet en fin de journée")}
              </div>
            </div>
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-bgyo12">
              <span className="p-p91l1v" />
            </button>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-oeil" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Taille du texte")}
              </div>
              <div className="p-dfa05r">
                {t("Normale, Grande (115 %) ou Très grande (130 %)")}
              </div>
            </div>
            <span className="p-rpzy79">
              {t("Normale")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-br69f5">
            <div className="p-liel66">
              <Icone nom="r-globe" taille={20} className="p-672m16" />
            </div>
            <div className="p-ht6ym0">
              {t("Langue")}
            </div>
            <div className="p-rqrwu6">
              <button type="button" className="p-h01hlk">
                {t("FR")}
              </button>
              <button type="button" className="p-p4wplf">
                {t("EN")}
              </button>
              <button type="button" className="p-p4wplf">
                {t("Pidgin")}
              </button>
            </div>
          </div>
          <div className="p-92xvtp" />
          <Link to={chemin("accueil", { etat: "hors-ligne" })} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-reseau" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Hors connexion")}
              </div>
              <div className="p-dfa05r">
                {t("Réceptions et remises envoyées au retour du réseau")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Actif")}
            </span>
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("installer")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telecharger" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Installer l’application")}
              </div>
              <div className="p-dfa05r">
                {t("Icône sur l’écran d’accueil, marche sans réseau")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("changer-momo")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telephone" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Numéro de versement")}
              </div>
              <div className="p-dfa05r">
                {t("MTN ···· 8 350")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("documents")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-document" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Mes données")}
              </div>
              <div className="p-dfa05r">
                {t("Consulter, corriger, exporter · preuves gardées 180 jours")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("aide")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-entrer" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Clôturer le compte")}
              </div>
              <div className="p-dfa05r">
                {t("Avec un préavis de 30 jours")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Version")}
            </span>
            <span className="p-w01nj9">
              {t("Point Relais 1.0 · juillet 2026")}
            </span>
          </div>
        </div>
        <button type="button" className="p-ui2zy9">
          <Icone nom="r-entrer" taille={18} className="p-woejqv" />
          {t("Se déconnecter")}
        </button>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Paramètres", Rendu: EtatDefaut },
]

export default function ParametresProvisoire() {
  return <PageProvisoire route="parametres" etats={ETATS} />
}

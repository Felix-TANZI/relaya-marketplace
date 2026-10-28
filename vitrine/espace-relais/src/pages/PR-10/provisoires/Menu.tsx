// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Menu · Menu) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-10/Menu.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import logo from '../../../assets/logo-belivay.png'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Menu (prototype : Menu) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-36va56">
          <div className="p-z3prj2">
            <Link to={chemin("parametres")} aria-label={t("Mon compte")} className="p-jb3jyo">
              {t("FP")}
            </Link>
            <div className="p-lmo74g">
              <div className="p-nlvkht">
                {t("Mama René · Mvog-Ada")}
              </div>
              <div className="p-anbp2l">
                {t("Franck Penga, gérant")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("● Ouvert")}
            </span>
          </div>
        </div>
        <div className="p-yscrc8">
          {t("LE GUICHET")}
        </div>
        <div className="p-0cipe3">
          <Link to={chemin("accueil")} className="p-v298aq">
            <div className="p-hv0jfo">
              <Icone nom="r-grille" taille={19} className="p-7dsggt" />
            </div>
            <div className="p-dfc4i3">
              {t("Aujourd’hui")}
            </div>
          </Link>
          <Link to={chemin("reception")} className="p-v298aq">
            <div className="p-hv0jfo">
              <Icone nom="r-colis" taille={19} className="p-7dsggt" />
            </div>
            <div className="p-dfc4i3">
              {t("Réception")}
            </div>
            <span className="p-4b7s50">
              <span className="p-rpzy79">
                {"6"}
              </span>
            </span>
          </Link>
          <Link to={chemin("retrait")} className="p-v298aq">
            <div className="p-hv0jfo">
              <Icone nom="r-cle" taille={19} className="p-7dsggt" />
            </div>
            <div className="p-dfc4i3">
              {t("Retrait")}
            </div>
          </Link>
          <Link to={chemin("stock")} className="p-v298aq">
            <div className="p-hv0jfo">
              <Icone nom="r-pile" taille={19} className="p-7dsggt" />
            </div>
            <div className="p-dfc4i3">
              {t("Colis en stock")}
            </div>
            <span className="p-4b7s50">
              <span className="p-rpzy79">
                {"22"}
              </span>
            </span>
          </Link>
        </div>
        <div className="p-taaoze">
          <div className="p-yscrc8">
            {t("OPÉRATIONS")}
          </div>
          <Link to={chemin("departs")} className="p-edt6n8">
            <Icone nom="r-camion" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("À faire partir")}
            </div>
            <span className="p-rpzy79">
              {"3"}
            </span>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("litiges")} className="p-edt6n8">
            <Icone nom="r-balance" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Constats et retours")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("historique")} className="p-edt6n8">
            <Icone nom="r-historique" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Historique")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("notifications")} className="p-edt6n8">
            <Icone nom="r-cloche" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Notifications")}
            </div>
            <span className="p-rpzy79">
              {"3"}
            </span>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("messagerie")} className="p-edt6n8">
            <Icone nom="r-message" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Messagerie")}
            </div>
            <span className="p-rpzy79">
              {"2"}
            </span>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
        </div>
        <div className="p-taaoze">
          <div className="p-yscrc8">
            {t("ARGENT ET PERFORMANCE")}
          </div>
          <Link to={chemin("versements")} className="p-edt6n8">
            <Icone nom="r-carte-paiement" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Versements")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("rapports")} className="p-edt6n8">
            <Icone nom="r-graphique" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Rapports")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("trust")} className="p-edt6n8">
            <Icone nom="r-bouclier" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Trust Score")}
            </div>
            <span className="p-6z26dm">
              {"72"}
            </span>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("avis")} className="p-edt6n8">
            <Icone nom="r-etoile" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Avis des clients")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("paliers")} className="p-edt6n8">
            <Icone nom="r-couches" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Paliers")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
        </div>
        <div className="p-taaoze">
          <div className="p-yscrc8">
            {t("MON RELAIS")}
          </div>
          <Link to={chemin("capacite")} className="p-edt6n8">
            <Icone nom="r-horloge" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Capacité et horaires")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("fermeture")} className="p-edt6n8">
            <Icone nom="r-fermeture" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Fermeture exceptionnelle")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("documents")} className="p-edt6n8">
            <Icone nom="r-document" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Documents")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("equipe")} className="p-edt6n8">
            <Icone nom="r-personne" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Mon équipe")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("activation")} className="p-edt6n8">
            <Icone nom="r-boutique" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Activation et partenariat")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("formation")} className="p-edt6n8">
            <Icone nom="r-formation" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Formation")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
        </div>
        <div className="p-taaoze">
          <div className="p-yscrc8">
            {t("ÉCRANS D’ÉTAT ET D’ACCÈS")}
          </div>
          <Link to={chemin("connexion")} className="p-edt6n8">
            <Icone nom="r-personne" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Connexion")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("invitation")} className="p-edt6n8">
            <Icone nom="r-personne" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Invitation d’un employé")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("accueil", { etat: "vide" })} className="p-edt6n8">
            <Icone nom="r-grille" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Relais neuf (écrans vides)")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("statut-relais")} className="p-edt6n8">
            <Icone nom="r-boutique" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Statut du relais")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("accueil", { etat: "hors-ligne" })} className="p-edt6n8">
            <Icone nom="r-reseau" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Hors connexion")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("erreurs")} className="p-edt6n8">
            <Icone nom="r-alerte" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("États d’erreur")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("camera")} className="p-edt6n8">
            <Icone nom="r-qr" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Caméra")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("installer")} className="p-edt6n8">
            <Icone nom="r-telecharger" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Installer l’application")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
        </div>
        <div className="p-taaoze">
          <div className="p-yscrc8">
            {t("COMPTE")}
          </div>
          <Link to={chemin("aide")} className="p-edt6n8">
            <Icone nom="r-aide" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Aide")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("parametres")} className="p-edt6n8">
            <Icone nom="r-reglages" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Paramètres")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("inscription")} className="p-edt6n8">
            <Icone nom="r-boutique" taille={20} className="p-672m16" />
            <div className="p-hngd8y">
              {t("Devenir point relais (nouveau gérant)")}
            </div>
            <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
          </Link>
        </div>
        <div className="p-98j47s">
          <img src={logo} alt="BelivaY" className="p-ghcggh" />
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Menu", Rendu: EtatDefaut },
]

export default function MenuProvisoire() {
  return <PageProvisoire route="menu" etats={ETATS} />
}

// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Accueil · Aujourd’hui) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-04/Accueil.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'
import { ENTREPRISE } from '../../../demo/jeu-essai'

/** Aujourd’hui (prototype : Accueil) — ?etat=defaut */
export function EtatDefaut() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Bonjour Franck")}
          </h1>
          <div className="p-t2u0o2">
            {t("Mercredi 23 septembre · 9 retraits prévus aujourd’hui")}
          </div>
        </div>
        <div className="p-g9jysb">
          <div className="p-wxow1i">
            <div className="p-svzvpz">
              {t("LIVREUR EN APPROCHE")}
            </div>
            <span className="p-3298ie">
              {t("dans ~12 min")}
            </span>
          </div>
          <div className="p-7hccg6">
            <div className="p-rjzvxd">
              {"6"}
            </div>
            <div className="p-jr92id">
              {t("colis à réceptionner")}
              <br />
              <span className="p-nfts90">
                {tf("{e} · mission M-4127", { e: ENTREPRISE })}
              </span>
            </div>
          </div>
          <div className="p-anbp2l">
            {t("Il faudra 7 places : vous en avez 9. Le livreur repart avec 3 colis.")}
          </div>
          <Link to={chemin("reception")} className="p-wpiafb">
            <Icone nom="r-cle" taille={18} className="p-672m16" />
            {t("Préparer la réception")}
          </Link>
        </div>
        <div className="p-0cipe3">
          <Link to={chemin("stock")} className="p-cevv9w">
            <div className="p-2knnop">
              <div className="p-yscrc8">
                {t("À REMETTRE")}
              </div>
              <div className="p-2ry3a6">
                {"19"}
              </div>
              <div className="p-g7lwlw">
                {t("colis prêts au retrait")}
              </div>
            </div>
          </Link>
          <Link to={chemin("stock")} className="p-cevv9w">
            <div className="p-2knnop">
              <div className="p-yscrc8">
                {t("DERNIER JOUR")}
              </div>
              <div className="p-lvd2aa">
                {"2"}
              </div>
              <div className="p-g7lwlw">
                {t("à retirer avant 19 h")}
              </div>
            </div>
          </Link>
          <Link to={chemin("departs")} className="p-cevv9w">
            <div className="p-2knnop">
              <div className="p-yscrc8">
                {t("À FAIRE PARTIR")}
              </div>
              <div className="p-lca2pq">
                {"3"}
              </div>
              <div className="p-g7lwlw">
                {t("renvoi, retour, transfert")}
              </div>
            </div>
          </Link>
          <Link to={chemin("capacite")} className="p-cevv9w">
            <div className="p-2knnop">
              <div className="p-yscrc8">
                {t("PLACES LIBRES")}
              </div>
              <div className="p-2ry3a6">
                {"9"}
              </div>
              <div className="p-g7lwlw">
                {t("sur 40 · 78 % occupé")}
              </div>
            </div>
          </Link>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("À faire maintenant")}
            </h2>
            <span className="p-rpzy79">
              {"4"}
            </span>
          </div>
          <Link to={chemin("departs")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-camion" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Préparer la collecte de 14 h")}
              </div>
              <div className="p-dfa05r">
                {t("3 colis à remettre au livreur : 1 renvoi, 1 retour, 1 transfert")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("stock")} className="p-o24hsm">
            <div className="p-9exjl6">
              <Icone nom="r-horloge" taille={20} className="p-lhsznn" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("2 clients au dernier jour")}
              </div>
              <div className="p-dfa05r">
                {t("Dernier rappel envoyé à 8 h · rien à faire s’ils passent avant 19 h")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("litiges")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-balance" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("1 constat à compléter")}
              </div>
              <div className="p-dfa05r">
                {t("LT-0912 · BelivaY vous demande une photo")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("stock")} className="p-o24hsm">
            <div className="p-yrqs2p">
              <Icone nom="r-couches" taille={20} className="p-rd23br" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("2 colis en attente de groupage")}
              </div>
              <div className="p-dfa05r">
                {t("Gardés sans frais · remise groupée prévue le 2 oct.")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
        </div>
        <Link to={chemin("versements")} className="p-0ygmxn">
          <div className="p-9rmh6y">
            <div className="p-xmy0fy">
              {t("GAGNÉ CETTE SEMAINE")}
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-v08d0o" />
          </div>
          <div className="p-f3eaa4">
            {"11 600"}
            {' '}
            <span className="p-trntci">
              {t("FCFA")}
            </span>
          </div>
          <div className="p-yz5dyd">
            {t("41 colis remis · 30 jours de garde · versement prévu")}
            {' '}
            <strong className="p-ipp0fd">
              {t("vendredi 25 sept.")}
            </strong>
          </div>
        </Link>
        <div className="p-0cipe3">
          <Link to={chemin("trust")} className="p-nznq5x">
            <svg width="46" height="46" viewBox="0 0 60 60" aria-hidden="true" className="p-bo3n4y">
              <circle cx="30" cy="30" r="25" fill="none" strokeWidth="7" className="p-tmlbwm" />
              <circle cx="30" cy="30" r="25" fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray="113 157" transform="rotate(-90 30 30)" className="p-wqszl3" />
              <text x="30" y="36" textAnchor="middle" fontSize="17" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif" className="p-6nec68">
                {"72"}
              </text>
            </svg>
            <div>
              <div className="p-cp89bh">
                {t("Trust Score")}
              </div>
              <div className="p-46lk2m">
                {t("Confirmé lundi 28")}
              </div>
            </div>
          </Link>
          <Link to={chemin("avis")} className="p-nznq5x">
            <div className="p-141mfj">
              {"4,6"}
            </div>
            <div>
              <div className="p-cp89bh">
                {t("Avis clients")}
              </div>
              <div className="p-46lk2m">
                {t("58 avis · 30 j")}
              </div>
            </div>
          </Link>
        </div>
        <div className="p-nn3lx5">
          <Icone nom="r-reseau" taille={15} className="p-q7qjlz" />
          {t("Connecté · aucune opération en attente d’envoi")}
        </div>
      </div>
    </>
  )
}

/** Aujourd’hui · journée calme (prototype : AccueilVide) — ?etat=vide */
export function EtatVide() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Bienvenue au relais !")}
          </h1>
          <div className="p-t2u0o2">
            {t("Vous êtes ouvert depuis ce matin. Voici comment se passe votre premier jour.")}
          </div>
        </div>
        <div className="p-g9jysb">
          <div className="p-svzvpz">
            {t("EN ATTENTE DU PREMIER LIVREUR")}
          </div>
          <div className="p-fdt7cn">
            {t("Aucun colis annoncé pour l’instant")}
          </div>
          <div className="p-ymdhkv">
            {t("Dès qu’une entreprise de livraison choisit un lot pour votre relais, il apparaît ici avec l’heure d’arrivée. Vous recevez une notification 15 minutes avant.")}
          </div>
        </div>
        <div className="p-0cipe3">
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("À REMETTRE")}
            </div>
            <div className="p-2ry3a6">
              {"0"}
            </div>
            <div className="p-g7lwlw">
              {t("aucun colis en stock")}
            </div>
          </div>
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("DERNIER JOUR")}
            </div>
            <div className="p-2ry3a6">
              {"0"}
            </div>
            <div className="p-g7lwlw">
              {"—"}
            </div>
          </div>
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("À FAIRE PARTIR")}
            </div>
            <div className="p-2ry3a6">
              {"0"}
            </div>
            <div className="p-g7lwlw">
              {"—"}
            </div>
          </div>
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("PLACES LIBRES")}
            </div>
            <div className="p-2ry3a6">
              {"40"}
            </div>
            <div className="p-g7lwlw">
              {t("sur 40 · 0 %")}
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Votre premier jour")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="check" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Formation terminée")}
              </div>
              <div className="p-dfa05r">
                {t("5 modules sur 5")}
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
                {t("Numéro de versement vérifié")}
              </div>
              <div className="p-dfa05r">
                {t("MTN ···· 8 350")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Fait")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <Link to={chemin("camera")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-qr" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Préparez l’appareil photo")}
              </div>
              <div className="p-dfa05r">
                {t("Autorisez la caméra : elle sert au scan et aux photos de preuve")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin("stock")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-pile" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Préparez vos étagères")}
              </div>
              <div className="p-dfa05r">
                {t("Étiquetez A, B et C comme sur le plan")}
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
                {t("Vérifiez vos horaires")}
              </div>
              <div className="p-dfa05r">
                {t("Les clients choisissent votre relais selon eux")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
        </div>
        <div className="p-t6ao9i">
          <Icone nom="r-carte-paiement" taille={26} className="p-672m16" />
          <div className="p-buxdaz">
            {t("Pas encore de gains")}
          </div>
          <div className="p-oyklrp">
            {t("Vos premiers 200 F arrivent à la première remise. Versement chaque vendredi.")}
          </div>
        </div>
        <div className="p-t6ao9i">
          <Icone nom="r-bouclier" taille={26} className="p-672m16" />
          <div className="p-buxdaz">
            {t("Trust Score : en construction")}
          </div>
          <div className="p-oyklrp">
            {t("Vous démarrez à une note neutre ; elle se précise après vos premières opérations. Pas de note publique avant 10 remises.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Hors connexion (prototype : HorsLigne) — ?etat=hors-ligne */
export function EtatHorsLigne() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-03dir0">
          <Icone nom="r-reseau" taille={20} className="p-lhsznn" />
          <div className="p-lmo74g">
            <div className="p-dfc4i3">
              {t("Hors connexion depuis 14 min")}
            </div>
            <div className="p-mqy5dn">
              {t("Vous pouvez continuer : tout sera envoyé au retour du réseau.")}
            </div>
          </div>
        </div>
        <div>
          <h1 className="p-bvhkrl">
            {t("Ce qui marche sans réseau")}
          </h1>
        </div>
        <div className="p-yi6rkz">
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-colis" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Recevoir un lot")}
              </div>
              <div className="p-dfa05r">
                {t("Code de dépôt vérifié si le lot était déjà téléchargé")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Oui")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-cle" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Remettre un colis sans montant dû")}
              </div>
              <div className="p-dfa05r">
                {t("Code vérifié sur la liste chiffrée du téléphone")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Oui")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-19z9iu">
              <Icone nom="r-carte-paiement" taille={20} className="p-woejqv" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Remettre avec paiement")}
              </div>
              <div className="p-dfa05r">
                {t("Le paiement MoMo exige le réseau")}
              </div>
            </div>
            <span className="p-ekng8o">
              {t("Non")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-appareil-photo" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Photos, constats, dépôts, sorties")}
              </div>
              <div className="p-dfa05r">
                {t("Enregistrés et envoyés plus tard")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Oui")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-9exjl6">
              <Icone nom="r-document" taille={20} className="p-lhsznn" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Panne générale annoncée")}
              </div>
              <div className="p-dfa05r">
                {t("Par SMS ou WhatsApp de diffusion : registre papier, colis sans montant seulement")}
              </div>
            </div>
            <span className="p-h4wlx0">
              {t("Papier")}
            </span>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("En attente d’envoi")}
            </h2>
            <span className="p-h4wlx0">
              {"4"}
            </span>
          </div>
          <div className="p-o24hsm">
            <div className="p-yrqs2p">
              <Icone nom="check" taille={20} className="p-rd23br" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("09:58 · Remise BLV-40290")}
              </div>
              <div className="p-dfa05r">
                {t("photo 420 Ko")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-yrqs2p">
              <Icone nom="check" taille={20} className="p-rd23br" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("09:52 · Remise BLV-40288")}
              </div>
              <div className="p-dfa05r">
                {t("photo 380 Ko")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-yrqs2p">
              <Icone nom="r-appareil-photo" taille={20} className="p-rd23br" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("09:47 · Réserve BLV-40309")}
              </div>
              <div className="p-dfa05r">
                {t("1 photo")}
              </div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-yrqs2p">
              <Icone nom="r-colis" taille={20} className="p-rd23br" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("09:45 · Lot M-4127")}
              </div>
              <div className="p-dfa05r">
                {t("6 colis")}
              </div>
            </div>
          </div>
          <button type="button" className="p-v96i0s">
            <Icone nom="r-reseau" taille={18} className="p-7dsggt" />
            {t("Réessayer l’envoi")}
          </button>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-horloge" taille={18} className="p-672m16" />
          <div>
            {t("Les opérations gardent l’heure où elles ont été faites, pas l’heure d’envoi. Une opération en attente depuis plus de 72 h expire : il faut la refaire (le registre papier aussi se saisit sous 72 h). Ne désinstallez pas l’application tant que des opérations sont en attente.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Aujourd’hui", Rendu: EtatDefaut },
  { id: "vide", libelle: "Aujourd’hui · journée calme", Rendu: EtatVide },
  { id: "hors-ligne", libelle: "Hors connexion", Rendu: EtatHorsLigne },
]

export default function AccueilProvisoire() {
  return <PageProvisoire route="accueil" etats={ETATS} />
}

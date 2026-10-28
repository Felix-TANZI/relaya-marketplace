// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Retrait · Retrait par le client) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-05/Retrait.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Retrait par le client (prototype : Retrait · {"rt":"code"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Retrait client")}
          </h1>
          <div className="p-t2u0o2">
            {t("Code ou QR, montant calculé, photo. Moins d’une minute.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-yscrc8">
            {t("CODE À 6 CHIFFRES")}
          </div>
          <div className="p-i5o4bp">
            <input type="text" aria-label={t("Chiffre 1")} defaultValue="4" className="p-qpvkkz" />
            <input type="text" aria-label={t("Chiffre 2")} defaultValue="8" className="p-qpvkkz" />
            <input type="text" aria-label={t("Chiffre 3")} defaultValue="2" className="p-qpvkkz" />
            <input type="text" aria-label={t("Chiffre 4")} defaultValue="9" className="p-qpvkkz" />
            <input type="text" aria-label={t("Chiffre 5")} defaultValue="1" className="p-qpvkkz" />
            <input type="text" aria-label={t("Chiffre 6")} defaultValue="5" className="p-qpvkkz" />
          </div>
          <div className="p-0cipe3">
            <button type="button" className="p-rbzobc">
              <Icone nom="r-qr" taille={18} className="p-emic6i" />
              {t("Scanner le QR")}
            </button>
            <button type="button" className="p-v96i0s">
              <Icone nom="check" taille={18} className="p-7dsggt" />
              {t("Vérifier")}
            </button>
          </div>
          <div className="p-81u2s6">
            {t("3 codes faux de suite : le colis est bloqué 24 h et BelivaY est alerté. Le client réaffiche son code dans son app ; sans app, il demande un renvoi par SMS.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Autres situations au comptoir")}
            </h2>
          </div>
          <div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-carte-paiement" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Commande payable au retrait")}
                </div>
                <Icone nom="minus" taille={18} className="p-672m16" />
              </button>
              <div className="p-l8pg46">
                {t("Pas encore de code : retrouvez le colis par sa référence ou le numéro du client. Le ticket affiche le montant à encaisser (ex. 18 500 F : articles + garde ; la livraison est toujours payée d’avance). Le client paie en MoMo sur son téléphone : ce paiement débloque le code. Jamais d’espèces. Les conditions sont vérifiées à la commande, pas par vous.")}
              </div>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-gcwb3u">
                  <Icone nom="r-fermer" taille={19} className="p-woejqv" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client refuse le colis")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-pile" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Plusieurs colis pour un même client")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-ft0t5q">
                  <Icone nom="r-balance" taille={19} className="p-lhsznn" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client ouvre et conteste sur place")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-i5jj8d">
                  <Icone nom="r-cadenas" taille={19} className="p-rd23br" />
                </div>
                <div className="p-lh0lmv">
                  {t("Code bloqué ou oublié")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-lieu" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client veut changer de relais")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-0cipe3">
          <Link to={chemin("pin-remise")} className="p-rbzobc">
            <Icone nom="r-cadenas" taille={18} className="p-emic6i" />
            {t("Signature PIN")}
          </Link>
          <Link to={chemin("erreurs")} className="p-rbzobc">
            <Icone nom="r-alerte" taille={18} className="p-emic6i" />
            {t("États d’erreur")}
          </Link>
        </div>
        <Link to={chemin("litiges")} className="p-jv4j92">
          <Icone nom="r-annuler" taille={20} className="p-q7qjlz" />
          <div className="p-lh0lmv">
            {t("Un client dépose un retour validé")}
          </div>
          <Icone nom="r-chevron-droite" taille={18} className="p-q7qjlz" />
        </Link>
      </div>
    </>
  )
}

/** Code correct · colis trouvé (prototype : Retrait · {"rt":"colis"}) — ?etat=colis */
export function EtatColis() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Retrait client")}
          </h1>
          <div className="p-t2u0o2">
            {t("Code ou QR, montant calculé, photo. Moins d’une minute.")}
          </div>
        </div>
        <div className="p-nusbs9">
          <div className="p-y4agim" />
          <div className="p-14wesq">
            <div className="p-9rmh6y">
              <span className="p-nax3x4">
                {t("✓ Code correct")}
              </span>
              <div className="p-06slq2">
                <div className="p-own8v2">
                  {t("EMPLACEMENT")}
                </div>
                <div className="p-a1nb1d">
                  {t("B-04")}
                </div>
              </div>
            </div>
            <div className="p-n2qxvn">
              {t("BLV-40231")}
            </div>
            <div className="p-2lwm7c">
              {t("1 colis moyen sur 1 · arrivé il y a 4 jours")}
            </div>
          </div>
          <div className="p-nfeoow">
            <span className="p-nc4mxo" />
            <span className="p-wzd3oc" />
            <span className="p-dvmemv" />
          </div>
          <div className="p-1hnkh0">
            <div className="p-mqmvkk">
              <span className="p-ytl255">
                {t("Articles et livraison")}
              </span>
              <span className="p-2vq92h">
                {t("déjà payés")}
              </span>
            </div>
            <div className="p-mqmvkk">
              <span className="p-ytl255">
                {t("Porteur désigné")}
              </span>
              <span className="p-2vq92h">
                {t("aucun")}
              </span>
            </div>
            <div className="p-mqmvkk">
              <span className="p-ytl255">
                {t("1er jour · sam. 19")}
              </span>
              <span className="p-2vq92h">
                {t("offert")}
              </span>
            </div>
            <div className="p-mqmvkk">
              <span className="p-ytl255">
                {t("Dim. 20 · relais fermé")}
              </span>
              <span className="p-2vq92h">
                {t("non facturé")}
              </span>
            </div>
            <div className="p-mqmvkk">
              <span className="p-ytl255">
                {t("2e et 3e jours · 2 × 100 F")}
              </span>
              <span className="p-2vq92h">
                {t("200 F")}
              </span>
            </div>
            <div className="p-mqmvkk">
              <span className="p-ytl255">
                {t("4e jour · aujourd’hui")}
              </span>
              <span className="p-2vq92h">
                {t("200 F")}
              </span>
            </div>
            <div className="p-gjwjn1">
              <span className="p-buxdaz">
                {t("À payer par le client")}
              </span>
              <span className="p-aea4br">
                {t("400 F")}
              </span>
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Paiement au comptoir")}
            </h2>
          </div>
          <div className="p-ug5qrn">
            {t("Le client reçoit la demande de paiement sur son téléphone. Aucune espèce, aucun montant à saisir.")}
          </div>
          <div className="p-xh83vg">
            <Icone nom="r-telephone" taille={18} className="p-672m16" />
            {t("Demande envoyée · MTN MoMo · en attente…")}
          </div>
          <button type="button" className="p-ncx7qc">
            <Icone nom="check" taille={18} className="p-7dsggt" />
            {t("Paiement reçu · continuer")}
          </button>
          <button type="button" className="p-rbzobc">
            {t("Annuler")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Autres situations au comptoir")}
            </h2>
          </div>
          <div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-carte-paiement" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Commande payable au retrait")}
                </div>
                <Icone nom="minus" taille={18} className="p-672m16" />
              </button>
              <div className="p-l8pg46">
                {t("Pas encore de code : retrouvez le colis par sa référence ou le numéro du client. Le ticket affiche le montant à encaisser (ex. 18 500 F : articles + garde ; la livraison est toujours payée d’avance). Le client paie en MoMo sur son téléphone : ce paiement débloque le code. Jamais d’espèces. Les conditions sont vérifiées à la commande, pas par vous.")}
              </div>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-gcwb3u">
                  <Icone nom="r-fermer" taille={19} className="p-woejqv" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client refuse le colis")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-pile" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Plusieurs colis pour un même client")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-ft0t5q">
                  <Icone nom="r-balance" taille={19} className="p-lhsznn" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client ouvre et conteste sur place")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-i5jj8d">
                  <Icone nom="r-cadenas" taille={19} className="p-rd23br" />
                </div>
                <div className="p-lh0lmv">
                  {t("Code bloqué ou oublié")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-lieu" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client veut changer de relais")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-0cipe3">
          <Link to={chemin("pin-remise")} className="p-rbzobc">
            <Icone nom="r-cadenas" taille={18} className="p-emic6i" />
            {t("Signature PIN")}
          </Link>
          <Link to={chemin("erreurs")} className="p-rbzobc">
            <Icone nom="r-alerte" taille={18} className="p-emic6i" />
            {t("États d’erreur")}
          </Link>
        </div>
        <Link to={chemin("litiges")} className="p-jv4j92">
          <Icone nom="r-annuler" taille={20} className="p-q7qjlz" />
          <div className="p-lh0lmv">
            {t("Un client dépose un retour validé")}
          </div>
          <Icone nom="r-chevron-droite" taille={18} className="p-q7qjlz" />
        </Link>
      </div>
    </>
  )
}

/** Tout est en ordre ? (prototype : Retrait · {"rt":"ordre"}) — ?etat=ordre */
export function EtatOrdre() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Retrait client")}
          </h1>
          <div className="p-t2u0o2">
            {t("Code ou QR, montant calculé, photo. Moins d’une minute.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-9rmh6y">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">
                {t("Tout est en ordre ?")}
              </h2>
            </div>
            <span className="p-nax3x4">
              {t("400 F payés")}
            </span>
          </div>
          <div className="p-ug5qrn">
            {t("Avant de valider la remise, invitez le client à ouvrir son colis ici, devant vous. « Tout est en ordre » ferme la fenêtre de retour et libère l’argent du vendeur.")}
          </div>
          <div className="p-4ilvqh">
            <div className="p-mqmvkk">
              <span className="p-ytl255">
                {t("Colis annoncés")}
              </span>
              <span className="p-2vq92h">
                {"1"}
              </span>
            </div>
            <div className="p-mqmvkk">
              <span className="p-ytl255">
                {t("Colis posés sur le comptoir")}
              </span>
              <span className="p-2vq92h">
                {t("1 sur 1")}
              </span>
            </div>
          </div>
          <button type="button" className="p-ncx7qc">
            <Icone nom="check" taille={18} className="p-7dsggt" />
            {t("Tout est en ordre")}
          </button>
          <Link to={chemin("litiges")} className="p-rbzobc">
            {t("Un problème")}
          </Link>
          <button type="button" className="p-5tucow">
            {t("Le client préfère ne pas ouvrir · continuer")}
          </button>
          <div className="p-81u2s6">
            {t("« Un problème » ouvre un constat au comptoir, photos tout de suite : le colis reste chez vous et la garde s’arrête jusqu’à la décision. Si le client préfère ne pas ouvrir, continuez : sa fenêtre de retour reste ouverte 7 jours. S’il manque un colis annoncé, la validation est refusée.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Autres situations au comptoir")}
            </h2>
          </div>
          <div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-carte-paiement" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Commande payable au retrait")}
                </div>
                <Icone nom="minus" taille={18} className="p-672m16" />
              </button>
              <div className="p-l8pg46">
                {t("Pas encore de code : retrouvez le colis par sa référence ou le numéro du client. Le ticket affiche le montant à encaisser (ex. 18 500 F : articles + garde ; la livraison est toujours payée d’avance). Le client paie en MoMo sur son téléphone : ce paiement débloque le code. Jamais d’espèces. Les conditions sont vérifiées à la commande, pas par vous.")}
              </div>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-gcwb3u">
                  <Icone nom="r-fermer" taille={19} className="p-woejqv" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client refuse le colis")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-pile" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Plusieurs colis pour un même client")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-ft0t5q">
                  <Icone nom="r-balance" taille={19} className="p-lhsznn" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client ouvre et conteste sur place")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-i5jj8d">
                  <Icone nom="r-cadenas" taille={19} className="p-rd23br" />
                </div>
                <div className="p-lh0lmv">
                  {t("Code bloqué ou oublié")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-lieu" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client veut changer de relais")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-0cipe3">
          <Link to={chemin("pin-remise")} className="p-rbzobc">
            <Icone nom="r-cadenas" taille={18} className="p-emic6i" />
            {t("Signature PIN")}
          </Link>
          <Link to={chemin("erreurs")} className="p-rbzobc">
            <Icone nom="r-alerte" taille={18} className="p-emic6i" />
            {t("États d’erreur")}
          </Link>
        </div>
        <Link to={chemin("litiges")} className="p-jv4j92">
          <Icone nom="r-annuler" taille={20} className="p-q7qjlz" />
          <div className="p-lh0lmv">
            {t("Un client dépose un retour validé")}
          </div>
          <Icone nom="r-chevron-droite" taille={18} className="p-q7qjlz" />
        </Link>
      </div>
    </>
  )
}

/** Preuve de remise (prototype : Retrait · {"rt":"preuve"}) — ?etat=preuve */
export function EtatPreuve() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Retrait client")}
          </h1>
          <div className="p-t2u0o2">
            {t("Code ou QR, montant calculé, photo. Moins d’une minute.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-9rmh6y">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">
                {t("Preuve de remise")}
              </h2>
            </div>
            <span className="p-nax3x4">
              {t("400 F payés")}
            </span>
          </div>
          <button type="button" className="p-w5o8yg">
            <Icone nom="r-appareil-photo" taille={22} className="p-gqd75s" />
            {t("Photo du colis remis · obligatoire")}
          </button>
          <div className="p-pfxfo4">
            <button type="button" aria-label={t("Activer ou désactiver")} className="p-bgyo12">
              <span className="p-p91l1v" />
            </button>
            <div className="p-ife3a2">
              {t("Une autre personne retire")}
            </div>
          </div>
          <button type="button" className="p-fc0yax">
            <Icone nom="check" taille={18} className="p-7dsggt" />
            {t("Remettre le colis")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Autres situations au comptoir")}
            </h2>
          </div>
          <div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-carte-paiement" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Commande payable au retrait")}
                </div>
                <Icone nom="minus" taille={18} className="p-672m16" />
              </button>
              <div className="p-l8pg46">
                {t("Pas encore de code : retrouvez le colis par sa référence ou le numéro du client. Le ticket affiche le montant à encaisser (ex. 18 500 F : articles + garde ; la livraison est toujours payée d’avance). Le client paie en MoMo sur son téléphone : ce paiement débloque le code. Jamais d’espèces. Les conditions sont vérifiées à la commande, pas par vous.")}
              </div>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-gcwb3u">
                  <Icone nom="r-fermer" taille={19} className="p-woejqv" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client refuse le colis")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-pile" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Plusieurs colis pour un même client")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-ft0t5q">
                  <Icone nom="r-balance" taille={19} className="p-lhsznn" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client ouvre et conteste sur place")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-i5jj8d">
                  <Icone nom="r-cadenas" taille={19} className="p-rd23br" />
                </div>
                <div className="p-lh0lmv">
                  {t("Code bloqué ou oublié")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-lieu" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client veut changer de relais")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-0cipe3">
          <Link to={chemin("pin-remise")} className="p-rbzobc">
            <Icone nom="r-cadenas" taille={18} className="p-emic6i" />
            {t("Signature PIN")}
          </Link>
          <Link to={chemin("erreurs")} className="p-rbzobc">
            <Icone nom="r-alerte" taille={18} className="p-emic6i" />
            {t("États d’erreur")}
          </Link>
        </div>
        <Link to={chemin("litiges")} className="p-jv4j92">
          <Icone nom="r-annuler" taille={20} className="p-q7qjlz" />
          <div className="p-lh0lmv">
            {t("Un client dépose un retour validé")}
          </div>
          <Icone nom="r-chevron-droite" taille={18} className="p-q7qjlz" />
        </Link>
      </div>
    </>
  )
}

/** Colis remis (prototype : Retrait · {"rt":"done"}) — ?etat=done */
export function EtatDone() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Retrait client")}
          </h1>
          <div className="p-t2u0o2">
            {t("Code ou QR, montant calculé, photo. Moins d’une minute.")}
          </div>
        </div>
        <div className="p-c1r1yj">
          <div className="p-vhxw8h">
            <Icone nom="check" taille={32} trait={2.6} className="p-q7qjlz" />
          </div>
          <div className="p-fdt7cn">
            {t("Colis remis")}
          </div>
          <div className="p-uzhe04">
            {t("B-04 est libre. Le client reçoit la confirmation par notification et peut noter votre accueil pendant 7 jours. Vous touchez 250 F + 300 F de garde.")}
          </div>
          <button type="button" className="p-v96i0s">
            {t("Retrait suivant")}
          </button>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Autres situations au comptoir")}
            </h2>
          </div>
          <div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-carte-paiement" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Commande payable au retrait")}
                </div>
                <Icone nom="minus" taille={18} className="p-672m16" />
              </button>
              <div className="p-l8pg46">
                {t("Pas encore de code : retrouvez le colis par sa référence ou le numéro du client. Le ticket affiche le montant à encaisser (ex. 18 500 F : articles + garde ; la livraison est toujours payée d’avance). Le client paie en MoMo sur son téléphone : ce paiement débloque le code. Jamais d’espèces. Les conditions sont vérifiées à la commande, pas par vous.")}
              </div>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-gcwb3u">
                  <Icone nom="r-fermer" taille={19} className="p-woejqv" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client refuse le colis")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-pile" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Plusieurs colis pour un même client")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-ft0t5q">
                  <Icone nom="r-balance" taille={19} className="p-lhsznn" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client ouvre et conteste sur place")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-i5jj8d">
                  <Icone nom="r-cadenas" taille={19} className="p-rd23br" />
                </div>
                <div className="p-lh0lmv">
                  {t("Code bloqué ou oublié")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
            <div className="p-jmaj5p">
              <button type="button" className="p-w3ueuk">
                <div className="p-iokv7g">
                  <Icone nom="r-lieu" taille={19} className="p-672m16" />
                </div>
                <div className="p-lh0lmv">
                  {t("Le client veut changer de relais")}
                </div>
                <Icone nom="r-plus" taille={18} className="p-672m16" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-0cipe3">
          <Link to={chemin("pin-remise")} className="p-rbzobc">
            <Icone nom="r-cadenas" taille={18} className="p-emic6i" />
            {t("Signature PIN")}
          </Link>
          <Link to={chemin("erreurs")} className="p-rbzobc">
            <Icone nom="r-alerte" taille={18} className="p-emic6i" />
            {t("États d’erreur")}
          </Link>
        </div>
        <Link to={chemin("litiges")} className="p-jv4j92">
          <Icone nom="r-annuler" taille={20} className="p-q7qjlz" />
          <div className="p-lh0lmv">
            {t("Un client dépose un retour validé")}
          </div>
          <Icone nom="r-chevron-droite" taille={18} className="p-q7qjlz" />
        </Link>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Retrait par le client", Rendu: EtatDefaut },
  { id: "colis", libelle: "Code correct · colis trouvé", Rendu: EtatColis },
  { id: "ordre", libelle: "Tout est en ordre ?", Rendu: EtatOrdre },
  { id: "preuve", libelle: "Preuve de remise", Rendu: EtatPreuve },
  { id: "done", libelle: "Colis remis", Rendu: EtatDone },
]

export default function RetraitProvisoire() {
  return <PageProvisoire route="retrait" etats={ETATS} />
}

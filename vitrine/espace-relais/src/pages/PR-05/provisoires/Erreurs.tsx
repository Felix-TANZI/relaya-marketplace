// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Erreurs · États d’erreur) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-05/Erreurs.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Erreurs et cas limites (prototype : Erreurs · {"er":"code"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("États d’erreur au comptoir")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que voit le gérant quand quelque chose bloque. Choisissez un cas.")}
          </div>
        </div>
        <div className="p-8dmjde">
          <button type="button" className="p-h23nx5">
            {t("Code faux")}
          </button>
          <button type="button" className="p-schots">
            {t("Colis bloqué")}
          </button>
          <button type="button" className="p-schots">
            {t("Paiement")}
          </button>
          <button type="button" className="p-schots">
            {t("Mauvais QR")}
          </button>
          <button type="button" className="p-schots">
            {t("Sans réseau")}
          </button>
          <button type="button" className="p-schots">
            {t("Non remettable")}
          </button>
        </div>
        <div className="p-i5o4bp">
          <input type="text" aria-label={t("Chiffre")} defaultValue="4" className="p-kf3cpi" />
          <input type="text" aria-label={t("Chiffre")} defaultValue="8" className="p-kf3cpi" />
          <input type="text" aria-label={t("Chiffre")} defaultValue="2" className="p-kf3cpi" />
          <input type="text" aria-label={t("Chiffre")} defaultValue="9" className="p-kf3cpi" />
          <input type="text" aria-label={t("Chiffre")} defaultValue="5" className="p-kf3cpi" />
          <input type="text" aria-label={t("Chiffre")} defaultValue="1" className="p-kf3cpi" />
        </div>
        <div className="p-9a9wu0">
          <div className="p-wa6ccw">
            <div className="p-lqvhm1">
              <Icone nom="r-fermer" taille={24} className="p-woejqv" />
            </div>
            <div className="p-nlvkht">
              {t("Code incorrect")}
            </div>
          </div>
          <div className="p-5pu05p">
            {t("Ce code ne correspond à aucun colis de votre relais.")}
            {' '}
            <strong>
              {t("Encore 2 essais")}
            </strong>
            {' '}
            {t("pour ce colis, puis il sera bloqué 24 h.")}
          </div>
          <button type="button" className="p-v96i0s">
            {t("Ressaisir le code")}
          </button>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-aide" taille={18} className="p-672m16" />
          <div>
            {t("Règle commune : un message d’erreur dit ce qui s’est passé, ce que le gérant peut faire, et ne montre jamais de code technique.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Colis bloqué (prototype : Erreurs · {"er":"bloque"}) — ?etat=bloque */
export function EtatBloque() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("États d’erreur au comptoir")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que voit le gérant quand quelque chose bloque. Choisissez un cas.")}
          </div>
        </div>
        <div className="p-8dmjde">
          <button type="button" className="p-schots">
            {t("Code faux")}
          </button>
          <button type="button" className="p-h23nx5">
            {t("Colis bloqué")}
          </button>
          <button type="button" className="p-schots">
            {t("Paiement")}
          </button>
          <button type="button" className="p-schots">
            {t("Mauvais QR")}
          </button>
          <button type="button" className="p-schots">
            {t("Sans réseau")}
          </button>
          <button type="button" className="p-schots">
            {t("Non remettable")}
          </button>
        </div>
        <div className="p-9a9wu0">
          <div className="p-wa6ccw">
            <div className="p-lqvhm1">
              <Icone nom="r-cadenas" taille={24} className="p-woejqv" />
            </div>
            <div className="p-nlvkht">
              {t("Colis bloqué 24 h")}
            </div>
          </div>
          <div className="p-5pu05p">
            {t("3 codes faux de suite pour BLV-40231. Le colis est bloqué jusqu’à demain 10:14 et BelivaY est prévenu. Le client doit passer par le support ; vous ne pouvez pas débloquer vous-même.")}
          </div>
          <Link to={chemin("messagerie")} className="p-rbzobc">
            {t("Écrire au support")}
          </Link>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-aide" taille={18} className="p-672m16" />
          <div>
            {t("Règle commune : un message d’erreur dit ce qui s’est passé, ce que le gérant peut faire, et ne montre jamais de code technique.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Paiement (prototype : Erreurs · {"er":"pay"}) — ?etat=pay */
export function EtatPay() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("États d’erreur au comptoir")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que voit le gérant quand quelque chose bloque. Choisissez un cas.")}
          </div>
        </div>
        <div className="p-8dmjde">
          <button type="button" className="p-schots">
            {t("Code faux")}
          </button>
          <button type="button" className="p-schots">
            {t("Colis bloqué")}
          </button>
          <button type="button" className="p-h23nx5">
            {t("Paiement")}
          </button>
          <button type="button" className="p-schots">
            {t("Mauvais QR")}
          </button>
          <button type="button" className="p-schots">
            {t("Sans réseau")}
          </button>
          <button type="button" className="p-schots">
            {t("Non remettable")}
          </button>
        </div>
        <div className="p-zdebuk">
          <div className="p-wa6ccw">
            <div className="p-o4jtkl">
              <Icone nom="r-carte-paiement" taille={24} className="p-lhsznn" />
            </div>
            <div className="p-nlvkht">
              {t("Paiement non abouti")}
            </div>
          </div>
          <div className="p-5pu05p">
            {t("La demande de 400 F n’a pas été validée par le client (délai de 3 minutes dépassé ou solde insuffisant). Rien n’a été débité.")}
          </div>
          <div className="p-0cipe3">
            <button type="button" className="p-rbzobc">
              {t("Annuler")}
            </button>
            <button type="button" className="p-ncx7qc">
              {t("Renvoyer la demande")}
            </button>
          </div>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-aide" taille={18} className="p-672m16" />
          <div>
            {t("Règle commune : un message d’erreur dit ce qui s’est passé, ce que le gérant peut faire, et ne montre jamais de code technique.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Mauvais QR (prototype : Erreurs · {"er":"qr"}) — ?etat=qr */
export function EtatQr() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("États d’erreur au comptoir")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que voit le gérant quand quelque chose bloque. Choisissez un cas.")}
          </div>
        </div>
        <div className="p-8dmjde">
          <button type="button" className="p-schots">
            {t("Code faux")}
          </button>
          <button type="button" className="p-schots">
            {t("Colis bloqué")}
          </button>
          <button type="button" className="p-schots">
            {t("Paiement")}
          </button>
          <button type="button" className="p-h23nx5">
            {t("Mauvais QR")}
          </button>
          <button type="button" className="p-schots">
            {t("Sans réseau")}
          </button>
          <button type="button" className="p-schots">
            {t("Non remettable")}
          </button>
        </div>
        <div className="p-9a9wu0">
          <div className="p-wa6ccw">
            <div className="p-lqvhm1">
              <Icone nom="r-qr" taille={24} className="p-woejqv" />
            </div>
            <div className="p-nlvkht">
              {t("Ce colis n’est pas pour votre relais")}
            </div>
          </div>
          <div className="p-5pu05p">
            {t("L’étiquette scannée (BLV-40412, lot M-4133) est destinée au relais Mvog-Mbi. Ne prenez pas ce colis : le livreur doit l’y déposer.")}
          </div>
          <Link to={chemin("messagerie")} className="p-rbzobc">
            {t("Signaler au support")}
          </Link>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-aide" taille={18} className="p-672m16" />
          <div>
            {t("Règle commune : un message d’erreur dit ce qui s’est passé, ce que le gérant peut faire, et ne montre jamais de code technique.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Sans réseau (prototype : Erreurs · {"er":"res"}) — ?etat=res */
export function EtatRes() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("États d’erreur au comptoir")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que voit le gérant quand quelque chose bloque. Choisissez un cas.")}
          </div>
        </div>
        <div className="p-8dmjde">
          <button type="button" className="p-schots">
            {t("Code faux")}
          </button>
          <button type="button" className="p-schots">
            {t("Colis bloqué")}
          </button>
          <button type="button" className="p-schots">
            {t("Paiement")}
          </button>
          <button type="button" className="p-schots">
            {t("Mauvais QR")}
          </button>
          <button type="button" className="p-h23nx5">
            {t("Sans réseau")}
          </button>
          <button type="button" className="p-schots">
            {t("Non remettable")}
          </button>
        </div>
        <div className="p-zdebuk">
          <div className="p-wa6ccw">
            <div className="p-o4jtkl">
              <Icone nom="r-reseau" taille={24} className="p-lhsznn" />
            </div>
            <div className="p-nlvkht">
              {t("Réseau nécessaire pour le paiement")}
            </div>
          </div>
          <div className="p-5pu05p">
            {t("Ce colis a 400 F de garde à régler. Le paiement MoMo a besoin du réseau : attendez le retour de la connexion ou proposez au client de repasser. Même en mode papier, un colis avec un montant ne se remet pas.")}
          </div>
          <button type="button" className="p-rbzobc">
            {t("Réessayer")}
          </button>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-aide" taille={18} className="p-672m16" />
          <div>
            {t("Règle commune : un message d’erreur dit ce qui s’est passé, ce que le gérant peut faire, et ne montre jamais de code technique.")}
          </div>
        </div>
      </div>
    </>
  )
}

/** Non remettable (prototype : Erreurs · {"er":"rem"}) — ?etat=rem */
export function EtatRem() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("États d’erreur au comptoir")}
          </h1>
          <div className="p-t2u0o2">
            {t("Ce que voit le gérant quand quelque chose bloque. Choisissez un cas.")}
          </div>
        </div>
        <div className="p-8dmjde">
          <button type="button" className="p-schots">
            {t("Code faux")}
          </button>
          <button type="button" className="p-schots">
            {t("Colis bloqué")}
          </button>
          <button type="button" className="p-schots">
            {t("Paiement")}
          </button>
          <button type="button" className="p-schots">
            {t("Mauvais QR")}
          </button>
          <button type="button" className="p-schots">
            {t("Sans réseau")}
          </button>
          <button type="button" className="p-h23nx5">
            {t("Non remettable")}
          </button>
        </div>
        <div className="p-zdebuk">
          <div className="p-wa6ccw">
            <div className="p-o4jtkl">
              <Icone nom="r-alerte" taille={24} className="p-lhsznn" />
            </div>
            <div className="p-nlvkht">
              {t("Ce colis ne peut pas être remis")}
            </div>
          </div>
          <div className="p-5pu05p">
            {t("BLV-40077 est")}
            {' '}
            <strong>
              {t("en constat")}
            </strong>
            {' '}
            {t("(dossier LT-0912) : il reste au relais, sans frais, jusqu’à la décision. Même chose pour un colis en groupage ou à renvoyer.")}
          </div>
          <Link to={chemin("litiges")} className="p-rbzobc">
            {t("Voir le dossier")}
          </Link>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-aide" taille={18} className="p-672m16" />
          <div>
            {t("Règle commune : un message d’erreur dit ce qui s’est passé, ce que le gérant peut faire, et ne montre jamais de code technique.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Erreurs et cas limites", Rendu: EtatDefaut },
  { id: "bloque", libelle: "Colis bloqué", Rendu: EtatBloque },
  { id: "pay", libelle: "Paiement", Rendu: EtatPay },
  { id: "qr", libelle: "Mauvais QR", Rendu: EtatQr },
  { id: "res", libelle: "Sans réseau", Rendu: EtatRes },
  { id: "rem", libelle: "Non remettable", Rendu: EtatRem },
]

export default function ErreursProvisoire() {
  return <PageProvisoire route="erreurs" etats={ETATS} />
}

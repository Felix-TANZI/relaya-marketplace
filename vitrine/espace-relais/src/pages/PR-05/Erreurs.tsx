// États d'erreur au comptoir (PR-05, ERR-01, ERR-02) : ce que voit le gérant quand quelque chose bloque, cas par cas
// (pastilles du prototype, enrichies des cas v6 : paiement en attente, déjà remis, garde non encaissée, PIN faux,
// plafond hors ligne). Chaque carte dit ce qui s'est passé, ce que le gérant peut faire (une action qui mène au bon
// endroit), jamais un code technique ; rouge si bloquant, ambre si temporaire. Mêmes cartes que celles du retrait
// (commun.tsx). Les nombres viennent du registre ; l'exemple « non remettable » est un vrai colis en constat du relais.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { envoyerLaFile, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { CarteErreur, RAISONS_ETAT } from './commun'
import { REGLES } from './regles'
import './pr05.css'

const CAS = [
  { id: 'defaut', libelle: 'Code faux' },
  { id: 'bloque', libelle: 'Colis bloqué' },
  { id: 'pay', libelle: 'Paiement' },
  { id: 'attente', libelle: 'Paiement en attente' },
  { id: 'qr', libelle: 'Mauvais QR' },
  { id: 'res', libelle: 'Sans réseau' },
  { id: 'rem', libelle: 'Non remettable' },
  { id: 'deja', libelle: 'Déjà remis' },
  { id: 'garde', libelle: 'Garde non encaissée' },
  { id: 'pin', libelle: 'PIN faux' },
  { id: 'hl', libelle: 'Plafond hors ligne' },
] as const
type Cas = (typeof CAS)[number]['id']

/** Réessayer le réseau : la file part si le réseau est revenu ; le gérant lit le résultat. */
function Reessayer() {
  const { t } = usePreferences()
  const enLigne = useEnLigne()
  const [dit, setDit] = useState<string | null>(null)
  return (
    <>
      <button
        type="button"
        className="p-rbzobc"
        onClick={async () => {
          if (!navigator.onLine) return void (signal('erreur'), setDit(t('Toujours sans réseau : réessayez dans un moment.')))
          await envoyerLaFile()
          signal('succes')
          setDit(t('Réseau revenu : vos opérations en attente sont parties.'))
        }}
      >
        {t('Réessayer')}
      </button>
      <div className="p-81u2s6" role="status">
        {dit ?? (enLigne ? t('Le téléphone a du réseau en ce moment.') : t('Le téléphone est hors ligne en ce moment.'))}
      </div>
    </>
  )
}

export default function Erreurs() {
  const { t, tf } = usePreferences()
  const [params, setParams] = useSearchParams()
  const cas: Cas = (CAS.find((c) => c.id === params.get('etat'))?.id ?? 'defaut') as Cas
  const constats = useLecture(() => source.stock.stock('constats'), [])
  const exemple = constats.donnees?.colis[0] ?? null
  const choisir = (c: Cas) => (signal('toucher'), setParams(c === 'defaut' ? {} : { etat: c }, { replace: true }))
  const retrait = (
    <Link to={chemin('retrait')} className="p-v96i0s">
      {t('Revenir au retrait')}
    </Link>
  )
  let carte
  switch (cas) {
    case 'bloque':
      carte = (
        <CarteErreur ton="rouge" icone="r-cadenas" titre={tf('Colis bloqué {h} h', { h: REGLES.codeBlocageH })} actions={<Link to={chemin('messagerie')} className="p-rbzobc">{t('Écrire au support')}</Link>}>
          {tf('{n} codes faux de suite pour ce client : ses colis sont bloqués {h} h, jusqu’à l’heure affichée au comptoir. Le client demande lui-même un nouveau code dans son application ; vous ne pouvez pas débloquer. Écrivez au support si la tentative vous paraît suspecte.', { n: REGLES.codeEssais, h: REGLES.codeBlocageH })}
        </CarteErreur>
      )
      break
    case 'pay':
      carte = (
        <CarteErreur
          ton="ambre"
          icone="r-carte-paiement"
          titre={t('Paiement non abouti')}
          actions={
            <div className="p-0cipe3">
              <Link to={chemin('retrait')} className="p-rbzobc">
                {t('Annuler')}
              </Link>
              <Link to={chemin('retrait')} className="p-ncx7qc">
                {t('Renvoyer la demande')}
              </Link>
            </div>
          }
        >
          {tf('La demande de paiement Mobile Money n’a pas été validée par le client (délai de {n} minutes dépassé ou solde insuffisant). Rien n’a été débité. Renvoyez la demande depuis le ticket, ou annulez.', { n: REGLES.paiementDelaiMin })}
        </CarteErreur>
      )
      break
    case 'attente':
      carte = (
        <CarteErreur ton="ambre" icone="r-telephone" titre={t('Paiement en attente du client')} actions={retrait}>
          {tf('La demande est partie sur le téléphone du client : il valide avec son code Mobile Money. Le ticket passe tout seul à « payé » dès la confirmation, au plus tard {n} minutes après. Ne remettez rien avant.', { n: REGLES.paiementDelaiMin })}
        </CarteErreur>
      )
      break
    case 'qr':
      carte = (
        <CarteErreur ton="rouge" icone="r-qr" titre={t('Ce colis n’est pas pour votre relais')} actions={<Link to={chemin('messagerie')} className="p-rbzobc">{t('Signaler au support')}</Link>}>
          {t('L’étiquette scannée est destinée à un autre relais. Ne prenez pas ce colis : le livreur doit l’y déposer.')}
        </CarteErreur>
      )
      break
    case 'res':
      carte = (
        <CarteErreur ton="ambre" icone="r-reseau" titre={t('Réseau nécessaire pour le paiement Mobile Money')} actions={<Reessayer />}>
          {tf('Sans réseau, seul un colis dont seule la garde est due peut être remis : la garde se paie en espèces, l’encaissement et la remise partent au retour du réseau ({n} remises hors ligne par jour au plus). Un paiement Mobile Money attend le réseau, ou le client repasse.', { n: REGLES.horsLigneRemises })}
        </CarteErreur>
      )
      break
    case 'rem':
      carte = (
        <CarteErreur
          ton="ambre"
          icone="r-alerte"
          titre={t('Ce colis ne peut pas être remis')}
          actions={
            <Link to={exemple?.constat ? chemin('dossier-litige', { id: exemple.constat }) : chemin('litiges')} className="p-rbzobc">
              {t('Voir le dossier')}
            </Link>
          }
        >
          {exemple ? (
            <>
              {tf('{colis} est', { colis: exemple.id })} <strong>{t('en constat')}</strong> {exemple.constat ? tf('(dossier {id}) : il reste au relais, sans frais, jusqu’à la décision.', { id: exemple.constat }) : t('il reste au relais, sans frais, jusqu’à la décision.')}{' '}
            </>
          ) : (
            tf('Ce colis ne peut pas être remis : {raison}', { raison: t(RAISONS_ETAT.en_constat) }) + '. '
          )}
          {t('Même chose pour un colis en groupage ou à renvoyer.')}
        </CarteErreur>
      )
      break
    case 'deja':
      carte = (
        <CarteErreur ton="rouge" icone="package-check" titre={t('Colis déjà remis')} actions={<Link to={chemin('historique')} className="p-rbzobc">{t('Voir l’historique')}</Link>}>
          {t('Ce code a déjà servi : le colis a été remis, avec sa photo et le nom de qui l’a remis. Un code ne sert qu’une fois.')}
        </CarteErreur>
      )
      break
    case 'garde':
      carte = (
        <CarteErreur ton="ambre" icone="banknote" titre={t('Encaissement non confirmé')} actions={retrait}>
          {t('La garde en espèces n’est pas confirmée : la remise reste bloquée. Encaissez les espèces, tapez le montant reçu si besoin, puis touchez « Confirmer l’encaissement ».')}
        </CarteErreur>
      )
      break
    case 'pin':
      carte = (
        <CarteErreur ton="rouge" icone="r-cadenas" titre={t('Remise annulée : PIN faux')} actions={retrait}>
          {tf('{n} PIN faux pendant une remise : elle est annulée, le colis reste en stock, les espèces sont rendues au client (contre-écriture au journal) et le gérant est prévenu. Au {e}e PIN faux de suite, votre PIN est bloqué {m} minutes.', { n: REGLES.pinEssaisRemise, e: REGLES.pinEssais, m: REGLES.pinBlocageMin })}
        </CarteErreur>
      )
      break
    case 'hl':
      carte = (
        <CarteErreur ton="ambre" icone="cloud-off" titre={t('Plafond hors ligne atteint')} actions={<Reessayer />}>
          {tf('{n} remises hors ligne aujourd’hui : attendez le retour du réseau pour remettre d’autres colis. Rien n’est perdu : les opérations faites partent au retour du réseau.', { n: REGLES.horsLigneRemises })}
        </CarteErreur>
      )
      break
    default:
      carte = (
        <>
          <div className="p-i5o4bp" aria-hidden="true">
            {Array.from({ length: REGLES.codeLongueur }, (_, i) => (
              <div key={i} className="p-kf3cpi pr05-case-exemple">
                •
              </div>
            ))}
          </div>
          <CarteErreur ton="rouge" icone="r-fermer" titre={t('Code incorrect')} actions={<Link to={chemin('retrait')} className="p-v96i0s">{t('Ressaisir le code')}</Link>}>
            {t('Ce code ne correspond à aucun colis prêt dans votre relais.')} <strong>{tf('Encore {n} essais', { n: REGLES.codeEssais - 1 })}</strong> {tf('pour ce client, puis ses colis sont bloqués {h} h.', { h: REGLES.codeBlocageH })}
          </CarteErreur>
        </>
      )
  }
  return (
    <Ecran route="erreurs">
      <div className="p-0hxmj8 r-pile pr05">
        <div>
          <h1 className="p-bvhkrl">{t('États d’erreur au comptoir')}</h1>
          <div className="p-t2u0o2">{t('Ce que voit le gérant quand quelque chose bloque. Choisissez un cas.')}</div>
        </div>
        <div className="p-8dmjde" role="group" aria-label={t('Cas')}>
          {CAS.map((c) => (
            <button key={c.id} type="button" className={c.id === cas ? 'p-h23nx5' : 'p-schots'} aria-pressed={c.id === cas} onClick={() => choisir(c.id)}>
              {t(c.libelle)}
            </button>
          ))}
        </div>
        {carte}
        <div className="p-gh7puf">
          <Icone nom="r-aide" taille={18} className="p-672m16" />
          <div>{t('Règle commune : un message d’erreur dit ce qui s’est passé, ce que le gérant peut faire, et ne montre jamais de code technique.')}</div>
        </div>
      </div>
    </Ecran>
  )
}

// Les services qui lèvent les freins (VD-10, fig. 10) : repris du prototype (route('services'), feuille ?demande=1),
// branché sur GET /services et POST /services/request (domaine plans).
// - Le service du frein le plus fort d'abord, seul bouton plein (SRV-02, VD10-R44) ; les autres ouvrent l'écran où ils
//   sont proposés (Fiche prioritaire → Demander une fiche ; Saisie assistée) ; proposés au moment du frein (SRV-01).
// - Feuille de demande (SRV-03, PLN-04) : ce qui est fait, le paiement par Mobile Money confirmé sur le téléphone, la
//   facture dans Documents ; « Payer 3 000 F » envoie une demande de paiement ; rien n'est demandé à l'agent avant la
//   confirmation ; refus : « Paiement non confirmé. Rien n'a été activé. » et « Réessayer ».
// - Ajouts : suivi de la demande (paiement en attente, visite prévue avant …, remboursée si l'agent ne vient pas sous
//   72 h ouvrées : P-4), saisie assistée gratuite pour la boutique (Q-40).
// - Accès Préparation : réservé au propriétaire.
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { DemandePaiement, Service, Services as DonneesServices } from '../../donnees/domaines/plans'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { Attente, Bouton, dateEtHeure, Feuille, HorsLigne, Ligne, LigneFeuille, Plus, useEnLigne, useMontant, useToast } from './commun'

function SuiviDemande({ s, d }: { s: Service; d: DonneesServices }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const [occupe, setOccupe] = useState(false)
  if (!s.demande) return null
  const numero = `${d.numero.operateur} ${d.numero.masque}`
  if (s.demande.statut === 'en_attente')
    return (
      <div className="note ink">
        <Icone nom="smartphone" taille={18} />
        <div>
          {tf('Demande de {m} envoyée sur votre téléphone ({numero}) : confirmez-la dans le menu de votre opérateur.', { m: montant(s.prix), numero })}
          <div className="mt8">
            <Bouton
              classe="secondary sm"
              icone="circle-check"
              desactive={occupe}
              onClick={async () => {
                setOccupe(true)
                await source.plans.paiement(s.demande!.id)
                setOccupe(false)
              }}
              style={{ height: '44px' }}
            >
              {t('J’ai confirmé sur mon téléphone')}
            </Bouton>
          </div>
        </div>
      </div>
    )
  if (s.demande.statut === 'rembourse')
    return (
      <div className="note amber">
        <Icone nom="rotate-ccw" taille={18} />
        <div>{tf('L’agent n’est pas venu à temps : {m} remboursés sur {numero}.', { m: montant(s.prix), numero })}</div>
      </div>
    )
  return (
    <div className="note green">
      <Icone nom="calendar-check" taille={18} />
      <div>
        <b>{t('Demande confirmée.')}</b> {s.demande.visiteAvant ? tf('Un agent de la zone {z} vous appelle et passe avant {quand}. Sinon, vous êtes remboursé sur {numero}.', { z: d.zone, quand: dateEtHeure(s.demande.visiteAvant, langue), numero }) : t('La facture arrive dans Documents.')}
      </div>
    </div>
  )
}

function FeuilleService({ s, d, fermer, fait }: { s: Service; d: DonneesServices; fermer: () => void; fait: (texte: string) => void }) {
  const { t, tf } = usePreferences()
  const montant = useMontant()
  const enLigne = useEnLigne()
  const [demande, setDemande] = useState<DemandePaiement | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const numero = `${d.numero.operateur} ${d.numero.masque}`
  const payer = async () => {
    setOccupe(true)
    setErreur(null)
    const r = await source.plans.demanderService(s.id)
    setOccupe(false)
    if (r.ok) setDemande(r.demande)
    else setErreur(t(r.raison === 'deja_demande' ? 'Ce service est déjà demandé.' : 'Ce service vous est offert.'))
  }
  const verifier = async () => {
    if (!demande) return
    setOccupe(true)
    const p = await source.plans.paiement(demande.id)
    setOccupe(false)
    if (p?.statut === 'confirme') fait(t('Paiement confirmé : l’agent de votre zone vous appelle. La facture arrive dans Documents.'))
    else {
      setDemande(null)
      setErreur(t('Paiement non confirmé. Rien n’a été activé.'))
      jouer('erreur')
    }
  }
  return (
    <Feuille titre={t(s.titre)} fermer={fermer}>
      <div className="mt8">
        <LigneFeuille icone="camera" ton="or">
          {tf('Un agent de la zone {z} vous appelle, puis photographie 10 produits dans votre boutique.', { z: d.zone })}
        </LigneFeuille>
        {demande ? (
          <LigneFeuille icone="key-round">{tf('Demande de {m} envoyée sur votre téléphone ({numero}). Confirmez-la dans le menu de votre opérateur ; BelivaY ne vous demande jamais votre code secret.', { m: montant(demande.montant), numero })}</LigneFeuille>
        ) : (
          <LigneFeuille icone="smartphone">{tf('Payé par Mobile Money ({numero}), confirmé sur votre téléphone.', { numero })}</LigneFeuille>
        )}
        <LigneFeuille icone="file-text">{t('La facture arrive dans Documents.')}</LigneFeuille>
        <LigneFeuille icone="rotate-ccw">{tf('Si l’agent ne passe pas sous {n} h ouvrées, vous êtes remboursé sur le même numéro.', { n: d.delaiVisiteHeures })}</LigneFeuille>
      </div>
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{erreur}</div>
        </div>
      )}
      <div className="mt14">
        {demande ? (
          <Bouton classe="primary" icone="circle-check" onClick={() => void verifier()} desactive={!enLigne || occupe} raison={t('Pas de connexion : réessayez dans un moment.')}>
            {t('J’ai confirmé sur mon téléphone')}
          </Bouton>
        ) : (
          <Bouton classe="primary" icone="smartphone" onClick={() => void payer()} desactive={!enLigne || occupe} raison={t('Pas de connexion : réessayez dans un moment.')}>
            {erreur ? t('Réessayer') : tf('Payer {prix}', { prix: montant(s.prix) })}
          </Bouton>
        )}
        {!enLigne && <p className="t13 cr mt6">{t('Pas de connexion : réessayez dans un moment.')}</p>}
      </div>
      <div className="mt8">
        <Bouton classe="ghost" onClick={demande ? () => void source.plans.annulerPaiement(demande.id).then(() => setDemande(null)) : fermer}>
          {demande ? t('Annuler la demande') : t('Annuler')}
        </Bouton>
      </div>
    </Feuille>
  )
}

function Contenu({ d }: { d: DonneesServices }) {
  const { t, tf } = usePreferences()
  const montant = useMontant()
  const enLigne = useEnLigne()
  const [p, setP] = useSearchParams()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const [toast, dire] = useToast()
  useEffect(() => {
    const st = lieu.state as { toast?: string } | null
    if (!st?.toast) return
    dire(st.toast, true)
    window.history.replaceState({ ...window.history.state, usr: null }, '')
  }, [lieu.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [cle, ...autres] = d.liste
  const ouvert = p.get('demande') === '1' && cle && !cle.demande && !cle.gratuit
  const fermer = () => setP({}, { replace: true })
  const fait = (texte: string) => {
    jouer('paiement')
    naviguer(chemin('services'), { replace: true, state: { toast: texte } })
  }
  return (
    <Ecran route="services" parEtat={!!ouvert} fixes={ouvert ? <FeuilleService s={cle} d={d} fermer={fermer} fait={fait} /> : undefined}>
      <div className="pg">
        <h1 className="pg-t">{t('Des services qui lèvent les freins')}</h1>
      </div>
      {!enLigne && <HorsLigne />}
      {cle && (
        <div className="card" style={{ border: '1.5px solid var(--or-line)' }}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span className="li" style={{ padding: '0', border: '0', minHeight: '0' }}>
              <span className="ic or">
                <Icone nom="camera" taille={20} />
              </span>
            </span>
            <div className="grow">
              <div className="b8 t15">{t(cle.titre)}</div>
              <div className="b8 t13 cor mt4">{`${montant(cle.prix)} ${t(cle.unite)}`}</div>
            </div>
          </div>
          {cle.frein && (
            <div className="note amber" style={{ marginTop: '12px' }}>
              <Icone nom="lightbulb" taille={18} />
              <div>
                <b>{tf('Votre frein : {frein}.', { frein: t(cle.frein).replace(/^./, (c) => c.toLowerCase()) })}</b>
                {t(' La photo est le premier frein relevé par La demande.')}
              </div>
            </div>
          )}
          {cle.demande ? (
            <SuiviDemande s={cle} d={d} />
          ) : (
            <div className="mt12">
              <Bouton classe="primary" icone="calendar" onClick={() => setP({ demande: '1' })}>
                {t('Demander un agent')}
              </Bouton>
            </div>
          )}
        </div>
      )}
      <div className="sec">
        <h2>{t('Autres services')}</h2>
      </div>
      <div className="card tight" style={{ marginTop: '0' }}>
        {autres.map((s) => (
          <Ligne
            key={s.id}
            vers={chemin(s.route ?? 'services')}
            icone={s.id === 'fiche_prioritaire' ? 'file-pen' : 'users'}
            ton="or"
            titre={s.gratuit ? t(s.titre) : `${t(s.titre)} · ${montant(s.prix)}`}
            sous={
              s.id === 'fiche_prioritaire'
                ? t('BelivaY rédige la fiche de votre produit sous 24 h au lieu de 48 h. Proposée quand vous demandez une fiche.')
                : s.gratuit
                  ? tf('Votre catalogue mis en ligne sans effort, fiches validées par vous. Offerte à votre boutique, puis {prix} la session.', { prix: montant(s.prix) })
                  : t(s.titre)
            }
          />
        ))}
      </div>
      <Plus titre={t('Comment ça marche')}>
        <p>{t('Chaque service vous est proposé au moment où le frein apparaît, jamais par un bandeau publicitaire.')}</p>
        <p>{t('Vous payez par Mobile Money depuis votre numéro de versement, confirmé sur votre téléphone. Rien n’est pris sur vos versements.')}</p>
        <p>{tf('Si l’agent ne passe pas sous {n} h ouvrées, vous êtes remboursé automatiquement.', { n: d.delaiVisiteHeures })}</p>
      </Plus>
      {toast}
    </Ecran>
  )
}

export default function Services() {
  const lecture = useLecture(() => source.plans.services(), [])
  return <Attente route="services" lecture={lecture}>{(d) => <Contenu d={d} />}</Attente>
}

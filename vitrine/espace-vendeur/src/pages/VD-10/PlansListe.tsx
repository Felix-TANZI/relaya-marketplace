// Les plans (VD-10, fig. 6-7 ; « Plans & tarifs ») : repris du prototype (route('plans_liste'), feuilles ?essai=boost
// et ?essai=pro), branché sur GET /plans, la réponse du simulateur et POST /plans/subscribe (domaine plans).
// - Plan actuel d'abord (PLN-03) : bord vert, « Votre plan », offre de découverte (compteur, barre, date ; gain dit en
//   francs, Q-03 : plus de « 3 points »), ce qu'il contient, note verte du simulateur (meilleur plan pour les ventes du
//   mois), seul bouton plein « Comparer avec mes ventes ».
// - Autres plans : prix au mois et à l'année en francs (10 mois payés, VD-D11.A14), contenu sans visibilité payante
//   (DP-14, Q-32) ; violet réservé au Pro (VD10-R34) ; Sur-mesure sans bouton.
// - Feuille d'essai (PLN-05, VD10-R30, R31) : « Aujourd'hui : 0 F », le prix ensuite et le numéro, l'arrêt sans frais,
//   « Commencer l'essai » (le plan s'active tout de suite) ; essai déjà utilisé : « Choisir Boost », au mois ou à
//   l'année, demande de paiement Mobile Money confirmée sur le téléphone (PLN-04), « Paiement non confirmé. Rien n'a
//   été activé. » et « Réessayer » ; hors connexion : bouton désactivé avec la raison.
// - Ajouts : plan en cours (essai jusqu'au …, rappel le …, prochain paiement), « Arrêter » / « Reprendre » sans frais.
// - Accès Préparation : réservé au propriétaire (403 owner_only : VD-D12.A03).
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Plan } from '../../donnees/communs'
import type { DemandePaiement, EtatPlan, OffrePlan, Simulation } from '../../donnees/domaines/plans'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { Attente, Bouton, dateCourte, Feuille, HorsLigne, LigneFeuille, Plus, Segments, SEG_PLANS, useApparu, useEnLigne, useMontant, useToast } from './commun'

function Coche({ texte }: { texte: string }) {
  const { t } = usePreferences()
  return (
    <div className="row" style={{ padding: '5px 0', alignItems: 'flex-start' }}>
      <Icone nom="check" taille={16} trait={2.4} style={{ color: 'var(--green)', flexShrink: '0', marginTop: '2px' }} />
      <span className="t13 c2" style={{ lineHeight: '1.45' }}>
        {t(texte)}
      </span>
    </div>
  )
}

function Decouverte({ e }: { e: EtatPlan }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const apparu = useApparu()
  const d = e.decouverte
  if (!d.active) return null
  return (
    <div className="card flat" style={{ marginTop: '14px', padding: '14px' }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', background: 'var(--green-soft)', color: 'var(--green)' }}>
          <Icone nom="gift" taille={18} />
        </span>
        <div className="grow">
          <div className="b8 t14">{t('Offre de découverte')}</div>
          <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
            {tf('Vous gardez {gain} de plus sur chaque {titre} vendu {prix}.', { gain: montant(d.gain.gain), titre: d.gain.titre, prix: montant(d.gain.prix) })}
          </div>
        </div>
      </div>
      <div className="bar mt12" role="progressbar" aria-valuemin={0} aria-valuemax={d.max} aria-valuenow={d.commandes} aria-label={t('Offre de découverte')}>
        <i style={{ width: `${apparu ? Math.min(100, (d.commandes / d.max) * 100) : 0}%` }}></i>
      </div>
      <div className="row t13 b7 mt8">
        <span className="grow">{tf('{n} commandes sur {max}', { n: d.commandes, max: d.max })}</span>
        <span className="nw">{tf('jusqu’au {date}', { date: dateCourte(d.fin, langue) })}</span>
      </div>
      <div className="t12 c3 mt4" style={{ lineHeight: '1.45' }}>
        {t('Elle s’arrête dès que l’une des deux limites est atteinte.')}
      </div>
    </div>
  )
}

function EnTetePlan({ o, actuel, e }: { o: OffrePlan; actuel: boolean; e: EtatPlan }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const essai = actuel && e.facturation === 'essai'
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="grow">
        <div className="row" style={{ gap: '8px' }}>
          <span className="b8" style={{ fontSize: '19px' }}>
            {t(o.plan)}
          </span>
          {o.plan === 'Pro' && <Icone nom="sparkles" taille={18} style={{ color: 'var(--violet-txt)' }} />}
          {actuel && <span className="pill green">{essai ? t('Essai offert') : t('Votre plan')}</span>}
        </div>
        {o.prixAnnuel !== null && <div className="t12 c3 mt4">{tf('Ou {prix} par an · {n} mois payés', { prix: montant(o.prixAnnuel), n: Math.round(o.prixAnnuel / o.prixMensuel) })}</div>}
        {essai && e.finEssai && <div className="t12 cg b7 mt4">{tf('Offert jusqu’au {date}', { date: dateCourte(e.finEssai, langue) })}</div>}
      </div>
      <div className="right">
        <div className="b8 nw" style={{ fontSize: '22px' }}>
          {montant(actuel && e.facturation === 'annuelle' && o.prixAnnuel !== null ? o.prixAnnuel : o.prixMensuel)}
        </div>
        <div className="t12 c3">{actuel && e.facturation === 'annuelle' ? t('par an') : t('par mois')}</div>
      </div>
    </div>
  )
}

function PlanActuel({ o, e, sim }: { o: OffrePlan; e: EtatPlan; sim: Simulation | null }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const [toast, dire] = useToast()
  const arreter = async (a: boolean) => {
    await source.plans.arreter(a)
    jouer('interrupteur')
    dire(a ? t('C’est noté : retour à Free à la fin de la période, sans frais.') : tf('{plan} continue.', { plan: o.plan }))
  }
  return (
    <div className="card" style={{ border: '1.5px solid var(--green-line)' }}>
      <EnTetePlan o={o} actuel e={e} />
      {o.plan === 'Free' && <Decouverte e={e} />}
      <div className="hr"></div>
      {o.inclus.map((x) => (
        <Coche key={x} texte={x} />
      ))}
      {o.plan !== 'Free' && (
        <div className="note ink">
          <Icone nom="calendar-clock" taille={18} />
          <div>
            {e.arretDemande
              ? tf('Arrêt demandé : retour à Free le {date}, sans frais.', { date: e.finPeriode ? dateCourte(e.finPeriode, langue) : '' })
              : e.facturation === 'essai' && e.rappelLe && e.prochainPaiement
                ? tf('Rappel le {rappel}. Le {date}, une demande de {montant} arrive sur votre téléphone ; sans confirmation, retour à Free sans rien perdre.', { rappel: dateCourte(e.rappelLe, langue), date: dateCourte(e.prochainPaiement.jour, langue), montant: montant(e.prochainPaiement.montant) })
                : e.prochainPaiement
                  ? tf('Prochain paiement le {date} : {montant}, confirmé sur votre téléphone.', { date: dateCourte(e.prochainPaiement.jour, langue), montant: montant(e.prochainPaiement.montant) })
                  : t('Plan en cours.')}
          </div>
        </div>
      )}
      {sim && (
        <div className="note green">
          <Icone nom="badge-check" taille={18} />
          <div>
            <b>{tf('Ce mois-ci, {plan} vous fait garder le plus.', { plan: t(sim.meilleur) })}</b>
          </div>
        </div>
      )}
      <div className="mt12">
        <Bouton classe="primary" icone="calculator" vers={chemin('plans')}>
          {t('Comparer avec mes ventes')}
        </Bouton>
      </div>
      {o.plan !== 'Free' && (
        <div className="mt8">
          {e.arretDemande ? (
            <Bouton classe="secondary" icone="rotate-ccw" onClick={() => void arreter(false)} style={{ height: '44px' }}>
              {tf('Garder {plan}', { plan: o.plan })}
            </Bouton>
          ) : (
            <Bouton classe="secondary" icone="circle-pause" onClick={() => void arreter(true)} style={{ height: '44px' }}>
              {e.facturation === 'essai' ? t('Arrêter l’essai') : tf('Arrêter {plan}', { plan: o.plan })}
            </Bouton>
          )}
        </div>
      )}
      {toast}
    </div>
  )
}

function AutrePlan({ o, e }: { o: OffrePlan; e: EtatPlan }) {
  const { t, tf } = usePreferences()
  const [, setP] = useSearchParams()
  const ouvrir = () => setP({ essai: o.plan.toLowerCase() }, { replace: false })
  return (
    <div className="card" style={o.plan === 'Pro' ? { border: '1.5px solid var(--violet-line)' } : undefined}>
      <EnTetePlan o={o} actuel={false} e={e} />
      <div className="hr"></div>
      {o.inclus.map((x) => (
        <Coche key={x} texte={x} />
      ))}
      {o.plan !== 'Free' && (
        <div className="mt12">
          <Bouton classe="secondary" icone={o.essaiPossible ? 'gift' : 'smartphone'} onClick={ouvrir} style={{ height: '44px' }}>
            {o.essaiPossible ? t('Essayer un mois offert') : tf('Choisir {plan}', { plan: o.plan })}
          </Bouton>
        </div>
      )}
    </div>
  )
}

function FeuillePlan({ o, e, fermer }: { o: OffrePlan; e: EtatPlan; fermer: () => void }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const enLigne = useEnLigne()
  const naviguer = useNavigate()
  const [facturation, setFacturation] = useState<'mensuelle' | 'annuelle'>('mensuelle')
  const [demande, setDemande] = useState<DemandePaiement | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const plan = o.plan as Exclude<Plan, 'Free'>
  const numero = `${e.numero.operateur} ${e.numero.masque}`
  const prix = facturation === 'annuelle' && o.prixAnnuel !== null ? o.prixAnnuel : o.prixMensuel
  const fini = (texte: string) => {
    jouer('paiement')
    naviguer(chemin('plans_liste'), { replace: true, state: { toast: texte } })
  }
  const commencer = async () => {
    setOccupe(true)
    const r = await source.plans.essayer(plan)
    setOccupe(false)
    if (r.ok) fini(tf('{plan} est actif : offert jusqu’au {date}.', { plan, date: dateCourte(r.finEssai, langue) }))
    else setErreur(r.raison === 'deja_essaye' ? t('L’essai de ce plan est déjà utilisé.') : tf('{plan} est déjà votre plan.', { plan }))
  }
  const payer = async () => {
    setOccupe(true)
    setErreur(null)
    const r = await source.plans.souscrire(plan, facturation)
    setOccupe(false)
    if (r.ok) setDemande(r.demande)
    else setErreur(tf('{plan} est déjà votre plan.', { plan }))
  }
  const verifier = async () => {
    if (!demande) return
    setOccupe(true)
    const p = await source.plans.paiement(demande.id)
    setOccupe(false)
    if (p?.statut === 'confirme') fini(tf('Paiement confirmé : {plan} est actif. La facture arrive dans Documents.', { plan }))
    else {
      setDemande(null)
      setErreur(t('Paiement non confirmé. Rien n’a été activé.'))
      jouer('erreur')
    }
  }
  const annulerDemande = async () => {
    if (demande) await source.plans.annulerPaiement(demande.id)
    setDemande(null)
  }
  const titre = o.essaiPossible ? tf('Essayer {plan} un mois', { plan }) : tf('Choisir {plan}', { plan })
  return (
    <Feuille titre={titre} fermer={fermer}>
      {!o.essaiPossible && !demande && (
        <div className="vd10-filtres" role="radiogroup" aria-label={t('Facturation')}>
          <button type="button" role="radio" aria-checked={facturation === 'mensuelle'} className={'chip' + (facturation === 'mensuelle' ? ' on' : '')} onClick={() => setFacturation('mensuelle')}>
            {tf('Par mois · {prix}', { prix: montant(o.prixMensuel) })}
          </button>
          {o.prixAnnuel !== null && (
            <button type="button" role="radio" aria-checked={facturation === 'annuelle'} className={'chip' + (facturation === 'annuelle' ? ' on' : '')} onClick={() => setFacturation('annuelle')}>
              {tf('À l’année · {prix}', { prix: montant(o.prixAnnuel) })}
            </button>
          )}
        </div>
      )}
      <div className="mt8">
        {o.essaiPossible ? (
          <>
            <LigneFeuille icone="gift" ton="green">
              <b style={{ color: 'var(--ink)' }}>{t('Aujourd’hui : 0 F.')}</b>
            </LigneFeuille>
            <LigneFeuille icone="smartphone">
              {t('Ensuite : ')}
              <b style={{ color: 'var(--ink)' }}>{tf('{prix} par mois', { prix: montant(o.prixMensuel) })}</b>
              {tf(', payés par Mobile Money ({numero}), confirmés sur votre téléphone.', { numero })}
            </LigneFeuille>
            <LigneFeuille icone="bell">{t('Arrêtez quand vous voulez, sans frais ; un rappel 3 jours avant la fin de l’essai.')}</LigneFeuille>
          </>
        ) : demande ? (
          <>
            <LigneFeuille icone="smartphone" ton="or">
              <b style={{ color: 'var(--ink)' }}>{tf('Demande de {montant} envoyée sur votre téléphone ({numero}).', { montant: montant(demande.montant), numero })}</b>
            </LigneFeuille>
            <LigneFeuille icone="key-round">{t('Confirmez-la dans le menu de votre opérateur. BelivaY ne vous demande jamais votre code secret.')}</LigneFeuille>
          </>
        ) : (
          <>
            <LigneFeuille icone="smartphone" ton="or">
              <b style={{ color: 'var(--ink)' }}>{tf('Aujourd’hui : {prix}.', { prix: montant(prix) })}</b>
              {facturation === 'annuelle' ? t(' Pour 12 mois.') : t(' Puis chaque mois.')}
            </LigneFeuille>
            <LigneFeuille icone="smartphone">{tf('Payé par Mobile Money ({numero}), confirmé sur votre téléphone.', { numero })}</LigneFeuille>
            <LigneFeuille icone="file-text">{t('La facture arrive dans Documents. Rien n’est pris sur vos versements.')}</LigneFeuille>
          </>
        )}
      </div>
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{erreur}</div>
        </div>
      )}
      <div className="mt14">
        {o.essaiPossible ? (
          <Bouton classe="primary" icone="gift" onClick={() => void commencer()} desactive={!enLigne || occupe} raison={t('Pas de connexion : réessayez dans un moment.')}>
            {t('Commencer l’essai')}
          </Bouton>
        ) : demande ? (
          <Bouton classe="primary" icone="circle-check" onClick={() => void verifier()} desactive={!enLigne || occupe} raison={t('Pas de connexion : réessayez dans un moment.')}>
            {t('J’ai confirmé sur mon téléphone')}
          </Bouton>
        ) : (
          <Bouton classe="primary" icone="smartphone" onClick={() => void payer()} desactive={!enLigne || occupe} raison={t('Pas de connexion : réessayez dans un moment.')}>
            {erreur ? t('Réessayer') : tf('Payer {prix}', { prix: montant(prix) })}
          </Bouton>
        )}
        {!enLigne && <p className="t13 cr mt6">{t('Pas de connexion : réessayez dans un moment.')}</p>}
      </div>
      <div className="mt8">
        <Bouton classe="ghost" onClick={demande ? () => void annulerDemande() : fermer}>
          {demande ? t('Annuler la demande') : t('Annuler')}
        </Bouton>
      </div>
    </Feuille>
  )
}

interface Donnees {
  offres: OffrePlan[]
  e: EtatPlan
}

function Contenu({ d, sim }: { d: Donnees; sim: Simulation | null }) {
  const { t, tf } = usePreferences()
  const montant = useMontant()
  const [p, setP] = useSearchParams()
  const enLigne = useEnLigne()
  const [toast, dire] = useToast()
  const lieu = useLocation()
  useEffect(() => {
    const st = lieu.state as { toast?: string } | null
    if (!st?.toast) return
    dire(st.toast, true)
    window.history.replaceState({ ...window.history.state, usr: null }, '')
  }, [lieu.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const essai = p.get('essai')
  const actuel = d.offres.find((o) => o.actuel)!
  const choisie = d.offres.find((o) => o.plan.toLowerCase() === essai && o.plan !== 'Free' && !o.actuel) ?? null
  const fermer = () => setP({}, { replace: true })
  return (
    <Ecran route="plans_liste" parEtat={!!choisie} fixes={choisie ? <FeuillePlan o={choisie} e={d.e} fermer={fermer} /> : undefined}>
      <div className="pg">
        <h1 className="pg-t">{t('Plans & tarifs')}</h1>
      </div>
      <Segments items={SEG_PLANS} actif="plans_liste" />
      {!enLigne && <HorsLigne />}
      <PlanActuel o={actuel} e={d.e} sim={sim} />
      <div className="sec">
        <h2>{t('Les autres plans')}</h2>
      </div>
      {d.offres
        .filter((o) => !o.actuel)
        .map((o) => (
          <AutrePlan key={o.plan} o={o} e={d.e} />
        ))}
      <div className="card">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <div className="row" style={{ gap: '8px' }}>
              <span className="b8" style={{ fontSize: '19px' }}>
                {t('Sur-mesure')}
              </span>
            </div>
            <div className="t12 c3 mt4">{tf('Dès {prix} de ventes par mois', { prix: montant(d.e.surMesureDes) })}</div>
          </div>
          <div className="right">
            <div className="b8 nw" style={{ fontSize: '22px' }}>
              {t('Négocié')}
            </div>
            <div className="t12 c3">{t('selon contrat')}</div>
          </div>
        </div>
        <div className="hr"></div>
        <Coche texte="Responsable de compte" />
        <Coche texte="Import de votre catalogue" />
      </div>
      <Plus titre={t('Comment ça marche')}>
        <p>
          <b>{t('Essai :')}</b>
          {t(' un mois offert, une fois par plan. Un rappel arrive 3 jours avant la fin.')}
        </p>
        <p>
          <b>{t('Paiement :')}</b>
          {t(' par Mobile Money, sur votre numéro de versement. Vous confirmez chaque paiement sur votre téléphone ; la facture arrive dans Documents.')}
        </p>
        <p>
          <b>{t('À l’année :')}</b>
          {t(' 10 mois payés pour 12.')}
        </p>
        <p>
          <b>{t('Changement de plan :')}</b>
          {t(' au prorata.')}
        </p>
        <p>
          <b>{t('Si le paiement échoue :')}</b>
          {t(' 7 jours de grâce, puis Free, sans rien perdre.')}
        </p>
        <p>{t('Ce qu’un plan vous fait garder en plus ne dépasse jamais son prix.')}</p>
      </Plus>
      {toast}
    </Ecran>
  )
}

export default function PlansListe() {
  const lecture = useLecture(() => Promise.all([source.plans.plans(), source.plans.etat()]).then(([offres, e]) => ({ offres, e })), [])
  const sim = useLecture(() => source.plans.simuler(), [])
  return <Attente route="plans_liste" lecture={lecture}>{(d) => <Contenu d={d} sim={sim.donnees} />}</Attente>
}

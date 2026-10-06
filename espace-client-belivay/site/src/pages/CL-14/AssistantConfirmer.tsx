// Écran « Confirmer la proposition » (CL-14 ; FF-IA), forme d'origine du prototype rendue réelle (DP-54) : la
// conversation de l'assistant reste dessous, voilée ; la feuille montre en clair ce qu'il propose :
// - annuler un colis (?ref=…&n=…) : la commande, le colis, les articles, la livraison en moins (frais recalculés),
//   le moyen qui reçoit le remboursement et le remboursement exact ; « Confirmer l'annulation » annule, puis la
//   conversation reprend avec « Confirmé par toi » et ce qui a été fait ;
// - relancer un paiement (?action=paiement&ref=…) : la commande qui attend ta validation Mobile Money, ses lignes,
//   la livraison, le moyen, le total et l'heure jusqu'à laquelle les articles restent réservés ; « Payer » ouvre
//   la validation sur le téléphone.
// Rien ne se passe sans « Confirmer » ; « Ne rien faire » (ou le voile) revient à l'assistant.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type ApercuAnnulation, type CommandePassee } from '../../donnees/source'
import { F } from '../../i18n/format'
import { heureSeule } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { CarteAssistant, Conversation, Saisie, ecrireFil, lireFil } from './Assistant'
import { Bloc } from './Commun'

export function AssistantConfirmer() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const paiement = params.get('action') === 'paiement'
  const ref = params.get('ref') ?? ''
  const n = Number(params.get('n') ?? 0)
  const [a, setA] = useState<ApercuAnnulation | null | undefined>(undefined)
  const [c, setC] = useState<CommandePassee | null | undefined>(undefined)
  const [envoi, setEnvoi] = useState(false)
  const [q, setQ] = useState('')
  const [fil] = useState(lireFil)
  // Dès 1024, la saisie suit la colonne de la conversation (comme l'assistant), pas le bas de la fenêtre.
  const grand = useDes('tab-l')
  useEffect(() => {
    if (paiement) source.commandePassee(ref).then(setC)
    else source.apercuAnnulation(ref, n).then(setA)
  }, [paiement, ref, n])
  if (paiement ? c === undefined : a === undefined) return null
  const revenir = () => naviguer(chemin('assistant'))

  const confirmer = async () => {
    if (!a || envoi) return
    setEnvoi(true)
    const m = await source.annulerColis(ref, n, 'Proposé par l’assistant, confirmé par le client')
    ecrireFil([
      ...lireFil(),
      { de: 'ok', texte: t('Confirmé par toi') },
      {
        de: 'ia',
        texte: tf('C’est fait : le Colis {n} de {ref} est annulé. Le remboursement de {m} F part vers {p}.', { n, ref, m: F(m), p: a.payePar }) + (a.reste.length ? ' ' + tf('Les colis {l} continuent.', { l: a.reste.map((x) => x.n).join(', ') }) : ''),
        actions: [{ texte: t('Voir la commande'), vers: chemin('commande', { ref }) }],
      },
    ])
    revenir()
  }

  const tenue = paiement ? !!c && c.etat === 'attente' : !!a && a.colis.statut !== 'recupere' && !a.colis.annule
  let feuille: ReactNode
  if (!tenue)
    feuille = (
      <>
        <div className="cl14-sheet-h mt6">{t('Cette proposition ne tient plus')}</div>
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t(paiement ? 'Ce paiement n’attend plus ta validation. Rien n’a changé.' : 'Le colis est déjà annulé ou parti avec le livreur. Rien n’a changé.')}</span>
        </div>
        <div className="btns mt16">
          <Link to={chemin('assistant')} className="btn primary">
            <span>{t('Revenir à l’assistant')}</span>
          </Link>
        </div>
      </>
    )
  else if (paiement && c)
    feuille = (
      <>
        <div className="cl14-sheet-h mt6">{tf('Payer {m} F ?', { m: F(c.montant) })}</div>
        <div className="card flat mt12">
          {c.lignes.map((l) => (
            <div key={l.titre + l.boutique} className="kv">
              <span className="k">{t(l.titre) + (l.qte > 1 ? ' × ' + l.qte : '')}</span>
              <span className="v ">{F(l.prix * l.qte) + ' F'}</span>
            </div>
          ))}
          <div className="kv">
            <span className="k">{t(c.mode === 'domicile' ? 'Livraison à domicile' : 'Ramassage et remise')}</span>
            <span className="v ">{c.livraison ? F(c.livraison) + ' F' : <span className="cg">{t('offerts')}</span>}</span>
          </div>
          {c.frais > 0 && (
            <div className="kv">
              <span className="k">{t('Frais de service')}</span>
              <span className="v ">{F(c.frais) + ' F'}</span>
            </div>
          )}
          <div className="kv">
            <span className="k">{t('Payé avec')}</span>
            <span className="v ">{c.numero ?? t('Mobile Money')}</span>
          </div>
          <div className="total">
            <span className="tl2">{t(c.comptoir ? 'À payer maintenant' : 'Total')}</span>
            <span className="price">
              {F(c.montant)}
              <small>{t(' F')}</small>
            </span>
          </div>
        </div>
        <div className="hint-l">
          <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Réservés jusqu’à {h}. Tu valides ensuite sur ton téléphone.', { h: heureSeule(c.expire, langue) })}</span>
        </div>
        <div className="btns mt16">
          <Link to={chemin('paiement-attente', { ref: c.ref })} className="btn primary">
            <Icone nom="smartphone" taille={18} />
            <span>{tf('Payer {m} F', { m: F(c.montant) })}</span>
          </Link>
        </div>
        <div className="btns">
          <Link to={chemin('assistant')} className="btn secondary">
            <span>{t('Ne rien faire')}</span>
          </Link>
        </div>
      </>
    )
  else if (a)
    feuille = (
      <>
        <div className="cl14-sheet-h mt6">{tf('Annuler le Colis {n} ?', { n })}</div>
        <div className="cl14-mini">
          <span className="thumb" style={{ width: '52px', height: '52px', borderRadius: '13px' }}>
            <Dessin id={a.colis.dessin} />
          </span>
          <div className="grow">
            <div className="t14 b7">{t(a.colis.produit)}</div>
            <div className="t12 c3 mt4">{tf('{ref} · Colis {n} · {b}', { ref, n, b: t(a.colis.boutique) })}</div>
          </div>
        </div>
        <div className="card flat mt12">
          <div className="kv">
            <span className="k">{t('Commande')}</span>
            <span className="v ">{ref}</span>
          </div>
          <div className="kv">
            <span className="k">{tf('Colis {n} · {b}', { n, b: t(a.colis.boutique) })}</span>
            <span className="v ">{t(a.colis.produit) + ' × ' + a.colis.qte}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Articles')}</span>
            <span className="v ">{F(a.article) + ' F'}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Livraison en moins')}</span>
            <span className="v ">{F(a.rembourse - a.article) + ' F'}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Remboursé sur')}</span>
            <span className="v ">{a.payePar}</span>
          </div>
          <div className="total">
            <span className="tl2">{t('Remboursement')}</span>
            <span className="price">
              {F(a.rembourse)}
              <small>{t(' F')}</small>
            </span>
          </div>
        </div>
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>
            {tf('{a} F d’articles et {l} F de livraison en moins.', { a: F(a.article), l: F(a.rembourse - a.article) })}
            {a.reste.length > 0 && ' ' + tf('Les colis {l} continuent.', { l: a.reste.map((x) => x.n).join(', ') })}
          </span>
        </div>
        <div className="btns mt16">
          <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={confirmer}>
            <span>{t('Confirmer l’annulation')}</span>
          </button>
        </div>
        <div className="btns">
          <Link to={chemin('assistant')} className="btn secondary">
            <span>{t('Ne rien faire')}</span>
          </Link>
        </div>
      </>
    )
  return (
    <Ecran
      route="assistant-confirmer"
      largeur="moyen"
      fixes={
        <>
          {!grand && <Saisie envoyer={(x) => naviguer(chemin('assistant', { q: x }))} q={q} setQ={setQ} />}
          <div className="veil" onClick={revenir}></div>
          <div className="sheet" role="dialog" aria-label={t('Proposé par l’assistant')}>
            <div className="grab"></div>
            <div className="kick" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icone nom="bot" taille={15} />
              {t('Proposé par l’assistant')}
            </div>
            {feuille}
            <div className="cl14-note cl14-center">
              <Icone nom="shield-check" taille={13} /> {t('Rien ne se passe sans ton accord.')}
            </div>
          </div>
        </>
      }
    >
      <Styles id="02f3dac5cd" />
      <Bloc classe="g5-assist">
        <Bloc classe="g5-assist-c">
          <CarteAssistant />
          <Conversation fil={fil} />
          {grand && <Saisie envoyer={(x) => naviguer(chemin('assistant', { q: x }))} q={q} setQ={setQ} />}
        </Bloc>
      </Bloc>
    </Ecran>
  )
}

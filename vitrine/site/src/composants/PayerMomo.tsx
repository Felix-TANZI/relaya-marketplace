// Payer en Mobile Money (DP-54) : le choix du numéro (ceux du compte), la demande qui arrive sur le téléphone,
// puis la validation ; partagé par l'abonnement, la mise de côté, la reprise, la cotisation et le reste.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { chemin } from '../config/pages'
import { nomMoMo } from '../donnees/numeros'
import { source, type MoyenPaiement } from '../donnees/source'
import { F } from '../i18n/format'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export function PayerMomo({ montant, payer, texte, aide }: { montant: number; payer: (moyen: string) => Promise<void> | void; texte?: string; aide?: string }) {
  const { t, tf } = usePreferences()
  const [moyens, setMoyens] = useState<MoyenPaiement[] | null>(null)
  const [choix, setChoix] = useState<string | null>(null)
  const [attente, setAttente] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => {
    source.moyensPaiement().then((m) => {
      setMoyens(m)
      setChoix((m.find((x) => x.parDefaut) ?? m[0])?.id ?? null)
    })
  }, [])
  if (!moyens) return null
  const m = moyens.find((x) => x.id === choix)
  const libelle = m ? `${nomMoMo(m.operateur)} · ${m.numeroMasque}` : ''
  if (!moyens.length)
    return (
      <div className="note amber">
        <Icone nom="smartphone" taille={18} />
        <div>
          {t('Ajoute d’abord un numéro Mobile Money.')} <Link to={chemin('moyens-paiement')}>{t('Moyens de paiement')}</Link>
        </div>
      </div>
    )
  if (attente)
    return (
      <>
        <div className="card cl08-wait">
          <span className="cl08-spin"></span>
          <div className="grow">
            <b>{t('Valide la demande sur ton téléphone')}</b>
            <span className="s">{tf('{m} F · {o}', { m: F(montant), o: libelle })}</span>
          </div>
        </div>
        <div className="btns">
          <button
            type="button"
            className={'btn primary' + (envoi ? ' off' : '')}
            onClick={async () => {
              if (envoi) return
              setEnvoi(true)
              await payer(libelle)
              setEnvoi(false)
            }}
          >
            <Icone nom="circle-check" taille={18} />
            <span>{t('J’ai validé sur mon téléphone')}</span>
          </button>
        </div>
        <div className="btns">
          <button type="button" className="btn secondary" onClick={() => setAttente(false)}>
            <span>{t('Changer de numéro')}</span>
          </button>
        </div>
      </>
    )
  return (
    <>
      <div className="card tight">
        {moyens.map((x) => (
          <a key={x.id} href="#" role="radio" aria-checked={choix === x.id} className={'li' + (choix === x.id ? ' on' : '')} onClick={(e) => (e.preventDefault(), setChoix(x.id))}>
            <span className={'cl08-op ' + (x.operateur === 'MTN' ? 'mtn' : 'orange')} aria-hidden="true">
              {x.operateur === 'MTN' ? 'MTN' : 'orange'}
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(nomMoMo(x.operateur))}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {x.numeroMasque}
              </span>
            </span>
            <Icone nom={choix === x.id ? 'circle-check' : 'circle'} taille={20} style={choix === x.id ? { color: 'var(--or)' } : { color: 'var(--ink-4)' }} />
          </a>
        ))}
      </div>
      <div className="btns">
        <button type="button" className="btn primary" onClick={() => setAttente(true)}>
          <Icone nom="smartphone" taille={18} />
          <span>{texte ?? tf('Payer {m} F avec {o}', { m: F(montant), o: t(nomMoMo(m?.operateur ?? null)) })}</span>
        </button>
      </div>
      {aide && <p className="t12 c3" style={{ textAlign: 'center' }}>{t(aide)}</p>}
    </>
  )
}

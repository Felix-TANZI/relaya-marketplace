// « Envoyer mon panier à mon proche à l'étranger » (DP-54), côté Cameroun : à un proche diaspora RELIÉ, sans lien
// externe ; il le reçoit dans son application (« À payer pour mes proches ») et le paie, ou le refuse avec un mot.
// Le client choisit le proche, la livraison (son relais ou chez lui, s'il a une adresse) et un mot ; il voit ses
// paniers envoyés et leur réponse, et peut annuler tant que rien n'est payé. Le panier reste dans son application.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { jouer } from '../../composants/Sons'
import { chemin } from '../../config/pages'
import { source, type DemandeProche, type LienFamille } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { Succes } from './Commun'

export function EnvoyerAuProche({ articles, lignes }: { articles: number; lignes: string[] }) {
  const { t, tf } = usePreferences()
  const [proches, setProches] = useState<LienFamille[] | null>(null)
  const [demandes, setDemandes] = useState<DemandeProche[]>([])
  const [choisi, setChoisi] = useState<string | null>(null)
  const [livraison, setLivraison] = useState<'relais' | 'domicile'>('relais')
  const [mot, setMot] = useState('')
  const [envoye, setEnvoye] = useState<DemandeProche | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const charger = () => {
    source.liensFamille().then((r) => setProches(r.liens.filter((l) => l.sens === 'cameroun' && l.etat === 'actif')))
    source.demandesProches().then((r) => setDemandes(r.demandes.filter((x) => x.sens === 'envoyee')))
  }
  useEffect(charger, [])
  if (!proches) return null
  const p = proches.find((x) => x.id === choisi) ?? (proches.length === 1 ? proches[0] : null)
  const enAttente = demandes.filter((x) => x.etat === 'attente')
  return (
    <>
      <div className="dx-h">
        <b>{t('Envoyer mon panier à mon proche à l’étranger')}</b>
      </div>
      {envoye ? (
        <Succes titre={tf('Panier envoyé à {p}', { p: envoye.prenom })} texte={tf('Il le reçoit dans son application BelivaY. Tu es prévenu dès qu’il paie ; ton code de retrait arrive ensuite, comme d’habitude.', { p: envoye.prenom })} />
      ) : !proches.length ? (
        <div className="card">
          <p className="t13 c2" style={{ margin: 0 }}>
            {t('Ton proche à l’étranger a un compte diaspora ? Relie-le à ton compte : il recevra ton panier directement dans son application, sans lien à envoyer.')}
          </p>
          <div className="links">
            <Link to={chemin('proches')}>{t('Relier un proche à l’étranger')}</Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="chips" style={{ marginTop: 0 }}>
            {proches.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={p?.id === l.id} className={'chip' + (p?.id === l.id ? ' on' : '')} onClick={() => setChoisi(l.id)}>
                {tf('{p} · {c}', { p: l.prenom, c: t(l.pays ?? '') })}
              </button>
            ))}
          </div>
          <div className="seg dia-seg">
            {(['relais', 'domicile'] as const).map((x) => (
              <a key={x} href="#" role="radio" aria-checked={livraison === x} className={livraison === x ? 'on' : ''} onClick={(e) => (e.preventDefault(), setLivraison(x))}>
                {t(x === 'relais' ? 'Je retire au relais' : 'Livré chez moi')}
              </a>
            ))}
          </div>
          <div className="fld">
            <label htmlFor="ea-mot">{t('Un mot pour lui (facultatif)')}</label>
            <div className="inp">
              <input id="ea-mot" value={mot} maxLength={120} onChange={(e) => setMot(e.target.value)} />
            </div>
          </div>
          {erreur && (
            <div className="note red" role="alert">
              <Icone nom="circle-alert" taille={18} />
              <div>
                {t(erreur)} {erreur.startsWith('Ajoute') && <Link to={chemin('adresses')}>{t('Mes adresses')}</Link>}
              </div>
            </div>
          )}
          <div className="btns">
            <button
              type="button"
              className={'btn primary' + (p && articles ? '' : ' off')}
              onClick={async () => {
                if (!p || !articles) return
                const r = await source.envoyerPanierAuProche(p.id, { mot, livraison, lignes })
                if (r.ok) (setEnvoye(r.demande), setErreur(null), setMot(''), jouer('paiement'), charger())
                else (jouer('erreur'), setErreur(r.raison === 'vide' ? 'Ton panier est vide : ajoute d’abord les articles.' : r.raison === 'deja' ? 'Un panier attend déjà sa réponse : annule-le ou attends qu’il réponde.' : r.raison === 'plafond' ? 'Au-delà de 150 000 F par paiement : retire des articles.' : r.raison === 'domicile' ? 'Ajoute d’abord ton adresse de livraison.' : 'Le lien avec ce proche n’est plus actif.'))
              }}
            >
              <Icone nom="send" taille={18} />
              <span>{p ? tf('Envoyer à {p} · {n} article(s)', { p: p.prenom, n: articles }) : t('Choisis ton proche')}</span>
            </button>
          </div>
          <p className="t12 c3">{t('Les articles cochés plus bas partent (tout ce qui tient dans un paiement par carte). Il paie les articles et la livraison ; tu n’as rien à payer. Ton panier reste dans ton application.')}</p>
        </div>
      )}
      {demandes.length > 0 && (
        <div className="card tight">
          <Link to={chemin('paniers-proches')} className="li">
            <span className="ic">
              <Icone nom="inbox" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Mes paniers envoyés à mes proches')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {enAttente.length ? tf('{n} en attente · dernier : {m} F pour {p}', { n: enAttente.length, m: F(enAttente[0].sousTotal), p: enAttente[0].prenom }) : tf('{n} panier(s) · réponses reçues', { n: demandes.length })}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
      )}
    </>
  )
}

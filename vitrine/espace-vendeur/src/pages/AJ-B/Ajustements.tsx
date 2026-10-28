// Mes ajustements (AJ-B, DP-58 ; vue de l'interface réelle seller.belivay.com, INTERFACE-REELLE.md) : tout ce qui a
// fait bouger votre argent, ligne par ligne, avec l'export comptable. Ouverte depuis Mon argent (VD-09).
// RÈGLE DU PAQUET qui l'emporte sur la vue réelle (GAI-01, REFVD-R74, décision du 22 sept.) : le vendeur voit ce
// qu'il GARDE, jamais ce que BelivaY lui prend ; jamais « commission retenue », « prélevé ». La vue réelle listait
// « Commission sur BLV-… » : ici chaque vente dit son prix et « vous gardez » ; le détail de la commission reste dans
// la facture du mois (Documents), à laquelle un lien mène. Les AJUSTEMENTS sont les reprises (remboursement d'un
// litige perdu, d'un retour), seules lignes négatives, datées, avec leur motif (GAI-03).
// - Mois par mois depuis la signature (historique des gains) ; onglets Tout · Ventes · Reprises ; totaux du mois.
// - Export comptable (CSV : date, référence, type, produit, prix de vente, vous gardez, motif), tous les mois ou le mois.
// - Montants lus dans la source (figés au paiement par le serveur), jamais calculés ici ; œil des montants (DP-52) ;
//   accès Préparation : réservé au propriétaire (403 owner_only), comme tout Mon argent.
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { LigneGain } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'
import { jourDe } from '../../calculs/temps'
import { BandeauHorsLigne, Chargement, ErreurLecture, dateCourte, useAnnonce } from '../VD-11/communs'
import { nomMois, telecharger, useMontant } from '../VD-09/commun'
import './ajb.css'

type Onglet = 'tout' | 'ventes' | 'reprises'

export default function Ajustements() {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const { maintenant } = useSession()
  const m = useMontant()
  const [params, setParams] = useSearchParams()
  const [onglet, setOnglet] = useState<Onglet>('tout')
  const [annonce, dire] = useAnnonce()
  // Le dernier mois donne la liste de tous les mois depuis la signature ; chaque mois se lit ensuite.
  const tous = useLecture(async () => {
    if (!montants) return source.argent.gains('') // refusé par la source pour l'accès Préparation
    const dernier = await source.argent.gains(jourDe(maintenant).slice(0, 7))
    const mois = dernier.historique.map((h) => h.mois)
    const lus = await Promise.all(mois.map((x) => (x === dernier.mois ? Promise.resolve(dernier) : source.argent.gains(x))))
    return lus.sort((a, b) => b.mois.localeCompare(a.mois))
  }, [montants])
  const liste = Array.isArray(tous.donnees) ? tous.donnees : []
  const choisi = params.get('mois') ?? liste.find((g) => g.lignes.length)?.mois ?? liste[0]?.mois ?? null
  const g = liste.find((x) => x.mois === choisi) ?? null
  const lignes = useMemo(() => (g?.lignes ?? []).filter((l) => onglet === 'tout' || (onglet === 'ventes' ? l.type === 'vente' : l.type === 'reprise')).sort((a, b) => b.liberation - a.liberation), [g, onglet])
  const reprises = (g?.lignes ?? []).filter((l) => l.type === 'reprise')
  const totalReprises = reprises.reduce((n, l) => n + l.garde, 0)
  const nVentes = (g?.lignes.length ?? 0) - reprises.length

  const exporter = (tout: boolean) => {
    const sources = tout ? liste : g ? [g] : []
    const champ = (v: string | number) => {
      const s = String(v)
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const tete = [t('Date'), t('Référence'), t('Type'), t('Produit'), t('Prix de vente (F)'), t('Vous gardez (F)'), t('Motif')]
    const corps = sources.flatMap((x) => x.lignes).sort((a, b) => a.liberation - b.liberation).map((l: LigneGain) => [new Date(l.liberation + 3600 * 1000).toISOString().slice(0, 10), l.ref, t(l.type === 'vente' ? 'Vente' : 'Reprise'), `${l.article.titre} · ${l.article.variante}`, l.prix, l.garde, l.motif ? t(l.motif) : ''])
    const csv = '﻿' + [tete, ...corps].map((r) => r.map(champ).join(';')).join('\r\n') + '\r\n'
    telecharger(`belivay-ajustements-${tout ? 'tout' : g?.mois}.csv`, csv, 'text/csv;charset=utf-8')
    jouer('copie')
    dire(tf('Export comptable prêt : {n} lignes.', { n: corps.length }))
  }

  return (
    <Ecran route="ajustements" fixes={annonce}>
      <BandeauHorsLigne />
      {tous.erreur && <ErreurLecture erreur={tous.erreur} relire={tous.relire} />}
      {!tous.donnees && !tous.erreur && <Chargement />}
      {g && (
        <>
          <p className="t14 c2" style={{ margin: '14px 2px 0', lineHeight: 1.5 }}>
            {t('Chaque vente et chaque reprise, ligne par ligne. Le détail du service BelivaY est dans la facture du mois.')}
          </p>
          <div className="chips mt10 ajb-mois" role="radiogroup" aria-label={t('Mois')}>
            {liste.map((x) => (
              <button key={x.mois} type="button" role="radio" aria-checked={x.mois === choisi} className={'chip' + (x.mois === choisi ? ' on' : '')} style={{ minHeight: '44px' }} onClick={() => setParams({ mois: x.mois }, { replace: true })}>
                {nomMois(x.mois, langue)}
              </button>
            ))}
          </div>
          <div className="hero night ajb-ajust">
            <div className="kick" style={{ color: 'var(--gold-l)' }}>
              {tf('Vous gardez en {mois}', { mois: nomMois(g.mois, langue) })}
            </div>
            <div className="ajb-ajust-total">{m.f(g.total)}</div>
            <div className="t13" style={{ color: 'rgba(255,255,255,.78)' }}>
              {tf('sur {montant} de ventes', { montant: m.f(g.ventes) })}
            </div>
            <div className="ajb-ajust-tuiles">
              <span>
                <b>{nVentes}</b>
                {t(nVentes > 1 ? 'ventes libérées' : 'vente libérée')}
              </span>
              <span>
                <b>{reprises.length}</b>
                {t(reprises.length > 1 ? 'reprises' : 'reprise')}
              </span>
              <span>
                <b>{m.f(totalReprises)}</b>
                {t('repris ce mois')}
              </span>
            </div>
          </div>
          <div className="seg mt14" role="tablist" aria-label={t('Type de ligne')} style={{ width: '100%' }}>
            {(
              [
                ['tout', 'Tout'],
                ['ventes', 'Ventes'],
                ['reprises', 'Reprises'],
              ] as const
            ).map(([v, l]) => (
              <a key={v} role="tab" tabIndex={0} aria-selected={onglet === v} className={onglet === v ? 'on' : ''} style={{ height: '44px' }} onClick={() => setOnglet(v)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOnglet(v))}>
                {t(l)}
              </a>
            ))}
          </div>
          <div className="card tight">
            {lignes.length === 0 && <p className="t14 c3" style={{ margin: '14px 0' }}>{t(onglet === 'reprises' ? 'Aucune reprise ce mois-ci.' : 'Aucune ligne ce mois-ci.')}</p>}
            {lignes.map((l, i) => (
              <Link key={`${l.ref}-${l.type}-${i}`} to={l.type === 'vente' ? chemin('recu', { ref: l.ref }) : chemin('commande', { ref: l.ref })} className="li" style={{ alignItems: 'flex-start', minHeight: '60px' }}>
                <Vignette nom={l.article.dessin} taille={40} />
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="lt" style={{ display: 'block' }}>
                    {l.type === 'vente' ? tf('Vente {ref}', { ref: l.ref }) : tf('Reprise sur {ref}', { ref: l.ref })}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {l.type === 'vente' ? tf('{produit} · vendu {prix} · libéré le {d}', { produit: `${l.article.titre} · ${l.article.variante}`, prix: m.f(l.prix), d: dateCourte(l.liberation, langue) }) : `${l.motif ? t(l.motif) : t('Remboursement au client')} · ${dateCourte(l.liberation, langue)}`}
                  </span>
                </span>
                <span className={'b8 nw ' + (l.garde < 0 ? 'cr' : 'cg')}>{l.garde < 0 ? m.f(l.garde) : `+${m.f(l.garde)}`}</span>
              </Link>
            ))}
          </div>
          <div className="row mt14" style={{ gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn secondary sm" onClick={() => exporter(false)}>
              <Icone nom="download" taille={16} />
              <span>{tf('Export comptable · {mois}', { mois: nomMois(g.mois, langue) })}</span>
            </button>
            <button type="button" className="btn ghost sm" onClick={() => exporter(true)}>
              <Icone nom="file-down" taille={16} />
              <span>{t('Tout depuis la signature')}</span>
            </button>
          </div>
          <div className="card tight">
            <Link to={chemin('documents')} className="li" style={{ minHeight: '56px' }}>
              <span className="ic">
                <Icone nom="file-text" taille={19} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Factures du service BelivaY')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Le détail du mois, pour votre comptable')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to={chemin('gele')} className="li" style={{ minHeight: '56px' }}>
              <span className="ic">
                <Icone nom="lock" taille={19} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Argent gelé')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Litiges et retours en cours : rien n’est repris avant la décision')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
        </>
      )}
    </Ecran>
  )
}

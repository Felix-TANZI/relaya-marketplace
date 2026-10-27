// Mes chiffres (VD-10, fig. 11) : repris du prototype (route('chiffres')), branché sur GET /stats?period=30d (domaine
// plans) : tout est lu dans les commandes et les vues des 30 derniers jours, rien n'est écrit d'avance.
// - Carte nuit : ventes payées des 30 jours (la base est écrite : Q-83), commandes et encaissées, une phrase de lecture
//   (les jours qui portent le produit principal) ; quatre chiffres expliqués en une ligne (CHF-03) ; ventes par jour
//   (barres qui montent) ; « Ce qui se vend » et la note de dépendance (VD10-R46) ; « Voir la demande » ; ligne cadenas
//   vers Plans & tarifs (CHF-01).
// - Ajouts : export des chiffres en fichier (CSV), jour fort mis en valeur, toucher une barre dit le montant du jour.
// - Accès Préparation : réservé au propriétaire (montants des ventes).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Stats } from '../../donnees/domaines/plans'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { Attente, Bouton, HorsLigne, useCompteur, useEnLigne, useMontant, useToast, virgule } from './commun'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const JOURS_LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function exporter(s: Stats, t: (x: string) => string) {
  const lignes = [
    [t('Chiffre'), t('Valeur')],
    [t('Ventes payées, 30 jours (F)'), String(s.ventes)],
    [t('Commandes'), String(s.commandes)],
    [t('Encaissées'), String(s.encaissees)],
    [t('Panier moyen (F)'), String(s.panierMoyen)],
    [t('Retours (%)'), String(s.retoursPourCent)],
    [t('Vues de vos offres'), String(s.vues)],
    [t('Conversion (%)'), String(s.conversionPourCent)],
    ...s.parJour.map((j) => [t(JOURS_LONGS[j.jour]), String(j.ventes)]),
    ...s.parProduit.map((p) => [p.titre, String(p.ventes)]),
  ]
  const csv = lignes.map((l) => l.map((x) => `"${x.replace(/"/g, '""')}"`).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'belivay-mes-chiffres-30-jours.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Contenu({ s }: { s: Stats }) {
  const { t, tf } = usePreferences()
  const montant = useMontant()
  const enLigne = useEnLigne()
  const v = useCompteur(s.ventes)
  const [jour, setJour] = useState<number | null>(null)
  const [toast, dire] = useToast()
  const max = Math.max(1, ...s.parJour.map((j) => j.ventes))
  const premier = s.parProduit[0]
  const jours = s.meilleursJours.map((j) => t(JOURS_LONGS[j]))
  const voyelle = !!premier && /^[aeiouyàâéèêîôûAEIOUYÉ]/i.test(premier.titre)
  const lectureJours =
    premier && jours.length
      ? jours.length === 1
        ? tf(voyelle ? 'Le {j} porte vos ventes d’{titre}.' : 'Le {j} porte vos ventes de {titre}.', { j: jours[0], titre: premier.titre.split(' ')[0] })
        : tf(voyelle ? '{a} et {b} portent vos ventes d’{titre}.' : '{a} et {b} portent vos ventes de {titre}.', { a: jours.slice(0, -1).join(', ').replace(/^./, (c) => c.toUpperCase()), b: jours[jours.length - 1], titre: premier.titre.split(' ')[0] })
      : ''
  return (
    <Ecran route="chiffres">
      <div className="pg">
        <h1 className="pg-t">{t('Mes chiffres')}</h1>
        <p className="pg-s">{t('Ce qui se vend, et comment vendre plus.')}</p>
      </div>
      {!enLigne && <HorsLigne />}
      <div className="hero night">
        <div className="hk">{t('Vos ventes · 30 derniers jours')}</div>
        <div className="big">
          {t(F(Math.round(v)))}
          <small>{t('FCFA')}</small>
        </div>
        <div className="hs">
          {tf('{c} commandes · {e} encaissées. ', { c: s.commandes, e: s.encaissees })}
          <b>{lectureJours}</b>
        </div>
        <div className="t12 mt6" style={{ color: 'rgba(255,255,255,.7)' }}>
          {t('Ventes payées, 30 jours (les ventes payables au retrait comptent une fois payées).')}
        </div>
      </div>
      <div className="card tight">
        {[
          ['Panier moyen', 'Par commande encaissée', montant(s.panierMoyen)],
          ['Retours', 'Part des commandes livrées revenues', t(`${s.retoursPourCent} %`)],
          ['Vues de vos offres', 'Fiches ouvertes par les clients', t(String(s.vues))],
          ['Conversion', 'Part des vues qui finissent en achat', t(`${virgule(s.conversionPourCent)} %`)],
        ].map(([titre, sous, valeur]) => (
          <div key={titre} className="li">
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(titre)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(sous)}
              </span>
            </span>
            <span className="b8 nw" style={{ fontSize: '19px', letterSpacing: '-.02em' }}>
              {valeur}
            </span>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>{t('Vos ventes par jour')}</h3>
        <div className="spark" role="group" aria-label={t('Vos ventes par jour')}>
          {s.parJour.map((j) => (
            <i
              key={j.jour}
              className={(s.meilleursJours.includes(j.jour) ? 'on' : '') + (j.ventes === 0 ? ' vd10-zero' : '')}
              style={{ height: `${Math.max(4, Math.round((j.ventes / max) * 100))}%`, cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              aria-label={`${t(JOURS_LONGS[j.jour])} · ${montant(j.ventes)}`}
              onClick={() => setJour(j.jour)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setJour(j.jour))}
            ></i>
          ))}
        </div>
        <div className="spark-l">
          {JOURS.map((j) => (
            <span key={j} style={{ fontSize: '12px' }}>
              {t(j)}
            </span>
          ))}
        </div>
        <p className="t13 c2 mt8" aria-live="polite">
          {jour === null ? t('Touchez un jour pour voir ses ventes.') : tf('Le {jour} : {m} sur 30 jours.', { jour: t(JOURS_LONGS[jour]), m: montant(s.parJour[jour].ventes) })}
        </p>
      </div>
      <div className="card">
        <h3>{t('Ce qui se vend')}</h3>
        {s.parProduit.map((p, i) => (
          <div key={p.offreId} className={'hbar' + (i === 0 ? ' mt8' : '')}>
            <span className="hl">{p.titre}</span>
            <span className="hb">
              <i style={{ width: `${p.partPourCent}%` }}></i>
            </span>
            <span className="hv">{t(`${p.partPourCent} %`)}</span>
          </div>
        ))}
        {s.dependance && (
          <div className="note amber">
            <Icone nom="triangle-alert" taille={18} />
            <div>
              <b>{t('Dépendance à un produit :')}</b>
              {tf(' l’{titre} fait {n} % de vos ventes. Voyez ce que les clients cherchent d’autre près de chez vous.', { titre: s.dependance.titre.split(' ')[0], n: s.dependance.partPourCent })}
            </div>
          </div>
        )}
        <div className="mt12">
          <Bouton classe="primary" icone="search" vers={chemin('demande')}>
            {t('Voir la demande')}
          </Bouton>
        </div>
      </div>
      <div className="mt12">
        <Bouton
          classe="secondary"
          icone="download"
          onClick={() => {
            exporter(s, t)
            jouer('fin')
            dire(t('Vos chiffres sont enregistrés (fichier CSV).'))
          }}
          style={{ height: '44px' }}
        >
          {t('Exporter mes chiffres')}
        </Bouton>
      </div>
      <Link to={chemin('plans_liste')} className="card flat" style={{ display: 'block' }}>
        <div className="row">
          <Icone nom="lock" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <div className="grow t13 c2">{s.historiqueVerrouille ? t('Historique 3 et 12 mois avec Boost · par offre et par quartier avec Pro') : t('Par offre et par quartier avec Pro')}</div>
          <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        </div>
      </Link>
      {toast}
    </Ecran>
  )
}

export default function Chiffres() {
  const lecture = useLecture(() => source.plans.stats(), [])
  return <Attente route="chiffres" lecture={lecture}>{(s) => <Contenu s={s} />}</Attente>
}

// Versements (VD-09) : repris du prototype (route('versements'), états ?periode=3|12|tout et ?refus=1), branché sur la
// source (GET /payouts/next, GET /payouts, POST /payouts/{id}/incident).
// - Le titre est la date (VD09-R28) ; vendredi avant 12 h, automatique, sans frais ni minimum (GEN-04, ARG-02) ;
// - Carte nuit : à verser, « Passe à … », opérateur, numéro masqué, titulaire, référence annoncée avant (VER-02) avec
//   « Copier » ; statut tiré de la machine VERSEMENT (prévu, reporté pendant la revue d'un nouveau numéro, refusé,
//   suspendu) ;
// - Refus de l'opérateur (VD09-R29, VER-04) : encadré rouge au-dessus de tout, motif tel quel, « À faire » propre au motif
//   (compte plein : retirer un peu d'argent ; tiers ou préfixe : changer de numéro), trois essais à 24 h (dates
//   calculées), puis suspension et appel du support ;
// - Commandes couvertes et total prévu ; historique filtré par période (VER-05, VD09-R30 : le prochain versement n'est
//   jamais filtré), chaque versement s'ouvre (commandes couvertes, copier la référence, signaler non reçu) ; export CSV ;
// - « Signaler un versement non reçu » : enregistré avec la référence, puis la messagerie du support (VER-03) ;
// - Œil des montants (DP-52), hors connexion, accès Préparation verrouillé (ARG-04).
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTirerPourActualiser } from '@client/composants/Animations'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Historique, NumeroVersement, Periode, Prochain, Versement } from '../../donnees/domaines/versements'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { jourDe } from '../../calculs/temps'
import { ceSoirOu } from './Argent'
import { Aide, AvecDonnees, BandeauHorsLigne, CommentCaMarche, Message, Oeil, PastilleOperateur, Puces, copier, dateComplete, dateLongue, jourCourtMois, jourLongMois, jourMois, jourMoisLong, numeroLisible, quand, telecharger, useEnLigne, useMessage, useMontant, versCsv } from './commun'

const MOTIF: Record<string, string> = { plein: 'compte plein', tiers: 'numéro au nom d’un tiers', prefixe: 'préfixe qui ne correspond pas à l’opérateur' }
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const BLOC = { display: 'block' } as const
const LIGNE_ROUGE = { gap: '9px', alignItems: 'flex-start', lineHeight: '1.45' } as const

function Refus({ p }: { p: Prochain }) {
  const { t, tf, langue } = usePreferences()
  const i = p.incident!
  const prochains = i.essais.slice(i.essaisFaits)
  const ligne = (icone: string, contenu: ReactNode) => (
    <div className="row t13 c2 mt8" style={LIGNE_ROUGE}>
      <Icone nom={icone} taille={17} style={{ flexShrink: '0', marginTop: '1px', color: 'var(--red)' }} />
      <span>{contenu}</span>
    </div>
  )
  return (
    <div className="card" role="alert" style={{ border: '1.5px solid var(--red-line)', background: 'var(--red-soft)' }}>
      <div className="row" style={{ gap: '10px' }}>
        <Icone nom="circle-alert" taille={22} style={{ color: 'var(--red)', flexShrink: '0' }} />
        <div className="grow b8 t15 cr">{tf('{op} a refusé le versement du {jour}', { op: i.operateur, jour: jourLongMois(p.vendredi, langue) })}</div>
      </div>
      <div className="t14 mt8" style={{ lineHeight: '1.45' }}>
        {t('Motif : ')}
        <b>{t(MOTIF[i.motif])}</b>
        {t('. Votre argent reste à vous, sans frais.')}
      </div>
      {i.motif === 'plein'
        ? ligne('wallet', tf('À faire : retirez un peu d’argent de votre compte {op}.', { op: i.operateur }))
        : ligne(
            'smartphone',
            <>
              {t(i.motif === 'tiers' ? 'À faire : un numéro à votre nom. ' : 'À faire : vérifiez l’opérateur du numéro. ')}
              <Link to={chemin('numero_versement')} className="b8" style={{ color: 'var(--red)', textDecoration: 'underline' }}>
                {t('Changer de numéro de versement')}
              </Link>
            </>,
          )}
      {i.suspendu
        ? ligne('headset', t('Les trois essais ont échoué : les versements sont suspendus et le support vous appelle. Ils reprennent seuls dès la correction.'))
        : prochains.length > 0 &&
          ligne(
            'refresh-cw',
            prochains.length >= 3
              ? tf('Nouvel essai {j1} à {h} ({n} sur {total}), puis {j2} et {j3}.', { j1: jourCourtMois(prochains[0], langue), h: heure(prochains[0], langue), n: i.essaisFaits + 1, total: i.essais.length, j2: jourCourtMois(prochains[1], langue), j3: jourCourtMois(prochains[2], langue) })
              : tf('Nouvel essai {j1} à {h} ({n} sur {total}).', { j1: jourCourtMois(prochains[0], langue), h: heure(prochains[0], langue), n: i.essaisFaits + 1, total: i.essais.length }),
          )}
      {!i.suspendu && ligne('headset', tf('Après {n} échecs, les versements sont suspendus et le support vous appelle.', { n: i.essais.length }))}
      <div className="mt12">
        <Link to={chemin('messages', { fil: 'support', sujet: p.reference })} style={{ height: '44px' }} className="btn secondary">
          <Icone nom="message-circle" taille={18} />
          <span>{t('Écrire au support')}</span>
        </Link>
      </div>
    </div>
  )
}

function LigneVersement({ v, premier, signaler, dire }: { v: Versement; premier: boolean; signaler: (ref: string) => void; dire: (m: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const m = useMontant()
  const [ouvert, setOuvert] = useState(false)
  return (
    <div style={premier ? { borderTop: '1px solid var(--line)' } : undefined}>
      <button type="button" className="li" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)} style={{ width: '100%', background: 'none', border: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        <span className={v.essais.length > 1 ? 'ic amber' : 'ic green'}>
          <Icone nom={v.essais.length > 1 ? 'rotate-ccw' : 'circle-check'} taille={20} />
        </span>
        <span className="grow">
          <span className="lt" style={BLOC}>
            {majuscule(jourLongMois(v.vendredi, langue))}
          </span>
          <span className="ls" style={BLOC}>
            {tf('{ref} · couvre {cmds}', { ref: v.reference, cmds: v.commandes.map((c) => c.ref).join(', ') })}
            {v.essais.length > 1 && ' · ' + t('versé au 2e essai')}
          </span>
        </span>
        <span className="rv">{m.f(v.montant)}</span>
        <span className="chev" style={{ transform: ouvert ? 'rotate(90deg)' : undefined, transition: 'transform var(--blv-moyen) var(--blv-doux)' }}>
          <Icone nom="chevron-right" taille={18} />
        </span>
      </button>
      {ouvert && (
        <div style={{ margin: '0 0 10px 52px' }} className="t13">
          {v.essais.length > 1 && (
            <p className="c3" style={{ margin: '0 0 6px' }}>
              {tf('Refusé par l’opérateur le {j1}, versé au nouvel essai du {j2}, sans frais.', { j1: jourMois(v.essais[0], langue), j2: jourMois(v.essais[v.essais.length - 1], langue) })}
            </p>
          )}
          {v.commandes.map((c) => (
            <div key={c.ref} className="kv">
              <Link to={chemin('commande', { ref: c.ref })} className="k b7" style={{ color: 'var(--ink)' }}>
                {tf('{ref} · libérée le {jour}', { ref: c.ref, jour: jourMois(c.liberation, langue) })}
              </Link>
              <span className="v">{m.f(c.garde)}</span>
            </div>
          ))}
          <div className="kv">
            <span className="k">{t('Crédité sur')}</span>
            <span className="v">{`${v.numero.split(' ')[0]} ${numeroLisible(v.numero)}`}</span>
          </div>
          <div className="row" style={{ gap: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="vd9-lien"
              onClick={async () => {
                if (await copier(v.reference)) {
                  jouer('copie')
                  dire(tf('Référence {ref} copiée', { ref: v.reference }))
                } else dire(t('Copie impossible sur cet appareil'))
              }}
            >
              <Icone nom="copy" taille={16} />
              {t('Copier la référence')}
            </button>
            {v.signale ? (
              <span className="t13 c3 row" style={{ gap: '6px', minHeight: '44px' }}>
                <Icone nom="circle-check" taille={15} />
                {t('Déjà signalé au support')}
              </span>
            ) : (
              <button type="button" className="vd9-lien" onClick={() => signaler(v.reference)}>
                <Icone nom="circle-help" taille={16} />
                {t('Pas reçu ?')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Contenu({ p, h, n, periode, changerPeriode, relire }: { p: Prochain | null; h: Historique; n: NumeroVersement; periode: Periode; changerPeriode: (v: Periode) => void; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const m = useMontant()
  const naviguer = useNavigate()
  const enLigne = useEnLigne()
  const [message, dire] = useMessage()
  useTirerPourActualiser(relire)
  const signaler = async (ref: string) => {
    if (!enLigne) return dire(t('Hors connexion : le signalement partira au retour du réseau.'))
    const r = await source.versements.signalerNonRecu(ref)
    if (!r.ok && r.raison === 'inconnu') return dire(t('Référence introuvable'))
    naviguer(chemin('messages', { fil: 'support', sujet: ref }))
  }
  const exporter = async () => {
    if (!enLigne) return dire(t('Hors connexion : l’export attend le réseau.'))
    const c = await source.argent.document({ type: 'versements', periode })
    telecharger(`belivay-versements-${periode}.csv`, versCsv(c, { t, langue }), 'text/csv;charset=utf-8')
    jouer('fin')
    dire(t('Historique téléchargé'))
  }
  const incident = p?.incident ?? null
  const numero = p ? `${p.operateur} ${numeroLisible(p.numero)}` : ''
  const dernier = h.versements[0]
  return (
    <>
      {!p ? (
        <div className="pg">
          <div className="pg-k" style={{ marginTop: '14px' }}>
            {t('Prochain versement')}
          </div>
          <h1 className="pg-t">{t('Rien à verser pour l’instant')}</h1>
          <p className="pg-s">{t('Chaque vente libérée part le vendredi suivant, avant 12 h, sans frais ni minimum.')}</p>
        </div>
      ) : incident ? (
        <>
          <div className="pg-k" style={{ marginTop: '14px' }}>
            {t(incident.suspendu ? 'Versements suspendus' : 'Versement en attente')}
          </div>
          <h1 className="pg-t">{incident.suspendu ? t('Le support vous appelle') : tf('Nouvel essai {jour}', { jour: jourLongMois(incident.essais[incident.essaisFaits], langue) })}</h1>
          <p className="pg-s">{incident.suspendu ? t('Votre argent reste à vous. Les versements reprennent seuls dès la correction.') : tf('À {h}, sans frais. Votre argent reste à vous.', { h: heure(incident.essais[incident.essaisFaits], langue) })}</p>
          <BandeauHorsLigne />
          <Refus p={p} />
        </>
      ) : (
        <>
          <div className="pg-k" style={{ marginTop: '14px' }}>
            {t(p.statut === 'reporte' ? 'Versement reporté' : 'Prochain versement')}
          </div>
          <h1 className="pg-t">{dateLongue(p.vendredi, langue)}</h1>
          <p className="pg-s">{p.statut === 'reporte' ? tf('Après la revue du nouveau numéro (jusqu’au {jour}). Rien n’est perdu.', { jour: jourMoisLong(p.enRevueJusqua!, langue) }) : tf('Avant {h}. Automatique, sans frais, sans minimum : rien à demander.', { h: heure(p.heureLimite, langue) })}</p>
          <BandeauHorsLigne />
        </>
      )}
      {p && (
        <div className="hero night">
          <div className="otop">
            <div className="hk">{t(incident ? 'En attente' : 'À verser')}</div>
            <Oeil clair style={{ margin: '-10px -10px -10px 0' }} />
          </div>
          <div className="big">
            {m.n(incident ? p.montant : p.aVerser)}
            <small>{t('FCFA')}</small>
          </div>
          {incident ? (
            !incident.suspendu && <div className="hs">{tf('Repart {jour} à {h}, sans frais.', { jour: jourCourtMois(incident.essais[incident.essaisFaits], langue), h: heure(incident.essais[incident.essaisFaits], langue) })}</div>
          ) : (
            p.passeA && (
              <div className="hs">
                {t('Passe à ')}
                <b>{m.f(p.passeA.montant)}</b>
                {tf(' {quand}, quand {ref} se libère.', { quand: ceSoirOu(p.passeA.a, maintenant, langue), ref: p.passeA.ref })}
              </div>
            )
          )}
          <div className="hline"></div>
          <div className="row">
            <PastilleOperateur operateur={p.operateur} />
            <div className="grow">
              <div className="b8 t15">{tf('Sur {numero}', { numero })}</div>
              <div className="t13 mt4" style={{ color: 'rgba(255,255,255,.74)' }}>
                {p.enRevueJusqua ? tf('En revue · au nom de {nom}', { nom: p.titulaire }) : tf('Vérifié · au nom de {nom}', { nom: p.titulaire })}
              </div>
            </div>
          </div>
          <div className="t13 mt12" style={{ lineHeight: '1.45', color: 'rgba(255,255,255,.86)' }}>
            {t('Référence prévue ')}
            <b className="nw">{p.reference}</b>
            {tf('. Vous la verrez sur votre relevé {op} : c’est votre preuve.', { op: p.operateur })}
          </div>
          <button
            type="button"
            className="vd9-lien"
            style={{ color: 'var(--gold-l)' }}
            onClick={async () => {
              if (await copier(p.reference)) {
                jouer('copie')
                dire(tf('Référence {ref} copiée', { ref: p.reference }))
              } else dire(t('Copie impossible sur cet appareil'))
            }}
          >
            <Icone nom="copy" taille={16} />
            {t('Copier la référence')}
          </button>
        </div>
      )}
      {p && (
        <div className="card">
          <h3>{t('Commandes couvertes')}</h3>
          {p.commandes.length ? (
            <table className="tbl mt10">
              <tbody>
                <tr>
                  <th style={{ fontSize: '12px' }}>{t('Commande')}</th>
                  <th style={{ fontSize: '12px' }}>{t('Libérée')}</th>
                  <th className="r" style={{ fontSize: '12px' }}>
                    {t('Montant')}
                  </th>
                </tr>
                {p.commandes.map((c) => (
                  <tr key={c.ref}>
                    <td className="b7">
                      <Link to={chemin('commande', { ref: c.ref })} style={{ color: 'inherit', display: 'inline-flex', minHeight: '28px', alignItems: 'center' }}>
                        {c.ref}
                      </Link>
                    </td>
                    <td className="c3">{c.liberation > maintenant || jourDe(c.liberation) === jourDe(maintenant) ? quand(c.liberation, maintenant, langue, true).replace(/^(today|aujourd’hui), /, '$1 ') : jourMois(c.liberation, langue)}</td>
                    <td className="r b7">{m.f(c.garde)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="b8">{t('Total prévu')}</td>
                  <td></td>
                  <td className="r b8 cor">{m.f(p.montant)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="t13 c3">{t('Aucune vente libérée pour ce vendredi.')}</p>
          )}
          <Aide icone="calendar">{t('Tout ce qui se libère avant jeudi minuit part ce vendredi.')}</Aide>
        </div>
      )}
      <div style={{ marginTop: '18px' }}>
        <Puces
          etiquette="Période"
          valeur={periode}
          changer={changerPeriode}
          choix={[
            { v: '3', libelle: t('3 mois') },
            { v: '12', libelle: t('12 mois') },
            { v: 'tout', libelle: t('Tout') },
          ]}
        />
      </div>
      <div className="card" style={{ marginTop: '10px' }}>
        <div className="otop">
          <h3>{t('Déjà reçus')}</h3>
          <span className="b8 t17 nw">{m.f(h.total)}</span>
        </div>
        <div className="t13 c3 mt4">
          {periode === 'tout'
            ? tf(h.nombre > 1 ? '{n} versements depuis le {jour} · 0 F de frais' : '{n} versement depuis le {jour} · 0 F de frais', { n: h.nombre, jour: dateComplete(h.depuis, langue) })
            : tf(h.nombre > 1 ? '{n} versements en {p} mois · 0 F de frais' : '{n} versement en {p} mois · 0 F de frais', { n: h.nombre, p: periode })}
        </div>
        <div className="mt6">
          {h.versements.length === 0 && <p className="t13 c3 center" style={{ padding: '12px 0' }}>{t('Aucun versement sur cette période.')}</p>}
          {h.versements.map((v, i) => (
            <LigneVersement key={v.reference} v={v} premier={i === 0} signaler={(r) => void signaler(r)} dire={dire} />
          ))}
        </div>
        {h.versements.length > 0 && (
          <button type="button" className="vd9-lien" onClick={() => void exporter()} aria-disabled={!enLigne}>
            <Icone nom="download" taille={16} />
            {t('Exporter la période (CSV)')}
          </button>
        )}
      </div>
      <div className="card tight">
        {dernier && (
          <button type="button" className="li" onClick={() => void signaler(dernier.reference)} style={{ width: '100%', background: 'none', border: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
            <span className="ic or">
              <Icone nom="circle-help" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={BLOC}>
                {t('Signaler un versement non reçu')}
              </span>
              <span className="ls" style={BLOC}>
                {tf('Avec la référence {ref} · réponse avant lundi midi', { ref: dernier.reference })}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </button>
        )}
        <Link to={chemin('numero_versement')} className="li">
          <span className="ic green">
            <Icone nom="smartphone" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={BLOC}>
              {t('Changer de numéro de versement')}
            </span>
            <span className="ls" style={BLOC}>
              {n.enRevue ? tf('Nouveau numéro en revue jusqu’au {jour}', { jour: jourMoisLong(n.enRevue.jusqua, langue) }) : tf('Vérifié le {jour} · {n} jours de revue avant le premier versement', { jour: jourMoisLong(n.actuel.verifieLe, langue), n: n.revueJours })}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
      <CommentCaMarche>
        <p>{t('Les frais Mobile Money sont payés par BelivaY.')}</p>
        <p>
          <b>{t('Si l’opérateur refuse')}</b>
          {t(', le motif est écrit. Il n’y en a que trois : numéro au nom d’un tiers, compte plein, préfixe qui ne correspond pas à l’opérateur.')}
        </p>
        <p>{t('BelivaY réessaie 3 fois, un jour d’intervalle. Ensuite, les versements sont suspendus et le support vous appelle. Votre argent reste à vous.')}</p>
      </CommentCaMarche>
      <Message texte={message} />
    </>
  )
}

export default function Versements() {
  const [params, setParams] = useSearchParams()
  const periode: Periode = (['3', '12', 'tout'] as const).find((x) => x === params.get('periode')) ?? '3'
  const refus = params.get('refus')
  const lecture = useLecture(async () => {
    const [p, h, n] = await Promise.all([source.versements.prochain(), source.versements.historique(periode), source.versements.numero()])
    return { p, h, n }
  }, [periode, refus])
  const changerPeriode = (v: Periode) => {
    jouer('interrupteur')
    setParams((q) => (q.set('periode', v), q), { replace: true })
  }
  return (
    <AvecDonnees route="versements" lecture={lecture}>
      {(d) => (
        <Ecran route="versements">
          <Contenu p={d.p} h={d.h} n={d.n} periode={periode} changerPeriode={changerPeriode} relire={lecture.relire} />
        </Ecran>
      )}
    </AvecDonnees>
  )
}

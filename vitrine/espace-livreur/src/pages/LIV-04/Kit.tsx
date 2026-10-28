// LIV-P07 · Mon kit d'emballage. Comme dans le prototype (livA_kitSheet), c'est une FEUILLE DU BAS posée sur
// Aujourd'hui (en-tête racine) : l'adresse /kit rend le corps d'Aujourd'hui et la feuille par-dessus ; la fermer ramène
// à Aujourd'hui. Trois vues de la feuille (?vue=) :
// - le kit (défaut) : cinq cases S, M, L, C1, C2, couleur doublée d'un mot ; étiquettes du rouleau (restantes,
//   prochaine, plage) ; consommation calculée par paquet (lecture seule) ; couverture des paquets à venir ; réassort ;
// - « J'ai reçu des emballages » (recu) face à la remise enregistrée par l'entreprise (ENT-P21R-01) ; ouverte d'office
//   tant que le kit du jour n'est pas déclaré ;
// - écart de fin de journée et son motif (ecart) ; ouverte d'office quand un écart attend son motif ;
// - pochettes abîmées et rouleau perdu (suivi) : l'ancienne page ajoutée « kit-suivi », fusionnée ici (DP-66 : un seul
//   « Mon kit » ; l'ancienne adresse /kit-suivi y mène) — pochettes abîmées de la semaine face au seuil d'alerte (au-delà,
//   l'entreprise est alertée, jamais à la charge du livreur : LIV-P07R-02, R03), déclarer une pochette abîmée, rouleau
//   perdu (plage invalidée tout de suite, LIV-P07R-01, R71).
// Le stock n'est jamais saisi : reçu − étiquettes liées − pochettes abîmées, décompté à chaque étiquette liée
// (LIV-EQU-02, LIV-04-R38). Le livreur n'achète ni ne paie jamais un emballage : un écart remonte à l'entreprise
// (LIV-P07R-03). Le kit appartient à la relation avec l'entreprise (DP-66) : le livreur déclare et demande, jamais plus.
// Enrichissements : kit vide expliqué, avec le réassort à un geste (M7) ; un format qui passe sous son seuil sonne et
// vibre une fois (M9 ; réglages Sons et Vibrations respectés).
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Barre, Btn, Hint, HorsConnexion, Li, Note, Sec } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { FormatKit, Kit as K, MotifEcart, Quantites } from '../../donnees/domaines/kit'
import { geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Radio } from './ChoixStatut'
import { Chargement, ErreurLecture, nomFormat } from './commun'
import { CorpsAujourdhui, useFermerFeuille } from './Journee'
import './liv04.css'

export const FORMATS: FormatKit[] = ['S', 'M', 'L', 'C1', 'C2']
/** Étiquette du rouleau, comme imprimée (C.label). */
export const Etiquette = ({ n }: { n: string }) => (
  <span className="no-tr">
    <span className="label-bv">
      <Icone nom="tag" taille={15} />
      {n}
    </span>
  </span>
)
const numero = (x: string) => Number(x.replace(/\D/g, ''))
const liste = (q: Partial<Quantites>, t: (s: string) => string) =>
  Object.entries(q)
    .filter(([, n]) => n)
    .map(([f, n]) => `${n} ${t(nomFormat(f as FormatKit, n!))}`)
    .join(', ')

export default function Kit() {
  const { t } = usePreferences()
  const fermer = useFermerFeuille()
  const lecture = useLecture(() => source.kit.lire(), [])
  return (
    <Ecran
      route="kit"
      proto
      fixes={
        <Feuille ouverte fermer={fermer} titre={t('Mon kit d’emballage')}>
          {lecture.erreur ? <ErreurLecture relire={lecture.relire} /> : !lecture.donnees ? <Chargement lignes={6} /> : <Vues k={lecture.donnees} relire={lecture.relire} />}
        </Feuille>
      }
    >
      <CorpsAujourdhui />
    </Ecran>
  )
}

function Vues({ k, relire }: { k: K; relire: () => void }) {
  const [params] = useSearchParams()
  const demande = params.get('vue')
  const ecartOuvert = k.finDeJournee?.ecarts.some((e) => !e.motif)
  if (demande === 'suivi') return <Suivi k={k} relire={relire} />
  const vue = demande === 'recu' || demande === 'ecart' || demande === 'kit' ? demande : !k.declaration && k.remise ? 'recu' : ecartOuvert ? 'ecart' : 'kit'
  if (vue === 'recu') return <Recu k={k} relire={relire} />
  if (vue === 'ecart' && k.finDeJournee) return <Ecart k={k} relire={relire} />
  return <MonKit k={k} relire={relire} />
}

function EnTete({ titre, sous }: { titre: string; sous: string }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h2 className="b8 t19 l4-feuille-t">{titre}</h2>
        <div className="t13 c3 mt4">{sous}</div>
      </div>
      <Icone nom="boxes" taille={26} style={{ color: 'var(--acc-txt)', flexShrink: 0 }} />
    </div>
  )
}

function useVue() {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  return (vue: string | null) => {
    const p = new URLSearchParams(params)
    if (vue) p.set('vue', vue)
    else p.delete('vue')
    naviguer({ search: p.toString() }, { replace: true, state: history.state?.usr })
  }
}

function MonKit({ k, relire }: { k: K; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const vue = useVue()
  const [msg, setMsg] = useState<string | null>(null)
  const manqueTotal: Partial<Quantites> = {}
  for (const c of k.couverture) for (const [f, n] of Object.entries(c.manque) as [FormatKit, number][]) manqueTotal[f] = (manqueTotal[f] ?? 0) + n
  const bas = k.formats.filter((f) => f.etat === 'bas' && f.seuil !== null)
  const aDemander: Partial<Quantites> = { ...manqueTotal }
  for (const f of bas) aDemander[f.format] = Math.max(aDemander[f.format] ?? 0, f.seuil! - f.stock)
  const reassort = async () => {
    const o = origine(s.maintenant)
    const { r } = await geste(enLigne, 'kit', 'reassort', o, (x) => x.kit.demanderReassort(aDemander, k.couverture[0]?.paquetId ?? null, o), true)
    if (r.ok) {
      signal('succes')
      setMsg(t('Réassort demandé : votre entreprise est prévenue.'))
      relire()
    } else setMsg(r.raison === 'deja_demande' ? t('Réassort déjà demandé.') : t('Rien à demander : votre kit couvre vos paquets.'))
  }
  const sous = !enLigne
    ? t('Dernières données du téléphone')
    : [k.declaration ? tf('Déclaré à {h}', { h: heure(k.declaration.le, langue) }) : t('Kit du jour pas encore déclaré'), k.remise ? t(k.remise.lieu) : null, k.reassort ? tf('réassort demandé à {h}', { h: heure(k.reassort.demandeLe, langue) }) : null].filter(Boolean).join(' · ')
  const mot = (f: K['formats'][number]) =>
    f.etat === 'stockage' ? t('au stockage') : f.etat === 'bas' ? t('sous le seuil') : f.etat === 'non_couvert' ? t('manque') : f.format.startsWith('C') ? (f.stock > 1 ? t('cartons') : t('carton')) : f.stock > 1 ? t('pochettes') : t('pochette')
  const classe = { ok: 'ok', bas: 'low', non_couvert: 'bad', stockage: 'off' } as const
  const aReassort = (k.couverture.length > 0 || bas.length > 0) && !k.reassort
  const vide = k.formats.every((f) => f.stock === 0 || f.etat === 'stockage')
  // Seuil bas : un signal, une fois par format et par série de formats bas (gardé pour la visite).
  const empreinteBas = k.formats.filter((f) => f.etat === 'bas' || f.etat === 'non_couvert').map((f) => f.format).join(',')
  useEffect(() => {
    if (!empreinteBas) return
    try {
      if (sessionStorage.getItem('blv_l_kit_bas') === empreinteBas) return
      sessionStorage.setItem('blv_l_kit_bas', empreinteBas)
    } catch {
      /* stockage indisponible : le signal part quand même */
    }
    signal('alerte')
  }, [empreinteBas])
  return (
    <>
      <EnTete titre={t('Mon kit d’emballage')} sous={sous} />
      {!enLigne && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {t('chaque étiquette liée hors connexion est décomptée sur le téléphone, puis envoyée au retour du réseau.')}
        </HorsConnexion>
      )}
      <div className="liva-fmt" role="list" aria-label={t('Stock par format')}>
        {k.formats.map((f) => (
          <div key={f.format} className={classe[f.etat]} role="listitem">
            <div className="f">{f.format}</div>
            <div className="n">{f.stock}</div>
            <div className="d">{mot(f)}</div>
          </div>
        ))}
      </div>
      {vide && (
        <Note ton="amber" icone="package-open" role="status">
          <b>{t('Kit vide')}</b> · {t('aucun emballage sur vous. Vous ne pouvez pas ramasser sans kit : demandez un réassort à votre entreprise. Jamais d’emballage improvisé, vous ne payez rien.')}
        </Note>
      )}
      {k.etiquettes ? (
        k.etiquettes.perdu ? (
          <Note ton="red" icone="ban">
            {tf('Rouleau déclaré perdu : la plage {de} → {a} est invalidée. Demandez un nouveau rouleau à votre entreprise.', { de: k.etiquettes.de, a: k.etiquettes.a })}
          </Note>
        ) : (
          <>
            <div className="card row" style={{ gap: 10 }}>
              <span className="grow">
                <span className="kick" style={{ display: 'block' }}>
                  {t('Étiquettes du rouleau')}
                </span>
                <span className="b8 t19" style={{ display: 'block', marginTop: 4 }}>
                  {k.etiquettes.restantes === 1 ? t('1 restante') : tf('{n} restantes', { n: k.etiquettes.restantes })}
                </span>
              </span>
              {k.etiquettes.prochaine && (
                <span className="right">
                  <span className="t12 c3 b7" style={{ display: 'block', marginBottom: 4 }}>
                    {t('Prochaine')}
                  </span>
                  <Etiquette n={k.etiquettes.prochaine} />
                </span>
              )}
            </div>
            <div className="t12 c3 l4-plage">{tf('Plage {de} à {a} rattachée à vous : une étiquette hors de cette plage ne peut pas être liée par vous.', { de: k.etiquettes.de, a: k.etiquettes.a })}</div>
          </>
        )
      ) : (
        <Hint icone="tag">{t('Aucun rouleau rattaché : il vous est remis avec le kit.')}</Hint>
      )}
      <div className="divide l4-divide">{t('Consommation calculée · étiquettes liées')}</div>
      {k.consommation.length === 0 ? (
        <Hint icone="tag">{t('Aucune étiquette liée aujourd’hui.')}</Hint>
      ) : (
        <div className="card tight">
          {k.consommation.map((c) => (
            <Li
              key={c.paquetId}
              icone="tag"
              ton="acc"
              t={<span className="no-tr">{c.paquetId}</span>}
              s={
                <>
                  {Object.entries(c.formats)
                    .map(([f, n]) => `${n} ${f}`)
                    .join(' · ')}
                  {c.etiquettes && (
                    <>
                      <br />
                      <b className="mono no-tr" style={{ color: 'var(--ink-2)' }}>
                        {c.etiquettes.de === c.etiquettes.a ? c.etiquettes.de : `${c.etiquettes.de} → ${c.etiquettes.a}`}
                      </b>
                    </>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
      {k.couverture.length > 0 ? (
        <Note ton="red" icone="package-x">
          {k.couverture.map((c) => (
            <span key={c.paquetId} style={{ display: 'block' }}>
              <b>{tf('Kit insuffisant pour {id}', { id: c.paquetId })}</b> : {tf('il manque {liste}.', { liste: liste(c.manque, t) })}
            </span>
          ))}
          {t('Passez au point de stockage de votre entreprise avant le premier ramassage. Jamais d’emballage improvisé.')}
        </Note>
      ) : bas.length > 0 ? (
        <Note ton="amber" icone="package-open">
          <b>{bas.map((f) => tf('{f} : {n}, sous le seuil de {s}', { f: t(nomFormat(f.format, 2)), n: f.stock, s: f.seuil! })).join(' · ')}.</b> {t('Vos paquets à venir sont couverts ; un réassort est conseillé.')}
        </Note>
      ) : (
        <Note ton="green" icone="package-check">
          <b>{t('Kit suffisant')}</b> {t('pour vos paquets à venir.')}
        </Note>
      )}
      {k.reassort && (
        <Note ton="acc" icone="package-plus" role="status">
          {tf('Réassort demandé à {h} : {liste}. Votre entreprise est prévenue.', { h: heure(k.reassort.demandeLe, langue), liste: liste(k.reassort.formats, t) })}
        </Note>
      )}
      {msg && (
        <Note ton="acc" icone="info" role="status">
          {msg}
        </Note>
      )}
      <div className="btns liva-col mt14">
        {aReassort ? (
          <Btn kind="primary" icone="package-plus" cls="xl" onClick={() => void reassort()}>
            {tf('Demander un réassort à {entreprise}', { entreprise: s.livreur?.entreprise ?? t('mon entreprise') })}
          </Btn>
        ) : (
          <Btn kind="primary" icone="navigation" cls="xl" vers={chemin('paquet')}>
            {t('Partir')}
          </Btn>
        )}
        <Btn kind="secondary" icone="plus" onClick={() => vue('recu')}>
          {t('J’ai reçu des emballages')}
        </Btn>
        {k.finDeJournee && (
          <Btn kind="secondary" icone="scale" onClick={() => vue('ecart')}>
            {t('Fin de journée : ce que je rends')}
          </Btn>
        )}
      </div>
      <div className="card tight">
        <Li icone="package-x" ton="ink" t={t('Pochette abîmée, rouleau perdu')} s={tf('{a} abîmée(s) cette semaine · seuil d’alerte {s} %', { a: k.abimesSemaine.abimes, s: k.abimesSemaine.seuilPourcent })} onClick={() => vue('suivi')} />
      </div>
      <Hint icone="shield-check">{t('Vous n’achetez ni ne payez jamais un emballage ; il ne sert qu’aux missions BelivaY.')}</Hint>
    </>
  )
}

function Recu({ k, relire }: { k: K; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const vue = useVue()
  const base = k.remise?.quantites ?? { S: 0, M: 0, L: 0, C1: 0, C2: 0 }
  const [q, setQ] = useState<Quantites>(base)
  const [acc, setAcc] = useState(k.accessoires)
  const [premiere, setPremiere] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const ecart = FORMATS.some((x) => q[x] !== base[x])
  const confirmer = async () => {
    const o = origine(s.maintenant)
    const { r } = await geste(enLigne, 'kit', 'reception', o, (x) => x.kit.confirmerReception(q, acc, premiere, o), true)
    if (r.ok) {
      signal('succes')
      setPremiere('')
      relire()
      return vue('kit')
    }
    signal('erreur')
    setErreur(r.raison === 'plage_differente' ? t('Ce rouleau n’est pas celui que votre entreprise vous a remis : vérifiez la première étiquette.') : t('Aucune remise enregistrée par votre entreprise : demandez-lui de l’enregistrer.'))
  }
  const plage = k.remise?.plage
  const nb = plage ? numero(plage.a) - numero(plage.de) + 1 : 0
  return (
    <>
      <EnTete titre={t('J’ai reçu des emballages')} sous={k.remise ? `${jourLong(k.remise.le, langue)} · ${heure(k.remise.le, langue)}` : t('Aucune remise enregistrée')} />
      <div className="card tight">
        {FORMATS.map((x) => (
          <div key={x} className="liva-qty">
            <span className="l4-qfmt">{x}</span>
            <span className="grow">
              <span className="b8 t14" style={{ display: 'block' }}>
                {x.startsWith('C') ? t('Carton') : t('Pochette')} {k.dimensions[x]}
              </span>
            </span>
            <span className="q">
              <button type="button" aria-label={tf('Retirer une {f}', { f: t(nomFormat(x, 1)) })} disabled={q[x] <= 0} onClick={() => setQ({ ...q, [x]: q[x] - 1 })}>
                −
              </button>
              <b aria-live="polite">{q[x]}</b>
              <button type="button" aria-label={tf('Ajouter une {f}', { f: t(nomFormat(x, 1)) })} onClick={() => setQ({ ...q, [x]: q[x] + 1 })}>
                +
              </button>
            </span>
          </div>
        ))}
      </div>
      {ecart && (
        <Note ton="amber" icone="triangle-alert" role="status">
          {t('Différent de la remise enregistrée : l’écart part à votre entreprise, jamais à votre charge.')}
        </Note>
      )}
      {plage && (
        <>
          <div className="fld">
            <label>{tf('Plage d’étiquettes · {n} étiquettes', { n: nb })}</label>
          </div>
          <div className="card row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 0 }}>
            <Etiquette n={plage.de} />
            <span className="t13 c3 b7">{t('à')}</span>
            <Etiquette n={plage.a} />
          </div>
        </>
      )}
      <div className="fld">
        <label htmlFor="l4-rouleau">{t('Scanner le rouleau : première étiquette')}</label>
        <div className={'inp' + (erreur ? ' err' : '')}>
          <Icone nom="scan-barcode" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input id="l4-rouleau" className="grow l4-inp" value={premiere} onChange={(e) => (setErreur(null), setPremiere(e.target.value.toUpperCase()))} placeholder={plage ? plage.de.replace(/\d/g, '0') : ''} autoComplete="off" aria-invalid={!!erreur || undefined} />
        </div>
      </div>
      <div className="card tight" role="group" aria-label={t('Avec le kit')}>
        {(
          [
            ['ruban', 'Ruban adhésif · 1 rouleau'],
            ['marqueur', 'Marqueur pour signer le scellé'],
            ['papierBulle', 'Papier bulle'],
          ] as const
        ).map(([id, l]) => (
          <label key={id} className="check l4-check">
            <input type="checkbox" className="l4-sr" checked={acc[id]} onChange={(e) => setAcc({ ...acc, [id]: e.target.checked })} />
            <span className={'cbx' + (acc[id] ? ' on' : '')} aria-hidden="true">
              {acc[id] && <Icone nom="check" taille={14} trait={3} />}
            </span>
            <span className="grow">{t(l)}</span>
          </label>
        ))}
      </div>
      {erreur && (
        <Note ton="red" icone="circle-alert" role="alert">
          {erreur}
        </Note>
      )}
      {k.remise && (
        <Note ton="acc" icone="building-2">
          {tf('Votre entreprise a enregistré cette remise dans son portail à {h} ({lieu}) ; vous la confirmez ici. Les emballages restent la propriété de BelivaY.', { h: heure(k.remise.le, langue), lieu: t(k.remise.lieu) })}
        </Note>
      )}
      {!enLigne && <Hint icone="wifi-off">{t('Sans réseau : la déclaration part au retour du réseau, avec son heure.')}</Hint>}
      <div className="btns liva-col mt14">
        <Btn kind="primary" icone="check" cls="xl" off={!premiere.trim()} onClick={() => void confirmer()}>
          {t('Confirmer la réception')}
        </Btn>
        {k.declaration && (
          <Btn kind="secondary" onClick={() => vue('kit')}>
            {t('Retour à mon kit')}
          </Btn>
        )}
      </div>
    </>
  )
}

function Ecart({ k, relire }: { k: K; relire: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const vue = useVue()
  const f = k.finDeJournee!
  const ouvert = f.ecarts.find((e) => !e.motif) ?? null
  const [motif, setMotif] = useState<MotifEcart>('dechiree')
  const motifs: [MotifEcart, string, string][] = [
    ['dechiree', 'Pochette déchirée pendant l’emballage', 'Déclarée abîmée, sans colis'],
    ['perdue', 'Pochette perdue', ''],
    ['autre', 'Autre motif', 'Écrit en quelques mots'],
  ]
  const declarer = async () => {
    if (!ouvert) return
    const o = origine(s.maintenant)
    await geste(enLigne, 'kit', 'ecart:' + ouvert.format, o, (x) => x.kit.declarerMotifEcart(ouvert.format, motif, o), true)
    signal('succes')
    relire()
  }
  const col = { gridTemplateColumns: '44px 1fr 1fr 1fr 1fr' }
  return (
    <>
      <EnTete titre={t('Mon kit d’emballage')} sous={t('Fin de journée')} />
      <div className="card" role="table" aria-label={t('Fin de journée')}>
        <div className="liva-need h" style={col} role="row">
          <span role="columnheader">
            <span className="l4-sr">{t('Format')}</span>
          </span>
          <span role="columnheader">{t('Reçu')}</span>
          <span role="columnheader">{t('Étiq.')}</span>
          <span role="columnheader">{t('Doit rester')}</span>
          <span className="st" role="columnheader">
            {t('Rendu')}
          </span>
        </div>
        {k.formats.map((x) => {
          const bad = f.ecarts.some((e) => e.format === x.format)
          return (
            <div key={x.format} className={'liva-need' + (bad ? ' bad' : '')} style={col} role="row">
              <span className="fmt" role="rowheader">
                {x.format}
              </span>
              <span role="cell">{x.recu}</span>
              <span role="cell">{x.lies}</span>
              <span role="cell">
                <b>{x.recu - x.lies}</b>
              </span>
              <span className="st" role="cell">
                <b className={bad ? 'cr' : ''}>{f.rendu[x.format]}</b>
              </span>
            </div>
          )
        })}
      </div>
      {f.ecarts.length === 0 ? (
        <Note ton="green" icone="package-check">
          <b>{t('Aucun écart')}</b> · {t('ce que vous rendez correspond aux étiquettes liées.')}
        </Note>
      ) : (
        f.ecarts.map((e) => (
          <Note key={e.format} ton={e.motif ? 'ink' : 'red'} icone="package-x">
            <b>{tf('Écart : {n} {f}', { n: Math.abs(e.ecart), f: t(nomFormat(e.format, Math.abs(e.ecart))) })}</b> · {e.motif ? tf('motif déclaré : {m}.', { m: t(motifs.find((m) => m[0] === e.motif)![1]) }) : t('reçu − étiquettes liées = ce qui doit rester ; on ne compte pas le stock, on compte les étiquettes.')}
          </Note>
        ))
      )}
      {ouvert && (
        <>
          <div className="fld">
            <label id="l4-motif-e">{tf('Motif de l’écart · {f}', { f: ouvert.format })}</label>
          </div>
          <div role="radiogroup" aria-labelledby="l4-motif-e">
            {motifs.map(([id, l, d]) => (
              <Radio key={id} on={motif === id} onClick={() => setMotif(id)} t={t(l)} s={d ? t(d) : undefined} />
            ))}
          </div>
        </>
      )}
      <Hint icone="building-2">{tf('L’écart remonte à votre entreprise, jamais à vous : vous n’achetez ni ne payez aucun emballage. Au-delà de {s} % de pochettes abîmées sur la semaine, votre entreprise est alertée.', { s: k.abimesSemaine.seuilPourcent })}</Hint>
      <div className="btns liva-col mt14">
        {ouvert && (
          <Btn kind="primary" icone="send" cls="xl" onClick={() => void declarer()}>
            {t('Déclarer le motif')}
          </Btn>
        )}
        <Btn kind="secondary" onClick={() => vue('kit')}>
          {t('Retour à mon kit')}
        </Btn>
      </div>
    </>
  )
}

/** Vue « suivi » : pochettes abîmées de la semaine, déclarer une pochette abîmée, rouleau perdu. */
function Suivi({ k, relire }: { k: K; relire: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const [format, setFormat] = useState<FormatKit | null>(null)
  const [fait, setFait] = useState<string | null>(null)
  const [confirmer, setConfirmer] = useState(false)
  const a = k.abimesSemaine
  const total = a.utilises + a.abimes
  const pct = total ? (a.abimes / total) * 100 : 0
  const abimee = async () => {
    if (!format) return
    const o = origine(s.maintenant)
    const { r } = await geste(enLigne, 'kit', 'abimee:' + format, o, (x) => x.kit.declarerAbimee(format, o), true)
    signal(r.ok ? 'succes' : 'erreur')
    setFait(r.ok ? tf('{f} déclarée abîmée : retirée de votre stock.', { f: t(nomFormat(format, 1)) }) : t('Plus de stock dans ce format.'))
    setFormat(null)
    relire()
  }
  const vue = useVue()
  const perdu = async () => {
    const o = origine(s.maintenant)
    const { r } = await geste(enLigne, 'kit', 'rouleau_perdu', o, (x) => x.kit.declarerRouleauPerdu(o), true)
    signal(r.ok ? 'succes' : 'erreur')
    setConfirmer(false)
    relire()
  }
  return (
    <>
      <EnTete titre={t('Pochette abîmée, rouleau perdu')} sous={tf('{a} abîmée(s) cette semaine · seuil d’alerte {s} %', { a: a.abimes, s: a.seuilPourcent })} />
      {!enLigne && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {t('vos déclarations partent au retour du réseau, avec leur heure.')}
        </HorsConnexion>
      )}
      <Sec titre={t('Pochettes abîmées cette semaine')} />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="b8 t19">{tf('{a} sur {u}', { a: a.abimes, u: total })}</span>
          <span className="t13 c3 b7">{tf('seuil d’alerte {s} %', { s: a.seuilPourcent })}</span>
        </div>
        <div className="mt10">
          <Barre pct={(pct / Math.max(a.seuilPourcent, 1)) * 100} ton={a.alerte ? 'red' : 'acc'} label={tf('{p} % de pochettes abîmées', { p: Math.round(pct) })} />
        </div>
        {a.alerte ? (
          <Note ton="amber" icone="building-2" role="status">
            {t('Au-delà du seuil : votre entreprise est alertée. Ce n’est jamais à votre charge.')}
          </Note>
        ) : (
          <Hint icone="building-2">{t('Au-delà du seuil, votre entreprise est alertée. Ce n’est jamais à votre charge.')}</Hint>
        )}
      </div>
      <Sec titre={t('Déclarer une pochette abîmée')} />
      <div className="card">
        <p className="t13 c3" style={{ margin: 0 }}>
          {t('Abîmée pendant l’emballage, sans colis : elle est retirée de votre stock et comptée pour la semaine.')}
        </p>
        <div role="radiogroup" aria-label={t('Format')}>
          {k.formats
            .filter((x) => x.format !== 'C2')
            .map((x) => (
              <Radio key={x.format} on={format === x.format} off={x.stock <= 0} onClick={() => setFormat(x.format)} t={(([c, ...r]) => c.toUpperCase() + r.join(''))(t(nomFormat(x.format, 1)))} s={x.stock <= 0 ? t('plus en stock') : tf('{n} sur vous', { n: x.stock })} />
            ))}
        </div>
        {fait && (
          <Note ton="acc" icone="info" role="status">
            {fait}
          </Note>
        )}
        <div className="btns liva-col mt14">
          <Btn kind="primary" icone="package-x" off={!format} onClick={() => void abimee()}>
            {t('Déclarer abîmée')}
          </Btn>
        </div>
      </div>
      <Sec titre={t('Rouleau d’étiquettes')} />
      <div className="card">
        {!k.etiquettes ? (
          <p className="t13 c3" style={{ margin: 0 }}>
            {t('Aucun rouleau rattaché : il vous est remis avec le kit.')}
          </p>
        ) : k.etiquettes.perdu ? (
          <Note ton="red" icone="ban">
            {tf('Rouleau déclaré perdu : la plage {de} → {a} est invalidée. Demandez un nouveau rouleau à votre entreprise.', { de: k.etiquettes.de, a: k.etiquettes.a })}
          </Note>
        ) : (
          <>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <Etiquette n={k.etiquettes.de} />
              <span className="t13 c3 b7">{t('à')}</span>
              <Etiquette n={k.etiquettes.a} />
            </div>
            {confirmer ? (
              <>
                <Note ton="red" icone="triangle-alert">
                  {tf('La plage {de} → {a} sera invalidée tout de suite : plus aucune de ses étiquettes ne pourra être liée, par personne. Votre entreprise vous remettra un nouveau rouleau.', { de: k.etiquettes.de, a: k.etiquettes.a })}
                </Note>
                <div className="btns liva-col mt14">
                  <Btn kind="red" icone="ban" cls="xl" onClick={() => void perdu()}>
                    {t('Invalider la plage du rouleau')}
                  </Btn>
                  <Btn kind="secondary" onClick={() => setConfirmer(false)}>
                    {t('Annuler')}
                  </Btn>
                </div>
              </>
            ) : (
              <div className="btns liva-col mt14">
                <Btn kind="danger" icone="tag" onClick={() => setConfirmer(true)}>
                  {t('Déclarer un rouleau perdu')}
                </Btn>
              </div>
            )}
          </>
        )}
      </div>
      <Hint icone="shield-check">{t('Les emballages restent la propriété de BelivaY jusqu’à leur usage pour un colis : vous n’en achetez ni n’en payez jamais, vous n’en prêtez pas à un autre livreur (le transfert passe par votre entreprise).')}</Hint>
      <div className="btns liva-col mt14">
        <Btn kind="secondary" icone="arrow-left" onClick={() => vue('kit')}>
          {t('Retour au kit')}
        </Btn>
      </div>
    </>
  )
}

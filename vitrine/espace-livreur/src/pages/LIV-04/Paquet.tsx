// LIV-P06 · Détail du paquet avant départ, repris sur le prototype (route « paquet ») : en-tête secondaire « Paquet
// <numéro> », pas de barre du bas, actions fixées en bas d'écran (bottom-cta). Ordre du prototype : bandeau hors
// connexion, carte « Le paquet a changé » (avant / après), héros nuit (type, zone, numéro, « rien à accepter », quatre
// cases : heure limite, durée estimée et distance, colis par classe, dépôt prévu et marge), valeur totale face au
// plafond du palier (jamais la valeur d'un colis), arrêts dans l'ordre imposé (colis par classe, « avec soin »),
// kit nécessaire par format comparé au kit sur soi et plage d'étiquettes, rappel « le paquet se
// fait en entier ». États : affecté, modifié (« J'ai relu, démarrer »), kit insuffisant (formats manquants en rouge,
// réassort ou « emballage manquant »), hors connexion (détail téléchargé, départ mis en file), bloqué (plafond),
// retiré, rendu, en cours, terminé. Le paquet se fait en entier ou se rend avant le premier ramassage.
// Enrichissements : retrouver un colis par son code (M5) ; feuille de route en PDF, à partager (M6) — arrêts, créneaux,
// colis par classe et kit, jamais l'identité d'un client ni une valeur.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Recherche, exporterPdf, plier } from '../../composants/enrichis'
import { Icone } from '../../composants/Icone'
import { BarreAction, Btn, Hint, HorsConnexion, Kv, Note, Pill, Sec, Vide } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { ClasseColis } from '../../donnees/communs'
import type { FormatKit } from '../../donnees/domaines/kit'
import type { ArretPaquet, ColisDuPaquet, Paquet as P } from '../../donnees/domaines/paquets'
import { geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { creneau, duree, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Etiquette } from './Kit'
import { Chargement, ErreurLecture, TYPES_PAQUET, nomFormat } from './commun'
import { useOuvrirFeuille } from './Journee'
import './liv04.css'

export default function Paquet() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const lecture = useLecture(() => source.paquets.paquet(id ?? undefined), [id])
  const { t, tf } = usePreferences()
  const p = lecture.donnees
  return (
    <Ecran route="paquet" proto titre={p ? tf('Paquet {id}', { id: p.id }) : undefined} fixes={p && <Actions p={p} />}>
      {lecture.erreur ? (
        <ErreurLecture relire={lecture.relire} />
      ) : p === null ? (
        <div className="card">
          <Vide icone="package-search" t={id ? t('Ce paquet ne vous est pas affecté') : t('Aucun paquet affecté pour l’instant')} s={t('Vous ne voyez que les paquets que votre entreprise vous affecte.')}>
            <div className="btns">
              <Btn kind="secondary" icone="house" vers={chemin('aujourdhui')}>
                {t('Retour à ma journée')}
              </Btn>
            </div>
          </Vide>
        </div>
      ) : !p ? (
        <Chargement lignes={6} />
      ) : (
        <Contenu p={p} />
      )}
    </Ecran>
  )
}

const CLASSES: ClasseColis[] = ['S', 'M', 'L', 'XL', 'XXL']
const parClasse = (colis: { classe: ClasseColis }[]) => {
  const n: Partial<Record<ClasseColis, number>> = {}
  for (const c of colis) n[c.classe] = (n[c.classe] ?? 0) + 1
  return CLASSES.filter((c) => n[c]).map((c) => `${n[c]} ${c}`)
}
const VERBE = { ramassage: 'Ramassage', relais: 'Dépôt au relais', domicile: 'Remise à domicile', collecte: 'Collecte au relais', retour: 'Retour au vendeur' }

function Contenu({ p }: { p: P }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const tous = [...new Map(p.arrets.flatMap((a) => a.colis).map((c) => [c.id, c])).values()]
  const [telech, setTelech] = useState(false)
  const [code, setCode] = useState('')
  const cherche = plier(code.trim())
  const trouves = cherche ? p.arrets.flatMap((a) => a.colis.filter((c) => plier(c.id).includes(cherche)).map((c) => ({ c, a }))) : []
  const feuilleDeRoute = async () => {
    await exporterPdf(`feuille-de-route-${p.id}.pdf`, tf('Feuille de route {id}', { id: p.id }), [
      { texte: tf('BelivaY livreur · Feuille de route {id}', { id: p.id }), taille: 15, gras: true },
      { texte: [t(TYPES_PAQUET[p.type]), p.zone, p.entreprise].join(' · '), espace: 4 },
      { texte: tf('Heure limite {h} · {m} min estimées · {km} km', { h: heure(p.heureLimite, langue), m: p.dureeEstimeeMin, km }) },
      { texte: t('Arrêts dans l’ordre imposé'), gras: true, espace: 12 },
      ...p.arrets.map((a) => ({
        texte: `${a.ordre}. ${t(a.nom)}${a.type !== 'relais' && a.quartier && a.nom !== a.quartier ? ' · ' + a.quartier : ''}${a.creneau ? ' · ' + creneau(a.creneau, langue) : ''}`,
        droite: a.colis.length === 1 ? t('1 colis') : tf('{n} colis', { n: a.colis.length }),
      })),
      ...(p.kit.length ? [{ texte: t('Kit nécessaire'), gras: true, espace: 12 }, ...p.kit.map((k) => ({ texte: t(nomFormat(k.format, k.ilFaut)), droite: String(k.ilFaut) }))] : []),
      { texte: t('Le paquet se fait en entier, dans l’ordre imposé. Aucune donnée de client sur cette feuille.'), taille: 9, espace: 16 },
    ])
    signal('succes')
  }
  const aDemarrer = p.etat === 'affecte' || p.etat === 'modifie'
  const km = p.distanceKm.toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR')
  return (
    <>
      {!enLigne && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {p.telechargeA ? tf('détail téléchargé à {h}. Vous pouvez démarrer : le départ est mis en file et part au retour du réseau.', { h: heure(p.telechargeA, langue) }) : t('ce paquet n’a pas été téléchargé : dernières données affichées.')}
        </HorsConnexion>
      )}
      {p.etat === 'retire' && (
        <Note ton="ink" icone="undo-2" role="status">
          {tf('{entreprise} vous a retiré ce paquet{h}. Aucune conséquence pour vous.', { entreprise: p.entreprise, h: p.retireLe ? ' ' + tf('à {h}', { h: heure(p.retireLe, langue) }) : '' })}
        </Note>
      )}
      {p.etat === 'rendu' && p.rendu && (
        <Note ton="ink" icone="undo-2" role="status">
          {tf('Paquet rendu à {entreprise} à {h} : il est réaffecté.', { entreprise: p.entreprise, h: heure(p.rendu.le, langue) })}
        </Note>
      )}
      {p.etat === 'bloque' && p.blocage && (
        <Note ton="red" icone="ban" role="alert">
          {t(p.blocage)}
        </Note>
      )}
      {p.changements && (
        <div className="card l4-change" role="status">
          <div className="row" style={{ gap: 10 }}>
            <Icone nom="refresh-cw" taille={20} style={{ color: 'var(--or-txt)' }} />
            <div className="grow">
              <div className="b8 t15">{tf('Le paquet a changé à {h}', { h: heure(p.changements.a, langue) })}</div>
              <div className="t12 c3 mt4">{t('Relisez ce qui change avant de démarrer.')}</div>
            </div>
          </div>
          {p.changements.liste.map((c) => (
            <div key={c.libelle} className="liva-diff">
              <div className="was">
                <span className="lab">
                  {t('Avant')} · {t(c.libelle)}
                </span>
                {t(c.avant)}
              </div>
              <div className="now">
                <span className="lab" style={{ color: 'var(--acc-txt)' }}>
                  {t('Maintenant')}
                </span>
                {t(c.apres)}
              </div>
            </div>
          ))}
          {p.changements.inchange.length > 0 && <Hint icone="check">{tf('Inchangé : {liste}.', { liste: p.changements.inchange.map((x) => t(x)).join(', ') })}</Hint>}
        </div>
      )}
      {p.margeMin < 0 && ['affecte', 'modifie', 'en_cours'].includes(p.etat) && (
        <Note ton="amber" icone="clock" role="status">
          {tf('Heure limite déjà menacée : dépôt prévu {d} après la limite. Votre entreprise et BelivaY voient le risque ; ne coupez aucune étape de preuve pour gagner du temps.', { d: duree(-p.margeMin * 60_000, langue) })}
        </Note>
      )}

      <section className="hero night" aria-labelledby="l4-pq-id">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 6 }}>
          <span className="hk">
            {t(TYPES_PAQUET[p.type])} · {p.zone}
          </span>
          <Pill ton="dk" icone="user-round-check">
            {tf('Affecté à {h}', { h: heure(p.affecteA, langue) })}
          </Pill>
        </div>
        <h2 className="ht mono no-tr l4-pq-id" id="l4-pq-id">
          {p.id}
        </h2>
        <div className="hs">{tf('Affecté par {entreprise} : rien à accepter. Ordre des arrêts calculé par le système.', { entreprise: p.entreprise })}</div>
        <div className="money4">
          <div className="m4">
            <div className="l">
              <Icone nom="clock" taille={14} />
              {t('Heure limite')}
            </div>
            <div className="v">{heure(p.heureLimite, langue)}</div>
            <div className="s">{t(p.arrets[p.arrets.length - 1]?.type === 'domicile' ? 'remise au client' : 'dépôt au relais')}</div>
          </div>
          <div className="m4">
            <div className="l">
              <Icone nom="route" taille={14} />
              {t('Durée estimée')}
            </div>
            <div className="v">{duree(p.dureeEstimeeMin * 60_000, langue)}</div>
            <div className="s">{tf('{km} km', { km })}</div>
          </div>
          <div className="m4">
            <div className="l">
              <Icone nom="package" taille={14} />
              {t('Colis')}
            </div>
            <div className="v">{p.colisTotal}</div>
            <div className="s">{parClasse(tous).join(' · ')}</div>
          </div>
          <div className="m4">
            <div className="l">
              <Icone nom="flag" taille={14} />
              {p.departA ? t('Dépôt prévu') : t('Dépôt si départ maintenant')}
            </div>
            <div className="v">{heure(p.depotPrevu, langue)}</div>
            <div className={'s' + (p.margeMin < 0 ? ' l4-depasse' : '')}>{p.margeMin >= 0 ? tf('marge {d}', { d: duree(p.margeMin * 60_000, langue) }) : tf('{d} de retard', { d: duree(-p.margeMin * 60_000, langue) })}</div>
          </div>
        </div>
      </section>

      <div className="card">
        <Kv k={t('Valeur totale transportée')} v={p.valeurTotale !== null ? t(F(p.valeurTotale) + ' F') : t('sous le plafond')} />
        <Kv k={tf('Plafond de {entreprise} · palier {palier}', { entreprise: p.entreprise, palier: t(p.palier) })} v={p.plafondPalier !== null ? tf('{m} par colis · respecté', { m: t(F(p.plafondPalier) + ' F') }) : t('sans plafond par colis')} />
        <Hint icone="eye-off">{t('Avant le ramassage, vous voyez la classe, la mention « avec soin » et le nombre d’articles ; ni le contenu ni la valeur d’un colis.')}</Hint>
      </div>

      <Sec titre={t('Arrêts dans l’ordre imposé')} />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 6 }}>
          <Pill ton="acc" sm icone="lock">
            {t('Ordre imposé — ne pas intervertir')}
          </Pill>
          <span className="t12 c3 b7">{p.arrets.length === 1 ? t('1 arrêt') : tf('{n} arrêts', { n: p.arrets.length })}</span>
        </div>
        {p.arrets.map((a) => (
          <Arret key={a.id} a={a} />
        ))}
      </div>
      {tous.length > 1 && (
        <>
          <Recherche valeur={code} changer={setCode} libelle={t('Retrouver un colis par son code')} resultats={cherche ? trouves.length : undefined} />
          {cherche && (
            <div className="card tight mt8">
              {trouves.length ? (
                trouves.map(({ c, a }) => (
                  <div key={c.id + a.id} className="li">
                    <span className="ic acc">
                      <Icone nom="package-search" taille={20} />
                    </span>
                    <span className="grow">
                      <span className="lt no-tr" style={{ display: 'block' }}>
                        {c.id}
                      </span>
                      <span className="ls" style={{ display: 'block' }}>
                        {tf('Classe {c} · arrêt {n}, {nom}', { c: c.classe, n: a.ordre, nom: t(a.nom) })}
                        {c.fragile ? ' · ' + t('avec soin') : ''}
                      </span>
                    </span>
                  </div>
                ))
              ) : (
                <div className="li">
                  <span className="grow ls">{t('Aucun colis de ce paquet ne porte ce code.')}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {(p.kit.length > 0 || p.etiquettesPrevues) && <KitNecessaire p={p} />}

      <Note ton="ink" icone="info">
        {tf('Le paquet se fait en entier, ou il est rendu à {entreprise} avant le premier ramassage : il ne se découpe pas.', { entreprise: p.entreprise })}
      </Note>
      <div className="btns">
        <Btn kind="ghost" icone="file-down" onClick={() => void feuilleDeRoute()}>
          {t('Feuille de route en PDF')}
        </Btn>
      </div>
      {(aDemarrer || p.etat === 'en_cours') &&
        (p.telechargeA ? (
          <Hint icone="cloud-check">{tf('Disponible hors connexion · téléchargé à {h}', { h: heure(p.telechargeA, langue) })}</Hint>
        ) : (
          <div className="btns">
            <Btn
              kind="ghost"
              icone="cloud-download"
              off={!enLigne || telech}
              onClick={async () => {
                setTelech(true)
                await source.paquets.telecharger(p.id)
                setTelech(false)
                signal('succes')
              }}
            >
              {t('Télécharger pour le hors connexion')}
            </Btn>
          </div>
        ))}
    </>
  )
}

function Arret({ a }: { a: ArretPaquet }) {
  const { t, tf, langue } = usePreferences()
  const groupes = new Map<string, ColisDuPaquet[]>()
  for (const c of a.colis) {
    const k = c.classe + (c.fragile ? '|soin' : '') + '|' + c.format
    groupes.set(k, [...(groupes.get(k) ?? []), c])
  }
  const n = a.colis.length
  const details =
    a.type === 'relais'
      ? [n === 1 ? t('Dépôt de 1 colis') : tf('Dépôt des {n} colis', { n }), a.gerant ? tf('gérant {g}', { g: a.gerant }) : null, a.fermeA ? tf('ferme à {h}', { h: heure(a.fermeA, langue) }) : null, t('un seul scan du QR de dépôt')]
      : [t(VERBE[a.type]), a.zone, a.creneau ? tf('créneau annoncé {c}', { c: creneau(a.creneau, langue) }) : null, a.pretDepuis ? tf('prêt depuis {h}', { h: heure(a.pretDepuis, langue) }) : null]
  return (
    <div className={'stop' + (a.fait ? ' done' : '')}>
      <span className="sn">{a.fait ? <Icone nom="check" taille={15} trait={3} /> : a.ordre}</span>
      <span className="grow">
        <span className="st" style={{ display: 'block' }}>
          {t(a.nom)}
          {a.type !== 'relais' && a.quartier && a.nom !== a.quartier ? ' · ' + a.quartier : ''}
        </span>
        <span className="ss" style={{ display: 'block' }}>
          {[...details.filter(Boolean), tf('{m} min de trajet', { m: a.trajetMin })].join(' · ')}
        </span>
        {a.type !== 'relais' &&
          [...groupes.values()].map((g) => {
            const c = g[0]
            return (
              <div key={c.id} className="parcel">
                <span className="pc">{c.classe}</span>
                <span className="grow">
                  <span className="b8 t14" style={{ display: 'block' }}>
                    {g.length === 1 ? tf('1 colis {c}', { c: c.classe }) : tf('{n} colis {c}', { n: g.length, c: c.classe })}
                    {c.fragile ? ' · ' + t('avec soin') : ''}
                  </span>
                  <span className="t12 c3" style={{ display: 'block', marginTop: 1 }}>
                    {[c.fragile ? t('papier bulle') : null, t(nomFormat(c.format, 1))].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {c.fragile && <Icone nom="triangle-alert" taille={20} style={{ color: 'var(--amber)', flexShrink: 0 }} />}
              </div>
            )
          })}
      </span>
      {a.type === 'relais' && (
        <Pill ton="blue" sm>
          {t('Dépôt')}
        </Pill>
      )}
    </div>
  )
}

function KitNecessaire({ p }: { p: P }) {
  const { t, tf } = usePreferences()
  const ouvrir = useOuvrirFeuille()
  const manque = p.kit.filter((l) => l.manque > 0)
  return (
    <section aria-labelledby="l4-kitn">
      <div className="sec">
        <h2 id="l4-kitn">{t('Kit nécessaire')}</h2>
        <Link className="a" to={chemin('kit')} onClick={ouvrir(chemin('kit'))}>
          {t('Mon kit')}
          <Icone nom="chevron-right" taille={16} />
        </Link>
      </div>
      <div className="card">
        {p.kit.length > 0 && (
          <div role="table" aria-label={t('Kit nécessaire')}>
            <div className="liva-need h" role="row">
              <span role="columnheader">{t('Format')}</span>
              <span role="columnheader">{t('Il faut')}</span>
              <span role="columnheader">{t('Sur vous')}</span>
              <span className="st" role="columnheader">
                {t('État')}
              </span>
            </div>
            {p.kit.map((l) => (
              <div key={l.format} className={'liva-need' + (l.manque ? ' bad' : '')} role="row">
                <span className="fmt" role="rowheader" aria-label={t(nomFormat(l.format, 1))}>
                  {l.format === 'origine' ? t('Orig.') : l.format}
                </span>
                <span role="cell">
                  <b>{l.ilFaut}</b>
                </span>
                <span role="cell">
                  <b>{l.surVous}</b>
                </span>
                <span className="st" role="cell">
                  {l.manque ? (
                    <Pill ton="red" sm>
                      {tf('Manque {n}', { n: l.manque })}
                    </Pill>
                  ) : (
                    <Pill ton="green" sm icone="check">
                      {t('OK')}
                    </Pill>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
        {p.etiquettesPrevues && (
          <div className="row mt10" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Etiquette n={p.etiquettesPrevues.de} />
            <span className="t13 c3 b7">{t('à')}</span>
            <Etiquette n={p.etiquettesPrevues.a} />
          </div>
        )}
        {manque.length > 0 ? (
          <Note ton="red" icone="package-x">
            <b>{tf('Kit insuffisant : il manque {liste}.', { liste: manque.map((l) => `${l.manque} ${t(nomFormat(l.format, l.manque))}`).join(', ') })}</b> {tf('Passez au point de stockage de {entreprise} avant le premier ramassage ; sinon signalez « emballage manquant ». Jamais d’emballage improvisé.', { entreprise: p.entreprise })}
          </Note>
        ) : (
          <Note ton="green" icone="package-check">
            <b>{t('Kit suffisant')}</b> · {t('chaque format nécessaire est sur vous.')}
          </Note>
        )}
      </div>
    </section>
  )
}

function Actions({ p }: { p: P }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const naviguer = useNavigate()
  const [msg, setMsg] = useState<{ ton: 'red' | 'acc'; texte: string } | null>(null)
  const [occupe, setOccupe] = useState(false)
  const kit = useLecture(() => source.kit.lire(), [p.id])
  const reassort = kit.donnees?.reassort
  const manque = Object.fromEntries(p.kit.filter((l) => l.manque > 0 && l.format !== 'origine').map((l) => [l.format, l.manque])) as Partial<Record<FormatKit, number>>
  const demarrer = async () => {
    setOccupe(true)
    const o = origine(s.maintenant)
    if (p.changements) await source.paquets.marquerRelu(p.id, p.version)
    // Sans réseau, le départ est appliqué au téléphone et part en file avec sa charge et son heure (LIV-04-R30).
    const { r } = await geste(enLigne, 'depart', p.id, o, (x) => x.paquets.demarrer(p.id, o), true)
    setOccupe(false)
    if (r.ok) {
      signal('depart')
      return naviguer(chemin('tournee'))
    }
    signal('erreur')
    setMsg({
      ton: 'red',
      texte: {
        kit_insuffisant: t('Kit insuffisant : demandez un réassort ou signalez l’emballage manquant.'),
        deja_demarre: t('Ce paquet est déjà démarré.'),
        a_relire: t('Le paquet a changé : relisez-le avant de démarrer.'),
        autre_paquet_avant: t('Un autre paquet a une heure limite plus tôt : faites-le d’abord.'),
        bloque: t('Paquet bloqué : il est renvoyé à votre entreprise.'),
        retire: t('Ce paquet vous a été retiré.'),
      }[r.raison],
    })
  }
  const demanderReassort = async () => {
    const o = origine(s.maintenant)
    const { r } = await geste(enLigne, 'kit', 'reassort', o, (x) => x.kit.demanderReassort(manque, p.id, o), true)
    if (r.ok) {
      signal('succes')
      setMsg({ ton: 'acc', texte: tf('Réassort demandé : {entreprise} est prévenue.', { entreprise: p.entreprise }) })
    } else setMsg({ ton: 'acc', texte: t('Réassort déjà demandé pour ce paquet.') })
  }
  const ouvrir = useOuvrirFeuille()
  const aDemarrer = p.etat === 'affecte' || p.etat === 'modifie'
  const jeNePeuxPas = aDemarrer || p.etat === 'en_cours' || p.etat === 'bloque'
  return (
    <BarreAction className="l4-cta">
      {msg && (
        <Note ton={msg.ton} icone={msg.ton === 'red' ? 'circle-alert' : 'circle-check'} role={msg.ton === 'red' ? 'alert' : 'status'}>
          {msg.texte}
        </Note>
      )}
      {aDemarrer && !enLigne && <Hint icone="wifi-off">{t('Sans réseau, vous pouvez démarrer : le départ est mis en file avec son heure et part au retour du réseau.')}</Hint>}
      {aDemarrer && p.avant && <Hint icone="clock">{tf('À démarrer après {id} : son heure limite est plus tôt.', { id: p.avant })}</Hint>}
      {aDemarrer && !p.kitCouvert ? (
        <>
          {reassort && reassort.paquetId === p.id ? (
            <Hint icone="package-plus">{tf('Réassort demandé à {h} · en attente de {entreprise}.', { h: heure(reassort.demandeLe, langue), entreprise: p.entreprise })}</Hint>
          ) : (
            <Btn kind="primary" icone="phone" cls="xl" onClick={() => void demanderReassort()}>
              {tf('Prévenir {entreprise} · réassort', { entreprise: p.entreprise })}
            </Btn>
          )}
          <Btn kind="danger" icone="package-x" vers={chemin('incident', { type: 'emballage_manquant', paquet: p.id })}>
            {t('Signaler « emballage manquant »')}
          </Btn>
        </>
      ) : aDemarrer ? (
        <Btn kind="primary" icone="navigation" cls="xl" off={occupe || !!p.avant} onClick={() => void demarrer()}>
          {p.changements ? t('J’ai relu, démarrer la tournée') : t('Démarrer la tournée')}
        </Btn>
      ) : p.etat === 'en_cours' ? (
        <Btn kind="primary" icone="navigation" cls="xl" vers={chemin('tournee')}>
          {t('Reprendre la tournée')}
        </Btn>
      ) : (
        <Btn kind="secondary" vers={chemin(p.etat === 'termine' || p.etat === 'clos' ? 'historique' : 'aujourdhui')}>
          {p.etat === 'termine' || p.etat === 'clos' ? t('Voir dans l’historique') : t('Retour à ma journée')}
        </Btn>
      )}
      {jeNePeuxPas && (aDemarrer ? p.kitCouvert : true) && (
        <Btn kind="danger" icone="hand" vers={chemin('statut', { paquet: p.id })} onClick={ouvrir(chemin('statut', { paquet: p.id }))}>
          {t('Je ne peux pas faire ce paquet')}
        </Btn>
      )}
    </BarreAction>
  )
}

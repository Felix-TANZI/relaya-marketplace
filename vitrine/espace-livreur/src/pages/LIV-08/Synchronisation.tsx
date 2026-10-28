// LIV-P22 · Synchronisation (LIV-08-R35 à R47, LIV-P22R-01 à R04, LIV-RG-R177 à R181, DED-20).
// Repris sur le prototype (route « synchronisation ») : bandeau hors connexion, héros d'état (en ligne · tout est
// envoyé, file non vide, envoi en cours, panne annoncée par BelivaY, élément expiré, écart avec le serveur) avec ses
// trois chiffres (livc-hm), file en livc-q (heure d'origine, poids, échéance), « Synchroniser maintenant », envois du
// jour par heure et par type, « Comment l'application travaille sans réseau », photos et heure du téléphone, pied.
// Règles : la file part dans l'ordre chronologique ; un élément non envoyé après LIV-FILE-EXPIRATION-H expire, reste
// signalé et n'est jamais effacé (« Réessayer l'envoi ») ; l'écart avec le serveur : la version du serveur l'emporte ;
// la panne annoncée est citée mot pour mot. Aucune action « vider » ni « supprimer ». Hors connexion, cet écran
// remplace le bandeau commun ([data-hors-ligne]).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { envoyerLaFile, useEnLigne } from '../../donnees/fileHorsLigne'
import type { ActionEnFile, TypeAction } from '../../donnees/domaines/horsligne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, echeance, heure } from '../../i18n/temps'
import { jourDe } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { Foot, HorsConnexion, Kv, Li, Lvp, Note, Pill, Sec } from '../../composants/proto'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture, FeuilleAppel, HeroProto, IcTeinte, useAppel, useBattement, useMaintenant } from './commun'
import './liv08.css'

const TYPES: Record<TypeAction, [string, string]> = {
  disponibilite: ['Changement de statut', 'circle-pause'],
  arrivee: ['Arrivée à un arrêt', 'map-pin-check'],
  etiquette: ['Étiquette liée et photos', 'tag'],
  code_remise: ['Code de remise', 'key-round'],
  refus: ['Refus au ramassage', 'package-x'],
  depot: ['Dépôt au relais', 'warehouse'],
  domicile: ['Remise à domicile', 'home'],
  echec: ['Échec de remise', 'circle-x'],
  incident: ['Incident', 'triangle-alert'],
  cloture: ['Clôture de journée', 'calendar-check'],
  message: ['Message', 'message-circle'],
  contestation: ['Contestation Trust Score', 'award'],
  absence: ['Absence prévenue', 'calendar-x'],
  stockage: ['Dépôt au point de stockage', 'warehouse'],
  preference: ['Préférence du compte', 'settings'],
  depart: ['Départ d’un paquet', 'navigation'],
  kit: ['Déclaration du kit', 'package-open'],
  paquet_rendu: ['Paquet rendu à l’entreprise', 'undo-2'],
  controle: ['Contrôle d’un colis', 'clipboard-check'],
  audit: ['Contrôle approfondi', 'list-checks'],
  emballage: ['Emballage et scellé', 'package-check'],
  photo: ['Photo de preuve', 'camera'],
  collecte: ['Collecte au relais', 'boxes'],
  retour: ['Retour au vendeur', 'rotate-ccw'],
  appel: ['Appel masqué', 'phone-call'],
  route: ['Route signalée', 'route'],
}
/** Preuves d'un colis sous garde : jamais retenues pour le Wi-Fi (LIV-P31R-03). */
const GARDE = new Set<TypeAction>(['arrivee', 'etiquette', 'code_remise', 'refus', 'depot', 'domicile', 'echec', 'incident', 'stockage', 'controle', 'audit', 'emballage', 'photo', 'collecte', 'retour'])
const COULEURS = ['var(--acc)', 'var(--or)', 'var(--gold)', 'var(--blue)', 'var(--acc-2)', 'var(--ink-4)']

/** livc_hm : trois chiffres dans le héros. */
function Chiffres({ items }: { items: [number | string, string][] }) {
  return (
    <div className="livc-hm">
      {items.map(([v, l], i) => (
        <div key={i}>
          <b>{v}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  )
}

export default function Synchronisation() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const entreprise = s.livreur?.entreprise ?? ''
  const naviguer = useNavigate()
  const en = useEnLigne()
  const m = useMaintenant()
  const battement = useBattement(15_000)
  const f = useLecture(() => source.horsligne.file(), [battement])
  const r = useLecture(() => source.horsligne.regles(), [])
  const pref = useLecture(() => source.moi.preferences(), [])
  const appel = useAppel()
  const [envoi, setEnvoi] = useState<{ total: number } | null>(null)
  const [bilan, setBilan] = useState<string | null>(null)
  if (f.erreur)
    return (
      <Ecran proto route="synchronisation">
        <ErreurLecture relire={f.relire} />
      </Ecran>
    )
  if (!f.donnees || !r.donnees)
    return (
      <Ecran proto route="synchronisation">
        <Chargement />
      </Ecran>
    )
  const file = f.donnees
  const regles = r.donnees
  const t0 = m()
  const expiree = (a: ActionEnFile) => a.etat === 'en_attente' && a.expireA !== undefined && t0 >= a.expireA
  const attente = file.actions.filter((a) => a.etat === 'en_attente' && !expiree(a)).sort((a, b) => a.origine.heure - b.origine.heure)
  const expirees = file.actions.filter(expiree)
  const refusees = file.actions.filter((a) => a.etat === 'refusee')
  const auj = jourDe(t0)
  const envoyees = file.actions.filter((a) => a.etat !== 'en_attente' && a.recu && jourDe(a.recu) === auj).sort((a, b) => (b.recu ?? 0) - (a.recu ?? 0))
  const photos = attente.reduce((n, a) => n + (a.photos ?? 0), 0)
  const conflits = file.conflits.filter((c) => !c.vu)
  const plusAncienne = attente.find((a) => a.expireA !== undefined)
  const ecartHorloge = file.ecartHorlogeMin > regles.ecartHorlogeMaxH * 60

  const synchroniser = async () => {
    setBilan(null)
    setEnvoi({ total: attente.length })
    const b = await envoyerLaFile()
    setEnvoi(null)
    if (b)
      setBilan(
        b.refusees
          ? tf('{n} envoyés · {r} refusés par le serveur', {
              n: b.envoyees,
              r: b.refusees,
            })
          : tf('{n} éléments envoyés, dans l’ordre', { n: b.envoyees }),
      )
    else signal('erreur')
  }
  const relancer = async () => {
    let ok = true
    for (const a of expirees) ok = (await source.horsligne.relancer(a.origine.cle)).ok && ok
    signal(ok ? 'succes' : 'erreur')
    f.relire()
  }
  // Relancer un seul geste (M8) : il repart avec sa clé, son heure et sa position d'origine.
  const relancerUn = async (cle: string) => {
    const ok = (await source.horsligne.relancer(cle)).ok
    signal(ok ? 'succes' : 'erreur')
    setBilan(ok ? t('Geste relancé : il repart avec son heure et sa position d’origine.') : t('Le serveur refuse encore ce geste : votre entreprise est prévenue.'))
    f.relire()
  }

  // Graphiques du jour : par heure (de la première heure de service jusqu'à maintenant), par type.
  const hNow = new Date(t0 + 3600_000).getUTCHours()
  const parHeure = new Map<number, number>()
  for (const a of envoyees) {
    const hh = new Date((a.recu ?? 0) + 3600_000).getUTCHours()
    parHeure.set(hh, (parHeure.get(hh) ?? 0) + 1)
  }
  const h0 = Math.min(hNow, ...parHeure.keys())
  const heures = Array.from({ length: hNow - h0 + 1 }, (_, i) => h0 + i)
  const maxH = Math.max(1, ...parHeure.values())
  const parType = new Map<TypeAction, number>()
  for (const a of envoyees) parType.set(a.type, (parType.get(a.type) ?? 0) + 1)
  const types = [...parType.entries()].sort((a, b) => b[1] - a[1])
  let cumul = 0
  const anneau = types.map(([, n], i) => {
    const de = (cumul / Math.max(1, envoyees.length)) * 360
    cumul += n
    return `${COULEURS[i % COULEURS.length]} ${de}deg ${(cumul / Math.max(1, envoyees.length)) * 360}deg`
  })
  const chiffres: [number | string, string][] = [
    [envoyees.length, t('envoyés aujourd’hui')],
    [attente.length, t('en attente')],
    [expirees.length, t(expirees.length > 1 ? 'expirés' : 'expiré')],
  ]

  // Héros : un seul, selon ce qui compte le plus (expiré, écart, envoi, hors connexion, en attente, tout envoyé).
  const conflit = conflits[0]
  const heros = expirees.length ? (
    <HeroProto
      ton="red"
      role="alert"
      hk={t('Preuve jamais synchronisée')}
      ht={expirees.length > 1 ? tf('{n} éléments ont expiré', { n: expirees.length }) : t('1 élément a expiré')}
      hs={
        <>
          {tf('Non envoyé en {h} heures.', { h: regles.expirationH })}{' '}
          <b>
            {tf('{entreprise} et la console BelivaY sont alertées.', {
              entreprise,
            })}
          </b>{' '}
          {t('Il reste dans la file, signalé : il n’est jamais effacé.')}
        </>
      }
    />
  ) : conflit ? (
    <HeroProto
      ton="amber"
      hk={
        file.dernierEnvoi
          ? tf('{n} éléments envoyés à {h} · {e} écart', {
              n: file.dernierEnvoi.envoyees,
              h: heure(file.dernierEnvoi.a, langue),
              e: conflits.length,
            })
          : tf('{e} écart avec le serveur', { e: conflits.length })
      }
      ht={t('La version du serveur l’emporte')}
      hs={t('Vos preuves sont gardées et rattachées à l’arrêt avec leur heure d’origine ; l’écart est signalé à votre entreprise.')}
    />
  ) : envoi ? (
    <HeroProto ton="acc">
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="hk">{t('Synchronisation en cours')}</span>
        <Pill ton="dk" icone="wifi">
          {t('Réseau revenu')}
        </Pill>
      </div>
      <div className="livc-big">
        {envoi.total}
        <small>{t('éléments en cours d’envoi')}</small>
      </div>
      <div className="mt10 bar l8-indefini" role="progressbar" aria-label={t('Envoi en cours')}>
        <i></i>
      </div>
      <div className="hs">{t('Ordre chronologique, photos d’abord. Vous pouvez continuer à travailler pendant l’envoi.')}</div>
    </HeroProto>
  ) : !en ? (
    <HeroProto
      ton="night"
      hk={
        file.horsLigneDepuis !== null
          ? tf('File d’envoi · depuis {h}', {
              h: heure(file.horsLigneDepuis, langue),
            })
          : t('File d’envoi')
      }
    >
      <div className="livc-big">
        {attente.length}
        <small>{t(attente.length > 1 ? 'éléments en attente' : 'élément en attente')}</small>
      </div>
      <div className="hs">
        {t('Chaque preuve garde son heure et sa position d’origine.')}
        {plusAncienne?.expireA !== undefined &&
          ' ' +
            tf('Il reste {d} avant que la plus ancienne n’expire.', {
              d: duree(plusAncienne.expireA - t0, langue),
            })}
      </div>
      <Chiffres
        items={[
          [photos, t('photos')],
          [attente.length - attente.filter((a) => a.photos).length, t('autres gestes')],
          [expirees.length, t('expiré')],
        ]}
      />
    </HeroProto>
  ) : attente.length > 0 ? (
    <HeroProto ton="amber" hk={t('En attente')}>
      <div className="livc-big">
        {attente.length}
        <small>{t('éléments à envoyer')}</small>
      </div>
      <div className="hs">{t('Le réseau est là : envoyez-les maintenant.')}</div>
      <Chiffres items={chiffres} />
    </HeroProto>
  ) : (
    <HeroProto ton="acc">
      <div className="row" style={{ gap: 12 }}>
        <span className="ico-b">
          <Icone nom="cloud-check" taille={24} />
        </span>
        <div className="grow">
          <div className="hk">{t('En ligne')}</div>
          <div className="ht" style={{ marginTop: 2 }}>
            {t('Tout est envoyé')}
          </div>
        </div>
      </div>
      <div className="hs">{file.dernierEnvoi ? tf('Dernière synchronisation à {h} · aucune preuve en attente d’envoi.', { h: heure(file.dernierEnvoi.a, langue) }) : t('Rien n’attend sur ce téléphone.')}</div>
      <Chiffres items={chiffres} />
    </HeroProto>
  )

  // « Synchroniser maintenant » : sous la file quand elle n'est pas vide, sinon en bas de page (prototype).
  const actions = (
    <>
      <div className="btns" style={{ marginTop: 14 }}>
        <button type="button" className={'btn ' + (attente.length > 0 ? 'primary xl' : 'secondary')} disabled={!en || !!envoi || attente.length === 0} onClick={() => void synchroniser()}>
          <Icone nom="refresh-cw" taille={18} />
          <span>{t('Synchroniser maintenant')}</span>
        </button>
      </div>
      {!en ? <p className="hint center">{t('Le réseau n’est pas revenu : la file partira toute seule.')}</p> : attente.length === 0 ? <p className="hint center">{t('Rien à envoyer.')}</p> : null}
      <div className="btns">
        <Link className="btn secondary" to={chemin('tournee')}>
          <Icone nom="navigation" taille={18} />
          <span>{t('Continuer la tournée')}</span>
        </Link>
      </div>
    </>
  )

  return (
    <Ecran proto route="synchronisation" fixes={<FeuilleAppel a={appel} />}>
      <Lvp className="l8">
        {!en && (
          <HorsConnexion>
            <b>{t('Hors connexion')}</b> ·{' '}
            {attente.length === 1
              ? t('1 élément en attente d’envoi. La tournée continue : tout part au retour du réseau.')
              : attente.length > 0
                ? tf('{n} éléments en attente d’envoi. La tournée continue : tout part au retour du réseau.', { n: attente.length })
                : t('La tournée continue : tout part au retour du réseau.')}
          </HorsConnexion>
        )}
        {file.annonce && (
          <HeroProto
            ton="red"
            hk={tf('Message de BelivaY · {ref}', {
              ref: file.annonce.reference,
            })}
          >
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
              <Pill ton="dk" icone="bell-ring">
                {tf('Reçu à {h}', { h: heure(file.annonce.recue, langue) })}
              </Pill>
            </div>
            <div className="ht" lang="fr">
              « {file.annonce.texte} »
            </div>
            <div className="hs">{t('Vos preuves partiront avec leur heure et leur position d’origine.')}</div>
          </HeroProto>
        )}
        {heros}
        {bilan && (
          <Note ton="green" icone="check-check" role="status">
            {bilan}
          </Note>
        )}

        {expirees.length > 0 && (
          <>
            <Sec titre={t(expirees.length > 1 ? 'Éléments expirés' : 'Élément expiré')} />
            {expirees.map((a) => (
              <div key={a.origine.cle} className="livc-q exp">
                <IcTeinte nom={TYPES[a.type][1]} ton="red" taille={44} />
                <div className="grow">
                  <div className="qt">
                    {t(TYPES[a.type][0])} · {a.objet}
                  </div>
                  <div className="qs">
                    {tf('Créé {quand}', {
                      quand: echeance(a.origine.heure, t0, langue),
                    })}
                  </div>
                  <div className="qm">
                    <Pill ton="red" sm icone="circle-alert">
                      {tf('Expiré {quand}', {
                        quand: echeance(a.expireA ?? t0, t0, langue),
                      })}
                    </Pill>
                  </div>
                </div>
                <button type="button" className="btn secondary sm" disabled={!en} onClick={() => void relancerUn(a.origine.cle)} aria-label={t('Relancer ce geste') + ' · ' + t(TYPES[a.type][0]) + ' · ' + a.objet}>
                  <Icone nom="rotate-ccw" taille={16} />
                  <span>{t('Relancer')}</span>
                </button>
              </div>
            ))}
            <div className="card" style={{ marginTop: 12 }}>
              <div className="kick">{t('Ce que cela change')}</div>
              <Li
                icone="scale"
                ton="amber"
                t={t('Règle de la preuve absente')}
                s={tf('La responsabilité suit l’acteur qui devait produire la preuve. Un écart de kit se règle entre BelivaY et {entreprise} : vous ne payez jamais un emballage.', { entreprise })}
              />
              <Li icone="gauge" ton="or" t={t('Trust Score')} s={t('Un événement « preuve jamais synchronisée » (Qualité) peut être créé ; vous pourrez le contester une fois.')} />
              <Li
                icone="bell-ring"
                ton="acc"
                t={t('Alertes envoyées')}
                s={tf('{entreprise} (portail) et la console BelivaY', {
                  entreprise,
                })}
              />
            </div>
            <div className="btns" style={{ marginTop: 14 }}>
              <button type="button" className="btn primary xl" onClick={() => void appel.appeler('entreprise')}>
                <Icone nom="phone" taille={18} />
                <span>{tf('Appeler {entreprise}', { entreprise })}</span>
              </button>
            </div>
            <div className="btns">
              <button type="button" className="btn secondary" disabled={!en} onClick={() => void relancer()}>
                <Icone nom="refresh-cw" taille={18} />
                <span>{t('Réessayer l’envoi')}</span>
              </button>
            </div>
          </>
        )}

        {conflits.map((c) => (
          <div key={c.objet}>
            <Sec titre={t('Ce qui a changé')} />
            <div className="card">
              <div className="split2">
                <div>
                  <div className="kick">{t('Sur votre téléphone')}</div>
                  <div className="b8 t15 mt6">{c.surLeTelephone}</div>
                </div>
                <div>
                  <div className="kick acc">{t('Sur le serveur')}</div>
                  <div className="b8 t15 mt6">{c.surLeServeur}</div>
                  <div className="t13 c3 mt4">{tf('À {h}', { h: heure(c.a, langue) })}</div>
                </div>
              </div>
              <div className="hr"></div>
              <Li icone="paperclip" ton="green" t={t('Vos preuves sont conservées')} s={t('Rattachées au dossier de l’arrêt, avec leur heure d’origine')} />
              <Li
                icone="flag"
                ton="amber"
                t={t('Écart signalé')}
                s={tf('À {entreprise} et à la console, pour mémoire', {
                  entreprise,
                })}
              />
            </div>
            <div className="btns" style={{ marginTop: 14 }}>
              <button type="button" className="btn primary xl" onClick={() => void source.horsligne.conflitVu(c.objet).then(() => naviguer(chemin('tournee')))}>
                <Icone nom="navigation" taille={18} />
                <span>{t('Suivre la tournée à jour')}</span>
              </button>
            </div>
          </div>
        ))}

        {attente.length > 0 && (
          <>
            <Sec titre={t('En attente d’envoi')} droite={t('dans l’ordre')} />
            <div className="card tight">
              {attente.map((a) => (
                <LigneFile key={a.origine.cle} a={a} wifi={pref.donnees?.envoiPhotos === 'wifi'} wifiMaxH={regles.wifiAttenteMaxH} />
              ))}
            </div>
          </>
        )}
        {refusees.length > 0 && (
          <Note ton="red" icone="circle-x">
            <b>{t('Refusés par le serveur')}</b> · {refusees.map((a) => `${t(TYPES[a.type][0])} · ${a.objet}${a.motif ? ' : « ' + a.motif + ' »' : ''}`).join(' ; ')}
          </Note>
        )}

        {attente.length > 0 && actions}
        {attente.length > 0 && (
          <>
            <Note ton="red" icone="triangle-alert">
              <b>{t('Ne désinstallez pas l’application et ne changez pas l’heure du téléphone.')}</b>{' '}
              {t('La file est chiffrée sur ce téléphone ; la désinstallation est bloquée par un avertissement tant qu’elle n’est pas vide.')}
            </Note>
            <Note ton="ink" icone="power">
              {t('Téléphone éteint ou batterie vide : la file est conservée et repart au redémarrage.')}
            </Note>
          </>
        )}

        {envoyees.length > 0 && (
          <>
            <Sec titre={t('Envoyés aujourd’hui, par heure')} />
            <div className="card">
              <div className="l8-barres" role="img" aria-label={t('Envoyés aujourd’hui, par heure')}>
                {heures.map((hh) => (
                  <div key={hh} className={hh === hNow ? 'maintenant' : ''}>
                    <em>{parHeure.get(hh) ?? 0}</em>
                    <i
                      style={{
                        height: `${((parHeure.get(hh) ?? 0) / maxH) * 100}%`,
                      }}
                    ></i>
                    <span>{tf('{h} h', { h: hh })}</span>
                  </div>
                ))}
              </div>
            </div>
            <Sec titre={t('Par type')} />
            <div className="card">
              <div className="row" style={{ gap: 16 }}>
                <div className="lc-anneau" style={{ background: `conic-gradient(${anneau.join(',')})` }} aria-hidden="true">
                  <b>{envoyees.length}</b>
                </div>
                <div className="grow">
                  {types.map(([ty, n], i) => (
                    <Kv
                      key={ty}
                      k={
                        <>
                          <i
                            className="l8-puce"
                            style={{
                              background: COULEURS[i % COULEURS.length],
                            }}
                          ></i>
                          {t(TYPES[ty][0])}
                        </>
                      }
                      v={n}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Sec titre={t('Derniers envois')} />
            <div className="card tight">
              {envoyees.slice(0, 5).map((a) => (
                <div key={a.origine.cle} className="livc-q">
                  <IcTeinte nom={TYPES[a.type][1]} ton={a.etat === 'refusee' ? 'red' : 'green'} taille={44} />
                  <div className="grow">
                    <div className="qt">
                      {t(TYPES[a.type][0])} · {a.objet}
                    </div>
                    <div className="qm">
                      <Pill ton={a.etat === 'refusee' ? 'red' : 'green'} sm icone={a.etat === 'refusee' ? 'x' : 'check'}>
                        {t(a.etat === 'refusee' ? 'Refusé' : 'Envoyé')}
                      </Pill>
                      <span className="livc-tag">
                        {tf('Serveur {s} · origine {o}', {
                          s: heure(a.recu ?? 0, langue),
                          o: heure(a.origine.heure, langue),
                        })}
                        {a.tardif ? ' · ' + t('reçu après expiration') : ''}
                        {(a.recu ?? 0) - a.origine.heure > regles.ecartHorlogeMaxH * 3600_000 ? ' · ' + t('écart signalé') : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Sec titre={t('Comment l’application travaille sans réseau')} />
        <div className="card tight">
          <Li icone="download" ton="acc" t={t('Tout est téléchargé à l’avance')} s={t('Tournées, cartes et consignes, avant le départ')} />
          <Li icone="list-ordered" ton="blue" t={t('Envoi dans l’ordre')} s={t('Chronologique ; les photos passent avant les statistiques')} />
          <Li icone="lock-keyhole" ton="night" t={t('File chiffrée sur ce téléphone')} s={t('Désinstallation bloquée par un avertissement tant qu’elle n’est pas vide')} />
          <Li
            icone="hourglass"
            ton="amber"
            t={tf('{h} heures au plus', { h: regles.expirationH })}
            s={tf('Au-delà, l’élément est signalé expiré à {entreprise} et à la console, jamais effacé', { entreprise })}
          />
        </div>
        <div className="card tight">
          <Li
            vers={chemin('reglages')}
            icone="image"
            ton="or"
            t={t(pref.donnees?.envoiPhotos === 'wifi' ? 'Photos : Wi-Fi seulement' : 'Photos : envoi immédiat')}
            s={tf('« Wi-Fi seulement » attend {h} h au plus, jamais pour une preuve de colis sous garde', { h: regles.wifiAttenteMaxH })}
          />
          <Li
            icone="clock"
            ton={ecartHorloge ? 'red' : 'ink'}
            t={t('Heure du téléphone : automatique')}
            s={
              ecartHorloge
                ? tf('Écart de plus de {h} h avec le serveur : remettez l’heure automatique.', { h: regles.ecartHorlogeMaxH })
                : tf('Ne la changez jamais : un écart de plus de {h} h avec le serveur est signalé', { h: regles.ecartHorlogeMaxH })
            }
          />
        </div>
        {attente.length === 0 && actions}
        <Foot icone={en ? 'wifi' : 'wifi-off'}>
          {en
            ? attente.length > 0
              ? attente.length === 1
                ? t('Connecté · 1 élément en attente d’envoi')
                : tf('Connecté · {n} éléments en attente d’envoi', {
                    n: attente.length,
                  })
              : expirees.length
                ? tf('Connecté · {e} expiré(s), 0 en attente', { e: expirees.length })
                : t('Connecté · aucune preuve en attente d’envoi')
            : file.dernierEnvoi
              ? tf('Hors connexion · dernière synchronisation à {h}', {
                  h: heure(file.dernierEnvoi.a, langue),
                })
              : t('Hors connexion')}
        </Foot>
      </Lvp>
    </Ecran>
  )
}

/** Un élément de la file (livc_q) : type et objet, heure et position d'origine, poids, échéance. */
function LigneFile({ a, wifi, wifiMaxH }: { a: ActionEnFile; wifi: boolean; wifiMaxH: number }) {
  const { t, tf, langue } = usePreferences()
  const m = useMaintenant()
  const attendWifi = wifi && (a.photos ?? 0) > 0 && !GARDE.has(a.type)
  return (
    <div className="livc-q">
      <IcTeinte nom={TYPES[a.type][1]} ton="green" taille={44} />
      <div className="grow">
        <div className="qt">
          {t(TYPES[a.type][0])} · {a.objet}
        </div>
        <div className="qs">
          {tf('Origine {h}', { h: heure(a.origine.heure, langue) })}
          {a.origine.position ? ' · ' + (a.origine.position.precisionM !== null ? tf('position ± {m} m', { m: a.origine.position.precisionM }) : t('position jointe')) : ' · ' + t('sans position')}
          {a.photos ? ' · ' + (a.photos > 1 ? tf('{n} photos', { n: a.photos }) : t('1 photo')) : ''}
          {a.poidsKo ? ' · ' + tf('{ko} Ko', { ko: a.poidsKo }) : ''}
        </div>
        <div className="qm">
          <Pill ton="amber" sm point>
            {t('En attente')}
          </Pill>
          <span className="livc-tag">
            <Icone nom="hourglass" taille={12} />
            {attendWifi
              ? tf('Attend le Wi-Fi, au plus tard {quand}', {
                  quand: echeance(a.origine.heure + wifiMaxH * 3600_000, m(), langue),
                })
              : a.expireA
                ? tf('Expire {quand}', {
                    quand: echeance(a.expireA, m(), langue),
                  })
                : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

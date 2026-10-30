// LIV-P23 · Clôture de journée (LIV-08-R05, R49 à R57, LIV-P23R-01 à R05, LIV-JOU-01/02, DED-26).
// Repris sur le prototype (route « cloture ») et ses quatre états :
// - contrôles, clôture impossible : héros rouge, « Ce qui bloque » (cases C.check calculées par le serveur, la solution
//   sous la case rouge : reprendre la tournée, ou déposer au point de stockage après la dernière tournée), « Déjà fait
//   aujourd'hui » en frise, note du point de stockage, barre du bas (bouton grisé et son explication) ;
// - prête : héros orange (proposée à LIV-CLOTURE-PROPOSEE-H), « Contrôles », « Bilan de la journée » (9 tuiles
//   livc-bil), frise, « Kit restant par format » (tableau livc-kit : reçu, utilisé, attendu = reçu − étiquettes liées,
//   compté ; tout écart demande un motif, une photo pour une pochette abîmée), note « le bilan part à … » ;
// - hors connexion : bandeau, contrôles (la file ne bloque pas), bilan ; la clôture part avec la file ;
// - clôturée : héros d'accent, trois chiffres, bilan reçu, statut hors service, prochain jour de service.
// Contrôles jamais déclaratifs ; seule la garde bloque (LIV-08-R05) ; aucun colis ne passe la nuit chez un livreur ;
// un écart de kit s'explique, il ne se paie jamais. Pas de barre d'onglets pendant la clôture (routes.ts).
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { useEnLigne } from '../../donnees/fileHorsLigne'
import type { ComptageKit, ControleCloture, FormatKit, MotifEcart } from '../../donnees/domaines/journee'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, heure, jourLong } from '../../i18n/temps'
import { Ecran } from '../../composants/coque'
import { exporterPdf } from '../../composants/livraison/enrichi'
import { BarreAction, Coche, Foot, Hint, HorsConnexion, Li, Lvp, Note, Pill, Sec } from '../../composants/proto'
import { usePreferences } from '../../preferences'
import { useRelireSession, useSession } from '../../session'
import { ChampPhotos, Chargement, ErreurLecture, Frise, HeroProto, useBattement, useMaintenant, useOrigine, type PhotoPrise } from './commun'
import './liv08.css'

const MOTIFS: [MotifEcart, string][] = [
  ['pochette_abimee', 'Pochette abîmée'],
  ['perdue', 'Perdue'],
  ['rendue_entreprise', 'Rendue à l’entreprise'],
  ['autre', 'Autre'],
]
const NOMS_KIT: Record<FormatKit, string> = { S: 'Pochettes S', M: 'Pochettes M', L: 'Pochettes L', C1: 'Cartons C1', C2: 'Cartons C2' }

/** Case du prototype (C.check) avec un titre et un détail. */
function Controle({ etat, titre, detail }: { etat: 'on' | 'bad' | 'wait'; titre: ReactNode; detail?: ReactNode }) {
  const corps = (
    <>
      <b>{titre}</b>
      {detail && (
        <>
          <br />
          <span className="t13 c3">{detail}</span>
        </>
      )}
    </>
  )
  if (etat === 'wait')
    return (
      <div className="check">
        <span className="cbx l8-cbx-wait">
          <Icone nom="hourglass" taille={13} trait={2.6} />
        </span>
        <span className="grow">{corps}</span>
      </div>
    )
  return (
    <Coche on={etat === 'on'} bad={etat === 'bad'}>
      {corps}
    </Coche>
  )
}

export default function Cloture() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const relireSession = useRelireSession()
  const en = useEnLigne()
  const m = useMaintenant()
  const o = useOrigine()
  const battement = useBattement(30_000)
  const c = useLecture(() => source.journee.controle(), [battement])
  const regles = useLecture(() => source.horsligne.regles(), [])
  const [comptes, setComptes] = useState<Partial<Record<FormatKit, number>>>({})
  const [motifs, setMotifs] = useState<Partial<Record<FormatKit, MotifEcart>>>({})
  const [photos, setPhotos] = useState<Partial<Record<FormatKit, PhotoPrise[]>>>({})
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [juste, setJuste] = useState(false) // vient d'être clôturée : confettis (M9), une fois
  const confirmer = useFeuille('cloturer')
  const stockage = useFeuille('stockage')
  if (c.erreur)
    return (
      <Ecran proto route="cloture">
        <ErreurLecture relire={c.relire} />
      </Ecran>
    )
  if (!c.donnees)
    return (
      <Ecran proto route="cloture">
        <Chargement lignes={3} />
      </Ecran>
    )
  const d: ControleCloture = c.donnees
  const prenom = s.livreur?.prenom ?? ''
  const garde = d.controles.find((x) => x.id === 'garde')!
  const file = d.controles.find((x) => x.id === 'file')!
  const retours = d.controles.find((x) => x.id === 'retours')!
  const compte = (f: FormatKit, attendu: number) => comptes[f] ?? attendu
  const ecarts = d.kit.filter((l) => compte(l.format, l.attendu) !== l.attendu)
  const manqueMotif = ecarts.find((l) => !motifs[l.format])
  const manquePhoto = ecarts.find((l) => motifs[l.format] === 'pochette_abimee' && !(photos[l.format]?.length ?? 0))
  const raison =
    d.etat !== 'ouverte'
      ? null
      : !d.possible
        ? t('Le bouton s’active quand plus aucun colis n’est sur vous.')
        : manqueMotif
          ? tf('Expliquez l’écart sur : {f}.', { f: t(NOMS_KIT[manqueMotif.format]) })
          : manquePhoto
            ? t('Photographiez la pochette abîmée.')
            : null
  const quand = tf('{jour} · {h}', { jour: jourLong(m(), langue), h: heure(m(), langue) })
  const km = d.bilan.km.toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const cloturer = async () => {
    setOccupe(true)
    setErreur(null)
    const kit: ComptageKit[] = d.kit.map((l) => ({
      format: l.format,
      compte: compte(l.format, l.attendu),
      motif: compte(l.format, l.attendu) !== l.attendu ? (motifs[l.format] ?? null) : null,
      photo: (photos[l.format]?.length ?? 0) > 0,
    }))
    const r = await source.journee.cloturer(kit, o(), en)
    setOccupe(false)
    confirmer.fermer()
    if (!r.ok) {
      setErreur(
        r.raison === 'blocages'
          ? 'Un colis est encore sous votre garde.'
          : r.raison === 'ecart_sans_motif'
            ? 'Expliquez chaque écart de kit.'
            : r.raison === 'photo_manquante'
              ? 'Photographiez la pochette abîmée.'
              : 'La journée est déjà clôturée.',
      )
      signal('erreur')
      return
    }
    signal('succes')
    setJuste(true)
    relireSession()
  }
  const deposer = async () => {
    setOccupe(true)
    const r = await source.journee.deposerAuStockage(o())
    setOccupe(false)
    stockage.fermer()
    signal(r.ok ? 'succes' : 'erreur')
    if (!r.ok) setErreur(r.raison === 'tournee_en_cours' ? 'Terminez d’abord la tournée.' : 'Rien à déposer.')
    relireSession()
  }

  // ── Blocs du prototype ──
  const controles = (
    <div className="card tight">
      <Controle
        etat={garde.nombre > 0 ? 'bad' : 'on'}
        titre={garde.nombre === 0 ? t('Aucun colis sous votre garde') : garde.nombre > 1 ? tf('{n} colis sous votre garde', { n: garde.nombre }) : t('1 colis sous votre garde')}
        detail={
          garde.nombre > 0
            ? d.tourneeEnCours
              ? t('Terminez la tournée : déposez-les au relais ou chez le vendeur.')
              : tf('Après la dernière tournée : {nom}, {quartier}, avec scan.', { nom: d.stockage.nom, quartier: d.stockage.quartier })
            : undefined
        }
      />
      {garde.nombre > 0 && (
        <div className="btns" style={{ margin: '0 0 12px' }}>
          {d.tourneeEnCours ? (
            <Link className="btn primary" to={chemin('tournee')}>
              <Icone nom="navigation" taille={18} />
              <span>{t('Reprendre la tournée')}</span>
            </Link>
          ) : (
            <button type="button" className="btn primary" onClick={stockage.ouvrir}>
              <Icone nom="warehouse" taille={18} />
              <span>{t('Déposer au point de stockage')}</span>
            </button>
          )}
        </div>
      )}
      <Link to={chemin('synchronisation')} className="l8-lien-case">
        <Controle
          etat={file.nombre > 0 ? 'wait' : 'on'}
          titre={file.nombre === 0 ? t('Aucune preuve en file d’envoi') : file.nombre > 1 ? tf('{n} éléments en file d’envoi', { n: file.nombre }) : t('1 élément en file d’envoi')}
          detail={file.nombre === 0 ? t('Tout est envoyé.') : t('Ne bloque pas la clôture : elle part avec la file.')}
        />
      </Link>
      <Controle etat="on" titre={t('Kit déclaré ce matin')} detail={d.etat === 'ouverte' && d.possible ? t('Comptez ce qui reste ci-dessous.') : undefined} />
      <Controle
        etat={retours.nombre > 0 ? 'bad' : 'on'}
        titre={retours.nombre > 0 ? tf('{n} colis de retour ou de renvoi sur vous', { n: retours.nombre }) : t('Aucun colis de retour ou de renvoi sur vous')}
        detail={retours.nombre > 0 ? t('Déposez-les au point de stockage, avec scan.') : undefined}
      />
    </div>
  )
  const frise = (
    <div className="card">
      <Frise
        items={[
          ...d.deja.map((x) => ({ t: `${heure(x.a, langue)} · ${tf(x.texte, x.valeurs)}`, st: 'done' as const })),
          ...(d.etat === 'ouverte' && d.tourneeEnCours ? [{ t: t('En cours · la tournée'), d: t('Terminez-la, puis revenez ici.'), st: 'cur' as const }] : []),
        ]}
      />
    </div>
  )
  const TUILES: [keyof typeof d.bilan, string, string][] = [
    ['paquets', 'Paquets', 'boxes'],
    ['arrets', 'Arrêts', 'map-pin'],
    ['km', 'km', 'route'],
    ['ramasses', 'Ramassés', 'package'],
    ['deposes', 'Déposés', 'package-check'],
    ['remis', 'Remis', 'house'],
    ['incidents', 'Incidents', 'triangle-alert'],
    ['preuves', 'Preuves', 'camera'],
    ['etiquettes', 'Étiquettes', 'tag'],
  ]
  const bilan = (
    <div className="livc-bil">
      {TUILES.map(([k, lib, ic]) => (
        <div key={k}>
          <i>
            <Icone nom={ic} taille={16} />
          </i>
          <b>{k === 'km' ? km : d.bilan[k]}</b>
          <span>{t(lib)}</span>
        </div>
      ))}
    </div>
  )
  const kit = (
    <div className="card">
      <table className="livc-kit">
        <thead>
          <tr>
            <th>{t('Format')}</th>
            <th>{t('Reçu')}</th>
            <th>{t('Utilisé')}</th>
            <th>{t('Attendu')}</th>
            <th>{t('Compté')}</th>
          </tr>
        </thead>
        <tbody>
          {d.kit.map((l) => {
            const v = compte(l.format, l.attendu)
            const nom = t(NOMS_KIT[l.format])
            return (
              <tr key={l.format} className={v !== l.attendu ? 'bad' : ''}>
                <td>
                  <span className="fmt" title={nom}>
                    {l.format}
                  </span>
                  {v !== l.attendu && <span className="l8-ecart-n">{tf('écart {n}', { n: v - l.attendu })}</span>}
                </td>
                <td>{l.recu}</td>
                <td>{l.utilise}</td>
                <td>{l.attendu}</td>
                <td>
                  <span className="l8-pas" role="group" aria-label={tf('{f} : compté', { f: nom })}>
                    <button type="button" aria-label={tf('{f} : un de moins', { f: nom })} disabled={v <= 0} onClick={() => setComptes({ ...comptes, [l.format]: v - 1 })}>
                      −
                    </button>
                    <b aria-live="polite">{v}</b>
                    <button type="button" aria-label={tf('{f} : un de plus', { f: nom })} onClick={() => setComptes({ ...comptes, [l.format]: v + 1 })}>
                      +
                    </button>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {ecarts.map((l) => (
        <div key={l.format} className="l8-ecart">
          <div className="hr"></div>
          <div className="b8 t14">{tf('{f} : écart de {n}', { f: t(NOMS_KIT[l.format]), n: compte(l.format, l.attendu) - l.attendu })}</div>
          <div className="livc-types l8-types" role="radiogroup" aria-label={t('Motif de l’écart')}>
            {MOTIFS.map(([id, lib]) => (
              <button key={id} type="button" role="radio" aria-checked={motifs[l.format] === id} className={motifs[l.format] === id ? 'on' : ''} onClick={() => setMotifs({ ...motifs, [l.format]: id })}>
                {motifs[l.format] === id && <Icone nom="check" taille={15} trait={3} />}
                {t(lib)}
              </button>
            ))}
          </div>
          {motifs[l.format] === 'pochette_abimee' && regles.donnees && (
            <ChampPhotos photos={photos[l.format] ?? []} changer={(x) => setPhotos({ ...photos, [l.format]: x })} exigees={1} max={1} maxKo={regles.donnees.photoMaxKo} maintenant={m} />
          )}
          <div className="t13 c3 mt4">{t('Jamais à votre charge : l’écart se règle entre votre entreprise et BelivaY.')}</div>
        </div>
      ))}
      <Hint icone="calculator">{t('Attendu = reçu − étiquettes liées : on compte les étiquettes, pas le stock.')}</Hint>
    </div>
  )

  const fixes = (
    <>
      <Feuille ouverte={confirmer.ouverte} fermer={confirmer.fermer} titre={t('Clôturer ma journée ?')}>
        <h2 className="lc-f-t">{t('Clôturer ma journée ?')}</h2>
        <ul className="lc-points">
          <li>{t('Votre statut passe à « Hors service » : plus aucun paquet ne vous est affecté.')}</li>
          <li>{tf('Le bilan part à {entreprise} ; BelivaY ne l’utilise que pour les scores et les règlements.', { entreprise: d.entreprise })}</li>
          <li>{t('Votre position n’est plus enregistrée.')}</li>
          {!en && <li>{t('Pas de réseau : la clôture part avec la file, statut « preuves à envoyer ».')}</li>}
        </ul>
        <div className="lc-f-actions">
          <button type="button" className="l-btn l-principal" disabled={occupe} onClick={() => void cloturer()}>
            <Icone nom="lock" taille={20} />
            <span>{t(occupe ? 'Clôture…' : 'Clôturer maintenant')}</span>
          </button>
          <button type="button" className="l-btn l-second" onClick={confirmer.fermer}>
            {t('Pas encore')}
          </button>
        </div>
      </Feuille>
      <Feuille ouverte={stockage.ouverte} fermer={stockage.fermer} titre={t('Dépôt au point de stockage')}>
        <h2 className="lc-f-t">{t('Dépôt au point de stockage')}</h2>
        <p className="lc-texte">
          {tf('{nom}, {quartier} : scannez chaque colis devant le responsable ; la garde passe à {entreprise} à chaque scan. Jamais de colis gardé chez vous.', {
            nom: d.stockage.nom,
            quartier: d.stockage.quartier,
            entreprise: d.entreprise,
          })}
        </p>
        <div className="lc-f-actions">
          <button type="button" className="l-btn l-principal" disabled={occupe} onClick={() => void deposer()}>
            <Icone nom="scan-barcode" taille={20} />
            <span>{tf('Scanner et déposer {n} colis', { n: garde.nombre })}</span>
          </button>
          <button type="button" className="l-btn l-second" onClick={stockage.fermer}>
            {t('Annuler')}
          </button>
        </div>
      </Feuille>
    </>
  )
  const messageErreur = erreur && (
    <Note ton="red" icone="circle-alert" role="alert">
      {t(erreur)}
    </Note>
  )

  // ── Journée clôturée (ou partie avec la file) ──
  if (d.etat !== 'ouverte') {
    const enFile = d.etat === 'preuves_a_envoyer'
    // Récapitulatif de la journée (M6) : bilan, kit compté, statut ; jamais un contenu, un prix ni un client.
    const recapitulatif = () => {
      const a = d.clotureeA ?? m()
      const b = d.bilan
      return exporterPdf(
        [
          { texte: 'BelivaY', taille: 20, gras: true },
          { texte: t('Récapitulatif de la journée'), taille: 14, gras: true, espace: 6 },
          { texte: tf('{jour} · {h}', { jour: jourLong(a, langue), h: heure(a, langue) }), espace: 4 },
          { texte: t('Livreur'), droite: prenom + ' · ' + d.entreprise, espace: 14 },
          { texte: t('Statut'), droite: t(enFile ? 'Clôturée · preuves à envoyer' : 'Clôturée · bilan envoyé') },
          { texte: t('Bilan'), gras: true, espace: 14 },
          { texte: t('Paquets'), droite: String(b.paquets) },
          { texte: t('Arrêts'), droite: String(b.arrets) },
          { texte: t('Colis ramassés'), droite: String(b.ramasses) },
          { texte: t('Colis déposés au relais'), droite: String(b.deposes) },
          { texte: t('Colis remis à domicile'), droite: String(b.remis) },
          { texte: t('Incidents'), droite: String(b.incidents) },
          { texte: t('Preuves envoyées'), droite: String(b.preuves) },
          { texte: t('Distance'), droite: tf('{km} km', { km }) },
          { texte: t('Kit'), gras: true, espace: 14 },
          ...d.kit.map((l) => ({ texte: t(NOMS_KIT[l.format]), droite: tf('reçu {r} · utilisé {u} · attendu {a}', { r: l.recu, u: l.utilise, a: l.attendu }) })),
          { texte: tf('Prochain jour de service : {quand}', { quand: echeance(d.prochainService, m(), langue) }), espace: 14, taille: 10 },
        ],
        'journee-' + new Date(a).toISOString().slice(0, 10) + '.pdf',
        t('Récapitulatif de la journée'),
      )
    }
    return (
      <Ecran proto route="cloture" fixes={fixes}>
        <Lvp className="l8">
          <HeroProto ton="acc" className={'l8-hero-fin' + (juste ? ' blv-succes' : '')}>
            <div className="row" style={{ gap: 12 }}>
              <span className="ico-b">
                <Icone nom={enFile ? 'cloud-upload' : 'moon-star'} taille={24} />
              </span>
              <div className="grow">
                <div className="hk">{tf('{jour} · {h}', { jour: jourLong(d.clotureeA ?? m(), langue), h: heure(d.clotureeA ?? m(), langue) })}</div>
                <div className="ht" style={{ marginTop: 2 }}>
                  {t(enFile ? 'Journée clôturée · preuves à envoyer' : 'Journée clôturée')}
                </div>
              </div>
            </div>
            <div className="hs">
              {t('Statut :')} <b>{t('hors service')}</b>.{' '}
              {enFile
                ? tf('La clôture et le bilan partent avec la file au retour du réseau ; {entreprise} les reçoit alors.', { entreprise: d.entreprise })
                : tf('Bilan envoyé à {entreprise}.', { entreprise: d.entreprise })}{' '}
              {tf('Bonne soirée, {prenom}.', { prenom })}
            </div>
            <div className="livc-hm">
              <div>
                <b>{d.bilan.paquets}</b>
                <span>{t('paquets')}</span>
              </div>
              <div>
                <b>{d.bilan.ramasses + d.bilan.deposes + d.bilan.remis}</b>
                <span>{t('colis')}</span>
              </div>
              <div>
                <b>{tf('{km} km', { km })}</b>
                <span>{t('parcourus')}</span>
              </div>
            </div>
          </HeroProto>
          {messageErreur}
          <div className="card tight">
            {enFile ? (
              <Li
                icone="cloud-upload"
                ton="amber"
                t={t('Bilan en file d’envoi')}
                s={tf('Il part à {entreprise} au retour du réseau', { entreprise: d.entreprise })}
                vers={chemin('synchronisation')}
                droite={
                  <Pill ton="amber" sm point>
                    {t('À envoyer')}
                  </Pill>
                }
              />
            ) : (
              <Li
                icone="circle-check"
                ton="green"
                t={tf('Bilan reçu par {entreprise}', { entreprise: d.entreprise })}
                s={tf('À {h} · visible dans son portail', { h: heure(d.clotureeA ?? m(), langue) })}
                droite={
                  <Pill ton="green" sm>
                    {t('Envoyé')}
                  </Pill>
                }
              />
            )}
            <Li
              icone="power"
              ton="ink"
              t={t('Statut : hors service')}
              s={t('Vous ne recevez plus de paquet jusqu’à votre prochaine connexion')}
              droite={
                <Pill ton="ink" sm point>
                  {t('Hors service')}
                </Pill>
              }
            />
            <Li icone="package-open" ton="or" t={t('Kit compté')} s={t('Tout écart expliqué se règle entre votre entreprise et BelivaY')} vers={chemin('kit')} />
            <Li icone="calendar-days" ton="acc" t={t('Prochain jour de service')} s={echeance(d.prochainService, m(), langue)} />
          </div>
          <div className="btns" style={{ marginTop: 14 }}>
            <button type="button" className="btn primary" onClick={() => void recapitulatif()}>
              <Icone nom="file-down" taille={18} />
              <span>{t('Récapitulatif de la journée (PDF)')}</span>
            </button>
          </div>
          <div className="btns">
            <Link className="btn acc-soft" to={chemin('historique')}>
              <Icone nom="history" taille={18} />
              <span>{t('Consulter l’historique')}</span>
            </Link>
            <Link className="btn secondary" to={chemin('activite')}>
              <Icone nom="chart-column" taille={18} />
              <span>{t('Mon activité')}</span>
            </Link>
          </div>
          <div className="btns">
            <Link className="btn ghost" to={chemin('aujourdhui')}>
              <Icone nom="house" taille={18} />
              <span>{t('Revenir à ma journée')}</span>
            </Link>
          </div>
          <Foot icone={en ? 'wifi' : 'wifi-off'}>
            {en ? (file.nombre > 0 ? tf('Connecté · {n} éléments en attente d’envoi', { n: file.nombre }) : t('Connecté · aucune preuve en attente d’envoi')) : t('Hors connexion')}
          </Foot>
        </Lvp>
      </Ecran>
    )
  }

  // ── Journée ouverte : bloquée, prête, ou prête hors connexion ──
  return (
    <Ecran proto route="cloture" fixes={fixes}>
      <Lvp className="l8">
        {!en && (
          <HorsConnexion>
            <b>{t('Hors connexion')}</b> · {file.nombre > 1 ? tf('{n} éléments en attente d’envoi.', { n: file.nombre }) : file.nombre === 1 ? t('1 élément en attente d’envoi.') : t('Rien en attente d’envoi.')}
          </HorsConnexion>
        )}
        {!d.possible ? (
          <HeroProto
            ton="red"
            hk={quand}
            ht={t('Clôture impossible pour l’instant')}
            hs={
              garde.nombre > 1
                ? tf('{n} colis sont sous votre garde. Terminez la tournée, puis revenez ici : l’écran vous dit ce qui bloque et comment le résoudre.', { n: garde.nombre })
                : t('Un colis est sous votre garde. Terminez la tournée, puis revenez ici : l’écran vous dit ce qui bloque et comment le résoudre.')
            }
          />
        ) : en ? (
          <HeroProto
            ton="orange"
            hk={m() >= d.proposeeA ? tf('{q} · proposée à {h}', { q: jourLong(m(), langue), h: heure(d.proposeeA, langue) }) : quand}
            ht={t('Vous pouvez clôturer votre journée')}
            hs={
              file.nombre > 0
                ? tf('{n} preuves sont encore en file : la clôture passe, avec le statut « preuves à envoyer ».', { n: file.nombre })
                : tf('Aucun colis sur vous. La clôture vous est proposée automatiquement à {h} ; elle reste votre geste.', { h: heure(d.proposeeA, langue) })
            }
          />
        ) : null}
        {messageErreur}

        <Sec titre={t(!d.possible ? 'Ce qui bloque' : 'Contrôles')} />
        {controles}

        {!d.possible ? (
          <>
            <Sec titre={t('Déjà fait aujourd’hui')} />
            {frise}
            <Note ton="ink" icone="warehouse">
              <b>{t('Colis encore sur vous après la dernière tournée')}</b>{' '}
              {tf('(retard, pluie) : déposez-les au point de stockage de {entreprise} ({nom}, {quartier}) avec scan ; reprise à l’ouverture, client prévenu.', {
                entreprise: d.entreprise,
                nom: d.stockage.nom,
                quartier: d.stockage.quartier,
              })}{' '}
              <b>{t('Jamais chez vous.')}</b>
            </Note>
          </>
        ) : (
          <>
            <Sec titre={t(en ? 'Bilan de la journée' : 'Bilan')} />
            {!en && <Hint icone="cloud-off">{t('Données gardées sur le téléphone.')}</Hint>}
            {bilan}
            <Hint icone="info">{t('Calculé sur les missions validées par le serveur : mêmes chiffres que votre activité et que le portail de votre entreprise.')}</Hint>
            {en && frise}
            <Sec titre={t('Kit restant par format')} />
            {kit}
            {en ? (
              <Note ton="acc" icone="send">
                {t('Le bilan part à')} <b>{d.entreprise}</b>. {t('BelivaY ne l’utilise que pour les scores et les règlements de l’entreprise.')}
              </Note>
            ) : (
              <>
                <Note ton="amber" icone="cloud-off">
                  {t('Vous pouvez clôturer : votre statut restera')} <b>{t('« preuves à envoyer »')}</b> {t('jusqu’à la synchronisation. La clôture et le bilan partent avec la file, dès le retour du réseau.')}
                </Note>
                {regles.donnees && (
                  <Note ton="ink" icone="hourglass">
                    {tf('Une preuve qui n’atteint pas le serveur en {h} heures est signalée expirée à {entreprise} et à la console.', { h: regles.donnees.expirationH, entreprise: d.entreprise })}
                  </Note>
                )}
              </>
            )}
          </>
        )}

        <BarreAction aide={raison ?? undefined}>
          <button type="button" className="btn primary xl" disabled={!!raison} onClick={confirmer.ouvrir}>
            <Icone nom="lock" taille={18} />
            <span>{t(en ? 'Clôturer ma journée' : 'Clôturer (envoi au retour du réseau)')}</span>
          </button>
        </BarreAction>
      </Lvp>
    </Ecran>
  )
}

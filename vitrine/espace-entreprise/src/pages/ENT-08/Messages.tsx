// ENT-P22 · Messages, repris sur le prototype (route('messages')) : tête datée ; grille g12 = panneau « Fils » (BelivaY,
// vos livreurs, notes d'incident ; non lus) et, à droite, le fil ouvert (« ?fil= », par exemple le fil « Révision de
// grille » créé depuis Prix et délais) ou « Vos fils en un coup d'œil » + « Ce que contient chaque fil » ; téléphone :
// le fil ouvert seul. Aucun fil : état vide et délais du support. Domaine src/donnees/domaines/messages.ts : messagerie
// interne supervisée, jamais d'échange avec un client, un vendeur ou un gérant (appel masqué de la mission) ;
// coordonnées masquées à l'enregistrement ; pièces : images et PDF ≤ taille_max_piece Mo, jamais une preuve de mission ;
// support : première réponse et heures de service lues au registre ; nouveau message = fil du support rattaché à un
// dossier (« ?sheet=nouveau&sujet=&ref= »), sans objet libre.
// Enrichi (M5, M8, M16) : recherche « / » et puces Toutes / Non lues / Livreurs / BelivaY (?q=, ?f=), zéro résultat ;
// « Tout marquer comme lu » montré fait, envoyé après 5 s sauf « Annuler » ; message gardé hors connexion (bulle
// « en attente d'envoi », partie au retour du réseau) ; actions fréquentes dans la zone du pouce au téléphone.
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Fil, GroupeFil, Message, SujetSupport } from '../../donnees/domaines/messages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { OUTILS } from '../../calculs/ent08'
import { jourDe } from '../../calculs/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { AucunResultat, BarrePouce, correspond, Hint, Kv, Li, Note, Panel, Pill, Puces, Px, Recherche, Tete, type Ton, useAnnuler, useLarge, Vide } from '../../composants/prototype'
import { Chargement, ErreurLecture, useAnnonce, useDates, useEnLigne } from '../ENT-07/commun'
import { geste, useFile } from '../../donnees/fileHorsLigne'
import './ent08.css'
import { Ecran } from '../../composants/coque'
import { TexteTraduisible } from '@client/traduction/Traduisible'

const GROUPES: { id: GroupeFil; titre: string }[] = [
  { id: 'belivay', titre: 'BelivaY' },
  { id: 'livreurs', titre: 'Vos livreurs' },
  { id: 'incidents', titre: 'Notes d’incident · par mission' },
]
const SUJETS: { id: SujetSupport; titre: string }[] = [
  { id: 'litige', titre: 'Un litige' },
  { id: 'paquet', titre: 'Un paquet' },
  { id: 'versement', titre: 'Un versement' },
  { id: 'releve', titre: 'Un relevé' },
  { id: 'compte', titre: 'Le compte' },
]
const TON_DOSSIER: Record<NonNullable<Fil['dossier']>['genre'], Ton> = { litige: 'red', incident: 'amber', paquet: 'acc', versement: 'or', releve: 'ink', compte: 'ink' }
const initiales = (n: string) => n.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase()
type Filtre = 'toutes' | 'nonlues' | 'livreurs' | 'belivay'
const FILTRES: Filtre[] = ['toutes', 'nonlues', 'livreurs', 'belivay']
const passe = (f: Fil, x: Filtre) => (x === 'nonlues' ? f.nonLus > 0 : x === 'livreurs' ? f.groupe === 'livreurs' : x === 'belivay' ? f.groupe === 'belivay' : true)
const iconeFil = (f: Fil) => (f.groupe === 'incidents' ? 'notebook-pen' : f.dossier && f.dossier.genre !== 'compte' ? 'headset' : 'map-pinned')

export default function Messages() {
  const { t, tf } = usePreferences()
  const large = useLarge()
  const lecture = useLecture(() => source.messages.fils(), [])
  const [params, setParams] = useSearchParams()
  const id = params.get('fil')
  const nouveau = useFeuille('nouveau')
  const annuler = useAnnuler()
  const { annoncer, vue } = useAnnonce()
  const q = params.get('q') ?? ''
  const filtre = FILTRES.includes(params.get('f') as Filtre) ? (params.get('f') as Filtre) : 'toutes'
  const regler = (k: 'q' | 'f', v: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v && v !== 'toutes') n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )
  // « Tout marquer comme lu » en attente (5 s pour annuler) : les badges disparaissent tout de suite.
  const toutLu = annuler.enCours.has('tout-lu')
  const fils = lecture.donnees?.map((f) => (toutLu ? { ...f, nonLus: 0 } : f)) ?? null
  const choisi = fils?.find((f) => f.id === id) ?? null
  const nonLusIds = (lecture.donnees ?? []).filter((f) => f.nonLus > 0).map((f) => f.id)
  const toutMarquer = () =>
    annuler.differer('tout-lu', tf('{n} fil(s) marqué(s) comme lu(s).', { n: nonLusIds.length }), async () => {
      const x = await geste('Tout marquer comme lu', (s) => Promise.all(nonLusIds.map((i) => s.messages.lire(i))))
      if (x.etat === 'en_file') annoncer(true, t('Hors connexion : gardé, envoyé au retour du réseau.'))
    })
  const visibles = (fils ?? []).filter((f) => passe(f, filtre) && correspond(q, t(f.titre), t(f.dernier), f.dossier?.ref, ...f.messages.map((m) => t(m.texte))))
  const ouvrir = (x: string | null) => {
    const p = new URLSearchParams(params)
    if (x) p.set('fil', x)
    else p.delete('fil')
    setParams(p)
  }
  useEffect(() => {
    if (choisi?.nonLus) void geste('Marquer comme lu', (s) => s.messages.lire(choisi.id), t(choisi.titre))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choisi?.id, choisi?.nonLus])
  const acts = (
    <>
      <button type="button" className="btn secondary sm" disabled={!nonLusIds.length || toutLu} onClick={toutMarquer}>
        <Icone nom="check-check" taille={16} />
        <span>{t('Tout marquer comme lu')}</span>
      </button>
      <button type="button" className="btn primary sm" onClick={nouveau.ouvrir}>
        <Icone nom="square-pen" taille={16} />
        <span>{t('Nouveau message')}</span>
      </button>
    </>
  )
  const n = (x: Filtre) => (fils ?? []).filter((f) => passe(f, x)).length
  const support = tf('première réponse sous {h} h, de {o} h à {f} h, 7 jours sur 7', { h: OUTILS.support.h, o: OUTILS.support.ouverture, f: OUTILS.support.fermeture })
  const liste = fils && (
    <Panel titre={t('Fils')} icone="messages-square">
      <div className="e8-q"><Recherche q={q} setQ={(v) => regler('q', v)} placeholder={t('Fil, livreur, dossier, mot d’un message…')} aria={t('Rechercher dans les messages')} /></div>
      <Puces
        aria={t('Filtrer les fils')}
        actif={filtre}
        choisir={(v) => regler('f', v)}
        items={[
          { id: 'toutes', t: 'Tous', n: n('toutes') },
          { id: 'nonlues', t: 'Non lus', n: n('nonlues') },
          { id: 'livreurs', t: 'Livreurs', n: n('livreurs') },
          { id: 'belivay', t: 'BelivaY', n: n('belivay') },
        ]}
      />
      {visibles.length === 0 && <AucunResultat effacer={() => setParams((p) => (p.delete('q'), p.delete('f'), p), { replace: true })} texte={filtre === 'nonlues' && !q ? t('Aucun fil non lu : vous êtes à jour.') : undefined} />}
      {GROUPES.map((g, i) => {
        const fs = visibles.filter((f) => f.groupe === g.id)
        if (!fs.length) return null
        return (
          <div key={g.id}>
            <div className="ec7-grp" style={{ margin: i ? '14px 0 2px' : '0 0 2px' }}>
              {t(g.titre)}
            </div>
            {fs.map((f) => (
              <ArticleFil key={f.id} f={f} on={f.id === choisi?.id} ouvrir={() => ouvrir(f.id)} />
            ))}
          </div>
        )
      })}
    </Panel>
  )
  const nonLus = fils?.filter((f) => f.nonLus > 0) ?? []
  const droite = choisi ? (
    <FilOuvert key={choisi.id} f={choisi} fermer={() => ouvrir(null)} />
  ) : (
    fils && (
      <div style={{ minWidth: 0 }}>
        <Panel titre={t('Vos fils en un coup d’œil')} icone="info">
          <Kv k={t('Non lus')} v={nonLus.length ? `${nonLus.reduce((a, f) => a + f.nonLus, 0)} · ${nonLus.map((f) => t(f.titre)).join(', ')}` : t('aucun')} />
          <Kv k={t('Support entreprise')} v={support} />
          <Kv k={t('Fils des livreurs')} v={tf('{n} fils', { n: fils.filter((f) => f.groupe === 'livreurs').length })} />
          <Note ton="acc" icone="eye-off">
            {t('Tout numéro, adresse e-mail ou identifiant saisi dans un message est masqué automatiquement. Aucune coordonnée de client ne se transmet par message.')}
          </Note>
          <Note ton="ink" icone="siren">
            {t('Message urgent hors des heures de service : le fil BelivaY affiche le délai de réponse ; une urgence de sécurité passe par le SOS du livreur.')}
          </Note>
          <Note ton="red" icone="ban">
            <b>{t('Interdit')}</b> : {t('transmettre les coordonnées d’un client à un livreur par message ; utiliser la messagerie pour promouvoir un autre service.')}
          </Note>
        </Panel>
        <Panel titre={t('Ce que contient chaque fil')} icone="messages-square" style={{ marginTop: 16 }}>
          <Li icone="headset" ton="or" t={t('Fil BelivaY')} s={t('support entreprise et équipe partenaires : contrat, paquets, litiges, règlements ; chaque échange rattaché à son dossier')} />
          <Li icone="users" ton="acc" t={t('Fils des livreurs')} s={t('consignes et plannings de votre entreprise ; les livreurs y répondent depuis leur application')} />
          <Li icone="notebook-pen" ton="amber" t={t('Notes d’incident')} s={t('une note par mission, gardée avec le dossier, fermée à la fin du délai de litige et lue par la console en cas de litige')} />
          <Hint icone="camera-off">{t('Les preuves de mission ne passent jamais par la messagerie : elles se prennent dans l’application livreur.')}</Hint>
        </Panel>
      </div>
    )
  )
  return (
    <Ecran route="messages" actions={large ? acts : undefined}>
      <Px>
        <Tete
          route="messages"
          titre={t('Messages')}
        />
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
        {vue}
        {annuler.vue}
        {!fils ? (
          !lecture.erreur && <Chargement />
        ) : fils.length === 0 ? (
          <div className="g g21">
            <div className="panel">
              <Vide icone="messages-square" t={t('Aucun message pour l’instant')} s={t('Vos fils apparaîtront ici : le support entreprise et l’équipe partenaires BelivaY, un fil par livreur, et les notes d’incident de chaque mission.')}>
                <div className="btns ec-btns" style={{ maxWidth: 420, margin: '12px auto 0' }}>
                  <button type="button" className="btn primary" onClick={nouveau.ouvrir}>
                    <Icone nom="square-pen" taille={18} />
                    {t('Écrire au support BelivaY')}
                  </button>
                </div>
              </Vide>
            </div>
            <Panel titre={t('Délais de réponse du support')} icone="clock">
              <Kv k={t('Première réponse')} v={tf('sous {h} h', { h: OUTILS.support.h })} />
              <Kv k={t('Heures de service')} v={tf('de {o} h à {f} h, 7 jours sur 7', { o: OUTILS.support.ouverture, f: OUTILS.support.fermeture })} />
              <Hint icone="clock">{t('Urgence de sécurité : le SOS du livreur.')}</Hint>
            </Panel>
          </div>
        ) : !large && choisi ? (
          droite
        ) : (
          <div className="g g12">
            {liste}
            {droite}
          </div>
        )}
        {!(choisi && !large) && <BarrePouce>{acts}</BarrePouce>}
      </Px>
      <NouveauMessage
        ouverte={nouveau.ouverte}
        fermer={nouveau.fermer}
        ouvrirFil={(x) =>
          setParams(
            (p) => {
              const n = new URLSearchParams(p)
              for (const k of ['sheet', 'sujet', 'ref']) n.delete(k)
              n.set('fil', x)
              return n
            },
            { replace: true },
          )
        }
      />
    </Ecran>
  )
}

/** Ligne de fil (ec8-th du prototype) : icône ou initiales, titre, heure, dernier message, dossier, non lus. */
function ArticleFil({ f, on, ouvrir }: { f: Fil; on: boolean; ouvrir: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  return (
    <button type="button" className={'ec8-th' + (on ? ' on' : '')} aria-pressed={on} onClick={ouvrir} data-fil={f.id}>
      <span className={'ic' + (f.groupe === 'belivay' ? ' bv' : f.groupe === 'incidents' ? ' inc' : '')}>{f.groupe === 'livreurs' ? <b className="t13">{initiales(f.titre)}</b> : <Icone nom={iconeFil(f)} taille={20} />}</span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span className="t">{t(f.titre)}</span>
          <span className="tm">{jourDe(f.le) === jourDe(maintenant) ? d.heure(f.le) : d.quand(f.le, maintenant)}</span>
        </span>
        <span className="m" style={{ display: 'block' }}>
          {t(f.dernier)}
        </span>
        <span className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {f.dossier && (
            <Pill ton={TON_DOSSIER[f.dossier.genre]} sm>
              <span className="mono no-tr">{f.dossier.ref}</span>
            </Pill>
          )}
          {f.ferme && (
            <Pill ton="ink" sm icone="lock">
              {t('Fermé')}
            </Pill>
          )}
          {f.nonLus > 0 && (
            <span className="un" style={{ marginTop: 0 }} aria-label={tf('{n} non lus', { n: f.nonLus })}>
              {f.nonLus}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}

function FilOuvert({ f, fermer }: { f: Fil; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const enLigne = useEnLigne()
  const { annoncer, vue } = useAnnonce()
  const file = useFile()
  // Messages gardés hors connexion pour ce fil : montrés en bulles « en attente d'envoi ».
  const enFile = file.gestes.flatMap((g) => g.appels.filter((a) => a.domaine === 'messages' && a.methode === 'envoyer' && a.args[0] === f.id).map((a) => ({ id: g.id, le: g.le, texte: String(a.args[1] ?? ''), piece: a.args[2] as Message['piece'] })))
  const [texte, setTexte] = useState('')
  const [piece, setPiece] = useState<Message['piece']>(null)
  const champ = useRef<HTMLInputElement>(null)
  const fin = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = fin.current?.parentElement
    if (c) c.scrollTop = c.scrollHeight
  }, [f.messages.length, enFile.length])
  const envoyer = async () => {
    const x = await geste('Envoyer un message', (s) => s.messages.envoyer(f.id, texte, piece), t(f.titre))
    if (x.etat === 'en_file') {
      setTexte('')
      setPiece(null)
      return annoncer(true, t('Hors connexion : message gardé, envoyé au retour du réseau.'))
    }
    const r = x.r
    if (!r.ok) return annoncer(false, t(r.raison === 'ferme' ? 'Ce fil est fermé : écrivez au support en le rattachant au dossier.' : r.raison === 'piece' ? 'Pièce refusée.' : 'Écrivez un message ou joignez une pièce.'))
    setTexte('')
    setPiece(null)
    if (r.masque) annoncer(true, t('Envoyé. Des coordonnées ont été masquées.'))
  }
  return (
    <div data-fil-ouvert={f.id} style={{ minWidth: 0 }}>
      <Panel titre={t(f.titre)} icone={f.groupe === 'livreurs' ? 'user' : iconeFil(f)} a={f.dossier ? { t: t('Ouvrir le dossier'), to: chemin(f.dossier.route, f.dossier.params) } : undefined}>
        <button type="button" className="btn ghost sm e7-retour-liste" onClick={fermer}>
          <Icone nom="chevron-left" taille={16} />
          <span>{t('Tous les fils')}</span>
        </button>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', margin: '-4px 0 10px' }}>
          {f.dossier && (
            <Pill ton={TON_DOSSIER[f.dossier.genre]} sm icone="folder-open">
              {t('Rattaché au dossier')} <span className="mono no-tr">{f.dossier.ref}</span>
            </Pill>
          )}
          {f.groupe === 'belivay' && (
            <>
              <Pill ton="ink" sm icone="clock">
                {tf('Réponse sous {h} h', { h: OUTILS.support.h })}
              </Pill>
              <Pill ton="ink" sm>
                {tf('{o} h – {f} h, 7 j/7', { o: OUTILS.support.ouverture, f: OUTILS.support.fermeture })}
              </Pill>
            </>
          )}
          {f.ferme && (
            <Pill ton="ink" sm icone="lock">
              {t('Fermé')}
            </Pill>
          )}
        </div>
        <div className="ec8-thread ec8-defile" aria-live="polite">
          {f.messages.length === 0 && (
            <div className="ec8-sys">
              <Icone nom="send" taille={14} />
              {t(f.dernier)}
            </div>
          )}
          {f.messages.map((m) =>
            m.de === 'systeme' ? (
              <div key={m.id} className="ec8-sys">
                <Icone nom="info" taille={14} />
                {t(m.texte)}
              </div>
            ) : (
              <div key={m.id} className={'ec8-msg' + (m.de === 'moi' ? ' me' : '')}>
                <div className="by">
                  <span>{t(m.auteur)}</span>
                  <span>{d.quand(m.le, maintenant)}</span>
                </div>
                {m.de === 'moi' ? t(m.texte) : <TexteTraduisible texte={t(m.texte)} />}
                {m.piece && (
                  <div className="mt6">
                    <Pill ton="ink" sm icone={m.piece.type === 'pdf' ? 'file-text' : 'image'}>
                      {m.piece.nom}
                    </Pill>
                  </div>
                )}
                {m.masque && (
                  <div className="ec8-sys" style={{ marginTop: 6 }}>
                    <Icone nom="eye-off" taille={14} />
                    {t('Coordonnées masquées automatiquement : aucune coordonnée ne passe par la messagerie.')}
                  </div>
                )}
              </div>
            ),
          )}
          {enFile.map((m) => (
            <div key={m.id} className="ec8-msg me" data-en-file>
              <div className="by">
                <span>{t('Vous')}</span>
                <span>{d.quand(m.le, maintenant)}</span>
              </div>
              {m.texte}
              {m.piece && (
                <div className="mt6">
                  <Pill ton="ink" sm icone="paperclip">
                    {m.piece.nom}
                  </Pill>
                </div>
              )}
              <div className="ec8-sys" style={{ marginTop: 6 }}>
                <Icone nom="cloud-upload" taille={14} />
                {t('En attente d’envoi : part au retour du réseau.')}
              </div>
            </div>
          ))}
          <div ref={fin} />
        </div>
        {f.ferme ? (
          <Hint icone="lock">{t('Fil fermé à la fin du délai de litige : il reste lisible.')}</Hint>
        ) : (
          <>
            {piece && (
              <div className="row mt10" style={{ gap: 6 }}>
                <Pill ton="ink" sm icone="paperclip">
                  {piece.nom}
                </Pill>
                <button type="button" className="ibtn" aria-label={t('Retirer la pièce')} onClick={() => setPiece(null)}>
                  <Icone nom="x" taille={16} />
                </button>
              </div>
            )}
            <div className="ec8-compose">
              <input
                ref={champ}
                type="file"
                accept="image/*,application/pdf"
                className="vh"
                onChange={(e) => {
                  const x = e.target.files?.[0]
                  e.target.value = ''
                  if (!x) return
                  if (x.size > OUTILS.pieceMo * 1024 * 1024) return annoncer(false, tf('Pièce trop lourde : {n} Mo au plus.', { n: OUTILS.pieceMo }))
                  setPiece({ nom: x.name, type: x.type === 'application/pdf' ? 'pdf' : 'image' })
                }}
              />
              <button type="button" className="btn secondary sm" aria-label={t('Joindre une image ou un PDF')} onClick={() => champ.current?.click()}>
                <Icone nom="paperclip" taille={18} />
              </button>
              <textarea className="ec8-ta" rows={1} value={texte} onChange={(e) => setTexte(e.target.value)} aria-label={t('Votre message')} placeholder={f.groupe === 'belivay' ? t('Écrire au support…') : t('Votre message')} maxLength={2000} />
              <button type="button" className="btn primary sm" disabled={!texte.trim() && !piece} onClick={() => void envoyer()}>
                <Icone nom="send" taille={16} />
                {t('Envoyer')}
              </button>
            </div>
            <Hint icone="shield-check">
              {enLigne
                ? tf('Messages horodatés et signés par leur auteur. Images et PDF de {n} Mo au plus, jamais une preuve de mission. Tout fil lié à une mission reste consultable par la console en cas de litige.', { n: OUTILS.pieceMo })
                : t('Hors connexion : vos messages sont gardés sur cet appareil et partent au retour du réseau.')}
            </Hint>
          </>
        )}
        {vue}
      </Panel>
    </div>
  )
}

function NouveauMessage({ ouverte, fermer, ouvrirFil }: { ouverte: boolean; fermer: () => void; ouvrirFil: (id: string) => void }) {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const enLigne = useEnLigne()
  const [sujet, setSujet] = useState<SujetSupport>((params.get('sujet') as SujetSupport) || 'litige')
  const [ref, setRef] = useState(params.get('ref') ?? '')
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Nouveau message au support')}>
      <h2 className="card-t">{t('Nouveau message au support')}</h2>
      <p className="e7-note mt10">{tf('Rattaché à un dossier, sans objet libre. Première réponse sous {h} h, de {o} h à {f} h, 7 jours sur 7.', { h: OUTILS.support.h, o: OUTILS.support.ouverture, f: OUTILS.support.fermeture })}</p>
      <label className="champ">
        <span>{t('Sujet')}</span>
        <select value={sujet} onChange={(e) => setSujet(e.target.value as SujetSupport)}>
          {SUJETS.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.titre)}
            </option>
          ))}
        </select>
      </label>
      <label className="champ">
        <span>{t('Référence du dossier')}</span>
        <input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="LT-031, PQ-2417, RL-2026-S42…" />
      </label>
      <label className="champ">
        <span>{t('Message')}</span>
        <textarea rows={4} value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={2000} />
      </label>
      {erreur && <p className="note red mt10" role="alert">{erreur}</p>}
      <button
        type="button"
        className="btn primary bloc mt16"
        disabled={!enLigne}
        onClick={async () => {
          const r = await source.messages.nouveauSupport(sujet, ref, texte)
          if (!r.ok) return setErreur(t(r.raison === 'ref' ? 'Indiquez la référence du dossier.' : 'Écrivez votre message.'))
          setErreur(null)
          setTexte('')
          ouvrirFil(r.id)
        }}
      >
        {t('Envoyer au support')}
      </button>
    </Feuille>
  )
}

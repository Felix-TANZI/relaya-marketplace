// PR-08 · Messagerie. Structure du prototype intacte (Fig. 2 à 4) : liste des fils (le fil choisi surligné), le fil
// en dessous (en-tête : titre, motif et référence, état ; bulles BelivaY blanches, bulles du relais au dégradé avec
// heure et « lu », photo envoyée ; réponses rapides en pastilles bleues dont « Rappelez-moi » ; bouton photo, champ,
// envoyer), puis la règle « uniquement avec BelivaY ».
// Règles : MSG-01 (aucun contact direct ; numéros et e-mails masqués par le serveur), MSG-02 (preuve, jamais supprimé,
// PR-PREUVES-CONSERV-J), MSG-03/ARL-40 (fil de dossier fermé à la clôture définitive, lecture seule), MSG-04 (photo
// compressée, envoi différé hors connexion), MSG-05 (première réponse SUP-DELAI, moyenne affichée), MSG-06 (« Rappelez-
// moi » = rappel du support, fil logistique = réponses rapides seulement), AID-03, DP-12, DP-61 / PR-RC-25 (appel
// masqué : page Appel), critères 1 et 2 (photo demandée prise et envoyée depuis le fil ; logistique).
// Adresses : « messagerie?fil=T-881 » ouvre un fil (lien d'une notification) ; « ?etat=sup » et « ?etat=log » (états du
// prototype) ouvrent le fil du support et celui des collectes.
import { TexteTraduisible } from '@client/traduction/Traduisible'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import marque from '../../assets/marque-belivay.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { enAttente, geste, origine, useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import type { Fil, Message } from '../../donnees/domaines/messages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { Chargement, ErreurLecture, heureBulle, quand, useTexte, usePrisePhoto } from './commun'
import './pr08.css'

const ETATS_PROTOTYPE: Record<string, Fil['type']> = { sup: 'support', log: 'logistique' }

function Avatar({ f }: { f: Fil }) {
  if (f.type === 'support')
    return (
      <div className="p-04bprg">
        <img src={marque} alt="" className="p-1kg7e8" />
      </div>
    )
  if (f.type === 'logistique')
    return (
      <div className="p-unri0n">
        <Icone nom="r-camion" taille={20} className="p-v08d0o" />
      </div>
    )
  return (
    <div className="p-l1wrlu" aria-hidden="true">
      {(f.dossier?.id ?? 'CS').slice(0, 2)}
    </div>
  )
}

/** Dernier message lisible d'un fil (aperçu de la liste). */
function apercu(f: Fil, tx: (x: Message['modele']) => string, photo: string): string {
  const m = f.messages[f.messages.length - 1]
  if (!m) return ''
  return m.modele ? tx(m.modele) : m.texte || (m.pieces.length ? photo : '')
}

function Bulle({ m, moi, maintenant, enFile }: { m: Message; moi: string | null; maintenant: number; enFile: boolean }) {
  const { t, langue } = usePreferences()
  const tx = useTexte()
  const h = heureBulle(m.le, maintenant, langue)
  if (m.auteur === 'systeme') return <div className="pr08-sys">{(m.modele ? tx(m.modele) : m.texte) + ' · ' + h}</div>
  const photos = m.pieces.map((p, i) =>
    p.startsWith('data:') ? (
      <figure key={i} className="pr08-photo" style={{ margin: 0 }}>
        <img src={p} alt={t('Photo envoyée')} />
        <span>
          <Icone nom="r-appareil-photo" taille={16} />
          {t('Photo envoyée')}
        </span>
      </figure>
    ) : (
      <div key={i} className="p-mh860e">
        <Icone nom="r-appareil-photo" taille={18} className="p-v08d0o" />
        {t('Photo envoyée')}
      </div>
    ),
  )
  if (m.auteur === 'belivay')
    return (
      <div className="p-g4xk7z">
        <TexteTraduisible texte={m.texte} />
        <div className="p-qi3pmp">{`${m.signe === 'Support BelivaY' ? t('Support') : 'BelivaY'} · ${h}`}</div>
      </div>
    )
  const qui = m.signe && m.signe !== moi ? m.signe : t('Vous')
  return (
    <>
      {m.texte && (
        <div className="p-7nzqjl">
          {m.texte}
          <div className="p-ej335m">{[qui, h, enFile ? t('en attente d’envoi') : m.lu ? t('lu') : t('envoyé'), m.masque ? t('numéro masqué par BelivaY') : null].filter(Boolean).join(' · ')}</div>
        </div>
      )}
      {photos}
      {!m.texte && enFile && <div className="pr08-attente">{t('en attente d’envoi')}</div>}
    </>
  )
}

function EnTeteFil({ f }: { f: Fil }) {
  const { t, tf } = usePreferences()
  const tx = useTexte()
  const sup = useLecture(() => source.messages.support(), [f.id])
  let sous: string
  let pastille: { cls: string; texte: string }
  if (f.type === 'dossier' && f.dossier) {
    sous = `${tx(f.dossier.motif)} · ${f.dossier.colis}`
    const e = f.dossier.etape
    pastille = !f.ouvert || e === 'clos' ? { cls: 'p-rpzy79', texte: t('Clos') } : e === 'decision' ? { cls: 'p-rpzy79', texte: t('Décidé') } : e === 'recours' ? { cls: 'p-h4wlx0', texte: t('Recours') } : { cls: 'p-h4wlx0', texte: t('En examen') }
  } else if (f.type === 'logistique') {
    sous = t('Messages automatiques · officiel')
    pastille = { cls: 'p-nax3x4', texte: t('Officiel') }
  } else {
    const s = sup.donnees
    sous = s ? (s.moyenneMin !== null ? tf('Première réponse sous {h} h · moyenne {m} min', { h: s.delaiH, m: s.moyenneMin }) : tf('Première réponse sous {h} h', { h: s.delaiH })) : t('Support BelivaY')
    pastille = s && !s.ouvertMaintenant ? { cls: 'p-h4wlx0', texte: t('Fermé') } : { cls: 'p-rpzy79', texte: t('Ouvert') }
  }
  return (
    <div className="p-rj1mot">
      <div className="p-lmo74g">
        <h2 className="p-dfc4i3" style={{ margin: 0 }}>
          {tx(f.titre)}
        </h2>
        <div className="p-46lk2m">{sous}</div>
      </div>
      <span className={pastille.cls}>{pastille.texte}</span>
    </div>
  )
}

function FilOuvert({ id, brouillon }: { id: string; brouillon?: string }) {
  const { t, tf, langue } = usePreferences()
  const tx = useTexte()
  const s = useSession()
  const en = useEnLigne()
  const file = useFile()
  const maintenant = useHorloge()
  const l = useLecture(() => source.messages.fil(id), [id])
  const sup = useLecture(() => source.messages.support(), [id])
  const [texte, setTexte] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [retour, setRetour] = useState<{ ton: 'ok' | 'alerte'; texte: string } | null>(null)
  const [occupe, setOccupe] = useState(false)
  const champ = useRef<HTMLInputElement>(null)
  const prise = usePrisePhoto((p) => setPhoto(p))
  useEffect(() => {
    setTexte(brouillon ?? '')
    setPhoto(null)
    setRetour(null)
  }, [id, brouillon])
  if (l.erreur && !l.donnees) return <ErreurLecture relire={l.relire} />
  if (!l.donnees) return <Chargement lignes={2} />
  const f = l.donnees
  const moi = s.membre?.initiales ?? null
  const attente = new Set(enAttente(file, 'message').map((a) => 'MS-' + a.origine.cle))
  const rappel = sup.donnees?.rappelAvant ?? null
  const refus = (raison: string) =>
    t(
      raison === 'ferme' ? 'Ce fil est fermé : il reste lisible, sans nouvel envoi.' : raison === 'reponses_rapides_seulement' ? 'Fil officiel : répondez avec une réponse rapide.' : raison === 'deja_demande' ? 'Un rappel est déjà demandé : le support vous appelle.' : raison === 'vide' ? 'Écrivez un message ou joignez une photo.' : 'Envoi impossible : réessayez.',
    )

  const envoyer = async () => {
    if (occupe || (!texte.trim() && !photo)) return
    setOccupe(true)
    setRetour(null)
    try {
      const o = origine(maintenant)
      const pieces = photo ? [photo] : []
      const r = await geste(en, 'message', f.id, o, (src) => src.messages.envoyer(f.id, texte, pieces, o), { local: true, photos: pieces.length })
      if (r.etat === 'fait' && !r.r.ok) {
        setRetour({ ton: 'alerte', texte: refus(r.r.raison) })
        signal('erreur')
        return
      }
      setTexte('')
      setPhoto(null)
      setRetour({ ton: 'ok', texte: r.etat === 'en_file' ? t('Hors ligne : le message partira au retour du réseau.') : t('Message envoyé à BelivaY.') })
      signal('succes')
      l.relire()
      champ.current?.focus()
    } finally {
      setOccupe(false)
    }
  }
  const vite = async (i: number) => {
    if (occupe) return
    setOccupe(true)
    setRetour(null)
    try {
      const o = origine(maintenant)
      const r = await geste(en, 'message', f.id, o, (src) => src.messages.repondreVite(f.id, i, o), { local: true })
      if (r.etat === 'fait' && !r.r.ok) {
        setRetour({ ton: 'alerte', texte: refus(r.r.raison) })
        signal('erreur')
      } else {
        const avant = r.etat === 'fait' && r.r.ok ? r.r.rappelAvant : undefined
        setRetour({ ton: 'ok', texte: avant ? tf('Rappel demandé : le support vous appelle avant {h}.', { h: heure(avant, langue) }) : r.etat === 'en_file' ? t('Hors ligne : la réponse partira au retour du réseau.') : t('Réponse envoyée.') })
        signal('succes')
      }
      l.relire()
      sup.relire()
    } finally {
      setOccupe(false)
    }
  }
  const libre = f.saisieLibre && f.ouvert
  return (
    <div className="p-5whd7g" aria-label={tx(f.titre)} role="region">
      <EnTeteFil f={f} />
      <div className="p-smehhy" aria-live="polite">
        {f.messages.length === 0 && <div className="pr08-sys">{t('Aucun message : écrivez à BelivaY ci-dessous.')}</div>}
        {f.messages.map((m) => (
          <Bulle key={m.id} m={m} moi={moi} maintenant={maintenant} enFile={attente.has(m.id)} />
        ))}
      </div>
      {f.ouvert ? (
        <>
          {f.photoDemandee && (
            <div className="pr08-demande">
              <span>{tf('Photo demandée : {quoi}', { quoi: tx(f.photoDemandee) })}</span>
              <button type="button" className="pr08-btn pr08-accent" onClick={prise.ouvrir} disabled={prise.occupe}>
                <Icone nom="r-appareil-photo" taille={16} />
                {t('Prendre la photo')}
              </button>
            </div>
          )}
          <div className="p-3os40o" role="group" aria-label={t('Réponses rapides')}>
            {f.reponsesRapides.map((r, i) => {
              const estRappel = r.fr === 'Rappelez-moi'
              const bloque = estRappel && rappel !== null
              return (
                <button key={r.fr} type="button" className="p-rpzy79 pr08-pill pr08-cible" disabled={occupe || bloque} onClick={() => void vite(i)}>
                  {estRappel && <Icone nom="r-telephone" taille={14} />}
                  {tx(r)}
                </button>
              )
            })}
          </div>
          {rappel !== null && f.reponsesRapides.some((r) => r.fr === 'Rappelez-moi') && <div className="pr08-joint">{tf('Rappel demandé : le support vous appelle avant {h}.', { h: heure(rappel, langue) })}</div>}
          {photo && (
            <div className="pr08-joint">
              <img src={photo} alt={t('Photo jointe')} />
              <span className="r-grow">{t('Photo prête à envoyer')}</span>
              <button type="button" className="pr08-btn" onClick={() => setPhoto(null)}>
                {t('Retirer')}
              </button>
            </div>
          )}
          {prise.erreur && (
            <div className="pr08-joint" role="alert">
              {prise.erreur}
            </div>
          )}
          {retour && (
            <div className={retour.ton === 'ok' ? 'pr08-ok' : 'pr08-alerte'} role={retour.ton === 'ok' ? 'status' : 'alert'} style={{ margin: '10px 10px 0' }}>
              <Icone nom={retour.ton === 'ok' ? 'check' : 'r-alerte'} taille={18} />
              <span>{retour.texte}</span>
            </div>
          )}
          <form
            className="p-084o8i"
            onSubmit={(e) => {
              e.preventDefault()
              void envoyer()
            }}
          >
            {prise.input}
            <button type="button" aria-label={t('Joindre une photo')} className="p-id803n" disabled={!libre || prise.occupe} onClick={prise.ouvrir}>
              <Icone nom="r-appareil-photo" taille={19} className="p-emic6i" />
            </button>
            <input
              ref={champ}
              type="text"
              placeholder={libre ? t('Votre message') : t('Réponses rapides seulement')}
              aria-label={libre ? t('Votre message') : t('Réponses rapides seulement')}
              className="p-nmhanx"
              value={texte}
              maxLength={1000}
              disabled={!libre}
              onChange={(e) => setTexte(e.target.value)}
            />
            <button type="submit" aria-label={t('Envoyer')} className="p-0iud18 pr08-envoyer" disabled={!libre || occupe || (!texte.trim() && !photo)}>
              <Icone nom="r-envoyer" taille={18} className="p-gqbtfa" />
            </button>
          </form>
        </>
      ) : (
        <div className="pr08-ferme">
          {f.fermeLe !== null && f.lisibleJusqua !== null
            ? tf('Dossier clos le {le} : fil en lecture seule, gardé comme preuve jusqu’au {jusqua}.', { le: jourLong(f.fermeLe, langue), jusqua: jourLong(f.lisibleJusqua, langue) })
            : t('Fil fermé : en lecture seule, gardé comme preuve.')}
        </div>
      )}
    </div>
  )
}

export default function Messagerie() {
  const { t, tf, langue } = usePreferences()
  const tx = useTexte()
  const maintenant = useHorloge()
  const [params, setParams] = useSearchParams()
  const aller = useNavigate()
  const l = useLecture(() => source.messages.fils(), [])
  if (l.erreur && !l.donnees)
    return (
      <Ecran route="messagerie">
        <ErreurLecture relire={l.relire} />
      </Ecran>
    )
  if (!l.donnees)
    return (
      <Ecran route="messagerie">
        <Chargement lignes={3} />
      </Ecran>
    )
  const fils = l.donnees
  const demande = params.get('fil')
  const etat = params.get('etat')
  // Le fil d'un dossier vit dans le dossier (ARL-95) : « ?fil=T-CS-2207 » ou un toucher ouvre la page du dossier.
  const demandeDossier = fils.find((f) => f.id === demande && f.dossier)
  if (demandeDossier) return <Navigate replace to={chemin('dossier-litige', { id: demandeDossier.dossier!.id })} />
  const ici = fils.filter((f) => !f.dossier)
  // « messagerie?sujet=<lot, colis ou motif> » (Réception, fiche colis) : le fil du support, message commencé.
  const sujet = params.get('sujet')
  const brouillon = sujet ? (sujet === 'depot-sans-code' ? t('Le livreur n’a pas de code de dépôt.') + ' ' : tf('À propos de {sujet} : ', { sujet })) : undefined
  const choisi = ici.find((f) => f.id === demande) ?? (etat || sujet ? ici.find((f) => f.type === (ETATS_PROTOTYPE[etat ?? ''] ?? 'support')) : undefined) ?? ici.find((f) => f.photoDemandee) ?? ici.find((f) => f.nonLus > 0) ?? ici[0]
  const choisir = (f: Fil) => {
    signal('toucher')
    if (f.dossier) {
      // Lu en ouvrant le dossier, comme un fil.
      void source.messages.fil(f.id).finally(() => aller(chemin('dossier-litige', { id: f.dossier!.id })))
      return
    }
    setParams({ fil: f.id }, { replace: true })
  }
  return (
    <Ecran route="messagerie">
      <div className="p-0hxmj8 r-pile">
        {fils.length === 0 ? (
          <div className="r-vide">
            <div className="r-vide-i">
              <Icone nom="r-message" taille={28} />
            </div>
            <h2>{t('Aucun fil pour l’instant')}</h2>
            <p>{t('Vos échanges avec BelivaY apparaîtront ici : support, dossiers de constat, collectes et livraisons.')}</p>
          </div>
        ) : (
          <div className="p-ax5aok" role="list" aria-label={t('Fils de discussion')}>
            {fils.map((f) => {
              const on = f.id === choisi?.id
              const der = f.messages[f.messages.length - 1]
              return (
                <div role="listitem" key={f.id}>
                  <button type="button" className={on ? 'p-zfoaot' : 'p-cbru27'} aria-current={on ? 'true' : undefined} onClick={() => choisir(f)}>
                    <Avatar f={f} />
                    <div className="p-rnqj8n">
                      <div className="p-dfc4i3">{tx(f.titre)}</div>
                      <div className="p-ljn4n5">{apercu(f, tx, t('Photo envoyée'))}</div>
                    </div>
                    {f.nonLus > 0 ? <span className="p-rpzy79" aria-label={t('non lus') + ' : ' + f.nonLus}>{f.nonLus}</span> : der ? <span className="p-46lk2m">{quand(der.le, maintenant, langue)}</span> : null}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {choisi && <FilOuvert id={choisi.id} brouillon={sujet && choisi.type === 'support' ? brouillon : undefined} />}
        <div className="p-gh7puf">
          <Icone nom="r-cadenas" taille={18} className="p-672m16" />
          <div>
            {t('Vous écrivez uniquement à BelivaY, jamais directement à un client, un vendeur ou un livreur ; avec le livreur, l’appel masqué est ouvert pendant sa mission. Les messages servent de preuve.')}{' '}
            <Link className="pr08-lien" to={chemin('appel')}>
              {t('Appel masqué')}
            </Link>
          </div>
        </div>
      </div>
    </Ecran>
  )
}

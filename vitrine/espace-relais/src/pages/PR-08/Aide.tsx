// PR-08 · Aide. Structure du prototype intacte (Fig. 5) : marque et « Comment peut-on vous aider ? », recherche,
// carte verte « Parler à quelqu'un » (messagerie ou rappel, heures du support), « Questions fréquentes » dépliables (la
// première ouverte ; la septième « Panne générale : le mode papier »), « Écrire au support » (catégorie, référence du
// colis, message, photo, envoyer).
// Règles : AID-01 (support par la messagerie et le rappel, SUP-HORAIRES de DP-12 ; aucun lien WhatsApp), AID-02
// (réponses = règles, valeurs du registre, éditées en console), AID-03 (une demande crée un fil Support visible tout de
// suite), AID-04 (mode papier), AID-05 (avis injuste), GEN-08, ARL-06 (l'employé ne lit ni l'argent ni la convention),
// critères : chaque question se déplie et se replie ; « Parler à quelqu'un » sans WhatsApp.
// Enrichi : la recherche filtre questions, convention et fiches ; bandeau de la panne générale en cours ; « Fiches du
// comptoir » (page « aide-fiche ») ; « Convention et partenariat » (voir, demander, jamais décider) ; catégorie
// « Application » pour signaler un problème ; « Revoir la formation » ; états chargement, erreur, hors connexion.
import { useEffect, useId, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import marque from '../../assets/marque-belivay.png'
import { Ecran } from '../../composants/coque'
import { mouvementLibre } from '@client/composants/Animations'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { usePeut } from '../../config/droits'
import { geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import type { QuestionAide } from '../../donnees/domaines/aide'
import type { DemandeSupport } from '../../donnees/domaines/messages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Chargement, ErreurLecture, useTexte, usePrisePhoto } from './commun'
import './pr08.css'

const sansAccents = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

function Questions({ titre, liste, ouvertes, basculer }: { titre: string; liste: QuestionAide[]; ouvertes: Set<string>; basculer: (id: string) => void }) {
  const tx = useTexte()
  const base = useId()
  return (
    <div className="p-7ywyui">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{titre}</h2>
      </div>
      <div>
        {liste.map((q) => {
          const ouverte = ouvertes.has(q.id)
          const id = `${base}-${q.id}`
          return (
            <div key={q.id} className="p-jmaj5p" data-question={q.id}>
              <button type="button" className="p-q4rgm6" aria-expanded={ouverte} aria-controls={id} onClick={() => basculer(q.id)}>
                <span className="p-c838vt">{tx(q.question)}</span>
                <Icone nom={ouverte ? 'minus' : 'r-plus'} taille={18} className="p-672m16" />
              </button>
              {(
                <div id={id} hidden={!ouverte}>
                  <p className="p-ghg8qd pr08-faq-r">{tx(q.reponse)}</p>
                  {q.lien && (
                    <div className="pr08-liens">
                      <Link className="pr08-btn pr08-accent" to={chemin(q.lien.route, q.lien.params)}>
                        {tx(q.lien.libelle)}
                        <Icone nom="r-chevron-droite" taille={16} />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CATEGORIES: { id: DemandeSupport['categorie']; libelle: string; argent?: boolean }[] = [
  { id: 'reception', libelle: 'Réception' },
  { id: 'retrait', libelle: 'Retrait' },
  { id: 'stock', libelle: 'Stock' },
  { id: 'argent', libelle: 'Argent', argent: true },
  { id: 'application', libelle: 'Application' },
  { id: 'autre', libelle: 'Autre' },
]

function EcrireAuSupport() {
  const { t } = usePreferences()
  const en = useEnLigne()
  const maintenant = useHorloge()
  const naviguer = useNavigate()
  const argent = usePeut('voirMontantsRemuneration')
  const [categorie, setCategorie] = useState<DemandeSupport['categorie']>('reception')
  const [reference, setReference] = useState('')
  const [texte, setTexte] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const prise = usePrisePhoto(setPhoto)
  const envoyer = async () => {
    setErreur(null)
    if (!texte.trim() && !photo) {
      setErreur(t('Décrivez ce qui se passe, ou joignez une photo.'))
      signal('erreur')
      return
    }
    setOccupe(true)
    try {
      const o = origine(maintenant)
      const d: DemandeSupport = { categorie, reference: reference.trim() || null, texte, pieces: photo ? [photo] : [] }
      const r = await geste(en, 'message', 'support', o, (s) => s.messages.ecrireAuSupport(d, o), { local: true, photos: d.pieces.length })
      if (!r.r.ok) {
        setErreur(t(r.r.raison === 'reference_invalide' ? 'Référence inconnue : elle s’écrit BLV- puis 5 chiffres (BLV-00043-1).' : r.r.raison === 'reserve_au_gerant' ? 'Les questions d’argent sont réservées au gérant.' : 'Décrivez ce qui se passe, ou joignez une photo.'))
        signal('erreur')
        return
      }
      signal('succes')
      // AID-03 : la demande est tout de suite dans la Messagerie (un fil Support).
      naviguer(chemin('messagerie', 'filId' in r.r ? { fil: r.r.filId } : undefined))
    } finally {
      setOccupe(false)
    }
  }
  const ids = { ref: useId(), msg: useId() }
  return (
    <form
      className="p-yi6rkz"
      aria-labelledby={ids.msg + '-t'}
      onSubmit={(e) => {
        e.preventDefault()
        void envoyer()
      }}
    >
      <div className="p-unncbq">
        <h2 className="p-9j1bbu" id={ids.msg + '-t'}>
          {t('Écrire au support')}
        </h2>
      </div>
      <div className="p-8dmjde" role="group" aria-label={t('Catégorie')}>
        {CATEGORIES.filter((c) => !c.argent || argent).map((c) => (
          <button key={c.id} type="button" className={(c.id === categorie ? 'p-rpzy79' : 'p-6z26dm') + ' pr08-pill pr08-cible'} aria-pressed={c.id === categorie} onClick={() => setCategorie(c.id)}>
            {t(c.libelle)}
          </button>
        ))}
      </div>
      <label className="p-ky12xr" htmlFor={ids.ref}>
        {t('RÉFÉRENCE DU COLIS (SI CONCERNÉ)')}
      </label>
      <input id={ids.ref} type="text" placeholder={t('BLV-00000')} value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} className="p-vust5v" autoCapitalize="characters" spellCheck={false} maxLength={14} style={{ marginTop: -6 }} />
      <label className="p-ky12xr" htmlFor={ids.msg}>
        {t('MESSAGE')}
      </label>
      <textarea id={ids.msg} placeholder={t('Décrivez ce qui se passe')} className="p-p001dn" value={texte} maxLength={1000} onChange={(e) => setTexte(e.target.value)} style={{ marginTop: -6 }} />
      {prise.input}
      {photo && (
        <div className="pr08-joint" style={{ margin: 0 }}>
          <img src={photo} alt={t('Photo jointe')} />
          <span className="r-grow">{t('Photo prête à envoyer')}</span>
          <button type="button" className="pr08-btn" onClick={() => setPhoto(null)}>
            {t('Retirer')}
          </button>
        </div>
      )}
      <div aria-live="assertive">
        {(erreur || prise.erreur) && (
          <div className="pr08-alerte">
            <Icone nom="r-alerte" taille={18} />
            <span>{erreur ?? prise.erreur}</span>
          </div>
        )}
      </div>
      <div className="p-0cipe3">
        <button type="button" className="p-rbzobc" onClick={prise.ouvrir} disabled={prise.occupe}>
          <Icone nom="r-appareil-photo" taille={18} className="p-emic6i" />
          {photo ? t('Reprendre') : t('Photo')}
        </button>
        <button type="submit" className="p-ncx7qc" disabled={occupe || (!texte.trim() && !photo)}>
          <Icone nom="r-envoyer" taille={18} className="p-7dsggt" />
          {t('Envoyer')}
        </button>
      </div>
      <div className="pr08-note">{en ? t('Votre demande ouvre un fil dans la Messagerie : la réponse y arrive.') : t('Hors ligne : la demande partira au retour du réseau ; elle est déjà dans la Messagerie.')}</div>
    </form>
  )
}

export default function Aide() {
  const { t, tf, langue } = usePreferences()
  const tx = useTexte()
  const l = useLecture(() => source.aide.aide(), [])
  const [recherche, setRecherche] = useState('')
  // « aide?sujet=<question> » (l'accueil : « mode-papier ») : la question s'ouvre et vient à l'écran.
  const [params] = useSearchParams()
  const sujet = params.get('sujet')
  const [ouvertes, setOuvertes] = useState<Set<string>>(() => new Set([sujet ?? 'sans-code-depot']))
  useEffect(() => {
    if (!sujet || !l.donnees) return
    document.querySelector(`[data-question="${CSS.escape(sujet)}"]`)?.scrollIntoView({ block: 'center', behavior: mouvementLibre() ? 'smooth' : 'auto' })
  }, [sujet, l.donnees])
  if (l.erreur && !l.donnees)
    return (
      <Ecran route="aide">
        <ErreurLecture relire={l.relire} />
      </Ecran>
    )
  if (!l.donnees)
    return (
      <Ecran route="aide">
        <Chargement lignes={4} />
      </Ecran>
    )
  const a = l.donnees
  const q = sansAccents(recherche.trim())
  const trouve = (x: QuestionAide) => !q || sansAccents(tx(x.question) + ' ' + tx(x.reponse)).includes(q)
  const questions = a.questions.filter(trouve)
  const convention = a.convention.filter(trouve)
  const fiches = a.fiches.filter((f) => !q || sansAccents(tx(f.titre) + ' ' + tx(f.resume) + ' ' + f.etapes.map(tx).join(' ')).includes(q))
  // Une recherche ouvre les réponses trouvées (la question se replie toujours d'un geste).
  const visibles = q ? new Set([...questions, ...convention].map((x) => x.id).filter((id) => !ouvertes.has('-' + id))) : ouvertes
  const basculer = (id: string) => {
    signal('toucher')
    setOuvertes((s) => {
      const n = new Set(s)
      if (q) {
        // Pendant une recherche : « -id » = replié à la main.
        if (n.has('-' + id)) n.delete('-' + id)
        else n.add('-' + id)
      } else if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const rien = q && !questions.length && !convention.length && !fiches.length
  return (
    <Ecran route="aide">
      <div className="p-0hxmj8 r-pile">
        <div className="p-fr3af5">
          <img src={marque} alt="" className="p-w1wmof" />
          <h1 className="p-mtv6qr">{t('Comment peut-on vous aider ?')}</h1>
        </div>
        <label className="p-eqo33z">
          <Icone nom="r-recherche" taille={19} className="p-672m16" />
          <input type="search" placeholder={t('Code perdu, relais plein, versement…')} aria-label={t('Rechercher dans l’aide')} className="p-zg9k0q pr08-recherche" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </label>{' '}
        <Link to={chemin('messagerie', { etat: 'sup' })} className="p-fo9gyl">
          <div className="p-mt0bwh">
            <Icone nom="r-message" taille={24} className="p-sl1otg" />
          </div>
          <div className="p-lmo74g">
            <div className="p-buxdaz">{t('Parler à quelqu’un')}</div>
            <div className="p-fbqx8f">{tf('Messagerie ou rappel · {horaires}', { horaires: tx(a.support.horaires) }) + (a.support.ouvertMaintenant ? '' : ' · ' + t('fermé maintenant'))}</div>
          </div>
          <Icone nom="r-chevron-droite" taille={18} className="p-sl1otg" />
        </Link>
        {a.panne && (
          <Link className="pr08-alerte" to={chemin('mode-papier')} style={{ textDecoration: 'none' }}>
            <Icone nom="r-reseau" taille={18} />
            <span>
              <b>{t('Panne générale annoncée')}</b> · {a.panne.saisirAvant !== null ? tf('registre papier à saisir avant {quand}', { quand: `${jourLong(a.panne.saisirAvant, langue)} ${heure(a.panne.saisirAvant, langue)}` }) : t('tenez le registre papier')}
            </span>
          </Link>
        )}
        {rien && (
          <div className="r-vide" role="status">
            <div className="r-vide-i">
              <Icone nom="r-recherche" taille={28} />
            </div>
            <h2>{tf('Aucune réponse pour « {q} »', { q: recherche.trim() })}</h2>
            <p>{t('Écrivez au support ci-dessous : une personne vous répond.')}</p>
          </div>
        )}
        {questions.length > 0 && <Questions titre={t('Questions fréquentes')} liste={questions} ouvertes={visibles} basculer={basculer} />}
        {fiches.length > 0 && (
          <div className="p-yi6rkz">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">{t('Fiches du comptoir')}</h2>
            </div>
            <div className="pr08-fiches">
              {fiches.map((f) => (
                <Link key={f.id} className="pr08-fiche" to={chemin('aide-fiche', { id: f.id })}>
                  <Icone nom={f.icone} taille={20} />
                  <b>{tx(f.titre)}</b>
                  <span>{tx(f.resume)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        {convention.length > 0 && <Questions titre={t('Convention et partenariat')} liste={convention} ouvertes={visibles} basculer={basculer} />}
        <EcrireAuSupport />
        <Link className="pr08-lien-bloc" to={chemin('formation')}>
          <Icone nom="r-formation" taille={18} />
          {t('Revoir la formation')}
        </Link>
        <div className="pr08-note">{t('BelivaY ne vous écrit jamais sur WhatsApp pour le support : WhatsApp sert seulement à annoncer une panne générale.')}</div>
      </div>
    </Ecran>
  )
}

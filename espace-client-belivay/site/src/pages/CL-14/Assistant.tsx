// Écran « Assistant BelivaY » (CL-14 ; FF-IA), forme d'origine du prototype rendue réelle (DP-54) : la carte « Je
// réponds, je te propose, tu décides », la conversation en bulles (les tiennes, celles de l'assistant avec ses
// propositions : boutons, produits livrables à ton relais, notes), les raccourcis et la barre de saisie en bas
// (dictée si le téléphone la permet). L'assistant répond à partir des données du compte (commandes, retrait et
// garde, litiges, favoris en baisse, paiement en attente, catalogue livrable au relais) et propose ; il n'agit
// jamais sans accord : annuler un colis ou relancer un paiement passe par une confirmation (assistant-confirmer),
// le code de retrait n'est jamais écrit ici, et ce qu'il ne sait pas faire part chez un conseiller, avec
// l'échange (aussi depuis l'icône du casque, en haut).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { norme, score } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { useLieu } from '../../composants/PourQui'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type CommandePassee, type Favori, type Litige, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { etatDe } from '../CL-09/Commun'
import { Bloc } from './Commun'

// Une bulle : la tienne (« moi »), celle de l'assistant (« ia ») ou ta confirmation (« ok », pastille verte).
export interface Bulle {
  de: 'moi' | 'ia' | 'ok'
  texte: string
  actions?: { texte: string; vers: string; icone?: string; primaire?: boolean }[]
  produits?: { p: string; titre: string; dessin: string; prix: number; distance?: string | null }[]
  note?: string
}
interface Donnees {
  commandes: CommandeClient[]
  litiges: Litige[]
  favoris: Favori[]
  produits: Produit[]
  paiements: CommandePassee[]
}
// L'échange se garde le temps de la session (40 bulles), partagé avec la page de confirmation.
const CLE = 'blv_assistant'
export function lireFil(): Bulle[] {
  try {
    return JSON.parse(sessionStorage.getItem(CLE) || '[]') as Bulle[]
  } catch {
    return []
  }
}
export function ecrireFil(fil: Bulle[]) {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(fil.slice(-40)))
  } catch {
    // Stockage refusé : l'échange reste à l'écran.
  }
}

// La carte d'en-tête de l'assistant (aussi sous la feuille de confirmation).
export function CarteAssistant() {
  const { t } = usePreferences()
  return (
    <>
      {!INTERRUPTEURS_DU_LANCEMENT['FF-IA'] && (
        <div className="cl14-top">
          <span className="cl14-ff">
            <Icone nom="lock" taille={13} />
            {t('Après le lancement · interrupteur fermé')}
          </span>
          <span className="cl14-ffc">{t('FF-IA')}</span>
        </div>
      )}
      <div className="card row" style={{ gap: '12px' }}>
        <span className="ic-sq night">
          <Icone nom="bot" taille={22} />
        </span>
        <div className="grow">
          <div className="t14 b8">{t('Je réponds, je te propose, tu décides.')}</div>
          <div className="t12 c3" style={{ marginTop: '2px', lineHeight: '1.4' }}>
            {t('Je n’agis jamais sans ton accord. Suivi, code, litige et remboursement restent gratuits.')}
          </div>
        </div>
      </div>
    </>
  )
}

// La conversation : bulles de l'échange, précédées de ce que l'assistant propose de lui-même (avant).
export function Conversation({ fil, avant }: { fil: Bulle[]; avant?: ReactNode }) {
  const { t, tf } = usePreferences()
  return (
    <div className="cl14-chat">
      {avant}
      {fil.map((b, i) =>
        b.de === 'ok' ? (
          <div key={i} className="cl14-center">
            <span className="pill green sm">
              <Icone nom="check" taille={13} />
              {b.texte}
            </span>
          </div>
        ) : b.de === 'moi' ? (
          <div key={i} className="cl14-b me">
            {b.texte}
          </div>
        ) : (
          <div key={i} className="cl14-b ai">
            <div className="cl14-who">
              <Icone nom="bot" taille={15} />
              {t('Assistant BelivaY')}
            </div>
            {b.texte}
            <Bloc classe="g5-props">
            {b.produits?.map((x) => (
              <Link key={x.p} to={chemin('fiche', { p: x.p })} className="cl14-mini" style={{ color: 'inherit' }} aria-label={tf('Voir {p}', { p: x.titre })}>
                <span className="thumb" style={{ width: '52px', height: '52px', borderRadius: '13px' }}>
                  <Dessin id={x.dessin} />
                </span>
                <div className="grow">
                  <div className="t14 b7">{x.titre}</div>
                  <div className="mt4">
                    <span className="price">
                      {F(x.prix)}
                      <small>{t(' F')}</small>
                    </span>
                  </div>
                  {x.distance && (
                    <div className="cl14-meta">
                      <span>
                        <Icone nom="map-pin" taille={13} />
                        {x.distance}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
            </Bloc>
            {b.actions?.map((a) => (
              <div key={a.vers + a.texte} className="btns">
                <Link to={a.vers} className={'btn ' + (a.primaire ? 'primary' : 'secondary')}>
                  {a.icone && <Icone nom={a.icone} taille={18} />}
                  <span>{a.texte}</span>
                </Link>
              </div>
            ))}
            {b.note && (
              <div className="cl14-note" style={{ marginTop: '6px' }}>
                {b.note}
              </div>
            )}
          </div>
        ),
      )}
    </div>
  )
}

// La barre de saisie, fixée en bas : écrire, ou dicter quand le téléphone sait le faire.
type Reco = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void }
export function Saisie({ envoyer, q, setQ }: { envoyer: (q: string) => void; q: string; setQ: (q: string) => void }) {
  const { t, langue } = usePreferences()
  const [ecoute, setEcoute] = useState(false)
  const w = window as unknown as { SpeechRecognition?: new () => Reco; webkitSpeechRecognition?: new () => Reco }
  const Dictee = w.SpeechRecognition ?? w.webkitSpeechRecognition
  const dicter = () => {
    if (!Dictee || ecoute) return
    const r = new Dictee()
    r.lang = langue === 'en' ? 'en-US' : 'fr-FR'
    r.interimResults = false
    r.onresult = (e) => setQ(e.results[0]?.[0]?.transcript ?? '')
    r.onend = () => setEcoute(false)
    setEcoute(true)
    r.start()
  }
  return (
    <form
      className="cl14-in glass"
      onSubmit={(e) => {
        e.preventDefault()
        if (!q.trim()) return
        envoyer(q.trim())
        setQ('')
      }}
    >
      <input id="assistant-q" className="cl14-inp" style={{ color: 'var(--ink)' }} aria-label={t('Écris ta question')} placeholder={t(ecoute ? 'Je t’écoute…' : 'Écris ta question')} value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim() || !Dictee ? (
        <button type="submit" className="cl14-ib" aria-label={t('Envoyer')} style={q.trim() ? undefined : { opacity: 0.5 }}>
          <Icone nom="send" taille={20} />
        </button>
      ) : (
        <button type="button" className="cl14-ib" aria-label={t('Dicter')} onClick={dicter}>
          <Icone nom="mic" taille={20} />
        </button>
      )}
    </form>
  )
}

export function Assistant() {
  const { t, tf, langue } = usePreferences()
  const lieuR = useLieu()
  const session = useSession()
  const [params, setParams] = useSearchParams()
  const [d, setD] = useState<Donnees | null>(null)
  const [fil, setFil] = useState<Bulle[]>(lireFil)
  const [q, setQ] = useState('')
  const bas = useRef<HTMLDivElement>(null)
  // Dès 1024 px : la conversation dans une colonne de 760 centrée, la saisie collée en bas de la colonne ; dès
  // 1200 px, les raccourcis dans un aside à droite (§ 5.12).
  const grand = useDes('tab-l')
  const pc = useDes('pc')
  useEffect(() => {
    Promise.all([source.commandes(), source.litiges(), source.favoris(), source.produits(), source.paiementsEnAttente()]).then(([c, l, f, p, pa]) => setD({ commandes: c.commandes, litiges: l.litiges, favoris: f.favoris, produits: p, paiements: pa }))
  }, [])
  useEffect(() => {
    ecrireFil(fil)
    bas.current?.scrollIntoView({ block: 'end' })
  }, [fil])

  const conseiller = (sansAide: boolean): Bulle => ({
    de: 'ia',
    texte: (sansAide ? t('Je n’arrive pas à t’aider sur ce point.') + ' ' : '') + t('Je te passe à un conseiller : il lit notre échange, tu n’as rien à répéter.'),
    actions: [
      { texte: t('Écrire à un conseiller'), vers: chemin('fil', { id: 'support', st: 'nouveau' }), icone: 'message-circle', primaire: true },
      { texte: t('Être rappelé'), vers: chemin('rappel'), icone: 'phone' },
    ],
    note: t('Réponse sous 4 h ouvrées, de 7 h à 21 h, 7 jours sur 7.'),
  })

  // Ce que l'assistant comprend : retrait, suivi, litige, annulation, paiement, recherche ; sinon, un conseiller.
  const repondre = (question: string): Bulle => {
    if (!d) return conseiller(true)
    const n = norme(question)
    const ref = question.toUpperCase().match(/BLV-\d{5}/)?.[0]
    const cmd = ref ? d.commandes.find((c) => c.ref === ref) : null
    if (/annul/.test(n)) {
      const c = cmd ?? d.commandes.find((x) => x.etat === 'preparation')
      const x = c?.colis.find((y) => !y.annule && y.statut !== 'recupere' && (n.includes(norme(y.produit).split(' ')[0]) || c.colis.length === 1)) ?? c?.colis.find((y) => !y.annule && y.statut !== 'recupere')
      if (!c || c.etat !== 'preparation' || !x) return { de: 'ia', texte: t('Aucune commande ne peut plus être annulée : les colis sont partis ou retirés. À leur arrivée, tu peux refuser un colis au comptoir : cela ouvre un litige.') }
      return { de: 'ia', texte: tf('Je te propose d’annuler le Colis {n} ({b}) de {ref}. Vérifie, puis confirme : rien ne se passe sans ton accord.', { n: x.n, b: t(x.boutique), ref: c.ref }), actions: [{ texte: t('Voir la proposition'), vers: chemin('assistant-confirmer', { ref: c.ref, n: String(x.n) }), icone: 'package-x' }] }
    }
    if (/paiement|payer|relance/.test(n)) {
      const p = d.paiements[0]
      return p
        ? { de: 'ia', texte: tf('Ta commande de {m} F attend encore ta validation : rien n’a été débité. Je te propose de payer maintenant.', { m: F(p.montant) }), actions: [{ texte: t('Voir la proposition'), vers: chemin('assistant-confirmer', { action: 'paiement', ref: p.ref }), icone: 'smartphone' }] }
        : { de: 'ia', texte: t('Aucun paiement n’attend ta validation.'), actions: [{ texte: t('Mes commandes'), vers: chemin('commandes') }] }
    }
    if (/litige|casse|abime|probleme|rembours/.test(n)) {
      const l = d.litiges.find((x) => ['attente', 'conteste', 'silence', 'examen', 'arrangement'].includes(x.etat))
      return l
        ? { de: 'ia', texte: tf('Ton litige {id} ({p}) est ouvert. Le vendeur a jusqu’au {d} pour répondre ; tes {m} F restent bloqués en attendant.', { id: l.id, p: t(l.produit), d: dateA(l.echeance, langue), m: F(l.montant) }), actions: [{ texte: tf('Suivre {id}', { id: l.id }), vers: chemin('litige-suivi', { id: l.id }), icone: 'scale' }, { texte: t('Signaler un nouveau problème'), vers: chemin('litiges') }], note: t('Pour un nouveau problème, je t’ouvre le formulaire de litige : rien ne part sans toi.') }
        : { de: 'ia', texte: t('Tu n’as aucun litige en cours. Pour signaler un problème sur une commande retirée, ouvre-la et touche « Signaler un problème ».'), actions: [{ texte: t('Mes commandes'), vers: chemin('commandes', { onglet: 'terminees' }) }] }
    }
    if (/retir|colis|ou est|suivi|quand|code|garde|commande/.test(n) || cmd) {
      const c = cmd ?? d.commandes.find((x) => x.etat === 'retirable') ?? d.commandes.find((x) => ['preparation', 'route', 'comptoir'].includes(x.etat))
      if (!c) return { de: 'ia', texte: t('Tu n’as aucune commande en cours.'), actions: [{ texte: t('Mes commandes'), vers: chemin('commandes') }] }
      const e = etatDe(c)
      const detail =
        c.etat === 'retirable'
          ? tf('Tes {n} colis sont au {l}. Tu peux les retirer maintenant, aux heures d’ouverture. Garde due : {g} F aujourd’hui, {h} F demain.', { n: c.colis.length, l: t(c.lieu), g: F(c.garde?.du ?? 0), h: F(c.garde?.demain ?? 0) })
          : c.etat === 'comptoir'
            ? tf('Ta commande est au {l} : tu paies {m} F au comptoir en Mobile Money, puis ton code se débloque.', { l: t(c.lieu), m: F(c.comptoir?.du ?? 0) })
            : c.pretLe
              ? tf('{ref} est {e}. Retrait prévu au {l} vers le {d}.', { ref: c.ref, e: (e.v ? tf(e.texte, e.v) : t(e.texte)).toLowerCase(), l: t(c.lieu), d: dateA(c.pretLe, langue) })
              : tf('{ref} : {e}.', { ref: c.ref, e: e.v ? tf(e.texte, e.v) : t(e.texte) })
      const retirable = c.etat === 'retirable'
      return { de: 'ia', texte: detail, actions: [{ texte: t(retirable ? 'Afficher mon code' : 'Suivre la commande'), vers: chemin(retirable ? 'code' : 'suivi', { ref: c.ref }), icone: retirable ? 'qr-code' : 'package' }], note: c.code ? t('Ton code reste dans Mes commandes : je ne l’écris jamais ici.') : undefined }
    }
    const mots = question.replace(/^(je cherche|je veux|trouve|trouver)\s+(un|une|des|le|la)?\s*/i, '')
    const trouves = d.produits.map((p) => ({ p, s: score(p, mots) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3)
    if (/cherche|trouve|veux|acheter|prix/.test(n) || trouves.length)
      return trouves.length
        ? { de: 'ia', texte: t('Voici ce qui est livrable à ton relais :'), produits: trouves.map(({ p }) => ({ p: p.p, titre: t(p.titre), dessin: p.dessins[0] ?? '', prix: p.prix, distance: p.distance })) }
        : { de: 'ia', texte: lieuR.r('Rien de livrable à ton relais pour « {q} » pour l’instant. Je peux t’en prévenir quand ça arrive.', { q: mots }), actions: [{ texte: t('Préviens-moi'), vers: chemin('recherche-resultats', { q: mots }), icone: 'bell' }] }
    return conseiller(true)
  }
  const envoyer = (texte: string) => {
    if (!texte.trim()) return
    setFil((f) => [...f, { de: 'moi', texte: texte.trim() }, repondre(texte)])
  }
  // Une question posée depuis la page de confirmation (?q=…) : posée ici, puis retirée de l'adresse.
  // « Parler à un conseiller » depuis une autre page (?st=humain) : le conseiller est proposé ici.
  const qAdresse = params.get('q')
  const humain = params.get('st') === 'humain'
  useEffect(() => {
    if (!d || (!qAdresse && !humain)) return
    if (qAdresse) envoyer(qAdresse)
    else setFil((f) => [...f, conseiller(false)])
    setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, qAdresse, humain])
  if (!d) return null

  const retirable = d.commandes.find((c) => c.etat === 'retirable')
  const baisse = d.favoris.find((f) => f.prixAvant && f.prix < f.prixAvant)
  const paiement = d.paiements[0]
  const proactif = (
    <>
      <div className="cl14-b ai">
        <div className="cl14-who">
          <Icone nom="bot" taille={15} />
          {t('Assistant BelivaY')}
        </div>
        {retirable || baisse || paiement ? tf('Bonjour {p}. Ce qui est utile pour toi aujourd’hui :', { p: session.client?.prenom ?? '' }) : tf('Bonjour {p}. Rien ne t’attend aujourd’hui : pose-moi ta question.', { p: session.client?.prenom ?? '' })}
        {retirable && (
          <>
            <div className="cl14-mini">
              <span className="ic-sq or">
                <Icone nom="package-check" taille={22} />
              </span>
              <div className="grow">
                <div className="t14 b7">{tf('{ref} t’attend au {l}', { ref: retirable.ref, l: t(retirable.lieu) })}</div>
                <div className="t12 c3 mt4">{tf('{g} F dus aujourd’hui, {h} F demain', { g: F(retirable.garde?.du ?? 0), h: F(retirable.garde?.demain ?? 0) })}</div>
              </div>
            </div>
            <div className="btns">
              <Link to={chemin('code', { ref: retirable.ref })} className="btn secondary">
                <Icone nom="qr-code" taille={18} />
                <span>{t('Afficher mon code')}</span>
              </Link>
            </div>
          </>
        )}
        {paiement && (
          <>
            <div className="cl14-mini">
              <span className="ic-sq or">
                <Icone nom="smartphone" taille={22} />
              </span>
              <div className="grow">
                <div className="t14 b7">{tf('{ref} attend ton paiement', { ref: paiement.ref })}</div>
                <div className="t12 c3 mt4">{tf('{m} F · rien n’a été débité', { m: F(paiement.montant) })}</div>
              </div>
            </div>
            <div className="btns">
              <Link to={chemin('assistant-confirmer', { action: 'paiement', ref: paiement.ref })} className="btn secondary">
                <span>{t('Voir la proposition')}</span>
              </Link>
            </div>
          </>
        )}
        {baisse && (
          <>
            <div className="cl14-mini">
              <span className="thumb" style={{ width: '44px', height: '44px', borderRadius: '11px' }}>
                <Dessin id={baisse.dessin} />
              </span>
              <div className="grow">
                <div className="t14 b7">{t('Baisse de prix dans tes favoris')}</div>
                <div className="t12 c3 mt4">{tf('{p} : {m} F au lieu de {a} F', { p: t(baisse.titre), m: F(baisse.prix), a: F(baisse.prixAvant!) })}</div>
              </div>
            </div>
            <div className="btns">
              <Link to={chemin('fiche', { p: baisse.p })} className="btn secondary">
                <span>{tf('Voir {p}', { p: t(baisse.titre) })}</span>
              </Link>
            </div>
          </>
        )}
      </div>
      <div className="cl14-note cl14-center">{t('Ces propositions restent ici : ni notification, ni SMS.')}</div>
    </>
  )
  const raccourci = (texte: string, icone?: string) => (
    <a key={texte} href="#" className="chip" onClick={(e) => (e.preventDefault(), envoyer(t(texte)))}>
      {icone && <Icone nom={icone} taille={15} />}
      {t(texte)}
    </a>
  )
  const raccourcis = (
    <div className="chips">
      {raccourci('Annuler un colis', 'package-x')}
      {paiement && raccourci('Relancer mon paiement', 'smartphone')}
      {raccourci('Où est mon colis ?')}
      <a
        href="#"
        className="chip"
        onClick={(e) => {
          e.preventDefault()
          setQ(t('Je cherche '))
          document.getElementById('assistant-q')?.focus()
        }}
      >
        {t('Trouver un produit')}
      </a>
      {raccourci('Mon litige')}
      {raccourci('Je cherche un ventilateur')}
      {fil.length > 0 && (
        <a href="#" className="chip" onClick={(e) => (e.preventDefault(), setFil([]))}>
          {t('Effacer l’échange')}
        </a>
      )}
    </div>
  )
  return (
    <Ecran
      route="assistant"
      action={
        <a href="#" className="ibtn" aria-label={t('Parler à un conseiller')} onClick={(e) => (e.preventDefault(), setFil((f) => [...f, conseiller(false)]))}>
          <Icone nom="headset" taille={22} />
        </a>
      }
      largeur="moyen"
      fixes={grand ? undefined : <Saisie envoyer={envoyer} q={q} setQ={setQ} />}
    >
      <Styles id="02f3dac5cd" />
      <Bloc classe="g5-assist">
      <Bloc classe="g5-assist-c">
      <CarteAssistant />
      <Conversation fil={fil} avant={proactif} />
      <div ref={bas} />
      {!pc && raccourcis}
      {grand ? <Saisie envoyer={envoyer} q={q} setQ={setQ} /> : <div style={{ height: '96px' }} />}
      </Bloc>
      {pc && (
        <aside className="g5-assist-r" aria-label={t('Je peux t’aider à…')}>
          <div className="kick">{t('Je peux t’aider à…')}</div>
          {raccourcis}
        </aside>
      )}
      </Bloc>
    </Ecran>
  )
}

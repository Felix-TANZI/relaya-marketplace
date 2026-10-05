// Écran « Messagerie » (CL-13 ; CMS-01 à CMS-12), balisage du prototype du 1er octobre, repris à la main et
// rendu logique (DP-53) : les conversations viennent des données (dossiers, vendeurs, support), avec le dernier
// échange, le moment (heure le jour même, sinon le jour) et les messages non lus ; sans conversation, l'état
// vide. « Écrire au support » ouvre une nouvelle demande. DP-54 : une conversation réglée le dit, une recherche
// sans résultat se défait d'un toucher, et les horaires et délais du support (DP-12) sont rappelés.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type Conversation } from '../../donnees/source'
import { quandCourt } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { DetailVide, EcranCompte, MaitreDetail, useMaitreDetail } from './Larges'

type Donnees = { conversations: (Conversation & { liste?: { icone?: string; dessin?: string } })[]; maintenant: number }

function useConversations(): [Donnees | null, () => void] {
  const [d, setD] = useState<Donnees | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let vivant = true
    source.conversations().then((x) => vivant && setD(x))
    return () => {
      vivant = false
    }
  }, [version])
  return [d, () => setVersion((v) => v + 1)]
}

export function Messagerie() {
  const { t } = usePreferences()
  const [params] = useSearchParams()
  const [d, recharger] = useConversations()
  // Dès 1024 px : maître-détail, les conversations à gauche, le fil choisi à droite (Fil.tsx, « ?id= »).
  const md = useMaitreDetail('tab-l')
  if (!d) return null

  if (params.get('st') === 'vide' || !d.conversations.length)
    return (
      <EcranCompte route="messagerie" parEtat etat="messagerie?st=vide">
        <div className="card ">
          <div className="empty">
            <div className="ei">
              <Icone nom="messages-square" taille={26} />
            </div>
            <h3>{t('Aucune conversation')}</h3>
            <p>{t('Une question ? Regarde d’abord les questions fréquentes, ou écris au support.')}</p>
            <div className="btns">
              <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="btn primary">
                <Icone nom="messages-square" taille={18} />
                <span>{t('Écrire au support')}</span>
              </Link>
            </div>
            <div className="links">
              <Link to={chemin('faq', { t: 'paiement' })}>{t('Questions fréquentes')}</Link>
            </div>
          </div>
        </div>
      </EcranCompte>
    )

  return (
    <EcranCompte route="messagerie" parEtat etat="messagerie">
      {md ? (
        <MaitreDetail des="tab-l" etiquette="Conversation" liste={<CorpsListe d={d} recharger={recharger} md />} detail={<DetailVide icone="messages-square" texte="Choisis une conversation" />} />
      ) : (
        <CorpsListe d={d} recharger={recharger} />
      )}
    </EcranCompte>
  )
}

// Liste des conversations seule, pour le maître-détail du fil (Fil.tsx), « actif » : la conversation ouverte.
export function ListeConversations({ actif }: { actif: string }) {
  const [d, recharger] = useConversations()
  if (!d) return null
  return <CorpsListe d={d} recharger={recharger} md actif={actif} />
}

// Recherche, filtres et conversations. En maître-détail (« md ») : « Écrire au support » en tête, la ligne ouverte
// allumée, et l'ouverture d'une conversation remplace l'adresse (pas de nouvelle entrée d'historique).
function CorpsListe({ d, recharger, md, actif }: { d: Donnees; recharger: () => void; md?: boolean; actif?: string }) {
  const { t, tf, langue } = usePreferences()
  // Recherche et filtres (DP-54).
  const [cherche, setCherche] = useState('')
  const [filtre, setFiltre] = useState<'tout' | 'nonlus' | 'dossier' | 'vendeur' | 'support'>('tout')
  // « Toi : « … » » : le texte écrit par la cliente reste tel quel, la phrase se traduit.
  const apercu = (a: string) => {
    const m = /^Toi\u00A0: «\u00A0(.*)\u00A0»$/.exec(a)
    return m ? tf('Toi : « {texte} »', { texte: m[1] }) : t(a)
  }
  // Dans l'ordre du serveur (la conversation où l'on vient d'écrire remonte en tête).
  const dernier = (c: Conversation) => c.messages[c.messages.length - 1]?.le ?? 0
  const norme = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const nonLus = d.conversations.reduce((n, c) => n + c.nonLus, 0)
  const liste = d.conversations.filter(
    (c) =>
      (filtre === 'tout' || (filtre === 'nonlus' ? c.nonLus > 0 : c.type === filtre)) &&
      (!cherche.trim() || norme(t(c.titre) + ' ' + c.apercu + ' ' + c.id).includes(norme(cherche.trim()))),
  )
  const FILTRES: [typeof filtre, string][] = [
    ['tout', 'Toutes'],
    ['nonlus', nonLus ? `Non lues (${nonLus})` : 'Non lues'],
    ['dossier', 'Dossiers'],
    ['vendeur', 'Vendeurs'],
    ['support', 'Support'],
  ]
  const ecrire = (
    <div className="btns mt16">
        <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="btn primary">
          <Icone nom="messages-square" taille={18} />
          <span>{t('Écrire au support')}</span>
        </Link>
    </div>
  )
  return (
    <>
      {md && ecrire}
      <p className="cl13-intro">{t('Tes échanges avec BelivaY et les vendeurs, gardés par écrit.')}</p>
      <div className="inp mt12">
        <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        <input type="search" aria-label={t('Chercher une conversation')} placeholder={t('Chercher : commande, dossier, mot…')} value={cherche} onChange={(e) => setCherche(e.target.value)} />
      </div>
      <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
        {FILTRES.map(([k, x]) => (
          <a key={k} href="#" className={'chip' + (filtre === k ? ' on' : '')} aria-pressed={filtre === k} onClick={(e) => (e.preventDefault(), setFiltre(k))}>
            {t(x)}
          </a>
        ))}
      </div>
      {nonLus > 0 && (
        <div className="links" style={{ justifyContent: 'flex-end' }}>
          <a href="#" onClick={(e) => (e.preventDefault(), source.marquerToutLu().then(recharger))}>
            {t('Tout marquer comme lu')}
          </a>
        </div>
      )}
      {!liste.length && (
        <>
          <p className="t13 c3" style={{ textAlign: 'center' }}>{t('Aucune conversation ne correspond.')}</p>
          <div className="links">
            <a href="#" onClick={(e) => (e.preventDefault(), setCherche(''), setFiltre('tout'))}>
              {t('Voir toutes les conversations')}
            </a>
          </div>
        </>
      )}
      <div className="card tight">
        {liste.map((c) => (
          <Link key={c.id} to={chemin('fil', { id: c.id })} replace={md} className={'li' + (c.id === actif ? ' on' : '')} aria-current={c.id === actif ? 'true' : undefined}>
            {c.liste?.dessin ? (
              <span className="thumb" style={{ width: '40px', height: '40px', borderRadius: '12px' }}>
                <Dessin id={c.liste.dessin} />
              </span>
            ) : (
              <span className={'ic ' + (c.type === 'dossier' ? 'or' : '')}>
                <Icone nom={c.liste?.icone ?? 'messages-square'} taille={20} />
              </span>
            )}
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(c.titre)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {c.resolue ? t('Réglée') + ' · ' : ''}
                {apercu(c.apercu)}
              </span>
            </span>
            {c.nonLus > 0 ? (
              <span className="col" style={{ alignItems: 'flex-end', gap: '6px' }}>
                <span className="t12 b7 c3">{quandCourt(dernier(c), d.maintenant, langue)}</span>
                <span className="badge-num">{c.nonLus}</span>
              </span>
            ) : (
              <span className="t12 b7 c3">{quandCourt(dernier(c), d.maintenant, langue)}</span>
            )}
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        ))}
      </div>
      {!md && ecrire}
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Un problème sur une commande ? Ouvre-la et touche « Signaler un problème ».')}</span>
      </div>
      <div className="hint-l">
        <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Le support répond sous 2 h, de 7 h à 21 h, 7 jours sur 7. Photos et captures d’écran s’envoient dans la conversation, jamais par WhatsApp.')}</span>
      </div>
      <div className="links">
        <Link to={chemin('faq', { t: 'paiement' })}>{t('Questions fréquentes')}</Link>
        <Link to={chemin('aide')}>{t('Aide et contacts')}</Link>
      </div>
    </>
  )
}

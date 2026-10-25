// Reçu vendeur (VD-06, route « recu ») — balisage du prototype, branché sur la source (GET /orders/{id}/receipt) et
// rendu logique :
// - le reçu de la commande de l'adresse (?ref=), sinon le plus récent ; les puces du prototype (« exemples de moyens de
//   paiement ») deviennent les vrais reçus de la boutique, le plus récent d'abord, et « Tous » ouvre la liste avec
//   une recherche (référence ou article) ;
// - prix de vente et « Vous gardez · versés sans frais » (figé au paiement), aucune ligne de commission (RCU-01) ; la
//   mention « pas une facture fiscale » et « Voir mes documents » (RCU-02) ; « Identité masquée » et ce qui est caché
//   (RCU-03) ; « BelivaY, mandataire » expliqué sur place (RCU-04) ; un libellé par moyen de paiement (Q-87) ;
// - « Partager le reçu », seul bouton plein (VD06-R16) : un PDF, par la feuille de partage du téléphone, sinon
//   enregistré ; « Télécharger le PDF » ; ajouts : où en est cet argent (libération, vendredi du versement), la
//   commande et son journal ;
// - payable au retrait pas encore payé : pas de reçu tant que rien n'est encaissé ; accès Préparation : réservé au
//   propriétaire (403 owner_only). Défaut 2 du prototype corrigé (puce active lisible en sombre, vendeur.css).
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { jouer } from '@client/composants/Sons'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { enregistrerFichier, partagerFichier, pdfTexte } from '@client/donnees/pdf'
import logo from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { MoyenPaiement, Recu as RecuT, RecuResume } from '../../donnees/domaines/remise'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { DECALAGE_YAOUNDE_MS } from '../../calculs/temps'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { ErreurLecture, Squelette } from '../VD-04/commun'

const JOURS = { fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
const MOIS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }
/** « lun. 21 sept. 2026 » · « Mon 21 Sept 2026 » (heure de Yaoundé). */
function dateCourte(ms: number, l: 'fr' | 'en') {
  const d = new Date(ms + DECALAGE_YAOUNDE_MS)
  return `${JOURS[l][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[l][d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
const jourDuVendredi = (j: string, l: 'fr' | 'en') => dateCourte(new Date(j + 'T12:00:00Z').getTime() - DECALAGE_YAOUNDE_MS, l)

// Un libellé par moyen de paiement (Q-87) ; la ligne du dessous dit qui paie les frais.
const MOYENS: Record<MoyenPaiement, { icone: string; libelle: string; sous?: string }> = {
  momo: { icone: 'smartphone', libelle: 'Mobile Money' },
  comptoir: { icone: 'smartphone', libelle: 'Mobile Money au comptoir', sous: 'Payé au retrait' },
  carte: { icone: 'credit-card', libelle: 'Carte bancaire', sous: 'Frais de carte (2 %) payés par le client' },
  apple: { icone: 'apple', libelle: 'Apple Pay', sous: 'Frais de carte (2 %) payés par le client' },
  google: { icone: 'gpay-g', libelle: 'Google Pay', sous: 'Frais de carte (2 %) payés par le client' },
  wallet: { icone: 'wallet', libelle: 'Wallet BelivaY du client', sous: 'Sans frais' },
  usd: { icone: 'globe', libelle: 'Depuis l’étranger · carte en dollars US', sous: 'Frais compris, payés par le client' },
  eur: { icone: 'globe', libelle: 'Depuis l’étranger · carte en euros', sous: 'Frais compris, payés par le client' },
}

function Ligne({ k, v, sous }: { k: string; v: ReactNode; sous?: string }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v ">
        {v}
        {sous && (
          <span className="t12 c3" style={{ display: 'block', fontWeight: '600', marginTop: '2px' }}>
            {sous}
          </span>
        )}
      </span>
    </div>
  )
}

export default function Recu() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const [params] = useSearchParams()
  const refParam = params.get('ref')
  const lecture = useLecture(async () => {
    const recus = await source.remise.recus()
    const ref = refParam ?? recus[0]?.ref ?? null
    return { recus, recu: ref ? await source.remise.recu(ref) : null, ref }
  }, [refParam, s.membre?.role])
  const tous = useFeuille('recus')
  const [cherche, setCherche] = useState('')
  const [avis, setAvis] = useState<string | null>(null)
  const d = lecture.donnees
  const ref = d?.ref ?? refParam ?? ''
  const titre = tf('Reçu · {ref}', { ref })
  const liste = useMemo(() => {
    const q = cherche.trim().toLowerCase()
    return (d?.recus ?? []).filter((x) => !q || x.ref.toLowerCase().includes(q) || x.titre.toLowerCase().includes(q))
  }, [d, cherche])

  const ecran = (contenu: ReactNode, fixes?: ReactNode) => (
    <Ecran route="recu" titre={titre} retour={chemin('commandes', { f: 'fin' })} fixes={fixes}>
      {contenu}
    </Ecran>
  )
  if (lecture.erreur) return ecran(<ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />)
  if (!d) return ecran(<Squelette cartes={2} />)

  const feuille = (
    <Feuille ouverte={tous.ouverte} fermer={tous.fermer} titre={t('Tous mes reçus')}>
      <h2 className="b8" style={{ fontSize: '20px', margin: '0 0 4px' }}>
        {t('Tous mes reçus')}
      </h2>
      <p className="t13 c3" style={{ margin: '0 0 10px' }}>
        {tf('{n} reçus · sans donnée du client', { n: d.recus.length })}
      </p>
      <label className="vd6-cherche">
        <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)' }} />
        <input type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder={t('Référence ou article')} aria-label={t('Chercher un reçu')} />
      </label>
      <div className="vd6-liste">
        {liste.length === 0 && <p className="t13 c3 center" style={{ padding: '16px 0' }}>{t('Aucun reçu ne correspond.')}</p>}
        {liste.map((x: RecuResume) => (
          <Link key={x.ref} to={chemin('recu', { ref: x.ref })} replace className="li">
            <Vignette nom={x.dessin} taille={40} />
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {`${x.ref} · ${t(x.titre)}`}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {x.encaisseA ? tf('Encaissé le {date} · vous gardez {g}', { date: dateCourte(x.encaisseA, langue), g: t(`${F(x.garde)} F`) }) : ''}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        ))}
      </div>
    </Feuille>
  )

  const puces = (
    <div className="vx-chips" role="group" aria-label={t('Mes reçus')}>
      {d.recus.slice(0, 6).map((x) => (
        <Link key={x.ref} to={chemin('recu', { ref: x.ref })} replace className={x.ref === d.ref ? 'on' : ''} aria-current={x.ref === d.ref ? 'page' : undefined}>
          <Icone nom="receipt" taille={14} />
          {x.ref}
        </Link>
      ))}
      <a role="button" tabIndex={0} onClick={tous.ouvrir} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tous.ouvrir())} style={{ cursor: 'pointer' }}>
        <Icone nom="list" taille={14} />
        {t('Tous')}
      </a>
    </div>
  )

  const r: RecuT | null = d.recu
  if (!r || r.encaisseA === null)
    return ecran(
      <>
        {d.recus.length > 0 && puces}
        <div className="empty" style={{ marginTop: '18px' }}>
          <div className="ei">
            <Icone nom="receipt" taille={26} />
          </div>
          <h3>{r ? t('Pas encore de reçu') : d.ref ? t('Aucun reçu pour cette commande') : t('Aucun reçu pour l’instant')}</h3>
          <p>{r ? t('Payable au retrait : le reçu s’établit quand le client a payé au comptoir.') : t('Chaque commande encaissée a son reçu, à partager en PDF.')}</p>
        </div>
      </>,
      feuille,
    )

  const m = MOYENS[r.moyen]
  const article = `${r.article.titre} · ${t(r.article.variante)} · ${t(r.article.etat.toLowerCase())} · ×${r.quantite}`
  const pdf = () =>
    pdfTexte([
      { texte: 'BelivaY', taille: 22, gras: true },
      { texte: `${t('Reçu vendeur')} · ${r.ref}`, taille: 15, gras: true, espace: 10 },
      { texte: tf('Encaissé le {date} à {h}', { date: dateCourte(r.encaisseA!, langue), h: heure(r.encaisseA!, langue) }), taille: 10 },
      { texte: `${t('Article')} : ${article}`, espace: 18 },
      { texte: `${t('Classe du colis')} : ${r.colis}` },
      { texte: `${t('Client')} : ${t('Identité masquée')} (${t('ni nom, ni numéro, ni adresse, ni relais')})` },
      { texte: `${t('Encaissé par')} : ${t('BelivaY, mandataire')} · ${t(m.libelle)}` },
      { texte: t('Prix de vente'), droite: t(`${F(r.prix)} F`), espace: 8 },
      { texte: t('Vous gardez'), droite: t(`${F(r.garde)} F`), gras: true },
      { texte: t('Ce reçu n’est pas une facture fiscale. La facture de BelivaY est mensuelle : elle est rangée dans Documents.'), taille: 9, espace: 24 },
    ])
  const nomFichier = `recu-${r.ref}.pdf`
  const partager = async () => {
    const issue = await partagerFichier(pdf(), nomFichier, `${t('Reçu vendeur')} · ${r.ref}`)
    jouer('copie')
    setAvis(issue === 'enregistre' ? t('Reçu enregistré sur le téléphone (PDF).') : t('Reçu partagé.'))
  }
  const telecharger = () => {
    enregistrerFichier(pdf(), nomFichier)
    jouer('copie')
    setAvis(t('Reçu enregistré sur le téléphone (PDF).'))
  }
  const argent = r.argent
  const ouEnEst =
    argent.etat === 'verse'
      ? t('Versé sur votre numéro de versement')
      : argent.etat === 'a_verser' && argent.vendredi
        ? tf('Libéré · versé le {jour}', { jour: jourDuVendredi(argent.vendredi, langue) })
        : argent.etat === 'se_libere' && argent.liberation
          ? tf('Se libère le {jour} à {h} · versé le {v}', { jour: dateCourte(argent.liberation, langue), h: heure(argent.liberation, langue), v: argent.vendredi ? jourDuVendredi(argent.vendredi, langue) : '' })
          : argent.etat === 'gele'
            ? t('Gelé tant qu’un litige ou un retour est en cours')
            : t('En cours : se libère après la confirmation du client')

  return ecran(
    <>
      {puces}
      <div className="card" style={{ marginTop: '16px', padding: '0', overflow: 'hidden' }}>
        <div className="hero night" style={{ margin: '0', borderRadius: '0', padding: '18px 16px', boxShadow: 'none' }}>
          <div className="row">
            <img src={logo} alt="BelivaY" style={{ height: '24px' }} />
            <span className="grow"></span>
            <span className="hk">{t('Reçu vendeur')}</span>
          </div>
          <div className="b8 mt12" style={{ fontSize: '22px', letterSpacing: '-.01em' }}>
            {r.ref}
          </div>
          <div className="t13 mt4" style={{ color: 'rgba(255,255,255,.8)' }}>
            {tf('Encaissé le {date} à {h}', { date: dateCourte(r.encaisseA, langue), h: heure(r.encaisseA, langue) })}
          </div>
        </div>
        <div style={{ padding: '6px 16px 16px' }}>
          <Ligne k={t('Article')} v={article} />
          <Ligne k={t('Classe du colis')} v={r.colis} />
          <Ligne k={t('Client')} v={t('Identité masquée')} sous={t('ni nom, ni numéro, ni adresse, ni relais')} />
          <Ligne k={t('Encaissé par')} v={t('BelivaY, mandataire')} sous={t('c’est-à-dire pour votre compte')} />
          <Ligne
            k={t('Payé par le client')}
            v={
              <span className="vx-pay">
                <Icone nom={m.icone} taille={15} />
                {t(m.libelle)}
              </span>
            }
            sous={m.sous ? t(m.sous) : undefined}
          />
          <Ligne k={t('Prix de vente')} v={t(`${F(r.prix)} F`)} />
          <div className="keep" style={{ marginTop: '12px' }}>
            <span className="kl">{t('Vous gardez')}</span>
            <span className="kv2">{t(`${F(r.garde)} F`)}</span>
          </div>
          {(r.moyen === 'usd' || r.moyen === 'eur') && (
            <div className="hint-l">
              <Icone nom="globe" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf(r.moyen === 'usd' ? 'Le client a payé en dollars : vous recevez vos {g} en francs, sans frais de change.' : 'Le client a payé en euros : vous recevez vos {g} en francs, sans frais de change.', { g: t(`${F(r.garde)} F`) })}</span>
            </div>
          )}
          <div className="hint-l">
            <Icone nom="wallet" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{ouEnEst}</span>
          </div>
          <p className="t12 c3" style={{ margin: '12px 0 0', lineHeight: '1.5' }}>
            {t('Ce reçu n’est pas une facture fiscale. La facture de BelivaY est mensuelle : elle est rangée dans Documents.')}
          </p>
        </div>
      </div>
      <div className="mt16">
        <button type="button" className="btn primary" onClick={() => void partager()}>
          <Icone nom="send" taille={18} />
          <span>{t('Partager le reçu')}</span>
        </button>
      </div>
      {avis && (
        <div className="note green" role="status" style={{ marginTop: '12px' }}>
          <Icone nom="circle-check" taille={18} />
          <div>{avis}</div>
        </div>
      )}
      <div className="links" style={{ flexWrap: 'wrap' }}>
        <a role="button" tabIndex={0} onClick={telecharger} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), telecharger())} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px', cursor: 'pointer' }}>
          <Icone nom="download" taille={17} />
          {t('Télécharger le PDF')}
        </a>
        <Link to={chemin('documents')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}>
          <Icone nom="file-text" taille={17} />
          {t('Voir mes documents')}
        </Link>
        <Link to={chemin('commande', { ref: r.ref })} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}>
          <Icone nom="package" taille={17} />
          {t('Voir la commande')}
        </Link>
      </div>
    </>,
    feuille,
  )
}

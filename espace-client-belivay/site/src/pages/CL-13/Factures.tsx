// Écran « Factures » (CL-13 ; CCO-07, CCO-20), balisage du prototype du 1er octobre, repris à la main et rendu
// logique (DP-53) :
// - la liste vient des données : une facture par commande retirée, les commandes annulées sans facture ;
//   sans facture, l'état vide ;
// - toucher une facture ouvre son aperçu (la bonne commande : « ?st=apercu&ref=… ») : lignes, total payé,
//   retrait, moyen de paiement, remboursement s'il y en a eu ;
// - « Partager le PDF » ouvre la feuille de partage du téléphone, « Enregistrer sur le téléphone » télécharge
//   le PDF ; émis par BelivaY, il ne porte jamais le nom de la boutique (CCO-20) ;
// - DP-54 : filtres par période (tout, ce mois-ci, 3 derniers mois, cette année) et recherche (référence,
//   article), le total payé et remboursé de la période, son relevé en PDF ; dans l'aperçu, la date du retrait,
//   la commande et « Une erreur sur cette facture ? » (demande au support sur cette commande).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { enregistrerFichier, partagerFichier, pdfTexte } from '../../donnees/pdf'
import { NOM_PAYE_PAR, source, type DonneesFactures, type Facture } from '../../donnees/source'
import { jourSeul } from '../../i18n/dates'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { DetailVide, EcranCompte, MaitreDetail, useMaitreDetail } from './Larges'

// Le PDF de la facture, dans la langue de l'écran (textes passés par t()).
function pdf(f: Facture, t: (s: string) => string): Blob {
  const n = (v: number) => t(`${F(v)} F`)
  return pdfTexte([
    { texte: 'BelivaY', taille: 22, gras: true },
    { texte: t('Facture · ') + f.ref, taille: 15, gras: true, espace: 10 },
    { texte: t('Émise par BelivaY · Yaoundé, Cameroun'), taille: 10 },
    ...f.lignes.map((l, i) => ({ texte: t(l.libelle), droite: n(l.montant), espace: i ? 0 : 18 })),
    { texte: t('Total payé'), droite: n(f.total), gras: true, espace: 8 },
    ...(f.remboursement ? [{ texte: t(f.remboursement.libelle), droite: '− ' + n(f.remboursement.montant) }] : []),
    { texte: t('Retrait') + ' : ' + t(f.retrait.relais) + t(f.retrait.quand), espace: 18 },
    { texte: t('Payé par') + ' : ' + t(NOM_PAYE_PAR[f.payePar.operateur]) + (f.payePar.numero ? ' · ' + f.payePar.numero : '') },
    { texte: t('Commande traitée par BelivaY : la boutique n’est jamais nommée sur la facture.'), taille: 9, espace: 24 },
  ])
}

// Relevé PDF d'une période : une ligne par facture, puis les totaux.
function releve(liste: Facture[], periode: string, t: (s: string) => string, jour: (ms: number) => string): Blob {
  const n = (v: number) => t(`${F(v)} F`)
  const paye = liste.reduce((s, f) => s + f.total, 0)
  const rembourse = liste.reduce((s, f) => s + (f.remboursement?.montant ?? 0), 0)
  return pdfTexte([
    { texte: 'BelivaY', taille: 22, gras: true },
    { texte: t('Relevé des factures') + ' · ' + t(periode), taille: 15, gras: true, espace: 10 },
    { texte: t('Émis par BelivaY · Yaoundé, Cameroun'), taille: 10 },
    ...liste.map((f, i) => ({ texte: f.ref + ' · ' + jour(f.le) + ' · ' + t(f.resume), droite: n(f.total), espace: i ? 0 : 18 })),
    { texte: t('Total payé'), droite: n(paye), gras: true, espace: 8 },
    ...(rembourse ? [{ texte: t('Remboursé'), droite: '− ' + n(rembourse) }] : []),
    { texte: t('Chaque facture détaillée se télécharge depuis l’application.'), taille: 9, espace: 24 },
  ])
}

const PERIODES: [string, string][] = [
  ['tout', 'Toutes'],
  ['mois', 'Ce mois-ci'],
  ['3mois', '3 derniers mois'],
  ['annee', 'Cette année'],
]
// Jour et mois à Yaoundé (UTC+1).
const yaounde = (ms: number) => new Date(ms + 3600 * 1000)
function dansPeriode(le: number, periode: string, maintenant: number): boolean {
  const a = yaounde(le)
  const b = yaounde(maintenant)
  if (periode === 'mois') return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()
  if (periode === 'annee') return a.getUTCFullYear() === b.getUTCFullYear()
  if (periode === '3mois') {
    const debut = Date.UTC(b.getUTCFullYear(), b.getUTCMonth() - 2, 1) - 3600 * 1000 // le 1er du mois, il y a 2 mois
    return le >= debut
  }
  return true
}

function Apercu({ f, fermer }: { f: Facture; fermer: () => void }) {
  const { t } = usePreferences()
  return (
    <Feuille ouverte fermer={fermer} titre={t('Facture · ') + f.ref}>
      <CorpsApercu f={f} />
    </Feuille>
  )
}

// L'aperçu d'une facture : dans la feuille sur téléphone, dans le panneau de détail dès 1200 px (maître-détail).
function CorpsApercu({ f }: { f: Facture }) {
  const { t, langue } = usePreferences()
  const [message, setMessage] = useState<string | null>(null)
  const nom = `Facture-${f.ref}.pdf`
  // Sur grand écran (ordinateur, tablette paysage), le fichier se télécharge : pas « sur le téléphone ».
  const ecranLarge = useMaitreDetail('tab-l')
  const enregistre = ecranLarge ? t('PDF téléchargé.') : t('PDF enregistré sur le téléphone.')
  return (
    <>
      <div className="row">
        <span className="ic-sq or">
          <Icone nom="file-text" taille={22} />
        </span>
        <span className="grow">
          <b className="t17 b8" style={{ display: 'block' }}>
            {t('Facture · ' + f.ref)}
          </b>
          <span className="t13 c3">{t('Émise par BelivaY · PDF')}</span>
        </span>
      </div>
      <div className="recap mt12">
        {f.lignes.map((l) => (
          <div key={l.libelle} className="kv">
            <span className="k">{t(l.libelle)}</span>
            <span className="v ">{t(`${F(l.montant)} F`)}</span>
          </div>
        ))}
        <div className="total">
          <span className="tl2">{t('Total payé')}</span>
          <span className="price big">
            {t(F(f.total))}
            <small>{t(' F')}</small>
          </span>
        </div>
      </div>
      <div className="mt8">
        <div className="kv">
          <span className="k">{t('Date')}</span>
          <span className="v ">{jourSeul(f.le, langue)}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Retrait')}</span>
          <span className="v ">
            <span className="nw">{t(f.retrait.relais)}</span>
            {t(f.retrait.quand)}
          </span>
        </div>
        <div className="kv">
          <span className="k">{t('Payé par')}</span>
          <span className="v ">
            {t(NOM_PAYE_PAR[f.payePar.operateur] + (f.payePar.numero ? ' · ' : ''))}
            {f.payePar.numero && <span className="nw">{t(f.payePar.numero)}</span>}
          </span>
        </div>
        {f.remboursement && (
          <div className="kv">
            <span className="k">{t(f.remboursement.libelle)}</span>
            <span className="v ">{t(`− ${F(f.remboursement.montant)} F`)}</span>
          </div>
        )}
      </div>
      <div className="btns">
        <button
          type="button"
          className="btn primary"
          onClick={() => partagerFichier(pdf(f, t), nom, t('Facture · ') + f.ref).then((r) => r === 'enregistre' && setMessage(enregistre))}
        >
          <Icone nom="share" taille={18} />
          <span>{t('Partager le PDF')}</span>
        </button>
      </div>
      <div className="btns">
        <button type="button" className="btn secondary" onClick={() => (enregistrerFichier(pdf(f, t), nom), setMessage(enregistre))}>
          <Icone nom="download" taille={18} />
          <span>{ecranLarge ? t('Télécharger le PDF') : t('Enregistrer sur le téléphone')}</span>
        </button>
      </div>
      {message && (
        <div className="hint-l" role="status">
          <Icone nom="check" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{message}</span>
        </div>
      )}
      <div className="links">
        <Link to={chemin('commande', { ref: f.ref })}>{t('Voir la commande')}</Link>
        <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Facture', commande: f.ref })}>{t('Une erreur sur cette facture ?')}</Link>
      </div>
    </>
  )
}

export function Factures() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const st = params.get('st')
  const ref = params.get('ref')
  const [d, setD] = useState<(DonneesFactures & { maintenant: number }) | null>(null)
  const [periode, setPeriode] = useState('tout')
  const [cherche, setCherche] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  // Dès 1200 px : maître-détail, la liste à gauche, l'aperçu (« ?st=apercu&ref= ») à droite, sans feuille.
  const md = useMaitreDetail()
  useEffect(() => {
    let vivant = true
    source.factures().then((x) => vivant && setD(x))
    return () => {
      vivant = false
    }
  }, [])
  if (!d) return null

  if (st === 'vide' || (!d.factures.length && !d.annulees.length))
    return (
      <EcranCompte route="factures" parEtat etat="factures?st=vide">
        <div className="card ">
          <div className="empty">
            <div className="ei">
              <Icone nom="file-text" taille={26} />
            </div>
            <h3>{t('Aucune facture pour l’instant')}</h3>
            <p>{t('Ta première facture arrivera quand ta première commande sera retirée.')}</p>
            <div className="btns">
              <Link to={chemin('accueil')} className="btn primary">
                <span>{t('Découvrir les produits')}</span>
              </Link>
            </div>
          </div>
        </div>
      </EcranCompte>
    )

  const ouverte = st === 'apercu' ? d.factures.find((f) => f.ref === ref) : undefined
  const fermer = () => naviguer(chemin('factures'), { replace: true })
  const norme = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const mot = norme(cherche.trim())
  const liste = d.factures.filter((f) => dansPeriode(f.le, periode, d.maintenant) && (!mot || norme(f.ref + ' ' + t(f.resume) + ' ' + f.lignes.map((l) => t(l.libelle)).join(' ')).includes(mot)))
  const annulees = periode === 'tout' && !mot ? d.annulees : []
  const paye = liste.reduce((s, f) => s + f.total, 0)
  const rembourse = liste.reduce((s, f) => s + (f.remboursement?.montant ?? 0), 0)
  const libellePeriode = PERIODES.find((p) => p[0] === periode)![1]
  const telechargerReleve = () => {
    enregistrerFichier(releve(liste, periode === 'tout' ? 'Toutes les factures' : libellePeriode, t, (ms) => jourSeul(ms, langue)), `Releve-BelivaY-${periode}.pdf`)
    setMessage(t('Relevé enregistré sur le téléphone.'))
  }
  const corps = (
    <>
      <p className="cl13-intro">{t('Une facture PDF par commande terminée, faite par BelivaY.')}</p>
      <div className="inp mt12">
        <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        <input type="search" aria-label={t('Chercher une facture')} placeholder={t('Chercher : BLV-…, article')} value={cherche} onChange={(e) => setCherche(e.target.value)} />
      </div>
      <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
        {PERIODES.map(([k, x]) => (
          <a key={k} href="#" className={'chip' + (periode === k ? ' on' : '')} aria-pressed={periode === k} onClick={(e) => (e.preventDefault(), setPeriode(k), setMessage(null))}>
            {t(x)}
          </a>
        ))}
      </div>
      {liste.length > 0 && (
        <div className="kv">
          <span className="k">{tf(liste.length > 1 ? '{n} factures' : '{n} facture', { n: liste.length })}</span>
          <span className="v ">
            {tf('{m} F payés', { m: F(paye) })}
            {rembourse > 0 && ' · ' + tf('{m} F remboursés', { m: F(rembourse) })}
          </span>
        </div>
      )}
      {!liste.length && !annulees.length && (
        <>
          <p className="t13 c3" style={{ textAlign: 'center' }}>{t(mot ? 'Aucune facture ne correspond.' : 'Aucune facture sur cette période.')}</p>
          <div className="links">
            <a href="#" onClick={(e) => (e.preventDefault(), setPeriode('tout'), setCherche(''))}>
              {t('Voir toutes les factures')}
            </a>
          </div>
        </>
      )}
      <div className="card tight">
        {liste.map((f) => (
          <Link key={f.ref} to={chemin('factures', { st: 'apercu', ref: f.ref })} replace={md} className={'li' + (md && f.ref === ouverte?.ref ? ' on' : '')} aria-current={md && f.ref === ouverte?.ref ? 'true' : undefined}>
            <span className="ic or">
              <Icone nom="file-text" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(`${f.ref} · ${F(f.total)} F`)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(`${f.retiree} · ${f.resume}`)}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        ))}
        {annulees.map((a) => (
          <div key={a.ref} className="li">
            <span className="ic ">
              <Icone nom="ban" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(`${a.ref} · annulée`)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(a.texte)}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Commande en cours : sa facture arrive quand elle est terminée. D’ici là, son reçu se partage depuis la confirmation.')}</span>
      </div>
      {liste.length > 0 && (
        <div className="btns">
          <button type="button" className="btn secondary" onClick={telechargerReleve}>
            <Icone nom="download" taille={18} />
            <span>{t(periode === 'tout' ? 'Relevé de toutes les factures (PDF)' : 'Relevé de la période (PDF)')}</span>
          </button>
        </div>
      )}
      {message && (
        <div className="hint-l" role="status">
          <Icone nom="check" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{message}</span>
        </div>
      )}
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Les factures sont gardées le temps exigé par la loi, même après la suppression du compte. Une erreur ? Ouvre la facture et touche « Une erreur sur cette facture ? ».')}</span>
      </div>
    </>
  )
  return (
    <EcranCompte
      route="factures"
      parEtat
      etat={ouverte ? (ouverte.ref === 'BLV-51206' ? 'factures?ref=BLV-51206&st=apercu' : 'factures?ref=BLV-51702&st=apercu') : 'factures'}
      fixes={ouverte && !md ? <Apercu key={ouverte.ref} f={ouverte} fermer={fermer} /> : null}
    >
      {md ? (
        <MaitreDetail
          etiquette="Aperçu de la facture"
          liste={corps}
          detail={
            ouverte ? (
              <div className="card">
                <CorpsApercu key={ouverte.ref} f={ouverte} />
              </div>
            ) : (
              <DetailVide icone="file-text" texte="Choisis une facture pour voir son aperçu" />
            )
          }
        />
      ) : (
        corps
      )}
    </EcranCompte>
  )
}

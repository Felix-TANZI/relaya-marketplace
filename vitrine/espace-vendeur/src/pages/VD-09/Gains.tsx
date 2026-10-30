// Mes gains (VD-09) : repris du prototype (route('gains'), carte nuit espresso VD09-R21), branché sur la source
// (GET /money/earnings).
// - Ce qui est gardé, jamais ce qui est retenu (GAI-01, REFVD-R74) : une ligne par vente libérée (VD09-R18), prix de
//   vente et « vous gardez » en vert ; une reprise est la seule ligne négative, datée, avec son motif (GAI-03) ;
// - Graphique des mois depuis la signature (une barre par mois, le mois choisi en orange ; toucher une barre choisit le
//   mois), flèches mois précédent / suivant, adresse ?mois=AAAA-MM gardée ;
// - Gagné avec BelivaY, « Ce soir à 18 h » (VD09-R19), déjà versés + à verser (VD09-R20), par produit trié (GAI-02),
//   meilleure journée, impayés et transport (REFVD-R80) ;
// - Recherche (référence ou produit) et tri (récentes, montant) ; chaque vente ouvre son reçu ; relevé du mois en CSV ;
// - Œil des montants (DP-52), hors connexion, accès Préparation verrouillé.
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTirerPourActualiser } from '@client/composants/Animations'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Gains as DonneesGains } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { jourDe } from '../../calculs/temps'
import { AvecDonnees, BandeauHorsLigne, CommentCaMarche, Message, Oeil, Onglets, Puces, jourLongMois, jourMois, moisCourt, nomMois, telecharger, useEnLigne, useMessage, useMontant, versCsv } from './commun'

const TITRE = { display: 'block' } as const

function Graphique({ d, choisir }: { d: DonneesGains; choisir: (mois: string) => void }) {
  const { t, langue } = usePreferences()
  const m = useMontant()
  const max = Math.max(1, ...d.historique.map((h) => h.garde))
  const derniers = d.historique.slice(-6)
  return (
    <div className="card">
      <div className="otop">
        <h3>{t('Mois par mois')}</h3>
        <span className="t12 b8 c3">{t('Vous gardez')}</span>
      </div>
      <div className="vd9-graph" role="group" aria-label={t('Ce que vous avez gardé, mois par mois')}>
        {derniers.map((h) => (
          <button
            key={h.mois}
            type="button"
            aria-pressed={h.mois === d.mois}
            aria-label={`${nomMois(h.mois, langue, true)} : ${m.f(h.garde)}`}
            title={`${nomMois(h.mois, langue, true)} : ${m.f(h.garde)}`}
            onClick={() => choisir(h.mois)}
          >
            {h.mois === d.mois && <span className="t12 b8 nw">{m.n(h.garde)}</span>}
            <i style={{ height: Math.max(3, Math.round((h.garde / max) * 88)) + 'px' }}></i>
          </button>
        ))}
      </div>
      <div className="vd9-axe" aria-hidden="true">
        {derniers.map((h) => (
          <span key={h.mois} className={h.mois === d.mois ? 'on' : ''}>
            {moisCourt(h.mois, langue)}
          </span>
        ))}
      </div>
    </div>
  )
}

function Contenu({ d, relire, choisir }: { d: DonneesGains; relire: () => void; choisir: (mois: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const m = useMontant()
  const enLigne = useEnLigne()
  const [message, dire] = useMessage()
  const [cherche, setCherche] = useState('')
  const [tri, setTri] = useState<'date' | 'montant'>('date')
  useTirerPourActualiser(relire)
  const courant = jourDe(maintenant).slice(0, 7) === d.mois
  const i = d.historique.findIndex((h) => h.mois === d.mois)
  const lignes = useMemo(() => {
    const q = cherche.trim().toLowerCase()
    const l = d.lignes.filter((x) => !q || x.ref.toLowerCase().includes(q) || x.article.titre.toLowerCase().includes(q))
    return [...l].sort((a, b) => (tri === 'montant' ? b.garde - a.garde : b.liberation - a.liberation))
  }, [d.lignes, cherche, tri])
  const maxProduit = Math.max(1, ...d.parProduit.map((p) => p.garde))
  const exporter = async () => {
    if (!enLigne) return dire(t('Hors connexion : le relevé se téléchargera au retour du réseau.'))
    const c = await source.argent.document({ type: 'releve', periode: d.mois })
    telecharger(`belivay-releve-${d.mois}.csv`, versCsv(c, { t, langue }), 'text/csv;charset=utf-8')
    jouer('valide')
    dire(t('Relevé téléchargé'))
  }
  return (
    <>
      <div className="row" style={{ marginTop: '14px', gap: '4px' }}>
        <button type="button" className="vd9-oeil" aria-label={t('Mois précédent')} disabled={i <= 0} onClick={() => choisir(d.historique[i - 1].mois)} style={{ opacity: i <= 0 ? 0.35 : 1 }}>
          <Icone nom="chevron-left" taille={20} />
        </button>
        <div className="grow center b8 t15" aria-live="polite">
          {nomMois(d.mois, langue, true)}
        </div>
        <button type="button" className="vd9-oeil" aria-label={t('Mois suivant')} disabled={i >= d.historique.length - 1} onClick={() => choisir(d.historique[i + 1].mois)} style={{ opacity: i >= d.historique.length - 1 ? 0.35 : 1 }}>
          <Icone nom="chevron-right" taille={20} />
        </button>
      </div>
      <div className="hero night" style={{ marginTop: '8px' }}>
        <div className="otop">
          <div className="hk">{tf('{mois} · vous avez gardé', { mois: nomMois(d.mois, langue) })}</div>
          <Oeil clair style={{ margin: '-10px -10px -10px 0' }} />
        </div>
        <div className="big">
          {m.n(d.total)}
          <small>{t('FCFA')}</small>
        </div>
        <div className="hs">{tf(courant ? 'sur {montant} de ventes libérées ce mois-ci.' : 'sur {montant} de ventes libérées ce mois-là.', { montant: m.f(d.ventes) })}</div>
        <div className="hline"></div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="grow">
            <div className="t12 b8" style={{ letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.74)' }}>
              {t('Gagné avec BelivaY')}
            </div>
            <div className="b8 t17 mt4">{m.f(d.gagne)}</div>
            <div className="t12 mt4" style={{ color: 'rgba(255,255,255,.74)' }}>
              {t('depuis votre inscription')}
            </div>
          </div>
          {d.ceSoir && (
            <div className="right">
              <div className="t12 b8" style={{ letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.74)' }}>
                {Number(heure(d.ceSoir.a, 'fr').slice(0, 2)) >= 17 ? tf('Ce soir à {h}', { h: heure(d.ceSoir.a, langue) }) : tf('Aujourd’hui à {h}', { h: heure(d.ceSoir.a, langue) })}
              </div>
              <div className="b8 t17 mt4" style={{ color: 'var(--gold-l)' }}>
                {m.f(d.ceSoir.montant)}
              </div>
              <div className="t12 mt4" style={{ color: 'rgba(255,255,255,.74)' }}>
                {tf('avec {refs}', { refs: d.ceSoir.refs.join(', ') })}
              </div>
            </div>
          )}
        </div>
      </div>
      <Graphique d={d} choisir={choisir} />
      <div className="card">
        <div className="otop">
          <h3>{t('Par vente')}</h3>
          <span className="t12 b8 c3">{t('Vous gardez')}</span>
        </div>
        {d.lignes.length > 2 && (
          <>
            <label className="vd9-recherche">
              <Icone nom="search" taille={17} style={{ color: 'var(--ink-3)' }} />
              <input type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder={t('Référence ou produit')} aria-label={t('Chercher une vente')} />
            </label>
            <Puces
              etiquette="Trier"
              valeur={tri}
              changer={setTri}
              choix={[
                { v: 'date', libelle: t('Récentes') },
                { v: 'montant', libelle: t('Montant') },
              ]}
            />
          </>
        )}
        <div className="mt6">
          {lignes.length === 0 && <p className="t13 c3 center" style={{ padding: '14px 0' }}>{d.lignes.length ? t('Aucune vente ne correspond.') : tf('Aucune vente libérée en {mois}.', { mois: nomMois(d.mois, langue).toLowerCase() })}</p>}
          {lignes.map((l) =>
            l.type === 'reprise' ? (
              <div key={'r' + l.ref + l.liberation} className="li">
                <span className="ic red">
                  <Icone nom="undo-2" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={TITRE}>
                    {tf('{ref} · reprise', { ref: l.ref })}
                  </span>
                  <span className="ls" style={TITRE}>
                    {tf('{motif} · le {jour}', { motif: t(l.motif ?? ''), jour: jourMois(l.liberation, langue) })}
                  </span>
                </span>
                <span className="b8 t15 cr nw">{m.f(l.garde)}</span>
              </div>
            ) : (
              <Link key={l.ref} to={chemin('recu', { ref: l.ref })} className="li">
                <Vignette nom={l.article.dessin} taille={40} />
                <span className="grow">
                  <span className="lt" style={TITRE}>
                    {`${l.ref} · ${l.article.titre}`}
                  </span>
                  <span className="ls" style={TITRE}>
                    {tf('Vendu {prix} · libéré le {jour}', { prix: m.f(l.prix), jour: jourMois(l.liberation, langue) })}
                  </span>
                </span>
                <span className="b8 t15 cg nw">{m.f(l.garde)}</span>
              </Link>
            ),
          )}
        </div>
        {d.lignes.length > 0 && (
          <button type="button" className="vd9-lien" onClick={() => void exporter()} aria-disabled={!enLigne}>
            <Icone nom="download" taille={16} />
            {tf('Relevé de {mois} (CSV)', { mois: nomMois(d.mois, langue).toLowerCase() })}
          </button>
        )}
      </div>
      {d.parProduit.length > 0 && (
        <div className="card">
          <h3>{t('Par produit')}</h3>
          {d.parProduit.map((p) => (
            <div key={p.titre} className="hbar mt8">
              <span className="hl">{`${p.titre} × ${p.quantite}`}</span>
              <span className="hb">
                <i style={{ width: Math.round((p.garde / maxProduit) * 100) + '%' }}></i>
              </span>
              <span className="hv" style={{ width: '78px' }}>
                {m.f(p.garde)}
              </span>
            </div>
          ))}
          <p className="t13 c3" style={{ margin: '6px 0 0' }}>
            {t(courant ? 'Votre produit qui rapporte le plus ce mois.' : 'Votre produit qui a rapporté le plus ce mois-là.')}
          </p>
          {d.meilleurJour && (
            <p className="t13 c2" style={{ margin: '6px 0 0' }}>
              <Icone nom="trophy" taille={14} style={{ verticalAlign: '-2px', marginRight: '6px', color: 'var(--gold)' }} />
              {tf('Votre meilleure journée : {jour}, {montant} gardés.', { jour: jourLongMois(d.meilleurJour.jour, langue), montant: m.f(d.meilleurJour.garde) })}
            </p>
          )}
        </div>
      )}
      <div className="card">
        <div className="otop">
          <h3>{t('Versé et à verser')}</h3>
          <Link to={chemin('versements')} className="row t13 b8 cor" style={{ gap: '2px', minHeight: '44px' }}>
            {t('Versements')}
            <Icone nom="chevron-right" taille={16} />
          </Link>
        </div>
        <div className="kv">
          <span className="k">{t('Déjà versés · 1 % de frais Mobile Money déduit')}</span>
          <span className="v ">{m.f(d.dejaVerses)}</span>
        </div>
        <div className="kv">
          <span className="k">{d.aVerser ? tf('À verser {jour}', { jour: jourLongMois(d.aVerser.vendredi, langue) }) : t('À verser')}</span>
          <span className="v ">{m.f(d.aVerser?.montant ?? 0)}</span>
        </div>
      </div>
      <div className="split2 mt12">
        <div className="tile">
          <div className="tk" style={{ fontSize: '12px' }}>
            {t('Impayés')}
          </div>
          <div className="tv cg">
            {m.n(d.impayes)}
            <small>{t('F')}</small>
          </div>
          <div className="ts">{t('Toutes vos ventes payées d’avance')}</div>
        </div>
        <div className="tile">
          <div className="tk" style={{ fontSize: '12px' }}>
            {t('Transport')}
          </div>
          <div className="tv cg">
            {m.n(d.transport)}
            <small>{t('F')}</small>
          </div>
          <div className="ts">{t('Livraison gérée : 0 déplacement')}</div>
        </div>
      </div>
      <CommentCaMarche>
        <p>{t('Une vente apparaît ici quand son argent se libère. Une vente gelée, remboursée ou pas encore livrée n’y est pas encore.')}</p>
        <p>
          {t('Une seule ligne peut être négative : la ')}
          <b>{t('reprise')}</b>
          {t('. C’est quand un défaut caché est jugé contre vous après la libération. Elle est datée, avec son motif.')}
        </p>
      </CommentCaMarche>
      <Message texte={message} />
    </>
  )
}

export default function Gains() {
  const { t } = usePreferences()
  const maintenant = useHorloge(3_600_000)
  const [params, setParams] = useSearchParams()
  const mois = /^\d{4}-\d{2}$/.test(params.get('mois') ?? '') ? params.get('mois')! : jourDe(maintenant).slice(0, 7)
  const lecture = useLecture(() => source.argent.gains(mois), [mois])
  const choisir = (m: string) => {
    jouer('interrupteur')
    setParams((p) => (p.set('mois', m), p), { replace: true })
  }
  return (
    <AvecDonnees route="gains" lecture={lecture}>
      {(d) => (
        <Ecran route="gains">
          <div className="pg">
            <h1 className="pg-t">{t('Mes gains')}</h1>
          </div>
          <Onglets actif="gains" />
          <BandeauHorsLigne />
          <Contenu d={d} relire={lecture.relire} choisir={choisir} />
        </Ecran>
      )}
    </AvecDonnees>
  )
}

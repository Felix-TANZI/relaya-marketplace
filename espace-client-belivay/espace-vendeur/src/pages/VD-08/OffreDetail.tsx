// Une offre (VD-08) : reprise du prototype (route('offre_detail')), branchée sur la source. DÉFAUT 3 du prototype
// corrigé : la route lit le paramètre « p » (identifiant de l'offre) ; « ?v=verif » reste le scénario du prototype
// (l'offre en vérification), sans paramètre la première offre en vente.
// - Fiche / offre (OFR-01) : la ligne cadenas dit que titre, description et photos de référence sont à BelivaY ; le
//   vendeur peut proposer une correction, relue par BelivaY (Q-34).
// - Carte clé selon l'état (VD08-R07, VD08-R08) : en vente « Où les clients vous voient » (zones exploitées lues dans
//   les données, sans nom ni quartier des autres offres, OFR-04) ou « déjà le prix le plus bas » ; en vérification la
//   carte ambre (OFR-03) ; en pause « Invisible des clients » + « Remettre en vente » ; refusée : le motif écrit +
//   « Corriger l'offre » ; brouillon : « Reprendre ».
// - « Votre offre » : prix, gardé par vente, stock et seuil (rouge sous le seuil, stock rapide), état, délai, photos
//   réelles (ajout par la caméra), colis ; interrupteurs « Accepter le paiement au retrait » (OFR-02) et « Prix
//   automatique » avec son plancher privé (VD08-R05, Q-90) ; « Faire une promotion » seulement en vente, avec du
//   stock et FF-FLASH ouvert (OFR-05, VD08-R33).
// - Ajouts : aperçu client (fiche CL-06), autres variantes de la fiche avec leur stock et leur prix (Q-35), photos
//   réelles avec heure et lieu, historique de l'offre, partage du lien de la fiche client, « Annuler » après un réglage.
// - Accès Préparation : aucun montant, aucun réglage de prix ; stock et photos possibles.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Conseil } from '../../donnees/domaines/offres'
import type { Produit, VarianteDeFiche } from '../../donnees/domaines/produits'
import { source } from '../../donnees/source'
import { mettreEnFile } from '../../donnees/fileHorsLigne'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles } from '../../session'
import { ApercuClient, Bouton, Chargement, Erreur, FeuilleStock, ImagePhoto, Interrupteur, VignetteProduit, dateHeure, jourMois, useDelai, useManques, useMontant, useToast } from './commun'

function Zones({ c, p }: { c: Conseil; p: Produit }) {
  const { t, tf } = usePreferences()
  const montant = useMontant()
  const premiers = c.zones.filter((z) => z.premier)
  const auConseil = c.zones.filter((z) => z.premierAuConseille).length
  const noms = premiers.map((z) => z.nom)
  return (
    <>
      <div className="hero night">
        <div className="otop">
          <span className="hk">{t('Où les clients vous voient')}</span>
          <Icone nom="map-pin" taille={18} style={{ color: 'var(--gold-l)' }} />
        </div>
        <div className="big">
          {tf(premiers.length > 1 ? '{n} zones' : '{n} zone', { n: premiers.length })}
          <small>{tf('sur {n}', { n: c.zones.length })}</small>
        </div>
        <div className="hs">
          {noms.length === 0 ? (
            t('Une offre moins chère passe devant dans chaque zone.')
          ) : (
            <>
              {t('Vous passez en premier à ')}
              {noms.map((n, i) => (
                <span key={n}>
                  {i > 0 && (i === noms.length - 1 ? t(' et à ') : t(', à '))}
                  <b>{n}</b>
                </span>
              ))}
              {t('.')}
            </>
          )}
        </div>
        <div className="t12 mt8" style={{ color: 'rgba(255,255,255,.7)', lineHeight: '1.45' }}>
          {t('Le client ne choisit pas le vendeur : l’offre livrée la moins chère passe en premier.')}
        </div>
        <div className="hline"></div>
        {c.dejaLeMoinsCher ? (
          <div className="row" style={{ alignItems: 'flex-start', gap: '10px' }}>
            <Icone nom="circle-check" taille={18} style={{ color: 'var(--gold-l)', flexShrink: '0', marginTop: '2px' }} />
            <div className="t14" style={{ lineHeight: '1.45' }}>
              {t('Vous êtes déjà le prix le plus bas pour les clients : rien à changer.')}
            </div>
          </div>
        ) : (
          <>
            <div className="row" style={{ alignItems: 'flex-start', gap: '10px' }}>
              <Icone nom="trending-up" taille={18} style={{ color: 'var(--gold-l)', flexShrink: '0', marginTop: '2px' }} />
              <div className="t14" style={{ lineHeight: '1.45' }}>
                {p.concurrent && (
                  <>
                    {t('Un vendeur est passé à ')}
                    <b>{montant(p.concurrent.prix)}</b>
                    {t('. À ')}
                  </>
                )}
                {!p.concurrent && t('À ')}
                <b>{montant(c.conseille)}</b>
                {t(', vous passez en premier dans ')}
                <b>{tf('{n} zones sur {m}', { n: auConseil, m: c.zones.length })}</b>
                {t('.')}
              </div>
            </div>
            <div className="mt14">
              <Bouton classe="white" icone="pencil" vers={chemin('offre3', { o: p.id })}>
                {t('Modifier le prix')}
              </Bouton>
            </div>
          </>
        )}
      </div>
      <details className="more">
        <summary>
          <Icone nom="map-pin" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{tf('Voir le détail des {n} zones', { n: c.zones.length })}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          {c.zones.map((z) => (
            <div key={z.nom} className="row" style={{ padding: '8px 0', borderTop: '1px solid var(--line)', gap: '10px' }}>
              <Icone nom={z.premier ? 'circle-check' : 'circle'} taille={18} style={{ flexShrink: '0', color: z.premier ? 'var(--green)' : 'var(--ink-4)' }} />
              <span className="grow t14 b7">{z.nom}</span>
              <span className={z.premier ? 't12 cg b7' : 't12 c3'} style={{ textAlign: 'right' }}>
                {t(z.premier ? 'En premier' : 'Une offre moins chère passe devant')}
              </span>
            </div>
          ))}
          <p className="t12 c3" style={{ marginTop: '8px' }}>
            {t('Les autres offres restent anonymes : ni nom, ni quartier.')}
          </p>
        </div>
      </details>
    </>
  )
}

function Variantes({ p, variantes }: { p: Produit; variantes: VarianteDeFiche[] }) {
  const { t } = usePreferences()
  const montants = useMontantsVisibles()
  if (variantes.length < 2) return null
  const ETAT: Record<string, string> = { en_vente: 'en vente', en_verification: 'en vérification', en_pause: 'en pause', refusee: 'refusée', brouillon: 'brouillon' }
  return (
    <div className="card">
      <div className="otop">
        <h3>{t('Les variantes de ce produit')}</h3>
      </div>
      <p className="t12 c3" style={{ margin: '2px 0 4px' }}>
        {t('Chaque variante a son propre stock et son propre prix.')}
      </p>
      {variantes.map((v) =>
        v.offreId === p.id ? (
          <div key={v.variante} className="li">
            <Icone nom="circle-dot" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow lt">{`${t(v.variante)} · ${t('cette offre')}`}</span>
          </div>
        ) : v.offreId ? (
          <Link key={v.variante} to={chemin('offre_detail', { p: v.offreId })} className="li">
            <Icone nom="circle" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(v.variante)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(ETAT[v.etat ?? 'brouillon'])}
              </span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </Link>
        ) : montants ? (
          <Link key={v.variante} to={chemin('dupliquer', { p: p.id, v: v.variante })} className="li">
            <Icone nom="plus" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(v.variante)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Au catalogue, pas encore dans vos produits')}
              </span>
            </span>
            <span className="t13 b8 cor nw">{t('Ajouter')}</span>
          </Link>
        ) : null,
      )}
    </div>
  )
}

function FeuilleDescription({ ouverte, fermer, p, envoyer }: { ouverte: boolean; fermer: () => void; p: Produit; envoyer: (texte: string) => Promise<string | null> }) {
  const { t, tf } = usePreferences()
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Proposer une correction de la fiche')}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void envoyer(texte).then((err) => (err ? setErreur(err) : (setTexte(''), setErreur(null))))
        }}
      >
        <h2 className="pg-t" style={{ fontSize: '19px' }}>
          {t('Proposer une correction de la fiche')}
        </h2>
        <p className="pg-s">{tf('{titre} : BelivaY relit votre proposition et rédige la fiche. Votre texte n’est jamais publié tel quel.', { titre: p.titre })}</p>
        <div className="fld">
          <label htmlFor="vd08-desc">{t('Ce qui manque ou ce qui est faux')}</label>
          <div className={'inp' + (erreur ? ' err' : '')} style={{ height: 'auto', padding: '10px 13px' }}>
            <textarea id="vd08-desc" rows={5} maxLength={2000} value={texte} onChange={(e) => (setTexte(e.target.value), setErreur(null))} placeholder={t('Ex. : la batterie fait 5 000 mAh, pas 4 000.')} />
          </div>
          <div className={'hint' + (erreur ? ' cr' : '')}>{erreur ?? tf('{n} / 2 000 caractères · sans numéro, lien ni adresse e-mail', { n: texte.length })}</div>
        </div>
        <div className="mt14">
          <Bouton classe="primary" icone="send" type="submit">
            {t('Envoyer la proposition')}
          </Bouton>
        </div>
      </form>
    </Feuille>
  )
}

export default function OffreDetail() {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const manques = useManques()
  const montant = useMontant()
  const delai = useDelai()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const { dire, toast } = useToast()
  const [apercu, setApercu] = useState(false)
  const [stock, setStock] = useState(false)
  const [desc, setDesc] = useState(false)
  const [plancher, setPlancher] = useState<string | null>(null)
  const [errPlancher, setErrPlancher] = useState<string | null>(null)
  const voulu = params.get('p')
  const verif = params.get('v') === 'verif'
  const lecture = useLecture(async () => {
    const l = await source.produits.liste()
    const p = voulu ? (l.produits.find((x) => x.id === voulu) ?? null) : (l.produits.find((x) => x.etat === (verif ? 'en_verification' : 'en_vente')) ?? l.produits[0] ?? null)
    const conseil = p && montants && p.etat === 'en_vente' && p.prix !== null ? await source.offres.conseil(p.id, p.prix) : null
    const variantes = p?.ficheId ? await source.produits.variantes(p.ficheId) : []
    const reglages = await source.offres.reglages()
    return { p, conseil, variantes, flash: reglages.flash, prixMin: reglages.prixMin, photosMin: reglages.photosMin }
  }, [voulu, verif, montants])
  const d = lecture.donnees
  if (!d) return lecture.erreur ? <Erreur route="offre_detail" texte="Cette offre ne s’affiche pas" relire={lecture.relire} /> : <Chargement route="offre_detail" />
  const p = d.p
  if (!p)
    return (
      <Ecran route="offre_detail">
        <div className="card" style={{ marginTop: '18px' }}>
          <div className="empty">
            <div className="ei">
              <Icone nom="package-x" taille={24} />
            </div>
            <h3>{t('Cette offre n’existe plus')}</h3>
            <p>{t('Elle a peut-être été supprimée quand c’était un brouillon.')}</p>
          </div>
          <Bouton classe="secondary" icone="package" vers={chemin('produits')}>
            {t('Voir mes produits')}
          </Bouton>
        </div>
      </Ecran>
    )
  const stockBas = p.attention.includes('stock_bas')
  const nom = p.variante ? `${p.titre} · ${t(p.variante)}` : p.titre
  const derniere = p.photos.length ? Math.max(...p.photos.map((x) => x.prise)) : null
  const promotion = montants && d.flash && p.etat === 'en_vente' && p.stock > 0
  const regler = async (champs: Parameters<typeof source.produits.regler>[1], message: string, annuler?: Parameters<typeof source.produits.regler>[1]) => {
    const r = await source.produits.regler(p.id, champs)
    if (!r.ok) return r.raison
    dire(t(message), annuler ? { libelle: t('Annuler'), faire: () => void source.produits.regler(p.id, annuler) } : undefined)
    return null
  }
  const partager = async () => {
    const url = `${location.origin}/recherche?q=${encodeURIComponent(p.titre)}`
    const texte = tf('{nom} sur BelivaY', { nom })
    try {
      if (navigator.share) await navigator.share({ title: texte, url })
      else {
        await navigator.clipboard.writeText(url)
        dire(t('Lien copié'))
      }
    } catch {
      /* partage annulé */
    }
  }
  const etatPill =
    p.etat === 'en_vente' ? (
      <span className="pill green sm">
        <i className="d"></i>
        {t('En vente')}
      </span>
    ) : p.etat === 'en_verification' ? (
      <span className="pill amber sm">
        <Icone nom="hourglass" taille={13} />
        {t('En vérification')}
      </span>
    ) : p.etat === 'refusee' ? (
      <span className="pill red sm">
        <Icone nom="circle-x" taille={13} />
        {t('Refusée')}
      </span>
    ) : (
      <span className="pill ink sm">
        <Icone nom={p.etat === 'en_pause' ? 'pause' : 'pencil'} taille={13} />
        {t(p.etat === 'en_pause' ? 'En pause' : 'Brouillon')}
      </span>
    )
  return (
    <Ecran
      route="offre_detail"
      fixes={
        <>
          <ApercuClient ouverte={apercu} fermer={() => setApercu(false)} p={p} />
          <FeuilleStock
            p={stock ? p : null}
            fermer={() => setStock(false)}
            enregistrer={async (_x, n) => {
              if (!navigator.onLine) {
                await mettreEnFile('stock', p.titre, { offreId: p.id, stock: n })
                setStock(false)
                dire(tf('Stock {n} gardé : il part au retour du réseau', { n }))
                return true
              }
              const r = await source.produits.changerStock(p.id, n)
              if (!r.ok) return false
              jouer('interrupteur')
              setStock(false)
              dire(tf('Stock enregistré : {n}', { n }))
              return true
            }}
          />
          <FeuilleDescription
            ouverte={desc}
            fermer={() => setDesc(false)}
            p={p}
            envoyer={async (texte) => {
              const r = await source.offres.proposerDescription(p.id, texte)
              if (!r.ok) return t(r.raison === 'court' ? 'Écrivez au moins 20 caractères.' : r.raison === 'long' ? '2 000 caractères au plus.' : 'Sans numéro de téléphone, lien ni adresse e-mail : la fiche reste anonyme.')
              setDesc(false)
              jouer('message')
              dire(t('Proposition envoyée à BelivaY'))
              return null
            }}
          />
          {toast}
        </>
      }
    >
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="art" style={{ marginTop: '0' }}>
          <VignetteProduit p={p} taille={64} />
          <div className="grow">
            <div className="an" style={{ fontSize: '19px' }}>
              {nom}
            </div>
            <div className="av">{`${t(p.rayon)} · ${t(p.etatArticle).toLowerCase()}`}</div>
            <div className="meta" style={{ marginTop: '6px' }}>
              {etatPill}
              {p.verifieeA && p.etat === 'en_vente' && <span className="pill ink sm">{tf('Vérifiée le {d}', { d: jourMois(p.verifieeA, langue) })}</span>}
            </div>
          </div>
        </div>
        {montants && p.etat === 'en_vente' && (
          <>
            <div className="hr"></div>
            <div className="row">
              <span className="grow t13 c3">{t('Ce mois')}</span>
              <span className="t15 b8">
                {p.ventesCeMois > 0 && p.gardeCeMois !== null ? (
                  <>
                    {tf(p.ventesCeMois > 1 ? '{n} ventes · ' : '{n} vente · ', { n: p.ventesCeMois })}
                    <span className="cg">{tf('{m} gardés', { m: montant(p.gardeCeMois) })}</span>
                  </>
                ) : (
                  t('Pas encore de vente')
                )}
              </span>
            </div>
          </>
        )}
      </div>

      {p.etat === 'en_vente' && d.conseil && <Zones c={d.conseil} p={p} />}
      {p.etat === 'en_verification' && p.verificationAvant && (
        <div className="card" style={{ border: '1.5px solid var(--amber-line)', background: 'var(--amber-soft)' }}>
          <div className="b8" style={{ fontSize: '19px', lineHeight: '1.25' }}>
            {tf('Réponse avant {d}', { d: dateHeure(p.verificationAvant, langue) })}
          </div>
          {p.envoyeeA && (
            <div className="t13 c2 mt6" style={{ lineHeight: '1.45' }}>
              {tf('Envoyée {d}. Pas encore visible des clients.', { d: dateHeure(p.envoyeeA, langue) })}
            </div>
          )}
          <details className="more flat">
            <summary>
              <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Pourquoi ?')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <p>{t('La vérification dure 48 h au plus. Elle porte sur l’offre, jamais sur vous.')}</p>
              <p>{t('Son motif est toujours écrit : en cas de refus, vous savez quoi corriger.')}</p>
            </div>
          </details>
        </div>
      )}
      {p.etat === 'en_pause' && (
        <div className="card">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <Icone nom="eye-off" taille={22} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <div className="grow">
              <div className="b8 t15">{t('Invisible des clients')}</div>
              <div className="t13 c2 mt4">{t('L’offre est en pause : aucune nouvelle commande. Les commandes déjà reçues restent à préparer.')}</div>
            </div>
          </div>
          {montants && (
            <div className="mt12">
              <Bouton
                classe="primary"
                icone="store"
                onClick={() =>
                  void source.produits.pause(p.id, false).then(() => {
                    jouer('interrupteur')
                    dire(t('Remise en vente'))
                  })
                }
              >
                {t('Remettre en vente')}
              </Bouton>
            </div>
          )}
        </div>
      )}
      {p.etat === 'refusee' && (
        <div className="card" style={{ border: '1.5px solid var(--red-line)', background: 'var(--red-soft)' }}>
          <div className="b8 t15 cr">{t('Offre refusée par la vérification')}</div>
          <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
            {p.motifRefus ? tf('Motif : {m}', { m: t(p.motifRefus) }) : t('Le motif vous a été écrit par notification.')}
          </div>
          {montants && (
            <div className="mt12">
              <Bouton classe="primary" icone="pencil" vers={chemin('offre1', { b: p.id })}>
                {t('Corriger l’offre')}
              </Bouton>
            </div>
          )}
        </div>
      )}
      {p.etat === 'brouillon' && (
        <div className="card">
          <div className="b8 t15">{t('Brouillon')}</div>
          <div className="t13 c2 mt4">{`${manques(p)}. ${t('Pas encore visible des clients : finissez-le pour le publier.')}`}</div>
          {montants && (
            <div className="mt12">
              <Bouton classe="primary" icone="arrow-right" vers={chemin('offre1', { b: p.id })}>
                {t('Reprendre')}
              </Bouton>
            </div>
          )}
        </div>
      )}
      {p.etat === 'en_verification' && !p.ficheId && p.ficheDemandee && (
        <div className="card flat tight">
          <div className="row t13 c2" style={{ gap: '8px', alignItems: 'flex-start' }}>
            <Icone nom="file-pen" taille={17} style={{ color: 'var(--or-txt)', flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Produit nouveau : BelivaY écrit sa fiche à partir de vos photos et de votre description, réponse avant {d}.', { d: dateHeure(p.ficheDemandee.reponseAvant, langue) })}</span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="otop">
          <h3>{t('Votre offre')}</h3>
          {montants && p.etat !== 'brouillon' && (
            <Link to={chemin('offre3', { o: p.id })} className="row t14 b8 cor" style={{ gap: '5px', minHeight: '44px' }}>
              <Icone nom="pencil" taille={15} />
              {t('Modifier')}
            </Link>
          )}
        </div>
        <div className="hint-l">
          <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Titre, description et photos de référence : c’est la fiche, rédigée par BelivaY.')}</span>
        </div>
        <div className="mt8">
          {montants && (
            <>
              <div className="kv">
                <span className="k">{t('Prix de vente')}</span>
                <span className="v ">{p.prix !== null ? montant(p.prix) : t('À fixer')}</span>
              </div>
              <div className="kv">
                <span className="k">{t('Vous gardez par vente')}</span>
                <span className="v ">
                  <span className="cg">{p.garde !== null ? montant(p.garde) : t('—')}</span>
                </span>
              </div>
            </>
          )}
          <div className="kv">
            <span className="k">{t('Stock')}</span>
            <span className="v ">
              <button type="button" onClick={() => setStock(true)} style={{ border: 0, background: 'transparent', font: 'inherit', padding: '0', cursor: 'pointer', color: 'inherit', minHeight: '32px' }} aria-label={t('Changer le stock')}>
                <span className={stockBas ? 'cr' : ''}>{tf('{n} · seuil d’alerte {s}', { n: p.stock, s: p.seuilAlerte })}</span>
                <Icone nom="pencil" taille={13} style={{ marginLeft: '6px', verticalAlign: '-2px', color: 'var(--or-txt)' }} />
              </button>
            </span>
          </div>
          <div className="kv">
            <span className="k">{t('État')}</span>
            <span className="v ">{t(p.etatArticle)}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Délai de préparation')}</span>
            <span className="v ">{delai(p.delaiPreparationH)}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Photos réelles')}</span>
            <span className="v ">{derniere ? tf('{n} · prises le {d}', { n: p.photos.length, d: jourMois(derniere, langue) }) : t('Aucune')}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Colis')}</span>
            <span className="v ">{tf('Classe {c}', { c: p.colis })}</span>
          </div>
        </div>
        <div className="row" style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
          <div className="grow">
            <div className="b8 t14">{t('Accepter le paiement au retrait')}</div>
            <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
              {t('Coupé, le client doit payer ce produit d’avance.')}
            </div>
          </div>
          <Interrupteur
            on={p.paiementAuRetrait}
            libelle={t('Accepter le paiement au retrait')}
            verrouille={!montants}
            changer={(on) => void regler({ paiementAuRetrait: on }, on ? 'Paiement au retrait accepté' : 'Paiement au retrait coupé : une commande déjà validée reste valable', { paiementAuRetrait: !on })}
          />
        </div>
        <div className="row" style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
          <div className="grow">
            <div className="b8 t14">{t('Prix automatique')}</div>
            <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
              {t('Baisse seulement, 3 % par semaine au plus, jamais sous votre prix plancher.')}
            </div>
            {p.prixAuto && p.plancherPrive !== null && plancher === null && (
              <div className="t12 b7 mt4" style={{ color: 'var(--ink-2)' }}>
                {tf('Jamais sous {m}', { m: montant(p.plancherPrive) })}
              </div>
            )}
          </div>
          <Interrupteur
            on={p.prixAuto || plancher !== null}
            libelle={t('Prix automatique')}
            verrouille={!montants || p.prix === null}
            changer={(on) => {
              if (on) {
                setPlancher(p.plancherPrive !== null ? String(p.plancherPrive) : '')
                setErrPlancher(null)
              } else {
                setPlancher(null)
                if (p.prixAuto) void regler({ prixAuto: false }, 'Prix automatique coupé')
              }
            }}
          />
        </div>
        {plancher !== null && (
          <form
            className="card flat"
            style={{ marginTop: '0', marginBottom: '8px', padding: '12px' }}
            onSubmit={(e) => {
              e.preventDefault()
              const n = Number(plancher.replace(/\s/g, ''))
              void regler({ prixAuto: true, plancherPrive: Number.isInteger(n) && plancher ? n : null }, 'Prix automatique activé').then((err) => {
                if (err) setErrPlancher(tf('Entre {min} et votre prix de {p}.', { min: montant(d.prixMin), p: montant(p.prix ?? 0) }))
                else setPlancher(null)
              })
            }}
          >
            <div className="fld" style={{ marginTop: '0' }}>
              <label htmlFor="vd08-plancher">
                {t('Ne jamais descendre sous ')}
                <span className="req">{t('*')}</span>
              </label>
              <div className={'inp' + (errPlancher ? ' err' : '')}>
                <input size={1} id="vd08-plancher" inputMode="numeric" value={plancher} onChange={(e) => (setPlancher(e.target.value.replace(/[^\d]/g, '')), setErrPlancher(null))} placeholder={t('Ex. : 18 000')} />
                <span className="suf">{t('F')}</span>
              </div>
              <div className={'hint' + (errPlancher ? ' cr' : '')}>{errPlancher ?? t('Votre prix plancher reste privé : aucun client ni vendeur ne le voit.')}</div>
            </div>
            <div className="btns mt12">
              <Bouton classe="secondary" onClick={() => setPlancher(null)}>
                {t('Annuler')}
              </Bouton>
              <Bouton classe="primary" icone="check" type="submit">
                {t('Activer')}
              </Bouton>
            </div>
          </form>
        )}
        {promotion && (
          <Link to={chemin('promotions', { p: p.id })} className="row" style={{ padding: '12px 0 2px', borderTop: '1px solid var(--line)', gap: '10px', minHeight: '44px' }}>
            <span className="grow">
              <span className="b8 t14" style={{ display: 'block', color: 'var(--ink)' }}>
                {t('Faire une promotion')}
              </span>
              <span className="t12 c3 mt4" style={{ display: 'block', lineHeight: '1.4' }}>
                {t('Vente flash : remise réelle de 10 % au moins, prix barré affiché seulement s’il a été pratiqué.')}
              </span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </Link>
        )}
        {montants && p.etat === 'en_vente' && (
          <Link to={chemin('publicite_nouvelle', { p: p.id })} className="row" style={{ padding: '12px 0 2px', borderTop: '1px solid var(--line)', gap: '10px', minHeight: '44px' }}>
            <span className="grow">
              <span className="b8 t14" style={{ display: 'block', color: 'var(--ink)' }}>
                {t('Sponsoriser')}
              </span>
              <span className="t12 c3 mt4" style={{ display: 'block', lineHeight: '1.4' }}>
                {t('Recherche, À la une, Boost : payé sur le solde publicitaire, seulement ce qui est diffusé.')}
              </span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </Link>
        )}
      </div>

      <div className="card">
        <div className="otop">
          <h3>{t('Photos réelles')}</h3>
          {p.photos.length < 8 && (
            <Link to={chemin('camera', { mode: 'photo', pour: p.id, retour: `offre_detail?p=${p.id}` })} className="row t14 b8 cor" style={{ gap: '5px', minHeight: '44px' }}>
              <Icone nom="camera" taille={15} />
              {t('Ajouter')}
            </Link>
          )}
        </div>
        {p.photos.length ? (
          <div className="photos" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {p.photos.map((x) => (
              <div key={x.id} className="photo">
                <ImagePhoto p={x} />
                <span className="ts" style={{ textAlign: 'center' }}>
                  {heure(x.prise, langue)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="t13 c3">{tf('Aucune photo réelle : {n} au moins pour publier.', { n: d.photosMin })}</p>
        )}
        {p.photos[0]?.lieu && <p className="t12 c3" style={{ margin: '8px 0 0' }}>{tf('Prises à {l} · l’heure et le lieu restent dans chaque photo', { l: p.photos[0].lieu })}</p>}
      </div>

      <Variantes p={p} variantes={d.variantes} />

      {montants && (
        <div className="card">
          <div className="otop">
            <h3>{t('La fiche du catalogue')}</h3>
          </div>
          {p.descriptionProposee ? (
            <div className="note amber" style={{ marginTop: '6px' }}>
              <Icone nom="hourglass" taille={18} />
              <div>{tf('Proposition envoyée {d} · relue par BelivaY avant {r}', { d: dateHeure(p.descriptionProposee.envoyeeA, langue), r: dateHeure(p.descriptionProposee.reponseAvant, langue) })}</div>
            </div>
          ) : (
            <p className="t13 c2" style={{ margin: '4px 0 0', lineHeight: '1.45' }}>
              {t('Une information manque ou est fausse ? Proposez une correction : BelivaY la vérifie et réécrit la fiche.')}
            </p>
          )}
          <div className="mt12">
            <Bouton classe="secondary" icone="file-pen" onClick={() => setDesc(true)}>
              {t(p.descriptionProposee ? 'Proposer une autre correction' : 'Proposer une correction')}
            </Bouton>
          </div>
        </div>
      )}

      {p.historique.length > 0 && (
        <details className="more">
          <summary>
            <Icone nom="history" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Historique de l’offre')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            {p.historique.map((h, i) => (
              <div key={i} className="row" style={{ padding: '8px 0', borderTop: '1px solid var(--line)', gap: '10px', alignItems: 'flex-start' }}>
                <span className="t12 c3 nw" style={{ minWidth: '92px' }}>
                  {dateHeure(h.a, langue)}
                </span>
                <span className="grow t13">{montants || !/F\b/.test(h.quoi) ? tf(h.quoi, Object.fromEntries(Object.entries(h.valeurs ?? {}).map(([k, v]) => [k, typeof v === 'number' ? F(v) : t(v)]))) : t('Prix changé')}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="btns" style={{ marginTop: '14px' }}>
        <Bouton classe="secondary" icone="eye" onClick={() => setApercu(true)} style={{ height: '44px' }}>
          {t('Aperçu client')}
        </Bouton>
        <Bouton classe="secondary" icone="share" onClick={() => void partager()} style={{ height: '44px' }}>
          {t('Partager')}
        </Bouton>
      </div>
      {montants && (p.etat === 'en_vente' || p.etat === 'en_pause' || p.etat === 'en_verification') && (
        <div className="btns" style={{ marginTop: '10px' }}>
          <Bouton classe="secondary" icone="copy" vers={chemin('dupliquer', { p: p.id })} style={{ height: '44px' }}>
            {t('Dupliquer')}
          </Bouton>
          {p.etat !== 'en_verification' && (
            <Bouton
              classe="secondary"
              icone={p.etat === 'en_pause' ? 'store' : 'pause'}
              style={{ height: '44px' }}
              onClick={() =>
                void source.produits.pause(p.id, p.etat === 'en_vente').then(() => {
                  jouer('interrupteur')
                  if (p.etat === 'en_vente') naviguer(chemin('produits'), { state: { message: tf('{nom} est en pause : invisible des clients', { nom }) } })
                  else dire(t('Remise en vente'))
                })
              }
            >
              {t(p.etat === 'en_pause' ? 'Remettre en vente' : 'Mettre en pause')}
            </Bouton>
          )}
        </div>
      )}
      {montants && p.etat === 'brouillon' && (
        <div className="mt10">
          <Bouton
            classe="danger"
            icone="trash-2"
            onClick={() =>
              void source.produits.supprimer(p.id).then((r) => {
                if (r.ok) naviguer(chemin('produits'), { state: { message: t('Brouillon supprimé') } })
              })
            }
          >
            {t('Supprimer le brouillon')}
          </Bouton>
        </div>
      )}
    </Ecran>
  )
}

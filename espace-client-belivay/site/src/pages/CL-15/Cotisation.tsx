// Écran « Offrir à plusieurs » (CL-15 ; EX-02), forme d'origine du prototype rendue réelle (DP-54) : créer une
// cotisation (étape 1 sur 2) : occasion, nom, cadeau (?p=… ou choisi dans le catalogue) avec son prix, relais du
// bénéficiaire (horaires, frais de retrait, changer), objectif calculé (prix livré figé + 2 % de frais de
// service), date limite (3 à 30 jours), contrôles avant création ; cadeau volumineux (XL) refusé en relais.
// Mes cotisations en cours et terminées, en tête, quand il y en a.
// Échanges (DP-54 ; donnees/echanges.ts) : qui paie la livraison (les participants, dans l'objectif, ou le
// bénéficiaire au retrait quand la garantie le permet) ; ouverte depuis un anniversaire (?beneficiaire=…&occasion=…).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { calculer, type Classe } from '../../donnees/frais'
import { source, type Produit, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { reuni, useCotisations } from './Commun'
import { destinatairePeutPayer, objectifCotisation, type PaieFrais } from '../../donnees/echanges'
import { QuiPaieLivraison } from '../CL-14/Echanges'

const OCCASIONS = ['Anniversaire', 'Mariage', 'Naissance', 'Départ', 'Autre']
const jour = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const SELECT = { width: '100%', border: 0, background: 'transparent', font: 'inherit', color: 'inherit' }

export function Cotisation() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d] = useCotisations()
  // Dès 1024 px : le formulaire à gauche (7/12), l’objectif calculé à droite, collant (§ 5.13).
  const grand = useDes('tab-l')
  const [produits, setProduits] = useState<Produit[]>([])
  const [relais, setRelais] = useState<Relais[]>([])
  const [p, setP] = useState<string | null>(params.get('p'))
  const [occasion, setOccasion] = useState(OCCASIONS.includes(params.get('occasion') ?? '') ? params.get('occasion')! : 'Anniversaire')
  const [nom, setNom] = useState('')
  const [beneficiaire, setBeneficiaire] = useState(params.get('beneficiaire') ?? '')
  const [qui, setQui] = useState<PaieFrais>('payeur') // qui paie la livraison
  const [rel, setRel] = useState<string | null>(null)
  const [changerRelais, setChangerRelais] = useState(false)
  const [changerCadeau, setChangerCadeau] = useState(false)
  const [date, setDate] = useState('')
  const [vu, setVu] = useState(false)
  useEffect(() => {
    source.produits().then(setProduits)
    source.relaisListe().then((r) => (setRelais(r.relais), setRel(r.habituel)))
  }, [])
  if (!d) return null
  const pr = produits.find((x) => x.p === p) ?? null
  const fr = pr ? calculer('relais', [{ boutique: pr.vendeur.boutique, zone: pr.vendeur.zone, articles: [{ prix: pr.prix, quantite: 1, classe: pr.classe as Classe }] }]) : null
  const prixLivre = fr ? fr.total : 0
  const xl = !!pr && ['XL', 'HG'].includes(pr.classe)
  const livraison = fr ? fr.total - fr.sousTotal : 0
  const quiOk: PaieFrais = pr && qui === 'destinataire' && destinatairePeutPayer({ articles: pr.prix, frais: livraison }).ok ? 'destinataire' : 'payeur'
  const objectif = pr ? objectifCotisation({ prix: pr.prix, frais: livraison, qui: quiOk }) : 0
  const frais = objectif - (quiOk === 'payeur' ? prixLivre : (pr?.prix ?? 0))
  const min = jour(d.maintenant + 3 * 864e5)
  const max = jour(d.maintenant + 30 * 864e5)
  const relaisChoisi = relais.find((r) => r.nom === rel) ?? null
  const erreurs = {
    nom: nom.trim().length < 3 ? 'Donne un nom d’au moins 3 caractères.' : null,
    beneficiaire: beneficiaire.trim().length < 2 ? 'Indique le prénom du bénéficiaire.' : null,
    cadeau: !pr ? 'Choisis le cadeau.' : xl ? 'Cadeau trop volumineux (XL) : il ne va pas en relais.' : null,
    relais: !rel ? 'Choisis le relais du bénéficiaire.' : null,
    date: !date || date < min || date > max ? 'Choisis une date limite entre 3 et 30 jours.' : null,
  }
  const creer = async () => {
    setVu(true)
    if (Object.values(erreurs).some(Boolean)) return
    const c = await source.creerCotisation({ nom, occasion, p: pr!.p, beneficiaire, relais: rel!, jusqua: Date.parse(date + 'T22:59:00Z'), qui: quiOk })
    naviguer(chemin('cotisation-partager', { id: c.id }), { replace: true })
  }
  const err = (k: keyof typeof erreurs) =>
    vu && erreurs[k] ? (
      <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
        {t(erreurs[k]!)}
      </div>
    ) : null
  const objectifCalcule = (
    <>
    {pr && !xl && (
      <>
        <div className="sec">
          <h2>{t('Objectif')}</h2>
        </div>
        <div className="card cl15-sum">
          <div className="cl15-r">
            <span className="lb">{t(quiOk === 'payeur' ? 'Prix livré du cadeau' : 'Prix du cadeau, sans la livraison')}</span>
            <span className="v">{F(quiOk === 'payeur' ? prixLivre : pr.prix)} F</span>
          </div>
          <div className="cl15-r">
            <span className="lb">{t('Frais de service (2 %)')}</span>
            <span className="v">{F(frais)} F</span>
          </div>
          <div className="cl15-tot">
            <span className="l">{t('Objectif')}</span>
            <span className="rt">
              <span className="price">
                {F(objectif)}
                <small>{t(' F')}</small>
              </span>
            </span>
          </div>
          <div className="hint-l">
            <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Le prix est figé à la création : une hausse ne change pas l’objectif.')}</span>
          </div>
        </div>
      </>
    )}
    </>
  )
  return (
    <Ecran gabarit="colonnes" route="cotisation">
      <Colonne classe="g5-cotis">
      <Styles id="ddcb0e469a" />
      <div className="steps">
        <i className="cur"></i>
        <i className=""></i>
      </div>
      {!INTERRUPTEURS_DU_LANCEMENT['FF-EX02'] && (
        <div className="cl15-ff">
          <span className="cl15-pill">
            <Icone nom="lock" taille={13} />
            {t('Après le lancement · interrupteur fermé')}
          </span>
          <span className="cl15-ex">{t('EX-02')}</span>
        </div>
      )}
      <div className="pg">
        <div className="pg-k">{t('Cotisation')}</div>
        <h1 className="pg-t">{t('Offrir à plusieurs')}</h1>
        <p className="pg-s">{t('L’argent reste bloqué chez BelivaY : il sert au cadeau, sinon chacun est remboursé.')}</p>
      </div>

      {d.liste.length > 0 && (
        <>
          <div className="sec">
            <h2>{t('Mes cotisations')}</h2>
          </div>
          <div className="card tight">
            {d.liste.map((c) => (
              <Link key={c.id} to={chemin(c.etat === 'atteinte' || c.etat === 'hausse' ? 'cotisation-atteinte' : c.etat === 'echue' || c.etat === 'remboursee' ? 'cotisation-echue' : 'cotisation-suivre', { id: c.id })} className="li">
                <span className={'ic ' + (c.etat === 'ouverte' ? 'or' : c.etat === 'atteinte' ? 'green' : '')}>
                  <Icone nom={c.etat === 'ouverte' ? 'coins' : c.etat === 'atteinte' || c.etat === 'hausse' ? 'gift' : 'undo-2'} taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {t(c.nom)}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {c.etat === 'ouverte' ? tf('{r} F sur {o} F · jusqu’au {d}', { r: F(reuni(c)), o: F(c.objectif), d: jourSeul(c.jusqua, langue) }) : t(c.etat === 'atteinte' ? 'Objectif atteint · commande passée' : c.etat === 'hausse' ? 'Objectif atteint · le prix a augmenté' : 'Terminée · chacun remboursé')}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="sec">
        <h2>{t('Occasion')}</h2>
      </div>
      <div className="chips">
        {OCCASIONS.map((o) => (
          <a key={o} href="#" className={'chip' + (occasion === o ? ' on' : '')} aria-pressed={occasion === o} onClick={(e) => (e.preventDefault(), setOccasion(o))}>
            {o === 'Anniversaire' && <Icone nom="cake" taille={15} />}
            {t(o)}
          </a>
        ))}
      </div>
      <div className="fld">
        <label htmlFor="co-nom">{t('Nom de la cotisation')}</label>
        <div className={'inp' + (vu && erreurs.nom ? ' err' : '')}>
          <input id="co-nom" className="grow" value={nom} maxLength={40} placeholder={t('Les 30 ans de Junior')} onChange={(e) => setNom(e.target.value)} />
        </div>
        {err('nom')}
      </div>
      <div className="fld">
        <label htmlFor="co-ben">{t('Prénom du bénéficiaire')}</label>
        <div className={'inp' + (vu && erreurs.beneficiaire ? ' err' : '')}>
          <input id="co-ben" className="grow" value={beneficiaire} maxLength={30} placeholder={t('Junior')} onChange={(e) => setBeneficiaire(e.target.value)} />
        </div>
        {err('beneficiaire')}
      </div>

      <div className="sec">
        <h2>{t('Cadeau')}</h2>
      </div>
      {(!pr || changerCadeau) && (
        <div className="fld">
          <label htmlFor="co-cadeau">{t('Cadeau')}</label>
          <div className={'inp' + (vu && erreurs.cadeau ? ' err' : '')}>
            <select id="co-cadeau" value={p ?? ''} onChange={(e) => (setP(e.target.value || null), setChangerCadeau(false))} style={SELECT}>
              <option value="">{t('Choisir dans le catalogue')}</option>
              {produits.map((x) => (
                <option key={x.p} value={x.p}>
                  {t(x.titre)} · {F(x.prix)} F
                </option>
              ))}
            </select>
          </div>
          {err('cadeau')}
        </div>
      )}
      <div className="card ">
        {pr && (
          <>
            <div className="row">
              <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
                <Dessin id={pr.dessins[0] ?? ''} />
              </span>
              <div className="grow">
                <div className="t15 b8" style={{ lineHeight: '1.3' }}>
                  {t(pr.titre)}
                </div>
                {!changerCadeau && (
                  <a href="#" className="t13 b7 cor" onClick={(e) => (e.preventDefault(), setChangerCadeau(true))}>
                    {t('Changer de cadeau')}
                  </a>
                )}
              </div>
              <span className="price">
                {F(pr.prix)}
                <small>{t(' F')}</small>
              </span>
            </div>
            {pr && !changerCadeau && err('cadeau')}
            <div className="hr"></div>
          </>
        )}
        <div className="li">
          <span className="ic or">
            <Icone nom="map-pin" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {relaisChoisi ? tf('Relais du bénéficiaire : {r}', { r: t(relaisChoisi.nom) }) : t('Relais du bénéficiaire')}
            </span>
            {relaisChoisi && (
              <span className="ls" style={{ display: 'block' }}>
                {t(relaisChoisi.horaires)}
                {fr ? ' · ' + (fr.total > fr.sousTotal ? tf('+ {m} F de retrait', { m: F(fr.total - fr.sousTotal) }) : t('retrait offert')) : ''}
              </span>
            )}
          </span>
          {rel && !changerRelais && (
            <button type="button" className="t13 b7 cor" style={{ background: 'none', border: 0, padding: 0, fontFamily: 'inherit', cursor: 'pointer' }} onClick={() => setChangerRelais(true)}>
              {t('Changer')}
            </button>
          )}
        </div>
        {(!rel || changerRelais) && (
          <div className="fld">
            <label htmlFor="co-relais">{t('Relais du bénéficiaire')}</label>
            <div className={'inp' + (vu && erreurs.relais ? ' err' : '')}>
              <select id="co-relais" value={rel ?? ''} onChange={(e) => (setRel(e.target.value || null), setChangerRelais(false))} style={SELECT}>
                <option value="">{t('Choisir un relais')}</option>
                {relais
                  .filter((r) => !r.plein)
                  .map((r) => (
                    <option key={r.nom} value={r.nom}>
                      {t(r.nom)} · {t(r.horaires)}
                    </option>
                  ))}
              </select>
            </div>
            {err('relais')}
          </div>
        )}
      </div>

      {!grand && objectifCalcule}
      {pr && !xl && <QuiPaieLivraison articles={pr.prix} frais={livraison} qui={quiOk} choisir={setQui} prenom={beneficiaire.trim()} moi={t('Les participants')} />}
      <div className="fld">
        <label htmlFor="co-date">{t('Date limite')}</label>
        <div className={'inp' + (vu && erreurs.date ? ' err' : '')}>
          <Icone nom="calendar-days" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <input id="co-date" className="grow" type="date" min={min} max={max} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {err('date') ?? <div className="hint">{t('30 jours au plus. Passé cette date sans objectif atteint, chacun est remboursé, sans frais.')}</div>}
      </div>
      <div className="btns">
        <button type="button" className="btn primary" onClick={creer}>
          <span>{t('Créer la cotisation')}</span>
        </button>
      </div>
      <div className="cl15-fine">{t('Participation libre dès 1 000 F, en Mobile Money ou par carte (+ 2 %).')}</div>
      <details className="more" open={xl || undefined}>
        <summary>
          <Icone nom="truck" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Cadeau volumineux')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Cadeau trop volumineux (XL) : livraison à domicile, jamais en relais.')}</p>
        </div>
      </details>
      </Colonne>
      {grand && pr && !xl && (
        <Aside titre="Objectif">
          {objectifCalcule}
        </Aside>
      )}
    </Ecran>
  )
}

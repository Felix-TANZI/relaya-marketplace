// Ouvrir ma boutique · étape 1 sur 3 (VD-03, OUV-01 à 05, VD03-R06, VD03-R07, REFVD-R185) : nom (interne, jamais
// montré aux clients), catégorie (celle du barème de commission), particulier ou entreprise, numéro +237 vérifié
// par code, point de la boutique sur la carte (GPS du téléphone ou posé à la main ; zone calculée par la source).
// Aucune pièce, aucune caution (GEN-05) ; deux comptes au plus par numéro (OUV-03, contrôle à l'envoi du code).
// « Ouvrir ma boutique » → code (route otp). « Changer de numéro » revient ici, les champs remplis (le dossier en
// cours, et le brouillon gardé sur l'appareil). Une ouverture déjà en cours se reprend d'un geste.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { PointBoutique, RefusOuverture, StatutVendeur } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { BoutonPlein, CartePoint, Comment, Etapes, HorsLigne, chiffresDe, espacer, numeroValide, operateur, useEnLigne, useZone } from './commun'

const CLE = 'blv_v_ouvrir_brouillon'
interface Brouillon {
  nom: string
  categorie: string
  statut: StatutVendeur
  telephone: string
  point: PointBoutique | null
}
const VIDE: Brouillon = { nom: '', categorie: '', statut: 'particulier', telephone: '', point: null }
function lireBrouillon(): Brouillon {
  try {
    return { ...VIDE, ...(JSON.parse(localStorage.getItem(CLE) ?? 'null') as Partial<Brouillon> | null) }
  } catch {
    return VIDE
  }
}

const ERREURS: Record<RefusOuverture, string> = {
  nom: 'Donnez un nom de 2 à 40 caractères.',
  categorie: 'Choisissez la catégorie de vos produits.',
  numero: 'Un numéro du Cameroun a 9 chiffres et commence par 6.',
  point: 'Posez le point de votre boutique sur la carte.',
  hors_zone: 'Ce point est hors des zones servies par BelivaY pour l’instant : placez-le à votre boutique, à Yaoundé.',
  deux_comptes: 'Deux comptes au plus par téléphone. Au-delà, la création est refusée.',
}

export default function Ouvrir() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const s = useSession()
  const enLigne = useEnLigne()
  const categories = useLecture(() => source.session.categories(), [])
  const dossier = useLecture(() => source.session.ouverture(), [])
  const [f, setF] = useState<Brouillon>(lireBrouillon)
  const [vu, setVu] = useState(false)
  const [refus, setRefus] = useState<RefusOuverture | null>(null)
  const [enCours, setEnCours] = useState(false)
  const zone = useZone(f.point)
  // « Changer de numéro » : le dossier à l'étape 1 remplit les champs (VD03-R07).
  const d = dossier.donnees
  useEffect(() => {
    if (d?.etape === 'ouvrir')
      setF((x) => ({ nom: x.nom || d.boutique.nom, categorie: x.categorie || d.boutique.categorie, statut: d.boutique.statut, telephone: x.telephone || chiffresDe(d.boutique.telephone), point: x.point ?? d.boutique.point }))
  }, [d])
  useEffect(() => {
    try {
      localStorage.setItem(CLE, JSON.stringify(f))
    } catch {
      /* rien */
    }
  }, [f])
  const maj = (champ: Partial<Brouillon>) => (setF((x) => ({ ...x, ...champ })), setRefus(null))
  const n = chiffresDe(f.telephone)
  const erreurs: Partial<Record<RefusOuverture, boolean>> = {
    nom: f.nom.trim().length < 2 || f.nom.trim().length > 40,
    categorie: !f.categorie,
    numero: !numeroValide(n),
    point: !f.point,
  }
  const montrer = (k: RefusOuverture) => (vu && erreurs[k]) || refus === k
  const ouvrir = async () => {
    setVu(true)
    if (Object.values(erreurs).some(Boolean) || !enLigne || enCours) {
      jouer('erreur')
      return
    }
    setEnCours(true)
    const r = await source.session.demarrerOuverture({ nom: f.nom, categorie: f.categorie, statut: f.statut, telephone: n, point: f.point })
    setEnCours(false)
    if (r.ok) return naviguer(chemin('otp'))
    jouer('erreur')
    setRefus(r.raison)
  }
  const enCoursAilleurs = d && d.etape !== 'ouvrir' && d.etape !== 'signee'
  return (
    <Ecran route="ouvrir" retour={s.connecte ? chemin('accueil') : chemin('connexion')}>
      <Etapes cur={1} />
      <h1 className="pg-t" style={{ marginTop: '18px' }}>
        {t('Ouvrir ma boutique')}
      </h1>
      <p className="pg-s">{t('Deux minutes, sans aucun papier.')}</p>
      {enCoursAilleurs && (
        <Link to={chemin('kyc')} className="note or" style={{ textDecoration: 'none' }}>
          <Icone nom="store" taille={18} />
          <div>
            {tf('Ouverture en cours : « {nom} ».', { nom: d.boutique.nom })} <b>{t('Reprendre où j’en étais')}</b>
          </div>
        </Link>
      )}
      {d?.etape === 'signee' && s.connecte && (
        <div className="note ink">
          <Icone nom="info" taille={18} />
          <div>{tf('Vous avez déjà une boutique (« {nom} »). Une deuxième s’ouvre avec un numéro qui a moins de deux comptes.', { nom: d.boutique.nom })}</div>
        </div>
      )}
      <div className="fld">
        <label htmlFor="ov-nom">
          {t('Nom de la boutique ')}
          <span className="req">{t('*')}</span>
        </label>
        <div className={'inp' + (montrer('nom') ? ' err' : f.nom.trim().length >= 2 ? ' ok' : '')}>
          <input id="ov-nom" maxLength={40} autoComplete="organization" placeholder={t('Ex. : Tonton PG')} value={f.nom} onChange={(e) => maj({ nom: e.target.value })} />
          <span className="suf">{`${f.nom.trim().length}/40`}</span>
        </div>
        {montrer('nom') && <div className="hint err">{t(ERREURS.nom)}</div>}
        <div className="hint">{t('Jamais montré aux clients. Ils voient seulement votre palier (niveau) et votre Trust Score (note sur 100).')}</div>
      </div>
      <div className="fld">
        <label htmlFor="ov-cat">
          {t('Catégorie ')}
          <span className="req">{t('*')}</span>
        </label>
        <div className={'inp' + (montrer('categorie') ? ' err' : f.categorie ? ' ok' : '')}>
          <select id="ov-cat" value={f.categorie} onChange={(e) => maj({ categorie: e.target.value })}>
            <option value="">{t('Choisir une catégorie')}</option>
            {(categories.donnees ?? []).map((c) => (
              <option key={c} value={c}>
                {t(c)}
              </option>
            ))}
          </select>
          <span className="suf">
            <Icone nom="chevron-down" taille={18} />
          </span>
        </div>
        {montrer('categorie') && <div className="hint err">{t(ERREURS.categorie)}</div>}
        <div className="hint">{t('Elle fixe la part que vous gardez sur chaque vente. Vous pourrez vendre d’autres catégories ensuite.')}</div>
      </div>
      <div className="fld">
        <label id="ov-statut">
          {t('Vous vendez en tant que ')}
          <span className="req">{t('*')}</span>
        </label>
        <div className="seg" role="radiogroup" aria-labelledby="ov-statut" style={{ margin: '0' }}>
          {(['particulier', 'entreprise'] as const).map((x) => (
            <a
              key={x}
              role="radio"
              tabIndex={0}
              aria-checked={f.statut === x}
              className={f.statut === x ? 'on' : ''}
              style={{ height: '44px', cursor: 'pointer' }}
              onClick={() => maj({ statut: x })}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), maj({ statut: x }))}
            >
              {t(x === 'particulier' ? 'Particulier' : 'Entreprise')}
            </a>
          ))}
        </div>
        <div className="hint">{t('Une entreprise ajoute son RCCM et son NIU plus tard ; un particulier, rien.')}</div>
      </div>
      <div className="fld">
        <label htmlFor="ov-num">
          {t('Votre numéro ')}
          <span className="req">{t('*')}</span>
        </label>
        <div className={'inp' + (montrer('numero') || refus === 'deux_comptes' ? ' err' : numeroValide(n) ? ' ok' : '')}>
          <span className="b8 c2 row" style={{ gap: '6px', paddingRight: '8px', borderRight: '1px solid var(--line-2)' }}>
            <Dessin id="81b1dee44510" />
            {t('+237')}
          </span>
          <input id="ov-num" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="677 42 18 90" value={espacer(n)} onChange={(e) => maj({ telephone: chiffresDe(e.target.value) })} />
          {operateur(n) && numeroValide(n) && <span className="suf">{t(operateur(n)!)}</span>}
        </div>
        {montrer('numero') && <div className="hint err">{t(ERREURS.numero)}</div>}
        <div className="hint">{t('Vérifié par un code reçu par SMS.')}</div>
      </div>
      <div className="fld">
        <label>
          {t('Le point de votre boutique ')}
          <span className="req">{t('*')}</span>
        </label>
        <CartePoint
          point={f.point}
          zone={zone}
          changer={(point) => maj({ point })}
          dessin="f347fb8dc6b6"
          hauteur={150}
          erreur={montrer('point') ? ERREURS.point : refus === 'hors_zone' ? ERREURS.hors_zone : null}
        />
        <div className="hint">{t('Posez le point depuis votre boutique : il sert à calculer la livraison.')}</div>
      </div>
      {refus === 'deux_comptes' && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>
            <b>{t('Deux comptes au plus par téléphone.')}</b> {t('Ce numéro en a déjà deux : utilisez un autre numéro, ou connectez-vous.')}
          </div>
        </div>
      )}
      {!enLigne && <HorsLigne texte="Le code partira dès le retour du réseau ; vos champs restent remplis." />}
      <div className="mt20">
        <BoutonPlein icone="store" actif={enLigne && !enCours} raison={t('Pas de connexion.')} onClick={() => void ouvrir()}>
          {t(enCours ? 'Envoi du code…' : 'Ouvrir ma boutique')}
        </BoutonPlein>
      </div>
      <Comment>
        {(
          [
            ['Ouvrir', 'Nom, catégorie, particulier ou entreprise, numéro vérifié, point sur la carte.', 'Vous ajoutez vos produits en brouillon.'],
            ['Publier', 'CNI recto et verso, selfie vidéo avec la pièce, numéro Mobile Money.', 'Vos produits passent en ligne.'],
            ['Être payé', 'Contrat signé.', 'Votre premier versement part.'],
          ] as const
        ).map(([titre, texte, debloque], i) => (
          <div key={titre} className="row" style={{ alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderTop: '1px solid var(--line)' }}>
            <span className="badge-num">{t(String(i + 1))}</span>
            <div className="grow">
              <div className="b8 t14" style={{ color: 'var(--ink)' }}>
                {t(titre)}
              </div>
              <div className="t13 c2">{t(texte)}</div>
              <div className="t13 cg b7">{t(debloque)}</div>
            </div>
          </div>
        ))}
        <p style={{ margin: '8px 0 0' }}>{t('Aucune caution, aucun dépôt, aucun frais d’entrée.')}</p>
      </Comment>
      <Link to={chemin('bienvenue_client')} className="vx-from" style={{ textDecoration: 'none' }}>
        <Icone nom="badge-check" taille={22} />
        <span>{t('Déjà client BelivaY ? Ouvrez votre boutique depuis l’app : rien à ressaisir.')}</span>
      </Link>
      <p className="scrim-note" style={{ marginTop: '8px' }}>
        {t('Déjà vendeur ? ')}
        <Link to={chemin('connexion')} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
          {t('Se connecter')}
        </Link>
      </p>
    </Ecran>
  )
}

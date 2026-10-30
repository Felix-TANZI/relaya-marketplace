// Remise au livreur (VD-06, route « commande_prete ») — balisage du prototype (route('commande_prete')), branché sur la
// source (domaine remise) et rendu logique (DP-53) :
// - livreur du créneau (nom, photo, entreprise, créneau en clair) TOUJOURS avant le code (REM-02) ;
// - code masqué à l'ouverture, demandé au toucher de « Afficher le code » (journalisé : VD06-R05), en deux groupes de
//   trois chiffres (REM-09), masqué en quittant l'écran ou en passant l'application en arrière-plan (REM-01) ;
// - une seule action à la fois, aucun bouton plein orange (REM-08) ; la remise est enregistrée quand le LIVREUR saisit
//   le code : l'écran passe seul à « Remis au livreur » (critère 5), en écoutant la source (sondage court tant que le
//   code est affiché) ;
// - les cas d'erreur (VD06-R09) en carte d'erreur, avec leur vraie issue : livreur absent (nouveau créneau), remise
//   bloquée après 3 codes faux (« Demander un nouveau code », DP-56), annulée par le client, délai dépassé
//   (« C'est prêt » ici même, rupture), pas de réseau (code lisible, « C'est prêt » mis en file), colis de valeur ;
// - commande pas encore prête : « C'est prêt » (bouton blanc de la carte clé), qui crée le code (DP-56) ;
// - ajouts : autres colis prêts pour le même passage, compte à rebours jusqu'au créneau, bon, journal et détail de la
//   commande, vibration et son à l'affichage du code ;
// - démonstration : les autres applications (livreur qui saisit le code avec les six cases de SaisieCode du client,
//   livreur absent, client qui annule), dans une carte en pointillés, absente avec la source « api ».
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { env } from '@client/config/env'
import { jouer } from '@client/composants/Sons'
import { sonner } from '../../composants/marque-sonore'
import { mouvementLibre } from '@client/composants/Animations'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { CasesCode, type Saisie } from '@client/composants/SaisieCode'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Remise } from '../../donnees/domaines/remise'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, entre, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { ErreurLecture, Squelette, enLettres, geste, useReseau } from '../VD-04/commun'
import { CarteErreur, Image, carteDe, jourRelatif, versSupport, type Action } from './commun'

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Référence de l'adresse, sinon la prochaine remise à faire, sinon la prochaine commande à préparer. */
async function lire(ref: string | null): Promise<Remise | null> {
  const r = ref ?? (await source.remise.aRemettre())[0]?.ref ?? (await source.commandes.liste('prep'))[0]?.ref ?? null
  return r ? source.remise.remise(r) : null
}

function Code6({ code }: { code: string | null }) {
  const { t } = usePreferences()
  const chiffres = code ? code.split('') : Array.from({ length: 6 }, () => '•')
  const taille = code ? '36px' : '28px'
  return (
    <div className={'code6' + (code ? ' vd6-vu' : ' mask')} style={{ gap: '6px' }} aria-label={code ? `${code.slice(0, 3)} ${code.slice(3)}` : t('masqué')} role="img">
      {chiffres.slice(0, 3).map((c, i) => (
        <span key={'a' + i + c} style={{ width: '44px', height: '64px', fontSize: taille }}>
          {c}
        </span>
      ))}
      <i style={{ width: '8px', flexShrink: '0' }}></i>
      {chiffres.slice(3).map((c, i) => (
        <span key={'b' + i + c} style={{ width: '44px', height: '64px', fontSize: taille }}>
          {c}
        </span>
      ))}
    </div>
  )
}

function CommentCaMarche() {
  const { t } = usePreferences()
  const etapes: [string, string][] = [
    ['Il contrôle l’article', 'Bon modèle, bonne couleur, état neuf'],
    ['Il prend deux photos', 'L’article à découvert, puis le colis fermé et étiqueté'],
    ['Il emballe et scelle', 'Emballage BelivaY, scellé, étiquette. Un volumineux garde son carton d’origine, filmé.'],
    ['Il saisit votre code', 'La remise est enregistrée : la responsabilité passe à l’entreprise de livraison'],
  ]
  // Fermé à l'ouverture, état non mémorisé (VD06-R06).
  return (
    <details className="more">
      <summary>
        <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t('Comment ça marche')}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">
        <p>{t('Ce que fait le livreur devant vous :')}</p>
        <div className="tl">
          {etapes.map(([a, b]) => (
            <div key={a} className="ti">
              <div className="tt">{t(a)}</div>
              <div className="td">{t(b)}</div>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}

// Six cases de SaisieCode (client), côté livreur : la saisie part au serveur, qui compte les essais.
function useSaisieLivreur(ref: string, fini: () => void): Saisie {
  const { t, tf, langue } = usePreferences()
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [bloque, setBloque] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [focus, setFocus] = useState(0)
  const valider = async () => {
    if (code.length !== 6 || enCours || bloque) return
    setEnCours(true)
    const r = await source.remise.saisieLivreur(ref, code)
    setEnCours(false)
    setCode('')
    if (r.ok) return fini()
    jouer('erreur')
    if (r.bloqueJusqua) {
      setBloque(true)
      setErreur(tf('Remise bloquée jusqu’à {h}.', { h: heure(r.bloqueJusqua, langue) }))
    } else setErreur(r.essaisRestants === 1 ? t('Ce code ne correspond pas. Dernier essai.') : tf('Ce code ne correspond pas. Encore {n} essais.', { n: r.essaisRestants }))
    setFocus((f) => f + 1)
  }
  return {
    code,
    envoi: { destination: '', valideMinutes: 0, renvoiSecondes: 0 },
    erreur,
    estBloque: bloque,
    reste: 0,
    enCours,
    pret: code.length === 6 && !enCours && !bloque,
    focus,
    saisir: (v) => {
      setCode(v.replace(/\D/g, '').slice(0, 6))
      if (erreur && !bloque) setErreur(null)
    },
    valider,
    renvoyer: async () => undefined,
  }
}

function FeuilleLivreur({ r, ouverte, fermer }: { r: Remise; ouverte: boolean; fermer: () => void }) {
  const { t } = usePreferences()
  // Bon code : l'écran « Remis » s'ouvre de lui-même (la remise est lue dans la source), la feuille part avec.
  const s = useSaisieLivreur(r.ref, () => undefined)
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Application du livreur')}>
      <div className="kick" style={{ color: 'var(--ink-3)', fontSize: '12px' }}>
        {t('Démonstration · application du livreur')}
      </div>
      <h2 className="b8" style={{ fontSize: '20px', margin: '6px 0 0' }}>
        {r.livreur ? `${r.livreur.nom} · ${r.ref}` : r.ref}
      </h2>
      <p className="t13 c2" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
        {t('Le livreur tape le code que le vendeur lui montre. Le serveur le vérifie : l’application du vendeur ne le compare jamais.')}
      </p>
      <div className="vd6-saisie">
        <CasesCode s={s} />
      </div>
      <div className={'vd6-msg' + (s.erreur ? ' err' : '')} role={s.erreur ? 'alert' : undefined}>
        {s.erreur ?? t('Six chiffres')}
      </div>
      <div className="mt12">
        <button type="button" className="btn primary" disabled={!s.pret} onClick={() => void s.valider()}>
          <Icone nom="check" taille={18} />
          <span>{t('Valider la remise')}</span>
        </button>
      </div>
    </Feuille>
  )
}

export default function CommandePrete() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge(15_000)
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const enLigne = useReseau()
  const refParam = params.get('ref')
  const lecture = useLecture(() => lire(refParam).then((r) => ({ r })), [refParam, s.membre?.role])
  const r = lecture.donnees?.r ?? null
  const [code, setCode] = useState<string | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const [enFile, setEnFile] = useState(false)
  const livreurSheet = useFeuille('livreur')
  const hero = useRef<HTMLDivElement>(null)

  // Le code se masque en quittant l'écran, en changeant de commande ou en passant l'application en arrière-plan.
  useEffect(() => setCode(null), [r?.ref])
  useEffect(() => {
    const cacher = () => document.hidden && setCode(null)
    document.addEventListener('visibilitychange', cacher)
    return () => document.removeEventListener('visibilitychange', cacher)
  }, [])
  // Sondage court tant que le code est affiché (REM-08) : la remise faite par le livreur ouvre « Remis ».
  const { relire } = lecture
  useEffect(() => {
    if (!code) return
    const id = setInterval(relire, 5000)
    return () => clearInterval(id)
  }, [code, relire])
  const remiseA = r?.remiseA ?? null
  useEffect(() => {
    if (!r || r.etape !== 'remise' || !remiseA) return
    sonner('remiseLivreur')
    naviguer(chemin('commande_remise', { ref: r.ref }), { replace: true })
  }, [r, remiseA, naviguer])

  const afficher = useCallback(async () => {
    if (!r) return
    const x = await source.remise.afficherCode(r.ref)
    if (!x.ok) {
      setRefus(x.raison)
      return lecture.relire()
    }
    setRefus(null)
    setCode(x.code)
    jouer('code')
    if (mouvementLibre()) navigator.vibrate?.(20)
  }, [r, lecture])

  const cestPret = useCallback(async () => {
    if (!r) return
    const fait = await geste(enLigne, 'pret', r.ref, () => source.preparation.cestPret(r.ref))
    setEnFile(fait === 'en_file')
    if (fait === 'fait') sonner('cestPret')
  }, [r, enLigne])

  const nouveauCode = useCallback(async () => {
    if (!r) return
    await source.remise.nouveauCode(r.ref)
    jouer('notification')
  }, [r])

  const titre = tf('Remise · {ref}', { ref: r?.ref ?? refParam ?? '' })
  const retour = chemin('commande', { ref: r?.ref ?? refParam })
  if (lecture.erreur) return <Ecran route="commande_prete" titre={titre} retour={retour}><ErreurLecture erreur={lecture.erreur} relire={lecture.relire} /></Ecran>
  if (!lecture.donnees)
    return (
      <Ecran route="commande_prete" titre={titre} retour={retour}>
        <Squelette cartes={2} />
      </Ecran>
    )
  if (!r)
    return (
      <Ecran route="commande_prete" titre={titre} retour={chemin('commandes')}>
        <div className="empty" style={{ marginTop: '24px' }}>
          <div className="ei">
            <Icone nom="package-search" taille={26} />
          </div>
          <h3>{t('Aucune commande à remettre')}</h3>
          <p>{t('Une commande prête apparaît ici, avec le livreur du créneau et son code de remise.')}</p>
          <div style={{ maxWidth: '260px', margin: '12px auto 0' }}>
            <Link to={chemin('commandes')} className="btn secondary" style={{ height: '44px' }}>
              <Icone nom="shopping-bag" taille={18} />
              <span>{t('Voir les commandes')}</span>
            </Link>
          </div>
        </div>
      </Ecran>
    )

  const nom = r.livreur?.nom ?? t('le livreur')
  const actions: Partial<Record<'absent' | 'bloque' | 'depasse' | 'reseau', Action>> = {
    absent: { libelle: t('Voir le nouveau créneau'), icone: 'calendar-clock', onClick: () => hero.current?.scrollIntoView({ behavior: mouvementLibre() ? 'smooth' : 'auto', block: 'start' }) },
    bloque: r.nouveauCodeDemande ? { libelle: t('Écrire au support'), icone: 'message-circle', vers: versSupport(r.ref) } : { libelle: t('Demander un nouveau code'), icone: 'key-round', onClick: () => void nouveauCode() },
    depasse: { libelle: t('C’est prêt'), icone: 'package-check', onClick: () => void cestPret() },
    reseau: { libelle: t('Afficher le code'), icone: 'eye', onClick: () => void afficher() },
  }
  const opt = { maintenant, langue, t, tf, actions }
  const entete = { dessin: r.article.dessin, titre: `${r.article.titre} · ${t(r.article.variante)}`, sous: tf('{ref} · colis {c}', { ref: r.ref, c: r.colis }) }
  // Cartes d'erreur de l'écran : l'incident du serveur, et le réseau constaté par l'appareil (commande prête).
  const cartes = [...(r.erreur ? [r.erreur] : []), ...(!enLigne && r.etape === 'prete' && r.erreur !== 'bloque' ? (['reseau'] as const) : [])]
  const creneauEnClair = r.livreur ? majuscule(`${jourRelatif(r.livreur.debut, maintenant, langue)} ${entre(r.livreur.creneau, langue)}`) : ''
  const avantCreneau = r.livreur ? r.livreur.debut - maintenant : 0

  return (
    <Ecran
      route="commande_prete"
      titre={titre}
      retour={retour}
      fixes={r.etape === 'prete' && env.source === 'demo' ? <FeuilleLivreur r={r} ouverte={livreurSheet.ouverte} fermer={livreurSheet.fermer} /> : undefined}
    >
      <div className="meta" style={{ marginTop: '14px' }}>
        {r.etape === 'prete' && r.preteA !== null && (
          <span className="pill green">
            <Icone nom="circle-check" taille={13} />
            {tf('Prête à {h}', { h: heure(r.preteA, langue) })}
          </span>
        )}
        {r.etape === 'a_preparer' && r.echeance !== null && (
          <span className={'pill ' + (r.erreur === 'depasse' ? 'red' : 'amber')}>
            <Icone nom="timer" taille={13} />
            {tf('À préparer avant {h}', { h: heure(r.echeance, langue) })}
          </span>
        )}
        {r.etape === 'annulee' && <span className="pill red">{t('Annulée')}</span>}
        <span className="pill ink">
          <Icone nom="package" taille={13} />
          {tf('Colis {c}', { c: r.colis })}
        </span>
      </div>

      {cartes
        .filter((c) => c !== 'bloque')
        .map((c) => (
          <CarteErreur key={c} c={carteDe(c, r, opt)} entete={entete} sobre />
        ))}

      {r.livreur && r.etape !== 'annulee' && (
        <div className="hero night" ref={hero}>
          <div className="hk">{t('Livreur du créneau')}</div>
          <div className="row mt12" style={{ gap: '14px' }}>
            <span style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', flexShrink: '0', boxShadow: '0 0 0 3px rgba(255,255,255,.3)' }}>
              <Image src={r.livreur.photo} alt={r.livreur.nom} />
            </span>
            <div className="grow">
              <div className="b8" style={{ fontSize: '23px', letterSpacing: '-.02em', lineHeight: '1.15' }}>
                {r.livreur.nom}
              </div>
              <div className="t14 b7 mt4" style={{ color: 'rgba(255,255,255,.9)' }}>
                {r.livreur.societe}
              </div>
              <div className="t13" style={{ marginTop: '2px', color: 'rgba(255,255,255,.75)' }}>
                {creneauEnClair}
              </div>
              {avantCreneau > 0 && avantCreneau < 12 * 3600 * 1000 && (
                <div className="t12 b7" style={{ marginTop: '2px', color: 'rgba(255,255,255,.75)' }}>
                  {tf('Arrive dans {d}', { d: duree(avantCreneau, langue) })}
                </div>
              )}
            </div>
          </div>
          <div className="hline"></div>
          <div className="otop">
            <span className="hk" style={{ color: '#fff', opacity: '.85' }}>
              {t('Code de remise')}
            </span>
            <span className="pill dk sm">
              <Icone nom={r.bloqueJusqua ? 'lock' : code ? 'eye' : 'eye-off'} taille={13} />
              {r.bloqueJusqua ? t('bloqué') : code ? t('affiché') : t('masqué')}
            </span>
          </div>
          {r.etape === 'a_preparer' ? (
            <>
              <div className="t14 b7 center mt14" style={{ color: '#fff', lineHeight: '1.4' }}>
                {enFile ? t('« C’est prêt » partira au retour du réseau, avec son heure d’origine.') : t('Le code se crée quand la commande est prête.')}
              </div>
              {!enFile && (
                <div className="mt12">
                  <button type="button" className="btn white" onClick={() => void cestPret()}>
                    <Icone nom="package-check" taille={18} />
                    <span>{t('C’est prêt')}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <Code6 code={r.bloqueJusqua ? null : code} />
              <div className="t14 b7 center mt14" style={{ color: '#fff', lineHeight: '1.4' }} aria-live="polite">
                {r.bloqueJusqua
                  ? t('Ne remettez l’article à personne')
                  : code
                    ? tf('Montrez-le à {nom} : il le saisit dans son application.', { nom })
                    : t('Vérifiez son visage, puis affichez le code.')}
              </div>
              {!r.bloqueJusqua && (
                <div className="mt12">
                  {code ? (
                    <button type="button" className="btn dark" onClick={() => setCode(null)}>
                      <Icone nom="eye-off" taille={18} />
                      <span>{t('Masquer le code')}</span>
                    </button>
                  ) : (
                    <button type="button" className="btn white" onClick={() => void afficher()}>
                      <Icone nom="eye" taille={18} />
                      <span>{t('Afficher le code')}</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          <div className="t12 mt10 center" style={{ color: 'rgba(255,255,255,.72)', lineHeight: '1.45' }}>
            {t('Marche sans réseau · masqué en quittant l’écran')}
          </div>
          {refus && !code && (
            <div className="t13 b7 mt8 center" role="alert" style={{ color: '#fff' }}>
              {t(refus === 'bloquee' ? 'Remise bloquée : le code ne s’affiche plus.' : refus === 'annulee' ? 'Commande annulée : il n’y a plus rien à remettre.' : 'Ce code n’est plus valable.')}
            </div>
          )}
        </div>
      )}

      {r.erreur === 'bloque' && <CarteErreur c={carteDe('bloque', r, opt)} entete={entete} sobre />}
      {r.bloqueJusqua && r.nouveauCodeDemande && (
        <div className="note ink" role="status">
          <Icone nom="key-round" taille={18} />
          <div>{tf('Nouveau code demandé : l’ancien est annulé. Il marchera dès le déblocage, {jour} à {h}.', { jour: jourRelatif(r.bloqueJusqua, maintenant, langue), h: heure(r.bloqueJusqua, langue) })}</div>
        </div>
      )}

      {code && (
        <div className="card tight">
          <div className="li vd6-attente" role="status">
            <span className="ic or">
              <Icone nom="hourglass" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('En attente de la saisie du code')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {tf('Dès que {nom} l’a saisi, l’écran « Remis » s’ouvre.', { nom })}
              </span>
            </span>
          </div>
        </div>
      )}

      {r.etape !== 'annulee' && (
        <div className="note red">
          <Icone nom="shield-alert" taille={18} />
          <div>
            <b>{tf('Ne donnez le code qu’à {nom}.', { nom })}</b>
            <div className="mt4">{t('Ce n’est pas lui ? Ne remettez rien.')}</div>
            <div className="mt4">{tf('{n} codes faux bloquent la remise {h} h.', { n: enLettres(r.essaisMax, langue), h: r.blocageHeures })}</div>
            {r.etape === 'prete' && r.essaisFaux > 0 && !r.bloqueJusqua && (
              <div className="mt4 b8">{tf('Codes faux saisis : {n} sur {max}.', { n: r.essaisFaux, max: r.essaisMax })}</div>
            )}
            <Link to={versSupport(r.ref)} className="b8" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '44px', marginBottom: '-8px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              <Icone nom="message-circle" taille={16} />
              {t('Écrire au support')}
            </Link>
          </div>
        </div>
      )}

      {r.autresPourCeLivreur.length > 0 && r.etape === 'prete' && (
        <div className="card tight">
          {r.autresPourCeLivreur.map((x) => (
            <Link key={x} to={chemin('commande_prete', { ref: x })} className="li">
              <span className="ic green">
                <Icone nom="package-check" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {tf('Aussi pour {nom} : {ref}', { nom, ref: x })}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Prête, au même passage : un code par colis')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          ))}
        </div>
      )}

      <CommentCaMarche />

      <div className="links" style={{ flexWrap: 'wrap' }}>
        <Link to={chemin('commande', { ref: r.ref })} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}>
          <Icone nom="file-text" taille={17} />
          {t('Détail')}
        </Link>
        <Link to={chemin('bon', { ref: r.ref })} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}>
          <Icone nom="clipboard-list" taille={17} />
          {t('Bon de préparation')}
        </Link>
        <Link to={chemin('journal', { ref: r.ref })} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}>
          <Icone nom="history" taille={17} />
          {t('Journal')}
        </Link>
        <Link to={chemin('erreurs', { ref: r.ref })} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}>
          <Icone nom="circle-help" taille={17} />
          {t('Quand la remise bloque')}
        </Link>
      </div>

      {env.source === 'demo' && (r.etape === 'prete' || r.etape === 'a_preparer') && (
        <div className="card vd6-demo">
          <div className="kick" style={{ color: 'var(--ink-3)', fontSize: '12px' }}>
            {t('Démonstration · les autres applications')}
          </div>
          <p className="t13 c2" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
            {t('En vrai, ces gestes viennent de l’application du livreur et de celle du client.')}
          </p>
          {r.etape === 'prete' && (
            <>
              <div className="mt12">
                <button type="button" className="btn secondary" onClick={livreurSheet.ouvrir} style={{ height: '44px' }}>
                  <Icone nom="smartphone" taille={18} />
                  <span>{tf('{nom} saisit le code', { nom })}</span>
                </button>
              </div>
              <div className="mt8">
                <button type="button" className="btn secondary" onClick={() => void source.remise.simuler(r.ref, 'livreur_absent')} style={{ height: '44px' }}>
                  <Icone nom="clock-alert" taille={18} />
                  <span>{t('Le livreur ne vient pas')}</span>
                </button>
              </div>
            </>
          )}
          <div className="mt8">
            <button type="button" className="btn secondary" onClick={() => void source.remise.simuler(r.ref, 'annulation_client')} style={{ height: '44px' }}>
              <Icone nom="circle-x" taille={18} />
              <span>{t('Le client annule')}</span>
            </button>
          </div>
        </div>
      )}
    </Ecran>
  )
}

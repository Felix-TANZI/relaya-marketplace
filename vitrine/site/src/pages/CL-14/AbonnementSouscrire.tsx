// Écran « Souscrire » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : le palier choisi
// (?palier=…&formule=mois|an|pass) : ce qui est payé aujourd'hui (premier mois de Prime à 1 500 F, une fois par
// compte et par numéro ; déjà utilisé : prévenu, plein tarif), le palier, la formule (annuelle : 10 mois payés
// pour 12, l'économie, non remboursable), ensuite, la date du prochain prélèvement et son annonce 3 jours avant ;
// le Pass 7 jours (valable, 4 commandes, sans prélèvement) ; le numéro Mobile Money choisi parmi ceux du compte,
// la demande validée sur le téléphone ; les conditions. Business : le justificatif d'activité (patente ou RCCM)
// en photo avant l'ouverture. Déjà ton palier : renvoi vers « Mon abonnement ».
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { nomMoMo } from '../../donnees/numeros'
import { reduirePhoto, TYPES_PHOTO } from '../../donnees/photo'
import { ESSAI, PASS, palier } from '../../donnees/prime'
import { source, type Abonnement, type MoyenPaiement } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { avantages, nomPalier, usePrime } from './Commun'
import { BandeauPrime, jourDe } from './MonAbonnement'

const J = 864e5

export function AbonnementSouscrire() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d, recharger] = usePrime()
  const [piece, setPiece] = useState<'Patente' | 'RCCM'>('Patente')
  const [photo, setPhoto] = useState<string | null>(null)
  const [moyens, setMoyens] = useState<MoyenPaiement[] | null>(null)
  const [choix, setChoix] = useState<string | null>(null)
  const [attente, setAttente] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const fichier = useRef<HTMLInputElement>(null)
  useEffect(() => {
    source.moyensPaiement().then((m) => {
      setMoyens(m)
      setChoix((m.find((x) => x.parDefaut) ?? m[0])?.id ?? null)
    })
  }, [])
  const id = (params.get('palier') ?? 'prime') as Abonnement['palier']
  const formule = (id === 'pass' ? 'pass' : params.get('formule') === 'an' ? 'an' : 'mois') as Abonnement['formule']
  // Dès 1024 px : le choix à gauche, le récapitulatif et « Payer » dans l’aside collant (§ 5.12).
  const grand = useDes('tab-l')
  if (!d || !moyens) return null
  const p = id === 'pass' ? null : palier(id)
  if (id !== 'pass' && !p)
    return (
      <Ecran route="abonnement-souscrire">
        <div className="card">
          <div className="empty">
            <h3>{t('Ce palier n’existe pas')}</h3>
            <div className="btns">
              <Link to={chemin('abonnements')} className="btn primary">
                <span>{t('Voir les abonnements')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const t0 = d.maintenant
  const jour = (ms: number) => jourDe(ms, t0, langue)
  const nom = id === 'prime' ? t('Prime ★') : t(nomPalier(id))
  const essai = id === 'prime' && formule === 'mois' && !d.essaiUtilise
  const aujourdhui = id === 'pass' ? PASS.prix : essai ? ESSAI : formule === 'an' ? p!.an : p!.mois
  const ensuite = id === 'pass' ? 0 : formule === 'an' ? p!.an : p!.mois
  const prochain = id === 'pass' ? null : t0 + (formule === 'an' ? 365 : 30) * J
  const courant = d.actif && d.abonnement?.palier === id && !d.abonnement.resilie

  if (id === 'business')
    return (
      <Ecran route="abonnement-souscrire" gabarit="colonnes">
        <Colonne>
        <Styles id="02f3dac5cd" />
        <BandeauPrime />
        <div className="pg">
          <div className="pg-k">{t('Abonnement · Business')}</div>
          <h1 className="pg-t">{t('Business, pour les revendeurs')}</h1>
          <p className="pg-s">{t('Business est réservé aux revendeurs vérifiés. BelivaY vérifie ton activité avant d’ouvrir ce palier.')}</p>
        </div>
        <div className="card ">
          <div className="kv">
            <span className="k">{t('Prix')}</span>
            <span className="v ">{tf('{a} F / an ou {m} F / mois', { a: F(p!.an), m: F(p!.mois) })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Comptes')}</span>
            <span className="v ">{tf('{n} comptes déclarés', { n: p!.comptes })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Illimité en usage normal')}</span>
            <span className="v ">{tf('jusqu’à {n} commandes par mois', { n: p!.plafond })}</span>
          </div>
          <ul className="cl14-bl">
            {avantages('business', tf).map((a) => (
              <li key={a}>
                <Icone nom="check" taille={16} trait={2.6} />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
        </Colonne>
        <Aside titre="Ton justificatif">
        {d.business === 'envoyee' ? (
          <div className="note green">
            <Icone nom="circle-check" taille={18} />
            <div>
              {t('Justificatif reçu. Réponse dans ta messagerie sous 48 h ouvrées.')} <Link to={chemin('messagerie')}>{t('Messagerie')}</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="sec">
              <h2>{t('Ton justificatif')}</h2>
            </div>
            <input
              ref={fichier}
              type="file"
              accept={TYPES_PHOTO.join(',')}
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) setPhoto(await reduirePhoto(f))
              }}
            />
            <div className="photos">
              {(['Patente', 'RCCM'] as const).map((x) =>
                photo && piece === x ? (
                  <a
                    key={x}
                    href="#"
                    role="button"
                    className="addph"
                    aria-label={tf('Reprendre la photo : {p}', { p: t(x) })}
                    style={{ padding: 0, overflow: 'hidden' }}
                    onClick={(e) => (e.preventDefault(), fichier.current?.click())}
                  >
                    <img src={photo} alt={t(x)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </a>
                ) : (
                  <a key={x} href="#" role="button" className="addph" onClick={(e) => (e.preventDefault(), setPiece(x), setPhoto(null), fichier.current?.click())}>
                    <Icone nom="camera" taille={22} />
                    {t(x)}
                  </a>
                ),
              )}
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Une photo nette de ta patente ou de ton RCCM suffit. Réponse dans ta messagerie.')}</span>
            </div>
            <div className="btns mt16">
              <button
                type="button"
                className={'btn primary' + (photo && !envoi ? '' : ' off')}
                onClick={async () => {
                  if (!photo || envoi) return
                  setEnvoi(true)
                  await source.demanderBusiness(piece)
                  setEnvoi(false)
                  recharger()
                }}
              >
                <Icone nom="upload" taille={18} />
                <span>{t('Envoyer mon justificatif')}</span>
              </button>
            </div>
          </>
        )}
        </Aside>
      </Ecran>
    )

  const m = moyens.find((x) => x.id === choix)
  const libelle = m ? `${nomMoMo(m.operateur)} · ${m.numeroMasque}` : ''
  const conditions = (
    <>
      {id === 'pass' && <p>{t('Le Pass ne couvre ni les ramassages supplémentaires ni les suppléments de colis M et L.')}</p>}
      <p>{t('Livraison offerte = premier ramassage et remise au tarif d’un colis S : jamais les ramassages supplémentaires ni les suppléments de classe. Le prix des produits est le même pour tous.')}</p>
      <p>{t('Lié à ton compte et à ce numéro MoMo, non transférable. Échec de prélèvement : 7 jours de grâce, puis retour au palier Gratuit sans rien perdre.')}</p>
      <p>
        <Link to={chemin('legal')} className="cor b7">
          {t('Lire les conditions de l’abonnement')}
        </Link>
      </p>
    </>
  )
  const plusConditions = (classe: string) => (
    <details className={classe}>
      <summary>
        <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t('Toutes les conditions')}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">{conditions}</div>
    </details>
  )
  // Dès 1024 px, le récapitulatif, le paiement et sa garantie passent dans l’aside collant (§ 5.12) ; sur
  // téléphone et tablette portrait, ils restent à leur place.
  const recap = (
    <>
      <div className="card or">
        <div className="kick">{t('À payer aujourd’hui')}</div>
        <div className="mt4 cl14-po">
          <span className="price xl">
            {F(aujourdhui)}
            <small>{t(' F')}</small>
          </span>
        </div>
        <div className="hr"></div>
        {id === 'pass' ? (
          <>
            <div className="kv">
              <span className="k">{t('Valable')}</span>
              <span className="v ">{tf('du {a} au {b}', { a: jour(t0), b: jour(t0 + PASS.jours * J) })}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Relais offert')}</span>
              <span className="v ">{tf('dès {m} F, {n} commandes au plus', { m: F(PASS.relaisDes), n: PASS.commandes })}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Prélèvement récurrent')}</span>
              <span className="v ">{t('aucun : il s’arrête tout seul')}</span>
            </div>
          </>
        ) : (
          <>
            <div className="kv">
              <span className="k">{t('Palier')}</span>
              <span className="v ">{nom}</span>
            </div>
            {essai ? (
              <>
                <div className="kv">
                  <span className="k">{t('Essai')}</span>
                  <span className="v ">{tf('{m} F, une fois par compte et par numéro', { m: F(ESSAI) })}</span>
                </div>
                <div className="kv">
                  <span className="k">{t('Ensuite')}</span>
                  <span className="v ">{tf('{m} F par mois', { m: F(ensuite) })}</span>
                </div>
              </>
            ) : (
              <div className="kv">
                <span className="k">{t('Formule')}</span>
                <span className="v ">{t(formule === 'an' ? 'Annuelle : 10 mois payés pour 12' : 'Mensuelle')}</span>
              </div>
            )}
            {formule === 'an' && (
              <div className="kv">
                <span className="k">{t('Tu économises')}</span>
                <span className="v ">{F(p!.mois * 12 - p!.an)}&nbsp;F</span>
              </div>
            )}
            <div className="kv">
              <span className="k">{t(formule === 'an' ? 'Renouvellement' : 'Prochain prélèvement')}</span>
              <span className="v ">{formule === 'an' ? jour(prochain!) : tf('{d} · {m} F', { d: jour(prochain!), m: F(ensuite) })}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Annonce')}</span>
              <span className="v ">{tf('par notification le {d}, 3 jours avant', { d: jour(prochain! - 3 * J) })}</span>
            </div>
          </>
        )}
      </div>
      {formule === 'an' && (
        <div className="note amber">
          <Icone nom="info" taille={18} />
          <div>
            <b>{t('Non remboursable')}</b>
            {tf(' : si tu résilies, {p} reste actif jusqu’au {d}.', { p: t(p!.nom), d: jour(prochain!) })}
          </div>
        </div>
      )}
      {d.actif && d.abonnement && (
        <p className="t13 c3">{tf('Ton palier actuel ({p}) s’arrête aujourd’hui ; le nouveau commence tout de suite.', { p: t(nomPalier(d.abonnement.palier)) })}</p>
      )}
    </>
  )
  const payer = (
    <>
      {m &&
        (attente ? (
          <>
            <div className="card cl08-wait">
              <span className="cl08-spin"></span>
              <div className="grow">
                <b>{t('Valide la demande sur ton téléphone')}</b>
                <span className="s">{tf('{m} F · {o}', { m: F(aujourdhui), o: libelle })}</span>
              </div>
            </div>
            <div className="btns">
              <button
                type="button"
                className={'btn primary' + (envoi ? ' off' : '')}
                onClick={async () => {
                  if (envoi) return
                  setEnvoi(true)
                  await source.souscrire({ palier: id, formule, moyen: libelle })
                  naviguer(chemin('mon-abonnement'), { replace: true })
                }}
              >
                <Icone nom="circle-check" taille={18} />
                <span>{t('J’ai validé sur mon téléphone')}</span>
              </button>
            </div>
            <div className="btns">
              <button type="button" className="btn secondary" onClick={() => setAttente(false)}>
                <span>{t('Changer de numéro')}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="btns mt16">
            <button type="button" className="btn primary" onClick={() => setAttente(true)}>
              <Icone nom="smartphone" taille={18} />
              <span>{tf('Payer {m} F avec {o}', { m: F(aujourdhui), o: t(nomMoMo(m.operateur)) })}</span>
            </button>
          </div>
        ))}
    </>
  )
  const garantie = (
    <div className="hint-l">
      <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
      <span>{t(id === 'pass' ? 'Tu valides sur ton téléphone. Rien d’autre ne sera prélevé.' : 'Tu valides sur ton téléphone. Aucun prélèvement sans annonce par notification.')}</span>
    </div>
  )
  return (
    <Ecran route="abonnement-souscrire" gabarit="colonnes">
      {/* Déjà ton palier : pas d'aside, une seule colonne (la page se resserre sur elle). */}
      <Colonne classe={courant ? 'g5-seul' : undefined}>
      <Styles id="02f3dac5cd" />
      <BandeauPrime />
      <div className="pg">
        <div className="pg-k">{id === 'pass' ? t('Abonnement · Pass') : tf('Abonnement · {p}', { p: nom })}</div>
        <h1 className="pg-t">
          {id === 'pass'
            ? t('Pass 7 jours')
            : formule === 'an'
              ? tf('{p} · 1 an', { p: t(p!.nom) })
              : essai
                ? tf('{p} · premier mois à {m} F', { p: t(p!.nom), m: F(ESSAI) })
                : tf('{p} · {m} F par mois', { p: t(p!.nom), m: F(p!.mois) })}
        </h1>
      </div>
      {id === 'prime' && formule === 'mois' && d.essaiUtilise && !courant && (
        <div className="note amber">
          <Icone nom="info" taille={18} />
          <div>{tf('Tu as déjà profité du premier mois à {m} F. Il vaut une fois par compte et par numéro MoMo.', { m: F(ESSAI) })}</div>
        </div>
      )}
      {d.abonnement?.echec && d.abonnement.palier === id && (
        <div className="note amber">
          <Icone nom="clock" taille={18} />
          <div>
            {tf('Ton prélèvement de {m} F du {d} n’a pas abouti : paie-le plutôt, tu gardes ta date et tes avantages.', { m: F(d.abonnement.echec.montant), d: jour(d.abonnement.echec.le) })} <Link to={chemin('mon-abonnement')}>{t('Mon abonnement')}</Link>
          </div>
        </div>
      )}
      {courant ? (
        <div className="note green">
          <Icone nom="circle-check" taille={18} />
          <div>
            {t('C’est déjà ton palier.')} <Link to={chemin('mon-abonnement')}>{t('Mon abonnement')}</Link>
          </div>
        </div>
      ) : (
        <>
          {!grand && recap}
          <div className="sec">
            <h2>{t('Prélèvement MoMo')}</h2>
          </div>
          {!moyens.length && (
            <div className="note amber">
              <Icone nom="smartphone" taille={18} />
              <div>
                {t('Ajoute d’abord un numéro Mobile Money.')} <Link to={chemin('moyens-paiement')}>{t('Moyens de paiement')}</Link>
              </div>
            </div>
          )}
          {moyens.map((x) => (
            <a
              key={x.id}
              href="#"
              role="radio"
              aria-checked={choix === x.id}
              className={'radio' + (choix === x.id ? ' on' : '')}
              onClick={(e) => (e.preventDefault(), !attente && setChoix(x.id))}
            >
              <span className="rd"></span>
              <span className="grow">
                <span className="rt" style={{ display: 'block' }}>
                  {t(nomMoMo(x.operateur))} · {x.numeroMasque}
                </span>
                <span className="rs" style={{ display: 'block' }}>
                  {t(choix === x.id ? (id === 'pass' ? 'Numéro vérifié. Rien d’autre ne sera prélevé.' : 'Numéro vérifié. L’abonnement est lié à ton compte et à ce numéro.') : 'Utilisable pour payer')}
                </span>
              </span>
            </a>
          ))}
          {id === 'pass' ? (
            plusConditions('more')
          ) : (
            <div className="card ">
              <ul className="cl14-bl" style={{ marginTop: '0' }}>
                <li>
                  <Icone nom="check" taille={16} trait={2.6} />
                  <span>{tf('Jusqu’à {n} commandes par mois (usage normal).', { n: p!.plafond })}</span>
                </li>
                <li>
                  <Icone nom="check" taille={16} trait={2.6} />
                  <span>{t('Tarif garanti tant que tu restes abonné.')}</span>
                </li>
                <li>
                  <Icone nom="check" taille={16} trait={2.6} />
                  <span>{t(formule === 'an' ? 'Annuel non remboursable : si tu résilies, il reste actif jusqu’au terme payé.' : 'Résiliable en un tap. Quotas du mois non reportables.')}</span>
                </li>
              </ul>
              {plusConditions('more flat')}
            </div>
          )}
          {!grand && payer}
          {!grand && garantie}
        </>
      )}
      {courant && (
        <div className="card ">
          <h3 className="cl11-k">{t('Les conditions')}</h3>
          <div className="more-b">{conditions}</div>
        </div>
      )}
      </Colonne>
      {grand && !courant && (
        <Aside titre="À payer aujourd’hui">
          {recap}
          {payer}
          {garantie}
        </Aside>
      )}
    </Ecran>
  )
}

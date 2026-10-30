// Écran « Avant de payer · première commande » (CL-03), forme d'origine du prototype rendue réelle (DP-54) : deux
// choix, une seule fois, faits à l'achat : où récupérer ses colis (au relais habituel, ou à domicile à l'adresse
// principale ; XL : domicile) et avec quel numéro payer (numéro vérifié, autre numéro Mobile Money, ou un autre
// moyen dans « Passer commande ») ; le récapitulatif calculé (remise Prime comprise) et « Payer », qui passe la
// commande. Sans numéro vérifié ou sans relais, le bouton mène d'abord à l'étape qui manque. Le relais dit son jour
// de fermeture et la garde gratuite du jour d'arrivée ; « Après le paiement » dit ce qui se passe ensuite.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { PARAMETRES } from '../../donnees/frais'
import { chiffres, nomMoMo, operateur } from '../../donnees/numeros'
import { source, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useAchat } from '../CL-08/PaiementMoyen'
import { GRILLE_GARDE } from '../CL-09/Commun'
import { enMots, fermeA, trajet } from './RelaisChoix'

export function PremiereCommande() {
  const { t, tf, langue } = usePreferences()
  const a = useAchat()
  const [relais, setRelais] = useState<{ habituel: Relais | null; proche: string | null } | null>(null)
  const [feuille, setFeuille] = useState(false)
  const tabL = useDes('tab-l')
  useEffect(() => {
    source.relaisListe().then((l) => {
      const ouverts = l.relais.filter((r) => !r.plein).sort((x, y) => x.km - y.km)
      setRelais({ habituel: l.relais.find((r) => r.nom === l.habituel) ?? null, proche: ouverts[0]?.nom ?? null })
    })
  }, [])
  if (!a || !relais) return null
  const { p, m } = a
  if (!p.lignes.length)
    return (
      <Ecran route="premiere-commande">
        <div className="card mt12">
          <div className="empty">
            <div className="ei">
              <Icone nom="shopping-cart" taille={26} />
            </div>
            <h3>{t('Ton panier est vide')}</h3>
            <p>{t('Ajoute un article depuis sa fiche, puis reviens ici pour choisir ta livraison et payer.')}</p>
            <div className="btns">
              <Link to={chemin('categories')} className="btn primary">
                <span>{t('Découvrir les produits')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const r = relais.habituel
  const momo = a.mm ? { num: a.mm.numeroMasque, op: nomMoMo(a.mm.operateur), duCompte: a.mm.duCompte } : a.moyen === 'autre' ? { num: a.autre || '—', op: nomMoMo(operateur(chiffres(a.autre))) || 'Mobile Money', duCompte: false } : null
  const manque = !p.numeroVerifie ? 'numero' : m === 'relais' && !r ? 'relais' : null
  const opAutre = operateur(chiffres(a.autre))
  const seuilDomicile = PARAMETRES.seuilDomicile
  // Dès 1024 px (§ 5.15, comme Passer commande) : les deux choix à gauche ; le récapitulatif et « Payer » dans l'aside
  // collant, à droite. Déplacés, jamais dupliqués : sur téléphone, l'ordre reste le même.
  const recapitulatif = (
    <div className="card mt16">
      <div className="cl03-k or" style={{ marginBottom: '8px' }}>
        {t('Récapitulatif')}
      </div>
      <div className="cl03-sum">
        <span className="t15 b8">{t('Total à payer')}</span>
        <span className="price big">
          {F(a.montant)}
          <small>{t(' F')}</small>
        </span>
      </div>
      <div className="t13 c3 mt6">
        {[
          tf(a.articles > 1 ? '{n} articles' : '{n} article', { n: a.articles }),
          tf('{n} colis', { n: a.sc.length }),
          m === 'relais' ? tf('retrait dès {q}', { q: quand(a.pretVers, a.d.maintenant, langue).replace(/ (à|at) /, ' ') }) : t('livrés à domicile'),
        ].join(' · ')}
      </div>
      {a.remise > 0 && <div className="t13 mt6" style={{ color: 'var(--green)' }}>{tf('Dont {m} F de livraison offerts par ton abonnement.', { m: F(a.remise) })}</div>}
    </div>
  )
  const payer = (
    <>
      {a.erreur && !feuille && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{t(a.erreur)}</div>
        </div>
      )}
      <div className="mt12">
        {manque ? (
          <Link to={manque === 'numero' ? chemin('numero', { from: 'panier' }) : chemin('relais-choix', { retour: 'premiere-commande' })} className="btn primary">
            <Icone nom="arrow-right" taille={18} />
            <span>{t(manque === 'numero' ? 'Vérifier mon numéro' : 'Choisir mon relais')}</span>
          </Link>
        ) : (
          <button type="button" className={'btn primary' + (a.envoi || a.carteTropHaute ? ' off' : '')} onClick={a.payer}>
            <Icone nom="lock" taille={18} />
            <span>{tf('Payer {m} F', { m: F(a.montant) })}</span>
          </button>
        )}
      </div>
      <div className="cl03-foot">
        <Link to={chemin('legal-doc', { d: 'cgv' })}>{t('Conditions de vente')}</Link>
        {t(' · ')}
        <Link to={chemin('legal-doc', { d: 'retours' })}>{t('Retours et litiges')}</Link>
        {t(' · ')}
        <Link to={chemin('legal-doc', { d: 'garde' })}>{t('Garde au relais')}</Link>
      </div>
    </>
  )
  return (
    <Ecran
      route="premiere-commande"
      gabarit="colonnes"
      fixes={
        <Feuille ouverte={feuille} fermer={() => setFeuille(false)} titre={t('Avec quel numéro payer ?')}>
          <h2 className="cl03-sheet-t">{t('Avec quel numéro payer ?')}</h2>
          <p className="cl03-sheet-s">{t('Le numéro reçoit la demande de paiement Mobile Money.')}</p>
          {a.d.moyens.map((x) => (
            <a key={x.id} href="#" className={'radio' + (a.moyen === 'mm:' + x.id ? ' on' : '')} role="radio" aria-checked={a.moyen === 'mm:' + x.id} onClick={(e) => (e.preventDefault(), a.choisirMoyen('mm:' + x.id))}>
              <span className="rd"></span>
              <span className="grow">
                <span className="rt" style={{ display: 'block' }}>
                  {x.numeroMasque} · {t(nomMoMo(x.operateur))}
                </span>
                <span className="rs" style={{ display: 'block' }}>
                  {t(x.duCompte ? 'Ton numéro vérifié' : 'Numéro enregistré')}
                </span>
              </span>
            </a>
          ))}
          <a href="#" className={'radio' + (a.moyen === 'autre' ? ' on' : '')} role="radio" aria-checked={a.moyen === 'autre'} onClick={(e) => (e.preventDefault(), a.choisirMoyen('autre'))}>
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ display: 'block' }}>
                {t('Un autre numéro')}
              </span>
              <span className="rs" style={{ display: 'block' }}>
                {t('MTN ou Orange, détecté à la saisie')}
              </span>
            </span>
          </a>
          {a.moyen === 'autre' && (
            <div className="fld" style={{ marginTop: '8px' }}>
              <div className={'inp focus' + (a.erreur ? ' err' : '')}>
                <span className="cl03-cc">
                  <Dessin id="81b1dee44510" />
                  {t('+237')}
                </span>
                <input className="grow" type="tel" inputMode="tel" aria-label={t('Numéro Mobile Money')} placeholder="6XX XX XX XX" value={a.autre} onChange={(e) => a.setAutre(e.target.value)} />
                {opAutre && (
                  <span className="suf">
                    <span className="cl03-op">
                      <Icone nom="circle-check" taille={14} trait={2.2} />
                      {t(nomMoMo(opAutre))}
                    </span>
                  </span>
                )}
              </div>
              {a.erreur && (
                <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                  {t(a.erreur)}
                </div>
              )}
            </div>
          )}
          <div className="hint-l">
            <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t(a.moyen === 'autre' ? 'Pas de code SMS pour ce numéro : tu valides chaque paiement avec son code secret MoMo.' : 'Tu valides le paiement sur ton téléphone, avec ton code secret MoMo.')}</span>
          </div>
          <div className="mt14">
            <button type="button" className={'btn primary' + (a.moyen === 'autre' && !opAutre ? ' off' : '')} onClick={() => (a.moyen !== 'autre' || opAutre) && setFeuille(false)}>
              <Icone nom="check" taille={18} />
              <span>{t('Utiliser ce numéro')}</span>
            </button>
          </div>
          <div className="cl03-center">
            <Link to={chemin('paiement-moyen', { from: 'premiere' })} className="cl03-link">
              {t('Autre moyen de paiement')}
            </Link>
          </div>
        </Feuille>
      }
    >
      <Styles id="f16ded0d4c" />
      <Colonne>
        <div className="cl03-stepbar">
          <div className="steps">
            <i className="on"></i>
            <i className="cur"></i>
          </div>
        </div>
        <h1 className="pg-t" style={{ marginTop: '14px' }}>
          {t('Deux choix, une seule fois')}
        </h1>
        <p className="pg-s">{t('Ensuite, on s’en souvient.')}</p>
        <div className="sec">
          <h2>{t('Où récupérer tes colis ?')}</h2>
        </div>
        <div className="seg" role="radiogroup" aria-label={t('Où récupérer tes colis ?')}>
          <a href="#" className={m === 'relais' ? 'on' : ''} role="radio" aria-checked={m === 'relais'} aria-disabled={a.xl || undefined} onClick={(e) => (e.preventDefault(), a.choisirMode('relais'))}>
            {t('Au relais')}
          </a>
          <a href="#" className={m === 'domicile' ? 'on' : ''} role="radio" aria-checked={m === 'domicile'} onClick={(e) => (e.preventDefault(), a.choisirMode('domicile'))}>
            {t('À domicile')}
          </a>
        </div>
        {a.xl && <p className="t13 c3 mt8">{t('Un colis XL ne va pas en relais : livraison à domicile obligatoire.')}</p>}
        {m === 'relais' ? (
          <div className="card or">
            <div className="cl03-k or" style={{ marginBottom: '8px' }}>
              {t('Ton relais')}
            </div>
            {r ? (
              <>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="portrait" style={{ width: '48px', height: '48px' }}>
                    <Dessin id="fd9a43c6de73" />
                  </span>
                  <span className="grow">
                    <b className="t15 b8" style={{ display: 'block' }}>
                      {t(r.nom)}
                    </b>
                    <span className="t13 c3" style={{ display: 'block' }}>
                      {t(r.gerant)}
                    </span>
                    <span className="cl03-rm">
                      <Icone nom="map-pin" taille={13} />
                      <span>{enMots(r.km * 1000)}</span>
                      <span>{t('·')}</span>
                      <span>{tf(trajet(r.km * 1000).pied ? '{n} min à pied' : '{n} min en taxi', { n: trajet(r.km * 1000).min })}</span>
                    </span>
                    <span className="cl03-rm">
                      <Icone nom="clock" taille={13} />
                      <span>{tf('Ouvert jusqu’à {h} · fermé le {f}', { h: t(fermeA(r.horaires)), f: t(r.ferme) })}</span>
                    </span>
                  </span>
                  <Link to={chemin('relais-choix', { retour: 'premiere-commande' })} className="t13 b8 cor" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: '44px', minWidth: '44px' }}>
                    {t('Changer')}
                  </Link>
                </div>
                {relais.proche === r.nom && (
                  <div className="cl03-tags">
                    <span className="pill green sm">{t('Le plus proche')}</span>
                  </div>
                )}
              </>
            ) : (
              <Link to={chemin('relais-choix', { retour: 'premiere-commande' })} className="row" style={{ color: 'inherit' }}>
                <span className="ic-sq or">
                  <Icone nom="store" taille={20} />
                </span>
                <span className="grow t14 b7">{t('Choisis le relais où retirer tes colis')}</span>
                <span className="t13 b8 cor">{t('Choisir')}</span>
              </Link>
            )}
            <div className="hr"></div>
            <div className="cl03-ch">
              <Icone nom="star" taille={18} />
              <span>{t('Il devient ton relais habituel : on te le propose à chaque commande.')}</span>
            </div>
            <div className="cl03-ch">
              <Icone nom="clock" taille={18} />
              <span>
                {tf('Garde gratuite le jour d’arrivée, puis {m} F par jour dès le 2e.', { m: F(GRILLE_GARDE[1]) })}{' '}
                <Link to={chemin('legal-doc', { d: 'garde' })}>{t('La politique de garde')}</Link>
              </span>
            </div>
          </div>
        ) : (
          <div className="card ">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <span className="ic-sq or">
                <Icone nom="house" taille={20} />
              </span>
              <span className="grow">
                <b className="t15 b8" style={{ display: 'block' }}>
                  {p.adresse ? t(p.adresse) : t('Pas encore d’adresse')}
                </b>
                <span className="t13 c2" style={{ display: 'block', marginTop: '2px', lineHeight: '1.4' }}>
                  {t(p.adresse ? 'Ton adresse principale de livraison' : 'Ajoute l’adresse où te livrer.')}
                </span>
              </span>
              <Link to={chemin(p.adresse ? 'adresses' : 'adresse')} className="t13 b8 cor" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: '44px', minWidth: '44px' }}>
                {t(p.adresse ? 'Modifier' : 'Ajouter')}
              </Link>
            </div>
            <div className="hr"></div>
            <div className="cl03-ch">
              <Icone nom="truck" taille={18} />
              <span>
                {a.f.offert > 0
                  ? tf('Livraison à domicile de base ({m} F) offerte : ton panier dépasse {s} F.', { m: F(a.f.offert), s: F(seuilDomicile) })
                  : tf('Livraison à domicile : {m} F. Offerte dès {s} F d’articles.', { m: F(a.livraison), s: F(seuilDomicile) })}
              </span>
            </div>
            <div className="cl03-ch">
              <Icone nom="phone" taille={18} />
              <span>{t('Le livreur t’appelle par un numéro masqué avant d’arriver.')}</span>
            </div>
          </div>
        )}
        <div className="sec">
          <h2>{t('Avec quel numéro payer ?')}</h2>
        </div>
        {p.numeroVerifie ? (
          <a href="#" className="card row" style={{ color: 'inherit' }} onClick={(e) => (e.preventDefault(), setFeuille(true))}>
            <span className="ic-sq or">
              <Icone nom="smartphone" taille={20} />
            </span>
            <span className="grow">
              <b className="t15 b8" style={{ display: 'block' }}>
                {momo ? momo.num : t(a.nomMoyen)}
              </b>
              <span className="t13 c3">{momo ? t(momo.op) + (momo.duCompte ? t(' · ton numéro vérifié') : '') : t('Paiement choisi dans « Passer commande »')}</span>
            </span>
            <span className="t13 b8 cor">{t('Changer')}</span>
          </a>
        ) : (
          <Link to={chemin('numero', { from: 'panier' })} className="card row" style={{ color: 'inherit' }}>
            <span className="ic-sq or">
              <Icone nom="smartphone" taille={20} />
            </span>
            <span className="grow">
              <b className="t15 b8" style={{ display: 'block' }}>
                {t('Vérifie ton numéro')}
              </b>
              <span className="t13 c3">{t('Un code par SMS, une seule fois')}</span>
            </span>
            <span className="t13 b8 cor">{t('Vérifier')}</span>
          </Link>
        )}
        <div className="hint-l">
          <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Tu valides le paiement sur ton téléphone, avec ton code secret MoMo.')}</span>
        </div>
        {!tabL && recapitulatif}
        <details className="more">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Après le paiement')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>{t('Ton argent reste bloqué. Le vendeur est payé seulement quand tu as tes colis en main.')}</p>
            <p>{t(m === 'relais' ? 'Quand tes colis arrivent au relais, on te prévient et tu reçois ton code de retrait à 6 chiffres.' : 'Le livreur t’appelle par un appel masqué avant d’arriver et te remet tes colis en main propre.')}</p>
            <p>{t('Tu ouvres tes colis sur place. Un souci : tu le signales tout de suite, ton argent reste bloqué.')}</p>
            <p>{t('Tant que le vendeur n’a pas confirmé ta commande, tu l’annules librement depuis Mes commandes.')}</p>
            <p>
              <Link to={chemin('faq', { t: 'paiement' })}>{t('Questions sur le paiement')}</Link>
              {t(' · ')}
              <Link to={chemin('aide')}>{t('Aide et contact')}</Link>
            </p>
          </div>
        </details>
        {!tabL && payer}
      </Colonne>
      {tabL && (
        <Aside titre="Récapitulatif">
          {recapitulatif}
          {payer}
        </Aside>
      )}
    </Ecran>
  )
}

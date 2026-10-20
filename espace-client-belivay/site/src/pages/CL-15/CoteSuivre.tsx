// Écran « Suivre ma mise de côté » (CL-15 ; EX-03), forme d'origine du prototype rendue réelle (DP-54) : ce qui est
// payé et la progression ; le prochain versement selon la date réelle : aujourd'hui (rappel envoyé), à venir (date
// du rappel ; « Dernier versement »), ou non reçu et en délai de grâce (date limite, ce qui reviendrait moins le
// forfait) ; le plan (payé, du jour, en grâce, à venir) ; l'article réservé et son prix livré détaillé ; annuler.
// Payée en entier : la commande ; annulée : ce qui a été rendu. Liste de rentrée entière : la classe, l'école, le
// nombre d'articles, la rentrée et la liste à revoir ; la commande groupée part au dernier versement.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { COTE, forfaitCote } from '../../donnees/cote'
import { source } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { lienCote, paye, prochain, titreCote, useCotes, VignetteCote } from './Commun'

const J = 864e5
const jour = (ms: number) => Math.floor((ms + 3600e3) / J)

export function CoteSuivre() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d] = useCotes()
  // Dès 1024 px : progression et versements datés à gauche ; prochain versement, montant et « Payer » à droite (§ 5.13).
  const grand = useDes('tab-l')
  const [relais, setRelais] = useState<string | null>(null)
  const [classe, setClasse] = useState<string | null>(null)
  const c = d ? (d.liste.find((x) => x.id === params.get('id')) ?? d.liste.find((x) => x.etat === 'en_cours')) : undefined
  useEffect(() => {
    source.relaisListe().then((r) => setRelais(r.habituel))
  }, [])
  useEffect(() => {
    if (c?.p) source.produit(c.p).then((x) => setClasse(x?.classe ?? null))
  }, [c?.p])
  if (!d) return null
  const bandeau = !INTERRUPTEURS_DU_LANCEMENT['FF-EX03'] && (
    <div className="cl15-ff">
      <span className="cl15-pill">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl15-ex">{t('EX-03')}</span>
    </div>
  )
  if (!c)
    return (
      <Ecran route="cote-suivre">
        <Styles id="ddcb0e469a" />
        {bandeau}
        <div className="card mt12">
          <div className="empty">
            <div className="ei">
              <Icone nom="piggy-bank" taille={26} />
            </div>
            <h3>{t('Aucune mise de côté en cours')}</h3>
            <div className="btns">
              <Link to={chemin('cote')} className="btn primary">
                <span>{t('Mes mises de côté')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const p = paye(c)
  const n = c.etat === 'en_cours' ? prochain(c) : null
  const faits = c.versements.filter((v) => v.payeLe).length
  const total = c.versements.length
  const retard = !!n && jour(n.le) < jour(d.maintenant)
  const aujourdhui = !!n && jour(n.le) === jour(d.maintenant)
  const dernier = !!n && n.n === total
  const fin = c.versements[total - 1].le
  const libelle = (v: { n: number; le: number }) => (v.n === 1 ? t('Acompte') : tf('Versement {n}', { n: v.n })) + ' · ' + jourSeul(v.le, langue)
  const prochainVersement = (
    <>
    {n && retard && (
      <>
        <div className="card amber cl15-box">
          <span className="bi">
            <Icone nom="clock-alert" taille={20} />
          </span>
          <div className="grow">
            <b className="bt">{tf('Versement du {d} non reçu.', { d: jourSeul(n.le, langue) })}</b>
            <p>
              {t('Tu as jusqu’au ')}
              <b>{jourSeul(n.le + COTE.grace * J, langue)}</b>
              {tf(' pour le payer, sans frais. Ensuite, la mise de côté est annulée : tes {p} F te reviennent, moins le forfait de {f} F.', { p: F(p), f: F(Math.min(forfaitCote(c.prixLivre), p)) })}
            </p>
          </div>
        </div>
        <div className="btns">
          <Link to={chemin('cote-versement', { id: c.id })} className="btn primary">
            <span>{tf('Payer {m} F', { m: F(n.du) })}</span>
          </Link>
        </div>
      </>
    )}
    {n && aujourdhui && (
      <div className="card or">
        <div className="cl15-now">
          <span className="cl15-k">
            <Icone nom="bell-ring" taille={16} />
            {tf('Versement {n} · aujourd’hui', { n: n.n })}
          </span>
          <span className="v">{F(n.du)} F</span>
        </div>
        <p className="cl15-p">{tf('Rappel envoyé le {d}, puis ce matin', { d: jourSeul(n.le - 2 * J, langue) })}</p>
        <div className="btns">
          <Link to={chemin('cote-versement', { id: c.id })} className="btn primary">
            <span>{tf('Payer {m} F', { m: F(n.du) })}</span>
          </Link>
        </div>
      </div>
    )}
    {n && !retard && !aujourdhui && (
      <div className="card">
        <div className="cl15-now">
          <span className="cl15-k">
            <Icone nom="calendar-days" taille={16} />
            {dernier ? t('Dernier versement') : tf('Versement {n}', { n: n.n })}
          </span>
          <span className="v">{F(n.du)} F</span>
        </div>
        <p className="cl15-p">{tf('{d} · rappel le {r}, puis le jour même', { d: jourSeul(n.le, langue), r: jourSeul(n.le - 2 * J, langue) })}</p>
        <div className="btns">
          <Link to={chemin('cote-versement', { id: c.id })} className="btn secondary">
            <span>{dernier ? t('Payer le dernier versement') : tf('Payer {m} F', { m: F(n.du) })}</span>
          </Link>
        </div>
      </div>
    )}
    </>
  )
  return (
    <Ecran gabarit="colonnes" route="cote-suivre" sousTitre={c.id}>
      <Colonne>
      <Styles id="ddcb0e469a" />
      {bandeau}
      <div className="card cl15-pc">
        <div className="cl15-k">{tf(faits > 1 ? 'Mise de côté · {a} versements sur {b}' : 'Mise de côté · {a} versement sur {b}', { a: faits, b: total })}</div>
        <div className="cl15-pb">
          <b>
            {F(p)}
            <small>{t('F')}</small>
          </b>
          <span>{tf('payés sur {t} F · sans intérêts, sans frais', { t: F(c.prixLivre) })}</span>
        </div>
        <div className="steps">
          {c.versements.map((v) => (
            <i key={v.n} className={v.payeLe ? 'on' : n && v.n === n.n ? 'cur' : ''}></i>
          ))}
        </div>
      </div>

      {c.etat === 'annulee' && c.annulee && (
        <div className="card cl15-box">
          <span className="bi">
            <Icone nom="rotate-ccw" taille={20} />
          </span>
          <div className="grow">
            <b className="bt">{tf('Annulée le {d}', { d: jourSeul(c.annulee.le, langue) })}</b>
            <p>{tf('{r} F remboursés sur ton numéro, forfait de {f} F au vendeur.', { r: F(c.annulee.rembourse), f: F(c.annulee.forfait) })}</p>
          </div>
        </div>
      )}
      {c.etat === 'payee' && (
        <div className="btns">
          <Link to={chemin('cote-fini', { id: c.id })} className="btn primary">
            <span>{t('Payée en entier · voir la commande')}</span>
          </Link>
        </div>
      )}

      {!grand && prochainVersement}
      <div className="sec">
        <h2>{t('Plan')}</h2>
      </div>
      <div className="card cl15-sum">
        {c.versements.map((v) => {
          const courant = !!n && v.n === n.n && c.etat === 'en_cours'
          const etat = v.payeLe ? 'done' : courant && retard ? 'warn' : courant ? 'on' : ''
          return (
            <div key={v.n} className={'cl15-pl ' + etat}>
              <span className="n">{v.payeLe ? <Icone nom="check" taille={15} trait={3} /> : v.n}</span>
              <span className="t">
                {libelle(v)}
                {v.payeLe ? (
                  <small>{jour(v.payeLe) === jour(d.maintenant) ? tf('payé {q}', { q: quand(v.payeLe, d.maintenant, langue) }) : t('payé')}</small>
                ) : courant && retard ? (
                  <small>{t('en délai de grâce')}</small>
                ) : courant && aujourdhui ? (
                  <small>{t('aujourd’hui')}</small>
                ) : null}
              </span>
              <span className="v">{F(v.du)} F</span>
            </div>
          )
        })}
      </div>

      <div className="card ">
        <div className="row">
          <Link to={lienCote(c)} className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }} aria-label={titreCote(c, t, tf)}>
            <VignetteCote c={c} />
          </Link>
          <div className="grow">
            <div className="t15 b8" style={{ lineHeight: '1.3' }}>
              {c.liste ? tf('Liste {c} · {n} articles', { c: c.liste.classe, n: c.liste.articles }) : t(c.titre)}
            </div>
            {c.liste && <div className="t13 c3 mt4">{t(c.liste.ecole)}</div>}
            {c.etat === 'en_cours' && <div className="t13 c3 mt4">{tf(c.liste ? 'Réservée chez les boutiques jusqu’au {d}' : 'Réservé chez le vendeur jusqu’au {d}', { d: jourSeul(fin, langue) })}</div>}
          </div>
        </div>
        {c.liste && c.etat === 'en_cours' && (
          <div className="li">
            <span className="ic or">
              <Icone nom="school" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {tf('Rentrée le {d}', { d: jourSeul(c.liste.rentreeLe, langue) })}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {tf('Dernier versement le {d} : toute la liste part alors au relais, avec un seul code.', { d: jourSeul(fin, langue) })}
              </span>
            </span>
          </div>
        )}
        <details className="more flat">
          <summary>
            <Icone nom="receipt" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{tf('Prix livré : {m} F', { m: F(c.prixLivre) })}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            {c.liste ? (
              <p>{tf('{n} articles {a} F + livraison au {r} {l} F (un colis par boutique).', { n: c.liste.articles, a: F(c.prix), r: relais ? t(relais) : t('relais'), l: F(c.livraison) })}</p>
            ) : (
              <p>
                {tf('{p} {a} F + retrait au {r} {l} F', { p: t(c.titre), a: F(c.prix), r: relais ? t(relais) : t('relais'), l: F(c.livraison) })}
                {classe ? ' ' + tf('(colis {c}).', { c: classe }) : '.'}
              </p>
            )}
            <p>{t(c.liste ? 'Elle part au relais après le dernier versement ; ton argent reste bloqué jusqu’à ton retrait.' : 'Il part au relais après le dernier versement ; ton argent reste bloqué jusqu’à ton retrait.')}</p>
          </div>
        </details>
      </div>
      {c.etat === 'en_cours' && (
        <div className="links cl15-lk">
          <Link to={chemin('cote-annuler', { id: c.id })}>{t('Annuler la mise de côté')}</Link>
        </div>
      )}
      </Colonne>
      {grand && (
        <Aside titre="Prochain versement">
          {prochainVersement}
        </Aside>
      )}
    </Ecran>
  )
}

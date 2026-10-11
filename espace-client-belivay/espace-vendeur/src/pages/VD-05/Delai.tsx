// Besoin de plus de temps (VD-05) : reprise du prototype (balisage de route('delai') : heure actuelle, « Nouvelle
// heure » en trois choix, aide « Au plus tard … », « Ce qui va se passer », « Pourquoi ? » replié, bouton plein au
// libellé du choix), branchée sur la source (preparation.optionsDelai, demanderDelai).
// - Règles : DEL-01 (une seule fois), DEL-02 (client et livreur prévenus), DEL-03 (rien au-delà de l'échéance
//   absolue : choix grisés et refusés), DEL-04, VD05-R13, REFVD-R148/R149 ; heures d'ouverture de la boutique (+ 1 h,
//   + 2 h ouvrées ; « demain à l'ouverture » = le jour d'ouverture suivant) ; échéance absolue = début + 24 heures
//   d'ouverture (DP-56, Q-38) ; P-6 : si la nouvelle heure dépasse le créneau du livreur, le ramassage passe au
//   créneau suivant, et le choix l'écrit avant l'envoi.
// - Le choix se garde dans l'adresse (?c=1|2|d, comme le prototype) ; après l'envoi, retour à la commande avec sa
//   nouvelle heure (avis). Déjà prolongée ou plus à préparer : l'écran le dit, sans bouton.
// - Corrige les défauts 4 et 5 du prototype : heures de la commande demandée, « Demander jusqu'à demain 08 h » traduit.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import type { Commande } from '../../donnees/domaines/commandes'
import type { ChoixDelai, OptionDelai, OptionsDelai } from '../../donnees/domaines/preparation'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, echeance, entre, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useRole } from '../../session'
import { jourDe } from '../../calculs/temps'
import { Bouton, EtatLecture, hhmm, jourCourtNum, quand, restantOuvert, useEnLigne, useLien } from './commun'

const CODES: Record<string, ChoixDelai> = { '1': '+1h', '2': '+2h', d: 'demain' }
const CODE_DE: Record<ChoixDelai, string> = { '+1h': '1', '+2h': '2', demain: 'd' }

export default function Delai() {
  const { tf } = usePreferences()
  const role = useRole()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-00008'
  const lecture = useLecture(() => Promise.all([source.commandes.detail(ref), source.preparation.optionsDelai(ref)]).then(([c, o]) => ({ c, o })), [ref, role])
  const d = lecture.donnees
  if (!d?.c || !d.o) return <EtatLecture route="delai" erreur={lecture.erreur} vide={d !== null} relire={lecture.relire} titre={tf('Plus de temps · {ref}', { ref })} />
  return <Choix c={d.c} o={d.o} />
}

function Choix({ c, o }: { c: Commande; o: OptionsDelai }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge(5000)
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const lien = useLien()
  const { enLigne } = useEnLigne()
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const l = c.lignes[0]
  // Choix : celui de l'adresse s'il est possible, sinon le premier possible.
  const demande = CODES[params.get('c') ?? '']
  const possibles = o.options.filter((x) => x.possible)
  const choisi = o.options.find((x) => x.choix === demande && x.possible) ?? possibles[0] ?? null
  const ouvert = o.aPreparer && !o.prolongee
  const choisir = (x: OptionDelai) => {
    if (!x.possible) return
    jouer('interrupteur')
    const p = new URLSearchParams(params)
    p.set('c', CODE_DE[x.choix])
    naviguer({ search: p.toString() }, { replace: true })
  }
  const jourDeLHeure = (e: number) => (jourDe(e) === jourDe(maintenant) ? '' : jourDe(e) === jourDe(maintenant + 86400000) ? t('demain') : jourCourtNum(e, langue))
  const titreOption = (x: OptionDelai) => {
    const j = jourDeLHeure(x.echeance)
    if (x.choix === 'demain') return j === t('demain') ? tf('Demain à l’ouverture · {h}', { h: heure(x.echeance, langue) }) : tf('{jour} à l’ouverture · {h}', { jour: j, h: heure(x.echeance, langue) })
    const h = j ? `${j} ${heure(x.echeance, langue)}` : heure(x.echeance, langue)
    return tf(x.choix === '+1h' ? '+ 1 h · prête avant {h}' : '+ 2 h · prête avant {h}', { h })
  }
  const effet = (x: OptionDelai) => {
    const e = entre([hhmm(x.ramassage.debut), hhmm(x.ramassage.fin)], langue)
    const j = jourDeLHeure(x.ramassage.debut)
    if (x.effet === 'inchange') return j ? tf('Le livreur passe toujours {jour} {entre}', { jour: j, entre: e }) : tf('Le livreur passe toujours {entre}', { entre: e })
    if (x.effet === 'attend') return t('Le livreur attendra la fin de la préparation')
    // P-6 : le ramassage passe au créneau suivant, écrit avant l'envoi.
    return j === t('demain') ? tf('Le livreur passe demain {entre}', { entre: e }) : tf('Ramassage au créneau suivant : {jour} {entre}', { jour: j, entre: e })
  }
  const libelleBouton = (x: OptionDelai) =>
    x.choix === '+1h' ? t('Demander 1 heure de plus') : x.choix === '+2h' ? t('Demander 2 heures de plus') : tf(jourDeLHeure(x.echeance) === t('demain') ? 'Demander jusqu’à demain {h}' : 'Demander jusqu’à {jour} {h}', { jour: jourDeLHeure(x.echeance), h: heure(x.echeance, langue) })

  const envoyer = async () => {
    if (!choisi || envoi) return
    setEnvoi(true)
    setErreur(null)
    const r = await source.preparation.demanderDelai(c.ref, choisi.choix)
    setEnvoi(false)
    if (!r.ok) {
      jouer('erreur')
      setErreur(
        r.raison === 'deja_prolongee'
          ? t('Plus de temps a déjà été demandé pour cette commande : une seule fois par commande.')
          : r.raison === 'au_dela_de_24h'
            ? t('Ce choix dépasse l’échéance absolue : choisissez une heure plus proche.')
            : t('Cette commande n’est plus à préparer.'),
      )
      return
    }
    jouer('notification')
    naviguer(lien('commande', { ref: c.ref }), { replace: true, state: { avis: { ton: 'green', texte: tf('Nouvelle heure : prête avant {h}. Le client et le livreur sont prévenus.', { h: quand(r.echeance, maintenant, langue) }) } } })
  }

  const reste = restantOuvert(c, maintenant)
  const heureActuelle = c.echeance ?? o.echeance
  return (
    <Ecran route="delai" titre={tf('Plus de temps · {ref}', { ref: c.ref })} retour={lien('commande', { ref: c.ref })}>
      <div className="pg">
        <h1 className="pg-t">{t('Besoin de plus de temps')}</h1>
        <p className="pg-s">{t('Choisissez une nouvelle heure, puis tenez-la. Une seule fois par commande.')}</p>
      </div>
      <div className="card">
        <div className="row">
          <span className="li" style={{ padding: '0', border: '0', minHeight: '0' }}>
            <span className="ic or">
              <Icone nom="timer" taille={20} />
            </span>
          </span>
          <div className="grow">
            <div className="b8 t15">{jourDe(heureActuelle) === jourDe(maintenant) ? tf('Prête aujourd’hui avant {h}', { h: heure(heureActuelle, langue) }) : tf('Prête avant {h}', { h: quand(heureActuelle, maintenant, langue) })}</div>
            <div className="t12 c3 mt4">{tf('{ref} · {article} · il reste {d}', { ref: c.ref, article: `${l.article.titre} ${t(l.article.variante)}`, d: duree(reste, langue) })}</div>
          </div>
        </div>
      </div>
      {!ouvert ? (
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom={o.prolongee ? 'calendar-check' : 'package-check'} taille={26} />
            </div>
            <h3>{t(o.prolongee ? 'Plus de temps déjà demandé' : 'Cette commande n’est plus à préparer')}</h3>
            <p>{o.prolongee ? tf('Une seule fois par commande. Tenez la nouvelle heure : prête avant {h}.', { h: quand(heureActuelle, maintenant, langue) }) : t('Il n’y a plus de délai à prolonger.')}</p>
            <div className="mt14">
              <Bouton classe="primary" icone="arrow-left" vers={lien('commande', { ref: c.ref })}>
                {t('Revenir à la commande')}
              </Bouton>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="divider-t">{t('Nouvelle heure')}</div>
          <div role="radiogroup" aria-label={t('Nouvelle heure')}>
            {o.options.map((x) => (
              <a
                key={x.choix}
                role="radio"
                aria-checked={choisi?.choix === x.choix}
                aria-disabled={!x.possible || undefined}
                tabIndex={x.possible ? 0 : -1}
                className={'radio' + (choisi?.choix === x.choix ? ' on' : '') + (x.possible ? '' : ' off')}
                style={x.possible ? { cursor: 'pointer' } : { opacity: 0.45, cursor: 'not-allowed' }}
                onClick={() => choisir(x)}
                onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), choisir(x))}
              >
                <span className="rd"></span>
                <span className="grow">
                  <span className="rt" style={{ display: 'block' }}>
                    {titreOption(x)}
                  </span>
                  <span className="rs" style={{ display: 'block' }}>
                    {x.possible ? effet(x) : t('Au-delà de l’échéance absolue : impossible')}
                  </span>
                </span>
              </a>
            ))}
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Au plus tard {quand}, 24 heures d’ouverture après le paiement. Un choix au-delà est grisé.', { quand: echeance(o.absolue, maintenant, langue) })}</span>
          </div>
        </>
      )}
      <div className="card">
        <h3>{t('Ce qui va se passer')}</h3>
        <div className="mt8">
          <div className="row" style={{ gap: '10px', padding: '9px 0', alignItems: 'flex-start' }}>
            <Icone nom="bell" taille={18} style={{ color: 'var(--green)', flexShrink: '0', marginTop: '1px' }} />
            <div className="grow">
              <div className="t14 b6" style={{ lineHeight: '1.4', color: 'var(--ink)' }}>
                {t('Le client et le livreur sont prévenus.')}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: '10px', padding: '9px 0', borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
            <Icone nom="gauge" taille={18} style={{ color: 'var(--amber)', flexShrink: '0', marginTop: '1px' }} />
            <div className="grow">
              <div className="t14 b6" style={{ lineHeight: '1.4', color: 'var(--ink)' }}>
                {t('Effet léger sur votre Ponctualité.')}
              </div>
              <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
                {t('La part du Trust Score qui compte vos délais tenus.')}
              </div>
            </div>
          </div>
        </div>
        <details className="more flat">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Pourquoi ?')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>{t('Délai demandé puis tenu : échec léger.')}</p>
            <p>{t('Retard sans rien dire : échec moyen.')}</p>
            <p>{t('Demander du temps coûte donc moins que se taire. Le client et le livreur reçoivent la nouvelle heure automatiquement.')}</p>
          </div>
        </details>
      </div>
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{erreur}</div>
        </div>
      )}
      {ouvert && choisi && (
        <div className="mt16">
          <Bouton classe="primary" icone="clock" desactive={!enLigne || envoi} titre={!enLigne ? t('Réseau nécessaire') : undefined} onClick={() => void envoyer()}>
            {libelleBouton(choisi)}
          </Bouton>
        </div>
      )}
      {ouvert && !choisi && (
        <div className="note amber" role="status">
          <Icone nom="triangle-alert" taille={18} />
          <div>{t('Aucune nouvelle heure ne tient avant l’échéance absolue. Préparez la commande, ou signalez une rupture.')}</div>
        </div>
      )}
      {!enLigne && ouvert && (
        <div className="hint-l">
          <Icone nom="wifi-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Hors connexion : demander plus de temps demande le réseau.')}</span>
        </div>
      )}
    </Ecran>
  )
}

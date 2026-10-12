// Rupture (VD-05) : reprise du prototype (balisage de route('rupture') : « Signaler une rupture », rappel de la
// commande, « Ce qui va se passer » en quatre lignes, « Comment ça marche » replié, interrupteur « Mettre le stock à
// 0 », « Signaler la rupture » et « Annuler »), branchée sur la source (commandes.detail, preparation.signalerRupture).
// - Règles : DP-01 (vendeur suivant, au plus 2 tentatives, sinon remboursement intégral le jour même), RUP-01…04,
//   VD05-R11, VD05-R12 (stock de la variante à 0, activé par défaut), RUP-03 (rupture avant l'échéance : échec léger
//   g1 ; non-préparation : g3 et sanction de niveau 2), RUP-02 (commande dissociée, autres vendeurs jamais montrés).
// - Un geste : les effets sont écrits avant ; après l'envoi, la commande quitte la file (retour aux commandes, avis).
//   Pendant 5 secondes, « Annuler l'envoi » rattrape un toucher malheureux (rien n'est parti).
// - Accès Préparation : mêmes gestes (ACC-27), aucun montant. Hors connexion : rien n'est envoyé (réseau nécessaire).
// - Corrige le défaut 4 du prototype : l'heure limite et l'article sont ceux de la commande demandée, en FR et en EN.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import type { Commande } from '../../donnees/domaines/commandes'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, useRole } from '../../session'
import { Bouton, EtatLecture, quand, restantOuvert, useEnLigne, useLien } from './commun'

const ATTENTE_S = 5

function Effet({ icone, couleur, texte, aide, premier }: { icone: string; couleur: string; texte: string; aide?: string; premier?: boolean }) {
  return (
    <div className="row" style={{ gap: '10px', padding: '9px 0', alignItems: 'flex-start', ...(premier ? {} : { borderTop: '1px solid var(--line)' }) }}>
      <Icone nom={icone} taille={18} style={{ color: couleur, flexShrink: '0', marginTop: '1px' }} />
      <div className="grow">
        <div className="t14 b6" style={{ lineHeight: '1.4', color: 'var(--ink)' }}>
          {texte}
        </div>
        {aide && (
          <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
            {aide}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Rupture() {
  const { tf } = usePreferences()
  const role = useRole()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-00008'
  const lecture = useLecture(() => source.commandes.detail(ref).then((c) => ({ c })), [ref, role])
  const c = lecture.donnees?.c
  if (!c) return <EtatLecture route="rupture" erreur={lecture.erreur} vide={lecture.donnees !== null} relire={lecture.relire} titre={tf('Rupture · {ref}', { ref })} />
  return <Formulaire c={c} />
}

function Formulaire({ c }: { c: Commande }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge(5000)
  const naviguer = useNavigate()
  const lien = useLien()
  const { enLigne } = useEnLigne()
  const [stockAZero, setStock] = useState(true)
  const [envoi, setEnvoi] = useState<number | null>(null) // envoi demandé (délai d'annulation en cours)
  const [reste, setReste] = useState(0)
  const [erreur, setErreur] = useState<string | null>(null)
  const minuterie = useRef<number | undefined>(undefined)
  const l = c.lignes[0]
  const variante = t(l.article.variante)
  const aPreparer = c.echeance !== null
  const avantEcheance = aPreparer && restantOuvert(c, maintenant) > 0

  const envoyer = async () => {
    setEnvoi(null)
    const r = await source.preparation.signalerRupture(c.ref, stockAZero)
    if (!r.ok) {
      jouer('erreur')
      setErreur(r.raison === 'deja_prete' ? t('Cette commande n’est plus à préparer : la rupture ne peut plus être signalée.') : t('Commande introuvable.'))
      return
    }
    jouer('notification')
    naviguer(lien('commandes'), {
      replace: true,
      state: { avis: { ton: 'green', texte: tf(stockAZero ? 'Rupture signalée pour {ref}. Un autre vendeur la reprend, sinon le client est remboursé aujourd’hui. Stock de la variante mis à 0.' : 'Rupture signalée pour {ref}. Un autre vendeur la reprend, sinon le client est remboursé aujourd’hui.', { ref: c.ref }) } },
    })
  }

  // Délai d'annulation : 5 s pour rattraper un toucher malheureux, puis l'envoi part tout seul (minuterie à la
  // seconde, indépendante de l'horloge du téléphone).
  useEffect(() => {
    if (envoi === null) return
    if (reste <= 0) {
      void envoyer()
      return
    }
    minuterie.current = window.setTimeout(() => setReste((r) => r - 1), 1000)
    return () => clearTimeout(minuterie.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envoi, reste])

  const nomVariante = `${l.article.titre} ${variante}`
  return (
    <Ecran route="rupture" titre={tf('Rupture · {ref}', { ref: c.ref })} retour={lien('commande', { ref: c.ref })}>
      <div className="pg">
        <h1 className="pg-t">{t('Signaler une rupture')}</h1>
        <p className="pg-s">{t('Vous n’avez plus l’article ? Dites-le maintenant : signaler tôt coûte peu, se taire coûte cher.')}</p>
      </div>
      <div className="card">
        <div className="art" style={{ marginTop: '0' }}>
          <Vignette nom={l.article.dessin} taille={48} />
          <div className="grow">
            <div className="an" style={{ fontSize: '16px' }}>{`${l.article.titre} · ${variante}`}</div>
            <div className="av">{c.echeance ? tf('{ref} · prête avant {h}', { ref: c.ref, h: quand(c.echeance, maintenant, langue) }) : c.ref}</div>
          </div>
        </div>
      </div>
      {!aPreparer && (
        <div className="note ink" role="status">
          <Icone nom="info" taille={18} />
          <div>{c.statut === 'annulee' ? t('La rupture de cette commande est déjà signalée.') : t('Cette commande n’est plus à préparer : la rupture ne peut plus être signalée.')}</div>
        </div>
      )}
      <div className="card">
        <h3>{t('Ce qui va se passer')}</h3>
        <div className="mt8">
          <Effet premier icone="repeat" couleur="var(--or-txt)" texte={t('Un autre vendeur reprend la commande.')} />
          <Effet icone="undo-2" couleur="var(--or-txt)" texte={t('Sinon, le client est remboursé aujourd’hui.')} />
          <Effet icone="circle-check" couleur="var(--green)" texte={t('Vous ne payez aucun frais.')} />
          <Effet icone="gauge" couleur="var(--amber)" texte={t(avantEcheance || !aPreparer ? 'Effet léger sur votre Ponctualité.' : 'Délai dépassé : l’effet sur votre Ponctualité est plus lourd.')} aide={t('La part du Trust Score qui compte vos délais tenus.')} />
        </div>
        <details className="more flat">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Comment ça marche')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>
              <b>{t('Le vendeur suivant')}</b>
              {t(' a un Trust Score de 75 au moins et un prix livré au plus 5 % plus cher. L’écart est payé par BelivaY, jamais par le client. Sans vendeur suivant, le client est remboursé intégralement, le jour même.')}
            </p>
            <p>
              <b>{t('Deux essais au plus.')}</b>
              {t(' BelivaY propose la commande à deux vendeurs suivants au plus ; si aucun ne peut la servir, le client est remboursé.')}
            </p>
            <p>
              <b>{t('Votre Ponctualité.')}</b>
              {c.echeance ? tf(' Rupture signalée avant {h} : échec léger. Commande non préparée : échec grave et sanction de niveau 2.', { h: quand(c.echeance, maintenant, langue) }) : t(' Rupture signalée avant l’échéance : échec léger. Commande non préparée : échec grave et sanction de niveau 2.')}
            </p>
            <p>
              <b>{t('Commande avec d’autres articles.')}</b>
              {t(' Elle se dissocie : seul votre article change de vendeur. Vous ne voyez pas les autres vendeurs.')}
            </p>
          </div>
        </details>
      </div>
      <div className="card">
        <div className="row">
          <div className="grow" id="vd05-stock">
            <div className="b8 t14">{tf('Mettre le stock de l’{article} à 0', { article: nomVariante })}</div>
            <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
              {t(stockAZero ? 'Plus aucune commande sur cette variante jusqu’à votre réapprovisionnement.' : 'Le stock reste en ligne : d’autres clients pourront commander cette variante.')}
            </div>
          </div>
          <button
            type="button"
            className={'tg' + (stockAZero ? ' on' : '')}
            role="switch"
            aria-checked={stockAZero}
            aria-labelledby="vd05-stock"
            disabled={!aPreparer || envoi !== null}
            onClick={() => (setStock((x) => !x), jouer('interrupteur'))}
          ></button>
        </div>
      </div>
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{erreur}</div>
        </div>
      )}
      {envoi !== null ? (
        <div className="note amber" role="status" style={{ alignItems: 'center' }}>
          <Icone nom="timer" taille={18} />
          <div className="grow">{tf('Envoi de la rupture dans {n} s…', { n: reste })}</div>
          <button type="button" className="btn secondary sm" style={{ width: 'auto', height: '40px', padding: '0 14px' }} onClick={() => (setEnvoi(null), jouer('interrupteur'))}>
            <span>{t('Annuler l’envoi')}</span>
          </button>
        </div>
      ) : (
        <div className="mt16">
          <Bouton
            classe="primary"
            icone="package-x"
            desactive={!aPreparer || !enLigne}
            titre={!enLigne ? t('Réseau nécessaire') : undefined}
            onClick={() => {
              setErreur(null)
              setReste(ATTENTE_S)
              setEnvoi(Date.now())
            }}
          >
            {t('Signaler la rupture')}
          </Bouton>
        </div>
      )}
      {!enLigne && aPreparer && (
        <div className="hint-l">
          <Icone nom="wifi-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Hors connexion : signaler une rupture demande le réseau. Le bouton revient dès la reconnexion.')}</span>
        </div>
      )}
      <div className="mt8">
        <Bouton classe="ghost" vers={lien('commande', { ref: c.ref })}>
          {t('Annuler')}
        </Bouton>
      </div>
    </Ecran>
  )
}

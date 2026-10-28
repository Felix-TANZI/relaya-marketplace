// PR-08 · page ajoutée « Appel masqué » (DP-61, PR-RC-25, MSG-01) : le relais appelle sans jamais voir ni montrer un
// vrai numéro — le livreur seulement pendant sa mission au relais (lot en approche ou arrivé, jusqu'au dépôt confirmé),
// le support pendant ses heures (SUP-HORAIRES, DP-12). Le relais n'appelle jamais un client : le client l'appelle,
// en numéro masqué, pendant son retrait (écran Retrait). Chaque appel est journalisé pour l'administrateur, sans
// contenu : qui, quand, combien de temps. Un appel exige le réseau ; hors connexion, écrire à BelivaY (Messagerie).
// L'appel ne bloque pas l'application : il passe dans le panneau flottant commun (composants/AppelEnCours.tsx), qui se
// réduit en bulle et suit le relais sur tous les écrans ; cet écran le rappelle (« Afficher l'appel »).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { afficherAppel, lancerAppel, useAppel } from '../../composants/AppelEnCours'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import type { Appel as AppelFait, Joignable } from '../../donnees/domaines/messages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Chargement, ErreurLecture, quand, useTexte } from './commun'
import './pr08.css'

const minSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function EnCours({ a, raccrocher, maintenant }: { a: AppelFait; raccrocher: () => void; maintenant: number }) {
  const { t } = usePreferences()
  return (
    <div className="p-yi6rkz" role="region" aria-label={t('Appel en cours')}>
      <div className="pr08-appel">
        <div className="pr08-appel-i">
          <Icone nom="phone-call" taille={32} />
        </div>
        <h2 className="p-9j1bbu">{a.nom}</h2>
        <div className="pr08-duree" role="timer" aria-live="off">
          {minSec(Math.max(0, Math.round((maintenant - a.debut) / 1000)))}
        </div>
        <div className="pr08-note">{t('Appel en cours · numéro masqué des deux côtés')}</div>
      </div>
      <button type="button" className="r-btn r-alerte" onClick={raccrocher}>
        <Icone nom="phone" taille={20} />
        {t('Raccrocher')}
      </button>
    </div>
  )
}

function Carte({ j, appeler, occupe, enLigne }: { j: Joignable; appeler: () => void; occupe: boolean; enLigne: boolean }) {
  const { t } = usePreferences()
  const tx = useTexte()
  return (
    <div className="p-yi6rkz">
      <div className="p-o24hsm">
        <div className="p-toppw8">
          <Icone nom={j.cible === 'livreur' ? 'r-camion' : 'r-aide'} taille={20} className="p-672m16" />
        </div>
        <div className="p-rnqj8n">
          <h2 className="p-ife3a2" style={{ margin: 0 }}>
            {j.cible === 'livreur' ? t('Livreur en mission') : t('Support BelivaY')}
          </h2>
          <div className="p-dfa05r">{j.nom !== '—' && j.cible === 'livreur' ? `${j.nom} · ${tx(j.motif)}` : tx(j.motif)}</div>
        </div>
        <span className={j.ouvert ? 'p-nax3x4' : 'p-6z26dm'}>{j.ouvert ? t('Ouvert') : t('Fermé')}</span>
      </div>
      {j.ouvert ? (
        <button type="button" className="r-btn r-principal" disabled={occupe || !enLigne} onClick={appeler}>
          <Icone nom="phone" taille={20} />
          {j.cible === 'livreur' ? t('Appeler le livreur') : t('Appeler le support')}
        </button>
      ) : (
        <div className="pr08-note">{tx(j.ferme)}</div>
      )}
    </div>
  )
}

export default function Appel() {
  const { t, tf, langue } = usePreferences()
  const en = useEnLigne()
  const maintenant = useHorloge(1000)
  const j = useLecture(() => source.messages.joignables(), [])
  const journal = useLecture(() => source.messages.appels(), [])
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const flottant = useAppel()
  if ((j.erreur && !j.donnees) || (journal.erreur && !journal.donnees))
    return (
      <Ecran route="appel">
        <ErreurLecture relire={() => (j.relire(), journal.relire())} />
      </Ecran>
    )
  if (!j.donnees || !journal.donnees)
    return (
      <Ecran route="appel">
        <Chargement lignes={2} />
      </Ecran>
    )
  const enCours = journal.donnees.find((a) => a.dureeS === null) ?? null
  const appeler = async (cible: Joignable['cible']) => {
    setOccupe(true)
    setErreur(null)
    try {
      const r = await source.messages.appeler(cible, origine(maintenant))
      if (!r.ok) {
        setErreur(t(r.raison === 'deja_en_cours' ? 'Un appel est déjà en cours.' : 'Cet appel n’est plus ouvert.'))
        signal('erreur')
      } else {
        signal('envoi')
        const id = r.appel.id
        const decalage = maintenant - Date.now()
        lancerAppel({
          nom: r.appel.nom,
          qui: cible === 'livreur' ? 'Livreur en mission' : 'Support BelivaY',
          canal: 'Appel masqué',
          raccrocher: async () => {
            await source.messages.raccrocher(id, origine(Date.now() + decalage))
            signal('toucher')
          },
        })
      }
      j.relire()
      journal.relire()
    } finally {
      setOccupe(false)
    }
  }
  const raccrocher = async () => {
    if (!enCours) return
    await source.messages.raccrocher(enCours.id, origine(maintenant))
    signal('toucher')
    journal.relire()
  }
  const passes = journal.donnees.filter((a) => a.dureeS !== null)
  return (
    <Ecran route="appel">
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">{t('Appel masqué')}</h1>
          <div className="p-t2u0o2">{t('Jamais votre numéro, jamais le leur : BelivaY relie l’appel. Le livreur pendant sa mission, le support pendant ses heures.')}</div>
        </div>
        {!en && (
          <div className="pr08-ambre" data-hors-ligne="" role="status">
            <Icone nom="r-reseau" taille={18} />
            <span>
              {t('Hors ligne : un appel exige le réseau. Écrivez à BelivaY, le message partira au retour du réseau.')}{' '}
              <Link className="pr08-lien" to={chemin('messagerie')}>
                {t('Messagerie')}
              </Link>
            </span>
          </div>
        )}
        {erreur && (
          <div className="pr08-alerte" role="alert">
            <Icone nom="r-alerte" taille={18} />
            <span>{erreur}</span>
          </div>
        )}
        {enCours && flottant && flottant.fin === null ? (
          <div className="p-yi6rkz" role="status">
            <div className="pr08-note">{tf('Appel en cours avec {n} : il reste affiché en bas de l’écran pendant que vous travaillez.', { n: enCours.nom })}</div>
            <button type="button" className="r-btn r-principal" onClick={afficherAppel}>
              <Icone nom="phone" taille={20} />
              {t('Afficher l’appel')}
            </button>
          </div>
        ) : enCours ? <EnCours a={enCours} raccrocher={() => void raccrocher()} maintenant={maintenant} /> : j.donnees.map((x) => <Carte key={x.cible} j={x} occupe={occupe} enLigne={en} appeler={() => void appeler(x.cible)} />)}
        <div className="p-gh7puf">
          <Icone nom="r-cadenas" taille={18} className="p-672m16" />
          <div>{t('Vous n’appelez jamais un client : c’est lui qui peut vous appeler, en numéro masqué, pendant son retrait. Chaque appel est noté pour BelivaY (heure et durée, jamais le contenu).')}</div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">{t('Derniers appels')}</h2>
          </div>
          {passes.length === 0 ? (
            <div className="pr08-note">{t('Aucun appel pour l’instant.')}</div>
          ) : (
            passes.slice(0, 10).map((a, i) => (
              <div key={a.id}>
                {i > 0 && <div className="p-92xvtp" style={{ marginBottom: 12 }} />}
                <div className="p-bxuikp">
                  <div className="p-ife3a2">{a.nom}</div>
                  <div className="p-07ygos">{quand(a.debut, maintenant, langue)}</div>
                </div>
                <div className="p-dfa05r">{tf('{duree} · par {qui}', { duree: minSec(a.dureeS ?? 0), qui: a.par })}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </Ecran>
  )
}

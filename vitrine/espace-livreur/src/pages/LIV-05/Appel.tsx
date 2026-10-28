// LIV-P33 · Appel (DP-61, LIV-ANO-02, LIV-UIX-09) — le livreur joint le client, le vendeur, la gérante du relais, son
// entreprise ou le support, JAMAIS par un numéro : appel dans l'application, ou rappel par numéro masqué (BelivaY
// appelle les deux téléphones et les met en relation). Repli : message masqué (SMS ou WhatsApp) à texte fixe, sans
// champ libre (aucun numéro ne peut s'échanger). Client, vendeur et relais ne sont joignables que pendant leur arrêt en
// cours, jusqu'à sa clôture ; l'entreprise et le support, pendant toute la journée. Chaque appel est journalisé
// (correspondant, mode, heure, durée — jamais le contenu) : l'administrateur le contrôle ; un appel au client compte
// dans les preuves d'une absence (deux appels espacés, LIV-P18). Bouton d'urgence : SOS (LIV-P30).
// L'appel en cours ne bloque pas l'application : il passe dans le panneau flottant commun (composants/AppelEnCours.tsx),
// qui se réduit en bulle et suit le livreur sur tous les écrans pendant la tournée ; cet écran le rappelle.
import { useEffect, useRef, useState } from 'react'
import { afficherAppel, lancerAppel, useAppel } from '../../composants/AppelEnCours'
import { geste, origine } from '../../donnees/fileHorsLigne'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { Correspondant, Joignable, ModeAppel } from '../../donnees/domaines/tournee'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Chargement, Erreur, chrono, useAgir } from '../../composants/livraison/outils'
import { AvisAnnuler, useDiffere } from '../../composants/livraison/enrichi'
import { BarreAction, Hint, Li, Lvp, Note, Pill, Sec, Vide } from '../../composants/proto'

const ICONES: Record<Correspondant, string> = { client: 'house', vendeur: 'store', relais: 'warehouse', entreprise: 'building-2', support: 'life-buoy' }
const ROLES: Record<Correspondant, string> = { client: 'Client de l’arrêt en cours', vendeur: 'Vendeur de l’arrêt en cours', relais: 'Gérante du relais de l’arrêt en cours', entreprise: 'Votre entreprise', support: 'Support livreur BelivaY' }
const FERME: Record<Correspondant, string> = { client: 'Seulement pendant une remise à domicile en cours', vendeur: 'Seulement pendant un ramassage ou un retour en cours', relais: 'Seulement pendant un dépôt ou une collecte en cours', entreprise: '', support: '' }
const MODES: Record<ModeAppel, string> = { application: 'Appel dans l’application', rappel: 'Rappel par numéro masqué', sms: 'SMS masqué', whatsapp: 'WhatsApp masqué' }
const MODELES: Record<Correspondant, string[]> = {
  client: ['J’arrive dans 5 minutes.', 'Je suis devant le repère indiqué.', 'Pouvez-vous préciser le repère dans l’application ?'],
  vendeur: ['J’arrive dans 5 minutes.', 'Je suis devant la boutique.', 'Je vous attends pour le contrôle des colis.'],
  relais: ['J’arrive au relais dans 5 minutes.', 'Je suis devant le relais.'],
  entreprise: ['Je suis bloqué sur l’arrêt en cours, rappelez-moi.', 'Arrêt terminé, je continue la tournée.'],
  support: ['J’ai besoin d’aide sur l’arrêt en cours, rappelez-moi.'],
}

/** Appel affiché dans le panneau flottant commun (un seul à la fois) : évite de le relancer à chaque lecture. */
let appelAffiche: string | null = null

export default function Appel() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const joignables = useLecture(() => source.tournee.joignables(), [])
  const journal = useLecture(() => source.tournee.appels(), [])
  const { agir, occupe, enLigne, maintenant } = useAgir()
  const [choisi, setChoisi] = useState<Correspondant | null>((params.get('avec') as Correspondant | null) ?? null)
  const [message, setMessage] = useState(false)
  const [canal, setCanal] = useState<'sms' | 'whatsapp'>('sms')
  const [envoye, setEnvoye] = useState<string | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const differe = useDiffere()
  const carte = useRef<HTMLDivElement>(null)
  // Correspondant choisi : sa carte vient sous le pouce.
  useEffect(() => {
    if (choisi && !params.get('avec')) carte.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [choisi]) // eslint-disable-line react-hooks/exhaustive-deps

  const liste = joignables.donnees
  const cible: Joignable | null = liste?.find((j) => j.correspondant === choisi && j.ouvert) ?? null
  const actif = journal.donnees?.find((a) => a.fin === null && (a.mode === 'application' || a.mode === 'rappel')) ?? null

  const appeler = async (mode: ModeAppel, modele?: string) => {
    if (!cible) return
    setRefus(null)
    setEnvoye(null)
    const res = await agir('appel', 'appel:' + cible.correspondant, (o, s) => s.tournee.appeler(cible.correspondant, mode, o, modele))
    if (res?.r.ok) {
      signal(mode === 'sms' || mode === 'whatsapp' ? 'succes' : 'nouveau')
      if (modele) {
        setEnvoye(tf('{canal} envoyé à {nom} : « {texte} »', { canal: t(MODES[mode]), nom: cible.nom, texte: t(modele) }))
        setMessage(false)
      }
    } else {
      signal('erreur')
      setRefus(t('Ce correspondant n’est plus joignable : l’arrêt est terminé ou n’est pas en cours.'))
    }
  }
  // Heure de la démonstration au moment du geste (le panneau peut raccrocher depuis un autre écran).
  const horloge = useRef({ demo: maintenant, reel: Date.now() })
  horloge.current = { demo: maintenant, reel: Date.now() }
  const panneau = useAppel()
  useEffect(() => {
    if (!actif || appelAffiche === actif.id) return
    appelAffiche = actif.id
    const id = actif.id
    const rappel = actif.mode === 'rappel'
    lancerAppel({
      nom: actif.nom,
      qui: t(ROLES[actif.correspondant]),
      canal: t(MODES[actif.mode]),
      pied: rappel ? t('BelivaY vous rappelle : décrochez l’appel « BelivaY · numéro masqué ». Votre correspondant est appelé en même temps.') : t('Appel masqué · aucun numéro n’est affiché, ni d’un côté ni de l’autre. Réduisez l’appel pour continuer la tournée.'),
      // L'appel terminé s'inscrit dans « Appels de la mission » : le panneau se retire aussitôt, la tournée continue.
      fermerAuRaccroche: true,
      raccrocher: async () => {
        const h = horloge.current
        const o = origine(h.demo + (Date.now() - h.reel))
        await geste(typeof navigator === 'undefined' || navigator.onLine, 'appel', 'appel:' + id, o, (s) => s.tournee.raccrocher(id, o), true)
        signal('toucher')
      },
    })
  }, [actif]) // eslint-disable-line react-hooks/exhaustive-deps

  const contenu = () => {
    if (joignables.erreur || journal.erreur) return <Erreur relire={() => (joignables.relire(), journal.relire())} />
    if (!liste || !journal.donnees) return <Chargement />
    return (
      <>
        {actif && (!panneau || panneau.reduit) && (
          <Note ton="acc" icone="phone" role="status">
            <b>{tf('Appel en cours avec {nom}', { nom: actif.nom })}</b>{' '}
            <button type="button" className="btn sm acc-soft" onClick={afficherAppel}>
              {t('Afficher l’appel')}
            </button>
          </Note>
        )}
        <Sec titre={t('Qui voulez-vous joindre ?')} />
        <div className="card tight" role="radiogroup" aria-label={t('Correspondant')}>
          {liste.map((j) => (
            <button key={j.correspondant} type="button" role="radio" aria-checked={choisi === j.correspondant} className="li" disabled={!j.ouvert} onClick={() => (setChoisi(j.correspondant), setMessage(false), setRefus(null))}>
              <span className={'ic ' + (j.ouvert ? (j.correspondant === 'support' ? 'or' : 'acc') : '')}>
                <Icone nom={ICONES[j.correspondant]} taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {j.ouvert ? j.nom : t(ROLES[j.correspondant])}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {j.ouvert ? t(ROLES[j.correspondant]) : t(FERME[j.correspondant])}
                </span>
              </span>
              <Icone nom={j.ouvert ? 'chevron-right' : 'lock'} taille={18} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
        <Hint icone="eye-off">{t('Aucun numéro n’est jamais affiché : BelivaY met les deux téléphones en relation.')}</Hint>

        {refus && <Note ton="red" icone="circle-alert" role="alert">{refus}</Note>}
        {envoye && <Note ton="green" icone="circle-check" role="status">{envoye}</Note>}

        {cible && (
          <div className="card acc" ref={carte}>
            <div className="row">
              <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
                <span className="ic acc" style={{ width: 46, height: 46 }}>
                  <Icone nom={ICONES[cible.correspondant]} taille={22} />
                </span>
              </span>
              <div className="grow">
                <h2 className="b8 t19" style={{ margin: 0, letterSpacing: '-.015em' }}>
                  {cible.nom}
                </h2>
                <div className="t13 c3 mt4">{t(ROLES[cible.correspondant])}</div>
              </div>
            </div>
            {!enLigne && <Note ton="amber" icone="wifi-off">{t('Pas de réseau de données : l’appel dans l’application est impossible. Le rappel par numéro masqué passe par le réseau téléphonique.')}</Note>}
            <div className="btns liva-col mt14">
              <button type="button" className="btn secondary" disabled={occupe || !!actif} onClick={() => void appeler('rappel')}>
                <Icone nom="phone-call" taille={18} />
                <span>{t('Être rappelé · numéro masqué')}</span>
              </button>
              <button type="button" className="btn acc-soft" aria-expanded={message} onClick={() => setMessage(!message)}>
                <Icone nom="message-square-text" taille={18} />
                <span>{t('Pas de réponse ? Message masqué')}</span>
              </button>
            </div>
            {message && (
              <>
                <div className="seg" role="radiogroup" aria-label={t('Canal du message')}>
                  {(['sms', 'whatsapp'] as const).map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={canal === c} onClick={() => setCanal(c)}>
                      {t(MODES[c])}
                    </button>
                  ))}
                </div>
                <Hint icone="lock">{t('Textes fixes seulement : aucun champ libre, aucun numéro échangé.')}</Hint>
                <div className="mt8">
                  {MODELES[cible.correspondant].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="li"
                      disabled={occupe || !!differe.attente}
                      onClick={() => {
                        setEnvoye(null)
                        setMessage(false)
                        differe.lancer(tf('Message à {nom} : « {texte} »', { nom: cible.nom, texte: t(m) }), () => appeler(canal, m))
                      }}
                    >
                      <span className="ic acc">
                        <Icone nom="send" taille={18} />
                      </span>
                      <span className="grow">
                        <span className="lt" style={{ display: 'block' }}>
                          {t(m)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <Sec titre={t('Appels de la mission')} />
        <div className="card tight lv-liste">
          {journal.donnees.length === 0 ? (
            <Vide icone="history" t={t('Aucun appel pour l’instant')} s={t('Chaque appel et chaque message de la mission s’inscrit ici, avec l’heure et la durée.')} />
          ) : (
            journal.donnees.map((a) => (
              <Li
                key={a.id}
                icone={a.mode === 'sms' || a.mode === 'whatsapp' ? 'message-circle' : 'phone'}
                ton={a.fin === null ? 'acc' : undefined}
                t={a.nom}
                s={
                  t(MODES[a.mode]) +
                  ' · ' +
                  heure(a.debut, langue) +
                  (a.fin !== null && a.mode !== 'sms' && a.mode !== 'whatsapp' ? ' · ' + chrono(a.fin - a.debut) : '') +
                  (a.modele ? ' · « ' + t(a.modele) + ' »' : '')
                }
                droite={a.fin === null ? <Pill ton="acc" sm point>{t('en cours')}</Pill> : undefined}
              />
            ))
          )}
        </div>
        <Note ton="ink" icone="shield-check">
          {t('Le contenu des appels n’est jamais enregistré : seuls le correspondant, l’heure et la durée sont notés, pour l’administrateur et les litiges.')}
        </Note>

        <Link className="livc-sosbar" to={chemin('aide')}>
          <span className="ci">{t('SOS')}</span>
          <span className="grow">
            <b>{t('Urgence ou danger')}</b>
            <span>{t('Votre sécurité passe avant toute remise.')}</span>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        {(cible || differe.attente) && (
          <BarreAction aide={cible && !enLigne ? t('Sans données mobiles : choisissez le rappel par numéro masqué.') : actif ? t('Un appel est déjà en cours.') : undefined}>
            <AvisAnnuler d={differe} />
            {cible && (
              <button type="button" className="btn primary xl" disabled={occupe || !!actif || !enLigne} onClick={() => void appeler('application')}>
                <Icone nom="phone" taille={18} />
                <span>{t('Appel dans l’application')}</span>
              </button>
            )}
          </BarreAction>
        )}
      </>
    )
  }
  return (
    <Ecran proto route="appel">
      <Lvp>{contenu()}</Lvp>
    </Ecran>
  )
}

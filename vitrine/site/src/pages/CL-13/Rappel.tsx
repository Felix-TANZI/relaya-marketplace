// Écran « Demander un rappel » (CL-13), balisage et logique du prototype du 1er octobre (route rappel), repris à
// la main et rendu logique (DP-53) : la feuille se pose sur l'aide (CorpsAide).
// - Sujet (les thèmes des questions fréquentes), commande en cours (facultatif ; « ?commande=… » la choisit) et
//   créneau se choisissent vraiment ; l'appel part sur le numéro vérifié du compte, masqué, depuis un numéro BelivaY.
// - Le serveur place l'appel : aujourd'hui si le créneau n'est pas passé, sinon demain ; hors des heures du support,
//   « Dès que possible » veut dire demain dès 7 h.
// - Un rappel demandé reste affiché (« Rappel demandé ») jusqu'à ce qu'il soit annulé ; « ?st=envoye » montre
//   l'état du prototype en démonstration.
// - Ce qu'il faut au client (DP-54) : l'heure prévue de l'appel avant d'envoyer (même règle que le serveur), une
//   précision facultative pour la personne qui appelle, le numéro appelé (et comment le changer), sans numéro
//   vérifié le chemin pour le vérifier, la messagerie à la place, et un créneau qui se change après coup.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type Rappel as DonneesRappel } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { CorpsAide, useAide, type Aides } from './Aide'
import { EcranCompte } from './Larges'

const CRENEAUX = ['Dès que possible', 'Avant 12 h', '12 h – 17 h', '17 h – 21 h']
// Le rappel du prototype (« ?st=envoye »).
const EXEMPLE: DonneesRappel = { sujet: 'Retrait et code', commande: 'BLV-52018', creneau: 'Dès que possible', jour: 'aujourdhui' }

// Le jour de l'appel, comme le serveur le décide : aujourd'hui si la fin du créneau n'est pas passée (heure de
// Yaoundé), sinon demain. « Dès que possible » finit à la fermeture du support (21 h).
function jourPrevu(creneau: string, instant: number, fermeture: number): DonneesRappel['jour'] {
  const h = new Date(instant + 3600_000).getUTCHours()
  const fin = { [CRENEAUX[1]]: 12, [CRENEAUX[2]]: 17 }[creneau] ?? fermeture
  return h < fin ? 'aujourdhui' : 'demain'
}

// « dès que possible », « demain dès 7 h », « aujourd'hui entre 12 h et 17 h »…
function quand(r: DonneesRappel, ouvert: boolean): string {
  if (r.creneau === CRENEAUX[0]) return r.jour === 'aujourdhui' && ouvert ? 'dès que possible' : (r.jour === 'demain' ? 'demain' : 'aujourd’hui') + ' dès 7 h'
  const c = { [CRENEAUX[1]]: 'avant 12 h', [CRENEAUX[2]]: 'entre 12 h et 17 h', [CRENEAUX[3]]: 'entre 17 h et 21 h' }[r.creneau]
  return (r.jour === 'demain' ? 'demain ' : 'aujourd’hui ') + c
}

function Formulaire({ d, envoye, avant }: { d: Aides; envoye: (r: DonneesRappel) => void; avant: DonneesRappel | null }) {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const commandes = d.aide.commandesEnCours
  const voulue = params.get('commande')
  // « Changer le créneau » : le rappel annulé revient prérempli.
  const [sujet, setSujet] = useState(avant?.sujet ?? d.faq[1]?.titre ?? d.faq[0].titre)
  const [commande, setCommande] = useState<string | null>(
    avant ? avant.commande : voulue && commandes.includes(voulue) ? voulue : (commandes[0] ?? null),
  )
  const [creneau, setCreneau] = useState(avant?.creneau ?? CRENEAUX[0])
  const [precision, setPrecision] = useState(avant?.precision ?? '')
  const [envoi, setEnvoi] = useState(false)
  const puce = (actif: boolean, texte: string, choisir: () => void) => (
    <a key={texte} href="#" className={'chip' + (actif ? ' on' : '')} aria-pressed={actif} onClick={(e) => (e.preventDefault(), choisir())}>
      {t(texte)}
    </a>
  )
  const demander = async () => {
    if (envoi) return
    setEnvoi(true)
    envoye(await source.demanderRappel({ sujet, commande, creneau, ...(precision.trim() ? { precision: precision.trim() } : {}) }))
  }
  const ouvert = d.aide.support.ouvert
  const prevu = quand({ sujet, commande, creneau, jour: jourPrevu(creneau, d.aide.support.instant, d.aide.support.fermeture) }, ouvert)
  return (
    <Feuille ouverte fermer={() => naviguer(chemin('aide'), { replace: true })} titre={t('Demander un rappel')}>
      <h3 className="t17 b8" style={{ margin: '0' }}>
        {t('Demander un rappel')}
      </h3>
      <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
        {t('Une personne t’appelle depuis un numéro BelivaY. Elle ne voit pas ton numéro.')}
      </p>
      <div className="kick mt14">{t('C’est à propos de…')}</div>
      <div className="chips">{d.faq.map((th) => puce(sujet === th.titre, th.titre, () => setSujet(th.titre)))}</div>
      <div className="kick mt14">{t('Commande — facultatif')}</div>
      <div className="chips">
        {commandes.map((c) => puce(commande === c, c, () => setCommande(c)))}
        {puce(commande === null, 'Aucune', () => setCommande(null))}
      </div>
      <div className="kick mt14">{t('Quand ?')}</div>
      <div className="chips">{CRENEAUX.map((c) => puce(creneau === c, c, () => setCreneau(c)))}</div>
      <div className="hint-l" role="status">
        <Icone nom="clock" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{prevu === 'dès que possible' ? t('Appel prévu dès que possible, dans les heures du support.') : tf('Appel prévu {quand}.', { quand: t(prevu) })}</span>
      </div>
      {!d.aide.support.ouvert && (
        <div className="hint-l" role="status">
          <Icone nom="moon" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('Le support est fermé (7 h – 21 h) : on t’appelle demain, sur le créneau choisi.')}</span>
        </div>
      )}
      <div className="fld">
        <label htmlFor="rp-precision">{t('Ce que tu veux nous dire (facultatif)')}</label>
        <div className="inp area">
          <textarea
            id="rp-precision"
            rows={2}
            maxLength={200}
            value={precision}
            placeholder={t('Ex. : mon code de retrait ne marche pas au relais')}
            onChange={(e) => setPrecision(e.target.value)}
          />
        </div>
        <div className="hint">{tf('{n}/200 · la personne qui t’appelle le lit avant.', { n: precision.length })}</div>
      </div>
      {d.aide.numeroVerifie ? (
        <>
          <div className="mt8">
            <div className="kv">
              <span className="k">{t('Sur ton numéro')}</span>
              <span className="v ">
                <span className="nw">{t(d.aide.numero)}</span>
                {t(' · vérifié')}
              </span>
            </div>
          </div>
          <div className="btns">
            <a
              href={chemin('rappel', { st: 'envoye' })}
              className="btn primary"
              aria-disabled={envoi || undefined}
              onClick={(e) => (e.preventDefault(), demander())}
            >
              <Icone nom="phone-call" taille={18} />
              <span>{t('Demander le rappel')}</span>
            </a>
          </div>
          <div className="links">
            <Link to={chemin('numero-changer')}>{t('Ce n’est plus ton numéro ?')}</Link>
            <Link to={chemin('fil', { id: 'support', st: 'nouveau' })}>{t('Écrire plutôt au support')}</Link>
          </div>
        </>
      ) : (
        <>
          <div className="hint-l" role="alert">
            <Icone nom="smartphone" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{t('Pour être rappelé, il faut un numéro vérifié : la personne du support appelle ce numéro-là seulement.')}</span>
          </div>
          <div className="btns">
            <Link to={chemin('numero', { from: 'rappel' })} className="btn primary">
              <Icone nom="shield-check" taille={18} />
              <span>{t('Vérifier mon numéro')}</span>
            </Link>
          </div>
          <div className="links">
            <Link to={chemin('fil', { id: 'support', st: 'nouveau' })}>{t('Écrire plutôt au support')}</Link>
          </div>
        </>
      )}
    </Feuille>
  )
}

function Envoye({ d, r, annuler, changer }: { d: Aides; r: DonneesRappel; annuler: () => void; changer: () => void }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const ligne = (k: string, v: string) => (
    <div className="kv">
      <span className="k">{t(k)}</span>
      <span className="v ">{v}</span>
    </div>
  )
  const q = quand(r, d.aide.support.ouvert)
  return (
    <Feuille ouverte fermer={() => naviguer(chemin('aide'), { replace: true })} titre={t('Rappel demandé')}>
      <div className="empty" style={{ padding: '6px 0 0' }}>
        <div className="ei" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
          <Icone nom="phone-call" taille={26} />
        </div>
        <h3>{t('Rappel demandé')}</h3>
        <p>
          {q === 'dès que possible' ? t('Une personne de BelivaY t’appelle dès que possible sur le ') : tf('Une personne de BelivaY t’appelle {quand} sur le ', { quand: t(q) })}
          <span className="nw">{t(d.aide.numero)}</span>
          {t(', depuis un numéro BelivaY.')}
        </p>
      </div>
      <div className="card flat mt12">
        {ligne('À propos de', t(r.sujet))}
        {ligne('Commande', t(r.commande ?? 'Aucune'))}
        {ligne('Créneau', r.jour === 'demain' ? tf('{c}, demain', { c: t(r.creneau) }) : t(r.creneau))}
        {ligne('Numéro appelé', t(d.aide.numero))}
        {r.precision && ligne('Ce que tu as dit', r.precision)}
      </div>
      <div className="hint-l">
        <Icone nom="shield-alert" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{t('Garde ton téléphone près de toi. La personne de BelivaY ne te demandera jamais ton mot de passe ni un code.')}</span>
      </div>
      <div className="btns mt12">
        <Link to={chemin('aide')} className="btn primary" replace>
          <span>{t('C’est noté')}</span>
        </Link>
      </div>
      <div className="links">
        <a href={chemin('rappel')} onClick={(e) => (e.preventDefault(), changer())}>
          {t('Changer le créneau')}
        </a>
        <a href={chemin('rappel')} style={{ color: 'var(--red)' }} onClick={(e) => (e.preventDefault(), annuler())}>
          {t('Annuler le rappel')}
        </a>
      </div>
    </Feuille>
  )
}

export function Rappel() {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const demo = params.get('st') === 'envoye'
  const d = useAide()
  const [rappel, setRappel] = useState<DonneesRappel | null | undefined>(undefined)
  const [avant, setAvant] = useState<DonneesRappel | null>(null) // rappel repris pour en changer le créneau
  useEffect(() => {
    source.rappel().then(setRappel)
  }, [])
  if (!d || rappel === undefined) return null
  const montre = rappel ?? (demo ? EXEMPLE : null)
  const annuler = async () => {
    await source.annulerRappel()
    setRappel(null)
    naviguer(chemin('rappel'), { replace: true })
  }
  // Changer le créneau : l'ancien rappel est annulé, le formulaire revient prérempli.
  const changer = async () => {
    setAvant(montre)
    await annuler()
  }
  const envoye = (r: DonneesRappel) => {
    setRappel(r)
    naviguer(chemin('rappel', { st: 'envoye' }), { replace: true })
  }
  return (
    <EcranCompte
      route="rappel"
      parEtat
      etat={montre ? 'rappel?st=envoye' : 'rappel'}
      fixes={montre ? <Envoye d={d} r={montre} annuler={annuler} changer={changer} /> : <Formulaire key={avant ? 'repris' : 'neuf'} d={d} envoye={envoye} avant={avant} />}
    >
      <CorpsAide d={d} tard={!d.aide.support.ouvert} />
    </EcranCompte>
  )
}

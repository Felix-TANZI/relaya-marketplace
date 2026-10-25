// Réglages (LIV-P31), bloc « Compte » : sécurité et appareil, fusionnés dans les Réglages (DP-66 : une page par besoin ;
// l'ancienne adresse /securite y mène, ?voir=securite) :
// - ce téléphone (le seul lié au compte, LIV-03-R10) : nom, date de liaison, dernière synchronisation ;
// - code PIN : le changer (feuille `?sheet=pin` : l'ancien, le nouveau, la confirmation ; pavé de l'application, cases
//   masquées ; un ancien PIN faux compte dans les essais et peut bloquer, comme à l'ouverture) ;
// - empreinte : ouvrir l'application par l'empreinte du téléphone (jamais à la place d'un code SMS) ;
// - verrouiller maintenant ; dernières connexions et tentatives (journal du serveur, jamais un PIN ni un code) ;
// - téléphone perdu. Les limites (essais, blocage) s'affichent au moment où elles bloquent, avec « Pourquoi ? ».
import { useState } from 'react'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Btn, Carte, Hint, Kv, Li, Note, Sec, SaisieCode, type Ton } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { Securite as S } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Chargement, ErreurLecture } from '../LIV-04/commun'
import { useOrigine } from '../LIV-08/commun'
import { LivcIc, Tg } from './livc'
import '../AJ-L/ajl.css'

const EVENEMENTS: Record<S['connexions'][number]['evenement'], [string, string, Ton]> = {
  pin_ok: ['Ouverture par le code PIN', 'key-round', 'green'],
  biometrie_ok: ['Ouverture par l’empreinte', 'fingerprint', 'green'],
  pin_faux: ['Code PIN faux', 'circle-x', 'amber'],
  blocage: ['Code PIN bloqué', 'lock', 'red'],
  code_envoye: ['Code SMS envoyé', 'send', 'blue'],
  pin_change: ['Code PIN changé', 'key-round', 'acc'],
  verrouillage: ['Application verrouillée', 'lock', 'ink'],
}

/** Sections « Sécurité et appareil » des Réglages ; `deconnexion` ouvre la feuille « Se déconnecter » des Réglages. */
export function SectionSecurite({ deconnexion }: { deconnexion: () => void }) {
  const { t, tf, langue } = usePreferences()
  const o = useOrigine()
  const l = useLecture(() => source.session.securite(), [])
  const feuille = useFeuille('pin')
  const [info, setInfo] = useState<string | null>(null)
  if (l.erreur) return <ErreurLecture relire={l.relire} />
  if (!l.donnees) return <Chargement lignes={3} />
  const d = l.donnees
  const r = d.regles
  const empreinte = async (v: boolean) => {
    const x = await source.session.reglerBiometrie(v, o())
    signal(x.ok ? 'succes' : 'erreur')
    setInfo(v ? 'Empreinte activée : elle ouvre l’application, le code SMS reste demandé quand il le faut.' : 'Empreinte désactivée : votre code PIN ouvre l’application.')
    l.relire()
  }
  const verrouiller = async () => {
    await source.session.deconnecter()
    location.replace(import.meta.env.BASE_URL.replace(/\/$/, '') + chemin('connexion'))
  }
  return (
    <>
      <Sec titre={t('Sécurité et appareil')} id="l10-voir-securite" />
      {info && (
        <Note ton="acc" icone="shield-check" role="status">
          {t(info)}
        </Note>
      )}
      <Carte>
        <div className="row" style={{ gap: 12 }}>
          <LivcIc icone="smartphone" ton="acc" taille={44} />
          <div className="grow">
            <div className="b8 t15">{d.appareil.nom}</div>
            <div className="t13 c3">{tf('Lié à votre compte depuis le {d}', { d: jourLong(d.appareil.lieLe, langue) })}</div>
          </div>
        </div>
        <div className="mt10">
          <Kv k={t('Numéro du compte')} v={<span className="no-tr">{d.numeroMasque}</span>} />
          {d.appareil.derniereSynchronisation && <Kv k={t('Dernière synchronisation')} v={tf('{j} à {h}', { j: jourCourt(d.appareil.derniereSynchronisation, langue), h: heure(d.appareil.derniereSynchronisation, langue) })} />}
        </div>
        <Hint icone="smartphone">{t('Un seul téléphone par compte : vous connecter sur un autre déconnecte celui-ci, et votre entreprise est prévenue.')}</Hint>
      </Carte>
      <div className="card tight">
        <Li icone="key-round" ton="acc" t={t('Changer mon code PIN')} s={d.pinChangeLe ? tf('Changé le {d}', { d: jourLong(d.pinChangeLe, langue) }) : tf('{n} chiffres, jamais partagé', { n: r.pinLongueur })} onClick={feuille.ouvrir} />
        <div className="livc-set">
          <LivcIc icone="fingerprint" ton="ink" taille={40} />
          <div className="grow">
            <div className="st">{t('Ouvrir avec l’empreinte')}</div>
            <div className="ss">{t('Jamais à la place d’un code SMS : après un blocage ou sur un nouveau téléphone, le code reste demandé.')}</div>
          </div>
          <Tg on={d.biometrie} changer={(v) => void empreinte(v)} label={t('Ouvrir avec l’empreinte')} />
        </div>
        <Li icone="lock" ton="ink" t={t('Verrouiller maintenant')} s={t('Votre code PIN à la prochaine ouverture')} onClick={() => void verrouiller()} />
        <Li icone="log-out" ton="ink" t={t('Se déconnecter')} s={t('Code PIN à la prochaine ouverture')} onClick={deconnexion} />
      </div>
      <Sec titre={t('Dernières connexions')} />
      <div className="card tight">
        {d.connexions.map((c, i) => {
          const [titre, icone, ton] = EVENEMENTS[c.evenement]
          return <Li key={c.a + c.evenement + i} icone={icone} ton={ton} t={t(titre)} s={tf('{j} à {h} · {a}', { j: jourCourt(c.a, langue), h: heure(c.a, langue), a: c.appareil })} />
        })}
      </div>
      <Hint icone="shield-alert">{t('Une connexion que vous ne reconnaissez pas ? Changez votre code PIN et prévenez le support.')}</Hint>
      <Note ton="amber" icone="smartphone">
        <b>{t('Téléphone perdu ou volé ?')}</b> {t('Prévenez votre entreprise et le support BelivaY depuis un autre téléphone. Connectez-vous sur un nouveau téléphone avec votre numéro : le code SMS déconnecte l’ancien.')}
      </Note>
      <ChangerPin
        ouverte={feuille.ouverte}
        fermer={feuille.fermer}
        longueur={r.pinLongueur}
        fait={() => {
          setInfo('Code PIN changé. Il vous sera demandé à la prochaine ouverture.')
          l.relire()
        }}
      />
    </>
  )
}

type Etape = 'ancien' | 'nouveau' | 'confirmer'

/** Feuille « Changer mon code PIN » : trois saisies sur le pavé de l'application ; le serveur décide. */
function ChangerPin({ ouverte, fermer, longueur, fait }: { ouverte: boolean; fermer: () => void; longueur: number; fait: () => void }) {
  const { t, tf } = usePreferences()
  const o = useOrigine()
  const [etape, setEtape] = useState<Etape>('ancien')
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [valeur, setValeur] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const remettre = () => (setEtape('ancien'), setAncien(''), setNouveau(''), setValeur(''), setErreur(null))
  const quitter = () => (remettre(), fermer())
  const changer = async (v: string) => {
    setValeur(v)
    setErreur(null)
    if (v.length < longueur) return
    if (etape === 'ancien') return setAncien(v), setValeur(''), setEtape('nouveau')
    if (etape === 'nouveau') return setNouveau(v), setValeur(''), setEtape('confirmer')
    if (v !== nouveau) return setErreur('Les deux saisies ne sont pas identiques. Tapez à nouveau le nouveau code.'), setValeur(''), setNouveau(''), setEtape('nouveau'), signal('erreur')
    setEnvoi(true)
    const r = await source.session.changerPin(ancien, v, o())
    setEnvoi(false)
    if (r.ok) {
      signal('succes')
      remettre()
      fermer()
      return fait()
    }
    signal('erreur')
    setValeur('')
    if (r.raison === 'pin_faux') {
      setAncien('')
      setNouveau('')
      setEtape('ancien')
      return setErreur(tf('Ancien code PIN faux. Encore {n} essais avant le blocage.', { n: (r as { essaisRestants?: number }).essaisRestants ?? 0 }))
    }
    if (r.raison === 'bloque') return setErreur('Trop d’essais : le code PIN est bloqué. Il vous sera demandé avec un code SMS à la prochaine ouverture.')
    setNouveau('')
    setEtape('nouveau')
    setErreur(r.raison === 'meme_pin' ? 'Le nouveau code est le même que l’ancien. Choisissez-en un autre.' : 'Code trop simple (chiffres répétés ou qui se suivent). Choisissez-en un autre.')
  }
  const titres: Record<Etape, string> = { ancien: 'Votre code PIN actuel', nouveau: 'Votre nouveau code PIN', confirmer: 'Confirmez le nouveau code' }
  return (
    <Feuille ouverte={ouverte} fermer={quitter} titre={t('Changer mon code PIN')} classe="livc-sheet">
      <div className="ajl-pin">
        <h2 className="b8 t17">{t('Changer mon code PIN')}</h2>
        <p className="t13 c3 mt4">{tf('Étape {n} sur 3 · {titre}', { n: etape === 'ancien' ? 1 : etape === 'nouveau' ? 2 : 3, titre: t(titres[etape]) })}</p>
        {erreur && (
          <Note ton="red" icone="circle-alert" role="alert">
            {t(erreur)}
          </Note>
        )}
        <div className="mt14">
          <SaisieCode longueur={longueur} valeur={valeur} changer={(v) => void changer(v)} desactive={envoi} libelle={titres[etape]} />
        </div>
        <Hint icone="info">{t('Évitez une date de naissance, des chiffres répétés ou qui se suivent.')}</Hint>
        <div className="btns">
          <Btn kind="ghost" onClick={quitter}>
            {t('Annuler')}
          </Btn>
        </div>
      </div>
    </Feuille>
  )
}

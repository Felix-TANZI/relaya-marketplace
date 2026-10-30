// Aide (VD-11) : repris du prototype (route('aide')), branché sur la source. Règles VD11-R62 à R67, AID-01 à
// AID-03, GEN-08, MSG-03, Q-47, Q-49, DP-42 :
// - support WhatsApp en tête, pour l'aide seulement (jamais une commande, jamais une preuve) : « Écrire au support »
//   ouvre wa.me avec un message prérempli (l'identifiant du vendeur, jamais un code) ; première réponse en 2 h au plus,
//   de 7 h à 21 h, 7 jours sur 7, pour tous les paliers (Q-47) ; la conversation « Support BelivaY » de la
//   Messagerie garde la trace écrite (Q-49) ;
// - dix questions dans l'ordre des demandes, repliées (la première ouverte), trois phrases au plus, chacune avec le
//   lien vers l'écran où agir ; montants calculés (src/calculs) ; liste des produits interdits ;
// - alerte : BelivaY ne demande jamais le code secret Mobile Money ; « Mon contrat » ; conseil de la semaine ;
// - coordonnées et réseaux officiels BelivaY (+237 689 002 812, contact@belivay.com, Facebook, Instagram, TikTok).
// Ajouts : recherche dans les questions, écrire au support dans l'application, signaler un message suspect.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogoReseau } from '@client/composants/Reseaux'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { QuestionAide } from '../../donnees/domaines/aide'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'
import { BandeauHorsLigne, FIL_SUPPORT, Bouton, CHAMP, Chargement, ErreurLecture, dateCourte, useEcrire } from './communs'

export default function Aide() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const ecrire = useEcrire()
  const [q, setQ] = useState('')
  const questions = useLecture(() => source.aide.questions(q), [q, s.membre?.role])
  const interdits = useLecture(() => source.aide.produitsInterdits(), [])
  const contacts = useLecture(() => source.aide.contacts(), [])
  const conseil = useLecture(() => source.aide.conseil(), [])
  const profil = useLecture(() => source.compte.profil(), [s.membre?.role])
  const c = contacts.donnees
  const identifiant = profil.donnees?.identifiant ?? ''
  // Message prérempli : l'identifiant, jamais un code ni une donnée de commande (VD11-R62).
  const wa = c ? `${c.whatsapp}?text=${encodeURIComponent(tf('Bonjour, je suis le vendeur {id} ({boutique}). J’ai une question :', { id: identifiant, boutique: s.boutique?.nom ?? '' }))}` : undefined

  const question = (x: QuestionAide, i: number) => (
    <details key={x.id} className="more flat" style={{ marginTop: '0', borderTop: i === 0 ? '0' : undefined }} open={i === 0 && !q}>
      <summary>
        <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t(x.question)}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">
        <p>{ecrire(x.reponse, 0)}</p>
        {x.id === 'q10' &&
          interdits.donnees?.map((p) => (
            <div key={p} className="row" style={{ gap: '10px', padding: '5px 0' }}>
              <Icone nom="ban" taille={16} style={{ color: 'var(--red)', flexShrink: '0' }} />
              <span className="t13 c2">{t(p)}</span>
            </div>
          ))}
        {x.ecran && x.lien && (
          <Link to={chemin(x.ecran)} className="row t13 b8 cor" style={{ gap: '4px', minHeight: '44px' }}>
            {t(x.lien)}
            <Icone nom="chevron-right" taille={16} />
          </Link>
        )}
      </div>
    </details>
  )

  return (
    <Ecran route="aide">
      <div className="pg">
        <h1 className="pg-t">{t('Aide')}</h1>
        <p className="pg-s">{t('Une réponse tout de suite, ou une personne sur WhatsApp.')}</p>
      </div>
      <div className="hero green">
        <div className="otop">
          <span className="hk" style={{ color: '#9BF0C4' }}>
            {t('Support vendeur · WhatsApp')}
          </span>
          <Icone nom="message-circle" taille={20} style={{ color: '#9BF0C4' }} />
        </div>
        <div className="b8 mt8" style={{ fontSize: '20px', lineHeight: '1.25' }}>
          {t('Une personne vous répond')}
        </div>
        <div className="hs">{c ? tf('Tous les jours de {de} à {a}. Première réponse en {n} h au plus, pour tous les paliers.', { de: heure(c.horaires[0], langue).replace(/^0/, ''), a: heure(c.horaires[1], langue), n: c.delaiReponseH }) : ''}</div>
        <div className="mt12">
          <a className="btn white" href={wa} target="_blank" rel="noopener noreferrer">
            <Icone nom="message-circle" taille={18} />
            <span>{t('Écrire au support')}</span>
          </a>
        </div>
        <div className="t12 mt10" style={{ color: 'rgba(255,255,255,.8)' }}>
          {t('Pour l’aide seulement : commandes et preuves restent dans l’application.')}
        </div>
      </div>
      <div className="card tight">
        <Link to={chemin('messages', { fil: FIL_SUPPORT })} className="li">
          <span className="ic green">
            <Icone nom="headset" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Écrire dans l’application')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Conversation « Support BelivaY » : une commande, une preuve, une demande suivie')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
      <BandeauHorsLigne texte="Hors connexion : les réponses ci-dessous restent lisibles ; le support vous répondra au retour du réseau." />
      <div className="card">
        <h3>{t('Questions fréquentes')}</h3>
        <div className="inp" style={{ marginTop: '10px' }}>
          <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Chercher : versement, litige…')} aria-label={t('Chercher dans les questions')} style={CHAMP} />
        </div>
        <div className="mt4">
          {questions.erreur && <ErreurLecture erreur={questions.erreur} relire={questions.relire} />}
          {!questions.donnees && !questions.erreur && <Chargement />}
          {questions.donnees?.length === 0 && (
            <p className="t14 c2" style={{ margin: '12px 0' }}>
              {t('Aucune réponse avec ce mot : écrivez au support, une personne vous répond.')}
            </p>
          )}
          {questions.donnees?.map(question)}
        </div>
      </div>
      <div className="note red">
        <Icone nom="shield-alert" taille={18} />
        <div>
          <b>{t('BelivaY ne vous demande jamais votre code secret Mobile Money.')}</b>
          {t(' Un message qui le demande est une fraude : ne répondez pas et signalez-le.')}
          <div className="mt8">
            <Bouton classe="secondary sm" icone="siren" vers={chemin('messages', { fil: FIL_SUPPORT })}>
              {t('Signaler un message suspect')}
            </Bouton>
          </div>
        </div>
      </div>
      <div className="card tight">
        {montants && (
          <Link to={chemin('documents')} className="li">
            <span className="ic ">
              <Icone nom="file-text" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Mon contrat')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Et la grille « part que vous gardez »')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        )}
        <Link to={chemin('parametres')} className="li">
          <span className="ic ">
            <Icone nom="book-open" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Un conseil court chaque semaine')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {conseil.donnees ? tf('Cette semaine : {titre}', { titre: t(conseil.donnees.titre) }) : t('Photos, prix, délais : 2 minutes de lecture, en notification')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
      {conseil.donnees && (
        <div className="card">
          <div className="kick">{tf('Conseil du {d}', { d: dateCourte(conseil.donnees.publieLe, langue) })}</div>
          <div className="b8 t15 mt4">{t(conseil.donnees.titre)}</div>
          <p className="t14 c2" style={{ margin: '6px 0 0', lineHeight: '1.5' }}>
            {t(conseil.donnees.texte)}
          </p>
        </div>
      )}
      {c && (
        <div className="card">
          <h3>{t('Nous contacter')}</h3>
          <div className="mt6">
            <a href={c.telephoneLien} className="li" aria-label={tf('Appeler BelivaY au {tel}', { tel: c.telephone })}>
              <span className="ic">
                <Icone nom="phone" taille={19} />
              </span>
              <span className="grow lt nw">{c.telephone}</span>
            </a>
            <a href={'mailto:' + c.email} className="li">
              <span className="ic">
                <Icone nom="mail" taille={19} />
              </span>
              <span className="grow lt">{c.email}</span>
            </a>
          </div>
          <div className="row mt10" style={{ gap: '10px' }} aria-label={t('Nous suivre')}>
            {c.reseaux.map((r) => (
              <a key={r.nom} href={r.url} target="_blank" rel="noopener noreferrer" aria-label={tf('BelivaY sur {r} (nouvel onglet)', { r: r.libelle })} title={r.libelle} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--sand-3)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogoReseau nom={r.nom} taille={20} />
              </a>
            ))}
          </div>
          <p className="t12 c3" style={{ margin: '10px 0 0' }}>
            {t('Pour l’aide seulement : une commande, un litige ou une preuve passent par l’application.')}
          </p>
        </div>
      )}
    </Ecran>
  )
}

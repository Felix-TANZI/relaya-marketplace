// Écran « Changer de numéro » (CL-03, CIN-39 à CIN-43), balisage du prototype du 1er octobre, repris à la main
// et rendu logique (DP-53) :
// 1. un code part au numéro actuel à l'ouverture ; le bon code ouvre l'étape 2 ;
// 2. le nouveau numéro : vrai champ, opérateur lu au préfixe (CCO-14), refusé s'il n'est ni MTN ni Orange, si
//    c'est déjà le numéro du compte, ou s'il est vérifié sur un autre compte (CIN-35, décidé par le serveur) ;
// 3. un code part au nouveau numéro ; sans les deux codes, rien ne change ;
// 4. ce qui a changé, lu dans les données : nouveau numéro, codes de retrait renouvelés (CIN-40), ancien numéro
//    gardé comme moyen de paiement (CIN-43).
// Le parcours tient dans la session de l'onglet ; une étape ouverte sans les précédentes ramène au début.
// Ce qu'il faut au client (DP-54) : le numéro actuel rappelé à l'étape 2, « Modifier » le nouveau numéro à
// l'étape 3, ce qui reste sur le compte, et « Garder mon numéro » qui abandonne le parcours à tout moment.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { CasesCode, CodeDemo, MessageCode, useEnvoiCode, useSaisieCode } from '../../composants/SaisieCode'
import { Bouton } from '../../composants/socle'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { erreurNumero, espacer, nomMoMo, operateur, chiffres } from '../../donnees/numeros'
import { source, type ChangementNumero, type EnvoiCode } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useMajClient, useSession } from '../../session'

type Parcours = { ancienValide: boolean; numero: string; envoiAncien: EnvoiCode | null; envoiNouveau: EnvoiCode | null }
const CLE = 'blv_numero_changer'
const VIDE: Parcours = { ancienValide: false, numero: '', envoiAncien: null, envoiNouveau: null }
const lire = (): Parcours => {
  try {
    return { ...VIDE, ...JSON.parse(sessionStorage.getItem(CLE) || '{}') }
  } catch {
    return VIDE
  }
}
const garder = (p: Parcours | null) => {
  try {
    if (p) sessionStorage.setItem(CLE, JSON.stringify(p))
    else sessionStorage.removeItem(CLE)
  } catch {
    // Stockage refusé : le parcours vit le temps de l'écran.
  }
}

function Etapes({ n }: { n: 1 | 2 | 3 }) {
  return (
    <div className="cl03-stepbar">
      <div className="steps">
        {[1, 2, 3].map((i) => (
          <i key={i} className={i < n ? 'on' : i === n ? 'cur' : ''}></i>
        ))}
      </div>
    </div>
  )
}

// Étape 1 et étape 3 : un code, dans le balisage du prototype.
function EtapeCode(p: {
  n: 1 | 3
  envoi: EnvoiCode
  modifier?: ReactNode
  valider: (code: string) => ReturnType<typeof source.verifierCodeNumeroAncien>
  renvoyer: () => Promise<EnvoiCode>
  reussi: Parameters<typeof useSaisieCode>[0]['reussi']
}) {
  const { t } = usePreferences()
  const s = useSaisieCode(p)
  return (
    <>
      <Etapes n={p.n} />
      <div className="cl03-k or" style={{ marginTop: '16px' }}>
        {t(p.n === 1 ? 'Ton numéro actuel' : 'Le code du nouveau numéro')}
      </div>
      <h1 className="pg-t">{t(p.n === 1 ? 'Confirme avec ton numéro actuel' : 'Entre le code du nouveau numéro')}</h1>
      <p className="pg-s">
        {t('Code envoyé au ') + s.envoi.destination + '. '}
        {p.modifier}
      </p>
      <CasesCode s={s} />
      <MessageCode s={s} />
      {p.n === 1 && (
        <div className="note or">
          <Icone nom="qr-code" taille={18} />
          <div>
            <b>{t('Ce qui va changer :')}</b>
            {t(' tes codes de retrait en cours seront renouvelés. L’ancien code ne marchera plus au relais.')}
          </div>
        </div>
      )}
      {p.n === 1 && (
        <div className="hint-l">
          <Icone nom="file-clock" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('Tes commandes, ton portefeuille et ton historique restent sur ton compte. L’ancien numéro reste un moyen de paiement, que tu pourras retirer.')}</span>
        </div>
      )}
      <div className="mt16">
        <Bouton icone="check" inactif={!s.pret} onClick={s.valider}>
          {t(p.n === 1 ? 'Valider' : 'Valider mon nouveau numéro')}
        </Bouton>
      </div>
      {p.n === 1 ? (
        <p className="cl03-legal">
          {t('Tu n’as plus ce numéro ? ')}
          <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="cl03-link">
            {t('Écrire au support')}
          </Link>
        </p>
      ) : (
        <div className="hint-l">
          <Icone nom="shield-check" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('Sans les deux codes, rien ne change : ton numéro reste le même.')}</span>
        </div>
      )}
      <CodeDemo s={s} />
    </>
  )
}

export function NumeroChanger() {
  const { t } = usePreferences()
  const client = useSession().client
  const majClient = useMajClient()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const etape = params.get('etape') ?? '1'
  const [parcours, setParcours] = useState<Parcours>(lire)
  const maj = (p: Parcours) => (setParcours(p), garder(p))
  const [saisi, setSaisi] = useState(() => espacer(lire().numero))
  const [erreur, setErreur] = useState<string | null>(null)
  const envoyerCode = useEnvoiCode() // un envoi par geste (et un seul à l'ouverture, même rendu deux fois)
  const [fait, setFait] = useState<ChangementNumero | null>(null)
  const aller = (n: string) => naviguer(chemin('numero-changer', n === '1' ? undefined : { etape: n }), { replace: n === '4' })

  useEffect(() => {
    // Étape 1 : le code part au numéro actuel à l'ouverture (une fois par parcours).
    if (etape === '1' && !parcours.envoiAncien) envoyerCode('ancien', () => source.envoyerCode('numero-ancien')).then((e) => e && maj({ ...VIDE, envoiAncien: e }))
    // Une étape sans les précédentes ramène au début ; l'étape 4 lit ce qui a changé.
    if (etape === '2' && !parcours.ancienValide) aller('1')
    if (etape === '3' && !parcours.envoiNouveau) aller(parcours.ancienValide ? '2' : '1')
    if (etape === '4')
      source.changementNumero().then((c) => {
        if (c) setFait(c)
        else aller('1')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape])

  // Garder mon numéro : le parcours s'arrête, rien n'a changé.
  const abandonner = () => {
    garder(null)
    naviguer(chemin('securite'), { replace: true })
  }
  const garderNumero = (
    <div className="cl03-center">
      <a href={chemin('securite')} className="cl03-link" onClick={(e) => (e.preventDefault(), abandonner())}>
        {t('Garder mon numéro actuel')}
      </a>
    </div>
  )
  const op = operateur(saisi)
  const recevoir = async () => {
    const local = erreurNumero(saisi)
    if (local) return setErreur(local)
    const n = chiffres(saisi)
    const v = await source.verifierNouveauNumero(n)
    if (!v.ok)
      return setErreur(
        v.raison === 'meme'
          ? 'C’est déjà le numéro de ton compte.'
          : 'Ce numéro est déjà vérifié sur un autre compte. Connecte-toi à ce compte, ou écris au support.',
      )
    const e = await envoyerCode(n, () => source.envoyerCode('numero-nouveau', n))
    if (!e) return
    maj({ ...parcours, numero: n, envoiNouveau: e })
    aller('3')
  }

  return (
    <Ecran route="numero-changer" parEtat gabarit="compte">
      <Styles id="f16ded0d4c" />
      {etape === '1' && parcours.envoiAncien && (
        <EtapeCode
          key="ancien"
          n={1}
          envoi={parcours.envoiAncien}
          valider={(code) => source.verifierCodeNumeroAncien(code)}
          renvoyer={async () => {
            const e = await source.envoyerCode('numero-ancien')
            maj({ ...parcours, envoiAncien: e })
            return e
          }}
          reussi={() => {
            maj({ ...parcours, ancienValide: true })
            aller('2')
          }}
        />
      )}
      {etape === '1' && parcours.envoiAncien && garderNumero}

      {etape === '2' && parcours.ancienValide && (
        <>
          <Etapes n={2} />
          <div className="cl03-k or" style={{ marginTop: '16px' }}>
            {t('Ton nouveau numéro')}
          </div>
          <h1 className="pg-t">{t('Ton nouveau numéro')}</h1>
          <p className="pg-s">{t('On t’envoie un code pour vérifier qu’il est bien à toi.')}</p>
          <div className="fld">
            <label htmlFor="nc-numero">{t('Nouveau numéro')}</label>
            <div className={'inp' + (erreur ? ' err' : '')}>
              <span className="cl03-cc">
                <Dessin id="81b1dee44510" />
                {t('+237')}
              </span>
              <input
                id="nc-numero"
                autoFocus
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="6 ·· ·· ·· ··"
                value={saisi}
                onChange={(e) => (setSaisi(espacer(e.target.value)), setErreur(null))}
                onKeyDown={(e) => e.key === 'Enter' && recevoir()}
              />
              {(op === 'MTN' || op === 'Orange') && (
                <span className="suf">
                  <span className="cl03-op">
                    <Icone nom="circle-check" taille={14} trait={2.2} />
                    {t(nomMoMo(op))}
                  </span>
                </span>
              )}
            </div>
            {erreur && (
              <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                {t(erreur)}
              </div>
            )}
          </div>
          <div className="mt16">
            <Bouton icone="send" inactif={chiffres(saisi).length !== 9} onClick={recevoir}>
              {t('Recevoir le code')}
            </Bouton>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{t('Ce numéro ne doit pas être vérifié sur un autre compte.')}</span>
          </div>
          {client && (
            <div className="hint-l">
              <Icone nom="smartphone" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{t('Numéro actuel : ') + client.numeroMasque + ' · ' + client.operateur + '.'}</span>
            </div>
          )}
          {garderNumero}
        </>
      )}

      {etape === '3' && parcours.envoiNouveau && (
        <EtapeCode
          key="nouveau"
          n={3}
          envoi={parcours.envoiNouveau}
          modifier={
            <Link to={chemin('numero-changer', { etape: '2' })} className="cl03-link">
              {t('Modifier')}
            </Link>
          }
          valider={(code) => source.confirmerNumero(parcours.numero, code)}
          renvoyer={async () => {
            const e = await source.envoyerCode('numero-nouveau', parcours.numero)
            maj({ ...parcours, envoiNouveau: e })
            return e
          }}
          reussi={(r) => {
            garder(null)
            majClient(r.client)
            aller('4')
          }}
        />
      )}
      {etape === '3' && parcours.envoiNouveau && garderNumero}

      {etape === '4' && fait && (
        <>
          <div className="card green cl03-done">
            <div className="cl03-bigic green">
              <Icone nom="check" taille={30} trait={2.6} />
            </div>
            <b>{t('Numéro changé')}</b>
            <span>
              <b>{fait.nouveau}</b>
              {t(' · ' + nomMoMo(fait.operateur) + ' · vérifié')}
            </span>
          </div>
          <div className="sec">
            <h2>{t('Ce qui a changé')}</h2>
          </div>
          <div className="card ">
            {fait.renouvelees.map((ref) => (
              <div key={ref} className="cl03-ch">
                <Icone nom="qr-code" taille={18} />
                <span>
                  <b>{ref}</b>
                  {t(' : nouveau code de retrait. L’ancien ne marche plus au ') + fait.relais + '.'}
                </span>
              </div>
            ))}
            <div className="cl03-ch">
              <Icone nom="message-square" taille={18} />
              <span>{t('Tes messages et tes codes de retrait arrivent maintenant au ') + fait.nouveau + '.'}</span>
            </div>
            <div className="cl03-ch">
              <Icone nom="file-clock" taille={18} />
              <span>{t('Tes commandes et ton historique restent sur ton compte.')}</span>
            </div>
            <Link to={chemin('moyens-paiement')} className="cl03-ch" style={{ alignItems: 'center' }}>
              <Icone nom="wallet" taille={18} />
              <span className="grow">
                {t('Le ') + fait.ancien + t(' reste un moyen de paiement ') + nomMoMo(fait.ancienOperateur) + t('. Tu peux le retirer.')}
              </span>
              <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)' }} />
            </Link>
          </div>
          {fait.renouvelees[0] && (
            <div className="mt16">
              <Bouton vers={chemin('code', { ref: fait.renouvelees[0], st: 'nouveau' })} icone="qr-code">
                {t('Voir mon nouveau code')}
              </Bouton>
            </div>
          )}
          <div className="cl03-center">
            <Link to={chemin('compte')} className="cl03-link">
              {t('Revenir à mon compte')}
            </Link>
          </div>
        </>
      )}
    </Ecran>
  )
}

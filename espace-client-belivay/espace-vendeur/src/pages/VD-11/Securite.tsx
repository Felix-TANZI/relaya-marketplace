// Sécurité, appareils et données (VD-11) : repris du prototype (route('securite'), feuille securite?cloture=1),
// branché sur la source.
// - Appareils regroupés : type et navigateur, « Cet appareil », ville et dernière activité, première connexion,
//   nombre d'ouvertures ; jamais l'adresse IP (SEC-01, VD11-R38) ; « Déconnecter » révoque sans annuler de commande
//   (SEC-02, VD11-R32) ; l'appareil en cours n'a pas ce bouton.
// - Mot de passe : 8 caractères dont un chiffre (CNX-02), changé avec un code SMS (VD11-R34 : « Toujours ») ;
//   « Mot de passe oublié » mène à la connexion (VD11-R33). Second facteur : SMS au téléphone personnel, jamais par
//   e-mail (SEC-04, NUM-07). Face ID déverrouille seulement l'application sur un appareil connu, ne remplace jamais un
//   code SMS (S-1).
// - Statut du compte et grille « part que vous gardez » calculée par le service de commission (src/calculs), au
//   palier du jour, hors découverte et planchers (SEC-05, VD11-R35) ; propriétaire seulement.
// - Mes données (loi n° 2024/017) : export avec un code SMS, aussi dans Documents (Q-23) ; preuves 180 jours (Q-25).
// - Clôture : feuille qui dit ce qui se passe, ce qui reste à solder avec un lien vers chaque écran, code SMS,
//   30 jours de préavis, annulable (SEC-03, SEC-06, VD11-R37) ; propriétaire seulement.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Ecran, nomPalier } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { PARAMETRES } from '../../calculs/registre'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useSession } from '../../session'
import { BandeauHorsLigne, Bouton, CHAMP, CodeSms, Feuille, Interrupteur, dateCourte, ilYa, useAnnonce, useFeuilleAdresse } from './communs'

const DETAIL: [string, string][] = [
  ['Connexion depuis un appareil inconnu', 'Oui'],
  ['Changement du numéro de versement', 'Toujours'],
  ['Ajout d’un accès employé', 'Toujours'],
  ['Changement de mot de passe', 'Toujours'],
  ['Export des données, clôture du compte', 'Toujours'],
  ['Ouverture ordinaire', 'Jamais'],
]
const pourcent = (n: number, langue: 'fr' | 'en') => (langue === 'en' ? String(n) : String(n).replace('.', ','))

export default function Securite() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge()
  const montants = useMontantsVisibles()
  const prep = s.membre?.role === 'preparation'
  const appareils = useLecture(() => source.compte.appareils(), [])
  const sec = useLecture(() => source.compte.securite(), [s.membre?.role])
  const statut = useLecture(() => (montants ? source.compte.statut() : Promise.resolve(null)), [montants])
  const profil = useLecture(() => source.compte.profil(), [s.membre?.role])
  const [annonce, dire] = useAnnonce()
  const mdp = useFeuilleAdresse('mdp')
  const exp = useFeuilleAdresse('export')
  const clo = useFeuilleAdresse('cloture')
  const [champs, setChamps] = useState({ ancien: '', nouveau: '', confirmer: '' })
  const [voir, setVoir] = useState(false)
  const [etapeMdp, setEtapeMdp] = useState<'saisie' | 'code'>('saisie')
  const [erreurMdp, setErreurMdp] = useState<string | null>(null)
  const [etapeClo, setEtapeClo] = useState<'info' | 'code'>('info')
  const [codeEnvoye, setCodeEnvoye] = useState('')
  const sd = sec.donnees
  const masque = sd?.telephoneMasque ?? ''

  const envoyerCode = async (motif: 'mot_de_passe' | 'export' | 'cloture') => {
    const r = await source.compte.demanderCode(motif)
    setCodeEnvoye(r.ok ? r.masque : masque)
  }
  const nouveauOk = champs.nouveau.length >= 8 && /\d/.test(champs.nouveau)
  const suiteMdp = async () => {
    if (champs.ancien.length < 6) return setErreurMdp(t('Écrivez votre mot de passe actuel.'))
    if (!nouveauOk) return setErreurMdp(t('8 caractères au minimum, dont un chiffre.'))
    if (champs.nouveau !== champs.confirmer) return setErreurMdp(t('Les deux nouveaux mots de passe ne sont pas pareils.'))
    if (champs.nouveau === champs.ancien) return setErreurMdp(t('Choisissez un mot de passe différent de l’actuel.'))
    await envoyerCode('mot_de_passe')
    setEtapeMdp('code')
  }
  const fermerMdp = () => {
    setChamps({ ancien: '', nouveau: '', confirmer: '' })
    setEtapeMdp('saisie')
    setErreurMdp(null)
    mdp.fermer()
  }

  const liste = appareils.donnees ?? []
  const st = statut.donnees
  const decouvertePct = Math.round((1 - Number(PARAMETRES.commission.decouverteMult.texte())) * 100)
  const aSolder = sd?.aSolder ?? []
  const ROUTES_SOLDE = { commandes: 'Commandes en cours', litiges: 'Litiges ouverts', versements: 'Argent pas encore versé' } as const
  return (
    <Ecran
      route="securite"
      fixes={
        <>
          {annonce}
          <Feuille ouverte={mdp.ouverte} fermer={fermerMdp} titre="Changer mon mot de passe">
            <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{t('Changer mon mot de passe')}</h3>
            {etapeMdp === 'saisie' ? (
              <>
                {(
                  [
                    ['ancien', 'Mot de passe actuel', 'current-password'],
                    ['nouveau', 'Nouveau mot de passe', 'new-password'],
                    ['confirmer', 'Confirmer le nouveau', 'new-password'],
                  ] as const
                ).map(([k, l, ac]) => (
                  <div key={k} className="fld">
                    <label htmlFor={'mdp-' + k}>{t(l)}</label>
                    <div className="inp">
                      <Icone nom="key-round" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
                      <input id={'mdp-' + k} type={voir ? 'text' : 'password'} autoComplete={ac} value={champs[k]} onChange={(e) => (setChamps((x) => ({ ...x, [k]: e.target.value })), setErreurMdp(null))} style={CHAMP} />
                    </div>
                  </div>
                ))}
                <div className="row mt8" style={{ gap: '10px' }}>
                  <span className="grow t13 c2">{t('Afficher les mots de passe')}</span>
                  <Interrupteur actif={voir} changer={setVoir} libelle="Afficher les mots de passe" />
                </div>
                <div className="hint-l" style={{ color: nouveauOk ? 'var(--green)' : undefined }}>
                  <Icone nom={nouveauOk ? 'circle-check' : 'info'} taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                  <span>{t('Mot de passe : 8 caractères au minimum, dont un chiffre.')}</span>
                </div>
                {erreurMdp && (
                  <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                    {erreurMdp}
                  </div>
                )}
                <div className="mt14">
                  <Bouton icone="arrow-right" onClick={() => void suiteMdp()}>
                    {t('Recevoir le code')}
                  </Bouton>
                </div>
                <div className="mt8">
                  <Bouton classe="ghost" onClick={fermerMdp}>
                    {t('Annuler')}
                  </Bouton>
                </div>
                <div className="mt8 center">
                  <Link to={chemin('connexion', { s: 'oubli' })} className="t13 b7 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 8px' }}>
                    {t('Mot de passe actuel oublié ?')}
                  </Link>
                </div>
              </>
            ) : (
              <CodeSms
                masque={codeEnvoye}
                bouton="Changer le mot de passe"
                icone="key-round"
                annuler={fermerMdp}
                renvoyer={() => envoyerCode('mot_de_passe')}
                valider={async (code) => {
                  const r = await source.compte.changerMotDePasse(champs.ancien, champs.nouveau, code)
                  if (!r.ok) {
                    if (r.raison === 'code') return t('Ce code ne correspond pas.')
                    setEtapeMdp('saisie')
                    setErreurMdp(t(r.raison === 'ancien' ? 'Mot de passe actuel incorrect.' : r.raison === 'identique' ? 'Choisissez un mot de passe différent de l’actuel.' : '8 caractères au minimum, dont un chiffre.'))
                    return null
                  }
                  fermerMdp()
                  dire(t('Mot de passe changé. Vos autres appareils devront se reconnecter.'))
                  return null
                }}
              />
            )}
          </Feuille>
          <Feuille ouverte={exp.ouverte} fermer={exp.fermer} titre="Exporter mes données">
            <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{t('Exporter mes données')}</h3>
            <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
              {profil.donnees?.email ? tf('Le fichier part par e-mail à {e} sous 48 h, et reste dans Documents.', { e: profil.donnees.email }) : t('Le fichier est rangé dans Documents sous 48 h (ajoutez un e-mail pour le recevoir aussi).')}
            </p>
            <CodeSms
              masque={codeEnvoye || masque}
              bouton="Demander l’export"
              icone="download"
              annuler={exp.fermer}
              renvoyer={() => envoyerCode('export')}
              valider={async (code) => {
                const r = await source.compte.exporterDonnees(code)
                if (!r.ok) return t(r.raison === 'code' ? 'Ce code ne correspond pas.' : 'Un export est déjà en cours.')
                exp.fermer()
                dire(t('Export demandé : vous le recevrez sous 48 h.'))
                return null
              }}
            />
          </Feuille>
          <Feuille
            ouverte={clo.ouverte && !prep}
            fermer={() => {
              setEtapeClo('info')
              clo.fermer()
            }}
            titre="Clôturer mon compte ?"
          >
            <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{t('Clôturer mon compte ?')}</h3>
            {etapeClo === 'info' ? (
              <>
                <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
                  {t('Voici ce qui se passe, dans l’ordre.')}
                </p>
                {['Vos commandes, litiges et versements en cours se terminent d’abord.', 'La clôture a lieu 30 jours après votre demande : vous pouvez changer d’avis d’ici là.', 'Vos données sont gardées le temps prévu par la loi, puis effacées.'].map((x, i) => (
                  <div key={x} className="row" style={{ gap: '10px', padding: '8px 0', alignItems: 'flex-start' }}>
                    <span className="b8 t13" style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--sand-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <span className="t14" style={{ lineHeight: '1.45' }}>
                      {t(x)}
                    </span>
                  </div>
                ))}
                {aSolder.length > 0 && (
                  <div className="card flat" style={{ marginTop: '10px', background: 'var(--amber-soft)', border: '1px solid var(--amber-line)' }}>
                    <div className="b8 t14" style={{ color: 'var(--amber)' }}>
                      {t('Encore à solder avant la clôture')}
                    </div>
                    {aSolder.map((x) => (
                      <Link key={x.type} to={chemin(x.route)} className="li" style={{ minHeight: '44px', padding: '6px 0' }}>
                        <span className="grow t14">{tf('{quoi} : {n}', { quoi: t(ROUTES_SOLDE[x.type]), n: x.nombre })}</span>
                        <span className="chev">
                          <Icone nom="chevron-right" taille={17} />
                        </span>
                      </Link>
                    ))}
                    <div className="t12 c2 mt4">{t('Votre demande est enregistrée ; la clôture attend qu’ils soient soldés.')}</div>
                  </div>
                )}
                <div className="mt14">
                  <Bouton classe="danger" icone="ban" onClick={() => void envoyerCode('cloture').then(() => setEtapeClo('code'))}>
                    {t('Demander la clôture')}
                  </Bouton>
                </div>
                <div className="mt8">
                  <Bouton classe="ghost" onClick={clo.fermer}>
                    {t('Annuler')}
                  </Bouton>
                </div>
              </>
            ) : (
              <CodeSms
                masque={codeEnvoye || masque}
                bouton="Confirmer la demande de clôture"
                icone="ban"
                annuler={() => setEtapeClo('info')}
                renvoyer={() => envoyerCode('cloture')}
                valider={async (code) => {
                  const r = await source.compte.cloturer(code)
                  if (!r.ok) return t(r.raison === 'code' ? 'Ce code ne correspond pas.' : 'Une clôture est déjà demandée.')
                  setEtapeClo('info')
                  clo.fermer()
                  dire(tf('Clôture prévue le {d}. Vous pouvez annuler d’ici là.', { d: jourLong(r.le, langue) }))
                  return null
                }}
              />
            )}
          </Feuille>
        </>
      }
    >
      <div className="pg">
        <h1 className="pg-t">{t('Sécurité, appareils et données')}</h1>
        <p className="pg-s">{t('Qui utilise votre compte, et comment il est protégé.')}</p>
      </div>
      <BandeauHorsLigne />
      <div className="card">
        <div className="row">
          <h3 className="grow" style={{ margin: 0 }}>
            {t('Appareils connectés')}
          </h3>
          <span className="pill ink sm">{liste.length}</span>
        </div>
        <div className="mt6">
          {liste.map((a) => (
            <div key={a.id} className="li" style={{ alignItems: 'flex-start', padding: '12px 0' }}>
              <span className="ic">
                <Icone nom={a.type === 'ordinateur' ? 'laptop' : 'smartphone'} taille={20} />
              </span>
              <span className="grow">
                <span className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
                  <span className="lt">{a.nom}</span>
                  {a.actuel && <span className="pill green sm">{t('Cet appareil')}</span>}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {a.actuel ? tf('{lieu} · actif maintenant', { lieu: a.lieu }) : `${a.lieu} · ${ilYa(a.vuA, maintenant, langue)}`}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {tf(a.ouvertures > 1 ? 'Depuis le {d} · {n} ouvertures' : 'Depuis le {d} · {n} ouverture', { d: dateCourte(a.premiere, langue), n: a.ouvertures })}
                </span>
              </span>
              {a.actuel && (
                <Bouton classe="secondary sm" style={{ height: '44px' }} etiquette={t('Ne plus reconnaître cet appareil')} onClick={() => void source.session.oublierAppareil().then(() => (jouer('interrupteur'), dire(t('Cet appareil n’est plus reconnu : la prochaine connexion demandera le code SMS.'))))}>
                  {t('Oublier')}
                </Bouton>
              )}
              {!a.actuel && (
                <Bouton classe="danger sm" style={{ height: '44px' }} etiquette={tf('Déconnecter {appareil}', { appareil: a.nom })} onClick={() => void source.compte.deconnecterAppareil(a.id).then(() => (jouer('interrupteur'), dire(tf('{appareil} déconnecté. Aucune commande n’est annulée.', { appareil: a.nom }))))}>
                  {t('Déconnecter')}
                </Bouton>
              )}
            </div>
          ))}
        </div>
        {liste.filter((a) => !a.actuel).length > 1 && (
          <div className="mt8">
            <Bouton classe="secondary sm" icone="log-out" onClick={() => void source.compte.deconnecterAutres().then(() => dire(t('Tous les autres appareils sont déconnectés.')))}>
              {t('Déconnecter tous les autres')}
            </Bouton>
          </div>
        )}
        <div className="note amber" style={{ marginTop: '12px' }}>
          <Icone nom="shield-alert" taille={18} />
          <div>{t('Un appareil inconnu ? Déconnectez-le, changez votre mot de passe et vérifiez votre numéro de versement. Cela n’annule aucune commande.')}</div>
        </div>
      </div>

      <div className="card">
        <h3>{t('Mot de passe et second facteur')}</h3>
        <p className="t13 c2" style={{ margin: '6px 0 0' }}>
          {t('Mot de passe : 8 caractères au minimum, dont un chiffre.')}
        </p>
        <div className="mt10">
          <Bouton classe="secondary" icone="key-round" onClick={mdp.ouvrir}>
            {t('Changer mon mot de passe')}
          </Bouton>
        </div>
        <Link to={chemin('connexion', { s: 'oubli' })} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
          {t('Mot de passe oublié ?')}
        </Link>
        <div className="row" style={{ gap: '10px', marginTop: '6px', alignItems: 'flex-start' }}>
          <Icone nom="shield-check" taille={20} style={{ color: 'var(--green)', flexShrink: '0' }} />
          <div className="grow">
            <div className="b8 t14">{t('Second facteur : un code par SMS')}</div>
            <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
              {tf('Envoyé au {tel}, votre téléphone personnel. Demandé pour un nouvel appareil, un nouveau numéro de versement ou un accès d’équipe. Jamais par e-mail.', { tel: masque })}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: '10px', marginTop: '12px', alignItems: 'flex-start' }}>
          <Icone nom="scan-face" taille={20} style={{ color: 'var(--ink-2)', flexShrink: '0' }} />
          <div className="grow">
            <div className="b8 t14">{t(sd?.faceId ? 'Face ID ou empreinte : activé' : 'Face ID ou empreinte : désactivé')}</div>
            <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
              {t('Déverrouille l’application sur ce téléphone seulement. Ne remplace jamais un code SMS. Reste dans votre téléphone.')}
            </div>
          </div>
          {sd && <Interrupteur actif={sd.faceId} changer={(v) => void source.compte.reglerFaceId(v).then(() => dire(t(v ? 'Face ID activé sur ce téléphone.' : 'Face ID désactivé : le mot de passe suffit.')))} libelle="Face ID ou empreinte" />}
        </div>
        <details className="more">
          <summary>
            <Icone nom="list" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Voir le détail')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <div className="kv">
              <span className="k b8">{t('Situation')}</span>
              <span className="v ">{t('Code SMS')}</span>
            </div>
            {DETAIL.map(([a, b]) => (
              <div key={a} className="kv">
                <span className="k">{t(a)}</span>
                <span className="v ">{t(b)}</span>
              </div>
            ))}
          </div>
        </details>
      </div>

      {montants && st && (
        <div className="card">
          <h3>{t('Statut du compte')}</h3>
          <div className="mt8">
            <div className="kv">
              <span className="k">{t('Créé · approuvé')}</span>
              <span className="v ">{st.approuveLe ? `${dateCourte(st.creeLe, langue)} · ${dateCourte(st.approuveLe, langue, true)}` : dateCourte(st.creeLe, langue, true)}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Contrat')}</span>
              <span className="v ">
                <Link to={chemin('documents')} className="cor">
                  {tf('Signé le {d}', { d: dateCourte(st.contratSigneLe, langue, true) })}
                </Link>
              </span>
            </div>
            <div className="kv">
              <span className="k">{t('Palier · Trust Score')}</span>
              <span className="v ">{`${nomPalier(st.palier, langue)} · ${Math.round(st.trustScore)}`}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Plan')}</span>
              <span className="v ">{st.decouverteJusqua ? tf('{plan} · offre de découverte', { plan: st.plan }) : st.plan}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Vous gardez · votre grille')}</span>
              <span className="v ">{t('Selon la catégorie')}</span>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="table" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Voir la grille par catégorie')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <p>{tf('Palier {palier}. Plus le prix est haut, plus vous gardez.', { palier: nomPalier(st.palier, langue) })}</p>
              <div className="kv">
                <span className="k b8">{t('Catégorie')}</span>
                <span className="v ">{t('Vous gardez')}</span>
              </div>
              {st.grille.map((g) => (
                <div key={g.famille} className="kv">
                  <span className="k">{t(g.categories)}</span>
                  <span className="v cg">{tf('{de} à {a} %', { de: pourcent(g.de, langue), a: pourcent(g.a, langue) })}</span>
                </div>
              ))}
              <p className="t13 c2" style={{ marginTop: '8px' }}>
                {st.decouverteJusqua
                  ? tf('Avec l’offre de découverte, la commission baisse encore de {p} % jusqu’au {d}. Minimum {min} par commande sur les petits prix.', { p: decouvertePct, d: dateCourte(st.decouverteJusqua, langue), min: `${F(st.plancherCommande)} F` })
                  : tf('Minimum {min} par commande sur les petits prix.', { min: `${F(st.plancherCommande)} F` })}
              </p>
            </div>
          </details>
        </div>
      )}

      <div className="card">
        <h3>{t('Mes données')}</h3>
        <p className="t13 c2" style={{ margin: '6px 0 0' }}>
          {t('Loi n° 2024/017 : vous pouvez consulter, corriger et exporter vos données.')}
        </p>
        <div className="mt6">
          <Link to={chemin('parametres')} className="li">
            <span className="ic">
              <Icone nom="pencil" taille={19} />
            </span>
            <span className="grow lt">{t('Consulter et corriger')}</span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <button type="button" className="li" disabled={!!sd?.exportPretLe} onClick={() => void envoyerCode('export').then(exp.ouvrir)} style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: sd?.exportPretLe ? 'default' : 'pointer' }}>
            <span className="ic">
              <Icone nom="download" taille={19} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Exporter mes données')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {sd?.exportPretLe ? tf('Un export est en cours : prêt avant {d} à {h}, par e-mail et dans Documents.', { d: dateCourte(sd.exportPretLe, langue), h: heure(sd.exportPretLe, langue) }) : t('Fichier envoyé par e-mail sous 48 h, et rangé dans Documents')}
              </span>
            </span>
          </button>
          <div className="li">
            <span className="ic">
              <Icone nom="archive" taille={19} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Preuves conservées 180 jours')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Photos, journaux et conversations des commandes')}
              </span>
            </span>
          </div>
        </div>
      </div>

      {!prep && (
        <div className="card" style={{ border: '1.5px solid var(--red-line)' }}>
          {sd?.clotureLe ? (
            <>
              <div className="b8 t15 cr">{tf('Clôture prévue le {d}', { d: jourLong(sd.clotureLe, langue) })}</div>
              <div className="t13 c2 mt4">{t('Vos commandes, litiges et versements en cours se terminent d’abord.')}</div>
              <div className="mt10">
                <Bouton classe="secondary" icone="undo-2" onClick={() => void source.compte.annulerCloture().then(() => dire(t('Demande de clôture annulée.')))}>
                  {t('Annuler la demande')}
                </Bouton>
              </div>
            </>
          ) : (
            <button type="button" className="li" onClick={clo.ouvrir} style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
              <span className="ic" style={{ color: 'var(--red)' }}>
                <Icone nom="ban" taille={19} />
              </span>
              <span className="grow">
                <span className="lt cr" style={{ display: 'block' }}>
                  {t('Clôturer mon compte')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Possible une fois commandes, litiges et versements soldés · 30 jours de préavis')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </button>
          )}
        </div>
      )}
    </Ecran>
  )
}

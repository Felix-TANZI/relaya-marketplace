// Paramètres (VD-11) : repris du prototype (route('parametres')), branché sur la source. Composition VD11-R30, avec
// les décisions DP-13 / Q-44 (français et anglais, pas de pidgin), Q-45 (langue et thème aussi dans le Menu), DP-52
// (profil complet comme le client), Q-18 (accès Préparation : usage personnel seulement).
// - Carte d'identité : photo, nom, identifiant · rôle · boutique, « Gagné avec BelivaY » (propriétaire, même compteur
//   que l'accueil, VD11-R28). Photo, nom, e-mail et téléphone personnel se changent dans « Mon profil » (AJ-B, DP-58 :
//   la personne a sa page, ouverte aussi par l'avatar) : ici, un lien, pas de doublon.
// - Affichage et langue : langue, taille du texte (chaque mot à sa taille, PAR-04), thème sombre, économie de
//   données, animations réduites, sons ; tout s'applique tout de suite (PAR-05).
// - Notifications (VD11-R27, I-2) : « Commandes et litiges » verrouillé ; versements, avis, conseils ; son distinct
//   pendant les heures d'ouverture ; silence de 21 h à 7 h ; jamais de promotion par SMS.
// - Boutique : pause (Q-39) ; « Pour un seul jour : Fermé aujourd'hui » vers Horaires.
// - Mobile Money vers Numéro de versement (le téléphone personnel et l'e-mail sont dans Mon profil).
import { Link, useNavigate } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { jouer } from '@client/composants/Sons'
import { Ecran, nomPalier } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { ECHELLES, usePreferences } from '../../preferences'

const NOMS_TAILLE = ['Très petite', 'Petite', 'Normale', 'Un peu grande', 'Grande', 'Plus grande', 'Très grande', 'Maximale']
import { useMontantsVisibles, useSession } from '../../session'
import { BandeauHorsLigne, Bouton, Interrupteur, LienTexte, jourDate, useAnnonce } from './communs'

function Ligne(p: { icone: string; titre: string; sous?: string; droite?: React.ReactNode; vers?: string }) {
  const { t } = usePreferences()
  const corps = (
    <>
      <span className="ic">
        <Icone nom={p.icone} taille={19} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {t(p.titre)}
        </span>
        {p.sous && (
          <span className="ls" style={{ display: 'block' }}>
            {p.sous}
          </span>
        )}
      </span>
      {p.droite}
      {p.vers && (
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      )}
    </>
  )
  return p.vers ? (
    <Link to={p.vers} className="li" style={{ minHeight: '56px', padding: '10px 0' }}>
      {corps}
    </Link>
  ) : (
    <div className="li" style={{ minHeight: '56px', padding: '10px 0' }}>
      {corps}
    </div>
  )
}

function Choix<T extends string>({ valeurs, actuel, poser, libelle, styles }: { valeurs: [T, string][]; actuel: T; poser: (v: T) => void; libelle: string; styles?: Partial<Record<T, React.CSSProperties>> }) {
  const { t } = usePreferences()
  return (
    <div className="seg" role="radiogroup" aria-label={t(libelle)} style={{ margin: '10px 0 0', width: '100%' }}>
      {valeurs.map(([v, l]) => (
        <a key={v} role="radio" tabIndex={0} aria-checked={v === actuel} className={v === actuel ? 'on' : ''} style={{ height: '44px', ...styles?.[v] }} onClick={() => poser(v)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), poser(v))}>
          {t(l)}
        </a>
      ))}
    </div>
  )
}

export default function Parametres() {
  const p = usePreferences()
  const ie = Math.max(0, ECHELLES.indexOf(p.echelle))
  const { t, tf, langue } = p
  const s = useSession()
  const montants = useMontantsVisibles()
  const naviguer = useNavigate()
  const prep = s.membre?.role === 'preparation'
  const profil = useLecture(() => source.compte.profil(), [s.membre?.role])
  const argent = useLecture(() => (montants ? source.argent.resume() : Promise.resolve(null)), [montants])
  const reglages = useLecture(() => source.notifications.reglages(), [s.membre?.role])
  const securite = useLecture(() => source.compte.securite(), [s.membre?.role])
  const appareils = useLecture(() => source.compte.appareils(), [])
  const boutique = useLecture(() => source.boutique.boutique(), [])
  const numero = useLecture(() => (montants ? source.versements.numero() : Promise.resolve(null)), [montants])
  const [annonce, dire] = useAnnonce()
  const pr = profil.donnees
  const r = reglages.donnees
  const regler = (champs: Parameters<typeof source.notifications.regler>[0]) => void source.notifications.regler(champs).then(() => reglages.relire())
  const b = boutique.donnees
  const nbAppareils = appareils.donnees?.length ?? null
  return (
    <Ecran
      route="parametres"
      fixes={annonce}
    >
      <BandeauHorsLigne texte="Hors connexion : les réglages d’affichage s’appliquent quand même ; le profil partira au retour du réseau." />
      <div className="card" style={{ marginTop: '14px' }}>
        <div className="row" style={{ gap: '12px' }}>
          <span className="avatar" style={{ width: '56px', height: '56px', margin: 0, fontSize: '18px', overflow: 'hidden', flexShrink: 0 }}>
            {pr?.photo ? <img src={pr.photo} alt={t('Photo de profil')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.membre?.initiales}
          </span>
          <div className="grow">
            <div className="b8 t17">{pr ? `${pr.prenom} ${pr.nom}` : ''}</div>
            <div className="t13 c3">{pr ? `${pr.identifiant} · ${t(prep ? 'accès Préparation' : 'propriétaire')} · ${s.boutique?.nom ?? ''}` : ''}</div>
          </div>
        </div>
        <div className="meta">
          {!prep && (
            <span className="pill green sm">
              <Icone nom="badge-check" taille={13} />
              {t('Identité vérifiée')}
            </span>
          )}
          {s.boutique && <span className="pill bronze sm">{`${nomPalier(s.boutique.palier, langue)} · ${Math.round(s.boutique.trustScore)}`}</span>}
        </div>
        <div className="row mt12" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <Bouton classe="secondary sm" icone="circle-user-round" vers={chemin('profil')}>
            {t('Mon profil')}
          </Bouton>
        </div>
        {montants && argent.donnees && (
          <div className="row" style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '12px', background: 'var(--green-soft)' }}>
            <span className="grow">
              <span className="b8 t14" style={{ display: 'block' }}>
                {t('Gagné avec BelivaY')}
              </span>
              <span className="t12 c3">{t('Depuis votre inscription')}</span>
            </span>
            <span className="b8 cg" style={{ fontSize: '19px' }}>
              {t(`${F(argent.donnees.gagneDepuisInscription)} F`)}
            </span>
          </div>
        )}
        <div className="hint-l">
          <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>
            {t(prep ? 'L’identifiant ne change jamais.' : 'L’identifiant ne change jamais. Le nom suit votre pièce d’identité.')}
            {!prep && (
              <>
                {' '}
                <Link to={chemin('boutique', { modif: 1 })} className="b8 cor">
                  {t('Demander une modification')}
                </Link>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="card">
        <h3>{t('Affichage et langue')}</h3>
        <div className="mt6">
          <div className="li" style={{ flexWrap: 'wrap', padding: '12px 0' }}>
            <span className="ic">
              <Icone nom="languages" taille={19} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Langue')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('L’application et les notifications ; les SMS restent en français.')}
              </span>
            </span>
            <Choix libelle="Langue" valeurs={[['fr', 'Français'], ['en', 'English']]} actuel={langue} poser={p.setLangue} />
          </div>
          {/* Taille du texte libre, comme les Réglages du client : 8 tailles (85 à 140 %), aperçu en direct. */}
          <div style={{ padding: '12px 0' }}>
            <div className="li" style={{ padding: 0 }}>
              <span className="ic" style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-.02em' }}>
                {t('Aa')}
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Taille du texte')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {p.tf('{nom} · {p} %', { nom: t(NOMS_TAILLE[ie]), p: ECHELLES[ie] })}
                </span>
              </span>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 12, alignItems: 'center' }}>
              <span aria-hidden="true" style={{ fontSize: 13, fontWeight: 700 }}>
                A
              </span>
              <input
                type="range"
                className="taille-barre"
                min={0}
                max={ECHELLES.length - 1}
                step={1}
                value={ie}
                aria-label={t('Taille du texte')}
                aria-valuetext={p.tf('{nom}, {p} %', { nom: t(NOMS_TAILLE[ie]), p: ECHELLES[ie] })}
                onChange={(e) => p.setEchelle(ECHELLES[Number(e.target.value)])}
              />
              <span aria-hidden="true" style={{ fontSize: 22, fontWeight: 700 }}>
                A
              </span>
            </div>
            <div className="taille-graduation" aria-hidden="true">
              {ECHELLES.map((e, n) => (
                <i key={e} className={n === ie ? 'on' : n === 2 ? 'ref' : ''} />
              ))}
            </div>
            <p className="ls" style={{ margin: '10px 0 0', lineHeight: 1.45, zoom: ECHELLES[ie] / 100 }}>
              {t('Aperçu : BLV-00008 est à préparer avant 12 h 42. Le livreur passe entre 14 h et 16 h.')}
            </p>
            {ECHELLES[ie] !== 100 && (
              <button type="button" className="lk" style={{ marginTop: 6, background: 'none', border: 0, padding: 0, color: 'var(--or-txt)', fontWeight: 700, cursor: 'pointer' }} onClick={() => p.setEchelle(100)}>
                {t('Revenir à la taille normale')}
              </button>
            )}
          </div>
          <Ligne icone="moon" titre="Thème sombre" sous={t('Aussi dans le Menu ; « Automatique » y suit le téléphone.')} droite={<Interrupteur actif={p.theme === 'dark'} changer={(v) => p.setTheme(v ? 'dark' : 'light')} libelle="Thème sombre" />} />
          <Ligne icone="database" titre="Économie de données" sous={t('Moins de forfait internet : photos allégées, carte à la demande')} droite={<Interrupteur actif={p.donneesEconomes} changer={p.setDonneesEconomes} libelle="Économie de données" />} />
          <Ligne icone="sparkles" titre="Animations réduites" sous={t('Moins de mouvement à l’écran')} droite={<Interrupteur actif={p.animationsReduites} changer={p.setAnimationsReduites} libelle="Animations réduites" />} />
          <Ligne icone="bell-ring" titre="Sons de l’application" sous={t('Un son court à chaque geste réussi')} droite={<Interrupteur actif={p.sons} changer={p.setSons} libelle="Sons de l’application" />} />
        </div>
      </div>

      <div className="card">
        <h3>{t('Notifications')}</h3>
        {r && (
          <div className="mt6">
            <Ligne icone="package-check" titre="Commandes et litiges" sous={t('Toujours actives · notification et SMS')} droite={<Interrupteur actif libelle="Commandes et litiges" verrou />} />
            {!prep && <Ligne icone="banknote" titre="Versements du vendredi" sous={t('Notification')} droite={<Interrupteur actif={r.versements} changer={(v) => regler({ versements: v })} libelle="Versements du vendredi" />} />}
            <Ligne icone="star" titre="Avis" sous={t('Notification')} droite={<Interrupteur actif={r.avis} changer={(v) => regler({ avis: v })} libelle="Avis" />} />
            <Ligne icone="lightbulb" titre="Conseils" sous={t('Une fois par semaine au plus')} droite={<Interrupteur actif={r.conseils} changer={(v) => regler({ conseils: v })} libelle="Conseils" />} />
            <Ligne icone="bell-ring" titre="Son distinct pendant l’ouverture" sous={t('Pour une commande ou un litige, quand la boutique est ouverte')} droite={<Interrupteur actif={r.sonDistinct} changer={(v) => regler({ sonDistinct: v })} libelle="Son distinct pendant l’ouverture" />} />
            <Ligne icone="bell-off" titre="Silence la nuit" sous={tf('De {de} à {a} : ni son ni SMS, sauf un litige près de son échéance.', { de: r.silence[0].replace(':00', ' h'), a: r.silence[1].replace(':00', ' h').replace(/^0/, '') })} />
          </div>
        )}
        <div className="row mt8" style={{ gap: '8px', alignItems: 'center' }}>
          <p className="grow t13 c3" style={{ margin: 0 }}>
            {t('Jamais de promotion par SMS.')}
          </p>
          <LienTexte onClick={() => (jouer('notification', true), dire(t('Voici le son d’une commande à préparer.')))}>{t('Écouter le son')}</LienTexte>
        </div>
      </div>

      {!prep && b && (
        <div className="card">
          <h3>{t('Boutique')}</h3>
          <Ligne
            icone="circle-pause"
            titre="Mettre la boutique en pause"
            sous={b.pause ? tf('En pause jusqu’au {d}. Les commandes reçues restent à préparer.', { d: jourDate(b.pause.jusqua, langue) }) : t('Plus aucune offre attribuée. Les commandes reçues restent à préparer.')}
            droite={<Interrupteur actif={!!b.pause} changer={(v) => (v ? naviguer(chemin('horaires', { pause: 1 })) : void source.boutique.reprendre().then(() => dire(t('Boutique rouverte : les commandes arrivent de nouveau.'))))} libelle="Mettre la boutique en pause" />}
          />
          <Link to={chemin('horaires')} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
            {t('Pour un seul jour : « Fermé aujourd’hui »')}
          </Link>
        </div>
      )}

      {montants && (
        <div className="card">
          <h3>{t('Mobile Money')}</h3>
          <Ligne
            vers={chemin('numero_versement')}
            icone="smartphone"
            titre="Numéro de versement"
            sous={numero.donnees ? (numero.donnees.enRevue ? tf('{op} {m} · en revue', { op: numero.donnees.enRevue.operateur, m: numero.donnees.enRevue.masque }) : tf('{op} {m} · vérifié · au nom du titulaire', { op: numero.donnees.actuel.operateur, m: numero.donnees.actuel.masque })) : undefined}
          />
          <div className="hint">{t('Ce n’est ni votre téléphone personnel, ni un numéro connu des clients.')}</div>
        </div>
      )}

      <div className="card tight">
        <Ligne vers={chemin('securite')} icone="shield-check" titre="Sécurité, appareils et données" sous={nbAppareils !== null && securite.donnees ? tf(nbAppareils > 1 ? '{n} appareils · code par SMS au {tel}' : '{n} appareil · code par SMS au {tel}', { n: nbAppareils, tel: securite.donnees.telephoneMasque }) : undefined} />
        {montants && <Ligne vers={chemin('documents')} icone="file-text" titre="Documents" sous={t('Contrat, factures, relevés')} />}
        <Ligne vers={chemin('messages')} icone="messages-square" titre="Messagerie" />
        <Ligne vers={chemin('installer')} icone="download" titre="Installer l’application" />
      </div>

      <div className="mt16">
        <Bouton icone="check" onClick={() => (dire(t('Réglages enregistrés.')), naviguer(chemin('accueil')))}>
          {t('Enregistrer')}
        </Bouton>
      </div>
      <div className="mt8">
        <Bouton
          classe="danger"
          icone="log-out"
          onClick={() =>
            void source.session.deconnecter().then(() => naviguer(chemin('connexion'), { replace: true }))
          }
        >
          {t('Se déconnecter')}
        </Bouton>
      </div>
      <p className="t12 c3 center" style={{ margin: '18px 0 0' }}>
        {t('BelivaY Vendeur 2.0 · septembre 2026')}
      </p>
      <p className="t12 c3 center" style={{ margin: '4px 0 0' }}>
        {t('Conformité : ANTIC · OHADA · loi n° 2024/017')}
      </p>
    </Ecran>
  )
}

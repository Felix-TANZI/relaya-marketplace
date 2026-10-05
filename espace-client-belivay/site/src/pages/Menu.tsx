// Le Menu de l'application (CNV-02, CTV-32), balisage du Menu du prototype du 1er octobre, bloc par bloc.
// Corrections du porteur (DP-44) : ni « CURATED » ni « SPONSO » (CCH-30, DP-14), pas de pidgin (DP-13).
// Un bloc d'un module fermé n'apparaît pas (CCH-18, CFS-02, CTV-34) : Flash Deals (FF-FLASH), BelivaY
// Premium (FF-ABONNEMENT), le portefeuille (FF-WALLET). Les « Services BelivaY » sont le repère de revue
// du prototype (CCH-19) : visibles seulement en mode prototype de la démonstration.
// Dès 1024 px : page « Plan du site » (§ 5.16), les blocs en 3 colonnes de cartes, dans le même ordre.
import { Link } from 'react-router-dom'
import { BanniereVendeur } from '../composants/BanniereVendeur'
import { Contacts, Reseaux } from '../composants/Reseaux'
import { useGarde } from '../composants/donneesCoque'
import { Ecran } from '../composants/coque'
import { useDes } from '../composants/ecran'
import { Bloc } from './CL-13/Larges'
import { Icone } from '../composants/Icone'
import { Illustration, Interrupteur, Ligne } from '../composants/socle'
import { chemin } from '../config/pages'
import { useDonnees } from '../donnees/useDonnees'
import { source } from '../donnees/source'
import { F, N, badge } from '../i18n/format'
import { usePreferences } from '../preferences'
import { PastillePourQui } from '../composants/PourQui'
import { useCompteDiaspora, useSession } from '../session'
import { Montant, OeilSolde, Portrait } from '../composants/Profil'

const pluriel = (n: number, un: string, plusieurs: string) => n + ' ' + (n > 1 ? plusieurs : un)

export function Menu() {
  const { t, tf, langue, setLangue, taille, setTaille, theme, setTheme } = usePreferences()
  const s = useSession()
  const diaspora = useCompteDiaspora() // DP-54 : ni relais à lui, ni portefeuille ; son espace diaspora à la place
  const m = useDonnees(() => source.menu())
  // Boutique ouverte depuis le compte : la bannière vendeur passe en « Ma boutique » (même lien).
  const compte = useGarde('compte', () => source.compte(), s.connecte)
  const large = useDes('tab') // grands écrans : « Plan du site », comme le lien du pied de page
  const ff = s.interrupteurs
  const choisir = (e: React.MouseEvent, f: () => void) => {
    e.preventDefault()
    f()
  }
  return (
    <Ecran route="menu" largeur="moyen" titre={large ? 'Plan du site' : undefined}>
      {m && (
        <>
          <Bloc classe="mn-tete">
          {s.client && (
            <Link className="card row" to={chemin('compte')} style={{ marginTop: 14 }}>
              <Portrait taille={48}>
                <Illustration image={s.client.portrait[48]} classe="portrait" style={{ width: 48, height: 48 }} />
              </Portrait>
              <span className="grow">
                <b className="t17 b8" style={{ display: 'block' }}>
                  {t(s.client.nomComplet)}
                </b>
                <span className="t13 c3">{t(s.client.numeroMasque + ' · vérifié · voir mon profil')}</span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)' }} />
            </Link>
          )}
          {diaspora && (
            <Link className="card row" to={chemin('espace-diaspora')} style={{ marginTop: 10 }}>
              <span className="ic-sq or">
                <Icone nom="globe" taille={20} />
              </span>
              <span className="grow">
                <b className="t15 b8" style={{ display: 'block' }}>
                  {t('Espace diaspora')}
                </b>
                <span className="t13 c3">{t('Proches, paniers à payer, commandes envoyées, devise')}</span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)' }} />
            </Link>
          )}
          {diaspora && <PastillePourQui classe="pq-ligne" />}
          {s.relais && !diaspora && (
            <Link className="card row" to={chemin('relais-choix')} style={{ marginTop: 10 }}>
              <span className="ic-sq or">
                <Icone nom="map-pin" taille={20} />
              </span>
              <span className="grow">
                <b className="t15 b8" style={{ display: 'block' }}>
                  {t(s.relais.nom)}
                </b>
                <span className="t13 c3">{t(s.relais.gerant + ' · ' + s.relais.horaireDuJour)}</span>
              </span>
              <span className="t13 b7 cor">{t('Changer')}</span>
            </Link>
          )}

          </Bloc>
          <Bloc classe="mn-plan">
          <Bloc classe="mn-b">
          <div className="dx-h">
            <b>{t('À découvrir')}</b>
          </div>
          <div className="dx-tiles">
            {ff['FF-FLASH'] && (
              <Tuile classe="flash" vers={chemin('ventes-flash')} icone="zap" plein titre="Flash Deals" sous="Vraie fin · vrai stock" />
            )}
            <Tuile
              classe="promo"
              vers={chemin('promotions')}
              icone="flame"
              titre="Promotions"
              sous={`${m.promotions.nombre} promos jusqu’à −${m.promotions.remiseMax} %`}
            />
            {/* Sans l'étiquette « CURATED » du prototype : aucun anglicisme (DP-44, CCH-30). */}
            <Tuile classe="sel" vers={chemin('selection')} icone="star" plein titre="Sélection Premium" sous="Triés sur le volet" />
            {ff['FF-ABONNEMENT'] && (
              <Tuile
                classe="prem"
                vers={chemin(diaspora ? 'abonnement-offrir' : 'abonnements')}
                icone="gem"
                titre="BelivaY Premium"
                sous={diaspora ? 'L’offrir à un proche' : `Retrait offert dès ${F(m.seuilPremium)} F`}
              />
            )}
            {diaspora ? <Tuile classe="dia" vers={chemin('espace-diaspora')} icone="globe" titre="Diaspora" sous="Faire livrer mes proches" /> : <Tuile classe="dia" vers={chemin('diaspora')} icone="globe" titre="Diaspora" sous="Un proche paie pour toi" />}
            <Tuile classe="new" vers={chemin('liste', { from: 'accueil' })} icone="sparkles" titre="Nouveautés" sous="Les derniers arrivages" />
          </div>

          </Bloc>
          <Bloc classe="mn-b">
          <div className="dx-h">
            <b>{t('Catégories')}</b>
            <Link to={chemin('categories')}>{t('Tout voir')}</Link>
          </div>
          <div className="mn-uni">
            {m.univers.map((u) => (
              <Link key={u.id} to={chemin('liste', { cat: u.id, from: 'categories' })}>
                <Illustration image={u.vignette} classe="th" />
                <span className="g">
                  <b>{t(u.nom)}</b>
                  <small>
                    <span>{t(N(u.produits))}</span>
                    {t(' produits')}
                  </small>
                </span>
              </Link>
            ))}
          </div>

          </Bloc>
          <Bloc classe="mn-b">
          {ff['FF-WALLET'] && !diaspora && (
            <>
              <div className="dx-h">
                <b>{t('Mon Wallet')}</b>
                <Link to={chemin('wallet')}>{t('Détails')}</Link>
              </div>
              <section className="wl-card">
                <span className="ring" />
                <div className="wl-h">
                  <Icone nom="wallet" taille={16} />
                  <span className="grow">{t('Wallet BelivaY')}</span>
                  <OeilSolde />
                </div>
                <div className="wl-bal">
                  <Montant solde>{t(F(m.portefeuille.solde))}</Montant>
                  <small>{t('F')}</small>
                </div>
                <div className="wl-sub">
                  <Montant>{t(`Disponible · cagnotte en attente ${F(m.portefeuille.cagnotteEnAttente)} F`)}</Montant>
                </div>
                <div className="wl-act">
                  <ActionPortefeuille vers={chemin('wallet', { st: 'recharger' })} icone="plus" taille={20} texte="Recharger" />
                  <ActionPortefeuille vers={chemin('panier')} icone="shopping-cart" taille={19} texte="Payer" />
                  <ActionPortefeuille vers={chemin('wallet', { st: 'retirer' })} icone="arrow-up-right" taille={19} texte="Retirer" />
                  <ActionPortefeuille vers={chemin('wallet')} icone="list" taille={19} texte="Historique" />
                </div>
              </section>
            </>
          )}

          </Bloc>
          <Bloc classe="mn-b">
          <div className="dx-h">
            <b>{t('Mes achats')}</b>
          </div>
          <div className="card tight">
            <Ligne
              vers={chemin('commandes')}
              icone="package"
              titre={t('Mes commandes')}
              sous={t(`${m.commandes.aRetirer} colis à retirer · ${m.commandes.enPreparation} en préparation`)}
              droite={<Badge n={m.commandes.badge} />}
            />
            <Ligne
              vers={chemin('sauvegardes')}
              icone="heart"
              titre={t('Sauvegardés et listes')}
              sous={t(pluriel(m.sauvegardesSuivis, 'article suivi', 'articles suivis'))}
            />
            <Ligne
              vers={chemin('litiges')}
              icone="scale"
              titre={t('Mes litiges')}
              sous={t(`${m.litiges.enCours} en cours`)}
              droite={<Badge n={m.litiges.badge} />}
            />
            <Ligne vers={chemin('factures')} icone="file-text" titre={t('Factures')} sous={t('Une par commande retirée')} />
          </div>

          </Bloc>
          <Bloc classe="mn-b">
          <BanniereVendeur
            ouverte={!!compte?.boutique}
            titre={compte?.boutique ? tf('Ma boutique «\u00A0{nom}\u00A0»', { nom: compte.boutique.nom }) : t('Deviens vendeur')}
            sous={t(compte?.boutique ? 'Ton espace vendeur : produits, commandes, versements.' : 'Ouvre ta boutique en 1 minute, ajoute tes produits tout de suite. Pièce d’identité avant de vendre.')}
            action={t(compte?.boutique ? 'Voir' : 'Commencer')}
          />

          </Bloc>
          <Bloc classe="mn-b">
          {s.reperesPrototype && (
            <>
              <div className="dx-h">
                <b>{t('Services BelivaY')}</b>
              </div>
              <div className="dx-svc">
                {SERVICES.map(([route, ton, icone, texte]) => (
                  <Link key={route} to={chemin(route)}>
                    <span className={'i ' + ton}>
                      <Icone nom={icone} taille={20} />
                    </span>
                    {t(texte)}
                  </Link>
                ))}
              </div>
              <p className="dx-note">
                <Icone nom="lock" taille={12} style={{ verticalAlign: '-1px' }} />
                {t(' Services prévus après le lancement : ils s’ouvrent au fur et à mesure.')}
              </p>
            </>
          )}

          </Bloc>
          <Bloc classe="mn-b">
          <div className="dx-h">
            <b>{t('Aide et contact')}</b>
          </div>
          <div className="card tight">
            <Ligne vers={chemin('aide')} icone="headset" titre={t('Aide et support')} sous={t(`Questions fréquentes · de ${m.support.ouverture} h à ${m.support.fermeture} h`)} />
            <Ligne
              vers={chemin('messagerie')}
              icone="messages-square"
              titre={t('Messagerie')}
              sous={t(pluriel(m.messagesNonLus, 'message non lu', 'messages non lus'))}
              droite={<Badge n={m.messagesNonLus} />}
            />
            <Ligne vers={chemin('rappel')} icone="phone-call" titre={t('Être rappelé')} sous={t('Appel masqué : ton numéro reste privé')} />
            <Ligne
              vers={chemin('notifications')}
              icone="bell"
              titre={t('Notifications')}
              sous={t(pluriel(m.notificationsNouvelles, 'nouvelle', 'nouvelles'))}
              droite={<Badge n={m.notificationsNouvelles} />}
            />
          </div>

          </Bloc>
          <Bloc classe="mn-b">
          <div className="dx-h">
            <b>{t('Nous suivre')}</b>
          </div>
          <div className="card mn-suivre">
            <Reseaux />
            <Contacts />
          </div>

          </Bloc>
          <Bloc classe="mn-b">
          <div className="dx-h">
            <b>{t('Préférences')}</b>
          </div>
          <div className="card tight dx-pref">
            <div className="li" style={{ flexWrap: 'wrap' }}>
              <span className="ic">
                <Icone nom="languages" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Langue')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('L’application, les notifications et les SMS')}
                </span>
              </span>
              <span style={{ flexBasis: '100%' }}>
                <span className="seg">
                  <a href="#" className={langue === 'fr' ? 'on' : ''} onClick={(e) => choisir(e, () => setLangue('fr'))}>
                    {t('Français')}
                  </a>
                  <a href="#" className={langue === 'en' ? 'on' : ''} onClick={(e) => choisir(e, () => setLangue('en'))}>
                    {t('English')}
                  </a>
                </span>
              </span>
            </div>
            <div className="li" style={{ flexWrap: 'wrap' }}>
              <span className="ic">
                <Icone nom="a-large-small" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Taille du texte')}
                </span>
              </span>
              <span style={{ flexBasis: '100%' }}>
                <span className="seg">
                  {(
                    [
                      ['normale', 'Normale'],
                      ['grande', 'Grande'],
                      ['tres', 'Très grande'],
                    ] as const
                  ).map(([v, texte]) => (
                    <a key={v} href="#" className={taille === v ? 'on' : ''} onClick={(e) => choisir(e, () => setTaille(v))}>
                      {t(texte)}
                    </a>
                  ))}
                </span>
              </span>
            </div>
            <div className="li">
              <span className="ic">
                <Icone nom={theme === 'dark' ? 'sun' : 'moon'} taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Thème sombre')}
                </span>
              </span>
              <span>
                <Interrupteur actif={theme === 'dark'} aria={t('Thème sombre')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
              </span>
            </div>
            <Ligne vers={chemin('notifs-reglages')} icone="bell-ring" titre={t('Réglages des notifications')} sous={t('Ce que tu reçois, SMS de repli')} />
            <Ligne vers={chemin('reglages')} icone="settings" titre={t('Tous les réglages')} sous={t('Données économes, mesure d’audience')} />
          </div>
          </Bloc>
          </Bloc>
          <div className="mn-foot">
            <Link to={chemin('legal')}>{t('Pages légales')}</Link>
            <Link to={chemin('legal-doc', { d: 'mentions' })}>{t('À propos de BelivaY')}</Link>
            <Link to={chemin('faq', { t: 'retrait' })}>{t('Comment ça marche')}</Link>
          </div>
        </>
      )}
    </Ecran>
  )
}

// Repère de revue du prototype : les modules d'après le lancement, chacun derrière son interrupteur.
const SERVICES: [string, string, string, string][] = [
  ['mon-abonnement', 'v', 'crown', 'Premium'],
  ['cagnotte', '', 'piggy-bank', 'Cagnotte'],
  ['parrainage', 'g', 'user-plus', 'Parrainage'],
  ['diaspora', 'b', 'globe', 'Diaspora'],
  ['famille', 'b', 'users', 'Panier famille'],
  ['listes', '', 'gift', 'Listes cadeaux'],
  ['cotisation', 'a', 'coins', 'Cotisation'],
  ['cote', 'a', 'hand-coins', 'Mise de côté'],
  ['troc', 'g', 'repeat', 'Troc'],
  ['rentree', 'v', 'graduation-cap', 'Rentrée'],
  ['assistant', '', 'bot', 'Assistant'],
  ['wa', 'g', 'message-circle', 'WhatsApp'],
]

function Tuile(p: { classe: string; vers: string; icone: string; plein?: boolean; etiquette?: string; titre: string; sous: string }) {
  const { t } = usePreferences()
  return (
    <Link className={'dx-t ' + p.classe} to={p.vers}>
      {p.etiquette && <span className="tg2">{t(p.etiquette)}</span>}
      <span className="i">
        <Icone nom={p.icone} taille={17} style={p.plein ? { fill: 'currentColor' } : undefined} />
      </span>
      <span>
        <b>{t(p.titre)}</b>
        <small>{t(p.sous)}</small>
      </span>
    </Link>
  )
}

function ActionPortefeuille(p: { vers: string; icone: string; taille: number; texte: string }) {
  const { t } = usePreferences()
  return (
    <Link to={p.vers}>
      <span className="i">
        <Icone nom={p.icone} taille={p.taille} />
      </span>
      {t(p.texte)}
    </Link>
  )
}

function Badge({ n }: { n: number }) {
  const b = badge(n)
  return b ? <span className="badge-num">{b}</span> : null
}

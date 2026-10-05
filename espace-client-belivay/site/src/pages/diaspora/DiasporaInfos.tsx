// Écran « Comptes diaspora : tout savoir » (DP-54), public : qui peut ouvrir un compte diaspora (majeur, vit hors
// du Cameroun dans un pays accepté, numéro de ce pays vérifié par SMS, e-mail vérifié, carte à son nom avec 3-D
// Secure) et qui ne peut pas (résident au Cameroun, mineur, revente, carte d'un tiers, pays sous sanctions, compte
// bloqué pour fraude) ; comment commander pour un proche (lien famille avec son accord, panier, « Commander pour »,
// paiement en euros à parité fixe ou en dollars, code au proche, suivi sans adresse ni code, preuve de retrait) ;
// ce qu'il faut (lien actif, panier, carte, plafonds, proche joignable) ; le contrôle de chaque paiement, tel que
// COHERENCE_DIASPORA l'applique (pays de la carte face au compte et au numéro, montant, rythme ; accepté, renforcé
// ou refusé) ; l'inscription (Google, Apple, e-mail à deux codes, ou numéro étranger) ; ce que voit le proche au Cameroun ; l'autre
// sens (un proche au Cameroun envoie son panier à payer) ; consentement, données, conservation, fraude et
// blanchiment, remboursements. DP-54 : le type de compte (payer et faire livrer ses proches, rien pour soi), la
// devise d'affichage, le lien d'invitation (QR, WhatsApp, SMS) dans les deux sens, la livraison « chez X » sans
// adresse, les paniers envoyés à payer et qui paie la livraison (donnees/echanges.ts), l'espace diaspora.
// Écran propre au site (absent du prototype).
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { AGE_DIASPORA, COHERENCE_DIASPORA, PAYS_DIASPORA, PLAFONDS_DIASPORA } from '../../donnees/source'
import { F, TAUX_DOLLAR_DEMO } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { EURO, PLAFOND_CARTE } from '../CL-12/Diaspora'
import { Rangee } from './Commun'

// Sommaire de la page, dès 1200 px (§ 5.14) : colonne de 220 px collante à gauche du texte (760 px).
const SOMMAIRE: [string, string][] = [
  ['di-qui', 'Qui peut ouvrir un compte diaspora'],
  ['di-pas', 'Qui ne peut pas, et quoi faire à la place'],
  ['di-comment', 'Comment commander pour un proche'],
  ['di-compte', 'Ton compte diaspora'],
  ['di-faut', 'Ce qu’il faut pour commander'],
  ['di-controle', 'Le contrôle de chaque paiement'],
  ['di-cameroun', 'Au Cameroun : ce que voit ton proche'],
  ['di-loi', 'Tes données, ton argent et la loi'],
]

export function DiasporaInfos() {
  const { t, tf } = usePreferences()
  const session = useSession()
  const pc = useDes('pc')
  // Le passage choisi vient en haut de la page (main est la zone qui défile) et reçoit le focus du clavier.
  const aller = (id: string) => {
    const el = document.getElementById(id)
    const main = el?.closest('main')
    if (!el || !main) return
    el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
    const haut = parseFloat(getComputedStyle(main).paddingTop) || 0
    // Défilement doux, sauf quand les animations sont réduites (réglage, ou système).
    const doux = !document.documentElement.dataset.anim && !matchMedia('(prefers-reduced-motion: reduce)').matches
    main.scrollTo({ top: main.scrollTop + el.getBoundingClientRect().top - main.getBoundingClientRect().top - haut, behavior: doux ? 'smooth' : 'auto' })
  }
  const point = (icone: string, texte: string, couleur?: string) => (
    <div key={texte} className="hint-l">
      <Icone nom={icone} taille={15} style={{ flexShrink: '0', marginTop: '1px', ...(couleur ? { color: couleur } : {}) }} />
      <span>{texte}</span>
    </div>
  )
  const etape = (n: number, titre: string, texte: string) => (
    <div key={n} className="row" style={{ gap: 12, alignItems: 'flex-start', padding: '6px 0' }}>
      <span className="ic-sq or" style={{ borderRadius: '50%', width: 28, height: 28, fontWeight: 800, flexShrink: 0 }}>
        {n}
      </span>
      <span className="grow">
        <b className="t14" style={{ display: 'block' }}>
          {titre}
        </b>
        <span className="t13 c2">{texte}</span>
      </span>
    </div>
  )
  const refus = (titre: string, texte: string, lien?: { vers: string; libelle: string }) => (
    <div key={titre} className="row" style={{ gap: 10, alignItems: 'flex-start', padding: '6px 0' }}>
      <Icone nom="circle-x" taille={18} style={{ color: 'var(--red)', flexShrink: 0, marginTop: '1px' }} />
      <span className="grow">
        <b className="t14" style={{ display: 'block' }}>
          {titre}
        </b>
        <span className="t13 c2">
          {texte} {lien && <Link to={lien.vers}>{lien.libelle}</Link>}
        </span>
      </span>
    </div>
  )

  return (
    <Ecran route="diaspora-infos" largeur={pc ? 'moyen' : 'lecture'}>
      <Rangee classe="d13-lecture" des="pc">
        {pc && (
          <nav className="d13-sommaire" aria-label={t('Sommaire')}>
            <h2 className="cl11-k">{t('Sommaire')}</h2>
            <ol>
              {SOMMAIRE.map(([id, titre]) => (
                <li key={id}>
                  <a href={'#' + id} onClick={(e) => (e.preventDefault(), aller(id))}>
                    {t(titre)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <Rangee classe="d13-texte" des="pc">
          <div className="hero orange mt12">
            <div className="hk">{t('Diaspora')}</div>
            <div className="cl11-ht">{t('Commander pour sa famille au Cameroun, en toute sécurité')}</div>
            <div className="hs">{t('Qui peut ouvrir un compte diaspora, comment commander pour un proche, ce qu’il faut et comment tes données et ton argent sont protégés.')}</div>
          </div>

          {/* Les deux sens */}
          <div className="card tight">
            <Link to={session.connecte ? chemin('espace-diaspora') : chemin('inscription-diaspora')} className="li">
              <span className="ic">
                <Icone nom="globe" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Tu vis à l’étranger : tu commandes pour un proche')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Compte diaspora, lien famille, paiement par carte en € ou en $')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to={chemin('proches')} className="li">
              <span className="ic">
                <Icone nom="users" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Tu vis au Cameroun : un proche commande pour toi')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Donne-lui ton code famille ou accepte son invitation')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to={chemin('diaspora')} className="li">
              <span className="ic">
                <Icone nom="send" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Tu vis au Cameroun : un proche paie ton panier')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Tu lui envoies un lien ; il paie par carte, sans compte')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>

          {/* Qui peut */}
          <div className="card vedette" id="di-qui">
            <h3 className="cl11-k">{t('Qui peut ouvrir un compte diaspora')}</h3>
            {[
              tf('Une personne majeure : {a} ans ou plus, date de naissance contrôlée à l’inscription.', { a: AGE_DIASPORA }),
              t('Qui vit hors du Cameroun, dans un des pays acceptés ci-dessous.'),
              t('Avec un numéro de téléphone de ce pays, vérifié par un code SMS. Un numéro camerounais (+237) ouvre un compte normal.'),
              t('Qui s’inscrit avec Google ou Apple (e-mail déjà vérifié), avec son e-mail (vérifié par un second code) ou avec son numéro étranger (e-mail facultatif) : ses reçus et les preuves de retrait arrivent à son e-mail.'),
              t('Qui paie avec une carte Visa ou Mastercard à son nom, protégée par 3-D Secure.'),
              t('Qui achète pour ses proches, pour leur usage : jamais pour revendre.'),
            ].map((x) => point('circle-check', x, 'var(--green)'))}
            <h3 className="cl11-k mt12">{t('Pays acceptés')}</h3>
            <div className="chips">
              {PAYS_DIASPORA.map(([p, i]) => (
                <span key={p} className="chip">
                  {t(p)} {i}
                </span>
              ))}
            </div>
            <p className="t12 c3">{t('D’autres pays ouvriront. Un pays sous sanctions internationales n’est jamais accepté.')}</p>
          </div>

          {/* Qui ne peut pas */}
          <div className="card" id="di-pas">
            <h3 className="cl11-k">{t('Qui ne peut pas, et quoi faire à la place')}</h3>
            {refus(t('Tu vis au Cameroun'), t('Ouvre un compte normal avec ton numéro camerounais : tu paies en Mobile Money, et un proche à l’étranger peut toujours payer pour toi.'), { vers: chemin('connexion'), libelle: t('Créer mon compte') })}
            {refus(tf('Tu as moins de {a} ans', { a: AGE_DIASPORA }), t('Un parent ou un proche majeur ouvre le compte et commande pour la famille.'))}
            {refus(t('Tu achètes pour revendre'), t('La revente et l’usage commercial passent par un compte vendeur, avec ses propres règles.'), { vers: chemin('devenir-vendeur'), libelle: t('Devenir vendeur') })}
            {refus(t('La carte n’est pas à ton nom'), t('La carte d’un tiers est refusée, même avec son accord : le nom sur la carte doit être celui du compte.'))}
            {refus(t('Ton pays n’est pas dans la liste'), t('Pays sous sanctions : jamais. Autre pays : pas encore ; un proche au Cameroun peut t’envoyer son panier à payer par lien.'), { vers: chemin('diaspora'), libelle: t('Voir comment') })}
            {refus(t('Ton compte a été bloqué pour fraude'), t('Aucun nouveau compte ne peut être ouvert. Pour contester, écris au support.'), { vers: chemin('aide'), libelle: t('Contacter le support') })}
          </div>

          {/* Comment commander */}
          <div className="card" id="di-comment">
            <h3 className="cl11-k">{t('Comment commander pour un proche')}</h3>
            {etape(1, t('Ouvre ton compte diaspora'), t('Avec Google, Apple, ton e-mail ou ton numéro étranger. Puis, pour tous : ton nom, ta date de naissance, ton pays, ta ville et ton numéro de ce pays vérifié par SMS. Avec l’e-mail, un second code part à ton adresse ; chaque code se renvoie si besoin.'))}
            {etape(2, t('Relie ton proche, avec son accord'), t('Il te donne son code famille (valable 24 h, une seule fois), tu l’invites par son numéro, ou tu lui envoies ton lien d’invitation (QR, WhatsApp, SMS) ; il accepte dans son application. C’est lui qui choisit son relais, et s’il accepte d’être livré chez lui.'))}
            {etape(3, t('Choisis pour qui, puis remplis le panier'), t('« Pour qui ? » est demandé à chaque commande : au relais de ton proche, ou chez lui s’il l’a accepté. Tu ne vois jamais son adresse, seulement « chez {prénom} ».'))}
            {etape(4, t('« Commander pour » ton proche'), tf('Le total s’affiche en francs et en euros (1 € = {e} F, parité fixe) ou en dollars (taux du jour, figé au paiement), avec 2 % de frais de carte, avant de payer.', { e: String(EURO).replace('.', ',') }))}
            {etape(5, t('Tu paies : carte (3-D Secure), Apple Pay ou Google Pay'), t('Sans la confirmation de ta banque ou de ton téléphone, rien n’est débité. Si le paiement sort de tes habitudes, un code SMS de BelivaY à ton numéro est demandé en plus.'))}
            {etape(6, t('Ton proche reçoit son code par SMS'), t('Quand le colis arrive au relais, ou quand le livreur part chez lui. Il retire ou reçoit avec ce code ; il n’a rien à payer.'))}
            {etape(7, t('Tu suis jusqu’à la remise'), t('Payée, en préparation, au relais ou en livraison, remise : tu reçois la preuve. Tu ne vois jamais son adresse, son relais précis (le quartier seulement) ni son code.'))}
          </div>

          {/* Le compte diaspora (DP-54) */}
          <div className="card" id="di-compte">
            <h3 className="cl11-k">{t('Ton compte diaspora')}</h3>
            {point('circle-check', t('Il sert uniquement à payer et faire livrer tes proches reliés au Cameroun ; le site s’adapte : accueil « Pour mes proches », panier « Pour qui ? », commandes envoyées, espace diaspora.'), 'var(--green)')}
            {point('circle-x', t('Pas de retrait pour toi, pas de paiement au comptoir, pas de Mobile Money, pas de portefeuille BelivaY ni de vente : ces écrans sont masqués ou expliqués.'), 'var(--red)')}
            {point('banknote', tf('Devise d’affichage au choix dans Réglages : F CFA, euro (1 € = {e} F, parité fixe) ou dollar US (taux du jour, figé au paiement ; {d} F en démonstration). Le F CFA reste écrit à côté : c’est la monnaie de la commande.', { e: String(EURO).replace('.', ','), d: String(TAUX_DOLLAR_DEMO).replace('.', ',') }))}
            {point('inbox', t('« À payer pour mes proches » : un proche relié t’envoie son panier dans ton application (sans lien externe) ; tu vois le détail, tu paies ou tu refuses avec un mot. Sans réponse, il expire après 7 jours.'))}
            {point('truck', t('Qui paie la livraison : toi, toujours, par défaut. Si ton proche a demandé la livraison chez lui, tu peux lui laisser le supplément domicile, payé à la remise, seulement si la valeur des articles couvre la garantie ; sinon c’est toi.'))}
            <div className="links">
              <Link to={chemin('espace-diaspora')}>{t('Espace diaspora')}</Link>
              <Link to={chemin('paniers-proches')}>{t('À payer pour mes proches')}</Link>
            </div>
          </div>

          {/* Ce qu'il faut */}
          <div className="card vedette" id="di-faut">
            <h3 className="cl11-k">{t('Ce qu’il faut pour commander')}</h3>
            <div className="kv">
              <span className="k">{t('Un lien famille actif')}</span>
              <span className="v">{t('accepté par ton proche')}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Un proche joignable')}</span>
              <span className="v">{t('son numéro +237 et son relais')}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Un panier')}</span>
              <span className="v">{t('au moins un article')}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Une carte valide à ton nom')}</span>
              <span className="v">{t('Visa ou Mastercard (3-D Secure), Apple Pay, Google Pay')}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Par paiement')}</span>
              <span className="v">{tf('{m} F au plus, frais compris', { m: F(PLAFOND_CARTE) })}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Par mois (du 1er à la fin du mois)')}</span>
              <span className="v">{tf('{m} F au plus', { m: F(PLAFONDS_DIASPORA.mois) })}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Proches reliés')}</span>
              <span className="v">{tf('{n} au plus', { n: PLAFONDS_DIASPORA.liens })}</span>
            </div>
            <details className="more mt8">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
                <span className="grow">{t('Si une condition manque')}</span>
                <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
              </summary>
              <div className="more-b">
                <p>{t('Pas encore de proche relié : « Relier un proche » te guide (code famille ou invitation).')}</p>
                <p>{t('Invitation en attente : tu pourras commander dès qu’il accepte.')}</p>
                <p>{t('Lien retiré ou refusé : plus aucune commande possible par ce lien ; rien n’est débité.')}</p>
                <p>{t('Panier vide : la page te propose de découvrir les produits.')}</p>
                <p>{t('Plafond atteint : le paiement est bloqué avant ta banque ; retire des articles ou attends le mois suivant.')}</p>
                <p>{t('Carte refusée ou mal tapée : le champ te dit quoi corriger ; rien n’est débité.')}</p>
                <p>{t('Paiement refusé par le contrôle de cohérence : la raison s’affiche, rien n’est débité, et le support peut vérifier avec toi.')}</p>
              </div>
            </details>
          </div>

          {/* Contrôle de chaque paiement (COHERENCE_DIASPORA) */}
          <div className="card" id="di-controle">
            <h3 className="cl11-k">{t('Le contrôle de chaque paiement')}</h3>
            <p className="t13 c2">{t('Avant ta banque, chaque commande est comparée à ton compte et à tes habitudes :')}</p>
            {point('credit-card', t('Pays de la carte : lu dans ses premiers chiffres, sinon le pays d’émission que tu indiques. Il doit être celui de ton compte, donc de ton numéro vérifié.'))}
            {point('trending-up', tf('Montant : plus de {x} fois la moyenne de tes {n} dernières commandes, ou plus de {m} F pour un premier achat.', { x: COHERENCE_DIASPORA.MONTANT_X, n: COHERENCE_DIASPORA.HABITUDE_N, m: F(COHERENCE_DIASPORA.PREMIER_MAX) }))}
            {point('clock', tf('Rythme : {n} commandes ou plus déjà payées dans les dernières {h} heures.', { n: COHERENCE_DIASPORA.RAPPROCHEES, h: COHERENCE_DIASPORA.FENETRE_H }))}
            <div className="kv mt8">
              <span className="k">{t('Rien d’inhabituel')}</span>
              <span className="v">{t('accepté : 3-D Secure seul')}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Un élément inhabituel')}</span>
              <span className="v">{t('3-D Secure + code SMS à ton numéro')}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Deux éléments ou plus')}</span>
              <span className="v">{t('refusé, rien n’est débité')}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Carte émise au Cameroun ou dans un pays non accepté')}</span>
              <span className="v">{t('refusé')}</span>
            </div>
            <div className="kv">
              <span className="k">{tf('{n} commandes ou plus en {h} heures', { n: COHERENCE_DIASPORA.REFUS_RAPPROCHEES, h: COHERENCE_DIASPORA.FENETRE_H })}</span>
              <span className="v">{t('refusé, réessaie plus tard')}</span>
            </div>
            <p className="t12 c3">{t('Un refus affiche toujours sa raison. Une erreur ? Le support vérifie avec toi et peut débloquer le paiement.')}</p>
            <div className="links">
              <Link to={chemin('aide')}>{t('Contacter le support')}</Link>
            </div>
          </div>

          {/* Au Cameroun */}
          <div className="card" id="di-cameroun">
            <h3 className="cl11-k">{t('Au Cameroun : ce que voit ton proche')}</h3>
            {[
              t('Ta demande, avec ton prénom et ton pays : il accepte en choisissant son relais, ou il refuse. Ton lien d’invitation s’ouvre chez lui avec le code déjà rempli.'),
              t('Dans son compte, il garde son relais et décide si tu peux le faire livrer chez lui ; son adresse ne te sort jamais.'),
              t('Les commandes que tu lui envoies, déjà payées : il n’a rien à payer, sauf le supplément domicile si tu le lui laisses quand il a demandé la livraison chez lui.'),
              t('Il peut t’envoyer son panier à payer depuis son application, et l’annuler tant que tu n’as pas payé ; il est prévenu quand tu paies ou refuses.'),
              t('Son code de retrait par SMS quand le colis arrive ; lui seul le reçoit.'),
              t('Il peut retirer le lien à tout moment, sans justification ; le lien apparaît alors comme retiré dans tes proches.'),
              t('Il ne voit ni ta carte, ni ton adresse, ni ton numéro.'),
            ].map((x) => point('smartphone', x))}
            <div className="links">
              <Link to={chemin('proches')}>{t('Mes proches')}</Link>
            </div>
          </div>

          {/* Sécurité et loi */}
          <div className="card" id="di-loi">
            <h3 className="cl11-k">{t('Tes données, ton argent et la loi')}</h3>
            {point('handshake', t('Consentement : aucun lien sans l’accord du proche (son code famille ou son acceptation). Il peut le retirer, toi aussi.'))}
            {point('eye-off', t('Données réduites au nécessaire : le payeur voit le prénom et le quartier du relais ; le proche voit le prénom et le pays du payeur.'))}
            {point('user-x', t('Retirer le lien : les commandes déjà payées continuent jusqu’au retrait ; plus aucune nouvelle commande.'))}
            {point('archive', t('Conservation : les paiements et factures sont gardés le temps exigé par la loi ; le reste est effacé quand tu supprimes ton compte.'))}
            {point('shield-check', tf('Fraude et blanchiment : {p} F par paiement, {m} F par mois, {n} proches au plus ; numéro vérifié par code SMS, e-mail vérifié par Google, Apple ou un code ; pays de la carte comparé à celui du compte et du numéro ; un achat inhabituel demande un code SMS en plus ou est refusé.', { p: F(PLAFONDS_DIASPORA.paiement), m: F(PLAFONDS_DIASPORA.mois), n: PLAFONDS_DIASPORA.liens }))}
            {point('package', t('Des marchandises seulement : BelivaY ne transfère jamais d’argent liquide et ne crédite aucun portefeuille.'))}
            {point('rotate-ccw', t('Remboursement : toujours sur la carte qui a payé, jamais en espèces ni au proche.'))}
            <div className="links">
              <Link to={chemin('legal-doc', { d: 'cgu' })}>{t('Conditions d’utilisation')}</Link>
              <Link to={chemin('legal-doc', { d: 'confidentialite' })}>{t('Politique de confidentialité')}</Link>
            </div>
          </div>

          <details className="more">
            <summary>
              <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Puis-je payer sans compte diaspora ?')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <p>{t('Oui, une fois : ton proche au Cameroun t’envoie son panier par un lien ; tu paies par carte, sans compte. Le compte diaspora sert à commander toi-même, quand tu veux, et à suivre toutes tes commandes.')}</p>
            </div>
          </details>
          <details className="more">
            <summary>
              <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Et si l’article manque ou pose problème ?')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <p>{t('Ton argent reste bloqué jusqu’au retrait. Ton proche a 7 jours après le retrait pour signaler un problème ; un remboursement revient sur ta carte.')}</p>
            </div>
          </details>

          <div className="btns mt16">
            {session.connecte ? (
              <Link to={chemin('proches')} className="btn primary">
                <Icone nom="users" taille={18} />
                <span>{t('Mes proches')}</span>
              </Link>
            ) : (
              <Link to={chemin('inscription-diaspora')} className="btn primary">
                <Icone nom="globe" taille={18} />
                <span>{t('S’inscrire depuis l’étranger')}</span>
              </Link>
            )}
          </div>
          {!session.connecte && (
            <div className="links">
              <Link to={chemin('connexion')}>{t('J’ai déjà un compte')}</Link>
            </div>
          )}
        </Rangee>
      </Rangee>
    </Ecran>
  )
}

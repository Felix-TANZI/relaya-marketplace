// Feuilles de cas du comptoir (pas de nouvelles pages) : client sans téléphone ou code oublié (R50, R66, DP-26, R89),
// colis introuvable, coupure de réseau ou de courant (ARL-03 : codes vérifiés sur le téléphone, actions rejouées),
// fermeture imprévue (R37, DP-42, ARL-20), commande à payer au comptoir (R42), changement de relais, capacité à 90 %
// (R41 : bandeau et effet). Chaque feuille : ce qu'on fait, dans l'ordre, en phrases courtes ; un lien vers l'écran
// qui agit. Rien n'est inventé : ce que la règle ne dit pas est noté dans logique-metier/REPRISES-FIN.md.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import '../../composants/comptoir/comptoir.css'
import { PARAMETRES } from '../../calculs/registre'
import { chemin } from '../../config/pages'
import { useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Recherche } from './commun'
import { REGLES } from './regles'

const SEUIL = PARAMETRES.relais.capaciteSeuilPct

type Cas = 'code' | 'introuvable' | 'coupure' | 'fermeture' | 'comptoir' | 'relais'
const CAS: { id: Cas; titre: string; icone: string; ton?: string }[] = [
  { id: 'code', titre: 'Code oublié ou pas de téléphone', icone: 'r-cadenas' },
  { id: 'introuvable', titre: 'Colis introuvable', icone: 'package-search' },
  { id: 'coupure', titre: 'Réseau ou courant coupé', icone: 'wifi-off' },
  { id: 'fermeture', titre: 'Je dois fermer', icone: 'r-fermeture' },
  { id: 'comptoir', titre: 'À payer au comptoir', icone: 'r-carte-paiement' },
  { id: 'relais', titre: 'Changer de relais', icone: 'r-lieu' },
]

function Etapes({ children }: { children: ReactNode }) {
  return <ol className="cpt-etapes">{children}</ol>
}

function Contenu({ cas }: { cas: Cas }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const file = useFile()
  const attente = file?.actions.filter((x) => x.etat === 'en_attente').length ?? 0
  switch (cas) {
    case 'code':
      return (
        <>
          <h2>{t('Code oublié ou pas de téléphone')}</h2>
          <Etapes>
            <li>{t('Le client rouvre son application : son QR et ses 6 chiffres sont dans sa commande.')}</li>
            <li>{tf('Sans application : le code est dans son SMS. Il peut redemander un SMS, {n} fois par 24 h au plus.', { n: REGLES.codeRenvois })}</li>
            <li>{t('Sans téléphone : une personne qui a son code peut retirer à sa place. Vous saisissez son nom et son numéro.')}</li>
            <li>{t('Sans code : pas de remise. Le client repasse avec son code.')}</li>
          </Etapes>
          <p className="cpt-note">{tf('Vous ne voyez jamais le code et ne pouvez pas le redonner. Après {e} codes faux, ses colis sont bloqués {h} h : le client redemande un code dans son application.', { e: REGLES.codeEssais, h: REGLES.codeBlocageH })}</p>
        </>
      )
    case 'introuvable':
      return (
        <>
          <h2>{t('Colis introuvable')}</h2>
          <Etapes>
            <li>{t('Regardez l’emplacement affiché, puis les cases voisines.')}</li>
            <li>{t('Regardez au comptoir : un colis sans place y est rangé en attendant.')}</li>
            <li>{t('Cherchez sa référence dans le stock.')}</li>
            <li>{t('Toujours rien : ne remettez jamais un autre colis. Écrivez au support avec la référence.')}</li>
          </Etapes>
          <Link className="cpt-second" to={chemin('stock')}>
            <Icone nom="r-recherche" taille={18} />
            {t('Chercher dans le stock')}
          </Link>
          <Link className="cpt-second" to={chemin('messagerie', { sujet: 'colis-introuvable' })}>
            <Icone nom="r-message" taille={18} />
            {t('Écrire au support')}
          </Link>
        </>
      )
    case 'coupure':
      return (
        <>
          <h2>{t('Réseau ou courant coupé')}</h2>
          <div className={enLigne ? 'cpt-ok' : 'cpt-attente'} role="status">
            <Icone nom={enLigne ? 'check' : 'wifi-off'} taille={18} />
            {enLigne ? t('Réseau revenu') : t('Hors connexion : vous pouvez continuer')}
            {attente > 0 && ' · ' + tf('{n} en attente d’envoi', { n: attente })}
          </div>
          <Etapes>
            <li>{t('Les codes des colis déjà au relais sont gardés sur le téléphone : le scan marche sans réseau.')}</li>
            <li>{tf('Remise avec garde en espèces et photo : permise, {n} par jour au plus.', { n: REGLES.horsLigneRemises })}</li>
            <li>{t('Paiement Mobile Money au comptoir : impossible sans réseau.')}</li>
            <li>{t('Au retour du réseau, tout part tout seul, avec l’heure réelle.')}</li>
          </Etapes>
          <p className="cpt-note">{t('Courant coupé : gardez le téléphone chargé. Panne générale annoncée par BelivaY : registre papier.')}</p>
          <Link className="cpt-second" to={chemin('accueil', { etat: 'hors-ligne' })}>
            <Icone nom="r-historique" taille={18} />
            {t('Voir les opérations en attente')}
          </Link>
          <Link className="cpt-second" to={chemin('aide', { sujet: 'mode-papier' })}>
            <Icone nom="r-document" taille={18} />
            {t('Registre papier')}
          </Link>
        </>
      )
    case 'fermeture':
      return (
        <>
          <h2>{t('Je dois fermer')}</h2>
          <Etapes>
            <li>{t('Déclarez la fermeture avant de fermer : les clients sont prévenus.')}</li>
            <li>{t('Pendant la fermeture déclarée, la garde s’arrête et la date de renvoi recule d’autant.')}</li>
            <li>{t('Fermé plus de 24 h : le client peut choisir un autre relais, sans frais.')}</li>
          </Etapes>
          <p className="cpt-note">{t('Un livreur qui trouve le relais fermé sans déclaration ouvre un incident.')}</p>
          <Link className="cpt-action" to={chemin('fermeture')}>
            <Icone nom="r-fermeture" taille={20} />
            {t('Déclarer une fermeture')}
          </Link>
        </>
      )
    case 'comptoir':
      return (
        <>
          <h2>{t('Commande à payer au comptoir')}</h2>
          <p className="cpt-note">{t('Le client paie ses articles par Mobile Money sur son téléphone, jamais en espèces. Son code s’affiche après le paiement.')}</p>
          <div className="pr05">
            <Recherche />
          </div>
        </>
      )
    default:
      return (
        <>
          <h2>{t('Le client veut changer de relais')}</h2>
          <Etapes>
            <li>{t('Il change de relais dans son application.')}</li>
            <li>{tf('Colis déjà arrivé : {m} F à sa charge, payés dans l’application.', { m: F(REGLES.transfert.S) })}</li>
            <li>{t('Le colis passe dans « À faire partir » ; son ancien code ne marche plus.')}</li>
          </Etapes>
        </>
      )
  }
}

function FeuilleCas({ cas }: { cas: Cas }) {
  const { t } = usePreferences()
  const f = useFeuille('cas-' + cas)
  const c = CAS.find((x) => x.id === cas)!
  return (
    <Feuille ouverte={f.ouverte} fermer={f.fermer} titre={t(c.titre)}>
      <div className="cpt-feuille">
        <Contenu cas={cas} />
      </div>
    </Feuille>
  )
}

/** Pastilles « Un imprévu ? » du comptoir et leurs feuilles. `seulement` : sous-ensemble (réception). */
export function CasDuComptoir({ seulement }: { seulement?: Cas[] }) {
  const { t } = usePreferences()
  const liste = CAS.filter((c) => !seulement || seulement.includes(c.id))
  return (
    <section aria-labelledby="cpt-cas" className="cpt-feuille">
      <h2 id="cpt-cas" className="cpt-titre-petit">
        {t('Un imprévu ?')}
      </h2>
      <div className="cpt-pastilles">
        {liste.map((c) => (
          <BoutonCas key={c.id} cas={c.id} />
        ))}
      </div>
      {liste.map((c) => (
        <FeuilleCas key={c.id} cas={c.id} />
      ))}
    </section>
  )
}

function BoutonCas({ cas }: { cas: Cas }) {
  const { t } = usePreferences()
  const f = useFeuille('cas-' + cas)
  const c = CAS.find((x) => x.id === cas)!
  return (
    <button type="button" className="cpt-pastille" onClick={() => (signal('toucher'), f.ouvrir())}>
      <Icone nom={c.icone} taille={16} />
      {t(c.titre)}
    </button>
  )
}

/** R41 : relais rempli au seuil (90 %) : bandeau rouge et feuille de l'effet (plus de nouveaux paquets). */
export function BandeauCapacite() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const f = useFeuille('cas-capacite')
  const r = s.relais
  if (!r || !r.sature) return null
  const taux = r.placesDeclarees ? Math.round((r.placesOccupees * 100) / r.placesDeclarees) : 100
  return (
    <>
      <button type="button" className="cpt-bandeau" onClick={() => (signal('alerteCapacite'), f.ouvrir())}>
        <Icone nom="triangle-alert" taille={20} />
        <span className="r-grow">{tf('Relais plein à {taux} % : plus de nouveaux paquets', { taux })}</span>
        <Icone nom="r-chevron-droite" taille={18} />
      </button>
      <Feuille ouverte={f.ouverte} fermer={f.fermer} titre={t('Relais plein')}>
        <div className="cpt-feuille">
          <h2>{tf('Relais plein à {taux} %', { taux })}</h2>
          <p className="cpt-note">{tf('À {s} % de vos places, BelivaY ne vous envoie plus de nouveaux paquets et les clients choisissent un autre relais. Les colis déjà annoncés arrivent quand même.', { s: SEUIL })}</p>
          <Etapes>
            <li>{t('Remettez les colis prêts : chaque retrait libère une place.')}</li>
            <li>{t('Faites partir les renvois et les retours à la prochaine collecte.')}</li>
            <li>{t('Vérifiez vos étagères : une place libre doit être déclarée libre.')}</li>
          </Etapes>
          <Link className="cpt-action" to={chemin('departs')}>
            <Icone nom="r-camion" taille={20} />
            {t('Voir les colis à faire partir')}
          </Link>
          <Link className="cpt-second" to={chemin('inventaire')}>
            <Icone nom="r-pile" taille={18} />
            {t('Inventaire des étagères')}
          </Link>
        </div>
      </Feuille>
    </>
  )
}

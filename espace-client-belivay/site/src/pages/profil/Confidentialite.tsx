// « Confidentialité et données » (DP-54) : tout ce qui touche aux données d'un compte BelivaY, au même endroit :
// ce qui est gardé et pourquoi, qui voit quoi, télécharger ses données, consentements (mesure d'audience,
// suggestions, partenaires : jamais), nom donné au retrait, historique effaçable, durées de conservation,
// documents, demande au support, suppression du compte.
// Ce qu'il faut au client (DP-54) : la version des conditions acceptée et sa date (avec une nouvelle version à
// accepter, le lien pour la lire), ce que le fichier téléchargé contient, et le délai réel du support (DP-12).
import { useEffect, useState } from 'react'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Aide, Bouton, Interrupteur, Ligne, Note, Section } from '../../composants/socle'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { enregistrerFichier } from '../../donnees/pdf'
import { source, type DonneesConfidentialite, type DonneesLegal } from '../../donnees/source'
import { dateLongue } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { Bloc, EcranCompte } from '../CL-13/Larges'

// Qui voit quoi (politique de confidentialité, version 1.0).
const QUI = [
  { icone: 'store', qui: 'Le vendeur', voit: 'Ta commande et ton relais en code. Jamais ton nom, ton numéro ni ton adresse.' },
  { icone: 'map-pin', qui: 'Le gérant du relais', voit: 'Le nom donné au retrait et ton code, au moment du retrait.' },
  { icone: 'truck', qui: 'Le livreur (à domicile)', voit: 'Ton prénom, tes repères et ta position, pendant la livraison. Il t’appelle par un appel masqué.' },
  { icone: 'headset', qui: 'Le support BelivaY', voit: 'Tes commandes et tes messages, seulement quand tu écris ou qu’un dossier est ouvert.' },
]
// Ce que le compte garde, et pourquoi.
const GARDE = [
  ['user-round', 'Profil', 'Prénom, nom, photo, e-mail : pour te reconnaître et te saluer.'],
  ['smartphone', 'Numéro vérifié', 'Pour payer, recevoir ton code de retrait et te connecter.'],
  ['house', 'Relais et adresses', 'Pour livrer au bon endroit.'],
  ['wallet', 'Paiements et factures', 'Journal des paiements, exigé par la loi.'],
  ['messages-square', 'Messages', 'Avec le support et les dossiers.'],
  ['search', 'Recherches et produits vus', 'Pour tes suggestions, si tu le permets.'],
]

export function Confidentialite() {
  const { t, tf, mesure, setMesure, langue } = usePreferences()
  const [d, setD] = useState<DonneesConfidentialite | null>(null)
  const [legal, setLegal] = useState<DonneesLegal | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [nomOuvert, setNomOuvert] = useState(false)
  const [nom, setNom] = useState('')
  const [effacer, setEffacer] = useState(false)
  const charger = () => source.confidentialite().then(setD)
  useEffect(() => {
    charger()
    source.legal().then(setLegal)
  }, [])
  if (!d) return null

  // Export : toutes les données du compte, lisibles par une machine (portabilité).
  const telecharger = async () => {
    const [compte, adresses, moyens, cartes, factures, securite, notifications] = await Promise.all([
      source.compte(),
      source.adresses(),
      source.moyensPaiement(),
      source.cartes(),
      source.factures(),
      source.securite(),
      source.notifications(),
    ])
    const s = await source.session()
    const donnees = {
      exportLe: new Date().toISOString(),
      profil: s.client && { prenom: s.client.prenom, nom: s.client.nom, email: s.client.email, numero: s.client.numeroMasque, connexion: s.client.connexion },
      compte,
      adresses: adresses.adresses.map(({ photo, ...a }) => ({ ...a, photo: photo ? 'jointe' : null })),
      moyensDePaiement: { mobileMoney: moyens, cartes },
      factures,
      securite: { methodes: securite.methodes, appareils: securite.appareils, connexions: securite.historique },
      notifications: notifications.choix,
      confidentialite: { ...d, mesureAudience: mesure },
    }
    enregistrerFichier(new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' }), 'BelivaY-mes-donnees.json')
    setMessage(t('Tes données sont enregistrées sur le téléphone (fichier JSON).'))
  }
  const regler = (c: Parameters<typeof source.reglerConfidentialite>[0], texte: string) => source.reglerConfidentialite(c).then(() => (charger(), setMessage(t(texte))))

  const fixes = (
    <>
      <Feuille ouverte={nomOuvert} fermer={() => setNomOuvert(false)} titre={t('Nom donné au retrait')}>
        <h2 className="pg-t" style={{ fontSize: 19 }}>
          {t('Nom donné au retrait')}
        </h2>
        <p className="pg-s">{t('Le gérant du relais voit ce nom à la place de ton nom complet. Ton code reste ce qui compte.')}</p>
        <div className="fld">
          <label htmlFor="cf-nom">{t('Nom au comptoir')}</label>
          <div className="inp">
            <Icone nom="user-round" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input id="cf-nom" maxLength={30} value={nom} placeholder={t('Ex. : Carine M.')} onChange={(e) => setNom(e.target.value)} />
          </div>
        </div>
        <div className="mt16">
          <Bouton icone="check" onClick={() => (setNomOuvert(false), regler({ nomRetrait: nom.trim() || null }, 'Nom au retrait enregistré.'))}>
            {t('Enregistrer')}
          </Bouton>
        </div>
        {d.nomRetrait && (
          <div className="mt10">
            <Bouton genre="ghost" onClick={() => (setNomOuvert(false), regler({ nomRetrait: null }, 'Le gérant verra de nouveau ton nom complet.'))}>
              {t('Utiliser mon nom complet')}
            </Bouton>
          </div>
        )}
      </Feuille>
      <Feuille ouverte={effacer} fermer={() => setEffacer(false)} titre={t('Effacer l’historique')}>
        <h2 className="pg-t" style={{ fontSize: 19 }}>
          {t('Effacer l’historique')}
        </h2>
        <p className="pg-s">{t('Tes commandes, factures et messages ne sont pas touchés.')}</p>
        <div className="mt16">
          <Bouton genre="secondary" onClick={() => source.effacerHistorique('recherches').then(() => (setEffacer(false), charger(), setMessage(t('Recherches effacées.'))))}>
            {tf('Mes recherches ({n})', { n: d.historique.recherches })}
          </Bouton>
        </div>
        <div className="mt10">
          <Bouton genre="secondary" onClick={() => source.effacerHistorique('vus').then(() => (setEffacer(false), charger(), setMessage(t('Produits vus effacés.'))))}>
            {tf('Produits vus ({n})', { n: d.historique.vus })}
          </Bouton>
        </div>
        <div className="mt10">
          <Bouton genre="danger" icone="trash-2" onClick={() => source.effacerHistorique('tout').then(() => (setEffacer(false), charger(), setMessage(t('Historique effacé.'))))}>
            {t('Tout effacer')}
          </Bouton>
        </div>
      </Feuille>
    </>
  )

  return (
    <EcranCompte route="confidentialite" fixes={fixes}>
      <Styles id="f16ded0d4c" />
      <p className="cl13-intro">{t('Tes données servent à tes commandes. Elles ne sont jamais vendues, ni montrées aux vendeurs.')}</p>
      {message && (
        <Note ton="green" icone="circle-check">
          {message}
        </Note>
      )}

      <Bloc classe="c13-g2">
      <Bloc classe="c13-k">
      <div className="card vedette">
        <div className="cl13-kh">
          <span className="kick">{t('Tes choix')}</span>
        </div>
        <Ligne
          icone="chart-column"
          titre={t('Mesure d’audience')}
          sous={t('Comment l’application est utilisée, sans publicité. Éteinte tant que tu ne l’allumes pas.')}
          droite={<Interrupteur actif={mesure} aria={t('Mesure d’audience')} onClick={() => (setMesure(!mesure), setMessage(t(mesure ? 'Mesure d’audience éteinte.' : 'Mesure d’audience allumée.')))} />}
        />
        <Ligne
          icone="sparkles"
          titre={t('Suggestions pour toi')}
          sous={t('Selon ce que tu regardes et achètes. Éteintes : les suggestions sont les mêmes pour tous.')}
          droite={
            <Interrupteur
              actif={d.personnalisation}
              aria={t('Suggestions pour toi')}
              onClick={() => regler({ personnalisation: !d.personnalisation }, d.personnalisation ? 'Suggestions personnalisées éteintes.' : 'Suggestions personnalisées allumées.')}
            />
          }
        />
        <Ligne icone="ban" titre={t('Publicité d’autres entreprises')} sous={t('Jamais : aucune donnée vendue ni partagée pour de la publicité.')} droite={<Interrupteur actif={false} verrou aria={t('Publicité d’autres entreprises')} />} />
        <Ligne icone="bell" titre={t('Notifications et promotions')} sous={t('Ce que tu reçois, et par quel canal')} vers={chemin('notifs-reglages')} />
      </div>

      <Section titre={t('Qui voit quoi')} />
      <div className="card tight">
        {QUI.map((q) => (
          <Ligne key={q.qui} icone={q.icone} titre={t(q.qui)} sous={t(q.voit)} />
        ))}
        <Ligne
          icone="id-card"
          titre={t('Nom donné au retrait')}
          sous={d.nomRetrait ? tf('« {n} » à la place de ton nom complet', { n: d.nomRetrait }) : t('Ton nom complet')}
          droite={
            <button type="button" className="btn ghost sm" style={{ width: 'auto' }} onClick={() => (setNom(d.nomRetrait ?? ''), setNomOuvert(true))}>
              {t('Changer')}
            </button>
          }
        />
      </div>

      </Bloc>
      <Bloc classe="c13-k">
      <Section titre={t('Ce que ton compte garde')} />
      <div className="card tight">
        {GARDE.map(([i, titre, sous]) => (
          <Ligne key={titre} icone={i} titre={t(titre)} sous={t(sous)} />
        ))}
      </div>
      <Aide icone="clock">{t('Les factures et le journal des paiements sont gardés le temps exigé par la loi, même après la suppression du compte ; tout le reste est effacé.')}</Aide>

      </Bloc>
      </Bloc>
      <div className="card vedette">
        <div className="cl13-kh">
          <span className="kick">{t('Tes données')}</span>
        </div>
        <Ligne
          icone="download"
          titre={t('Télécharger mes données')}
          sous={t('Profil, adresses, paiements, factures, connexions, réglages : un fichier à garder ou à emporter.')}
          droite={
            <button type="button" className="btn ghost sm" style={{ width: 'auto' }} onClick={telecharger}>
              {t('Télécharger')}
            </button>
          }
        />
        <Ligne
          icone="history"
          titre={t('Historique')}
          sous={tf('{r} recherches · {v} produits vus', { r: d.historique.recherches, v: d.historique.vus })}
          droite={
            <button type="button" className="btn ghost sm" style={{ width: 'auto' }} onClick={() => setEffacer(true)}>
              {t('Effacer')}
            </button>
          }
        />
        <Ligne icone="pencil" titre={t('Corriger une information')} sous={t('Profil, e-mail, numéro')} vers={chemin('profil')} />
        <Ligne icone="shield-check" titre={t('Numéro et connexion')} sous={t('Appareils connectés, mot de passe, dernières connexions')} vers={chemin('securite')} />
      </div>

      <Bloc classe="c13-g2">
      <Bloc classe="c13-k">
      <Section titre={t('Documents et questions')} />
      <div className="card tight">
        <Ligne icone="lock" titre={t('Politique de confidentialité')} sous={t('En langage simple, en français et en anglais')} vers={chemin('legal-doc', { d: 'confidentialite' })} />
        <Ligne icone="cookie" titre={t('Cookies et mesure d’audience')} sous={t('Ce qui est nécessaire, ce qui dépend de ton accord')} vers={chemin('legal-doc', { d: 'cookies' })} />
        {legal?.acceptee && (
          <Ligne
            icone="file-check"
            ton={legal.changement ? 'amber' : 'green'}
            titre={tf('Conditions acceptées · version {v}', { v: legal.version })}
            sous={
              legal.changement
                ? tf('Le {d}. La version {n} est à lire et à accepter.', { d: dateLongue(legal.acceptee, langue), n: legal.changement.version })
                : tf('Le {d}, à ton inscription ou à la dernière mise à jour.', { d: dateLongue(legal.acceptee, langue) })
            }
            vers={chemin('legal')}
          />
        )}
        <Ligne icone="messages-square" titre={t('Une question sur tes données')} sous={t('Écris au support : réponse sous 2 h, de 7 h à 21 h')} vers={chemin('fil', { id: 'support', st: 'nouveau' })} />
      </div>

      </Bloc>
      <Bloc classe="c13-k">
      <Section titre={t('Supprimer mon compte')} />
      <div className="card tight">
        <Ligne icone="user-x" ton="red" titre={t('Supprimer mon compte')} sous={t('Possible quand rien n’est en cours ; confirmé par un code SMS')} vers={chemin('supprimer')} />
      </div>
      </Bloc>
      </Bloc>
    </EcranCompte>
  )
}

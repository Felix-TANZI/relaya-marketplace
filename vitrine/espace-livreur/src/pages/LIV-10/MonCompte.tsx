// Mon compte (page ajoutée, ouverte depuis Moi et les Réglages) : le kit « compte » partagé par les quatre
// applications (site/src/compte). Le livreur est invité par son entreprise (DP-66, DP-67) : l'invitation reste la porte
// d'entrée, mais il règle lui-même sa photo, son numéro (code SMS au nouveau numéro), son e-mail (code à la nouvelle
// adresse), son mot de passe (connexion par e-mail) et son compte Google. Pas de suppression de compte : le départ
// est une demande à l'entreprise (Moi, « Demander à quitter »). Couleur : l'accent vert du livreur.
// Mode API : le kit « compte » partagé n'a pas encore son adaptateur au serveur ; la page montre le compte tel que le
// serveur le connaît (nom, numéro masqué, entreprise, photo vérifiée) et mène à ce qui se règle vraiment (PIN, langue,
// nouvelle photo demandée, départ), sans aucune donnée de démonstration.
import { useNavigate } from 'react-router-dom'
import { env } from '@client/config/env'
import { SectionsCompte } from '@client/compte/Compte'
import { Kit } from '@client/compte/socle'
import { Ecran } from '../../composants/coque'
import { Li, Note, Sec } from '../../composants/proto'
import { chemin } from '../../config/pages'
import { departSerge } from '../../demo/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

/** Mode API : le compte tel que le serveur le connaît, et les réglages qui s'y font vraiment. */
function CompteServeur() {
  const { t } = usePreferences()
  const s = useSession()
  const p = useLecture(() => source.moi.profil(), [])
  const l = s.livreur
  return (
    <Ecran route="mon-compte">
      <div style={{ padding: '4px 16px 24px' }}>
        <Sec titre={t('Mon compte')} />
        <div className="card tight">
          <Li icone="circle-user-round" ton="acc" t={l ? `${l.prenom} ${l.nom}` : '—'} s={l?.entreprise ?? ''} chev={false} />
          <Li icone="smartphone" ton="acc" t={t('Numéro de téléphone')} s={p.donnees?.numeroMasque ?? '…'} chev={false} />
        </div>
        <Note ton="acc" icone="shield-check">
          {t('Votre photo est votre identité vérifiée : elle ne change que si votre entreprise vous demande une nouvelle photo. Votre numéro est votre clé de connexion : un nouveau téléphone se lie avec le code SMS.')}
        </Note>
        <div className="card tight mt12">
          <Li icone="settings" ton="ink" t={t('Réglages')} s={t('PIN, sons, langue, thème')} vers={chemin('reglages')} />
          <Li icone="id-card" ton="acc" t={t('Mes pièces et ma photo')} s={t('Pièces, nouvelle photo demandée, départ')} vers={chemin('moi')} />
        </div>
      </div>
    </Ecran>
  )
}

export default function MonCompte() {
  return env.source === 'api' ? <CompteServeur /> : <MonCompteDemo />
}

function MonCompteDemo() {
  const naviguer = useNavigate()
  return (
    <Ecran route="mon-compte">
      <div style={{ padding: '4px 16px 24px' }}>
        <Kit couleur="#15803D" texte="var(--acc-txt)">
          <SectionsCompte
            app="livreur"
            depart={departSerge()}
            photoVuePar="Le vendeur et le gérant du relais voient votre photo à la remise ; votre entreprise est prévenue de chaque changement."
            fin={{ genre: 'depart', texte: 'Quitter mon entreprise : faire une demande', vers: () => naviguer(chemin('moi', { sheet: 'depart' })) }}
          />
        </Kit>
      </div>
    </Ecran>
  )
}

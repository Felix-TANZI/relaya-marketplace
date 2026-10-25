// Portrait de la personne connectée : sa photo de profil (Mon compte) si elle en a une, sinon ses initiales. Relu à
// chaque changement de photo : l'en-tête, la barre latérale, le profil et la connexion suivent aussitôt.
import { usePhoto } from '../donnees/mon-compte'

export function Portrait({ id, initiales, photo }: { id: string | null | undefined; initiales: string | undefined; photo?: string | null }) {
  const p = usePhoto(id)
  const src = photo !== undefined ? photo : p
  return src ? <img className="portrait" src={src} alt="" /> : <>{initiales}</>
}

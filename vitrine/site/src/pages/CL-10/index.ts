// Écrans de CL-10 construits (outils/ecran.mjs).
import { Notifications } from './Notifications'
import { NotifsReglages } from './NotifsReglages'
import { Garde } from './Garde'
import { Push } from './Push'
import { Sms } from './Sms'
import { LienCourt } from './LienCourt'

export const ECRANS = {
  "notifications": Notifications,
  "notifs-reglages": NotifsReglages,
  "garde": Garde,
  "push": Push,
  "sms": Sms,
  "lien-court": LienCourt,
}

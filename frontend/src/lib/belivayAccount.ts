// frontend/src/lib/belivayAccount.ts
//
// Compte BelivaY du client : solde interne alimenté par dépôt Mobile Money, et
// utilisé pour régler l'abonnement sans ressaisir ses coordonnées à chaque fois.
//
// Le stockage est local (même approche que lib/favorites, lib/orderDisputes) :
// aucun endpoint de portefeuille client n'existe encore côté API. Toute la
// logique métier — maturation du dépôt, solde disponible, débit de
// l'abonnement, échéance — vit donc ici, à un seul endroit, prête à être
// rebranchée sur le backend en remplaçant read/write.

const STORAGE_KEY = "belivay_account";
export const ACCOUNT_UPDATED_EVENT = "belivay-account-updated";

/** Le crédit d'un dépôt est annoncé « sous 24–72h » dans l'interface. */
const DEPOSIT_SETTLEMENT_MS = 24 * 60 * 60 * 1000;

export type BelivayProvider = "ORANGE_MONEY" | "MTN_MOMO";
export type DepositStatus = "PENDING" | "CREDITED";
export type BelivayPlanId = "FREE" | "ESSENTIEL" | "PREMIUM";

export const PROVIDER_LABELS: Record<BelivayProvider, string> = {
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
};

/** Comptes officiels BelivaY vers lesquels le client envoie son dépôt. */
export const BELIVAY_RECEIVERS: Record<BelivayProvider, string> = {
  ORANGE_MONEY: "+237 655 000 000",
  MTN_MOMO: "+237 680 000 000",
};

export const MIN_DEPOSIT_XAF = 500;

export interface BelivayPlan {
  id: Exclude<BelivayPlanId, "FREE">;
  name: string;
  priceXaf: number;
  tagline: string;
  perks: string[];
}

export const BELIVAY_PLANS: BelivayPlan[] = [
  {
    id: "ESSENTIEL",
    name: "Essentiel",
    priceXaf: 5900,
    tagline: "Pour acheter sereinement chaque mois",
    perks: [
      "Livraison offerte dès 30 000 FCFA",
      "Support prioritaire sous 12h",
      "Points fidélité x1,5",
    ],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    priceXaf: 9900,
    tagline: "Tous les avantages, sans limite",
    perks: [
      "Livraison offerte sans minimum",
      "Support dédié 24/7",
      "Points fidélité x3 et ventes privées",
    ],
  },
];

export interface BelivayDeposit {
  id: string;
  provider: BelivayProvider;
  /** Numéro expéditeur, au format national à 9 chiffres. */
  senderPhone: string;
  amountXaf: number;
  status: DepositStatus;
  createdAt: string;
  /** Date à laquelle le dépôt devient disponible (createdAt + délai de crédit). */
  maturesAt: string;
  creditedAt?: string;
  reference: string;
}

export interface BelivayCharge {
  id: string;
  plan: Exclude<BelivayPlanId, "FREE">;
  amountXaf: number;
  createdAt: string;
  /** Fin de la période payée. */
  periodEnd: string;
}

interface StoredAccount {
  deposits: BelivayDeposit[];
  charges: BelivayCharge[];
}

export interface BelivayAccount {
  /** Dépôts crédités − abonnements réglés. Utilisable immédiatement. */
  availableXaf: number;
  /** Somme de tous les dépôts crédités, sur toute la vie du compte. */
  totalDepositedXaf: number;
  /** Dépôts déclarés mais pas encore crédités. */
  pendingXaf: number;
  depositCount: number;
  deposits: BelivayDeposit[];
  charges: BelivayCharge[];
  /** Plan en cours, `FREE` si aucun abonnement actif. */
  plan: BelivayPlanId;
  planExpiresAt: string | null;
}

function read(): StoredAccount {
  if (typeof window === "undefined") return { deposits: [], charges: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { deposits: [], charges: [] };
    const parsed = JSON.parse(raw) as Partial<StoredAccount>;
    return {
      deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
      charges: Array.isArray(parsed.charges) ? parsed.charges : [],
    };
  } catch {
    return { deposits: [], charges: [] };
  }
}

function write(account: StoredAccount) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  window.dispatchEvent(new Event(ACCOUNT_UPDATED_EVENT));
}

/**
 * Fait passer à `CREDITED` les dépôts arrivés à maturité. Appelé à chaque
 * lecture : le solde affiché ne peut donc pas être en retard sur l'horloge.
 */
function settle(account: StoredAccount): { account: StoredAccount; changed: boolean } {
  const now = Date.now();
  let changed = false;

  const deposits = account.deposits.map((deposit) => {
    if (deposit.status !== "PENDING") return deposit;
    if (new Date(deposit.maturesAt).getTime() > now) return deposit;
    changed = true;
    return { ...deposit, status: "CREDITED" as const, creditedAt: new Date(now).toISOString() };
  });

  return { account: { ...account, deposits }, changed };
}

function derive(stored: StoredAccount): BelivayAccount {
  const credited = stored.deposits.filter((deposit) => deposit.status === "CREDITED");
  const pending = stored.deposits.filter((deposit) => deposit.status === "PENDING");

  const totalDepositedXaf = credited.reduce((sum, deposit) => sum + deposit.amountXaf, 0);
  const pendingXaf = pending.reduce((sum, deposit) => sum + deposit.amountXaf, 0);
  const spentXaf = stored.charges.reduce((sum, charge) => sum + charge.amountXaf, 0);

  const activeCharge = [...stored.charges]
    .sort((left, right) => new Date(right.periodEnd).getTime() - new Date(left.periodEnd).getTime())
    .find((charge) => new Date(charge.periodEnd).getTime() > Date.now());

  return {
    availableXaf: Math.max(0, totalDepositedXaf - spentXaf),
    totalDepositedXaf,
    pendingXaf,
    depositCount: credited.length,
    deposits: [...stored.deposits].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    charges: [...stored.charges].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    plan: activeCharge ? activeCharge.plan : "FREE",
    planExpiresAt: activeCharge ? activeCharge.periodEnd : null,
  };
}

/** Lecture du compte, dépôts échus crédités au passage. */
export function getBelivayAccount(): BelivayAccount {
  const { account, changed } = settle(read());
  if (changed) write(account);
  return derive(account);
}

/**
 * Force une relecture — le bouton « Actualiser » de la page. Identique à
 * `getBelivayAccount`, mais nommé pour l'intention côté interface.
 */
export function refreshBelivayAccount(): BelivayAccount {
  return getBelivayAccount();
}

export interface DepositInput {
  provider: BelivayProvider;
  senderPhone: string;
  amountXaf: number;
}

/**
 * Déclare un dépôt Mobile Money. Le montant reste « en attente » jusqu'à la
 * confirmation de l'opérateur, matérialisée ici par le délai de crédit annoncé.
 */
export function createBelivayDeposit(input: DepositInput): BelivayDeposit {
  if (!Number.isFinite(input.amountXaf) || input.amountXaf < MIN_DEPOSIT_XAF) {
    throw new Error(`Le dépôt minimum est de ${MIN_DEPOSIT_XAF.toLocaleString("fr-FR")} FCFA.`);
  }

  const now = Date.now();
  const deposit: BelivayDeposit = {
    id: `dep-${now}`,
    provider: input.provider,
    senderPhone: input.senderPhone,
    amountXaf: Math.round(input.amountXaf),
    status: "PENDING",
    createdAt: new Date(now).toISOString(),
    maturesAt: new Date(now + DEPOSIT_SETTLEMENT_MS).toISOString(),
    reference: `BLV-${String(now).slice(-8)}`,
  };

  const current = read();
  write({ ...current, deposits: [deposit, ...current.deposits] });
  return deposit;
}

/**
 * Règle un mois d'abonnement depuis le solde disponible. Lève si le solde ne
 * couvre pas le plan — c'est le point qui rend le dépôt nécessaire.
 */
export function payBelivaySubscription(planId: Exclude<BelivayPlanId, "FREE">): BelivayCharge {
  const plan = BELIVAY_PLANS.find((candidate) => candidate.id === planId);
  if (!plan) throw new Error("Plan inconnu.");

  const account = getBelivayAccount();
  if (account.availableXaf < plan.priceXaf) {
    const missing = plan.priceXaf - account.availableXaf;
    throw new Error(
      `Solde insuffisant : il manque ${missing.toLocaleString("fr-FR")} FCFA. Faites un dépôt d'abord.`,
    );
  }

  const now = Date.now();
  /* Un renouvellement prolonge la période en cours au lieu de l'écraser. */
  const base = account.planExpiresAt ? new Date(account.planExpiresAt).getTime() : now;
  const start = Math.max(base, now);
  const periodEnd = new Date(start);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const charge: BelivayCharge = {
    id: `chg-${now}`,
    plan: planId,
    amountXaf: plan.priceXaf,
    createdAt: new Date(now).toISOString(),
    periodEnd: periodEnd.toISOString(),
  };

  const current = read();
  write({ ...current, charges: [charge, ...current.charges] });
  return charge;
}

export function formatXaf(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}

// frontend/src/lib/evidenceQueue.ts
// File de synchronisation des preuves de garde (photo livreur).
//
// Regle verrouillee (voir memoire projet "gros morceaux") : CAPTURE
// OBLIGATOIRE, TRANSMISSION BEST-EFFORT. Le livreur prend la photo hors
// ligne, l'action de statut n'est jamais bloquee par le reseau — la photo
// est mise en file et synchronisee des que possible, avec un etat visible
// "en attente de synchro".
//
// Stockage : IndexedDB (le blob photo peut peser plusieurs centaines de Ko,
// trop pour localStorage sur plusieurs items en attente).

const DB_NAME = "belivay_evidence_queue";
const STORE_NAME = "pending";
const DB_VERSION = 1;

export interface PendingEvidence {
  id: string;
  endpoint: string; // URL relative de l'API, ex: /api/shipping/my-shipments/12/evidence/
  fields: Record<string, string>; // champs additionnels du formulaire (stage, description, parcel_id...)
  blob: Blob;
  fileName: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueEvidence(entry: Omit<PendingEvidence, "id" | "createdAt" | "attempts">): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record: PendingEvidence = { ...entry, id, createdAt: Date.now(), attempts: 0 };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function listPendingEvidence(): Promise<PendingEvidence[]> {
  try {
    const db = await openDb();
    const items = await new Promise<PendingEvidence[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as PendingEvidence[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return items;
  } catch {
    return [];
  }
}

async function removeEvidence(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function updateEvidence(id: string, patch: Partial<PendingEvidence>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const current = getReq.result as PendingEvidence | undefined;
      if (current) store.put({ ...current, ...patch });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Tente d'envoyer une preuve en attente. Retourne true si elle a ete transmise. */
async function trySend(entry: PendingEvidence): Promise<boolean> {
  const token = localStorage.getItem("access_token");
  const form = new FormData();
  form.append("file", entry.blob, entry.fileName);
  Object.entries(entry.fields).forEach(([key, value]) => form.append(key, value));

  try {
    const base = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/api\/?$/, "");
    const response = await fetch(`${base}${entry.endpoint}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (response.ok) {
      await removeEvidence(entry.id);
      return true;
    }
    await updateEvidence(entry.id, { attempts: entry.attempts + 1, lastError: `HTTP ${response.status}` });
    return false;
  } catch (error) {
    await updateEvidence(entry.id, {
      attempts: entry.attempts + 1,
      lastError: error instanceof Error ? error.message : "Erreur reseau",
    });
    return false;
  }
}

/** Synchronise toutes les preuves en attente. Best-effort : les echecs restent en file. */
export async function syncPendingEvidence(): Promise<{ sent: number; remaining: number }> {
  const pending = await listPendingEvidence();
  let sent = 0;
  for (const entry of pending) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await trySend(entry);
    if (ok) sent += 1;
  }
  const remaining = (await listPendingEvidence()).length;
  return { sent, remaining };
}

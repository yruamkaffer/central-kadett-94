export type IssuePriority = "Baixa" | "Média" | "Alta" | "Crítica";
export type ModalKind = "mileage" | "issue" | "service" | "component" | "quote" | "fuel" | null;
export type AppState = {
  schemaVersion: 1;
  vehicle: { manufacturer: string; model: string; trim: string; year: number; engine: string; fuelType: string; transmission: string; currentMileage: number | null; mileageUpdatedAt: string | null };
  issues: Array<{ id: string; title: string; subsystem: string; priority: IssuePriority; description: string; status: string; detectedAt: string; estimatedCost?: number; actualCost?: number }>;
  services: Array<{ id: string; date: string; mileage: number; type: string; provider: string; description: string; partsCost: number; laborCost: number; otherCost: number; total: number; issueId: string }>;
  components: Array<{ id: string; name: string; subsystem: string; manufacturer: string; partNumber: string; installedAt: string; installedAtMileage: number; expectedLifeKm: number; expectedLifeMonths: number; intervalSource: string; condition: string }>;
  quotes: Array<{ id: string; issueId: string; provider: string; receivedAt: string; validUntil: string; partsCost: number; laborCost: number; otherCost: number; warranty: string; duration: string; status: string }>;
  fuel: Array<{ id: string; date: string; mileage: number; liters: number; pricePerLiter: number; total: number; fuelType: string; station: string; fullTank: boolean }>;
  settings: { reducedMotion: boolean; demoMode: boolean; lastBackupAt: string | null };
};

export const emptyState: AppState = {
  schemaVersion: 1,
  vehicle: { manufacturer: "Chevrolet", model: "Kadett", trim: "GLS", year: 1994, engine: "1.8 EFI", fuelType: "Não confirmado", transmission: "Não confirmado", currentMileage: null, mileageUpdatedAt: null },
  issues: [], services: [], components: [], quotes: [], fuel: [],
  settings: { reducedMotion: false, demoMode: false, lastBackupAt: null },
};

const DB_NAME = "central-kadett-94";
const STORE = "state";
function openDB(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => request.result.createObjectStore(STORE); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
export async function loadState(): Promise<AppState> { try { const db = await openDB(); return await new Promise((resolve) => { const request = db.transaction(STORE).objectStore(STORE).get("main"); request.onsuccess = () => resolve(request.result ?? emptyState); request.onerror = () => resolve(emptyState); }); } catch { return emptyState; } }
export async function saveState(state: AppState) { try { const db = await openDB(); const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(state, "main"); } catch { /* Interface remains usable if browser storage is unavailable. */ } }

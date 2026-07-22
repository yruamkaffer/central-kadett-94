import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { emptyState, type AppState } from "./local-db";

type CloudRow = {
  data: unknown;
  schemaVersion: number;
  updatedAt: string;
};

export type CloudLoadResult = {
  state: AppState;
  updatedAt: string;
  migratedLocalData: boolean;
};

export function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppState>;
  return candidate.schemaVersion === 1
    && !!candidate.vehicle
    && Array.isArray(candidate.issues)
    && Array.isArray(candidate.services)
    && Array.isArray(candidate.components)
    && Array.isArray(candidate.quotes)
    && Array.isArray(candidate.fuel)
    && !!candidate.settings;
}

export function hasUserData(state: AppState) {
  return state.vehicle.currentMileage !== null
    || state.issues.length > 0
    || state.services.length > 0
    || state.components.length > 0
    || state.quotes.length > 0
    || state.fuel.length > 0
    || state.settings.demoMode;
}

export async function loadOrCreateCloudState(
  db: Firestore,
  userId: string,
  localState: AppState,
): Promise<CloudLoadResult> {
  const stateDoc = doc(db, "userAppState", userId);
  const snapshot = await getDoc(stateDoc);

  if (snapshot.exists()) {
    const data = snapshot.data() as CloudRow;
    if (isAppState(data.data)) {
      return { state: data.data, updatedAt: data.updatedAt, migratedLocalData: false };
    }
  }

  const initialState = hasUserData(localState) ? localState : emptyState;
  const saved = await saveCloudState(db, userId, initialState);
  return { state: initialState, updatedAt: saved, migratedLocalData: hasUserData(localState) };
}

export async function saveCloudState(db: Firestore, userId: string, state: AppState) {
  const updatedAt = new Date().toISOString();
  await setDoc(doc(db, "userAppState", userId), {
    data: state,
    schemaVersion: state.schemaVersion,
    updatedAt,
  });
  return updatedAt;
}

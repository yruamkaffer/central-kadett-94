export type IssuePriority = "Baixa" | "Média" | "Alta" | "Crítica";
export type ModalKind = "mileage" | "issue" | "service" | "component" | "quote" | "fuel" | null;

export type AppState = {
  schemaVersion: 1;
  vehicle: {
    manufacturer: string;
    model: string;
    trim: string;
    year: number;
    engine: string;
    fuelType: string;
    transmission: string;
    color: string;
    wheels: string;
    restorationGoal: string;
    currentMileage: number | null;
    mileageUpdatedAt: string | null;
  };
  issues: Array<{ id: string; title: string; subsystem: string; priority: IssuePriority; description: string; status: string; detectedAt: string; estimatedCost?: number; actualCost?: number }>;
  services: Array<{ id: string; date: string; mileage: number; type: string; provider: string; description: string; partsCost: number; laborCost: number; otherCost: number; total: number; issueId: string }>;
  components: Array<{ id: string; name: string; subsystem: string; manufacturer: string; partNumber: string; installedAt: string; installedAtMileage: number; expectedLifeKm: number; expectedLifeMonths: number; intervalSource: string; condition: string }>;
  quotes: Array<{ id: string; issueId: string; provider: string; receivedAt: string; validUntil: string; partsCost: number; laborCost: number; otherCost: number; warranty: string; duration: string; status: string }>;
  fuel: Array<{ id: string; date: string; mileage: number; liters: number; pricePerLiter: number; total: number; fuelType: string; station: string; fullTank: boolean }>;
  library: Array<{ id: string; category: string; title: string; content: string }>;
  timeline: Array<{ id: string; date: string; title: string; description: string }>;
  settings: { reducedMotion: boolean; demoMode: boolean; lastBackupAt: string | null };
};

export const emptyState: AppState = {
  schemaVersion: 1,
  vehicle: {
    manufacturer: "Chevrolet",
    model: "Kadett",
    trim: "GLS",
    year: 1994,
    engine: "1.8 EFI (Família II)",
    fuelType: "Gasolina",
    transmission: "Não confirmado",
    color: "Branca",
    wheels: "Originais GM aro 14, liga leve prata, estrela de cinco pontas",
    restorationGoal: "Restaurar mantendo o máximo possível da originalidade, priorizando confiabilidade mecânica antes da estética.",
    currentMileage: 528574,
    mileageUpdatedAt: "2026-07-22T12:00:00.000Z",
  },
  issues: [
    { id: "diag-fumaca-oleo", title: "Fumaça branca/azulada e cheiro de óleo", subsystem: "Motor", priority: "Alta", description: "Fumaça na partida que some após alguns minutos e reaparece acima de aproximadamente 3000 rpm, com cheiro de óleo queimado. Hipótese principal: retentores de válvula; menos provável por enquanto: junta do cabeçote ou anéis.", status: "Em análise", detectedAt: "2026-07-22", estimatedCost: 0 },
    { id: "diag-arrefecimento", title: "Revisar arrefecimento completo", subsystem: "Arrefecimento", priority: "Crítica", description: "Sistema trabalhou por bastante tempo apenas com água. Há vazamento e histórico de vazamento em mangueiras. Reparar vazamentos, limpar sistema, revisar bomba d'água e válvula termostática, depois usar aditivo e água desmineralizada.", status: "Aberta", detectedAt: "2026-07-22", estimatedCost: 0 },
    { id: "diag-engasgos", title: "Engasgadas ocasionais", subsystem: "Motor", priority: "Alta", description: "Investigar ignição, corpo de borboleta, sensores, conectores oxidados e alimentação de combustível.", status: "Aberta", detectedAt: "2026-07-22", estimatedCost: 0 },
    { id: "diag-marcador-temperatura", title: "Marcador de temperatura não funciona", subsystem: "Elétrica", priority: "Alta", description: "Diagnosticar sensor do painel, chicote, aterramento e instrumento. Há também suspeita em sensor de temperatura da ECU.", status: "Aberta", detectedAt: "2026-07-22", estimatedCost: 0 },
    { id: "diag-marcha-lenta", title: "Marcha lenta com falha intermitente", subsystem: "Motor", priority: "Média", description: "Antes ficava acelerado; atualmente passou a ligar normalmente. Manter em observação por suspeita de sensor intermitente.", status: "Em observação", detectedAt: "2026-07-22", estimatedCost: 0 },
    { id: "diag-eletrica-painel", title: "Iluminação do painel fraca e lâmpadas queimadas", subsystem: "Elétrica", priority: "Média", description: "Grande parte do sistema elétrico funciona, mas há lâmpadas queimadas e painel com iluminação fraca.", status: "Aberta", detectedAt: "2026-07-22", estimatedCost: 0 },
    { id: "diag-lavador", title: "Reservatório do lavador furado", subsystem: "Carroceria", priority: "Baixa", description: "Reservatório apresenta vazamento. Pendente substituição.", status: "Aberta", detectedAt: "2026-07-22", estimatedCost: 0 },
    { id: "diag-rodas-oem", title: "Restaurar rodas originais GM", subsystem: "Carroceria", priority: "Baixa", description: "Rodas de liga leve aro 14 prata, desenho estrela de cinco pontas. Objetivo: restaurar mantendo aparência OEM.", status: "Aberta", detectedAt: "2026-07-22", estimatedCost: 0 },
    { id: "diag-acabamento-interno", title: "Revisar acabamento interno e painel", subsystem: "Interior", priority: "Baixa", description: "Volante bastante desgastado, faltam peças de acabamento e o painel precisa de revisão.", status: "Aberta", detectedAt: "2026-07-22", estimatedCost: 0 },
  ],
  services: [
    { id: "svc-compra-inicial", date: "2026-07-22", mileage: 528574, type: "Compra de peças", provider: "Fornecedores diversos", description: "Pacote inicial de peças e materiais para ignição, filtros, estética e acabamento.", partsCost: 675.37, laborCost: 0, otherCost: 0, total: 675.37, issueId: "" },
  ],
  components: [
    { id: "part-velas", name: "Velas de ignição", subsystem: "Motor", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 20000, expectedLifeMonths: 0, intervalSource: "Item comprado para revisão de ignição", condition: "Comprado" },
    { id: "part-cabos", name: "Cabos de vela", subsystem: "Motor", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 40000, expectedLifeMonths: 0, intervalSource: "Item comprado para revisão de ignição", condition: "Comprado" },
    { id: "part-tampa-distribuidor", name: "Tampa do distribuidor", subsystem: "Motor", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 40000, expectedLifeMonths: 0, intervalSource: "Item comprado para revisão de ignição", condition: "Comprado" },
    { id: "part-rotor", name: "Rotor do distribuidor", subsystem: "Motor", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 40000, expectedLifeMonths: 0, intervalSource: "Item comprado para revisão de ignição", condition: "Comprado" },
    { id: "part-filtro-combustivel", name: "Filtro de combustível", subsystem: "Motor", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 10000, expectedLifeMonths: 12, intervalSource: "Item comprado para revisão preventiva", condition: "Comprado" },
    { id: "part-filtro-ar", name: "Filtro de ar", subsystem: "Motor", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 10000, expectedLifeMonths: 12, intervalSource: "Item comprado para revisão preventiva", condition: "Comprado" },
    { id: "part-tinta-argenta", name: "Tinta prata GM Argenta", subsystem: "Carroceria", manufacturer: "GM Argenta", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 0, expectedLifeMonths: 0, intervalSource: "Material comprado para restauração das rodas", condition: "Comprado" },
    { id: "part-verniz", name: "Verniz", subsystem: "Carroceria", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 0, expectedLifeMonths: 0, intervalSource: "Material comprado para acabamento", condition: "Comprado" },
    { id: "part-tinta-alta-temp", name: "Tintas alta temperatura preta e vermelha", subsystem: "Carroceria", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 0, expectedLifeMonths: 0, intervalSource: "Material comprado para restauração visual", condition: "Comprado" },
    { id: "part-tinta-vitral", name: "Tinta vitral laranja", subsystem: "Carroceria", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 0, expectedLifeMonths: 0, intervalSource: "Material comprado para detalhes estéticos", condition: "Comprado" },
    { id: "part-placa-iluminacao", name: "Placa de iluminação", subsystem: "Elétrica", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 0, expectedLifeMonths: 0, intervalSource: "Item comprado para revisão elétrica/painel", condition: "Comprado" },
    { id: "part-tapetes", name: "Tapetes", subsystem: "Interior", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 0, expectedLifeMonths: 0, intervalSource: "Item comprado para acabamento interno", condition: "Comprado" },
    { id: "part-grampos-frisos", name: "Grampos dos frisos", subsystem: "Carroceria", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 0, expectedLifeMonths: 0, intervalSource: "Item comprado para montagem externa", condition: "Comprado" },
    { id: "part-friso-lateral", name: "Friso lateral", subsystem: "Carroceria", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 0, expectedLifeMonths: 0, intervalSource: "Item comprado para manter aparência OEM", condition: "Comprado" },
    { id: "part-borrachas-pedais", name: "Borrachas dos pedais", subsystem: "Interior", manufacturer: "Não informado", partNumber: "Não informado", installedAt: "", installedAtMileage: 0, expectedLifeKm: 0, expectedLifeMonths: 0, intervalSource: "Item comprado para acabamento e segurança", condition: "Comprado" },
  ],
  quotes: [],
  fuel: [],
  library: [
    { id: "lib-filosofia", category: "Projeto", title: "Filosofia da restauração", content: "Prioridade absoluta: confiabilidade, segurança, mecânica, elétrica, acabamento e, por último, estética. A restauração deve preservar originalidade sempre que possível." },
    { id: "lib-motor", category: "Motor", title: "Motor 1.8 EFI Família II", content: "Motor liga normalmente. Há consumo de óleo, fumaça branca/azulada na partida, fuligem preta e resíduos pretos úmidos no escapamento. Investigar retentores de válvula antes de hipóteses mais invasivas." },
    { id: "lib-sensores", category: "Diagnóstico", title: "Sensores e conectores suspeitos", content: "Sensor de temperatura da ECU, sensor do painel, conectores oxidados, aterramentos e chicote devem entrar no roteiro de testes." },
    { id: "lib-arrefecimento", category: "Fluidos", title: "Plano para arrefecimento", content: "Corrigir vazamentos, limpar completamente o sistema, revisar válvula termostática e bomba d'água, e finalizar com aditivo correto + água desmineralizada." },
    { id: "lib-combustivel", category: "Uso", title: "Abastecimento", content: "Planejamento: usar somente gasolina aditivada e postos de confiança." },
    { id: "lib-manual", category: "Manual técnico", title: "Itens a levantar", content: "Especificações, torques, fluidos, códigos GM, sensores, chicotes, fusíveis, esquema elétrico, catálogo de peças, curiosidades e manutenção preventiva." },
  ],
  timeline: [
    { id: "hist-base", date: "2026-07-22", title: "Prontuário inicial criado", description: "Central alimentada com dados do Kadett GLS 1994: quilometragem, sintomas, peças compradas, pendências e filosofia de restauração." },
    { id: "hist-compra", date: "2026-07-22", title: "Pacote inicial de peças comprado", description: "Velas, cabos, tampa e rotor do distribuidor, filtros, tintas, verniz, tapetes, frisos, grampos, placa de iluminação e borrachas dos pedais. Investimento aproximado: R$ 675,37." },
  ],
  settings: { reducedMotion: false, demoMode: false, lastBackupAt: null },
};

const DB_NAME = "central-kadett-94";
const STORE = "state";
function openDB(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => request.result.createObjectStore(STORE); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
export async function loadState(): Promise<AppState> { try { const db = await openDB(); return await new Promise((resolve) => { const request = db.transaction(STORE).objectStore(STORE).get("main"); request.onsuccess = () => resolve(request.result ?? emptyState); request.onerror = () => resolve(emptyState); }); } catch { return emptyState; } }
export async function saveState(state: AppState) { try { const db = await openDB(); const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(state, "main"); } catch { /* Interface remains usable if browser storage is unavailable. */ } }

export async function loadUserState(userId: string): Promise<AppState | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const request = db.transaction(STORE).objectStore(STORE).get(`user:${userId}`);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveUserState(userId: string, state: AppState) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, `user:${userId}`);
  } catch {
    /* The cloud copy remains authoritative if browser storage is unavailable. */
  }
}

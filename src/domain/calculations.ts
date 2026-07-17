type ComponentLike = { installedAt: string; installedAtMileage: number; expectedLifeKm: number; expectedLifeMonths: number };
type QuoteLike = { partsCost: number; laborCost: number; otherCost: number };
export function formatBRL(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
export function nextComponentService(component: ComponentLike, mileage: number | null) {
  const remainingKm = component.expectedLifeKm && mileage != null ? component.installedAtMileage + component.expectedLifeKm - mileage : null;
  let remainingDays: number | null = null;
  if (component.expectedLifeMonths && component.installedAt) { const due = new Date(`${component.installedAt}T12:00:00`); due.setMonth(due.getMonth() + component.expectedLifeMonths); remainingDays = Math.ceil((due.getTime() - Date.now()) / 86_400_000); }
  if (remainingKm == null && remainingDays == null) return null;
  return { remainingKm, remainingDays };
}
export function componentHealth(component: ComponentLike, mileage: number | null) {
  const next = nextComponentService(component, mileage);
  if (!next) return { label: "DESCONHECIDO", percent: 8 };
  const kmPercent = component.expectedLifeKm && next.remainingKm != null ? next.remainingKm / component.expectedLifeKm * 100 : 100;
  const dayPercent = component.expectedLifeMonths && next.remainingDays != null ? next.remainingDays / (component.expectedLifeMonths * 30.4) * 100 : 100;
  const percent = Math.max(0, Math.min(100, Math.min(kmPercent, dayPercent)));
  return { label: percent <= 0 ? "VENCIDO" : percent <= 20 ? "ACOMPANHAR" : "NO INTERVALO", percent };
}
export function quoteSpread(quotes: QuoteLike[]) { const totals = quotes.map((q) => q.partsCost + q.laborCost + q.otherCost); const min = totals.length ? Math.min(...totals) : 0; const max = totals.length ? Math.max(...totals) : 0; return { min, max, diff: max - min }; }

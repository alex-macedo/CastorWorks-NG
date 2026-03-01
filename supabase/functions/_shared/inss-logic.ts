export const VAU_BY_STATE: Record<string, number> = {
  AC: 1350.00, AL: 1320.00, AP: 1340.00, AM: 1380.00,
  BA: 1350.00, CE: 1340.00, DF: 1500.00, ES: 1420.00,
  GO: 1400.00, MA: 1300.00, MT: 1420.00, MS: 1410.00,
  MG: 1380.00, PA: 1350.00, PB: 1310.00, PR: 1410.00,
  PE: 1340.00, PI: 1280.00, RJ: 1489.00, RN: 1330.00,
  RS: 1449.25, RO: 1380.00, RR: 1360.00, SC: 1445.00,
  SP: 1520.00, SE: 1320.00, TO: 1370.00,
};

export const LABOR_PERCENTAGE: Record<string, number> = {
  ALVENARIA: 0.40,
  MISTA: 0.30,
  MADEIRA: 0.30,
  PRE_MOLDADO: 0.12,
  METALICA: 0.18,
};

export const INSS_RATE = 0.25;

export function calculateBasicINSS(area: number, state: string, constructionType: string) {
  const vau = VAU_BY_STATE[state] || 1400;
  const laborPct = LABOR_PERCENTAGE[constructionType] || 0.40;
  const baseValue = area * vau * laborPct;
  return baseValue * INSS_RATE;
}

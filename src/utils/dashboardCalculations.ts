export function calculateExpectedProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  if (now < start) return 0;
  if (now > end) return 100;
  
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.round((elapsed / totalDuration) * 100);
}

export function getProjectStatus(
  actualProgress: number, 
  expectedProgress: number,
  budgetUsed: number
): 'on-track' | 'at-risk' | 'delayed' {
  if (budgetUsed > 100 || actualProgress < expectedProgress - 15) {
    return 'delayed';
  }
  if (budgetUsed > 90 || actualProgress < expectedProgress - 5) {
    return 'at-risk';
  }
  return 'on-track';
}

export function formatCashFlow(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = (absAmount / 1000).toFixed(1);
  return `${amount >= 0 ? '+' : '-'}R$ ${formatted}K`;
}

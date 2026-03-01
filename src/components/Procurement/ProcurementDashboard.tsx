import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/contexts/LocalizationContext";
import { ProcurementAIRecommendations } from "./ProcurementAIRecommendations";
import { AICacheHeader } from "@/components/AI/AICacheHeader";
import { useProcurementPrediction } from "@/hooks/useProcurementPrediction";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useDeliveryConfirmations } from "@/hooks/useDeliveryConfirmations";
import { usePaymentStats, usePaymentDashboard } from "@/hooks/usePayments";
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SmallSparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-full h-16">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        points={points}
        className="text-primary"
      />
    </svg>
  );
}

function SpendTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const val = payload[0].value as number;
  const formatted = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  return (
    <div className="bg-card p-2 rounded shadow" role="tooltip">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{formatted}</div>
    </div>
  );
}

function ProcurementSpendChart({
  values,
  height = 128,
  colors = { stroke: '#4f46e5', strokeSecondary: '#6366f1', gradient: '#4f46e5' },
}: {
  values: number[];
  height?: number | string;
  colors?: { stroke?: string; strokeSecondary?: string; gradient?: string };
}) {
  const data = useMemo(() => {
    return values.map((v, i) => ({ name: `P${i + 1}`, value: Math.round(v) }));
  }, [values]);

  const gradientId = useMemo(() => {
    // generate a stable-ish id per values snapshot to avoid collisions in DOM
    try {
      const key = Array.isArray(values) ? values.join('-') : String(values);
      const short = Math.abs(key.split('').reduce((a, c) => a + c.charCodeAt(0), 0)).toString(36).slice(0, 6);
      return `colorSpend-${short}`;
    } catch (e) {
      // deterministic fallback to keep render pure
      return 'colorSpend-default';
    }
  }, [values]);

  // map some common numeric heights to tailwind classes to avoid inline styles
  const heightClass = useMemo(() => {
    if (!height) return 'h-32';
    const hNum = typeof height === 'number' ? height : parseInt(String(height));
    switch (hNum) {
      case 64:
      case 96:
        return 'h-24';
      case 128:
      case 220:
        return 'h-56';
      case 32:
        return 'h-8';
      default:
        // arbitrary value fallback (Tailwind JIT) - use pixels
        return `h-[${hNum}px]`;
    }
  }, [height]);

  // accessibility: compute a short textual summary for screen readers
  const srSummary = useMemo(() => {
    const total = values.reduce((s, v) => s + Number(v || 0), 0);
    const first = Number(values[0] || 0);
    const last = Number(values[values.length - 1] || 0);
    const trend = last - first;
    const pct = first === 0 ? 0 : Math.round((trend / Math.max(1, first)) * 100);
    const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
    const trendLabel = trend > 0 ? `up ${pct}%` : trend < 0 ? `down ${Math.abs(pct)}%` : 'flat';
    return `Total ${fmt(total)} over period; trend ${trendLabel}.`;
  }, [values]);

  return (
    <div className={`w-full ${heightClass}`} role="img" aria-label={srSummary}>
      {/* visible summary for screen readers */}
      <span className="sr-only">{srSummary}</span>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.gradient} stopOpacity={0.6} />
              <stop offset="95%" stopColor={colors.gradient} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(val))} />
          <Tooltip content={<SpendTooltip />} />
          <Area type="monotone" dataKey="value" stroke={colors.stroke} fill={`url(#${gradientId})`} strokeWidth={2} />
          <Line type="monotone" dataKey="value" stroke={colors.strokeSecondary} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProcurementDashboard() {
  const { t } = useLocalization();
  const { prediction, isLoading, predict, refresh } = useProcurementPrediction();
  const [timeframe, setTimeframe] = useState<'30'|'60'|'90'>('30');
  // Live hooks used to populate KPI cards
  const { purchaseRequests } = usePurchaseRequests();
  const { data: deliveryConfirmations } = useDeliveryConfirmations();
  const { data: paymentStats } = usePaymentStats();
  const { data: paymentDashboard } = usePaymentDashboard();

  // Use typed purchase orders hook (includes related relations)
  const { purchaseOrders = [], isLoading: purchaseOrdersLoading } = usePurchaseOrders();

  useEffect(() => {
    // run an initial prediction on mount
    predict(timeframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spendSeries = useMemo(() => {
    // build a simple timeseries from purchaseOrders totals over the selected timeframe
    // If purchaseOrders is not loaded, return empty series
    if (!purchaseOrders || purchaseOrders.length === 0) {
      return [0, 0, 0, 0, 0, 0];
    }

    // timeframeDays: map '30'->30, '60'->60, '90'->90
    const timeframeDays = Number(timeframe);
    const now = new Date();
    const start = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

    // Create 6 buckets across the timeframe
    const buckets = Array.from({ length: 6 }).map(() => 0);
    const bucketSize = timeframeDays / 6;

    purchaseOrders.forEach((po: any) => {
      const createdAt = po?.created_at || po?.createdAt || null;
      if (!createdAt) return;
      const created = new Date(createdAt);
      if (created < start) return;
      const daysAgo = (now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000);
      const index = Math.min(5, Math.floor((timeframeDays - daysAgo) / bucketSize));
      const amt = Number(po.total_amount ?? po.totalAmount ?? 0) || 0;
      if (index >= 0 && index < 6) buckets[index] += amt;
    });

    // If all zeros, fallback to prediction
    const total = buckets.reduce((s, v) => s + v, 0);
    if (total === 0 && prediction) {
      const base = Math.round(prediction.forecastedSpend / 6);
      return Array.from({ length: 6 }).map((_, i) => base * (i + 1));
    }

    return buckets;
  }, [purchaseOrders, timeframe, prediction]);

  const activePOsCount = useMemo(() => {
    if (!purchaseOrders) return 0;
    return purchaseOrders.filter((po: any) => {
      const status = (po?.status ?? po?.po_status ?? '').toString().toLowerCase();
      return status !== 'delivered' && status !== 'cancelled' && status !== 'closed';
    }).length;
  }, [purchaseOrders]);

  const activeRequestsCount = useMemo(() => {
    if (!purchaseRequests) return 0;
    try {
      return purchaseRequests.filter((r: any) => {
        const st = (r?.status ?? r?.request_status ?? '').toString().toLowerCase();
        return st !== 'approved' && st !== 'fulfilled' && st !== 'cancelled';
      }).length;
    } catch (e) {
      return 0;
    }
  }, [purchaseRequests]);

  const pendingDeliveriesCount = useMemo(() => {
    if (!deliveryConfirmations) return 0;
    try {
      return deliveryConfirmations.filter((d: any) => {
        const st = (d?.status ?? d?.delivery_status ?? '').toString().toLowerCase();
        return st === 'pending' || st === 'awaiting' || st === 'in_transit';
      }).length;
    } catch (e) {
      return 0;
    }
  }, [deliveryConfirmations]);

  const overduePaymentsCount = useMemo(() => {
    // Prefer the enriched dashboard view if available
    if (Array.isArray(paymentDashboard) && paymentDashboard.length > 0) {
      try {
        return paymentDashboard.filter((p: any) => !!p?.is_overdue).length;
      } catch (e) {
        // fallback below
      }
    }

    // Fallback to aggregated stats
    if (paymentStats && typeof paymentStats.overdue === 'number') {
      return paymentStats.overdue;
    }

    return 0;
  }, [paymentDashboard, paymentStats]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("procurement.dashboard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">{t('procurement.dashboard.summary')}</div>
                <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                <KPI label={t('procurement.kpi.activeRequests')} value={activeRequestsCount} />
                <KPI label={t('procurement.kpi.activePurchaseOrders')} value={activePOsCount} />
                <KPI label={t('procurement.kpi.pendingDeliveries')} value={pendingDeliveriesCount} />
                <KPI label={t('procurement.kpi.overduePayments')} value={overduePaymentsCount} />
              </div>
            </div>

            <div className="w-64">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{t('procurement.dashboard.timeframe')}</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setTimeframe('30'); predict('30'); }} aria-pressed={timeframe === '30'}>30d</Button>
                  <Button size="sm" onClick={() => { setTimeframe('60'); predict('60'); }} aria-pressed={timeframe === '60'}>60d</Button>
                  <Button size="sm" onClick={() => { setTimeframe('90'); predict('90'); }} aria-pressed={timeframe === '90'}>90d</Button>
                </div>
              </div>

              <div className="mt-2">
                <ProcurementSpendChart values={spendSeries} height={96} colors={{ stroke: '#06b6d4', strokeSecondary: '#0891b2', gradient: '#06b6d4' }} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('procurement.dashboard.spendOverTime')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProcurementSpendChart values={spendSeries} height={220} colors={{ stroke: '#4f46e5', strokeSecondary: '#6366f1', gradient: '#4f46e5' }} />
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="flex justify-end mb-2">
                {prediction && (
                  <AICacheHeader
                    lastUpdated={prediction.generatedAt}
                    cached={prediction.cached}
                    onRefresh={() => refresh(timeframe)}
                    isRefreshing={isLoading}
                  />
                )}
              </div>
              <ProcurementAIRecommendations recommendations={prediction?.recommendations || []} isLoading={isLoading} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

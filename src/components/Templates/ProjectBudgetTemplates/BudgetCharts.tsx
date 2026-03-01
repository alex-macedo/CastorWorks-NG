import {
  BarChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Bar } from "recharts/es6/cartesian/Bar";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatCurrency } from "@/utils/formatters";
import type { PhaseTotal, GrandTotal } from "@/utils/budgetCalculations";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

interface BudgetChartsProps {
  phaseTotals: PhaseTotal[];
  grandTotals: GrandTotal;
}

const COLORS = {
  labor: "#8884d8", // Gray/Blue
  materials: "#ef4444", // Red
  ls: "#14b8a6", // Teal
  bdi: "#d1d5db", // Light Gray
};

export function CostProportionByStageChart({
  phaseTotals,
}: {
  phaseTotals: PhaseTotal[];
}) {
  const { t } = useLocalization();
  const { currency } = useLocalization();

  // Ensure data is valid and filter out any invalid entries
  const data = phaseTotals
    .filter((phase) => phase && phase.phase_name)
    .map((phase) => ({
      name: phase.phase_name || "Sem Fase",
      labor: Number(phase.totalLabor) || 0,
      materials: Number(phase.totalMaterials) || 0,
      ls: Number(phase.totalLS) || 0,
      bdi: Number(phase.totalBDI) || 0,
    }));

  // Determine which categories have non-zero values across all phases
  const hasLabor = data.some(d => d.labor > 0);
  const hasMaterials = data.some(d => d.materials > 0);
  const hasLS = data.some(d => d.ls > 0);
  const hasBDI = data.some(d => d.bdi > 0);

  // Build chart config only for categories with values
  const chartConfig: Record<string, { label: string; color: string }> = {};
  if (hasLabor) chartConfig.labor = { label: t("images.laborCost"), color: COLORS.labor };
  if (hasMaterials) chartConfig.materials = { label: t("images.materialsCost"), color: COLORS.materials };
  if (hasLS) chartConfig.ls = { label: t("images.lsCost"), color: COLORS.ls };
  if (hasBDI) chartConfig.bdi = { label: t("images.bdiCost"), color: COLORS.bdi };

  const formatTooltipValue = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatCurrency(numValue, currency);
  };
  const formatYAxisTick = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  // Determine which bar should have the top radius (the last one in the stack)
  const categories = [];
  if (hasLabor) categories.push('labor');
  if (hasMaterials) categories.push('materials');
  if (hasLS) categories.push('ls');
  if (hasBDI) categories.push('bdi');
  const lastCategory = categories[categories.length - 1];

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            fontSize={10}
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={formatYAxisTick} 
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<ChartTooltipContent formatter={(value) => formatTooltipValue(Number(value))} />} />
          {hasLabor && <Bar dataKey="labor" stackId="a" fill="var(--color-labor)" radius={lastCategory === 'labor' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />}
          {hasMaterials && <Bar dataKey="materials" stackId="a" fill="var(--color-materials)" radius={lastCategory === 'materials' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />}
          {hasLS && <Bar dataKey="ls" stackId="a" fill="var(--color-ls)" radius={lastCategory === 'ls' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />}
          {hasBDI && <Bar dataKey="bdi" stackId="a" fill="var(--color-bdi)" radius={lastCategory === 'bdi' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />}
          <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ bottom: -10, paddingBottom: '0px' }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function LaborVsMaterialsChart({ grandTotals }: { grandTotals: GrandTotal }) {
  const { currency } = useLocalization();
  
  // Ensure values are valid numbers
  const data = [
    { name: "Mão de obra", value: Number(grandTotals?.totalLabor) || 0 },
    { name: "Materiais", value: Number(grandTotals?.totalMaterials) || 0 },
  ];

  const COLORS_PIE = ["#3b82f6", "#f97316"]; // Blue, Orange

  const formatTooltipValue = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatCurrency(numValue, currency);
  };

  const chartConfig = {
    labor: { label: "Mão de obra", color: "#3b82f6" },
    materials: { label: "Materiais", color: "#f97316" },
  };

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={125}
            fill="#8884d8"
            dataKey="value"
          >
            <Cell fill="var(--color-labor)" />
            <Cell fill="var(--color-materials)" />
          </Pie>
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatTooltipValue(Number(value))} />} />
          <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ bottom: -10, paddingBottom: '0px' }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function CostByStageChart({ phaseTotals }: { phaseTotals: PhaseTotal[] }) {
  const { t, currency } = useLocalization();
  
  // Ensure data is valid and filter out any invalid entries
  const data = phaseTotals
    .filter((phase) => phase && phase.phase_name)
    .map((phase) => ({
      name: phase.phase_name || "Sem Fase",
      total: Number(phase.grandTotal) || 0,
    }));

  const formatTooltipValue = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatCurrency(numValue, currency);
  };
  const formatYAxisTick = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const chartConfig = {
    total: { label: t("budgets:dashboard.costByStage"), color: "#3b82f6" },
  };

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            fontSize={10}
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={formatYAxisTick} 
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<ChartTooltipContent formatter={(value) => formatTooltipValue(Number(value))} />} />
          <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
          <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ bottom: -10, paddingBottom: '0px' }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function CostByStagePercentChart({
  phaseTotals,
  grandTotals,
}: {
  phaseTotals: PhaseTotal[];
  grandTotals: GrandTotal;
}) {
  const { t } = useLocalization();
  
  const grandTotalValue = Number(grandTotals?.grandTotal) || 0;
  const data = phaseTotals
    .filter((phase) => phase && phase.phase_name)
    .map((phase) => ({
      name: phase.phase_name || "Sem Fase",
      percentage: grandTotalValue > 0
        ? (Number(phase.grandTotal) || 0) / grandTotalValue * 100
        : 0,
    }));

  const chartConfig = {
    percentage: { label: t("budgets:dashboard.costByStagePercent"), color: "#10b981" },
  };

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            fontSize={10}
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <ChartTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(1)}%`} />} />
          <Bar dataKey="percentage" fill="var(--color-percentage)" radius={[4, 4, 0, 0]} />
          <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ bottom: -10, paddingBottom: '0px' }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function LaborCostChart({ phaseTotals }: { phaseTotals: PhaseTotal[] }) {
  const { t, currency } = useLocalization();
  
  // Ensure data is valid and filter out any invalid entries
  const data = phaseTotals
    .filter((phase) => phase && phase.phase_name)
    .map((phase) => ({
      name: phase.phase_name || "Sem Fase",
      labor: Number(phase.totalLabor) || 0,
    }));

  const formatTooltipValue = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatCurrency(numValue, currency);
  };
  const formatYAxisTick = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const chartConfig = {
    labor: { label: t("images.laborCost"), color: COLORS.labor },
  };

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            fontSize={10}
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={formatYAxisTick} 
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<ChartTooltipContent formatter={(value) => formatTooltipValue(Number(value))} />} />
          <Bar dataKey="labor" fill="var(--color-labor)" radius={[4, 4, 0, 0]} />
          <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ bottom: -10, paddingBottom: '0px' }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function OtherCostsChart({ phaseTotals }: { phaseTotals: PhaseTotal[] }) {
  const { t, currency } = useLocalization();
  
  // Ensure data is valid and filter out any invalid entries
  const data = phaseTotals
    .filter((phase) => phase && phase.phase_name)
    .map((phase) => ({
      name: phase.phase_name || "Sem Fase",
      other: (Number(phase.totalMaterials) || 0) + (Number(phase.totalLS) || 0) + (Number(phase.totalBDI) || 0),
    }));

  const formatTooltipValue = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatCurrency(numValue, currency);
  };
  const formatYAxisTick = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const chartConfig = {
    other: { label: t("budgets:dashboard.otherCosts"), color: "#f59e0b" },
  };

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            fontSize={10}
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={formatYAxisTick} 
            tick={{ fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<ChartTooltipContent formatter={(value) => formatTooltipValue(Number(value))} />} />
          <Bar dataKey="other" fill="var(--color-other)" radius={[4, 4, 0, 0]} />
          <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ bottom: -10, paddingBottom: '0px' }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Bar } from 'recharts/es6/cartesian/Bar';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';

interface ProjectTimelineData {
  id: string;
  name: string;
  completion: number;
  status: 'on-track' | 'at-risk' | 'delayed';
  budgetUsed: number;
}

interface ProjectsTimelineChartProps {
  data: ProjectTimelineData[];
}

export function ProjectsTimelineChart({ data }: ProjectsTimelineChartProps) {
  const navigate = useNavigate();
  const { t } = useLocalization();

  const getBarColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'rgb(var(--success))';
      case 'at-risk': return 'rgb(var(--warning))';
      case 'delayed': return 'rgb(var(--destructive))';
      default: return 'rgb(var(--muted))';
    }
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('overallStatus.projectsTimeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No projects available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>{t('overallStatus.projectsTimeline')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('overallStatus.completionByProject')}</p>
        </div>
        <Badge variant="outline">{t('overallStatus.projects', { count: data.length })}</Badge>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            completion: { label: 'Completion', color: 'rgb(var(--primary))' }
          }}
          className="h-[300px]"
        >
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              tick={{ fill: 'rgb(var(--muted-foreground))' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={150}
              tick={{ fill: 'rgb(var(--muted-foreground))' }}
              className="text-xs"
            />
            <ChartTooltip
              content={<ChartTooltipContent 
                formatter={(value) => `${Number(value).toFixed(1)}%`}
              />}
            />
            <Bar 
              dataKey="completion" 
              radius={[0, 4, 4, 0]}
              onClick={(data) => navigate(`/projects/${data.id}`)}
              className="cursor-pointer"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

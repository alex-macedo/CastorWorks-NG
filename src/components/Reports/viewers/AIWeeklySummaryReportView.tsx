import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';

interface AIWeeklySummaryReportViewProps {
  data: {
    project: any;
    companySettings: any;
  };
}

export function AIWeeklySummaryReportView({ data }: AIWeeklySummaryReportViewProps) {
  const { t } = useLocalization();
  const summary = data.companySettings?.ai_summary || '';

  // Parse the summary into sections if possible, or just display as formatted text
  const rawSections = summary.split('\n\n').filter(Boolean);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Header Card */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-purple-900">
                  {t('reports:reportTypes.aiWeeklySummary.title')}
                </CardTitle>
                <p className="text-sm text-purple-700">
                  {data.project.name} • {format(new Date(), 'PP')}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white border-purple-200 text-purple-700">
              {t('reports:reportTypes.aiWeeklySummary.engine')}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* AI Content */}
      <div className="grid gap-6">
        {rawSections.map((section: string, idx: number) => {
          const isHeader = section.includes(':') && section.length < 50;
          const [rawTitle, ...content] = section.split(':');
          
          if (isHeader && content.length > 0) {
            // Determine the localized section title
            let title = rawTitle;
            let icon = <Calendar className="h-4 w-4 text-blue-600" />;

            if (rawTitle.toLowerCase().includes('health')) {
              title = t('reports:reportTypes.aiWeeklySummary.sections.financialHealth');
              icon = <CheckCircle2 className="h-4 w-4 text-green-600" />;
            } else if (rawTitle.toLowerCase().includes('risk')) {
              title = t('reports:reportTypes.aiWeeklySummary.sections.upcomingRisks');
              icon = <AlertTriangle className="h-4 w-4 text-orange-600" />;
            } else if (rawTitle.toLowerCase().includes('progress')) {
              title = t('reports:reportTypes.aiWeeklySummary.sections.progressUpdate');
              icon = <Calendar className="h-4 w-4 text-blue-600" />;
            }

            return (
              <Card key={idx} className="overflow-hidden border-none shadow-sm">
                <div className="bg-muted/30 px-4 py-2 border-b font-semibold flex items-center gap-2">
                  {icon}
                  {title}
                </div>
                <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {content.join(':').trim()}
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={idx} className="border-none shadow-sm">
              <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {section}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-center text-muted-foreground mt-8 px-12">
        {t('reports:reportTypes.aiWeeklySummary.disclaimer')}
      </p>
    </div>
  );
}

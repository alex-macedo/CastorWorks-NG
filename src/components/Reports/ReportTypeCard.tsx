import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';

interface ReportTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string;
  bgColor?: string;
  onClick: () => void;
}

export function ReportTypeCard({ icon: Icon, title, description, iconColor, bgColor, onClick }: ReportTypeCardProps) {
  const { t } = useLocalization();
  
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={onClick}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${bgColor || 'bg-primary/10'} transition-colors`}>
            <Icon className={`h-6 w-6 ${iconColor || 'text-primary'}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm mb-4">{description}</CardDescription>
        <Button className="w-full">
          {t("reports:generateReport")}
        </Button>
      </CardContent>
    </Card>
  );
}

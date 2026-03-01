import { Container } from "@/components/Layout";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function Contractors() {
  const { t } = useLocalization();

  return (
    <Container size="lg">
      <div className="space-y-6">
        <SidebarHeaderShell>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('contractors:title', { defaultValue: 'Contractors' })}</h1>
              <p className="text-sm text-sidebar-primary-foreground/80">
                {t('contractors:subtitle', { defaultValue: 'Manage project contractors and service providers' })}
              </p>
            </div>
            <Button variant="glass-style-white" gap-2>
              <Plus className="h-4 w-4" />
              {t('contractors:addContractor', { defaultValue: 'Add Contractor' })}
            </Button>
          </div>
        </SidebarHeaderShell>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('contractors:title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <Users className="h-12 w-12 opacity-20 mb-4" />
            <p>{t('common.noData')}</p>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

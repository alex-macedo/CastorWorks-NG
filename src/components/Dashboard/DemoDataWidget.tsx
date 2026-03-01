import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Settings, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useSeedDataStatus } from '@/hooks/useSeedDataStatus';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useLocalization } from '@/contexts/LocalizationContext';

export const DemoDataWidget = () => {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { projects } = useProjects();
  const { clients } = useClients();
  const { data: seedIds } = useSeedDataStatus();
  const { data: currentUserRolesData = [] } = useUserRoles();
  const currentUserRoles = currentUserRolesData?.map(r => r.role) || [];
  const isAdmin = currentUserRoles.includes('admin');

  // Don't show widget to non-admins
  if (!isAdmin) return null;

  const totalProjects = projects?.length || 0;
  const totalClients = clients?.length || 0;
  
  const seedProjects = projects?.filter(p => seedIds?.has(p.id)).length || 0;
  const seedClients = clients?.filter(c => seedIds?.has(c.id)).length || 0;
  
  const realProjects = totalProjects - seedProjects;
  const realClients = totalClients - seedClients;

  const hasSeedData = seedProjects > 0 || seedClients > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Demo Data Status</CardTitle>
              <CardDescription>Track seed vs real data</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings?tab=demo-data')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSeedData ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No demo data in database
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => navigate('/settings?tab=demo-data')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Seed Demo Data
            </Button>
          </div>
        ) : (
          <>
            {/* Projects Stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Projects</span>
                <span className="text-sm text-muted-foreground">{totalProjects} total</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">Real Data</span>
                  </div>
                  <p className="text-2xl font-bold">{realProjects}</p>
                  {totalProjects > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Math.round((realProjects / totalProjects) * 100)}%
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-blue-600 dark:text-blue-400">Demo Data</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{seedProjects}</p>
                  {totalProjects > 0 && (
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                      {Math.round((seedProjects / totalProjects) * 100)}%
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Clients Stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Clients</span>
                <span className="text-sm text-muted-foreground">{totalClients} total</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">Real Data</span>
                  </div>
                  <p className="text-2xl font-bold">{realClients}</p>
                  {totalClients > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Math.round((realClients / totalClients) * 100)}%
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-blue-600 dark:text-blue-400">Demo Data</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{seedClients}</p>
                  {totalClients > 0 && (
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                      {Math.round((seedClients / totalClients) * 100)}%
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/settings?tab=demo-data')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Clear Demo Data
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

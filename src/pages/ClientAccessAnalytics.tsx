import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClientAccessList } from "@/hooks/useClientAccess";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { Users, FolderOpen, Shield, TrendingUp, Eye, FileText, Download } from "lucide-react";
import { useMemo } from "react";
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
} from "recharts";
import { Bar } from "recharts/es6/cartesian/Bar";
import { format } from "date-fns";
import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

export default function ClientAccessAnalytics() {
  const { t } = useLocalization();
  const { data: accessList, isLoading } = useClientAccessList();
  const { clients } = useClients();
  const { projects } = useProjects();

  const analytics = useMemo(() => {
    if (!accessList) return null;

    // Total metrics
    const totalAccess = accessList.length;
    const uniqueClients = new Set(accessList.map((a: any) => a.client_id)).size;
    const uniqueProjects = new Set(accessList.map((a: any) => a.project_id)).size;

    // Permission distribution
    const permissions = {
      can_view_documents: accessList.filter((a: any) => a.can_view_documents).length,
      can_view_financials: accessList.filter((a: any) => a.can_view_financials).length,
      can_download_reports: accessList.filter((a: any) => a.can_download_reports).length,
    };

    const permissionData = [
      { name: t("clientAccess.viewDocuments"), value: permissions.can_view_documents, icon: FileText },
      { name: t("clientAccess.viewFinancials"), value: permissions.can_view_financials, icon: TrendingUp },
      { name: t("clientAccess.downloadReports"), value: permissions.can_download_reports, icon: Download },
    ];

    // Clients by access count
    const clientAccessCount = accessList.reduce((acc: any, access: any) => {
      const clientName = access.clients?.name || t("clientAccess.analytics.unknownClient");
      acc[clientName] = (acc[clientName] || 0) + 1;
      return acc;
    }, {});

    const clientData = Object.entries(clientAccessCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    // Projects by access count
    const projectAccessCount = accessList.reduce((acc: any, access: any) => {
      const projectName = access.projects?.name || t("clientAccess.analytics.unknownProject");
      acc[projectName] = (acc[projectName] || 0) + 1;
      return acc;
    }, {});

    const projectData = Object.entries(projectAccessCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    // Recent activity (sorted by created_at)
    const recentActivity = [...accessList]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    // Permission combination analysis
    const permissionCombinations = accessList.reduce((acc: any, access: any) => {
      const combo = [
        access.can_view_documents ? t("clientAccess.docs") : "",
        access.can_view_financials ? t("clientAccess.finance") : "",
        access.can_download_reports ? t("clientAccess.reports") : "",
      ]
        .filter(Boolean)
        .join(" + ") || t("clientAccess.analytics.noPermissions");
      
      acc[combo] = (acc[combo] || 0) + 1;
      return acc;
    }, {});

    const combinationData = Object.entries(permissionCombinations).map(([name, value]) => ({
      name,
      value,
    }));

    return {
      totalAccess,
      uniqueClients,
      uniqueProjects,
      permissionData,
      clientData,
      projectData,
      recentActivity,
      combinationData,
    };
  }, [accessList, t]);

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t("clientAccess.analytics.loadingAnalytics")}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <SidebarHeaderShell>
<div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("clientAccess.analytics.title")}</h1>
        <p className="text-muted-foreground">
          {t("clientAccess.analytics.subtitle")}
        </p>
      </div>
</SidebarHeaderShell>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("clientAccess.analytics.totalAccessGrants")}</p>
                <p className="text-3xl font-bold">{analytics.totalAccess}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("clientAccess.analytics.activeClients")}</p>
                <p className="text-3xl font-bold">{analytics.uniqueClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <FolderOpen className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("clientAccess.analytics.sharedProjects")}</p>
                <p className="text-3xl font-bold">{analytics.uniqueProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Eye className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("clientAccess.analytics.avgAccessPerClient")}</p>
                <p className="text-3xl font-bold">
                  {(analytics.totalAccess / analytics.uniqueClients || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Permission Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t("clientAccess.analytics.permissionDistribution")}</CardTitle>
            <CardDescription>{t("clientAccess.analytics.permissionDistributionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.permissionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.permissionData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Permission Combinations */}
        <Card>
          <CardHeader>
            <CardTitle>{t("clientAccess.analytics.permissionCombinations")}</CardTitle>
            <CardDescription>{t("clientAccess.analytics.permissionCombinationsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.combinationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Clients by Access */}
        <Card>
          <CardHeader>
            <CardTitle>{t("clientAccess.analytics.topClientsByAccess")}</CardTitle>
            <CardDescription>{t("clientAccess.analytics.topClientsByAccessDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.clientData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Projects by Access */}
        <Card>
          <CardHeader>
            <CardTitle>{t("clientAccess.analytics.topProjectsByClient")}</CardTitle>
            <CardDescription>{t("clientAccess.analytics.topProjectsByClientDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.projectData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t("clientAccess.analytics.recentAccessGrants")}</CardTitle>
          <CardDescription>{t("clientAccess.analytics.recentAccessGrantsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentActivity.map((access: any) => (
              <div
                key={access.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-primary/10 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{access.clients?.name || t("clientAccess.analytics.unknownClient")}</p>
                      <p className="text-sm text-muted-foreground">
                        {access.projects?.name || t("clientAccess.analytics.unknownProject")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-13">
                    {access.can_view_documents && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {t("clientAccess.docs")}
                      </Badge>
                    )}
                    {access.can_view_financials && (
                      <Badge variant="outline" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {t("clientAccess.finance")}
                      </Badge>
                    )}
                    {access.can_download_reports && (
                      <Badge variant="outline" className="text-xs">
                        <Download className="h-3 w-3 mr-1" />
                        {t("clientAccess.reports")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(access.created_at), "MMM dd, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(access.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

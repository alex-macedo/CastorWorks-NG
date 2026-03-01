import { useState } from "react";
import { Plus, Search, MapPin, Calendar, User, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const Obras = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useLocalization();

  // Sample project data
  const projects = [
    {
      id: 1,
      name: "Residencial Vila Silva",
      client: "João Silva",
      type: "Residencial",
      status: "in-progress",
      progress: 60,
      location: "São Paulo, SP",
      startDate: "01/03/2024",
      manager: "Carlos Oliveira",
      budget: "R$ 450.000",
      spent: "R$ 270.000",
    },
    {
      id: 2,
      name: "Edifício Comercial Centro",
      client: "ABC Corporation",
      type: "Comercial",
      status: "in-progress",
      progress: 30,
      location: "Rio de Janeiro, RJ",
      startDate: "15/04/2024",
      manager: "Ana Santos",
      budget: "R$ 1.200.000",
      spent: "R$ 360.000",
    },
    {
      id: 3,
      name: "Reforma Apt 302",
      client: "Maria Santos",
      type: "Reforma",
      status: "in-progress",
      progress: 90,
      location: "Belo Horizonte, MG",
      startDate: "10/02/2024",
      manager: "Roberto Lima",
      budget: "R$ 180.000",
      spent: "R$ 162.000",
    },
  ];

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-progress":
        return <Badge className="bg-primary">{t('obras.statusInProgress')}</Badge>;
      case "planning":
        return <Badge variant="outline">{t('obras.statusPlanning')}</Badge>;
      case "completed":
        return <Badge className="bg-success">{t('obras.statusCompleted')}</Badge>;
      case "paused":
        return <Badge variant="destructive">{t('obras.statusPaused')}</Badge>;
      default:
        return null;
    }
  };

  const getProgressStatus = (progress: number) => {
    if (progress >= 80) {
      return { icon: CheckCircle, color: "text-success", label: t('obras.onSchedule') };
    } else if (progress < 40) {
      return { icon: AlertCircle, color: "text-warning", label: t('obras.attention') };
    } else {
      return { icon: TrendingUp, color: "text-success", label: t('obras.onSchedule') };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('obras.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80 mt-1">{t('obras.subtitle')}</p>
          </div>
          <Button variant="default">
            <Plus className="mr-2 h-4 w-4" />
            {t('obras.newProject')}
          </Button>
        </div>
      </SidebarHeaderShell>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('obras.searchPlaceholder')}
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Project List */}
      <div className="grid gap-4">
        {filteredProjects.map((project) => {
          const progressStatus = getProgressStatus(project.progress);
          const StatusIcon = progressStatus.icon;

          return (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      {getStatusBadge(project.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('obras.client')}: {project.client}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t('obras.viewDetails')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t('obras.progress')}</span>
                    <span className="text-muted-foreground">{project.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-gradient-primary rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${progressStatus.color}`} />
                    <span className={`text-sm ${progressStatus.color}`}>
                      {progressStatus.label}
                    </span>
                  </div>
                </div>

                {/* Project Info Grid */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{project.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Início: {project.startDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{project.manager}</span>
                  </div>
                  <div>
                    <Badge variant="outline">{project.type}</Badge>
                  </div>
                </div>

                {/* Budget Info */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Orçamento</p>
                    <p className="font-medium">{project.budget}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs text-muted-foreground">Gasto</p>
                    <p className="font-medium">{project.spent}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className="font-medium text-success">
                      R$ {(parseFloat(project.budget.replace(/[^\d,]/g, '').replace(',', '.')) - 
                           parseFloat(project.spent.replace(/[^\d,]/g, '').replace(',', '.'))).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Obras;

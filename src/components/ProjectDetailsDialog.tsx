import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { User, Calendar, MapPin, DollarSign, TrendingUp } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface Project {
  id: number;
  name: string;
  client: string;
  type?: string;
  status: string;
  progress: number;
  budgetUsed: number;
  manager: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  location?: string;
  image?: string;
}

interface ProjectDetailsDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectDetailsDialog = ({
  project,
  open,
  onOpenChange,
}: ProjectDetailsDialogProps) => {
  const { t } = useLocalization();
  const projectTypeOptions = [
    { key: 'Project Owned', label: t('projects:projectOwned') },
    { key: 'Project Customer', label: t('projects:projectCustomer') },
  ];
  const getProjectTypeLabel = (typeKey?: string) => {
    if (!typeKey) return '';
    const option = projectTypeOptions.find(opt => opt.key === typeKey);
    return option?.label || typeKey;
  };
  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{project.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Image */}
          {project.image && (
            <div className="relative h-48 rounded-lg overflow-hidden">
              <img
                src={project.image}
                alt={project.name}
                className="w-full h-full object-cover"
              />
              <Badge
                className={`absolute top-4 right-4 ${
                  project.status === "On Track"
                    ? "bg-success hover:bg-success"
                    : "bg-destructive hover:bg-destructive"
                }`}
              >
                {project.status}
              </Badge>
            </div>
          )}

          {/* Project Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('projects:client')}
              </p>
              <p className="font-medium">{project.client}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('projects:manager')}
              </p>
              <p className="font-medium">{project.manager}</p>
            </div>

            {project.location && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('projects:location')}
                </p>
                <p className="font-medium">{project.location}</p>
              </div>
            )}

            {project.type && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('projects:type.label')}</p>
                <Badge variant="outline" className="text-primary border-primary">
                  {getProjectTypeLabel(project.type)}
                </Badge>
              </div>
            )}
          </div>

          {/* Progress and Budget */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{t('projects:progress')}</h3>
                    <span className="text-2xl font-bold text-primary">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{t('projects:budgetUsed')}</h3>
                    <span
                      className={`text-2xl font-bold ${
                        project.budgetUsed > 100
                          ? "text-destructive"
                          : project.budgetUsed > 90
                          ? "text-warning"
                          : "text-success"
                      }`}
                    >
                      {project.budgetUsed}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        project.budgetUsed > 100
                          ? "bg-destructive"
                          : project.budgetUsed > 90
                          ? "bg-warning"
                          : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(project.budgetUsed, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" variant="pill" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid gap-4">
                {project.startDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-medium">Duration:</span>{" "}
                      {project.startDate} - {project.endDate}
                    </span>
                  </div>
                )}

                {project.budget && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-medium">Total Budget:</span> {project.budget}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Status:</span>{" "}
                    <Badge
                      className={
                        project.status === "On Track"
                          ? "bg-success hover:bg-success"
                          : "bg-destructive hover:bg-destructive"
                      }
                    >
                      {project.status}
                    </Badge>
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                Timeline information coming soon
              </div>
            </TabsContent>

            <TabsContent value="budget" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                Budget breakdown coming soon
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

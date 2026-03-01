import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, UserCheck, BarChart3, FileText } from "lucide-react";
import {
  useClientAccessList,
  useCreateClientAccess,
  useUpdateClientAccess,
  useDeleteClientAccess,
  useClientUsers,
} from "@/hooks/useClientAccess";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";
import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function ClientAccessManagement() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { data: accessList, isLoading } = useClientAccessList();
  const { clients } = useClients();
  const { projects } = useProjects();
  const { data: clientUsers } = useClientUsers();
  const createAccess = useCreateClientAccess();
  const updateAccess = useUpdateClientAccess();
  const deleteAccess = useDeleteClientAccess();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("none");
  const [permissions, setPermissions] = useState({
    can_view_documents: true,
    can_view_financials: false,
    can_download_reports: true,
  });

  // Filter projects based on selected client
  const filteredProjects = selectedClient
    ? projects?.filter((project: any) => project.client_id === selectedClient)
    : [];

  // Reset project selection when client changes
  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
    setSelectedProject(""); // Reset project when client changes
  };

  const handleOpenDialog = (access?: any) => {
    if (access) {
      setEditingAccess(access);
      setSelectedClient(access.client_id);
      setSelectedProject(access.project_id);
      setSelectedUser(access.user_id || "none");
      setPermissions({
        can_view_documents: access.can_view_documents,
        can_view_financials: access.can_view_financials,
        can_download_reports: access.can_download_reports,
      });
    } else {
      setEditingAccess(null);
      setSelectedClient("");
      setSelectedProject("");
      setSelectedUser("none");
      setPermissions({
        can_view_documents: true,
        can_view_financials: false,
        can_download_reports: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedClient || !selectedProject) {
      toast.error(t("clientAccess.selectBothRequired"));
      return;
    }

    if (!selectedUser || selectedUser === "none") {
      toast.error("Please select a specific user for client access");
      return;
    }

    if (editingAccess) {
      await updateAccess.mutateAsync({
        id: editingAccess.id,
        updates: {
          user_id: selectedUser,
          ...permissions,
        },
      });
    } else {
      await createAccess.mutateAsync({
        client_id: selectedClient,
        project_id: selectedProject,
        user_id: selectedUser,
        ...permissions,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("clientAccess.deleteConfirm"))) {
      await deleteAccess.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t("clientAccess.loadingClientAccess")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("clientAccess.title")}</h1>
            <p className="text-muted-foreground">
              {t("clientAccess.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="glass-style-white"
              onClick={() => navigate("/client-access/audit-log")}
            >
              <FileText className="h-4 w-4 mr-2" />
              {t("clientAccess.auditLog.title")}
            </Button>
            <Button
              variant="glass-style-white"
              onClick={() => navigate("/client-access/analytics")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {t("clientAccess.viewAnalytics")}
            </Button>
            <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="glass-style-white"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("clientAccess.grantAccess")}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    {editingAccess ? t("clientAccess.editAccess") : t("clientAccess.grantAccessTitle")}
                  </SheetTitle>
                  <SheetDescription>
                    {t("clientAccess.grantAccessDescription")}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">{t("clientAccess.client")}</Label>
                    <Select
                      value={selectedClient}
                      onValueChange={handleClientChange}
                      disabled={!!editingAccess}
                    >
                      <SelectTrigger id="client">
                        <SelectValue placeholder={t("clientAccess.selectClient")} />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project">{t("clientAccess.project")}</Label>
                    <Select
                      value={selectedProject}
                      onValueChange={setSelectedProject}
                      disabled={!!editingAccess || !selectedClient}
                    >
                      <SelectTrigger id="project">
                        <SelectValue placeholder={
                          !selectedClient
                            ? "Select a client first"
                            : t("clientAccess.selectProject")
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedClient ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Please select a client first
                          </div>
                        ) : filteredProjects.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No projects found for this client
                          </div>
                        ) : (
                          filteredProjects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user">{t("clientAccess.clientUser")} *</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger id="user">
                        <SelectValue placeholder={t("clientAccess.selectClientUser")} />
                      </SelectTrigger>
                      <SelectContent>
                        {!clientUsers || clientUsers.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No users with "client" role found. Create a client user first.
                          </div>
                        ) : (
                          clientUsers.map((userRole: any) => (
                            <SelectItem
                              key={userRole.user_id}
                              value={userRole.user_id}
                            >
                              {userRole.user_profiles?.display_name ||
                               userRole.user_profiles?.email ||
                               `User ID: ${userRole.user_id.substring(0, 8)}...`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Select a user account with the "client" role to grant project access
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">{t("clientAccess.permissions")}</h4>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="view-docs" className="cursor-pointer">
                        {t("clientAccess.viewDocuments")}
                      </Label>
                      <Switch
                        id="view-docs"
                        checked={permissions.can_view_documents}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, can_view_documents: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="view-financials" className="cursor-pointer">
                        {t("clientAccess.viewFinancials")}
                      </Label>
                      <Switch
                        id="view-financials"
                        checked={permissions.can_view_financials}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, can_view_financials: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="download-reports" className="cursor-pointer">
                        {t("clientAccess.downloadReports")}
                      </Label>
                      <Switch
                        id="download-reports"
                        checked={permissions.can_download_reports}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, can_download_reports: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <SheetFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t("clientAccess.cancel")}
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingAccess ? t("clientAccess.updateAccess") : t("clientAccess.grantAccess")}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </SidebarHeaderShell>

      <Card>
        <CardHeader>
          <CardTitle>{t("clientAccess.clientProjectAccess")}</CardTitle>
          <CardDescription>
            {t("clientAccess.clientProjectAccessDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!accessList || accessList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("clientAccess.noAccessConfigured")}</p>
              <p className="text-sm mt-2">{t("clientAccess.clickGrantAccess")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("clientAccess.client")}</TableHead>
                  <TableHead>{t("clientAccess.project")}</TableHead>
                  <TableHead>{t("clientAccess.user")}</TableHead>
                  <TableHead>{t("clientAccess.permissions")}</TableHead>
                  <TableHead>{t("clientAccess.status")}</TableHead>
                  <TableHead className="text-right">{t("clientAccess.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessList.map((access: any) => (
                  <TableRow key={access.id}>
                    <TableCell className="font-medium">
                      {access.clients?.name || t("clientAccess.unknown")}
                    </TableCell>
                    <TableCell>{access.projects?.name || t("clientAccess.unknown")}</TableCell>
                    <TableCell>
                      {access.user_id ? (
                        <Badge variant="outline">{t("clientAccess.assigned")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("clientAccess.allUsers")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {access.can_view_documents && (
                          <Badge variant="outline" className="text-xs">{t("clientAccess.docs")}</Badge>
                        )}
                        {access.can_view_financials && (
                          <Badge variant="outline" className="text-xs">{t("clientAccess.finance")}</Badge>
                        )}
                        {access.can_download_reports && (
                          <Badge variant="outline" className="text-xs">{t("clientAccess.reports")}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={access.projects?.status === "Active" ? "default" : "secondary"}
                      >
                        {access.projects?.status || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(access)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(access.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

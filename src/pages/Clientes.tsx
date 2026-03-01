import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { ClientForm } from "@/components/Clients/ClientForm";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/lib/toast-helpers";
import { useSeedDataStatus } from "@/hooks/useSeedDataStatus";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { resolveStorageUrl } from "@/utils/storage";
import { ClientCard } from "@/components/Clients/ClientCard";

const Clientes = () => {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { clients, isLoading, deleteClient } = useClients();
  const { projects } = useProjects();
  const { data: seedIds } = useSeedDataStatus();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<typeof clients[0] | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState<string | null>(null);

  const handleEdit = (client: typeof clients[0]) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleDelete = (clientId: string) => {
    setDeletingClient(clientId);
    setDeleteDialogOpen(true);
  };

  const enrichedClients = useMemo(() => {
      if (!clients) return [];
      return clients.map(client => {
          const clientProjects = (projects as any[])?.filter(p => p.client_id === client.id) || [];
          // Calculate total value if possible, otherwise 0
          const totalValue = clientProjects.reduce((sum, p) => sum + (p.budget_total || p.budget || 0), 0);
          
          return {
              ...client,
              projectCount: clientProjects.length,
              totalValue: totalValue
          }
      })
  }, [clients, projects]);

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("clients.title")}</h1>
            <p className="text-sidebar-primary-foreground/80">{t("clients.subtitle")}</p>
          </div>
          <Button
            variant="glass-style-white"
            onClick={() => {
              setEditingClient(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("clients.newClient")}
          </Button>
        </div>
      </SidebarHeaderShell>

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          // Skeleton Loading
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-3xl overflow-hidden bg-muted/20 animate-pulse h-[320px]">
              <div className="h-40 bg-muted/40" />
              <div className="p-6 space-y-3">
                <div className="h-6 bg-muted/40 rounded w-3/4" />
                <div className="h-4 bg-muted/40 rounded w-1/2" />
                <div className="h-12 bg-muted/40 rounded w-full mt-4" />
              </div>
            </div>
          ))
        ) : enrichedClients && enrichedClients.length > 0 ? (
          enrichedClients.map((client) => (
            <ClientCard 
              key={client.id} 
              client={client} 
              projects={projects as any[]}
              onClick={handleEdit}
            />
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState
              icon={UserPlus}
              title={t("tooltips.noClientsYet")}
              description={t('clients.emptyStateDesc')}
              primaryAction={{
                label: t('clients.newClient'),
                onClick: () => {
                  setEditingClient(undefined);
                  setFormOpen(true);
                }
              }}
            />
          </div>
        )}
      </div>

      <ClientForm 
        open={formOpen} 
        onOpenChange={setFormOpen}
        client={editingClient}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("tooltips.deleteClient")}
        description={t('clients.deleteDescription')}
        confirmText={t('clients.deleteConfirm')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={async () => {
          if (deletingClient) {
            try {
              await deleteClient.mutateAsync(deletingClient);
              toast.success("Client deleted successfully");
              setDeletingClient(null);
            } catch (error) {
              toast.error("Failed to delete client");
            }
          }
        }}
      />
    </div>
  );
};

export default Clientes;

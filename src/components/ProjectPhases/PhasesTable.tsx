import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDate } from "@/utils/reportFormatters";
import type { Database } from "@/integrations/supabase/types";

type ProjectPhase = Database['public']['Tables']['project_phases']['Row'];

interface PhasesTableProps {
  phases: ProjectPhase[];
  onEdit: (phaseId: string) => void;
  canEdit: boolean;
  projectBudget?: number;
}

export function PhasesTable({ phases, onEdit, canEdit, projectBudget }: PhasesTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const { t, dateFormat } = useLocalization();
  const { deletePhase, bulkUpdateStatus } = useProjectPhases(phases[0]?.project_id);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'on_hold': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': t('projectPhases.statusLabels.completed'),
      'in_progress': t('projectPhases.statusLabels.inProgress'),
      'on_hold': t('projectPhases.statusLabels.onHold'),
      'pending': t('projectPhases.statusLabels.pending'),
    };
    return statusMap[status] || status;
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deletePhase.mutate(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const calculateBudgetPercentage = (budgetAllocated: number | null) => {
    if (!budgetAllocated || !projectBudget || projectBudget === 0) return 0;
    return (budgetAllocated / projectBudget) * 100;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPhases(new Set(phases.map(p => p.id)));
    } else {
      setSelectedPhases(new Set());
    }
  };

  const handleSelectPhase = (phaseId: string, checked: boolean) => {
    const newSelection = new Set(selectedPhases);
    if (checked) {
      newSelection.add(phaseId);
    } else {
      newSelection.delete(phaseId);
    }
    setSelectedPhases(newSelection);
  };

  const handleBulkUpdate = () => {
    if (selectedPhases.size === 0 || !bulkStatus) return;
    
    const progressPercentage = bulkStatus === 'completed' ? 100 : 
                              bulkStatus === 'in_progress' ? 50 : 0;
    
    bulkUpdateStatus.mutate({
      ids: Array.from(selectedPhases),
      status: bulkStatus,
      progressPercentage
    });
    
    setSelectedPhases(new Set());
    setBulkStatus("");
  };

  const allSelected = phases.length > 0 && selectedPhases.size === phases.length;

  return (
    <>
      {selectedPhases.size > 0 && canEdit && (
        <Card className="mb-4 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {t('projectPhases.bulkActions.phasesSelected', { count: selectedPhases.size })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPhases(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('projectPhases.bulkActions.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('projectPhases.statusLabels.pending')}</SelectItem>
                  <SelectItem value="in_progress">{t('projectPhases.statusLabels.inProgress')}</SelectItem>
                  <SelectItem value="on_hold">{t('projectPhases.statusLabels.onHold')}</SelectItem>
                  <SelectItem value="completed">{t('projectPhases.statusLabels.completed')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleBulkUpdate}
                disabled={!bulkStatus || bulkUpdateStatus.isPending}
              >
                {t('projectPhases.bulkActions.updateStatus')}
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {canEdit && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>{t('projectPhases.columns.phaseName')}</TableHead>
              <TableHead>{t('projectPhases.columns.startDate')}</TableHead>
              <TableHead>{t('projectPhases.columns.endDate')}</TableHead>
              <TableHead>{t('projectPhases.columns.budgetAllocated')}</TableHead>
              <TableHead>{t('projectPhases.columns.budgetPercentage')}</TableHead>
              <TableHead>{t('projectPhases.columns.progress')}</TableHead>
              <TableHead>{t('projectPhases.columns.status')}</TableHead>
              {canEdit && <TableHead className="text-right">{t('projectPhases.columns.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {phases.map((phase) => (
              <TableRow key={phase.id}>
                {canEdit && (
                  <TableCell>
                    <Checkbox
                      checked={selectedPhases.has(phase.id)}
                      onCheckedChange={(checked) => handleSelectPhase(phase.id, checked as boolean)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{phase.phase_name}</TableCell>
                <TableCell>
                   {phase.start_date ? formatDate(phase.start_date, dateFormat) : '-'}
                </TableCell>
                <TableCell>
                   {phase.end_date ? formatDate(phase.end_date, dateFormat) : '-'}
                </TableCell>
                <TableCell>
                  ${phase.budget_allocated?.toLocaleString() || '0'}
                </TableCell>
                <TableCell>
                  <span className="font-medium text-primary">
                    {calculateBudgetPercentage(phase.budget_allocated).toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell>{phase.progress_percentage}%</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(phase.status || 'pending')}>
                    {getStatusLabel(phase.status || 'pending')}
                  </Badge>
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(phase.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(phase.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title={t('projectPhases.delete.phaseTitle')}
        description={t('projectPhases.delete.phaseDescription')}
      />
    </>
  );
}
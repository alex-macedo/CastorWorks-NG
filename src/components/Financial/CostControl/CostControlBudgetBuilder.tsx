import React, { useState } from 'react';
import { useBudgetVersions } from '@/hooks/useBudgetVersions';
import { useBudgetLines } from '@/hooks/useBudgetLines';
import { useProjectPhases } from '@/hooks/useProjectPhases';
import { BudgetVersionList } from './BudgetVersionList';
import { BudgetVersionDetail } from './BudgetVersionDetail';
import { BudgetVersionFormDialog } from './BudgetVersionFormDialog';
import { BudgetMatrixEditor, MatrixData } from './BudgetMatrixEditor';
import { CommitmentList } from './CommitmentList';
import { CommitmentFormDialog } from './CommitmentFormDialog';
import { BudgetTemplateSelectorDialog } from './BudgetTemplateSelectorDialog';
import { WbsImportDialog } from './WbsImportDialog';
import { useProjectCommitments } from '@/hooks/useProjectCommitments';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileText, FileSpreadsheet } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';

interface CostControlBudgetBuilderProps {
  projectId: string;
}

type ViewMode = 'list' | 'detail' | 'edit-matrix' | 'commitments';

export function CostControlBudgetBuilder({ projectId }: CostControlBudgetBuilderProps) {
  const { t, currency } = useLocalization();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [commitmentFormOpen, setCommitmentFormOpen] = useState(false);
  const [editingCommitmentId, setEditingCommitmentId] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [wbsImportDialogOpen, setWbsImportDialogOpen] = useState(false);

  const {
    versions,
    isLoading: isLoadingVersions,
    createVersion,
    isCreating,
    updateVersion,
    isUpdating,
    deleteVersion,
    isDeleting,
    promoteVersion,
    isPromoting,
  } = useBudgetVersions(projectId);

  const { phases = [], isLoading: isLoadingPhases } = useProjectPhases(projectId);

  const selectedVersion = versions.find((v) => v.id === selectedVersionId);
  const { lines, bulkUpsertLines, isUpserting } = useBudgetLines(selectedVersionId);
  
  const {
    commitments,
    isLoading: isLoadingCommitments,
    createCommitment,
    updateCommitment,
    deleteCommitment,
    isDeleting: isDeletingCommitment,
  } = useProjectCommitments(projectId);

  const handleCreateNew = () => {
    setEditingVersionId(null);
    setFormOpen(true);
  };

  const handleCreateFromTemplate = () => {
    setTemplateDialogOpen(true);
  };

  const handleTemplateApplied = (versionId: string) => {
    setSelectedVersionId(versionId);
    setViewMode('detail');
  };

  const handleImportFromWbs = () => {
    setWbsImportDialogOpen(true);
  };

  const handleWbsImported = (versionId: string) => {
    setSelectedVersionId(versionId);
    setViewMode('detail');
  };

  const handleEdit = (version: any) => {
    setEditingVersionId(version.id);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    if (editingVersionId) {
      updateVersion({ versionId: editingVersionId, input: data });
    } else {
      createVersion({
        projectId,
        ...data,
      });
    }
  };

  const handleSelectVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    setViewMode('detail');
  };

  const handleEditMatrix = () => {
    setViewMode('edit-matrix');
  };

  const handleSaveMatrix = (matrixData: MatrixData) => {
    if (!selectedVersionId) return;

    const newLines: any[] = [];
    Object.entries(matrixData).forEach(([phaseId, costCodes]) => {
      Object.entries(costCodes).forEach(([costCodeId, amount]) => {
        if (amount > 0) {
          newLines.push({
            phase_id: phaseId,
            cost_code_id: costCodeId,
            amount,
          });
        }
      });
    });

    bulkUpsertLines({
      versionId: selectedVersionId,
      lines: newLines,
    });

    setViewMode('detail');
  };

  const handleBackFromDetail = () => {
    setSelectedVersionId(null);
    setViewMode('list');
  };

  const handleBackFromMatrix = () => {
    setViewMode('detail');
  };

  const handleCreateCommitment = () => {
    setEditingCommitmentId(null);
    setCommitmentFormOpen(true);
  };

  const handleEditCommitment = (commitment: any) => {
    setEditingCommitmentId(commitment.id);
    setCommitmentFormOpen(true);
  };

  const handleCommitmentFormSubmit = async (data: any) => {
    if (editingCommitmentId) {
      updateCommitment({ id: editingCommitmentId, input: data });
    } else {
      createCommitment(data);
    }
    setCommitmentFormOpen(false);
    setEditingCommitmentId(null);
  };

  const editingCommitment = commitments.find((c) => c.id === editingCommitmentId);

  if (phases.length === 0 && !isLoadingPhases) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-amber-900">
                {t('budget:costControl.noPhasesError', { defaultValue: 'No Project Phases' })}
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                {t(
                  'budget:costControl.noPhasesMessage',
                  { defaultValue: 'Create project phases before setting up Cost-Control budgets.' }
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('budget:costControl.title', { defaultValue: 'Cost Control Budget' })}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {t(
                'budget:costControl.subtitle',
                { defaultValue: 'Manage budget versions and allocate budgets across project phases and cost codes' }
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleImportFromWbs}
              disabled={isLoadingVersions}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t('budget:costControl.importFromWbs', { defaultValue: 'Import from WBS' })}
            </Button>
            <Button
              variant="outline"
              onClick={handleCreateFromTemplate}
              disabled={isLoadingVersions}
            >
              <FileText className="mr-2 h-4 w-4" />
              {t('budget:costControl.createFromTemplate', { defaultValue: 'Create from Template' })}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="versions" variant="pill" className="w-full">
          <TabsList>
            <TabsTrigger value="versions">{t('budget:costControl.versions', { defaultValue: 'Budget Versions' })}</TabsTrigger>
            <TabsTrigger value="commitments">{t('financial.commitments.title', { defaultValue: 'Commitments' })}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="versions" className="space-y-4">
            <BudgetVersionList
              versions={versions}
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDelete={deleteVersion}
              onPromote={promoteVersion}
              isLoading={isLoadingVersions}
              isDeleting={isDeleting}
              isPromoting={isPromoting}
            />
          </TabsContent>
          
          <TabsContent value="commitments" className="space-y-4">
            <CommitmentList
              commitments={commitments}
              onCreateNew={handleCreateCommitment}
              onEdit={handleEditCommitment}
              onDelete={deleteCommitment}
              isLoading={isLoadingCommitments}
              isDeleting={isDeletingCommitment}
              currency={currency}
            />
          </TabsContent>
        </Tabs>

        <BudgetVersionFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleFormSubmit}
          item={editingVersionId ? versions.find((v) => v.id === editingVersionId) : undefined}
          isSubmitting={isCreating || isUpdating}
        />

        <CommitmentFormDialog
          open={commitmentFormOpen}
          onOpenChange={setCommitmentFormOpen}
          projectId={projectId}
          commitment={editingCommitment}
          onSubmit={handleCommitmentFormSubmit}
          isSubmitting={false}
        />

        <BudgetTemplateSelectorDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          projectId={projectId}
          onTemplateApplied={handleTemplateApplied}
        />

        <WbsImportDialog
          projectId={projectId}
          open={wbsImportDialogOpen}
          onOpenChange={setWbsImportDialogOpen}
          onSuccess={handleWbsImported}
        />
      </div>
    );
  }

  if (viewMode === 'detail' && selectedVersion) {
    return (
      <div className="space-y-6">
        <BudgetVersionDetail
          version={selectedVersion}
          onBack={handleBackFromDetail}
          onEdit={handleEditMatrix}
          onPromote={() => promoteVersion(selectedVersion.id)}
          phases={phases}
          isLoading={isLoadingVersions}
          isPromoting={isPromoting}
        />
      </div>
    );
  }

  if (viewMode === 'edit-matrix' && selectedVersion) {
    const initialMatrixData: MatrixData = {};
    lines.forEach((line) => {
      if (!initialMatrixData[line.phase_id]) {
        initialMatrixData[line.phase_id] = {};
      }
      initialMatrixData[line.phase_id][line.cost_code_id] = line.amount;
    });

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {t('budget:costControl.editMatrix', { defaultValue: 'Edit Budget Matrix' })}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{selectedVersion.name}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('budget:costControl.budgetAllocation', { defaultValue: 'Budget Allocation' })}</CardTitle>
            <CardDescription>
              {t(
                'budget:costControl.allocateDescription',
                { defaultValue: 'Enter budget amounts for each phase and cost code combination' }
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetMatrixEditor
              phases={phases}
              initialData={initialMatrixData}
              onSave={handleSaveMatrix}
              isLoading={isUpserting}
              isDisabled={selectedVersion.status !== 'draft'}
            />
          </CardContent>
        </Card>

        {selectedVersion.status !== 'draft' && (
          <div className="flex items-start gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">
                {t('budget:costControl.readOnly', { defaultValue: 'Read-Only' })}
              </h3>
              <p className="mt-1 text-sm text-blue-800">
                {t(
                  'budget:costControl.readOnlyMessage',
                  { defaultValue: 'Only draft versions can be edited.' }
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

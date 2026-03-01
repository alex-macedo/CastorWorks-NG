import { useState } from 'react';
import { useForms } from '@/hooks/useForms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, MoreVertical, Edit, Copy, BarChart, Share2, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FormShareDialog } from '@/components/forms/Share/FormShareDialog';
import { useLocalization } from '@/contexts/LocalizationContext';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';

/**
 * FormsListPage
 * 
 * Main forms management page with:
 * - Grid/List view of all forms
 * - Status filtering (draft, published, closed, archived)
 * - Search functionality
 * - Quick actions (edit, duplicate, delete, view responses, share)
 * - Create new form button
 */
export function FormsListPage() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'closed' | 'archived'>('all');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFormForShare, setSelectedFormForShare] = useState<{ id: string; token: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);

  const { forms, isLoading, deleteForm, duplicateForm } = useForms(
    statusFilter === 'all' ? { searchQuery } : { status: statusFilter, searchQuery }
  );

  const handleCreateNew = () => {
    navigate('/forms/new');
  };

  const handleEdit = (formId: string) => {
    navigate(`/forms/${formId}/edit`);
  };

  const handleViewResponses = (formId: string) => {
    navigate(`/forms/${formId}/responses`);
  };

  const handleShare = (formId: string, shareToken: string) => {
    setSelectedFormForShare({ id: formId, token: shareToken });
    setShareDialogOpen(true);
  };

  const handleDuplicate = (formId: string) => {
    duplicateForm.mutate(formId);
  };

  const handleDeleteClick = (formId: string) => {
    setFormToDelete(formId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (formToDelete) {
      deleteForm.mutate(formToDelete);
      setFormToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'closed':
        return 'outline';
      case 'archived':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = !searchQuery || 
      form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('forms:title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">
              {t('forms:description')}
            </p>
          </div>
          <Button
            variant="glass-style-white"
            onClick={handleCreateNew}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('forms:createForm')}
          </Button>
        </div>
      </SidebarHeaderShell>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('forms:searchForms')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <TabsList>
            <TabsTrigger value="all">{t('forms:status.all')}</TabsTrigger>
            <TabsTrigger value="draft">{t('forms:status.draft')}</TabsTrigger>
            <TabsTrigger value="published">{t('forms:status.published')}</TabsTrigger>
            <TabsTrigger value="closed">{t('forms:status.closed')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Forms Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('common:loading')}
        </div>
      ) : filteredForms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('forms:noForms')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('forms:noFormsDescription')}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                {t('forms:createForm')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {filteredForms.map((form) => (
            <Card key={form.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate text-sm">{form.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {form.description || 'No Description'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(form.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('forms:actions.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewResponses(form.id)}>
                        <BarChart className="mr-2 h-4 w-4" />
                        {t('forms:viewResponses')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(form.id, form.share_token)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        {t('forms:shareForm')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(form.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        {t('forms:actions.duplicate')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(form.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('forms:actions.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant={getStatusBadgeVariant(form.status)}>
                      {t(`forms:status.${form.status}`)}
                    </Badge>
                    <span className="text-muted-foreground">
                      v{form.version}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {format(new Date(form.created_at), 'MMM d, yyyy')}
                  </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="glass-style-dark"
                        className="flex-1"
                        onClick={() => handleEdit(form.id)}
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        {t('forms:actions.edit')}
                      </Button>
                      <Button
                        variant="glass-style-dark"
                        className="flex-1"
                        onClick={() => handleViewResponses(form.id)}
                      >
                        <BarChart className="mr-2 h-3 w-3" />
                        {t('forms:responses.title')}
                      </Button>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Share Dialog */}
      {selectedFormForShare && (
        <FormShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          formId={selectedFormForShare.id}
          shareToken={selectedFormForShare.token}
        />
      )}

      {/* Deletion Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('forms:confirmations.deleteForm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('forms:confirmations.deleteFormDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('forms:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('forms:actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default FormsListPage;

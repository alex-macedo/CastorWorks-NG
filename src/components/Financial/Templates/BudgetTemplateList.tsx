import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Eye, Edit, Copy, Trash2, Plus } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { formatCurrency } from '@/utils/formatters'
import { formatDateSystem } from '@/utils/dateSystemFormatters'
import { useBudgetTemplates } from '@/hooks/useBudgetTemplates'

// Local type definition to work around missing types
interface BudgetTemplate {
  id: string
  name: string
  description?: string
  budget_type: 'simple' | 'cost_control'
  is_public?: boolean
  is_default?: boolean
  is_system?: boolean
  total_budget_amount?: number
  created_at?: string
}

interface BudgetTemplateListProps {
  templates: BudgetTemplate[]
  onSelectTemplate?: (template: BudgetTemplate) => void
  onEdit?: (template: BudgetTemplate) => void
  onDelete?: (templateId: string) => void
  onDuplicate?: (templateId: string) => void
  onView?: (template: BudgetTemplate) => void
  onApplyTemplate?: (template: BudgetTemplate) => void
  showApplyButton?: boolean
  readOnly?: boolean
}

export function BudgetTemplateList({
  templates = [],
  onSelectTemplate,
  onEdit,
  onDelete,
  onDuplicate,
  onView,
  onApplyTemplate,
  showApplyButton = false,
  readOnly = false,
}: BudgetTemplateListProps) {
  const { t, currency } = useLocalization()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)



  const handleDelete = async (templateId: string) => {
    setIsDeleting(true)
    try {
      await onDelete?.(templateId)
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const handleDuplicate = async (templateId: string) => {
    setIsDuplicating(true)
    try {
      await onDuplicate?.(templateId)
    } finally {
      setIsDuplicating(false)
    }
  }

  const getBudgetTypeLabel = (type: string) => {
    return type === 'simple'
      ? t('templates:type.simple', 'Simple')
      : t('templates:type.costControl', 'Cost Control')
  }

  const getBudgetTypeVariant = (type: string) => {
    return type === 'simple' ? 'secondary' : 'default'
  }

  return (
    <div className="space-y-4">


      {/* Templates List */}
      {!templates || templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            {t('templates:noTemplates', 'No templates created yet')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate mb-2">{template.name}</h3>

                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {template.description}
                      </p>
                    )}

                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{formatCurrency(Number(template.total_budget_amount || 0), currency)}</span>
                      <span>
                        {t('templates:createdBy', 'Created')}{' '}
                        {template.created_at && formatDateSystem(template.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex gap-2">
                      {/* View Button - Always visible (first) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onView?.(template)
                          onSelectTemplate?.(template)
                        }}
                        title={t('common.view', 'View')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {!readOnly && (
                        <>
                          {/* Edit Button (second) */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit?.(template)}
                            title={t('common.edit', 'Edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {/* Copy/Duplicate Button (third) */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(template.id)}
                            disabled={isDuplicating}
                            title={t('templates:duplicate', 'Duplicate')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          {/* Delete Button (fourth) - only if not system or default template */}
                          {!template.is_system && !template.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(template.id)}
                              disabled={isDeleting}
                              className="text-destructive hover:text-destructive"
                              title={t('common.delete', 'Delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}

                      {showApplyButton && (
                        <Button
                          size="sm"
                          onClick={() => onApplyTemplate?.(template)}
                          className="ml-2"
                        >
                          {t('templates:apply', 'Apply')}
                        </Button>
                      )}
                    </div>
                    
                    {/* Badges under the action buttons */}
                    <div className="flex items-center gap-2">
                      <Badge variant={getBudgetTypeVariant(template.budget_type)}>
                        {getBudgetTypeLabel(template.budget_type)}
                      </Badge>
                      {template.is_public && (
                        <Badge variant="outline">{t('templates:public', 'Public')}</Badge>
                      )}
                      {template.is_default && (
                        <Badge variant="secondary">{t('templates:default', 'Default')}</Badge>
                      )}
                      {template.is_system && (
                        <Badge variant="outline">{t('templates:system', 'System')}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('templates:deleteConfirm', 'This template will be permanently deleted. This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

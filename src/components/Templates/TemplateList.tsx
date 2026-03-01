import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Eye, Edit, Copy, Trash2 } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'

interface TemplateItem {
  id: string
  name: string
  description?: string
  isDefault?: boolean
  isSystem?: boolean
  isPublic?: boolean
  metadata?: { label: string; value: string }[]
  badges?: { label: string; variant?: 'default' | 'secondary' | 'outline' | 'destructive' }[]
}

interface TemplateListProps {
  templates: TemplateItem[]
  onEdit?: (template: TemplateItem) => void
  onDelete?: (templateId: string) => void
  onDuplicate?: (templateId: string) => void
  onView?: (template: TemplateItem) => void
  className?: string
}

export function TemplateList({
  templates = [],
  onEdit,
  onDelete,
  onDuplicate,
  onView,
  className,
}: TemplateListProps) {
  const { t } = useLocalization()
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

  if (!templates || templates.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          {t('templates:noTemplates', 'No templates created yet')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-3', className)}>
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

                {/* Metadata row */}
                {template.metadata && template.metadata.length > 0 && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {template.metadata.map((meta, idx) => (
                      <span key={idx}>{meta.value}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {/* Action Buttons Row */}
                <div className="flex gap-1">
                  {/* View Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView?.(template)}
                    title={t('common.view', 'View')}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(template)}
                    title={t('common.edit', 'Edit')}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  {/* Copy/Duplicate Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicate(template.id)}
                    disabled={isDuplicating}
                    title={t('templates:duplicate', 'Duplicate')}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>

                  {/* Delete Button - only if not system or default template */}
                  {!template.isSystem && !template.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(template.id)}
                      disabled={isDeleting}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title={t('common.delete', 'Delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {template.badges?.map((badge, idx) => (
                    <Badge 
                      key={idx} 
                      variant={badge.variant || 'default'}
                      className="text-xs"
                    >
                      {badge.label}
                    </Badge>
                  ))}
                  {template.isDefault && (
                    <Badge variant="secondary" className="text-xs">{t('templates:default', 'Default')}</Badge>
                  )}
                  {template.isSystem && (
                    <Badge variant="outline" className="text-xs">{t('templates:system', 'System')}</Badge>
                  )}
                  {template.isPublic && (
                    <Badge variant="outline" className="text-xs">{t('templates:public', 'Public')}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

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

export default TemplateList

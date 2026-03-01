import { ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Package, Clock, Briefcase, Activity, FolderTree, DollarSign, Plus, Eye, Edit, Copy, Trash2, type LucideIcon } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'

interface TemplateCardProps {
  id: string
  name: string
  description?: string
  type: 'budget' | 'materials' | 'labor' | 'phase' | 'activity' | 'wbs'
  isDefault?: boolean
  isSystem?: boolean
  isPublic?: boolean
  onEdit?: () => void
  onUse?: () => void
  onView?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  className?: string
  children?: ReactNode
  imageUrl?: string
  category?: string
  categoryLabel?: string
  userName?: string
  userAvatar?: string
  variant?: 'default' | 'create'
}

const iconMap: Record<string, LucideIcon> = {
  budget: DollarSign,
  materials: Package,
  labor: Briefcase,
  phase: Clock,
  activity: Activity,
  wbs: FolderTree,
}

export function TemplateCard({
  id,
  name,
  description,
  type,
  isDefault,
  isSystem,
  isPublic,
  onEdit,
  onUse,
  onView,
  onDelete,
  onDuplicate,
  className,
  children,
  imageUrl,
  category,
  categoryLabel,
  userName,
  userAvatar,
  variant = 'default',
}: TemplateCardProps) {
  const { t } = useLocalization()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  // Create card variant - dashed border, centered content
  if (variant === 'create') {
    return (
      <Card
        className={cn(
          'overflow-hidden transition-all hover:shadow-lg border-2 border-dashed border-border hover:border-primary cursor-pointer h-full',
          className
        )}
        onClick={onUse}
      >
        <CardContent className="p-0 h-full">
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">{name}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete?.()
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      await onDuplicate?.()
    } finally {
      setIsDuplicating(false)
    }
  }

  const Icon = iconMap[type] || Package
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    const viewOrUse = onView ?? onUse
    viewOrUse?.()
  }
  const isCardClickable = !!(onView ?? onUse)

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden transition-shadow hover:shadow-lg h-full flex flex-col',
          isCardClickable && 'cursor-pointer hover:ring-2 hover:ring-primary/20',
          className
        )}
        onClick={isCardClickable ? handleCardClick : undefined}
        role={isCardClickable ? 'button' : undefined}
        tabIndex={isCardClickable ? 0 : undefined}
        onKeyDown={isCardClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (onView ?? onUse)?.(); } } : undefined}
      >
         <CardContent className="p-0 flex flex-col h-full">
           {/* Image Section - Top of card */}
           <div className="relative w-full h-32 bg-gradient-to-br from-muted to-muted/80 flex-shrink-0">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />
              </div>
            )}
          {/* Category Badge - Top right */}
          {category && (
            <Badge className="absolute top-3 right-3 bg-background/90 text-foreground text-xs px-3 py-1">
              {category}
            </Badge>
          )}
          {/* Badges - Bottom left of image */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            {isDefault && (
              <Badge variant="secondary" className="bg-background/90 text-foreground text-xs">
                {t('templates:default', 'Default')}
              </Badge>
            )}
            {isSystem && (
              <Badge variant="outline" className="bg-background/90 text-muted-foreground text-xs">
                {t('templates:system', 'System')}
              </Badge>
            )}
            {isPublic && (
              <Badge variant="outline" className="bg-background/90 text-muted-foreground text-xs">
                {t('templates:public', 'Public')}
              </Badge>
            )}
          </div>
          </div>

           {/* Content Section */}
           <div className="flex flex-col flex-1 p-3">
             {/* User Info */}
             {userName && (
               <div className="flex items-center gap-2 mb-2">
                 {userAvatar ? (
                   <img src={userAvatar} alt={userName} className="w-5 h-5 rounded-full" />
                 ) : (
                   <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                     <span className="text-xs text-muted-foreground font-medium">{userName.charAt(0).toUpperCase()}</span>
                   </div>
                 )}
                 <span className="text-xs text-muted-foreground">{userName}</span>
               </div>
             )}
             
             {/* Title */}
             <h3 className="font-semibold text-sm mb-1 text-foreground line-clamp-1">{name}</h3>
             
             {/* Description */}
             {description && (
               <p className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">
                 {description}
               </p>
             )}

             {/* Action Buttons Row - View, Edit, Copy, Delete */}
             <div className="flex items-center justify-end gap-1 mt-auto" onClick={(e) => e.stopPropagation()}>
              {/* View Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onView}
                title={t('common.view', 'View')}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>

              {/* Edit Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                title={t('common.edit', 'Edit')}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>

              {/* Copy/Duplicate Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDuplicate}
                disabled={isDuplicating}
                title={t('templates:duplicate', 'Duplicate')}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>

              {/* Delete Button - only if not system or default template */}
              {!isSystem && !isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(true)}
                  disabled={isDeleting}
                  title={t('common.delete', 'Delete')}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>


          </div>
          
           {/* Stats/Children Section */}
           {children && (
             <div className="border-t border-border bg-muted/50 p-2 text-xs text-foreground">
               {children}
             </div>
           )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('templates:deleteConfirm', 'This template will be permanently deleted. This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel onClick={() => setDeleteConfirm(false)}>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default TemplateCard

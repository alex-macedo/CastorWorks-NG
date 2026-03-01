import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useContactTypes, DEFAULT_CONTACT_TYPES, ContactTypeConfig } from '@/hooks/useContactTypes';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Plus, Pencil, Trash2, RotateCcw, Loader2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Predefined color palette for contact types
 * Using Tailwind's color palette for consistency
 */
const COLOR_PALETTE = [
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#6b7280', label: 'Gray' },
  { value: '#ef4444', label: 'Red' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#a855f7', label: 'Purple' },
];

interface ContactTypeFormData {
  id: string;
  label: string;
  color: string;
}

export function ContactTypesManager() {
  const { t } = useLocalization();
  const { contactTypes, updateContactTypes, isUpdating } = useContactTypes();

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ContactTypeFormData>({
    id: '',
    label: '',
    color: COLOR_PALETTE[0].value,
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // Form validation
  const [errors, setErrors] = useState<{ id?: string; label?: string }>({});

  const validateForm = (isEdit = false): boolean => {
    const newErrors: { id?: string; label?: string } = {};

    if (!formData.label.trim()) {
      newErrors.label = t('settings.contactTypes.errors.labelRequired');
    }

    if (!formData.id.trim()) {
      newErrors.id = t('settings.contactTypes.errors.idRequired');
    } else if (!/^[a-z0-9_-]+$/.test(formData.id)) {
      newErrors.id = t('settings.contactTypes.errors.idInvalid');
    } else if (!isEdit && contactTypes.some((type) => type.id === formData.id)) {
      newErrors.id = t('settings.contactTypes.errors.idExists');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateId = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 32);
  };

  const handleLabelChange = (label: string) => {
    setFormData((prev) => ({
      ...prev,
      label,
      // Auto-generate ID from label only when adding new
      id: editingIndex === null ? generateId(label) : prev.id,
    }));
  };

  const handleAdd = () => {
    if (!validateForm()) return;

    const newTypes = [...contactTypes, formData];
    updateContactTypes(newTypes);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEdit = () => {
    if (!validateForm(true) || editingIndex === null) return;

    const newTypes = [...contactTypes];
    newTypes[editingIndex] = formData;
    updateContactTypes(newTypes);
    setIsEditDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (deletingIndex === null) return;

    const newTypes = contactTypes.filter((_, index) => index !== deletingIndex);
    updateContactTypes(newTypes);
    setIsDeleteDialogOpen(false);
    setDeletingIndex(null);
  };

  const handleReset = () => {
    updateContactTypes(DEFAULT_CONTACT_TYPES);
    setIsResetDialogOpen(false);
  };

  const openEditDialog = (index: number) => {
    setEditingIndex(index);
    setFormData(contactTypes[index]);
    setErrors({});
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (index: number) => {
    setDeletingIndex(index);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ id: '', label: '', color: COLOR_PALETTE[0].value });
    setEditingIndex(null);
    setErrors({});
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('settings.contactTypes.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('settings.contactTypes.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsResetDialogOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('settings.contactTypes.resetDefaults')}
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('settings.contactTypes.addType')}
          </Button>
        </div>
      </div>

      {/* Contact Types List */}
      <div className="border rounded-lg divide-y">
        {contactTypes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {t('settings.contactTypes.noTypes')}
          </div>
        ) : (
          contactTypes.map((type, index) => (
            <div
              key={type.id}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                <div
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: type.color }}
                />
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground font-mono">{type.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(index)}
                  disabled={isUpdating}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeleteDialog(index)}
                  disabled={isUpdating}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.contactTypes.addType')}</DialogTitle>
            <DialogDescription>
              {t('settings.contactTypes.addDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">{t('settings.contactTypes.label')} *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder={t('settings.contactTypes.labelPlaceholder')}
              />
              {errors.label && (
                <p className="text-sm text-destructive">{errors.label}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="id">{t('settings.contactTypes.id')}</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) => setFormData((prev) => ({ ...prev, id: e.target.value }))}
                placeholder="contractor"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.contactTypes.idHint')}
              </p>
              {errors.id && (
                <p className="text-sm text-destructive">{errors.id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('settings.contactTypes.color')}</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      formData.color === color.value
                        ? 'border-primary scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData((prev) => ({ ...prev, color: color.value }))}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAdd} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.contactTypes.editType')}</DialogTitle>
            <DialogDescription>
              {t('settings.contactTypes.editDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">{t('settings.contactTypes.label')} *</Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                placeholder={t('settings.contactTypes.labelPlaceholder')}
              />
              {errors.label && (
                <p className="text-sm text-destructive">{errors.label}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-id">{t('settings.contactTypes.id')}</Label>
              <Input
                id="edit-id"
                value={formData.id}
                disabled
                className="font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.contactTypes.idCannotChange')}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('settings.contactTypes.color')}</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      formData.color === color.value
                        ? 'border-primary scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData((prev) => ({ ...prev, color: color.value }))}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.contactTypes.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.contactTypes.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.contactTypes.resetConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.contactTypes.resetConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              {t('settings.contactTypes.resetDefaults')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

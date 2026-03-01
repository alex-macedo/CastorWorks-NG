import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useDropdownOptions,
  useCreateDropdownOption,
  useUpdateDropdownOption,
  useDeleteDropdownOption,
  useSetDefaultDropdownOption,
  useReorderDropdownOptions,
  type DropdownOption,
  type DropdownCategory,
} from '@/hooks/useDropdownOptions';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Star, GripVertical, Loader2 } from 'lucide-react';
import { SalesPipelineColumnsManager } from './SalesPipelineColumnsManager';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Predefined color palette for task priorities
 */
const COLOR_PALETTE = [
  { value: '#6B7280', label: 'Gray' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#10B981', label: 'Emerald' },
  { value: '#8B5CF6', label: 'Violet' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#F97316', label: 'Orange' },
];

/**
 * Category configuration
 */
const CATEGORIES: {
  id: DropdownCategory | 'sales_pipeline_columns';
  label: string;
  hasColor: boolean;
  hasDependencies: boolean;
  isSpecial?: boolean;
}[] = [
  { id: 'task_priority', label: 'taskPriority', hasColor: true, hasDependencies: false },
  { id: 'task_status', label: 'taskStatus', hasColor: true, hasDependencies: false },
  { id: 'project_type', label: 'projectType', hasColor: false, hasDependencies: false },
  { id: 'project_status', label: 'projectStatus', hasColor: false, hasDependencies: false },
  { id: 'construction_unit', label: 'constructionUnit', hasColor: false, hasDependencies: false },
  { id: 'floor_type', label: 'floorType', hasColor: false, hasDependencies: true },
  { id: 'finishing_type', label: 'finishingType', hasColor: false, hasDependencies: true },
  { id: 'roof_type', label: 'roofType', hasColor: false, hasDependencies: true },
  { id: 'terrain_type', label: 'terrainType', hasColor: false, hasDependencies: true },
  { id: 'sales_pipeline_columns', label: 'salesPipelineColumns', hasColor: false, hasDependencies: false, isSpecial: true },
];

interface SortableRowProps {
  option: DropdownOption;
  categoryConfig: typeof CATEGORIES[0];
  onSetDefault: (option: DropdownOption) => void;
  onEdit: (option: DropdownOption) => void;
  onDelete: (option: DropdownOption) => void;
  isPending: boolean;
}

function SortableRow({ option, categoryConfig, onSetDefault, onEdit, onDelete, isPending }: SortableRowProps) {
  const { t } = useLocalization();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50' : ''}
      {...attributes}
    >
      <TableCell className="w-10">
        <div
          className="w-4 h-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing hover:text-muted-foreground"
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{option.label}</TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {option.value}
        </code>
      </TableCell>
      {categoryConfig.hasColor && (
        <TableCell>
          <div
            className="w-6 h-6 rounded-full border"
            style={{ backgroundColor: option.color || '#ccc' }}
          />
        </TableCell>
      )}
      <TableCell>
        {option.is_default ? (
          <Badge variant="default" className="gap-1">
            <Star className="w-3 h-3" />
            {t('settings.dropdownOptions.default')}
          </Badge>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetDefault(option)}
            disabled={isPending || !option.is_active}
          >
            {t('settings.dropdownOptions.setDefault')}
          </Button>
        )}
      </TableCell>
      <TableCell>
        <Switch checked={option.is_active} disabled />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(option)}
            disabled={isPending}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(option)}
            disabled={isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface OptionFormData {
  id?: string;
  label: string;
  value: string;
  description: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
}

export function DropdownOptionsManager() {
  const { t } = useLocalization();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<DropdownCategory | 'sales_pipeline_columns'>(CATEGORIES[0].id);
  const activeCategoryConfig = CATEGORIES.find((c) => c.id === activeCategory)!;

  // Check if this is the special sales pipeline columns category
  const isSalesPipelineColumns = activeCategory === 'sales_pipeline_columns';

  // Queries and mutations - only for regular dropdown categories
  const { data: options = [], isLoading, error } = useDropdownOptions(activeCategory as DropdownCategory);
  
  const createMutation = useCreateDropdownOption();
  const updateMutation = useUpdateDropdownOption();
  const deleteMutation = useDeleteDropdownOption();
  const setDefaultMutation = useSetDefaultDropdownOption();

  // Drag and drop functionality
  const [draggingOption, setDraggingOption] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reorderMutation = useReorderDropdownOptions();

  const handleDragStart = (event: any) => {
    setDraggingOption(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id === over?.id) {
      setDraggingOption(null);
      return;
    }

    if (over?.id) {
      const oldIndex = options.findIndex((option) => option.id === active.id);
      const newIndex = options.findIndex((option) => option.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(options, oldIndex, newIndex);
        const orderedIds = newOrder.map((option) => option.id);
        
        try {
          await reorderMutation.mutateAsync({
            category: activeCategory as DropdownCategory,
            orderedIds: orderedIds,
          });
          
          toast({
            title: t('settings.dropdownOptions.dragDrop.reorderSuccess'),
            description: t('settings.dropdownOptions.dragDrop.reorderDescription'),
          });
        } catch (error) {
          toast({
            title: t('settings.dropdownOptions.dragDrop.reorderError'),
            description: t('settings.dropdownOptions.dragDrop.reorderErrorDescription'),
            variant: 'destructive',
          });
        }
      }
    }
    setDraggingOption(null);
  };

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<OptionFormData>({
    label: '',
    value: '',
    description: '',
    color: COLOR_PALETTE[1].value,
    is_default: false,
    is_active: true,
  });
  const [editingOption, setEditingOption] = useState<DropdownOption | null>(null);
  const [deletingOption, setDeletingOption] = useState<DropdownOption | null>(null);

  // Form validation
  const [errors, setErrors] = useState<{ label?: string; value?: string }>({});

  const validateForm = (isEdit = false): boolean => {
    const newErrors: { label?: string; value?: string } = {};

    if (!formData.label.trim()) {
      newErrors.label = t('settings.dropdownOptions.errors.labelRequired');
    }

    if (!formData.value.trim()) {
      newErrors.value = t('settings.dropdownOptions.errors.valueRequired');
    } else if (!isEdit && options.some((opt) => opt.value === formData.value)) {
      newErrors.value = t('settings.dropdownOptions.errors.valueExists');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateValue = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  };

  const handleLabelChange = (label: string) => {
    setFormData((prev) => ({
      ...prev,
      label,
      // Auto-generate value from label only when adding new
      value: editingOption ? prev.value : generateValue(label),
    }));
  };

  const handleAdd = () => {
    if (!validateForm()) return;

    createMutation.mutate(
      {
        category: activeCategory,
        value: formData.value,
        label: formData.label,
        description: formData.description || null,
        color: activeCategoryConfig.hasColor ? formData.color : null,
        is_default: formData.is_default,
        is_active: formData.is_active,
        sort_order: options.length + 1,
      },
      {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleEdit = () => {
    if (!validateForm(true) || !editingOption) return;

    updateMutation.mutate(
      {
        id: editingOption.id,
        updates: {
          label: formData.label,
          description: formData.description || null,
          color: activeCategoryConfig.hasColor ? formData.color : null,
          is_default: formData.is_default,
          is_active: formData.is_active,
        },
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingOption(null);
          resetForm();
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deletingOption) return;

    deleteMutation.mutate(
      {
        id: deletingOption.id,
        category: activeCategory,
      },
      {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setDeletingOption(null);
        },
      }
    );
  };

  const handleSetDefault = (option: DropdownOption) => {
    setDefaultMutation.mutate({
      id: option.id,
      category: activeCategory,
    });
  };

  const openEditDialog = (option: DropdownOption) => {
    setEditingOption(option);
    setFormData({
      label: option.label,
      value: option.value,
      description: option.description || '',
      color: option.color || COLOR_PALETTE[1].value,
      is_default: option.is_default,
      is_active: option.is_active,
    });
    setErrors({});
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (option: DropdownOption) => {
    setDeletingOption(option);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      label: '',
      value: '',
      description: '',
      color: COLOR_PALETTE[1].value,
      is_default: false,
      is_active: true,
    });
    setEditingOption(null);
    setErrors({});
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    setDefaultMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.dropdownOptions.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as DropdownCategory | 'sales_pipeline_columns')}
        >
          <TabsList className="flex flex-nowrap justify-start gap-1 mb-6 h-auto w-full bg-muted/50 p-1 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id} 
                className="text-xs md:text-sm px-3 py-1.5 h-auto min-w-max flex-shrink-0"
              >
                {t(`settings.dropdownOptions.categories.${cat.label}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((cat) => (
            <TabsContent key={cat.id} value={cat.id}>
              {cat.isSpecial ? (
                // Special component for sales pipeline columns
                <SalesPipelineColumnsManager />
              ) : (
                <>
                {/* Regular dropdown options management */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {t(`settings.dropdownOptions.categories.${cat.label}`)}
                    </h3>
                    {cat.hasDependencies && (
                      <p className="text-sm text-muted-foreground">
                        {t('settings.dropdownOptions.dependenciesNotice')}
                      </p>
                    )}
                  </div>
                  <Button onClick={openAddDialog} disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {t('settings.dropdownOptions.addOption')}
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={options.map(opt => opt.id)} 
                      strategy={verticalListSortingStrategy}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>{t('settings.dropdownOptions.table.label')}</TableHead>
                            <TableHead>{t('settings.dropdownOptions.table.value')}</TableHead>
                            {cat.hasColor && (
                              <TableHead>{t('settings.dropdownOptions.table.color')}</TableHead>
                            )}
                            <TableHead>{t('settings.dropdownOptions.table.default')}</TableHead>
                            <TableHead>{t('settings.dropdownOptions.table.active')}</TableHead>
                            <TableHead className="text-right">
                              {t('settings.dropdownOptions.table.actions')}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell
                                colSpan={cat.hasColor ? 7 : 6}
                                className="text-center py-8"
                              >
                                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                              </TableCell>
                            </TableRow>
                          ) : options.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={cat.hasColor ? 7 : 6}
                                className="text-center py-8 text-muted-foreground"
                              >
                                {t('settings.dropdownOptions.empty')}
                              </TableCell>
                            </TableRow>
                          ) : (
                            options.map((option) => (
                              <SortableRow
                                key={option.id}
                                option={option}
                                categoryConfig={cat}
                                onSetDefault={handleSetDefault}
                                onEdit={openEditDialog}
                                onDelete={openDeleteDialog}
                                isPending={isPending}
                              />
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </SortableContext>
                    <DragOverlay>
                      {draggingOption && (
                        <div className="bg-white border rounded-lg p-2 shadow-lg">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {options.find(opt => opt.id === draggingOption)?.label}
                            </span>
                          </div>
                        </div>
                      )}
                    </DragOverlay>
                  </DndContext>
                </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('settings.dropdownOptions.addOption')}</DialogTitle>
              <DialogDescription>
                {t('settings.dropdownOptions.addDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">
                  {t('settings.dropdownOptions.form.label')} *
                </Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder={t('settings.dropdownOptions.form.labelPlaceholder')}
                />
                {errors.label && (
                  <p className="text-sm text-destructive">{errors.label}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">
                  {t('settings.dropdownOptions.form.value')} *
                </Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, value: e.target.value }))
                  }
                  placeholder={t('settings.dropdownOptions.form.valuePlaceholder')}
                />
                {errors.value && (
                  <p className="text-sm text-destructive">{errors.value}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('settings.dropdownOptions.form.valueHelp')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  {t('settings.dropdownOptions.form.description')}
                </Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={t('settings.dropdownOptions.form.descriptionPlaceholder')}
                />
              </div>

              {activeCategoryConfig.hasColor && (
                <div className="space-y-2">
                  <Label>{t('settings.dropdownOptions.form.color')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, color: color.value }))
                        }
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color.value
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_default: checked }))
                  }
                />
                <Label htmlFor="is_default">
                  {t('settings.dropdownOptions.form.setDefault')}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">
                  {t('settings.dropdownOptions.form.active')}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAdd} disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('common.add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('settings.dropdownOptions.editOption')}</DialogTitle>
              <DialogDescription>
                {t('settings.dropdownOptions.editDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-label">
                  {t('settings.dropdownOptions.form.label')} *
                </Label>
                <Input
                  id="edit-label"
                  value={formData.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                />
                {errors.label && (
                  <p className="text-sm text-destructive">{errors.label}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-value">
                  {t('settings.dropdownOptions.form.value')}
                </Label>
                <Input id="edit-value" value={formData.value} disabled />
                <p className="text-xs text-muted-foreground">
                  {t('settings.dropdownOptions.form.valueReadOnly')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">
                  {t('settings.dropdownOptions.form.description')}
                </Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              {activeCategoryConfig.hasColor && (
                <div className="space-y-2">
                  <Label>{t('settings.dropdownOptions.form.color')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, color: color.value }))
                        }
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color.value
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  id="edit-is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_default: checked }))
                  }
                />
                <Label htmlFor="edit-is_default">
                  {t('settings.dropdownOptions.form.setDefault')}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="edit-is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="edit-is_active">
                  {t('settings.dropdownOptions.form.active')}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleEdit} disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('settings.dropdownOptions.deleteTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('settings.dropdownOptions.deleteDescription', {
                  label: deletingOption?.label,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isPending}
                className="bg-destructive"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

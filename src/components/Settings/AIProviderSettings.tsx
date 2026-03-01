import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Brain, Check, X, Settings as SettingsIcon, HelpCircle, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useAIProviderSettings, AIProviderConfig } from '@/hooks/useAIProviderSettings';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SortableRowProps {
  provider: AIProviderConfig;
  t: any;
  onToggle: (provider: AIProviderConfig) => void;
  onTest: (providerName: string) => void;
  onEdit: (provider: AIProviderConfig) => void;
  testingProvider: string | null;
  updatePending: boolean;
}

function SortableRow({ 
  provider, 
  t, 
  onToggle, 
  onTest, 
  onEdit, 
  testingProvider, 
  updatePending 
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: provider.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(isDragging && "bg-accent")}>
      <TableCell className="w-[30px]">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">
        {t(`aiProviders:providers.${provider.provider_name}`)}
      </TableCell>
      <TableCell>
        <Badge variant={provider.is_enabled ? 'default' : 'secondary'}>
          {provider.is_enabled
            ? t('aiProviders:status.enabled')
            : t('aiProviders:status.disabled')}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-sm">
        {provider.default_model}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{provider.priority_order}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Switch
            checked={provider.is_enabled}
            onCheckedChange={() => onToggle(provider)}
            disabled={updatePending}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTest(provider.provider_name)}
            disabled={!provider.is_enabled || testingProvider === provider.provider_name}
          >
            {testingProvider === provider.provider_name ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('aiProviders:actions.test')
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(provider)}
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function AIProviderSettings() {
  const { t } = useTranslation(['aiProviders', 'common']);
  const {
    providers,
    enabledProviders,
    defaultProvider,
    cacheTTL,
    isLoading,
    updateProvider,
    updateAppAISettings,
    reorderProviders,
    testConnection,
  } = useAIProviderSettings();

  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AIProviderConfig>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = providers!.findIndex((p) => p.id === active.id);
      const newIndex = providers!.findIndex((p) => p.id === over.id);

      const newOrder = arrayMove(providers!, oldIndex, newIndex).map((p, index) => ({
        id: p.id,
        priority_order: index + 1,
      }));

      reorderProviders.mutate(newOrder);
    }
  };

  // Handle provider enable/disable toggle
  const handleToggleProvider = async (provider: AIProviderConfig) => {
    await updateProvider.mutateAsync({
      id: provider.id,
      is_enabled: !provider.is_enabled,
    });
  };

  // Handle test connection
  const handleTestConnection = async (providerName: string) => {
    setTestingProvider(providerName);
    try {
      const result = await testConnection(providerName);

      if (result.success) {
        toast.success(
          result.latency
            ? t('aiProviders:test.successWithLatency', { latency: result.latency })
            : t('aiProviders:test.success')
        );
      } else {
        toast.error(`${t('aiProviders:test.failed')}: ${result.message}`);
      }
    } catch (error) {
      toast.error(t('aiProviders:messages.testError'));
    } finally {
      setTestingProvider(null);
    }
  };

  // Handle edit dialog open
  const handleEditProvider = (provider: AIProviderConfig) => {
    setEditingProvider(provider);
    setEditFormData({
      api_endpoint: provider.api_endpoint,
      api_key_encrypted: '', // Don't show existing key for security
      default_model: provider.default_model,
      max_tokens: provider.max_tokens,
      temperature: provider.temperature,
      priority_order: provider.priority_order,
    });
  };

  // Handle edit dialog save
  const handleSaveEdit = async () => {
    if (!editingProvider) return;

    // Only include API key if it was actually provided (not empty)
    const updates = { ...editFormData };
    if (!updates.api_key_encrypted) {
      delete updates.api_key_encrypted;
    }

    await updateProvider.mutateAsync({
      id: editingProvider.id,
      ...updates,
    });

    setEditingProvider(null);
    setEditFormData({});
  };

  const hasEnabledProviders = enabledProviders.length > 0;
  const providerIds = useMemo(() => providers?.map(p => p.id) || [], [providers]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <CardTitle>{t('aiProviders:title')}</CardTitle>
          </div>
          <CardDescription>{t('aiProviders:description')}</CardDescription>
        </CardHeader>
      </Card>

      {/* Warning if no providers enabled */}
      {!hasEnabledProviders && (
        <Alert variant="destructive">
          <AlertDescription>{t('aiProviders:messages.allDisabled')}</AlertDescription>
        </Alert>
      )}

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('aiProviders:table.provider')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>{t('aiProviders:table.provider')}</TableHead>
                  <TableHead>{t('aiProviders:table.status')}</TableHead>
                  <TableHead>{t('aiProviders:table.model')}</TableHead>
                  <TableHead>{t('aiProviders:table.priority')}</TableHead>
                  <TableHead className="text-right">{t('aiProviders:table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={providerIds}
                  strategy={verticalListSortingStrategy}
                >
                  {providers?.map((provider) => (
                    <SortableRow
                      key={provider.id}
                      provider={provider}
                      t={t}
                      onToggle={handleToggleProvider}
                      onTest={handleTestConnection}
                      onEdit={handleEditProvider}
                      testingProvider={testingProvider}
                      updatePending={updateProvider.isPending}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </CardContent>
      </Card>

      {/* Global AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('aiProviders:settings.defaultProvider')}</CardTitle>
          <CardDescription>{t('aiProviders:settings.defaultProviderDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Provider Select */}
          <div className="space-y-2">
            <Label htmlFor="default-provider">{t('aiProviders:settings.defaultProvider')}</Label>
            <Select
              value={defaultProvider}
              onValueChange={(value) => {
                updateAppAISettings.mutate({ ai_default_provider: value });
              }}
            >
              <SelectTrigger id="default-provider" className="w-full sm:w-[300px]">
                <SelectValue placeholder={t('aiProviders:settings.defaultProvider')} />
              </SelectTrigger>
              <SelectContent>
                {providers?.filter(p => p.is_enabled).map((provider) => (
                  <SelectItem key={provider.id} value={provider.provider_name}>
                    {t(`aiProviders:providers.${provider.provider_name}`)}
                  </SelectItem>
                ))}
                {enabledProviders.length === 0 && (
                  <SelectItem value="none" disabled>
                    {t('aiProviders:messages.noProviders')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('aiProviders:settings.cacheTTL')}</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[cacheTTL]}
                onValueChange={([value]) => {
                  updateAppAISettings.mutate({ ai_cache_ttl_hours: value });
                }}
                min={1}
                max={168}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12">{cacheTTL}h</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('aiProviders:settings.cacheTTLDescription')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <CardTitle>{t('aiProviders:help.whatIsThis')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t('aiProviders:help.explanation')}</p>
          <p><strong>OLLAMA:</strong> {t('aiProviders:help.ollama')}</p>
          <p><strong>API Providers:</strong> {t('aiProviders:help.apiProviders')}</p>
          <p><strong>Fallback Chain:</strong> {t('aiProviders:help.fallbackChain')}</p>
          <p className="mt-2 text-primary/80 italic font-medium">
            💡 {t('common.tip', { defaultValue: 'Tip' })}: Drag rows in the table to reorder the fallback priority sequence.
          </p>
        </CardContent>
      </Card>

      {/* Edit Provider Dialog */}
      <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('aiProviders:dialog.editTitle')}</DialogTitle>
            <DialogDescription>
              {editingProvider &&
                t('aiProviders:dialog.editDescription', {
                  provider: t(`aiProviders:providers.${editingProvider.provider_name}`),
                })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* API Endpoint */}
            <div className="space-y-2">
              <Label>{t('aiProviders:dialog.apiEndpoint')}</Label>
              <Input
                value={editFormData.api_endpoint || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, api_endpoint: e.target.value })
                }
                placeholder={t('aiProviders:dialog.apiEndpointPlaceholder')}
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label>{t('aiProviders:dialog.apiKey')}</Label>
              <Input
                type="password"
                value={editFormData.api_key_encrypted || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, api_key_encrypted: e.target.value })
                }
                placeholder={t('aiProviders:dialog.apiKeyPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('aiProviders:dialog.apiKeyDescription')}
              </p>
            </div>

            {/* Default Model */}
            <div className="space-y-2">
              <Label>{t('aiProviders:dialog.defaultModel')}</Label>
              <Input
                value={editFormData.default_model || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, default_model: e.target.value })
                }
                placeholder={t('aiProviders:dialog.defaultModelPlaceholder')}
              />
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label>{t('aiProviders:dialog.maxTokens')}</Label>
              <Input
                type="number"
                value={editFormData.max_tokens || 1200}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, max_tokens: parseInt(e.target.value) })
                }
                min={1}
                max={100000}
              />
              <p className="text-xs text-muted-foreground">
                {t('aiProviders:dialog.maxTokensDescription')}
              </p>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <Label>{t('aiProviders:dialog.temperature')}</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[editFormData.temperature || 0.6]}
                  onValueChange={([value]) =>
                    setEditFormData({ ...editFormData, temperature: value })
                  }
                  min={0}
                  max={2}
                  step={0.1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">
                  {(editFormData.temperature || 0.6).toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('aiProviders:dialog.temperatureDescription')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProvider(null)}>
              {t('aiProviders:actions.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateProvider.isPending}>
              {updateProvider.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('aiProviders:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, MapPin, Ruler, Sparkles } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';

const projectInfoSchema = z.object({
  clientId: z.string().uuid().optional(),
  projectType: z.enum([
    'kitchen',
    'bathroom',
    'basement',
    'whole_home',
    'deck',
    'roofing',
    'flooring',
    'painting',
    'addition',
    'custom'
  ]),
  location: z.string().min(3),
  squareFootage: z.number().min(1).max(100000).optional().or(z.literal('')),
  qualityLevel: z.enum(['economy', 'standard', 'premium', 'luxury']),
  clientBudget: z.number().min(0).optional().or(z.literal('')),
});

type ProjectInfoData = z.infer<typeof projectInfoSchema>;

interface Props {
  initialData?: Partial<ProjectInfoData>;
  onNext: (data: ProjectInfoData) => void;
}

export const ProjectInfoStep = ({ initialData, onNext }: Props) => {
  const { t } = useLocalization();
  // Fetch clients for dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ProjectInfoData>({
    resolver: zodResolver(projectInfoSchema),
    defaultValues: {
      projectType: 'kitchen',
      qualityLevel: 'standard',
      location: '',
      ...initialData,
    },
  });

  const onSubmit = (data: ProjectInfoData) => {
    onNext(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Client Selection */}
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('estimates.projectInfo.client')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('estimates.projectInfo.clientPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clientsLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : clients && clients.length > 0 ? (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      {t('estimates.projectInfo.noClientsFound')}
                    </div>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                {t('estimates.projectInfo.clientDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Project Type */}
        <FormField
          control={form.control}
          name="projectType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('estimates.projectInfo.projectType')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="kitchen">{t('estimates.projectInfo.projectTypes.kitchen')}</SelectItem>
                  <SelectItem value="bathroom">{t('estimates.projectInfo.projectTypes.bathroom')}</SelectItem>
                  <SelectItem value="basement">{t('estimates.projectInfo.projectTypes.basement')}</SelectItem>
                  <SelectItem value="whole_home">{t('estimates.projectInfo.projectTypes.whole_home')}</SelectItem>
                  <SelectItem value="deck">{t('estimates.projectInfo.projectTypes.deck')}</SelectItem>
                  <SelectItem value="roofing">{t('estimates.projectInfo.projectTypes.roofing')}</SelectItem>
                  <SelectItem value="flooring">{t('estimates.projectInfo.projectTypes.flooring')}</SelectItem>
                  <SelectItem value="painting">{t('estimates.projectInfo.projectTypes.painting')}</SelectItem>
                  <SelectItem value="addition">{t('estimates.projectInfo.projectTypes.addition')}</SelectItem>
                  <SelectItem value="custom">{t('estimates.projectInfo.projectTypes.custom')}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {t('estimates.projectInfo.projectTypeDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('estimates.projectInfo.location')}
              </FormLabel>
              <FormControl>
                <Input placeholder={t('estimates.projectInfo.locationPlaceholder')} {...field} />
              </FormControl>
              <FormDescription>
                {t('estimates.projectInfo.locationDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Square Footage */}
        <FormField
          control={form.control}
          name="squareFootage"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                {t('estimates.projectInfo.squareFootage')}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t('estimates.projectInfo.squareFootagePlaceholder')}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                {t('estimates.projectInfo.squareFootageDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quality Level */}
        <FormField
          control={form.control}
          name="qualityLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {t('estimates.projectInfo.qualityLevel')}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="economy">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{t('estimates.projectInfo.qualityLevels.economy.label')}</span>
                      <span className="text-xs text-muted-foreground">{t('estimates.projectInfo.qualityLevels.economy.description')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="standard">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{t('estimates.projectInfo.qualityLevels.standard.label')}</span>
                      <span className="text-xs text-muted-foreground">{t('estimates.projectInfo.qualityLevels.standard.description')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="premium">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{t('estimates.projectInfo.qualityLevels.premium.label')}</span>
                      <span className="text-xs text-muted-foreground">{t('estimates.projectInfo.qualityLevels.premium.description')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="luxury">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{t('estimates.projectInfo.qualityLevels.luxury.label')}</span>
                      <span className="text-xs text-muted-foreground">{t('estimates.projectInfo.qualityLevels.luxury.description')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {t('estimates.projectInfo.qualityLevelDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Client Budget */}
        <FormField
          control={form.control}
          name="clientBudget"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('estimates.projectInfo.clientBudget')}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t('estimates.projectInfo.clientBudgetPlaceholder')}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                {t('estimates.projectInfo.clientBudgetDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" size="lg">
          {t('estimates.projectInfo.nextButton')}
        </Button>
      </form>
    </Form>
  );
};

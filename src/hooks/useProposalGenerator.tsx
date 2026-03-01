import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useProposalGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateSection = async (
    estimateId: string,
    section: string,
    tone: string = 'professional',
    companyInfo?: { name: string; phone?: string; email?: string },
    forceRefresh?: boolean
  ): Promise<string> => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-proposal-content', {
        body: {
          estimateId,
          sections: [section],
          tone,
          companyInfo: companyInfo || { name: 'Your Company' },
          forceRefresh: forceRefresh ?? false,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate content');
      }

      toast({
        title: 'Content Generated',
        description: `${section.replace(/_/g, ' ')} has been generated.`,
      });

      return data.sections[section];
    } catch (err: any) {
      toast({
        title: 'Generation Failed',
        description: err.message || 'An error occurred while generating content',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMultipleSections = async (
    estimateId: string,
    sections: string[],
    tone: string = 'professional',
    companyInfo?: { name: string; phone?: string; email?: string },
    forceRefresh?: boolean
  ): Promise<Record<string, string>> => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-proposal-content', {
        body: {
          estimateId,
          sections,
          tone,
          companyInfo: companyInfo || { name: 'Your Company' },
          forceRefresh: forceRefresh ?? false,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate content');
      }

      toast({
        title: 'Content Generated',
        description: `Generated ${sections.length} section(s) successfully.`,
      });

      return data.sections;
    } catch (err: any) {
      toast({
        title: 'Generation Failed',
        description: err.message || 'An error occurred while generating content',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateSection,
    generateMultipleSections,
    isGenerating,
  };
};

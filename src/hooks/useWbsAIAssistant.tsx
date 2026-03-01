import { useState } from 'react';
import { FunctionsHttpError, FunctionsFetchError } from '@supabase/functions-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';

const extractFunctionErrorMessage = async (error: unknown): Promise<string> => {
  // Log the raw error for developer debugging
  console.error('Raw Supabase Function Error:', error);

  // Handle FunctionsFetchError specifically
  if (error instanceof FunctionsFetchError) {
    console.error('FunctionsFetchError detected - network or auth issue');
    return 'Unable to connect to AI analysis service. Please check your internet connection and ensure you are logged in. If the problem persists, try refreshing the page.';
  }

  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response | undefined;
    if (response) {
      try {
        const clonedResponse = response.clone();
        const contentType = clonedResponse.headers.get('Content-Type') ?? '';
        if (contentType.includes('application/json')) {
          const body = await clonedResponse.json();
          console.error('Function Error Body:', body);
          if (body?.error) return String(body.error);
          if (body?.message) return String(body.message);
        } else {
          const text = await clonedResponse.text();
          console.error('Function Error Text:', text);
          if (text) return text.slice(0, 200); 
        }
      } catch (parseError) {
        console.error('Failed to parse function error response', parseError);
      }
      const statusDescription = response.statusText ? ` ${response.statusText}` : '';
      return `Function error (${response.status}${statusDescription})`;
    }
  }
  return error instanceof Error ? error.message : 'An error occurred during AI analysis';
};

interface WbsAnalysisSuggestion {
  id?: string;
  suggestedCode: string;
  reasoning: string;
}

interface WbsAnalysisResult {
  suggestions: WbsAnalysisSuggestion[];
}

export const useWbsAIAssistant = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLocalization();

  const batchAnalyzeCostCodes = async (
    items: Array<{ id?: string; name: string; description?: string | null }>,
    availableCostCodes: Array<{ code: string; name: string }>
  ): Promise<WbsAnalysisSuggestion[] | null> => {
    if (!items || items.length === 0) {
      return null;
    }

    setIsAnalyzing(true);

    try {
      // Check authentication state
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Authentication error: ' + authError.message);
      }
      if (!session?.user) {
        console.error('No authenticated user session');
        throw new Error('You must be logged in to use AI analysis. Please refresh the page and log in again.');
      }
      if (!session?.access_token) {
        console.error('No access token in session');
        throw new Error('Authentication session is invalid. Please log in again.');
      }

      // Check if token is expired and try to refresh
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        console.log('Session expired, attempting refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          console.error('Failed to refresh session:', refreshError);
          throw new Error('Your session has expired. Please log in again.');
        }
        console.log('Session refreshed successfully');
      }

      console.log('User authenticated:', session.user.id);
      console.log('Session access token exists:', !!session.access_token);
      console.log('Session expires at:', session.expires_at);
      console.log('Current timestamp:', Math.floor(Date.now() / 1000));

      const { data, error } = await supabase.functions.invoke('analyze-wbs-cost-code', {
        body: {
          items: items.map(it => ({
            id: it.id,
            name: it.name,
            description: it.description || undefined
          })),
          availableCostCodes,
          language,
        },
      });

      console.log('Supabase function invoke result:', { data: !!data, error });

      if (error) {
        const message = await extractFunctionErrorMessage(error);
        throw new Error(message);
      }

      const result = data as WbsAnalysisResult;
      
      toast({
        title: t('projectWbsTemplates.ai.batchAnalysisComplete'),
        description: t('projectWbsTemplates.ai.batchAnalysisCompleteDescription', { count: result.suggestions.length }),
      });

      return result.suggestions;
    } catch (err) {
      console.error('Error analyzing cost codes:', err);
      toast({
        title: t('projectWbsTemplates.ai.analysisFailed'),
        description: err instanceof Error ? err.message : t('projectWbsTemplates.ai.analysisFailedDescription'),
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeCostCode = async (
    itemName: string,
    itemDescription: string | null,
    availableCostCodes: Array<{ code: string; name: string }>
  ): Promise<string | null> => {
    const suggestions = await batchAnalyzeCostCodes(
      [{ name: itemName, description: itemDescription }],
      availableCostCodes
    );

    if (suggestions && suggestions.length > 0) {
      const suggestion = suggestions[0];
      toast({
        title: 'AI Analysis Complete',
        description: `Suggested: ${suggestion.suggestedCode}. ${suggestion.reasoning}`,
      });
      return suggestion.suggestedCode;
    }

    return null;
  };

  const createBulkAnalysisJSON = (
    items: Array<{ id?: string; name: string; description?: string | null }>,
    availableCostCodes: Array<{ code: string; name: string }>
  ): string => {
    const analysisData = {
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined
      })),
      availableCostCodes,
      language,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(analysisData, null, 2);
  };

  const downloadBulkAnalysisJSON = (
    items: Array<{ id?: string; name: string; description?: string | null }>,
    availableCostCodes: Array<{ code: string; name: string }>
  ): void => {
    const jsonContent = createBulkAnalysisJSON(items, availableCostCodes);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `wbs-cost-code-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    toast({
      title: t('projectWbsTemplates.ai.jsonFileCreated'),
      description: t('projectWbsTemplates.ai.jsonFileCreatedDescription'),
    });
  };

  return {
    analyzeCostCode,
    batchAnalyzeCostCodes,
    createBulkAnalysisJSON,
    downloadBulkAnalysisJSON,
    isAnalyzing,
  };
};


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalization } from "@/contexts/LocalizationContext";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  type: 'saving' | 'timing' | 'supplier';
}

interface ProcurementAIRecommendationsProps {
  recommendations?: string[];
  isLoading?: boolean;
  onDismiss?: () => void;
}

/**
 * Translates AI recommendations to match the user's selected language
 * Supports bidirectional translation between Portuguese and English
 */
const translateRecommendation = (recommendation: string, language: string): string => {
  // Translation mappings - bidirectional
  const translations: Record<string, Record<string, string>> = {
    // English to Portuguese
    'en-to-pt': {
      'Top supplier:': 'Melhor fornecedor:',
      '(Score:': '(Pontuação:',
      'Optimal purchase window:': 'Janela ideal de compra:',
      'Week': 'Semana',
      'Optimal for bulk orders': 'Ideal para pedidos em massa',
      'Save': 'Economizar',
      'Forecasted spend for next': 'Gasto previsto para os próximos',
      'days: Review budget allocation': 'dias: Revisar alocação de orçamento',
      'Review budget allocation': 'Revisar alocação de orçamento',
      'Supplier': 'Fornecedor',
      'Best': 'Melhor',
      'Recommended': 'Recomendado',
      'Optimize': 'Otimizar',
      'Budget': 'Orçamento',
      'Spend': 'Gastar',
      'Forecast': 'Previsão',
      // Specific phrases
      'Optimal for bulk orders - Save': 'Ideal para pedidos em massa - Economizar',
    },
    // Portuguese to English
    'pt-to-en': {
      'Recomendações Inteligentes de Compras': 'Smart Procurement Recommendations',
      'Melhor fornecedor:': 'Top supplier:',
      '(Pontuação:': '(Score:',
      'Janela ideal de compra:': 'Optimal purchase window:',
      'Semana': 'Week',
      'Ideal para pedidos em massa': 'Optimal for bulk orders',
      'Economizar': 'Save',
      'Gasto previsto para os próximos': 'Forecasted spend for next',
      'dias: Revisar alocação de orçamento': 'days: Review budget allocation',
      'Revisar alocação de orçamento': 'Review budget allocation',
      'Fornecedor': 'Supplier',
      'Melhor': 'Best',
      'Recomendado': 'Recommended',
      'Otimizar': 'Optimize',
      'Orçamento': 'Budget',
      'Gastar': 'Spend',
      'Previsão': 'Forecast',
    },
  };

  // Determine translation direction based on target language
  const direction = language === 'pt-BR' ? 'en-to-pt' : 'pt-to-en';
  const translationMap = translations[direction];

  // Apply translations by replacing known patterns
  let translated = recommendation;

  // Replace exact matches
  Object.entries(translationMap).forEach(([source, target]) => {
    translated = translated.replace(new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), target);
  });

  return translated;
};

export function ProcurementAIRecommendations({
  recommendations = [],
  isLoading,
  onDismiss
}: ProcurementAIRecommendationsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { t, language } = useLocalization();

  // Translate recommendations based on user's selected language
  const translatedRecommendations = useMemo(() => {
    return recommendations.map(rec => translateRecommendation(rec, language));
  }, [recommendations, language]);

  if (!isVisible || (!isLoading && recommendations.length === 0)) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                {t('procurement.aiRecommendations.title') || 'Smart Procurement Recommendations'}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsVisible(false);
                  onDismiss?.();
                }}
                aria-label={t('common.close') || 'Close'}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-primary/10 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-primary/10 rounded w-1/2 animate-pulse" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {translatedRecommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="bg-background/60 backdrop-blur-sm p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <p className="text-sm text-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
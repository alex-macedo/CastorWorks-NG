import { useEffect, useState } from 'react';
import { useForm } from '@/hooks/useForms';
import { useFormQuestions } from '@/hooks/useFormQuestions';
import { useFormResponses } from '@/hooks/useFormResponses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';
import {
  ShortAnswerQuestion,
  ParagraphQuestion,
  MultipleChoiceQuestion,
  CheckboxQuestion,
  LinearScaleQuestion,
  DateQuestion,
  TimeQuestion,
  FileUploadQuestion,
  DropdownQuestion,
} from '../Questions';
import { motion } from 'framer-motion';
import { useLocalization } from '@/contexts/LocalizationContext';
import { getFormTheme, type FormThemeVariant } from './glassTokens';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import resolveStorageUrl from '@/utils/storage';

interface FormRendererProps {
  formId: string;
  mode?: 'respond' | 'preview';
  onComplete?: () => void;
  themeVariant?: FormThemeVariant;
}

/**
 * FormRenderer Component
 * 
 * Displays a form for completion with:
 * - Progress tracking
 * - Validation
 * - Response submission
 * - Thank you page
 * 
 * Supports both anonymous and authenticated responses.
 */
export function FormRenderer({ formId, mode = 'respond', onComplete, themeVariant = 'light' }: FormRendererProps) {
  const { form } = useForm(formId);
  const { questions } = useFormQuestions(formId);
  const { startResponse, saveAnswer, completeResponse } = useFormResponses(formId);
  const { t } = useLocalization();
  const { settings: companySettings } = useCompanySettings();
  const [resolvedLogo, setResolvedLogo] = useState<string | null>(null);
  const theme = getFormTheme(themeVariant);
  const companyName = companySettings?.company_name || 'CastorWorks';

  useEffect(() => {
    const loadLogo = async () => {
      const candidate = companySettings?.company_logo_url || null;
      if (!candidate) {
        setResolvedLogo(null);
        return;
      }
      const url = await resolveStorageUrl(candidate);
      setResolvedLogo(url);
    };
    loadLogo();
  }, [companySettings?.company_logo_url]);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!form) {
    return (
      <div className="container max-w-2xl py-12 text-center">
        <p className="text-muted-foreground">Form not found</p>
      </div>
    );
  }

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    // Clear error for this question
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }

    // Auto-save in respond mode
    if (mode === 'respond' && currentResponseId) {
      saveAnswer.mutate({
        responseId: currentResponseId,
        answers: [{ questionId, answerText: String(value) }],
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    questions.forEach((question) => {
      if (question.required && !answers[question.id]) {
        newErrors[question.id] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (mode === 'preview') {
      onComplete?.();
      return;
    }

    // Start response if not already started
    let responseId = currentResponseId;
    if (!responseId) {
      const response = await startResponse.mutateAsync({});
      responseId = response.id;
      setCurrentResponseId(responseId);
    }

    // Submit all answers
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      answerText: typeof value === 'string' ? value : undefined,
      answerOptions: Array.isArray(value) ? value : undefined,
      answerNumber: typeof value === 'number' ? value : undefined,
    }));

    completeResponse.mutate(
      { responseId, answers: formattedAnswers },
      {
        onSuccess: () => {
          setIsSubmitted(true);
          onComplete?.();
        },
      }
    );
  };

  const renderQuestion = (question: any) => {
    const commonProps = {
      question,
      value: answers[question.id],
      onChange: (value: any) => handleAnswerChange(question.id, value),
      error: errors[question.id],
      disabled: isSubmitted,
      mode: mode as any,
    };

    switch (question.type) {
      case 'short_answer':
        return <ShortAnswerQuestion {...commonProps} />;
      case 'paragraph':
        return <ParagraphQuestion {...commonProps} />;
      case 'multiple_choice':
        return <MultipleChoiceQuestion {...commonProps} />;
      case 'checkboxes':
        return <CheckboxQuestion {...commonProps} />;
      case 'linear_scale':
        return <LinearScaleQuestion {...commonProps} />;
      case 'date':
        return <DateQuestion {...commonProps} />;
      case 'time':
        return <TimeQuestion {...commonProps} />;
      case 'file_upload':
        return <FileUploadQuestion {...commonProps} />;
      case 'dropdown':
        return <DropdownQuestion {...commonProps} />;
      default:
        // Graceful fallback for unknown types
        return (
          <div className="p-4 border border-dashed rounded-lg bg-muted/30 text-center text-muted-foreground text-sm">
            Unsupported question type: {question.type}
          </div>
        );
    }
  };

  const progress = (Object.keys(answers).length / questions.length) * 100;
  const showProgressBar = (form.settings as any)?.showProgressBar !== false;

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "circOut" }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 text-center space-y-8 max-w-lg w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="h-20 w-20 mx-auto rounded-full bg-green-50 flex items-center justify-center text-green-600 ring-8 ring-green-50/50"
          >
            <CheckCircle2 className="h-10 w-10" />
          </motion.div>
          
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              {t('forms:publicForm.thankYou')}
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed">
              {t('forms:publicForm.responseRecorded')}
            </p>
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:justify-center sm:gap-3 gap-2">
              <a
                href="/forms"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </a>
              <a
                href="https://castorworks.cloud/app"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#F97316] text-white text-sm font-semibold text-center hover:bg-[#ea6a12] transition-colors shadow-[0_10px_24px_-14px_rgba(249,115,22,0.55)]"
              >
                Open CastorWorks App
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 ${theme.backdrop}`}>
      {/* Sticky Header with Progress */}
      <div className={`sticky top-0 z-40 ${theme.header}`}>
        <div className="container max-w-3xl mx-auto px-4 py-3 flex flex-col gap-1">
          {showProgressBar && (
            <div className="flex flex-col gap-1">
              <div className={`text-sm font-semibold ${theme.textPrimary} truncate`}>{form.title}</div>
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-1.5 ${theme.progressTrack}`}>
                  <motion.div
                    className={`h-full ${theme.progressBar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-slate-500 text-xs">{Math.round(progress)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Title Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${theme.card} overflow-hidden`}
        >
          <div className={`h-1.5 ${theme.accentGradient}`} />
          <div className="p-6 md:p-10 space-y-4">
            <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${theme.textPrimary} leading-tight`}>
              {form.title}
            </h1>
            {form.description && (
              <p className={`text-lg ${theme.textSecondary} leading-relaxed max-w-2xl`}>
                {form.description}
              </p>
            )}
          </div>
        </motion.div>

        {/* Questions */}
        <div className="space-y-4 md:space-y-6">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className={`group ${theme.card} p-6 md:p-8 transition-all ${theme.cardHover}`}
            >
              <div className="max-w-2xl">
                {renderQuestion(question)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Submit Action */}
        {questions.length > 0 && (
          <div className="flex flex-col items-center gap-4 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={completeResponse.isPending}
              size="lg"
              className={`w-full md:w-auto min-w-[200px] h-14 text-lg font-semibold ${theme.cta} transition-all`}
            >
              {completeResponse.isPending ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Sending...
                </>
              ) : (
                mode === 'preview' ? 'Complete Review' : 'Submit Report'
              )}
            </Button>
            <p className="text-xs text-slate-500">
              By submitting this form, you agree to our terms of service.
            </p>
          </div>
        )}
      </div>
      
      {/* Bottom Padding for Mobile */}
      <div className="h-12 md:hidden" />
    </div>
  );
}

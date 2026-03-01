import { Textarea } from '@/components/ui/textarea';
import { QuestionWrapper } from './QuestionWrapper';
import type { Database } from '@/integrations/supabase/types';

type FormQuestion = Database['public']['Tables']['form_questions']['Row'];

interface ParagraphQuestionProps {
  question: FormQuestion;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  mode: 'edit' | 'preview' | 'respond';
}

export function ParagraphQuestion({
  question,
  value = '',
  onChange,
  error,
  disabled,
  mode,
}: ParagraphQuestionProps) {
  const validation = (question.validation as any) || {};
  const maxLength = validation.maxLength || undefined;

  return (
    <QuestionWrapper
      title={question.title}
      description={question.description || undefined}
      required={question.required}
      error={error}
      htmlFor={question.id}
    >
      <Textarea
        id={question.id}
        name={`question-${question.id}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || mode === 'preview'}
        maxLength={maxLength}
        placeholder={mode === 'respond' ? 'Your answer…' : 'Long answer text…'}
        rows={4}
        className="resize-none min-h-[120px] transition-all focus-visible:ring-primary/20"
      />
      {maxLength && value && (
        <p className="text-xs text-muted-foreground mt-1">
          {value.length} / {maxLength} characters
        </p>
      )}
    </QuestionWrapper>
  );
}

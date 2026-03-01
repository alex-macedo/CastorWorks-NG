import { Input } from '@/components/ui/input';
import { QuestionWrapper } from './QuestionWrapper';
import type { Database } from '@/integrations/supabase/types';

type FormQuestion = Database['public']['Tables']['form_questions']['Row'];

interface ShortAnswerQuestionProps {
  question: FormQuestion;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  mode: 'edit' | 'preview' | 'respond';
}

export function ShortAnswerQuestion({
  question,
  value = '',
  onChange,
  error,
  disabled,
  mode,
}: ShortAnswerQuestionProps) {
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
      <Input
        id={question.id}
        name={`question-${question.id}`}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || mode === 'preview'}
        maxLength={maxLength}
        placeholder={mode === 'respond' ? 'Your answer…' : 'Short answer text…'}
        className="max-w-xl h-11 transition-all focus-visible:ring-primary/20"
        autoComplete="off"
      />
      {maxLength && value && (
        <p className="text-xs text-muted-foreground mt-1">
          {value.length} / {maxLength} characters
        </p>
      )}
    </QuestionWrapper>
  );
}

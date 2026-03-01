import { Input } from '@/components/ui/input';
import { QuestionWrapper } from './QuestionWrapper';
import type { Database } from '@/integrations/supabase/types';
import { Clock } from 'lucide-react';

type FormQuestion = Database['public']['Tables']['form_questions']['Row'];

interface TimeQuestionProps {
  question: FormQuestion;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  mode: 'edit' | 'preview' | 'respond';
}

export function TimeQuestion({
  question,
  value = '',
  onChange,
  error,
  disabled,
  mode,
}: TimeQuestionProps) {
  return (
    <QuestionWrapper
      title={question.title}
      description={question.description || undefined}
      required={question.required}
      error={error}
      htmlFor={question.id}
    >
      <div className="relative max-w-xs">
        <div className="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 pointer-events-none">
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
        <Input
          id={question.id}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || mode === 'preview'}
          className="w-full h-11 transition-all focus-visible:ring-primary/20 bg-background"
        />
      </div>
    </QuestionWrapper>
  );
}

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { QuestionWrapper } from './QuestionWrapper';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type FormQuestion = Database['public']['Tables']['form_questions']['Row'];

interface MultipleChoiceQuestionProps {
  question: FormQuestion;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  mode: 'edit' | 'preview' | 'respond';
}

export function MultipleChoiceQuestion({
  question,
  value,
  onChange,
  error,
  disabled,
  mode,
}: MultipleChoiceQuestionProps) {
  const options = (question.options as any[]) || [];

  return (
    <QuestionWrapper
      title={question.title}
      description={question.description || undefined}
      required={question.required}
      error={error}
    >
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled || mode === 'preview'}
        className="space-y-3"
      >
        {options.map((option) => (
          <div key={option.id} className="flex">
            <RadioGroupItem value={option.value} id={option.id} className="sr-only" />
            <label 
              htmlFor={option.id}
              className={cn(
                "flex items-center w-full p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer relative overflow-hidden group",
                value === option.value
                  ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                  : "bg-card border-muted hover:border-primary/50 hover:bg-muted/30",
                (disabled || mode === 'preview') && "opacity-60 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 mr-4 shrink-0",
                 value === option.value 
                   ? "border-primary bg-primary text-primary-foreground" 
                   : "border-muted-foreground/30 bg-transparent group-hover:border-primary/50"
              )}>
                {value === option.value && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className={cn(
                "text-base font-medium leading-none select-none",
                value === option.value ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
            </label>
          </div>
        ))}
      </RadioGroup>
    </QuestionWrapper>
  );
}


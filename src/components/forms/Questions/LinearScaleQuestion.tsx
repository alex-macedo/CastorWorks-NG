import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { QuestionWrapper } from './QuestionWrapper';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type FormQuestion = Database['public']['Tables']['form_questions']['Row'];

interface LinearScaleQuestionProps {
  question: FormQuestion;
  value?: number;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
  mode: 'edit' | 'preview' | 'respond';
}

export function LinearScaleQuestion({
  question,
  value,
  onChange,
  error,
  disabled,
  mode,
}: LinearScaleQuestionProps) {
  const min = question.scale_min || 1;
  const max = question.scale_max || 5;
  const minLabel = question.scale_min_label;
  const maxLabel = question.scale_max_label;

  const scaleValues = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <QuestionWrapper
      title={question.title}
      description={question.description || undefined}
      required={question.required}
      error={error}
    >
      <div className="space-y-3">
        <RadioGroup
          value={value?.toString()}
          onValueChange={(v) => onChange(Number(v))}
          disabled={disabled || mode === 'preview'}
          className="flex items-center justify-between w-full max-w-2xl mx-auto gap-2"
        >
          {scaleValues.map((scaleValue) => {
            const isSelected = value === scaleValue;
            return (
              <div key={scaleValue} className="flex flex-col items-center gap-2">
                <label 
                  htmlFor={`scale-${scaleValue}`}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border transition-all duration-200 cursor-pointer shadow-sm active:scale-95",
                    isSelected 
                      ? "bg-primary text-primary-foreground border-primary shadow-primary ring-2 ring-primary ring-offset-2" 
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-input hover:border-primary/50",
                    (disabled || mode === 'preview') && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <RadioGroupItem value={scaleValue.toString()} id={`scale-${scaleValue}`} className="sr-only" />
                  <span className="text-sm sm:text-base font-semibold">
                    {scaleValue}
                  </span>
                </label>
              </div>
            );
          })}
        </RadioGroup>
        
        {(minLabel || maxLabel) && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{minLabel || ''}</span>
            <span>{maxLabel || ''}</span>
          </div>
        )}
      </div>
    </QuestionWrapper>
  );
}

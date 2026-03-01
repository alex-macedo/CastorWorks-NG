import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { QuestionWrapper } from './QuestionWrapper';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type FormQuestion = Database['public']['Tables']['form_questions']['Row'];

interface CheckboxQuestionProps {
  question: FormQuestion;
  value?: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
  mode: 'edit' | 'preview' | 'respond';
}

export function CheckboxQuestion({
  question,
  value = [],
  onChange,
  error,
  disabled,
  mode,
}: CheckboxQuestionProps) {
  const options = (question.options as any[]) || [];

  const handleToggle = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  return (
    <QuestionWrapper
      title={question.title}
      description={question.description || undefined}
      required={question.required}
      error={error}
    >
      <div className="space-y-2">
        {options.map((option) => {
          const isChecked = value.includes(option.value);
          return (
            <div key={option.id} className="flex">
              <label 
                htmlFor={option.id}
                className={cn(
                  "flex items-center space-x-3 w-full p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group",
                  isChecked 
                    ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" 
                    : "bg-card border-muted hover:border-primary/50 hover:bg-muted/30",
                  (disabled || mode === 'preview') && "opacity-60 cursor-not-allowed"
                )}
              >
                <Checkbox
                  id={option.id}
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleToggle(option.value, checked as boolean)
                  }
                  disabled={disabled || mode === 'preview'}
                  className={cn(isChecked && "data-[state=checked]:bg-primary data-[state=checked]:border-primary")}
                />
                <span className={cn(
                  "text-sm font-medium leading-none select-none",
                  isChecked ? "text-foreground" : "text-muted-foreground"
                )}>
                  {option.label}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </QuestionWrapper>
  );
}

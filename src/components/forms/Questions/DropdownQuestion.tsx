import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QuestionWrapper } from './QuestionWrapper';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type FormQuestion = Database['public']['Tables']['form_questions']['Row'];

interface DropdownQuestionProps {
  question: FormQuestion;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  mode: 'edit' | 'preview' | 'respond';
}

export function DropdownQuestion({
  question,
  value,
  onChange,
  error,
  disabled,
  mode,
}: DropdownQuestionProps) {
  const options = (question.options as any[]) || [];

  return (
    <QuestionWrapper
      title={question.title}
      description={question.description || undefined}
      required={question.required}
      error={error}
      htmlFor={question.id}
    >
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || mode === 'preview'}
      >
        <SelectTrigger 
          id={question.id}
          className={cn(
            "w-full h-11 transition-all duration-200 bg-background focus:ring-primary/20 hover:border-primary/50",
            value ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </QuestionWrapper>
  );
}

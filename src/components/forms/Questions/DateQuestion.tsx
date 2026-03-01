import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { QuestionWrapper } from './QuestionWrapper';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type FormQuestion = Database['public']['Tables']['form_questions']['Row'];

interface DateQuestionProps {
  question: FormQuestion;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  mode: 'edit' | 'preview' | 'respond';
}

export function DateQuestion({
  question,
  value,
  onChange,
  error,
  disabled,
  mode,
}: DateQuestionProps) {
  const selectedDate = value ? new Date(value) : undefined;

  return (
    <QuestionWrapper
      title={question.title}
      description={question.description || undefined}
      required={question.required}
      error={error}
      htmlFor={question.id}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={question.id}
            variant="outline"
            disabled={disabled || mode === 'preview'}
            className={cn(
              'w-full max-w-xs justify-start text-left font-normal h-11 transition-all focus-visible:ring-primary/20 hover:border-primary/50 text-base',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(selectedDate!, 'PPP') : <span>Pick a date…</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => onChange(date ? date.toISOString().split('T')[0] : '')}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </QuestionWrapper>
  );
}

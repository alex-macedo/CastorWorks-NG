import { useRef, useState } from 'react';
import { Upload, X, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionWrapper } from './QuestionWrapper';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type FormQuestion = Database['public']['Tables']['form_questions']['Row'];

interface FileUploadQuestionProps {
  question: FormQuestion;
  value?: File | string; // Can be a File object or a string URL if already uploaded
  onChange: (value: File | null) => void;
  error?: string;
  disabled?: boolean;
  mode: 'edit' | 'preview' | 'respond';
}

export function FileUploadQuestion({
  question,
  value,
  onChange,
  error,
  disabled,
  mode,
}: FileUploadQuestionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(
    typeof value === 'string' ? 'File uploaded' : value?.name || null
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFileName(file.name);
      onChange(file);
    } else {
      setFileName(null);
      onChange(null);
    }
  };

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFileName(null);
    onChange(null);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <QuestionWrapper
      title={question.title}
      description={question.description || undefined}
      required={question.required}
      error={error}
      htmlFor={question.id}
    >
      <div className="space-y-4">
        {!fileName ? (
          <div
            onClick={!disabled && mode !== 'preview' ? handleClick : undefined}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 transition-colors flex flex-col items-center justify-center gap-2 text-center",
              !disabled && mode !== 'preview' 
                ? "cursor-pointer hover:bg-muted/50 border-muted-foreground/25 hover:border-primary/50" 
                : "opacity-50 cursor-not-allowed border-muted",
              error && "border-destructive/50 bg-destructive/5"
            )}
          >
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">
                SVG, PNG, JPG or GIF (max. 10MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-background shadow-sm group">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <div className="flex items-center gap-1.5 text-xs text-green-600 mt-0.5">
                <Check className="h-3 w-3" />
                <span>Ready to upload</span>
              </div>
            </div>
            {!disabled && mode !== 'preview' && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          id={question.id}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || mode === 'preview'}
          accept="image/*,application/pdf" // Customize based on requirements
          aria-label={question.title || "File upload"}
        />
      </div>
    </QuestionWrapper>
  );
}

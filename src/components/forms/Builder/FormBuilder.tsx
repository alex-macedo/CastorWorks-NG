import { useState } from 'react';
import { useForms } from '@/hooks/useForms';
import { useFormQuestions } from '@/hooks/useFormQuestions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, Eye, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';

interface FormBuilderProps {
  formId?: string;
  projectId?: string;
  onSave?: (formId: string) => void;
}

/**
 * FormBuilder Component
 * 
 * Main form builder interface with:
 * - Form metadata editing (title, description)
 * - Question management
 * - Auto-save functionality
 * - Preview mode
 * - Publish controls
 * 
 * TODO: Add drag-and-drop reordering with @dnd-kit
 * TODO: Add real-time collaboration indicators
 * TODO: Add undo/redo functionality
 */
export function FormBuilder({ formId, projectId, onSave }: FormBuilderProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const { createForm, updateForm, publishForm } = useForms();
  const { questions, addQuestion, updateQuestion, deleteQuestion } = useFormQuestions(formId);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  // Auto-save handler (debounced in production)
  const handleAutoSave = () => {
    if (formId) {
      updateForm.mutate({
        id: formId,
        title: formTitle,
        description: formDescription,
      });
    }
  };

  const handleCreateForm = () => {
    createForm.mutate(
      {
        title: formTitle || 'Untitled Form',
        description: formDescription,
        project_id: projectId,
        status: 'draft',
      },
      {
        onSuccess: (newForm) => {
          onSave?.(newForm.id);
          toast({
            title: 'Form created',
            description: 'Your form has been created successfully.',
          });
        },
      }
    );
  };

  const handlePublish = () => {
    if (!formId) return;
    
    publishForm.mutate(formId, {
      onSuccess: () => {
        toast({
          title: 'Form published',
          description: 'Your form is now accepting responses.',
        });
      },
    });
  };

  const handleAddQuestion = (type: string) => {
    if (!formId) {
      toast({
        title: 'Save form first',
        description: 'Please save your form before adding questions.',
        variant: 'destructive',
      });
      return;
    }

    addQuestion.mutate({
      type,
      title: `${type.replace('_', ' ')} Question`,
      description: '',
      required: false,
      options: type === 'multiple_choice' || type === 'checkboxes' 
        ? [{ id: '1', label: 'Option 1', value: 'option1' }]
        : [],
    });
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Form Header */}
      <Card>
        <CardHeader>
          <CardTitle>Form Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">Form Title</Label>
            <Input
              id="form-title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              onBlur={handleAutoSave}
              placeholder="Enter form title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="form-description">Description (optional)</Label>
            <Textarea
              id="form-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              onBlur={handleAutoSave}
              placeholder="Provide context for respondents"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            {!formId ? (
              <Button onClick={handleCreateForm}>
                <Save className="mr-2 h-4 w-4" />
                Create Form
              </Button>
            ) : (
              <>
                <Button onClick={handleAutoSave} variant="outline">
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button onClick={() => setIsPreview(!isPreview)} variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  {isPreview ? 'Edit' : 'Preview'}
                </Button>
                <Button onClick={handlePublish}>
                  <Send className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions Section */}
      {formId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Questions</h2>
            <Button onClick={() => handleAddQuestion('short_answer')} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No questions yet. Click "Add Question" to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card key={question.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">
                          {index + 1}. {question.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Type: {question.type}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteQuestion.mutate(question.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

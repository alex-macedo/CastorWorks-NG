import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Edit3,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';
import type { ProposalSectionType, ProposalTone } from '@/hooks/useArchitectProposals';

interface ProposalSectionEditorProps {
  section: ProposalSectionType;
  content: string;
  isGenerating?: boolean;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
  tone?: ProposalTone;
  onChangeTone?: (tone: ProposalTone) => void;
  className?: string;
}

export function ProposalSectionEditor({
  section,
  content,
  isGenerating = false,
  onRegenerate,
  onEdit,
  tone,
  onChangeTone,
  className
}: ProposalSectionEditorProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const sectionLabels: Record<ProposalSectionType, string> = {
    cover_letter: t('architect.proposals.sections.coverLetter'),
    design_philosophy: t('architect.proposals.sections.designPhilosophy'),
    scope_of_work: t('architect.proposals.sections.scopeOfWork'),
    project_methodology: t('architect.proposals.sections.projectMethodology'),
    fee_structure: t('architect.proposals.sections.feeStructure'),
    sustainability_approach: t('architect.proposals.sections.sustainabilityApproach'),
    timeline: t('architect.proposals.sections.timeline'),
    payment_terms: t('architect.proposals.sections.paymentTerms'),
    exclusions: t('architect.proposals.sections.exclusions'),
    warranty: t('architect.proposals.sections.warranty'),
    terms_and_conditions: t('architect.proposals.sections.termsAndConditions'),
  };

  const toneLabels: Record<ProposalTone, string> = {
    professional: t('architect.proposals.tones.professional'),
    friendly: t('architect.proposals.tones.friendly'),
    detailed: t('architect.proposals.tones.detailed'),
    concise: t('architect.proposals.tones.concise'),
  };

  const handleSaveEdit = () => {
    onEdit?.(editedContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const hasContent = content && content.trim().length > 0;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {sectionLabels[section]}
            </CardTitle>
            {tone && onChangeTone && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-muted-foreground">
                  {t('architect.proposals.tone')}:
                </span>
                <div className="flex gap-1">
                  {(Object.keys(toneLabels) as ProposalTone[]).map((t) => (
                    <Badge
                      key={t}
                      variant={tone === t ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => onChangeTone(t)}
                    >
                      {toneLabels[t]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasContent && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isGenerating}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isGenerating && 'animate-spin')} />
                {t('architect.proposals.regenerate')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGenerating ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder={t('architect.proposals.editPlaceholder')}
              className="min-h-[200px] resize-y"
            />
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('common.save')}
              </Button>
            </div>
          </div>
        ) : hasContent ? (
          <div className="prose prose-sm max-w-none text-foreground">
            <div
              className="whitespace-pre-wrap leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatContent(content) }}
            />
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('architect.proposals.noContent')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Format content for display
function formatContent(content: string): string {
  return content
    .split('\n\n')
    .map(paragraph => `<p>${DOMPurify.sanitize(paragraph)}</p>`)
    .join('');
}

export default ProposalSectionEditor;

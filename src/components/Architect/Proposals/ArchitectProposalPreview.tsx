import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Printer, 
  Share2,
  Edit,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';
import type { ProposalSectionType } from '@/hooks/useArchitectProposals';

interface ArchitectProposalPreviewProps {
  title: string;
  sections: Record<string, string>;
  sectionOrder: ProposalSectionType[];
  clientName?: string;
  projectName?: string;
  onEdit?: () => void;
  onExportPDF?: () => void;
  onShare?: () => void;
  className?: string;
}

export function ArchitectProposalPreview({
  title,
  sections,
  sectionOrder,
  clientName,
  projectName,
  onEdit,
  onExportPDF,
  onShare,
  className
}: ArchitectProposalPreviewProps) {
  const { t } = useTranslation();

  const sectionLabels = useMemo(() => ({
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
  }), [t]);

  const handlePrint = () => {
    window.print();
  };

  const generatedSections = useMemo(() => {
    return sectionOrder.filter(section => sections[section] && sections[section].trim().length > 0);
  }, [sectionOrder, sections]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {(clientName || projectName) && (
            <p className="text-sm text-muted-foreground mt-1">
              {clientName && `${t('architect.proposals.client')}: ${clientName}`}
              {clientName && projectName && ' • '}
              {projectName && `${t('architect.proposals.project')}: ${projectName}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('common.print')}
          </Button>
          {onExportPDF && (
            <Button variant="outline" size="sm" onClick={onExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.exportPDF')}
            </Button>
          )}
          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              {t('common.share')}
            </Button>
          )}
        </div>
      </div>

      {/* Proposal Content */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t('architect.proposals.previewTitle')}
            </CardTitle>
            <Badge variant="secondary">
              {generatedSections.length} {t('architect.proposals.sectionsGenerated')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-8 print:p-0">
          {/* Cover Letter */}
          {sections.cover_letter && (
            <ProposalSection
              title={sectionLabels.cover_letter}
              content={sections.cover_letter}
            />
          )}

          {/* Design Philosophy */}
          {sections.design_philosophy && (
            <ProposalSection
              title={sectionLabels.design_philosophy}
              content={sections.design_philosophy}
            />
          )}

          {/* Scope of Work */}
          {sections.scope_of_work && (
            <ProposalSection
              title={sectionLabels.scope_of_work}
              content={sections.scope_of_work}
            />
          )}

          {/* Project Methodology */}
          {sections.project_methodology && (
            <ProposalSection
              title={sectionLabels.project_methodology}
              content={sections.project_methodology}
            />
          )}

          {/* Fee Structure */}
          {sections.fee_structure && (
            <ProposalSection
              title={sectionLabels.fee_structure}
              content={sections.fee_structure}
            />
          )}

          {/* Sustainability Approach */}
          {sections.sustainability_approach && (
            <ProposalSection
              title={sectionLabels.sustainability_approach}
              content={sections.sustainability_approach}
            />
          )}

          {/* Timeline */}
          {sections.timeline && (
            <ProposalSection
              title={sectionLabels.timeline}
              content={sections.timeline}
            />
          )}

          {/* Payment Terms */}
          {sections.payment_terms && (
            <ProposalSection
              title={sectionLabels.payment_terms}
              content={sections.payment_terms}
            />
          )}

          {/* Exclusions */}
          {sections.exclusions && (
            <ProposalSection
              title={sectionLabels.exclusions}
              content={sections.exclusions}
            />
          )}

          {/* Warranty */}
          {sections.warranty && (
            <ProposalSection
              title={sectionLabels.warranty}
              content={sections.warranty}
            />
          )}

          {/* Terms and Conditions */}
          {sections.terms_and_conditions && (
            <ProposalSection
              title={sectionLabels.terms_and_conditions}
              content={sections.terms_and_conditions}
            />
          )}

          {/* Empty State */}
          {generatedSections.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {t('architect.proposals.noSectionsGenerated')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('architect.proposals.generateSectionsFirst')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground print:hidden">
        <p>{t('architect.proposals.previewFooter')}</p>
      </div>
    </div>
  );
}

// Proposal Section Component
interface ProposalSectionProps {
  title: string;
  content: string;
}

function ProposalSection({ title, content }: ProposalSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <Separator className="flex-1" />
      </div>
      <div className="prose prose-sm max-w-none text-foreground">
        <div
          className="whitespace-pre-wrap leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatContent(content) }}
        />
      </div>
    </div>
  );
}

// Format content for display (convert line breaks to paragraphs, etc.)
function formatContent(content: string): string {
  return content
    .split('\n\n')
    .map(paragraph => `<p>${DOMPurify.sanitize(paragraph)}</p>`)
    .join('');
}

export default ArchitectProposalPreview;

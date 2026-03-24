import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

import { useLocalization } from "@/contexts/LocalizationContext";
interface CompanyInfo {
  name: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Client {
  name: string;
  email?: string;
  phone?: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  category?: string;
}

interface Estimate {
  name: string;
  description?: string;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  clients?: Client;
}

interface Proposal {
  id: string;
  cover_letter?: string;
  scope_of_work?: string;
  exclusions?: string;
  payment_terms?: string;
  timeline?: string;
  warranty?: string;
  terms_and_conditions?: string;
  created_at: string;
  expires_at?: string;
}

interface ProposalPreviewProps {
  proposal: Proposal;
  estimate: Estimate;
  companyInfo: CompanyInfo;
}

export const ProposalPreview = ({ proposal, estimate, companyInfo }: ProposalPreviewProps) => {
  const { t } = useLocalization()
  const expiresDate = useMemo(() => {
    if (proposal.expires_at) return new Date(proposal.expires_at);
    const now = new Date();
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }, [proposal.expires_at]);

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto print:p-0" id="proposal-preview">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {companyInfo.logo && (
            <img src={companyInfo.logo} alt={t("images.companyLogo")} className="h-16 mb-4" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{companyInfo.name}</h1>
          {companyInfo.phone && <p className="text-gray-600">{companyInfo.phone}</p>}
          {companyInfo.email && <p className="text-gray-600">{companyInfo.email}</p>}
          {companyInfo.address && <p className="text-gray-600 text-sm">{companyInfo.address}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold text-gray-900">PROPOSAL</h2>
          <p className="text-gray-600">
            Date: {format(new Date(proposal.created_at), 'MMMM d, yyyy')}
          </p>
          <p className="text-gray-600">Valid Until: {format(expiresDate, 'MMMM d, yyyy')}</p>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Client Info */}
      <div className="mb-8">
        <h3 className="font-semibold text-lg text-gray-900 mb-2">Prepared For:</h3>
        <p className="text-gray-700">{estimate.clients?.name || 'Client'}</p>
        {estimate.clients?.email && <p className="text-gray-600">{estimate.clients.email}</p>}
        {estimate.clients?.phone && <p className="text-gray-600">{estimate.clients.phone}</p>}
      </div>

      {/* Cover Letter */}
      {proposal.cover_letter && (
        <div className="mb-8">
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {proposal.cover_letter}
          </div>
        </div>
      )}

      <Separator className="my-6" />

      {/* Project Overview */}
      <div className="mb-8">
        <h3 className="font-semibold text-lg text-gray-900 mb-3">{t("proposalComponent.projectOverview")}</h3>
        <p className="text-gray-700">{estimate.name}</p>
        {estimate.description && (
          <p className="text-gray-600 mt-2">{estimate.description}</p>
        )}
      </div>

      {/* Scope of Work */}
      {proposal.scope_of_work && (
        <div className="mb-8">
          <h3 className="font-semibold text-lg text-gray-900 mb-3">{t("proposalComponent.scopeOfWork")}</h3>
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {proposal.scope_of_work}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="mb-8">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">{t("proposalComponent.investment")}</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">Description</th>
                <th className="text-center py-3 px-4 text-gray-700 font-semibold">Quantity</th>
                <th className="text-right py-3 px-4 text-gray-700 font-semibold">Unit Price</th>
                <th className="text-right py-3 px-4 text-gray-700 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {estimate.line_items?.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">{item.description}</td>
                  <td className="py-3 px-4 text-center text-gray-600">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    ${item.unitPrice?.toFixed(2) || '0.00'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    ${item.total?.toFixed(2) || '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-right font-medium text-gray-700">
                  Subtotal
                </td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">
                  ${estimate.subtotal?.toFixed(2) || '0.00'}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="py-3 px-4 text-right font-medium text-gray-700">
                  Tax ({(estimate.tax_rate * 100).toFixed(2)}%)
                </td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">
                  ${estimate.tax_amount?.toFixed(2) || '0.00'}
                </td>
              </tr>
              <tr className="border-t-2">
                <td colSpan={3} className="py-4 px-4 text-right font-bold text-gray-900 text-lg">
                  Total Investment
                </td>
                <td className="py-4 px-4 text-right font-bold text-gray-900 text-xl">
                  ${estimate.total?.toFixed(2) || '0.00'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Exclusions */}
      {proposal.exclusions && (
        <div className="mb-8">
          <h3 className="font-semibold text-lg text-gray-900 mb-3">{t("proposalComponent.exclusions")}</h3>
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {proposal.exclusions}
          </div>
        </div>
      )}

      {/* Payment Terms */}
      {proposal.payment_terms && (
        <div className="mb-8">
          <h3 className="font-semibold text-lg text-gray-900 mb-3">{t("clientPortal.paymentTerms")}</h3>
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {proposal.payment_terms}
          </div>
        </div>
      )}

      {/* Timeline */}
      {proposal.timeline && (
        <div className="mb-8">
          <h3 className="font-semibold text-lg text-gray-900 mb-3">{t("proposalComponent.projectTimeline")}</h3>
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {proposal.timeline}
          </div>
        </div>
      )}

      {/* Warranty */}
      {proposal.warranty && (
        <div className="mb-8">
          <h3 className="font-semibold text-lg text-gray-900 mb-3">{t("proposalComponent.warranty")}</h3>
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {proposal.warranty}
          </div>
        </div>
      )}

      {/* Terms and Conditions */}
      {proposal.terms_and_conditions && (
        <div className="mb-8">
          <h3 className="font-semibold text-lg text-gray-900 mb-3">{t("proposalComponent.termsAndConditions")}</h3>
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">
            {proposal.terms_and_conditions}
          </div>
        </div>
      )}

      {/* Signature Block */}
      <div className="mt-12 grid grid-cols-2 gap-8 print:mt-20">
        <div>
          <p className="font-semibold text-gray-900 mb-8">{companyInfo.name}</p>
          <div className="border-b-2 border-gray-900 mb-2" />
          <p className="text-sm text-gray-600">{t("proposalComponent.authorizedSignature")}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-900 mb-8">{t("proposalComponent.clientAcceptance")}</p>
          <div className="border-b-2 border-gray-900 mb-2" />
          <p className="text-sm text-gray-600">Client Signature & Date</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
        <p>
          Thank you for considering {companyInfo.name} for your project. We look forward to working
          with you.
        </p>
      </div>
    </div>
  );
};

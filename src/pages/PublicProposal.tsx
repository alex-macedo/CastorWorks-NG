import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProposalPreview } from '@/components/Proposals/ProposalPreview';
import { SignaturePad } from '@/components/Proposals/SignaturePad';
import { useState } from 'react';
import { useDateFormat } from '@/hooks/useDateFormat';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useLocalization } from "@/contexts/LocalizationContext";
const PublicProposal = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSignature, setShowSignature] = useState(false);
  const { formatLongDate } = useDateFormat();

  // Fetch proposal by public token
  const { data: proposal, isLoading } = useQuery({
    queryKey: ['public-proposal', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, estimates(*, clients(name, email))')
        .eq('public_token', token)
        .single();

      if (error) throw error;

      // Track view timestamp if not already viewed
      if (data && !data.viewed_at) {
        await supabase
          .from('proposals')
          .update({
            viewed_at: new Date().toISOString(),
            status: 'viewed',
          })
          .eq('id', data.id);
      }

      return data;
    },
    enabled: !!token,
    retry: false,
  });

  // Accept proposal mutation
  const acceptMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      if (!proposal) throw new Error('No proposal found');

      const { error } = await supabase
        .from('proposals')
        .update({
          status: 'accepted',
          signature_data: signatureData,
          signed_by: proposal.estimates?.clients?.name || 'Client',
          signed_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t("pages.publicProposal.proposalAcceptedTitle"),
        description: 'Thank you! The contractor has been notified.',
      });
      setShowSignature(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to accept proposal: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Reject proposal mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!proposal) throw new Error('No proposal found');

      const { error } = await supabase
        .from('proposals')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t("pages.publicProposal.proposalDeclinedTitle"),
        description: 'The contractor has been notified.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to decline proposal: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t("pages.publicProposal.loadingProposal")}</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t("pages.publicProposal.proposalNotFound")}</h2>
          <p className="text-gray-600">
            {t("pages.publicProposal.proposalMayHaveExpired")}
          </p>
        </Card>
      </div>
    );
  }

  // Check if proposal has expired
  const isExpired = proposal.expires_at && new Date(proposal.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <XCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t("pages.publicProposal.proposalExpired")}</h2>
          <p className="text-gray-600">
            {t("pages.publicProposal.proposalExpiredOn", { date: formatLongDate(new Date(proposal.expires_at)) })} 
          </p>
          <p className="text-gray-600 mt-2">
            {t("pages.publicProposal.contactContractorForUpdated")}
          </p>
        </Card>
      </div>
    );
  }

  // Check if already accepted
  if (proposal.status === 'accepted') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container max-w-4xl mx-auto">
          <Card className="p-8 text-center mb-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t("pages.publicProposal.proposalAcceptedTitle")}</h2>
              <p className="text-gray-600">
              Thank you! This proposal was accepted on{' '}
            </p>
          </Card>

          <ProposalPreview
            proposal={proposal}
            estimate={proposal.estimates}
            companyInfo={{ name: 'Your Company' }} // TODO: Get from user profile
          />

          {proposal.signature_data && (
            <Card className="mt-8 p-6">
              <h3 className="font-semibold mb-4">{t("pages.publicProposal.clientSignature")}</h3>
              <img
                src={proposal.signature_data}
                alt={t("images.clientSignature")}
                className="border rounded max-w-md"
              />
                <p className="text-sm text-gray-600 mt-2">
                Signed by {proposal.signed_by} on{' '}
                {formatLongDate(new Date(proposal.signed_at!))}
              </p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Check if already rejected
  if (proposal.status === 'rejected') {
    const rejectedAt = proposal.rejected_at
      ? formatLongDate(new Date(proposal.rejected_at))
      : '';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t("pages.publicProposal.proposalDeclinedTitle")}</h2>
          <p className="text-gray-600">
            {t("pages.publicProposal.proposalDeclinedMessage", { date: rejectedAt })}
          </p>
        </Card>
      </div>
    );
  }

  // Default view - active proposal
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl mx-auto">
        <ProposalPreview
          proposal={proposal}
          estimate={proposal.estimates}
          companyInfo={{ name: 'Your Company' }} // TODO: Get from user profile
        />

        {/* Response Section */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold mb-4">{t("pages.publicProposal.yourResponse")}</h3>

          {!showSignature ? (
            <div className="flex gap-4">
              <Button
                onClick={() => setShowSignature(true)}
                className="flex-1"
                size="lg"
                disabled={rejectMutation.isPending}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Accept Proposal
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                size="lg"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending}
              >
                <XCircle className="h-5 w-5 mr-2" />
                {rejectMutation.isPending ? 'Declining...' : 'Decline'}
              </Button>
            </div>
          ) : (
            <SignaturePad
              onSign={async (signatureData) => {
                await acceptMutation.mutateAsync(signatureData);
              }}
              onCancel={() => setShowSignature(false)}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default PublicProposal;

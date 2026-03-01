import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Link } from 'react-router-dom';

export interface ApprovalSuccessScreenProps {
  action: 'approved' | 'rejected';
  className?: string;
}

export const ApprovalSuccessScreen: React.FC<ApprovalSuccessScreenProps> = ({
  action,
  className = '',
}) => {
  const { t } = useLocalization();

  const isApproved = action === 'approved';

  return (
    <div className={`min-h-[60vh] flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            {isApproved ? (
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            ) : (
              <div className="rounded-full bg-orange-100 p-3">
                <XCircle className="h-12 w-12 text-orange-600" />
              </div>
            )}
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl">
                {isApproved
                  ? t('customerPortal.success.approvalTitle') || 'Quote Approved!'
                  : t('customerPortal.success.rejectionTitle') || 'Quotes Rejected'}
              </CardTitle>
              <CardDescription>
                {isApproved
                  ? t('customerPortal.actions.approvalSuccess')
                  : t('customerPortal.actions.rejectionSuccess')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">
              {t('customerPortal.success.nextSteps') || 'What happens next?'}
            </h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              {isApproved ? (
                <>
                  <li>Your project manager has been notified</li>
                  <li>A purchase order will be generated</li>
                  <li>The supplier will be contacted to confirm the order</li>
                  <li>You'll receive updates on the delivery timeline</li>
                </>
              ) : (
                <>
                  <li>Your project manager has been notified</li>
                  <li>Your feedback has been recorded</li>
                  <li>Your project manager will contact you to discuss alternatives</li>
                  <li>New quotes may be requested from different suppliers</li>
                </>
              )}
            </ul>
          </div>

          <div className="pt-4 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              {t('customerPortal.success.thankYou') || 'Thank you for your prompt response!'}
            </p>
            <Link to="/" className="block">
              <Button variant="outline" className="w-full">
                {t('customerPortal.success.returnHome') || 'Return to Homepage'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

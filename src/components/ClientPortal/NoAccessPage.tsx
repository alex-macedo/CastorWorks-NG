import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';

export interface NoAccessPageProps {
  reason?: 'no_projects' | 'access_revoked' | 'account_suspended';
  adminEmail?: string;
  adminName?: string;
  supportUrl?: string;
}

export function NoAccessPage({
  reason = 'no_projects',
  adminEmail,
  adminName = 'Administrator',
  supportUrl,
}: NoAccessPageProps) {
  const navigate = useNavigate();
  const { t } = useLocalization();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      
      // Clear all storage to prevent session persistence
      localStorage.clear();
      sessionStorage.clear();
      
      // Full page reload to ensure complete cleanup
      window.location.href = '/login';
    } catch (err) {
      console.error('Sign out error:', err);
      // Still clear and redirect even if sign-out fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        {/* Icon Section */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        {/* Content Section */}
        <div className="text-center space-y-4">
          {/* Main Message */}
          <h1 className="text-2xl font-bold text-foreground">
            {t('clientPortal.portal.noProjects.title')}
          </h1>

          {/* Subheading */}
          <p className="text-lg font-semibold text-muted-foreground">
            {t('clientPortal.portal.noProjects.subtitle')}
          </p>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('clientPortal.portal.noProjects.description')}
          </p>

          {/* Reason List */}
          <div className="text-sm text-muted-foreground space-y-2 text-left bg-muted/50 p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">
              {t('clientPortal.portal.noProjects.reasons.title')}
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="flex-shrink-0">•</span>
                <span>{t('clientPortal.portal.noProjects.reasons.notInvited')}</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0">•</span>
                <span>{t('clientPortal.portal.noProjects.reasons.accessRevoked')}</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0">•</span>
                <span>{t('clientPortal.portal.noProjects.reasons.pending')}</span>
              </li>
            </ul>
          </div>

          {/* Action Section */}
          <div className="pt-4 space-y-3 border-t">
            <p className="text-sm font-semibold text-foreground">
              {t('clientPortal.portal.noProjects.nextSteps.title')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('clientPortal.portal.noProjects.nextSteps.instruction')}
            </p>

            {/* Admin Contact */}
            {adminEmail && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('clientPortal.portal.noProjects.nextSteps.contactLabel')}
                </p>
                <a
                  href={`mailto:${adminEmail}`}
                  className="text-primary hover:underline font-medium text-sm break-all"
                >
                  {adminEmail}
                </a>
              </div>
            )}

            {/* Support Link */}
            {supportUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full"
              >
                <a href={supportUrl} target="_blank" rel="noopener noreferrer">
                  {t('clientPortal.portal.noProjects.buttons.support')}
                </a>
              </Button>
            )}
          </div>

          {/* Help Section */}
          <div className="pt-4 border-t text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">
              {t('clientPortal.portal.noProjects.help.title')}
            </p>
            <ol className="space-y-1 text-left list-decimal list-inside">
              <li>{t('clientPortal.portal.noProjects.help.step1')}</li>
              <li>{t('clientPortal.portal.noProjects.help.step2')}</li>
              <li>{t('clientPortal.portal.noProjects.help.step3')}</li>
            </ol>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-2 mt-8">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleGoHome}
          >
            {t('clientPortal.portal.noProjects.buttons.goHome')}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleSignOut}
          >
            {t('clientPortal.portal.noProjects.buttons.signOut')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NoAccessPage;

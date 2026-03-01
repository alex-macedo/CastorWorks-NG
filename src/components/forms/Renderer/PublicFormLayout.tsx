import React, { useEffect, useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Shield } from 'lucide-react';
import { getFormTheme, type FormThemeVariant } from './glassTokens';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import resolveStorageUrl from '@/utils/storage';

interface PublicFormLayoutProps {
  children: React.ReactNode;
  formTitle?: string;
  logoUrl?: string;
  primaryColor?: string;
  themeVariant?: FormThemeVariant;
}

/**
 * PublicFormLayout
 * 
 * Branded wrapper for public form pages with:
 * - CastorWorks logo header (minimal design)
 * - Themed background based on form settings
 * - Footer with powered by CastorWorks
 * - Security indicator
 */
export function PublicFormLayout({ 
  children, 
  formTitle,
  logoUrl,
  primaryColor = '#3B82F6',
  themeVariant = 'light'
}: PublicFormLayoutProps) {
  const { t } = useLocalization();
  const { settings: companySettings } = useCompanySettings();
  const [resolvedLogo, setResolvedLogo] = useState<string | null>(null);
  const theme = getFormTheme(themeVariant);

  useEffect(() => {
    const loadLogo = async () => {
      const candidate = logoUrl || companySettings?.company_logo_url || null;
      if (!candidate) {
        setResolvedLogo(null);
        return;
      }
      const url = await resolveStorageUrl(candidate);
      setResolvedLogo(url);
    };
    loadLogo();
  }, [logoUrl, companySettings?.company_logo_url]);
  
  return (
    <div className={`min-h-screen flex flex-col relative selection:bg-[#F97316]/20 ${theme.backdrop}`} style={{ color: themeVariant === 'darkGold' ? '#e5e7eb' : '#334155' }}>
      {/* Background Gradient & Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#94a3b80f_1px,transparent_1px),linear-gradient(to_bottom,#94a3b80f_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>

      {/* Header */}
      <header className={`w-full sticky top-0 z-50 pt-[env(safe-area-inset-top)] ${theme.header}`}>
        <div className="container max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/80 border border-slate-200/70 flex items-center justify-center shadow-sm overflow-hidden">
              {resolvedLogo ? (
                <img 
                  src={resolvedLogo} 
                  alt="Company logo" 
                  className="h-7 w-7 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-sm font-bold text-[#F97316]">CW</span>
              )}
            </div>
            <div className="flex flex-col leading-tight">
              <span className={`text-sm font-semibold ${themeVariant === 'darkGold' ? 'text-slate-100' : 'text-slate-900'} truncate max-w-[240px]`}>
                {formTitle || t('forms:publicForm.formTitleFallback')}
              </span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Powered by CastorMind-AI
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 px-4">
        {children}
      </main>

      {/* Footer */}
      <footer className={`w-full pb-[env(safe-area-inset-bottom)] ${theme.footer}`}>
        <div className="container max-w-2xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <a 
            href="https://castorworks.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-4"
          >
            <img 
              src="/logo.svg" 
              alt="" 
              width={16}
              height={16}
              className="h-4 w-auto opacity-60"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            {t('forms:publicForm.poweredBy')}
          </a>
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded-full">
            <Shield className="h-3.5 w-3.5" />
            {t('forms:publicForm.secureForm')}
          </div>
        </div>
      </footer>
    </div>
  );
}

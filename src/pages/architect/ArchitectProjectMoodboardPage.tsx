import { useParams, useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette, Image as ImageIcon, Share2, Plus } from 'lucide-react';
import { Moodboard } from '@/components/Architect/Moodboard/Moodboard';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { toast } from 'sonner';

export const ArchitectProjectMoodboardPage = () => {
  useRouteTranslations(); // Load translations for this route
  const { t } = useLocalization();
  const { data: roles } = useUserRoles();
  const { id } = useParams();
  const navigate = useNavigate();

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(t('architect.moodboard.messages.linkCopied'));
  };

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-500">
      {/* Premium Header - Architect variant */}
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-10 w-10" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
               <Button 
                 variant="glass-style-white"
                 onClick={handleShare}
               >
                 <Share2 className="h-4 w-4 mr-2" />
                 {t('architect.moodboard.share')}
               </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('architect.moodboard.title')}
            </h1>
            <p className="text-lg text-white/90 max-w-2xl">
              {t('architect.moodboard.subtitle')}
            </p>
          </div>

          <div className="pt-4 flex flex-wrap gap-3">
             <Button 
               variant="glass-style-white"
               onClick={() => toast.info(t('architect.moodboard.useToolbarToAddImages'))}
             >
               <Plus className="h-5 w-5 mr-2" />
               {t('architect.moodboard.addImages')}
             </Button>
             <Button 
               variant="glass-style-white" 
               onClick={() => toast.info(t('architect.moodboard.useToolbarToAddColors'))}
             >
               <Palette className="h-5 w-5 mr-2" />
               {t('architect.moodboard.addColors')}
             </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      <Moodboard projectId={id || ''} />
    </div>
  );
};

export default ArchitectProjectMoodboardPage;

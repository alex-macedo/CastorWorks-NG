import { useState, useEffect } from "react";
import { MoreVertical, Edit, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalization } from "@/contexts/LocalizationContext";
import { resolveStorageUrl } from "@/utils/storage";
import { WhatsAppQuickAction } from "@/components/Architect/Communication/WhatsAppQuickAction";
import { cn } from "@/lib/utils";

interface ClientCardProps {
  client: any;
  projects?: any[];
  onClick: (client: any) => void;
  // Optional navigation for portal link if we keep the menu
  navigate?: (path: string) => void; 
}

export function ClientCard({ client, projects = [], onClick, navigate }: ClientCardProps) {
  const { t } = useLocalization();
  const [imageUrl, setImageUrl] = useState<string>("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80");
  const [primaryProject, setPrimaryProject] = useState<any>(null);

  useEffect(() => {
    const loadProjectImage = async () => {
      const clientProjects = projects.filter(p => p.client_id === client.id);
      
      // Find the first project that has a potentially valid image
      let foundProject = null;
      let resolvedUrl = null;

      for (const project of clientProjects) {
        if (project.image_url && !project.image_url.includes('placeholder')) {
           try {
             // Resolving url...
             const url = await resolveStorageUrl(project.image_url);
             if (url) {
               resolvedUrl = url;
               foundProject = project;
               break; 
             }
           } catch (e) {
             console.error("Failed to resolve image for project", project.id, e);
           }
        }
      }

      if (foundProject && resolvedUrl) {
        setPrimaryProject(foundProject);
        setImageUrl(resolvedUrl);
      } else {
        setPrimaryProject(clientProjects[0] || null);
      }
    };

    loadProjectImage();
  }, [client.id, projects]);

  const displayTitle = primaryProject?.name || t('clients.noProjects');
  const displaySubtitle = client.name;
  // Use project location if available, otherwise client location, otherwise fallback
  const displayAddress = primaryProject?.location || client.location || t('common.noAddress');

  return (
    <div 
      className="group relative flex flex-col rounded-3xl overflow-hidden bg-transparent cursor-pointer transition-all duration-300 hover:-translate-y-1"
      onClick={() => onClick(client)}
    >
      {/* Image Section - Taller to allow overlap */}
      <div className="relative h-56 w-full overflow-hidden rounded-t-3xl">
        <img 
          src={imageUrl} 
          alt={displayTitle}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4 z-20">
          <Badge variant={client.status === 'Active' ? 'default' : 'secondary'} className="shadow-sm backdrop-blur-md bg-white/90 text-black hover:bg-white">
             {t(`architect.clients.statuses.${client.status?.toLowerCase()}`, { defaultValue: client.status })}
          </Badge>
        </div>

        {/* Send Message Button - Positioned in visual image area, just above content card */}
        {client.phone && (
           <div className="absolute bottom-28 right-4 z-20">
             <WhatsAppQuickAction
                phoneNumber={client.phone}
                variant="button"
                label="WhatsApp"
                className="shadow-sm backdrop-blur-md bg-green-500 hover:bg-green-600 text-white border-none rounded-full h-8 px-3 text-xs font-bold"
              />
           </div>
        )}

        {/* Actions Menu (Optional) */}
        <div className="absolute top-4 left-4 z-20" onClick={(e) => e.stopPropagation()}>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onClick(client)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                {primaryProject && navigate && (
                   <DropdownMenuItem onClick={() => navigate(`/portal/${primaryProject.id}?clientId=${client.id}`)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t('clients.portal')}
                   </DropdownMenuItem>
                )}
              </DropdownMenuContent>
           </DropdownMenu>
        </div>
      </div>

      {/* Content Section - Overlaps the image */}
      <div className="relative z-10 -mt-24 pt-6 pl-5 pr-5 pb-5 bg-muted/95 backdrop-blur-md rounded-t-3xl flex-1 flex flex-col justify-between shadow-sm border-t border-white/10 dark:bg-card">
        <div>
          <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2">
            {displayTitle}
          </h3>
          <p className="font-medium text-sm text-muted-foreground mb-4">
            {displaySubtitle}
          </p>
          
          <div className="flex items-start gap-2 text-sm text-muted-foreground/80 leading-snug mb-4">
             <span className="line-clamp-3">
               {displayAddress}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}

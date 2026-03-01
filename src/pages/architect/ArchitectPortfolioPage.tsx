/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { useProjects } from '@/hooks/useProjects';
import { MapPin, Calendar, Maximize2, Mail, User, Activity, Building2, Users as UsersIcon, Settings, Plus, Briefcase } from 'lucide-react';
import { ManagePortfolioTeamDialog } from '@/components/Architect/ManagePortfolioTeamDialog';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { resolveStorageUrl } from '@/utils/storage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

export default function ArchitectPortfolioPage() {
  useRouteTranslations();
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeSection, setActiveSection] = useState<string>('home');
  const [projectImageUrls, setProjectImageUrls] = useState<Record<string, string>>({});
  const [manageTeamOpen, setManageTeamOpen] = useState(false);

  // Use mock team members for demo
  useEffect(() => {
    // Use mock team members for demo purposes instead of querying database
    const mockTeamMembers = [
      { id: 'team-01', display_name: 'Camila Duarte', email: 'camila@architectstudio.com', avatar_url: null },
      { id: 'team-02', display_name: 'André Ramos', email: 'andre@architectstudio.com', avatar_url: null },
      { id: 'team-03', display_name: 'Joana Martins', email: 'joana@architectstudio.com', avatar_url: null },
      { id: 'team-04', display_name: 'Lucas Prado', email: 'lucas@architectstudio.com', avatar_url: null },
    ] as TeamMember[];
    setTeamMembers(mockTeamMembers);
  }, []);


  // Get active projects for portfolio display
  const portfolioProjects = useMemo(
    () => projects?.filter(p => p.status === 'active' || p.status === 'completed').slice(0, 6) || [],
    [projects]
  );

  // Resolve storage URLs for project images
  useEffect(() => {
    const resolveImages = async () => {
      const urlMap: Record<string, string> = {};
      
      for (const project of portfolioProjects) {
        const imagePath = project.image_url || (project as any).cover_image;
        
        if (imagePath) {
          const resolvedUrl = await resolveStorageUrl(imagePath);
          if (resolvedUrl) {
            urlMap[project.id] = resolvedUrl;
          }
        }
      }
      
      setProjectImageUrls(urlMap);
    };

    if (portfolioProjects.length > 0) {
      resolveImages();
    }
  }, [portfolioProjects]);

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle updates from the ManagePortfolioTeamDialog.
  // For now we rely on mock team members, so this is a no-op placeholder
  // that can be wired to a real fetch when backend data is enabled.
  const handlePortfolioTeamUpdated = () => {
    // Intentionally left blank for mock/demo mode
  };

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-500">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
        <div className="w-full px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                  <Maximize2 className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">{t('architect.portfolio.title')}</h1>
              </div>
              <div className="hidden md:flex gap-2">
                {[
                  { id: 'home', label: 'architect.portfolio.navigation.home' },
                  { id: 'office', label: 'architect.portfolio.navigation.office' },
                  { id: 'projects', label: 'architect.portfolio.navigation.projects' },
                  { id: 'team', label: 'architect.portfolio.navigation.team' },
                  { id: 'location', label: 'architect.portfolio.navigation.location' },
                  { id: 'contact', label: 'architect.portfolio.navigation.contact' },
                ].map((nav) => (
                  <Button
                    key={nav.id}
                    variant="ghost"
                    onClick={() => scrollToSection(nav.id)}
                    className={`relative px-4 py-2 rounded-full transition-all duration-300 font-medium hover:bg-primary/5 ${
                      activeSection === nav.id ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {t(nav.label)}
                    {activeSection === nav.id && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
            <Button variant="default" className="rounded-full px-6 shadow-md hover:shadow-lg transition-all" onClick={() => scrollToSection('contact')}>
              {t('architect.portfolio.navigation.contact')}
            </Button>
          </div>
        </div>
      </nav>

      <div className="w-full space-y-24 pb-20">
        {/* Hero Section with Premium Gradient */}
        <section id="home" className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/95 via-primary to-primary-light">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2)_0,transparent_50%)]" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.2)_0,transparent_50%)]" />
          </div>
          
          <div className="relative z-10 text-center space-y-8 px-6 max-w-4xl">
              <Badge variant="glass-style-white">
                {t('architect.portfolio.established')}
              </Badge>

            <h2 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
              {t('architect.portfolio.sections.hero.title')}
            </h2>
            <p className="text-xl md:text-2xl text-primary-foreground/90 font-medium leading-relaxed">
              {t('architect.portfolio.sections.hero.subtitle')}
            </p>
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => scrollToSection('projects')}>
                {t('architect.portfolio.viewProjects')}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => toast.info(t('architect.portfolio.storyComingSoon'))}
              >
                {t('architect.portfolio.ourStory')}
              </Button>
            </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
              <div className="w-1 h-2 rounded-full bg-white" />
            </div>
          </div>
        </section>

        {/* Office Section with Clean Typography */}
        <section id="office" className="container max-w-6xl space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary">
                  {t('architect.portfolio.aboutUs')}
                </Badge>
                <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t('architect.portfolio.navigation.office')}</h3>
              </div>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {t('architect.portfolio.description')}
              </p>
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-primary">15+</p>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{t('architect.portfolio.awardsWon')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-primary">250+</p>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{t('architect.portfolio.projectsDone')}</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] rounded-3xl bg-muted overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
                  <Building2 className="h-32 w-32 text-primary/10" />
                </div>
              </div>
              <div className="absolute -bottom-8 -left-8 p-8 bg-white dark:bg-card rounded-2xl shadow-xl space-y-2 hidden md:block border border-border/50">
                <p className="text-sm font-bold text-primary italic font-serif">"{t('architect.portfolio.excellenceQuote')}"</p>
                <p className="text-xs font-medium text-muted-foreground">— {t('architect.portfolio.leadArchitect')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Portfolio Section with Refined Grid */}
        <section id="projects" className="container max-w-7xl space-y-16">
          <div className="flex flex-col items-center text-center space-y-4">
            <Badge variant="secondary">
              {t('architect.portfolio.ourWork')}
            </Badge>
            <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t('architect.portfolio.sections.projectsTitle')}</h3>
            <p className="text-lg text-muted-foreground max-w-2xl">{t('architect.portfolio.sections.projectsSubtitle')}</p>
          </div>

          {projectsLoading ? (
            <div className="text-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4 font-medium">{t('architect.portfolio.loading')}</p>
            </div>
          ) : portfolioProjects.length === 0 ? (
            <Card className="border-dashed border-2 py-24 bg-transparent flex flex-col items-center justify-center text-center space-y-4">
              <Briefcase className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">{t('architect.portfolio.noProjects')}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {portfolioProjects.map((project) => (
                <Card key={project.id} className="group overflow-hidden border-none bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-2xl transition-all duration-500 rounded-3xl">
                  <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                    {projectImageUrls[project.id] ? (
                      <img
                        src={projectImageUrls[project.id]}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Maximize2 className="h-16 w-16 text-primary/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute bottom-6 left-6 right-6 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <Button 
                        variant="outline" 
                        className="w-full bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white hover:text-primary rounded-xl font-bold"
                        onClick={() => navigate(`/architect/projects/${project.id}`)}
                      >
                        {t('architect.portfolio.exploreProject')}
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-8 space-y-5">
                    <div className="space-y-2">
                      <h4 className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">{project.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {project.description || t('architect.portfolio.projectCard.viewDetails')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground pt-2 border-t border-border/50">
                      {project.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-primary" />
                          <span>{project.location}</span>
                        </div>
                      )}
                      {project.start_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-primary" />
                          <span>{new Date(project.start_date).getFullYear()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Team Section with Modern Avatars */}
        <section id="team" className="bg-muted/30 py-24">
          <div className="container max-w-7xl space-y-16">
            <div className="flex flex-col items-center text-center space-y-4">
              <Badge variant="secondary">
                {t('architect.portfolio.sections.teamTitle')}
              </Badge>
              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t('architect.portfolio.sections.teamTitle')}</h3>
              <p className="text-lg text-muted-foreground max-w-2xl">{t('architect.portfolio.sections.teamSubtitle')}</p>
              
              <Button 
                variant="outline" 
                onClick={() => setManageTeamOpen(true)}
                className="mt-4"
              >
                <Settings className="mr-2 h-4 w-4" />
                {t('architect.portfolio.manageTeam')}
              </Button>
            </div>

            {teamMembers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-medium">{t('architect.portfolio.noTeam')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {teamMembers.map((member) => (
                  <div key={member.id} className="group space-y-6 flex flex-col items-center text-center p-8 rounded-3xl hover:bg-card hover:shadow-xl transition-all duration-500 border border-transparent hover:border-border/50">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <AvatarResolved
                          src={member.avatar_url}
                          alt={member.display_name}
                          fallback={member.display_name?.charAt(0) || "?"}
                          className="h-32 w-32 border-4 border-background shadow-xl group-hover:scale-105 transition-transform duration-500"
                          fallbackClassName="bg-primary text-white text-3xl font-bold uppercase"
                        />
                        <div className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-full shadow-lg border-2 border-background">
                          <Activity className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold">{member.display_name || member.email}</h4>
                      <p className="text-sm font-bold text-primary uppercase tracking-widest">{member.role || t('architect.portfolio.defaultRole')}</p>
                    </div>
                    <div className="flex gap-4">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-full hover:bg-primary hover:text-white transition-all"
                        onClick={() => window.open(`mailto:${member.email}`)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-full hover:bg-primary hover:text-white transition-all"
                        onClick={() => toast.info(t('architect.portfolio.viewingProfile', { name: member.display_name }) || `Viewing profile for ${member.display_name}`)}
                      >
                        <UsersIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Location & Contact Combined for Impact */}
        <section id="location" className="container max-w-7xl">
          <div className="bg-primary-dark rounded-[3rem] overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-[50%] h-full bg-white rotate-12 translate-x-[30%]" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-12 md:p-20 space-y-10 relative z-10 text-white">
                <div className="space-y-4">
                  <Badge variant="glass-style-white" className="font-bold uppercase tracking-wider text-[10px]">
                    {t('architect.portfolio.getInTouch')}
                  </Badge>
                  <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t('architect.portfolio.createNextSpace')}</h3>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-white/10 text-white border border-white/10">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-lg">{t('architect.portfolio.sections.locationTitle')}</p>
                      <p className="text-primary-foreground/70 leading-relaxed max-w-xs">{t('architect.portfolio.studioAddress')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-white/10 text-white border border-white/10">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-lg">{t('architect.portfolio.sections.contactTitle')}</p>
                      <p className="text-primary-foreground/70 leading-relaxed">{t('architect.portfolio.studioEmail')}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/projects/new')}
                  >
                    {t('architect.portfolio.startProject')}
                  </Button>
                </div>
              </div>
              <div id="contact" className="bg-muted min-h-[400px] relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-light/10 to-primary-light/30 flex items-center justify-center">
                   <div className="text-center space-y-4 px-10">
                      <div className="p-6 rounded-full bg-white shadow-2xl mx-auto w-fit">
                        <MapPin className="h-12 w-12 text-primary" />
                      </div>
                      <p className="font-bold text-primary-dark uppercase tracking-widest text-xs">{t('architect.portfolio.mapLoading')}</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Modern Footer */}
      <footer className="bg-muted/50 py-16 border-t border-border/50">
        <div className="container max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary text-white">
              <Maximize2 className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">{t('architect.portfolio.footerTitle')}</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {t('architect.portfolio.footerLegal')}
          </p>
          <div className="flex gap-6">
            {['instagram', 'linkedin', 'twitter'].map((social) => (
              <a key={social} href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
                {t(`architect.portfolio.social.${social}`)}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <ManagePortfolioTeamDialog 
        open={manageTeamOpen} 
        onOpenChange={setManageTeamOpen}
        onUpdate={handlePortfolioTeamUpdated}
      />
    </div>
  );
}

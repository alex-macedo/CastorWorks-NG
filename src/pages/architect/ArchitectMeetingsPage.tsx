import { useState, useEffect } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectMeetings } from '@/hooks/useArchitectMeetings';
import { useProjects } from '@/hooks/useProjects';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { MeetingFormDialog } from '@/components/Architect/Meetings/MeetingFormDialog';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import {
  Plus,
  Calendar,
  Clock,
  Link as LinkIcon,
  MapPin,
  Building2,
  Search,
  ExternalLink,
  AlertCircle,
  Video,
  Users as UsersIcon,
  ArrowUpRight,
  Filter,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { isFuture, isPast } from 'date-fns';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { toast } from 'sonner';

export default function ArchitectMeetingsPage() {
  useRouteTranslations(); // Load translations for this route
  const { t } = useLocalization();
  const { data: roles } = useUserRoles();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { meetings, isLoading, error, deleteMeeting } = useArchitectMeetings();
  const { projects } = useProjects();
  const { data: userProfile } = useUserProfile();
  const userId = userProfile?.id;
  
  // Google Calendar integration
  const googleCalendar = useGoogleCalendar(selectedProjectId !== 'all' ? selectedProjectId : undefined);
  
  // Check connection on mount
  useEffect(() => {
    if (userId) {
      googleCalendar.checkConnection(userId);
    }
  }, [userId, googleCalendar]);
  
  // Handle Google Calendar sync
  const handleGoogleSync = async () => {
    if (!userId) {
      toast.error('Please log in to sync with Google Calendar');
      return;
    }
    
    if (!googleCalendar.connection.isConnected) {
      // Start OAuth flow
      googleCalendar.connect(userId, selectedProjectId !== 'all' ? selectedProjectId : undefined);
    } else {
      // Sync events
      const result = await googleCalendar.syncEvents(userId, ['meetings']);
      if (result?.success) {
        toast.success(t('architect.meetings.syncSuccess', { count: result.synced }));
      }
    }
  };

  const userRoleNames = roles?.map(r => r.role) || [];
  const isAdmin = userRoleNames.includes('admin');

  const handleNewMeeting = () => {
    setSelectedMeeting(null);
    setIsFormOpen(true);
  };

  const handleOpenMeeting = (meeting: any) => {
    setSelectedMeeting({ ...meeting, mode: 'view' });
    setIsFormOpen(true);
  };

  const handleDeleteMeeting = async (meeting: any) => {
    if (!window.confirm(t('architect.meetings.confirmDelete', { title: meeting.title || t('architect.meetings.untitled') }))) {
      return;
    }

    try {
      await deleteMeeting.mutateAsync(meeting.id);
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  // Filter meetings
  const filteredMeetings = meetings?.filter(meeting => {
    const matchesProject = selectedProjectId === 'all' || meeting.project_id === selectedProjectId;
    const matchesSearch = !searchQuery ||
      meeting.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProject && matchesSearch;
  }) || [];

  // Separate upcoming and past meetings
  const upcomingMeetings = filteredMeetings
    .filter(m => isFuture(new Date(m.meeting_date)))
    .sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());

  const pastMeetings = filteredMeetings
    .filter(m => isPast(new Date(m.meeting_date)))
    .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());

  const allDisplayMeetings = [...upcomingMeetings, ...pastMeetings];

  // Get next 4 upcoming meetings for sidebar
  const nextMeetings = upcomingMeetings.slice(0, 4);

  const getMeetingType = (meeting: any): 'online' | 'presencial' => {
    if (meeting.meeting_link) return 'online';
    return 'presencial';
  };

  // Helper to get locale from language
  const { formatTime, formatShortDate, getDateParts } = useDateFormat();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  // Show message if backend data is not available
  if (error) {
    return (
      <div className="w-full px-6 pt-4 pb-8">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
            <p className="text-lg font-medium text-center text-destructive/80">
              {t('architect.opportunities.backendNotAvailable')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-500">
      {/* Premium Header - Architect variant */}
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('architect.meetings.title')}
            </h1>
            <p className="text-white/90 font-medium text-base max-w-2xl">
              {t('architect.meetings.meetingDetails')}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
             <Button 
               variant="glass-style-white"
               onClick={handleNewMeeting}
             >
               <Plus className="h-4 w-4 mr-2" />
               {t('architect.meetings.newMeeting')}
             </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 px-1">
        <div className="w-full md:w-[300px]">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="bg-card border-none shadow-sm h-11 rounded-xl">
              <div className="flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={t('architect.meetings.filterByProject')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('architect.meetings.allProjects')}</SelectItem>
              {projects?.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('architect.meetings.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-none shadow-sm h-11 rounded-xl"
          />
        </div>
        
        <Button 
          variant="outline" 
          size="icon" 
          className={`h-11 w-11 bg-card border-none shadow-sm hidden md:flex rounded-xl ${showAdvancedFilters ? 'text-primary' : ''}`}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {showAdvancedFilters && (
        <Card className="border-none shadow-sm bg-muted/30 animate-in slide-in-from-top-2 duration-300 rounded-2xl mx-1">
          <CardContent className="p-4 flex flex-wrap gap-4">
             <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <AlertCircle className="h-4 w-4 text-primary" />
               Advanced filtering options will appear here
             </div>
          </CardContent>
        </Card>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-1">
        {/* Meetings List */}
        <div className="lg:col-span-3 space-y-6">
          {allDisplayMeetings.length === 0 ? (
            <Card className="border-dashed border-2 py-24 flex flex-col items-center justify-center text-center space-y-4 bg-transparent rounded-3xl">
              <div className="p-6 rounded-2xl bg-muted/50">
                <Calendar className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <div className="space-y-1 px-4">
                <h3 className="font-bold text-2xl">{t('architect.meetings.noMeetings')}</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">{t('architect.meetings.noMeetingsDesc')}</p>
              </div>
              <Button onClick={handleNewMeeting} size="lg" className="rounded-full px-8 shadow-md">
                <Plus className="h-5 w-5 mr-2" />
                {t('architect.meetings.newMeeting')}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {allDisplayMeetings.map(meeting => {
                const meetingDate = new Date(meeting.meeting_date);
                const isUpcoming = isFuture(meetingDate);
                const meetingType = getMeetingType(meeting);

                return (
                  <Card
                    key={meeting.id}
                    className="group hover:shadow-xl transition-all duration-500 border-none bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col rounded-3xl h-full"
                    onClick={() => handleOpenMeeting(meeting)}
                  >
                    <div className={`h-2 w-full ${
                      isUpcoming ? 'bg-gradient-to-r from-primary to-primary-light' : 'bg-muted-foreground/20'
                    }`} />
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex-1 flex flex-col space-y-4">
                        {/* Header: Badge, Title, Icon */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2 text-right">
                            <div className="flex justify-end">
                              <Badge
                                variant={meetingType === 'online' ? 'default' : 'secondary'}
                                className={`${meetingType === 'online' ? 'bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none' : 'bg-muted text-muted-foreground border-none shadow-none'} px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest`}
                              >
                                {meetingType === 'online' ? t('architect.meetings.online') : t('architect.meetings.presencial')}
                              </Badge>
                            </div>
                            <h3 className="text-lg font-bold group-hover:text-primary transition-colors leading-tight tracking-tight text-right">
                              {meeting.title || t('architect.meetings.untitled')}
                            </h3>
                          </div>
                          <div className={`p-2.5 rounded-xl ${isUpcoming ? 'bg-primary/5 text-primary' : 'bg-muted text-muted-foreground'} transition-colors duration-500 flex-shrink-0`}>
                            {meetingType === 'online' ? <Video className="h-5 w-5" /> : <UsersIcon className="h-5 w-5" />}
                          </div>
                        </div>

                        {/* Date, Time, Location - Right aligned */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground font-bold bg-muted/30 p-2.5 rounded-xl border border-border/50">
                            <span className="text-right">{formatShortDate(meeting.meeting_date)}</span>
                            <div className="p-1.5 rounded-lg bg-white dark:bg-muted shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-500">
                              <Calendar className="h-3.5 w-3.5" />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground font-bold bg-muted/30 p-2.5 rounded-xl border border-border/50">
                            <span className="text-right text-xs">
                              {formatTime(meeting.meeting_date)} - {meeting.end_time || formatTime(new Date(new Date(meeting.meeting_date).getTime() + 60 * 60 * 1000).toISOString())}
                            </span>
                            <div className="p-1.5 rounded-lg bg-white dark:bg-muted shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-500">
                              <Clock className="h-3.5 w-3.5" />
                            </div>
                          </div>

                          {meeting.location && (
                            <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground font-bold bg-muted/30 p-2.5 rounded-xl border border-border/50">
                              <span className="line-clamp-1 text-right text-xs">{meeting.location}</span>
                              <div className="p-1.5 rounded-lg bg-white dark:bg-muted shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                <MapPin className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Spacer to push bottom content down */}
                        <div className="flex-1" />

                        {/* Bottom section: Project name and buttons - Pinned to bottom */}
                        <div className="space-y-3 pt-3 border-t border-border/50">
                          <div className="flex items-center justify-end gap-2 text-sm text-primary font-black uppercase tracking-tighter">
                            <span className="line-clamp-1 text-right">{meeting.projects?.name || t('architect.meetings.internalProject')}</span>
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {meeting.participants && Array.isArray(meeting.participants) && meeting.participants.slice(0, 3).map((participant: any, idx: number) => (
                                  <AvatarResolved
                                    key={idx}
                                    src={participant.avatar_url}
                                    alt={participant.name || 'Participant'}
                                    fallback={participant.name?.charAt(0).toUpperCase() || '?'}
                                    className="h-8 w-8 border-2 border-background ring-1 ring-border shadow-sm"
                                    fallbackClassName="text-[10px] font-black bg-primary/10 text-primary"
                                  />
                                ))}
                                {meeting.participants && meeting.participants.length > 3 && (
                                  <div className="h-8 w-8 rounded-full bg-muted border-2 border-background ring-1 ring-border flex items-center justify-center text-[9px] font-black shadow-sm">
                                    +{meeting.participants.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {isUpcoming && meeting.meeting_link ? (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(meeting.meeting_link, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1.5" />
                                {t('architect.meetings.join')}
                              </Button>
                            ) : (
                              <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary group-hover:text-white group-hover:rotate-45 transition-all duration-500 shadow-sm">
                                <ArrowUpRight className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Meetings Sidebar */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden rounded-3xl">
            <CardContent className="p-0">
              <div className="p-5 bg-gradient-to-br from-primary/10 to-transparent border-b border-border/50">
                <h2 className="text-lg font-black tracking-tight flex items-center justify-end gap-2 text-foreground">
                  <span className="text-right">{t('architect.meetings.upcomingMeetings')}</span>
                  <div className="p-1.5 rounded-lg bg-primary text-white shadow-sm">
                    <Clock className="h-4 w-4" />
                  </div>
                </h2>
              </div>
              
              <div className="p-5">
                {nextMeetings.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="p-3 rounded-full bg-muted w-fit mx-auto">
                      <Calendar className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                      {t('architect.meetings.noUpcomingMeetings')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nextMeetings.map((meeting) => {
                      const { monthLabel, dayLabel } = getDateParts(meeting.meeting_date);
                      
                      return (
                        <div
                          key={meeting.id}
                          className="flex gap-3 group cursor-pointer"
                          onClick={() => handleOpenMeeting(meeting)}
                        >
                          <div className="flex flex-col items-center justify-center bg-white dark:bg-muted rounded-xl w-12 h-12 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:bg-primary group-hover:text-white transition-all duration-300">
                            <span className="text-lg font-black leading-none">{dayLabel}</span>
                            <span className="text-[9px] uppercase font-black tracking-widest mt-0.5 opacity-70">{monthLabel}</span>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                            <h4 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors tracking-tight text-right">{meeting.title}</h4>
                            <div className="flex flex-col gap-1 items-end">
                              <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 font-bold uppercase tracking-tighter">
                                <Clock className="h-2.5 w-2.5 text-primary/60" />
                                {formatTime(meeting.meeting_date)}
                              </p>
                              <p className="text-[9px] text-primary font-black flex items-center justify-end gap-1 uppercase tracking-widest opacity-80">
                                <Building2 className="h-2.5 w-2.5" />
                                <span className="truncate">{meeting.projects?.name || t('architect.meetings.internal')}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Calendar Sync Promo Card */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-primary to-primary-dark text-white overflow-hidden rounded-3xl relative">
            {/* Decorative background circle */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <CardContent className="p-5 space-y-4 relative z-10">
              <div className="flex items-center justify-end gap-2">
                <div className="p-2 rounded-xl bg-white/20 w-fit shadow-inner">
                  {googleCalendar.connection.isConnected ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Video className="h-6 w-6" />
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-lg tracking-tight leading-tight text-right">
                  {googleCalendar.connection.isConnected 
                    ? t('architect.meetings.googleCalendarConnected')
                    : t('architect.meetings.googleSyncTitle')
                  }
                </h3>
                <p className="text-xs text-primary-foreground/80 leading-relaxed font-medium text-right">
                  {googleCalendar.connection.isConnected 
                    ? t('architect.meetings.googleCalendarConnectedDesc', { email: googleCalendar.connection.email })
                    : t('architect.meetings.googleSyncDesc')
                  }
                </p>
              </div>
              <Button 
                size="sm" 
                className="w-full bg-white text-primary hover:bg-white/90 border-none font-black rounded-xl h-9 text-xs shadow-lg hover:-translate-y-0.5 transition-all"
                onClick={handleGoogleSync}
                disabled={googleCalendar.isLoading || googleCalendar.isSyncing}
              >
                {googleCalendar.isLoading ? (
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                ) : googleCalendar.isSyncing ? (
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                ) : googleCalendar.connection.isConnected ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    {t('architect.meetings.syncNow')}
                  </>
                ) : (
                  t('architect.meetings.connectNow')
                )}
              </Button>
              {googleCalendar.connection.isConnected && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-white/70 hover:text-white hover:bg-white/10 border-none font-bold text-[10px] h-7"
                  onClick={() => googleCalendar.disconnect(userId!)}
                  disabled={googleCalendar.isLoading}
                >
                  {t('architect.meetings.disconnectGoogle')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

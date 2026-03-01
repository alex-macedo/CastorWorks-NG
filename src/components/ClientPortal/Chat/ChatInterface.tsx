import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus } from 'lucide-react';
import { StartChatDialog } from '@/components/ClientPortal/Dialogs/StartChatDialog';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useProjectTeam } from '@/hooks/clientPortal/useProjectTeam';
import { useProjectTeamMembers } from '@/hooks/useProjectTeamMembers';
import { useAppProject } from '@/contexts/AppProjectContext';

interface ChatInterfaceProps {
  projectId?: string;
  mode?: 'portal' | 'app';
}

export function ChatInterface({ projectId: propProjectId, mode = 'portal' }: ChatInterfaceProps = {}) {
  const { t } = useLocalization();
  const { user: currentUser } = useAuth();
  
  // Support both portal and app contexts
  const portalAuth = useClientPortalAuth();
  const appProject = useAppProject();
  
  // Use prop if provided, otherwise use context based on mode
  const projectId = propProjectId || (mode === 'app' ? appProject.selectedProject?.id : portalAuth.projectId);
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleStartChat = () => {
    setShowStartChat(true);
  };

  const [showStartChat, setShowStartChat] = useState(false);

  // Portal: useProjectTeam (client-visible members via get_portal_team)
  // App: useProjectTeamMembers (all team members for internal Team Chat)
  const portalTeam = useProjectTeam(mode === 'portal' ? undefined : projectId);
  const appTeamMembers = useProjectTeamMembers(mode === 'app' ? projectId : undefined);

  const teamMembers = useMemo(() => {
    const currentUserId = currentUser?.id;
    const excludeCurrentUser = (m: { id?: string; user_id?: string | null }) =>
      !currentUserId || (m.user_id ?? m.id) !== currentUserId;

    if (mode === 'app') {
      // useProjectTeamMembers returns teamMembers; map to { id, name, avatar_url }
      // id must be user_id for conversation_participants; filter out members without user_id and current user
      return (appTeamMembers.teamMembers || [])
        .filter((m) => m.user_id && excludeCurrentUser(m))
        .map((m) => ({
          id: m.user_id!,
          name: m.user_name,
          avatar_url: m.avatar_url ?? undefined,
        }));
    }
    return (portalTeam.teamMembers || [])
      .filter((m: { user_id?: string | null }) => m.user_id && excludeCurrentUser(m))
      .map((m: { user_id: string; user_name?: string; name?: string; avatar_url?: string | null }) => ({
        id: m.user_id,
        name: m.user_name ?? m.name ?? '',
        avatar_url: m.avatar_url ?? undefined,
      }));
  }, [mode, currentUser?.id, portalTeam.teamMembers, appTeamMembers.teamMembers]);

  return (
    <div className="flex h-full border rounded-xl overflow-hidden bg-background shadow-sm">
      {/* Sidebar - hidden on mobile when conversation selected */}
      <div className={`w-full md:w-auto ${selectedConversationId ? 'hidden md:block' : 'block'} flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">{t("components.messages")}</h3>
          <Button
            onClick={handleStartChat}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            mode={mode}
          />
        </div>
      </div>

      <StartChatDialog
        open={showStartChat}
        onOpenChange={setShowStartChat}
        teamMembers={teamMembers}
        projectId={mode === 'app' ? projectId : undefined}
        excludeUserId={currentUser?.id}
        onChatStarted={() => {
          setShowStartChat(false);
        }}
      />

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversationId ? (
          <MessageThread conversationId={selectedConversationId} mode={mode} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 bg-muted/5">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("clientPortal.chat.yourMessages")}</h3>
            <p className="text-center max-w-xs">
              {t("clientPortal.chat.selectConversationDescription")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

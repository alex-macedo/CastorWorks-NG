import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useCreateConversation } from '@/hooks/clientPortal/useCreateConversation';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StartChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatStarted?: (members: string[]) => void;
  teamMembers?: Array<{ id: string; name: string; avatar_url?: string }>;
  /** Use when not in portal route (e.g. app mode on /chat) */
  projectId?: string;
  /** User ID to exclude from selection (e.g. current user - cannot chat with self) */
  excludeUserId?: string;
}

export function StartChatDialog({
  open,
  onOpenChange,
  onChatStarted,
  teamMembers = [],
  projectId: projectIdProp,
  excludeUserId,
}: StartChatDialogProps) {
  const { projectId: portalProjectId } = useClientPortalAuth();
  const projectId = projectIdProp ?? portalProjectId;
  const { t } = useLocalization();

  const [currentUserId, setCurrentUserId] = useState<string | null | 'pending'>('pending');
  useEffect(() => {
    if (!open) {
      setCurrentUserId('pending');
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, [open]);

  const excludeId = excludeUserId ?? (currentUserId === 'pending' ? undefined : currentUserId);
  const selectableMembers = excludeId
    ? teamMembers.filter((m) => m.id !== excludeId)
    : teamMembers;
  const isLoadingUser = currentUserId === 'pending' && !excludeUserId;

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mutation = useCreateConversation(projectId);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleToggleAll = (checked: boolean) => {
    setAllMembers(checked);
    if (checked) {
      setSelectedMembers(selectableMembers.map((m) => m.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleStartChat = async () => {
    const members = allMembers ? selectableMembers.map((m) => m.id) : selectedMembers;

    if (members.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await mutation.mutateAsync(members);
      toast.success('Conversation started');
      onChatStarted?.(members);
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to start conversation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedMembers([]);
    setAllMembers(false);
    onOpenChange(false);
  };

  const isAnySelected = allMembers || selectedMembers.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Start New Chat</SheetTitle>
          <SheetDescription>
            Select team members to start a conversation.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Select All - disabled until we know current user for correct filtering */}
          <div
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg border",
              isLoadingUser ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50 cursor-pointer"
            )}
          >
            <Checkbox
              id="all-members"
              checked={allMembers}
              onCheckedChange={handleToggleAll}
              disabled={isSubmitting || isLoadingUser}
            />
            <label
              htmlFor="all-members"
              className="flex-1 cursor-pointer font-medium"
            >
              {isLoadingUser ? "Loading..." : "All Team Members"}
            </label>
          </div>

          {/* Team Members List - only show when we can filter correctly */}
          <ScrollArea className="h-64 rounded-lg border">
            <div className="space-y-1 p-3">
              {isLoadingUser ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading team members...</div>
              ) : (
              selectableMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => {
                    if (!isSubmitting) {
                      toggleMember(member.id);
                    }
                  }}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    id={`member-${member.id}`}
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                    disabled={isSubmitting || allMembers}
                  />
                  <AvatarResolved
                    src={member.avatar_url}
                    alt={member.name}
                    className="h-8 w-8"
                  />
                  <label
                    htmlFor={`member-${member.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {member.name}
                  </label>
                </div>
              ))
              )}
            </div>
          </ScrollArea>

          {/* Selected Members Count */}
          {isAnySelected && (
            <div className="text-sm text-muted-foreground">
              {allMembers
                ? `All ${selectableMembers.length} members selected`
                : selectedMembers.length === 1
                  ? '1 member selected'
                  : `${selectedMembers.length} members selected`}
            </div>
          )}
        </div>

        {/* Buttons */}
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartChat}
            disabled={!isAnySelected || isSubmitting}
          >
            {isSubmitting ? 'Starting...' : 'Start Chat'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

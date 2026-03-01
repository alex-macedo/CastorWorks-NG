import { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { Button } from '@/components/ui/button';
import { Search, User, Check, Plus, Loader2 } from 'lucide-react';
import { resolveStorageUrl } from '@/utils/storage';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string; // This is the PK of user_profiles
  user_id: string; // This is the FK to auth.users
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  resolved_avatar_url?: string | null;
  is_featured_on_portfolio: boolean;
}

interface ManagePortfolioTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const ManagePortfolioTeamDialog = ({
  open,
  onOpenChange,
  onUpdate,
}: ManagePortfolioTeamDialogProps) => {
  const { t } = useLocalization();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('display_name');

      if (error) throw error;

      const profiles = data as any[];

      // Resolve avatars
      const processedUsers = await Promise.all(
        profiles.map(async (profile) => {
          let resolvedUrl = null;
          if (profile.avatar_url) {
            resolvedUrl = await resolveStorageUrl(profile.avatar_url);
          }
          return {
            ...profile,
            // Handle null/undefined for the new column by defaulting to false
            is_featured_on_portfolio: profile.is_featured_on_portfolio || false,
            resolved_avatar_url: resolvedUrl,
          };
        })
      );

      setUsers(processedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, fetchUsers]);

  const toggleMember = async (user: UserProfile) => {
    setProcessingId(user.id);
    const newValue = !user.is_featured_on_portfolio;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_featured_on_portfolio: newValue } as any)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, is_featured_on_portfolio: newValue } : u
      ));
      
      onUpdate(); // Notify parent to refresh
    } catch (error) {
      console.error('Error updating member:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team member status',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('architect.portfolio.manageTeam')}</DialogTitle>
          <DialogDescription>
            {t('architect.portfolio.manageTeamDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {t('common.noResults')}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg transition-colors border",
                      user.is_featured_on_portfolio 
                        ? "bg-primary/5 border-primary/20" 
                        : "hover:bg-muted border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <AvatarResolved
                        src={user.resolved_avatar_url || user.avatar_url}
                        alt={user.display_name || 'User'}
                        fallback={user.display_name?.[0]?.toUpperCase() || 'U'}
                        className="h-10 w-10"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{user.display_name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant={user.is_featured_on_portfolio ? "secondary" : "outline"}
                      className={cn(
                        "h-8 gap-2 transition-all",
                        user.is_featured_on_portfolio && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                      onClick={() => toggleMember(user)}
                      disabled={!!processingId}
                    >
                      {processingId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user.is_featured_on_portfolio ? (
                        <>
                          <Check className="h-4 w-4" />
                           <span className="hidden sm:inline">{t('common.selected')}</span>

                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                           <span className="hidden sm:inline">{t('common.add')}</span>

                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end pt-2">
            <Button onClick={() => onOpenChange(false)}>
              {t('common.done')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

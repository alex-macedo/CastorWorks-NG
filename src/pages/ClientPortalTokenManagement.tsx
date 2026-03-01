import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { useDateFormat } from '@/hooks/useDateFormat';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { useLocalization } from "@/contexts/LocalizationContext";
interface Project {
  id: string;
  name: string;
}

interface ClientPortalToken {
  id: string;
  project_id: string;
  token: string;
  expires_at: string | null;
  created_at: string;
  last_accessed_at: string | null;
  is_active: boolean;
  project: {
    name: string;
  };
}

export default function ClientPortalTokenManagement() {
  const { toast } = useToast();
  const { formatLongDate, formatDateTime } = useDateFormat();
  const { t } = useLocalization();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [expiryDays, setExpiryDays] = useState<string>('30');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-tokens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Project[];
    },
  });

  // Fetch tokens
  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['client-portal-tokens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_portal_tokens')
        .select(`
          *,
          project:projects(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as ClientPortalToken[];
    },
  });

  // Generate token mutation
  const generateToken = useMutation({
    mutationFn: async ({ projectId, expiryDays }: { projectId: string; expiryDays: number }) => {
      const token = crypto.randomUUID();
      const expiresAt = expiryDays > 0 
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('client_portal_tokens')
        .insert({
          project_id: projectId,
          token,
          expires_at: expiresAt,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-tokens'] });
      toast({ title: t('toast.tokenGeneratedSuccessfully') });
      setIsDialogOpen(false);
      setSelectedProjectId('');
      setExpiryDays('30');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error generating token',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Revoke token mutation
  const revokeToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('client_portal_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-tokens'] });
      toast({ title: t('toast.tokenRevokedSuccessfully') });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error revoking token',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: t('toast.portalUrlCopiedToClipboard') });
  };

  const openPortal = (token: string) => {
    window.open(`/portal/${token}`, '_blank');
  };

  const handleGenerateToken = () => {
    if (!selectedProjectId) {
      toast({
        title: 'Please select a project',
        variant: 'destructive',
      });
      return;
    }

    generateToken.mutate({
      projectId: selectedProjectId,
      expiryDays: parseInt(expiryDays) || 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('clientPortalTokenManagement.clientPortalTokens')}</h2>
          <p className="text-muted-foreground">
            Generate and manage secure access tokens for client portals
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Client Portal Token</DialogTitle>
              <DialogDescription>
                Create a secure access token for a project's client portal
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder={t("additionalPlaceholders.selectProject")} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry (days)</Label>
                <Input
                  id="expiry"
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">
                  Set to 0 for no expiration
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleGenerateToken} disabled={generateToken.isPending}>
                {generateToken.isPending ? t('common.actions.generating') : t('common.actions.generateToken')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Tokens</CardTitle>
          <CardDescription>
            Manage all client portal access tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t("commonUI.loading") }</div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tokens generated yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last Accessed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">
                      {token.project?.name || 'Unknown Project'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {token.token.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={token.is_active ? 'default' : 'secondary'}>
                        {token.is_active ? 'Active' : 'Revoked'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {token.expires_at ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatLongDate(new Date(token.expires_at))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {token.last_accessed_at ? (
                        formatDateTime(new Date(token.last_accessed_at))
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(token.token)}
                          disabled={!token.is_active}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPortal(token.token)}
                          disabled={!token.is_active}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeToken.mutate(token.id)}
                          disabled={!token.is_active}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/DateInput';
import { Badge } from '@/components/ui/badge';
import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { useCommunicationLog } from '@/hooks/clientPortal/useCommunicationLog';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useAppProject } from '@/contexts/AppProjectContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';
import {
  Loader2,
  Search,
  Video,
  Mail,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CommunicationType } from '@/types/clientPortal';

import { ClientPortalPageHeader } from '../Layout/ClientPortalPageHeader';

interface CommunicationLogProps {
  mode?: 'portal' | 'app';
}

export function CommunicationLog({ mode = 'portal' }: CommunicationLogProps = {}) {
  const { t } = useLocalization();
  
  // Support both portal and app contexts
  const portalAuth = useClientPortalAuth();
  const appProject = useAppProject();
  
  // Use context based on mode
  const projectId = mode === 'app' ? appProject.selectedProject?.id : portalAuth.projectId;
  const [typeFilter, setTypeFilter] = useState<CommunicationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { formatLongDate } = useDateFormat();

  // Fetch project name for title display
  const { data: project } = useQuery({
    queryKey: ['clientPortalProject', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
  });

  const { logs, total, totalPages, isLoading } = useCommunicationLog({
    type: typeFilter === 'all' ? undefined : typeFilter,
    search: searchQuery,
    page,
    pageSize
  });

  const getTypeIcon = (type: CommunicationType) => {
    switch (type) {
      case 'meeting': return <Video className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone-call': return <Phone className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeBadgeColor = (type: CommunicationType) => {
    switch (type) {
      case 'meeting': return 'bg-blue-500 hover:bg-blue-600';
      case 'email': return 'bg-green-500 hover:bg-green-600';
      case 'phone-call': return 'bg-orange-500 hover:bg-orange-600';
      case 'message': return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const getTypeLabel = (type: CommunicationType) => {
    switch (type) {
      case 'meeting': return t("clientPortal.communication.types.meeting");
      case 'email': return t("clientPortal.communication.types.email");
      case 'phone-call': return t("clientPortal.communication.types.phoneCall");
      case 'message': return t("clientPortal.communication.types.message");
    }
  };

  const projName = project?.name || t("clientPortal.dashboard.loading");

  return (
    <div className="space-y-4">
      {/* Header - only show in portal mode */}
      {mode === 'portal' && (
        <ClientPortalPageHeader
          title={t("clientPortal.communication.title", { defaultValue: "Communication Log" })}
          subtitle={t("clientPortal.communication.description")}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("clientPortal.communication.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as CommunicationType | 'all')}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("clientPortal.communication.allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("clientPortal.communication.allTypes")}</SelectItem>
              <SelectItem value="meeting">{t("clientPortal.communication.types.meeting")}</SelectItem>
              <SelectItem value="email">{t("clientPortal.communication.types.email")}</SelectItem>
              <SelectItem value="phone-call">{t("clientPortal.communication.types.phoneCall")}</SelectItem>
              <SelectItem value="message">{t("clientPortal.communication.types.message")}</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-[180px]">
            <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <DateInput
              value={dateFilter}
              onChange={setDateFilter}
              className="pl-9"
            />
          </div>
        </div>
        
        <Button
          variant="glass-style-white"
        >
          {t("clientPortal.communication.filterButton")}
        </Button>
      </div>


      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("clientPortal.communication.tableHeaders.dateTime")}</TableHead>
              <TableHead>{t("clientPortal.communication.tableHeaders.type")}</TableHead>
              <TableHead>{t("clientPortal.communication.tableHeaders.subject")}</TableHead>
              <TableHead>{t("clientPortal.communication.tableHeaders.participants")}</TableHead>
              <TableHead className="text-right">{t("clientPortal.communication.tableHeaders.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {formatLongDate(log.date_time)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.date_time), 'hh:mm a')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getTypeBadgeColor(log.type)} text-white border-none gap-1`}>
                      {getTypeIcon(log.type)}
                      {getTypeLabel(log.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{log.subject}</div>
                    {log.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                        {log.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {log.participants.slice(0, 3).map((participant) => (
                        <AvatarResolved
                          key={participant.id}
                          src={participant.avatar_url}
                          alt={participant.name}
                          fallback={participant.name.charAt(0).toUpperCase()}
                          className="h-8 w-8 border-2 border-background"
                          fallbackClassName="text-xs"
                        />
                      ))}
                      {log.participants.length > 3 && (
                        <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                          +{log.participants.length - 3}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="link" size="sm" className="text-primary">
                      {t("clientPortal.communication.viewDetails")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {t("clientPortal.communication.noLogs")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t("clientPortal.communication.pagination.showing", {
            from: ((page - 1) * pageSize) + 1,
            to: Math.min(page * pageSize, total),
            total
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("clientPortal.communication.pagination.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t("clientPortal.communication.pagination.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

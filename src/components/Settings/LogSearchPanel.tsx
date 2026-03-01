import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, Search, CheckCircle, XCircle, AlertTriangle, Info, ArrowUpDown, ArrowUp, ArrowDown, Eye, Copy, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type LogMessage = {
  id: string;
  created_at: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  context: any;
  resolved: boolean;
  user_id: string | null;
};

type SortField = 'created_at' | 'level' | 'message' | 'resolved';
type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  field: SortField;
  direction: SortDirection;
}

export function LogSearchPanel() {
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortState>({ field: 'created_at', direction: 'desc' });
  const [selectedLog, setSelectedLog] = useState<LogMessage | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [contextSearch, setContextSearch] = useState<string>("");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: logsResult, isLoading } = useQuery({
    queryKey: ['log_messages', page, pageSize, levelFilter, search, resolvedFilter, sort, dateFromFilter, dateToFilter, contextSearch],
    queryFn: async () => {
      let query = supabase
        .from('log_messages')
        .select('*', { count: 'exact' });

      // Apply date range filter
      if (dateFromFilter) {
        query = query.gte('created_at', dateFromFilter);
      }
      if (dateToFilter) {
        query = query.lte('created_at', dateToFilter);
      }

      // Apply context search
      if (contextSearch) {
        query = query.contains('context', `"${contextSearch}"`);
      }

      // Apply sorting
      if (sort.direction) {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination after sorting
      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      if (levelFilter !== "all") {
        query = query.eq('level', levelFilter);
      }

      if (resolvedFilter !== "all") {
        query = query.eq('resolved', resolvedFilter === 'true');
      }

      if (search) {
        query = query.ilike('message', `%${search}%`);
      }

      const { data, error, count } = await query;
      
      if (error) throw error;
      return { data: data as LogMessage[], count };
    }
  });

  const logs = logsResult?.data || [];
  const count = logsResult?.count || 0;

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('log_messages')
        .update({ resolved: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log_messages'] });
      toast.success("Log marked as resolved");
    },
    onError: (error) => {
      toast.error("Failed to resolve log: " + error.message);
    }
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('clear_log_messages', {
        p_level: levelFilter !== 'all' ? levelFilter : null,
        p_resolved: resolvedFilter !== 'all' ? resolvedFilter === 'true' : null,
        p_date_from: dateFromFilter || null,
        p_date_to: dateToFilter || null,
        p_search: search || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['log_messages'] });
      toast.success(`Cleared ${deletedCount} log messages`);
      setClearDialogOpen(false);
      setPage(0);
    },
    onError: (error) => {
      toast.error("Failed to clear logs: " + error.message);
    }
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error': return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Error</Badge>;
      case 'warning': return <Badge variant="outline" className="border-yellow-500 text-yellow-500 gap-1"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
      case 'info': return <Badge variant="secondary" className="gap-1"><Info className="h-3 w-3" /> Info</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  const handleSort = (field: SortField) => {
    setSort(prev => {
      if (prev.field === field) {
        // Toggle direction: asc -> desc -> null -> asc
        if (prev.direction === 'asc') return { field, direction: 'desc' };
        if (prev.direction === 'desc') return { field, direction: null };
        return { field, direction: 'asc' };
      }
      return { field, direction: 'asc' };
    });
    setPage(0); // Reset to first page when sorting
  };

  const getSortIcon = (field: SortField) => {
    if (sort.field !== field || !sort.direction) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sort.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-foreground" />
      : <ArrowDown className="h-4 w-4 text-foreground" />;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const viewLogDetails = (log: LogMessage) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Logs</CardTitle>
        <CardDescription>View and manage application error and warning logs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enhanced Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
            </div>
            <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resolvedFilter} onValueChange={(v) => { setResolvedFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="false">Unresolved</SelectItem>
                <SelectItem value="true">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Advanced Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="datetime-local"
                placeholder="From date"
                value={dateFromFilter}
                onChange={(e) => { setDateFromFilter(e.target.value); setPage(0); }}
              />
            </div>
            <div className="flex-1">
              <Input
                type="datetime-local"
                placeholder="To date"
                value={dateToFilter}
                onChange={(e) => { setDateToFilter(e.target.value); setPage(0); }}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Search context..."
                value={contextSearch}
                onChange={(e) => { setContextSearch(e.target.value); setPage(0); }}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setLevelFilter("all");
                setResolvedFilter("all");
                setDateFromFilter("");
                setDateToFilter("");
                setContextSearch("");
                setSort({ field: 'created_at', direction: 'desc' });
                setPage(0);
              }}
            >
              Clear Filters
            </Button>
            <Button
              variant="destructive"
              onClick={() => setClearDialogOpen(true)}
              disabled={count === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Logs
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors w-24"
                  onClick={() => handleSort('level')}
                >
                  <div className="flex items-center gap-2">
                    Level
                    {getSortIcon('level')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors flex-1 min-w-0"
                  onClick={() => handleSort('message')}
                >
                  <div className="flex items-center gap-2">
                    Message
                    {getSortIcon('message')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors w-32"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-2">
                    Time
                    {getSortIcon('created_at')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors w-28"
                  onClick={() => handleSort('resolved')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {getSortIcon('resolved')}
                  </div>
                </TableHead>
                <TableHead className="text-right w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="w-24">{getLevelBadge(log.level)}</TableCell>
                    <TableCell className="flex-1 min-w-0">
                      <div className="space-y-2">
                        <div className="font-medium truncate" title={log.message}>{log.message}</div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="link"
                            className="h-auto p-0 text-xs text-muted-foreground"
                            onClick={() => viewLogDetails(log)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                          {log.context && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground">
                                  View Context
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Log Context</DialogTitle>
                                </DialogHeader>
                                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                                  {JSON.stringify(log.context, null, 2)}
                                </pre>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-32 whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </TableCell>
                    <TableCell className="w-28">
                      {log.resolved ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Unresolved</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right w-32">
                      {!log.resolved && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resolveMutation.mutate(log.id)}
                          disabled={resolveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages || 1}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!logs || logs.length < pageSize || (page + 1) >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Enhanced Log Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getLevelBadge(selectedLog.level)}
              Error Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="context">Context</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="raw">Raw Data</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Message</h4>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedLog.message}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Timestamp</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedLog.created_at), 'PPpp')}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Status</h4>
                      {selectedLog.resolved ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Unresolved</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(selectedLog.message)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Message
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2))}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="context" className="space-y-4">
                {selectedLog.context ? (
                  <ScrollArea className="h-[400px] w-full">
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                      {JSON.stringify(selectedLog.context, null, 2)}
                    </pre>
                  </ScrollArea>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No context data available
                  </div>
                )}
              </TabsContent>
              <TabsContent value="metadata" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Log ID</h4>
                      <p className="text-sm font-mono bg-muted p-2 rounded">{selectedLog.id}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">User ID</h4>
                      <p className="text-sm font-mono bg-muted p-2 rounded">
                        {selectedLog.user_id || 'System'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Relative Time</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedLog.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="raw" className="space-y-4">
                <ScrollArea className="h-[400px] w-full">
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear Logs Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear Log Messages
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This action will permanently delete {count} log messages based on your current filters.
                This cannot be undone.
              </p>
              {(levelFilter !== 'all' || resolvedFilter !== 'all' || search || dateFromFilter || dateToFilter) && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-medium mb-1">Active filters:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {levelFilter !== 'all' && <li>Level: {levelFilter}</li>}
                    {resolvedFilter !== 'all' && <li>Status: {resolvedFilter === 'true' ? 'Resolved' : 'Unresolved'}</li>}
                    {search && <li>Search: &quot;{search}&quot;</li>}
                    {dateFromFilter && <li>From: {dateFromFilter}</li>}
                    {dateToFilter && <li>To: {dateToFilter}</li>}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearLogsMutation.mutate()}
              disabled={clearLogsMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearLogsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear {count} Logs
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

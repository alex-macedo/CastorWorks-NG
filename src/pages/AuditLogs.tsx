/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Download, Search, AlertCircle } from "lucide-react";
import { useAuditLogs, useAuditLogUsers } from "@/hooks/useAuditLogs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ExcelJS from "@protobi/exceljs";
import { format } from "date-fns";
import { useDateFormat } from "@/hooks/useDateFormat";

import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function AuditLogs() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { formatDateTime } = useDateFormat();

  const { data: logs, isLoading } = useAuditLogs({
    eventType: eventTypeFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    userId: userFilter,
  });

  const { data: users } = useAuditLogUsers();

  const checkAdminAccess = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAdminAccess = roles?.some(r => r.role === "admin" || r.role === "project_manager");
    
    if (!hasAdminAccess) {
      toast({
        title: t("error.errorTitle"),
        description: t("accessNotEnabled"),
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  }, [navigate, t]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = searchQuery === "" || 
      log.event_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const exportToExcel = async () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast({
        title: t("noData"),
        description: t("pages.auditLogs.noLogsFound"),
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredLogs.map(log => ({
      "Event Type": log.event_key,
      "User Name": log.user_profiles?.display_name || "N/A",
      "Role": log.payload?.role || "N/A",
      "Action By": log.payload?.assigned_by || log.payload?.removed_by || "System",
      "Timestamp": formatDateTime(new Date(log.created_at)),
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Audit Logs");
    
    // Add headers
    if (exportData.length > 0) {
      const headers = Object.keys(exportData[0]);
      worksheet.columns = headers.map(header => ({ header, key: header, width: 15 }));
      worksheet.addRows(exportData);
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: t("toast.reportGeneratedSuccessfully"),
      description: t("commonUI.completeDatabaseExport"),
    });
  };

  const getEventBadgeVariant = (eventKey: string) => {
    if (eventKey === "role_assigned") return "default";
    if (eventKey === "role_removed") return "destructive";
    return "secondary";
  };

  const formatEventKey = (eventKey: string) => {
    return eventKey.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("pages.auditLogs.title")}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80 mt-1">
              {t("pages.auditLogs.description")}
            </p>
          </div>
          <Button variant="default" onClick={exportToExcel} disabled={!filteredLogs || filteredLogs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            {t("export")}
          </Button>
        </div>
      </SidebarHeaderShell>

      <Card>
        <CardHeader>
          <CardTitle>{t("commonUI.filters")}</CardTitle>
          <CardDescription>{t("pages.auditLogs.loadingLogs")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("additionalPlaceholders.searchLogs")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("additionalPlaceholders.eventType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                <SelectItem value="role_assigned">{t("pages.auditLogs.permissionsHeader")}</SelectItem>
                <SelectItem value="role_removed">{t("delete")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("additionalPlaceholders.selectUser")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              startLabel={t("pages.auditLogs.startDate")}
              endLabel={t("pages.auditLogs.endDate")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("pages.auditLogs.title")}</CardTitle>
          <CardDescription>
            {filteredLogs?.length || 0} {filteredLogs?.length === 1 ? t("toast.reportSavedToHistory") : t("messages.noLogsFound")} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !filteredLogs || filteredLogs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("pages.auditLogs.noLogsFound")}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pages.auditLogs.eventHeader")}</TableHead>
                    <TableHead>{t("pages.auditLogs.userHeader")}</TableHead>
                    <TableHead>{t("pages.auditLogs.permissionsHeader")}</TableHead>
                    <TableHead>{t("info")}</TableHead>
                    <TableHead>{t("auditLog.dateHeader")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant={getEventBadgeVariant(log.event_key)}>
                          {formatEventKey(log.event_key)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {log.user_profiles?.display_name || "Unknown User"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {log.user_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.payload?.role || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.payload?.assigned_by && `Assigned by: ${log.payload.assigned_by}`}
                        {log.payload?.removed_by && `Removed by: ${log.payload.removed_by}`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(new Date(log.created_at))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
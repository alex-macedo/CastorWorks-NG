import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { Download, FileText, Filter, ArrowLeft } from "lucide-react";
import { useAuditLogs, useAuditLogUsers, AuditLogFilters } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useLocalization } from "@/contexts/LocalizationContext";
import ExcelJS from "@protobi/exceljs";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";


export default function ClientAccessAuditLog() {
  const { t } = useLocalization();
  const EVENT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    client_access_granted: { label: t("clientAccess.auditLog.accessGranted"), variant: "default" },
    client_access_modified: { label: t("clientAccess.auditLog.accessModified"), variant: "secondary" },
    client_access_revoked: { label: t("clientAccess.auditLog.accessRevoked"), variant: "destructive" },
  };

  const navigate = useNavigate();
  const [filters, setFilters] = useState<AuditLogFilters>({
    eventType: "all",
    userId: "all",
  });

  const { data: auditLogs, isLoading } = useAuditLogs(filters);
  const { data: users } = useAuditLogUsers();

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value === "all" ? undefined : value }));
  };

  const exportToExcel = async () => {
    if (!auditLogs) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Audit Log");

    // Set column definitions
    worksheet.columns = [
      { header: "Date", key: "Date", width: 20 },
      { header: "Event", key: "Event", width: 20 },
      { header: "User", key: "User", width: 20 },
      { header: "Client", key: "Client", width: 20 },
      { header: "Project", key: "Project", width: 20 },
      { header: "Permissions", key: "Permissions", width: 40 },
    ];

    // Add header styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };

    // Add data rows
    const rows = auditLogs.map((log) => ({
      Date: format(new Date(log.created_at), "MMM dd, yyyy HH:mm"),
      Event: EVENT_LABELS[log.event_key]?.label || log.event_key,
      User: log.user_profiles?.display_name || "System",
      Client: log.payload?.client_name || "N/A",
      Project: log.payload?.project_name || "N/A",
      Permissions: log.payload?.permissions
        ? `Docs: ${log.payload.permissions.can_view_documents ? "✓" : "✗"}, Finance: ${log.payload.permissions.can_view_financials ? "✓" : "✗"}, Reports: ${log.payload.permissions.can_download_reports ? "✓" : "✗"}`
        : "N/A",
    }));

    worksheet.addRows(rows);

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client-access-audit-log-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!auditLogs) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Client Access Audit Log", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, 14, 30);

    const tableData = auditLogs.map((log) => [
      format(new Date(log.created_at), "MMM dd, yyyy HH:mm"),
      EVENT_LABELS[log.event_key]?.label || log.event_key,
      log.user_profiles?.display_name || "System",
      log.payload?.client_name || "N/A",
      log.payload?.project_name || "N/A",
    ]);

    autoTable(doc, {
      head: [["Date", "Event", "User", "Client", "Project"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] },
    });

    doc.save(`client-access-audit-log-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t("clientAccess.auditLog.loadingAuditLogs")}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <SidebarHeaderShell>
<div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/client-access")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("clientAccess.auditLog.backToClientAccess")}
        </Button>
        <h1 className="text-3xl font-bold mb-2">{t("clientAccess.auditLog.title")}</h1>
        <p className="text-muted-foreground">
          {t("clientAccess.auditLog.subtitle")}
        </p>
      </div>
</SidebarHeaderShell>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t("clientAccess.auditLog.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t("clientAccess.auditLog.eventType")}</Label>
              <Select
                value={filters.eventType || "all"}
                onValueChange={(value) => handleFilterChange("eventType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("clientAccess.auditLog.allEvents")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("clientAccess.auditLog.allEvents")}</SelectItem>
                  <SelectItem value="client_access_granted">{t("clientAccess.auditLog.accessGranted")}</SelectItem>
                  <SelectItem value="client_access_modified">{t("clientAccess.auditLog.accessModified")}</SelectItem>
                  <SelectItem value="client_access_revoked">{t("clientAccess.auditLog.accessRevoked")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("clientAccess.user")}</Label>
              <Select
                value={filters.userId || "all"}
                onValueChange={(value) => handleFilterChange("userId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("clientAccess.auditLog.allUsers")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("clientAccess.auditLog.allUsers")}</SelectItem>
                  {users?.map((user: any) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.display_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DateRangeFilter
              startDate={filters.startDate || ''}
              endDate={filters.endDate || ''}
              onStartDateChange={(value) => handleFilterChange("startDate", value)}
              onEndDateChange={(value) => handleFilterChange("endDate", value)}
              startLabel={t("clientAccess.auditLog.startDate")}
              endLabel={t("clientAccess.auditLog.endDate")}
              className="col-span-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t("clientAccess.auditLog.auditLogEntries")}</CardTitle>
              <CardDescription>
                {t("clientAccess.auditLog.entriesFound").replace("{count}", String(auditLogs?.length || 0))}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel}>
                <FileText className="h-4 w-4 mr-2" />
                {t("clientAccess.auditLog.exportExcel")}
              </Button>
              <Button variant="outline" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                {t("clientAccess.auditLog.exportPDF")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!auditLogs || auditLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("clientAccess.auditLog.noEntriesFound")}</p>
              <p className="text-sm mt-2">{t("clientAccess.auditLog.tryAdjustingFilters")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("clientAccess.auditLog.dateTime")}</TableHead>
                  <TableHead>{t("clientAccess.auditLog.event")}</TableHead>
                  <TableHead>{t("clientAccess.user")}</TableHead>
                  <TableHead>{t("clientAccess.client")}</TableHead>
                  <TableHead>{t("clientAccess.project")}</TableHead>
                  <TableHead>{t("clientAccess.auditLog.details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {format(new Date(log.created_at), "MMM dd, yyyy")}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "HH:mm:ss")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={EVENT_LABELS[log.event_key]?.variant || "default"}>
                        {EVENT_LABELS[log.event_key]?.label || log.event_key}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.user_profiles?.display_name || t("clientAccess.auditLog.system")}
                    </TableCell>
                    <TableCell>{log.payload?.client_name || t("clientAccess.auditLog.na")}</TableCell>
                    <TableCell>{log.payload?.project_name || t("clientAccess.auditLog.na")}</TableCell>
                    <TableCell>
                      {log.payload?.permissions && (
                        <div className="flex flex-wrap gap-1">
                          {log.payload.permissions.can_view_documents && (
                            <Badge variant="outline" className="text-xs">{t("clientAccess.docs")}</Badge>
                          )}
                          {log.payload.permissions.can_view_financials && (
                            <Badge variant="outline" className="text-xs">{t("clientAccess.finance")}</Badge>
                          )}
                          {log.payload.permissions.can_download_reports && (
                            <Badge variant="outline" className="text-xs">{t("clientAccess.reports")}</Badge>
                          )}
                        </div>
                      )}
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

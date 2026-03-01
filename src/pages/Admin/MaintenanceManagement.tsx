import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Trash2, Power, PowerOff } from "lucide-react";
import { useMaintenanceSettings, useUpdateMaintenanceSettings } from "@/hooks/useMaintenanceSettings";
import {
  useScheduledMaintenance,
  useCreateScheduledMaintenance,
  useUpdateScheduledMaintenance,
  useDeleteScheduledMaintenance,
} from "@/hooks/useScheduledMaintenance";
import { format, parseISO } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLocalization } from "@/contexts/LocalizationContext";

export default function MaintenanceManagement() {
  const { t } = useLocalization();
  const { data: settings } = useMaintenanceSettings();
  const { data: scheduledEvents } = useScheduledMaintenance();
  const updateSettings = useUpdateMaintenanceSettings();
  const createMaintenance = useCreateScheduledMaintenance();
  const updateMaintenance = useUpdateScheduledMaintenance();
  const deleteMaintenance = useDeleteScheduledMaintenance();

  const [estimatedTime, setEstimatedTime] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    scheduled_start: "",
    scheduled_end: "",
  });

  if (!settings) return <div>{t("commonUI.loading") }</div>;

  const handleToggleMaintenance = () => {
    const isActivating = !settings.enabled;
    updateSettings.mutate({
      id: settings.id,
      enabled: isActivating,
      sendNotification: isActivating, // Only send notification when activating
    });
  };

  const handleUpdateSettings = () => {
    updateSettings.mutate({
      id: settings.id,
      estimated_time: estimatedTime || settings.estimated_time,
      contact_email: contactEmail || settings.contact_email,
    });
    setEstimatedTime("");
    setContactEmail("");
  };

  const handleCreateMaintenance = () => {
    if (!newEvent.title || !newEvent.scheduled_start || !newEvent.scheduled_end) return;

    createMaintenance.mutate({
      ...newEvent,
      status: "scheduled",
      sendNotification: true, // Always send notification for scheduled maintenance
    });
    setNewEvent({ title: "", description: "", scheduled_start: "", scheduled_end: "" });
    setIsDialogOpen(false);
  };

  const handleCancelMaintenance = (id: string) => {
    updateMaintenance.mutate({ id, status: "cancelled" });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Current Maintenance Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings.enabled ? (
              <PowerOff className="h-5 w-5 text-destructive" />
            ) : (
              <Power className="h-5 w-5 text-primary" />
            )}
            {t("maintenance.title")}
          </CardTitle>
          <CardDescription>{t("maintenance.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-1">
              <p className="font-semibold">{t("maintenance.currentStatus")}</p>
              <Badge variant={settings.enabled ? "destructive" : "secondary"}>
                {settings.enabled
                  ? t("maintenance.maintenanceActive")
                  : t("maintenance.systemOperational")}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <p className="max-w-[220px] text-right text-sm leading-tight text-muted-foreground">
                {t("maintenance.toggleDescription")}
              </p>
              <Switch
                checked={settings.enabled}
                onCheckedChange={handleToggleMaintenance}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="estimated-time">Estimated Duration</Label>
              <Input
                id="estimated-time"
                placeholder={settings.estimated_time || "e.g., 2 hours"}
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Contact Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder={settings.contact_email || "support@example.com"}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleUpdateSettings} className="mt-2">
            Update Settings
          </Button>
        </CardContent>
      </Card>

      {/* Scheduled Maintenance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Maintenance
              </CardTitle>
              <CardDescription>
                Schedule maintenance windows to notify users in advance
              </CardDescription>
            </div>
            <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Schedule New Maintenance</SheetTitle>
                  <SheetDescription>
                    Users will see a notification 24-48 hours before the scheduled time
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder={t("additionalPlaceholders.systemUpgrade")}
                      value={newEvent.title}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder={t("additionalPlaceholders.upgradeInfrastructure")}
                      value={newEvent.description}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start">Start Time</Label>
                      <Input
                        id="start"
                        type="datetime-local"
                        value={newEvent.scheduled_start}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, scheduled_start: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end">End Time</Label>
                      <Input
                        id="end"
                        type="datetime-local"
                        value={newEvent.scheduled_end}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, scheduled_end: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleCreateMaintenance}>{t("buttons.schedule")}</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent>
          {!scheduledEvents || scheduledEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No scheduled maintenance events
            </p>
          ) : (
            <div className="space-y-4">
              {scheduledEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{event.title}</p>
                      <Badge
                        variant={
                          event.status === "scheduled"
                            ? "default"
                            : event.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(event.scheduled_start), "MMM dd, yyyy")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(event.scheduled_start), "HH:mm")} -{" "}
                        {format(parseISO(event.scheduled_end), "HH:mm")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {event.status === "scheduled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelMaintenance(event.id)}
                      >
                        {t('common.cancel')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMaintenance.mutate(event.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

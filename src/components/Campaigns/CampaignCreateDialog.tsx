/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/DateInput";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageSquare, Settings, Send } from "lucide-react";
import { useCampaigns, useContactsForCampaigns } from "@/hooks/useCampaigns";
import { CampaignCreateFormSchema, type CampaignCreateFormData } from "@/types/campaign.types";
import { RecipientSelector } from "./RecipientSelector";

import { useLocalization } from "@/contexts/LocalizationContext";
interface CampaignCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignCreateDialog({ open, onOpenChange }: CampaignCreateDialogProps) {
  const { t } = useLocalization();
  const { createCampaign } = useCampaigns();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("basics");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CampaignCreateFormData>({
    resolver: zodResolver(CampaignCreateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      audience_type: "manual",
      message_template: t("common.pages.campaignDialog.defaultMessageTemplate"),
      include_voice_for_vip: false,
      company_name: "",
      scheduled_at: undefined,
      selected_contacts: [],
    },
  });
  const includeVoiceForVip = useWatch({
    control,
    name: "include_voice_for_vip",
  });

  const audienceType = useWatch({ control, name: "audience_type" });
  const nameValue = useWatch({ control, name: "name" });
  const companyName = useWatch({ control, name: "company_name" });

  const onSubmit = async (data: CampaignCreateFormData) => {
    try {
      const formattedData = {
        ...data,
        scheduled_at: scheduledDate ? scheduledDate : null,
        selected_contact_ids: audienceType === "manual" ? selectedContacts : undefined,
      };

      await createCampaign.mutateAsync(formattedData);
      handleClose();
    } catch (error) {
      console.error("Failed to create campaign:", error);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedContacts([]);
    setScheduledDate(undefined);
    setActiveTab("basics");
    onOpenChange(false);
  };

  const canProceedToAudience = () => {
    return Boolean(nameValue?.length >= 3 && companyName?.length >= 2);
  };

  const canProceedToMessage = () => {
    if (audienceType === "manual") {
      return selectedContacts.length > 0;
    }
    return true; // For 'all' and 'filtered' types
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("common.pages.campaignDialog.createWhatsAppCampaignTitle")}</SheetTitle>
          <SheetDescription>{t("common.pages.campaignDialog.createWhatsAppCampaignDescription")}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basics">
                <Settings className="h-4 w-4 mr-2" />
                {t("common.pages.campaignDialog.basicsTabLabel")}
              </TabsTrigger>
              <TabsTrigger value="audience" disabled={!canProceedToAudience()}>
                <Users className="h-4 w-4 mr-2" />
                {t("common.pages.campaignDialog.audienceTabLabel")}
              </TabsTrigger>
              <TabsTrigger value="message" disabled={!canProceedToMessage()}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {t("common.pages.campaignDialog.messageTabLabel")}
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <Send className="h-4 w-4 mr-2" />
                {t("common.pages.campaignDialog.scheduleTabLabel")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("common.pages.campaignDialog.campaignNameLabel")}</Label>
                <Input id="name" placeholder={t("common.additionalPlaceholders.exampleCampaignName")} {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("common.pages.campaignDialog.descriptionLabel")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("common.additionalPlaceholders.briefDescription")}
                  rows={3}
                  {...register("description")}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">{t("common.pages.campaignDialog.companyNameLabel")}</Label>
                <Input id="company_name" placeholder={t("common.additionalPlaceholders.exampleCompanyName")} {...register("company_name")} />
                <p className="text-sm text-muted-foreground">
                  {t("common.pages.campaignDialog.companyNameHelperText")}
                </p>
                {errors.company_name && <p className="text-sm text-destructive">{errors.company_name.message}</p>}
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => setActiveTab("audience")} disabled={!canProceedToAudience()}>
                  {t("common.pages.campaignDialog.nextSelectAudienceButton")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="audience" className="space-y-4 pt-4">
              <div className="space-y-4">
                <Label>{t("common.pages.campaignDialog.audienceQuestionLabel")}</Label>
                <RadioGroup value={audienceType} onValueChange={(value: any) => setValue("audience_type", value)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="flex-1 cursor-pointer">
                      <div className="font-medium">{t("common.components.manuallySelectContacts")}</div>
                      <div className="text-sm text-muted-foreground">{t("common.components.chooseSpecificContacts")}</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="flex-1 cursor-pointer">
                      <div className="font-medium">{t("common.components.allContacts")}</div>
                      <div className="text-sm text-muted-foreground">
                        {t("common.pages.campaignDialog.allClientsSupplierText")}
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="filtered" id="filtered" />
                    <Label htmlFor="filtered" className="flex-1 cursor-pointer">
                      <div className="font-medium">{t("common.components.filtered")}</div>
                      <div className="text-sm text-muted-foreground">{t("common.components.applyFilters")}</div>
                    </Label>
                  </div>
                </RadioGroup>

                {audienceType === "manual" && (
                  <div className="mt-4">
                    <RecipientSelector selectedIds={selectedContacts} onSelectionChange={setSelectedContacts} />
                  </div>
                )}

                {audienceType === "filtered" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {t("common.pages.campaignDialog.filterOptionsHelpText")}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab("basics")}>
                  {t("common.pages.campaignDialog.backButton")}
                </Button>
                <Button type="button" onClick={() => setActiveTab("message")} disabled={!canProceedToMessage()}>
                  {t("common.pages.campaignDialog.nextCreateMessageButton")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="message" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="message_template">{t("common.pages.campaignDialog.messageTemplateLabel")}</Label>
                <Textarea
                  id="message_template"
                  rows={6}
                  placeholder={t("common.additionalPlaceholders.personalMessage")}
                  {...register("message_template")}
                />
                <p className="text-sm text-muted-foreground">
                  {t("common.pages.campaignDialog.messageTemplateHelperText")}
                </p>
                {errors.message_template && (
                  <p className="text-sm text-destructive">{errors.message_template.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Switch
                  id="include_voice"
                  checked={includeVoiceForVip}
                  onCheckedChange={(checked) => setValue("include_voice_for_vip", checked)}
                />
                <Label htmlFor="include_voice" className="flex-1 cursor-pointer">
                  <div className="font-medium">{t("common.pages.campaignDialog.includeVoiceMessageLabel")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("common.pages.campaignDialog.includeVoiceMessageDescription")}
                  </div>
                </Label>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab("audience")}>
                  {t("common.pages.campaignDialog.backButton")}
                </Button>
                <Button type="button" onClick={() => setActiveTab("schedule")}>
                  {t("common.pages.campaignDialog.nextScheduleButton")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 pt-4">
              <div className="space-y-4">
                <Label>{t("common.pages.campaignDialog.scheduleQuestionLabel")}</Label>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <RadioGroup
                      value={scheduledDate !== undefined ? "scheduled" : "draft"}
                      onValueChange={(value) => {
                        if (value === "draft") {
                          setScheduledDate(undefined);
                        } else {
                          setScheduledDate("");
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="draft" id="draft" />
                        <Label htmlFor="draft" className="cursor-pointer">
                          {t("common.pages.campaignDialog.saveDraftLabel")}
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="scheduled" id="scheduled" />
                        <Label htmlFor="scheduled" className="cursor-pointer">
                          {t("common.pages.campaignDialog.scheduleSpecificLabel")}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {scheduledDate !== undefined && (
                    <div className="ml-6">
                      <DateInput
                        value={scheduledDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={setScheduledDate}
                      />
                    </div>
                  )}
                </div>
              </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setActiveTab("message")}>
              {t("common.pages.campaignDialog.backButton")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t("common.pages.campaignDialog.cancelButton")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("common.pages.campaignDialog.creatingButton") : t("common.pages.campaignDialog.createCampaignButton")}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </form>
      </SheetContent>
    </Sheet>
  );
}

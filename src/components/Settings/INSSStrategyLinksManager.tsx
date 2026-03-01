import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings, type StrategyLinkConfig } from "@/hooks/useAppSettings";
import { toast } from "sonner";
import { Plus, Trash2, Save, Link as LinkIcon, AlertCircle } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

export function INSSStrategyLinksManager() {
  const { t } = useLocalization();
  const { settings, updateSettings } = useAppSettings();
  const [links, setLinks] = useState<StrategyLinkConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.tax_strategy_links) {
      setLinks(settings.tax_strategy_links as StrategyLinkConfig[]);
    }
  }, [settings]);

  const handleAddLink = () => {
    const nextOrder = links.length > 0 ? Math.max(...links.map(l => l.step_order)) + 1 : 1;
    const newLink: StrategyLinkConfig = {
      step_order: nextOrder,
      summary: t("settings:inssStrategyLinks.newStep"),
      description: "",
      external_url: ""
    };
    setLinks([...links, newLink]);
    setHasChanges(true);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = [...links];
    newLinks.splice(index, 1);
    // Reorder remaining links
    const reorderedLinks = newLinks.map((link, idx) => ({
      ...link,
      step_order: idx + 1
    }));
    setLinks(reorderedLinks);
    setHasChanges(true);
  };

  const handleUpdateLink = (index: number, updates: Partial<StrategyLinkConfig>) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], ...updates };
    setLinks(newLinks);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate({ tax_strategy_links: links }, {
      onSuccess: () => {
        setHasChanges(false);
        toast.success(t("settings:inssStrategyLinks.successUpdate"));
      },
      onError: (err: any) => {
        toast.error(t("settings:inssStrategyLinks.errorUpdate", { error: err.message }));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t("settings:inssStrategyLinks.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("settings:inssStrategyLinks.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAddLink}>
            <Plus className="h-4 w-4 mr-2" />
            {t("settings:inssStrategyLinks.addStep")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || updateSettings.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateSettings.isPending ? t("settings:inssStrategyLinks.saving") : t("settings:inssStrategyLinks.saveChanges")}
          </Button>
        </div>
      </div>

      {links.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("settings:inssStrategyLinks.noSteps")}</p>
            <Button variant="link" onClick={handleAddLink}>{t("settings:inssStrategyLinks.addFirstStep")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {links.map((link, index) => (
            <Card key={index} className="relative group">
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg z-10">
                {link.step_order}
              </div>
              <CardContent className="pt-6">
                <div className="grid gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>{t("settings:inssStrategyLinks.stepSummaryLabel")}</Label>
                      <Input 
                        value={link.summary} 
                        onChange={(e) => handleUpdateLink(index, { summary: e.target.value })}
                        placeholder={t("settings:inssStrategyLinks.stepSummaryPlaceholder")}
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveLink(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t("settings:inssStrategyLinks.stepDescriptionLabel")}</Label>
                    <Textarea 
                      value={link.description} 
                      onChange={(e) => handleUpdateLink(index, { description: e.target.value })}
                      placeholder={t("settings:inssStrategyLinks.stepDescriptionPlaceholder")}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("settings:inssStrategyLinks.externalUrlLabel")}</Label>
                    <Input 
                      value={link.external_url || ""}
                      onChange={(e) => handleUpdateLink(index, { external_url: e.target.value || null })}
                      placeholder={t("settings:inssStrategyLinks.externalUrlPlaceholder")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasChanges && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{t("settings:inssStrategyLinks.unsavedChanges")}</p>
        </div>
      )}
    </div>
  );
}

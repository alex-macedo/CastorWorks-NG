import { useState, useEffect } from "react";

import { useLocalization } from "@/contexts/LocalizationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfig } from "@/contexts/ConfigContext";

interface ConfigValue {
  id: string;
  key: string;
  label: string;
  icon?: string;
  color?: string;
  sortOrder: number;
}

interface ConfigCategory {
  id: string;
  key: string;
  label: string;
  values: ConfigValue[];
}

interface ConfigValueEditorProps {
  isOpen: boolean;
  onClose: () => void;
  category: ConfigCategory;
  value: ConfigValue | null;
  targetLanguage: string;
}

export const ConfigValueEditor = ({
  isOpen,
  onClose,
  category,
  value,
  targetLanguage,
}: ConfigValueEditorProps) => {
  const { t } = useLocalization();
  const { refreshConfig } = useConfig();
  const [formData, setFormData] = useState({
    key: "",
    icon: "",
    color: "",
    sortOrder: category.values.length + 1,
    translations: {
      "en-US": "",
      "pt-BR": "",
      "es-ES": "",
      "fr-FR": "",
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (value) {
      // Fetch translations for this value
      const loadTranslations = async () => {
        const { data } = await supabase
          .from("config_translations")
          .select("language_code, label")
          .eq("entity_type", "value")
          .eq("entity_id", value.id);

        const translations = {
          "en-US": "",
          "pt-BR": "",
          "es-ES": "",
          "fr-FR": "",
        };

        data?.forEach((t) => {
          const lang = t.language_code as keyof typeof translations;
          translations[lang] = t.label;
        });

        setFormData({
          key: value.key,
          icon: value.icon || "",
          color: value.color || "",
          sortOrder: value.sortOrder,
          translations,
        });
      };
      loadTranslations();
    } else {
      setFormData({
        key: "",
        icon: "",
        color: "",
        sortOrder: category.values.length + 1,
        translations: {
          "en-US": "",
          "pt-BR": "",
          "es-ES": "",
          "fr-FR": "",
        },
      });
    }
  }, [value, category.values.length]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (value) {
        // Update existing value
        const { error: updateError } = await supabase
          .from("config_values")
          .update({
            key: formData.key,
            icon: formData.icon || null,
            color: formData.color || null,
            sort_order: formData.sortOrder,
          })
          .eq("id", value.id);

        if (updateError) throw updateError;

        // Update translations
        for (const [lang, label] of Object.entries(formData.translations)) {
          if (label) {
            await supabase
              .from("config_translations")
              .upsert({
                entity_type: "value",
                entity_id: value.id,
                language_code: lang,
                label,
              });
          }
        }

        toast.success(t('settings.localization.editor.saveSuccess'));
      } else {
        // Create new value
        const { data: newValue, error: insertError } = await supabase
          .from("config_values")
          .insert({
            category_id: category.id,
            key: formData.key,
            value_key: `config.values.${formData.key}`,
            icon: formData.icon || null,
            color: formData.color || null,
            sort_order: formData.sortOrder,
            is_active: true,
            is_system: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Insert translations
        for (const [lang, label] of Object.entries(formData.translations)) {
          if (label) {
            await supabase.from("config_translations").insert({
              entity_type: "value",
              entity_id: newValue.id,
              language_code: lang,
              label,
            });
          }
        }

        toast.success(t('settings.localization.editor.saveSuccess'));
      }

      await refreshConfig();
      onClose();
    } catch (error) {
      console.error("Error saving value:", error);
      toast.error(t('settings.localization.editor.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{value ? t("settings:localization.editor.updateValue") : t("settings:localization.editor.createValue")}</DialogTitle>
          <DialogDescription>
            {t('settings.localization.editor.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">{t('settings.localization.editor.keyLabel')}</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder={t("additionalPlaceholders.exampleKey")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">{t('settings.localization.editor.sortOrderLabel')}</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">{t('settings.localization.editor.iconLabel')}</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="🔥"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">{t('settings.localization.editor.colorLabel')}</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder={t("additionalPlaceholders.exampleValue")}
              />
            </div>
          </div>

          <Tabs defaultValue={targetLanguage} variant="pill" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="en-US">🇺🇸 English</TabsTrigger>
              <TabsTrigger value="pt-BR">🇧🇷 Português</TabsTrigger>
              <TabsTrigger value="es-ES">🇪🇸 Español</TabsTrigger>
              <TabsTrigger value="fr-FR">🇫🇷 Français</TabsTrigger>
            </TabsList>
            <TabsContent value="en-US" className="space-y-2">
              <Label htmlFor="label-en-US">{t('settings.localization.editor.englishLabel')}</Label>
              <Input
                id="label-en-US"
                value={formData.translations["en-US"]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    translations: { ...formData.translations, "en-US": e.target.value },
                  })
                }
                placeholder={t("additionalPlaceholders.examplePriority")}
              />
            </TabsContent>
            <TabsContent value="pt-BR" className="space-y-2">
              <Label htmlFor="label-pt-BR">{t('settings.localization.editor.portugueseLabel')}</Label>
              <Input
                id="label-pt-BR"
                value={formData.translations["pt-BR"]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    translations: { ...formData.translations, "pt-BR": e.target.value },
                  })
                }
                placeholder={t("additionalPlaceholders.examplePriority")}
              />
            </TabsContent>
            <TabsContent value="es-ES" className="space-y-2">
              <Label htmlFor="label-es-ES">{t('settings.localization.editor.spanishLabel')}</Label>
              <Input
                id="label-es-ES"
                value={formData.translations["es-ES"]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    translations: { ...formData.translations, "es-ES": e.target.value },
                  })
                }
                placeholder={t("additionalPlaceholders.examplePriority")}
              />
            </TabsContent>
            <TabsContent value="fr-FR" className="space-y-2">
              <Label htmlFor="label-fr-FR">{t('settings.localization.editor.frenchLabel')}</Label>
              <Input
                id="label-fr-FR"
                value={formData.translations["fr-FR"]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    translations: { ...formData.translations, "fr-FR": e.target.value },
                  })
                }
                placeholder={t("additionalPlaceholders.examplePriority")}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.key || !formData.translations["en-US"]}
            className=""
          >
            {isSaving ? t('settings.saving') : value ? t("settings:localization.editor.updateValue") : t("settings:localization.editor.createValue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

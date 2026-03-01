import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { ConfigCategoryCard } from "./ConfigCategoryCard";
import { useLocalization, languageMetadata } from "@/contexts/LocalizationContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const LocalizationTab = () => {
  const { categories, isLoading } = useConfig();
  const { t, language } = useLocalization();
  const [searchQuery, setSearchQuery] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<string>(language);

  const filteredCategories = categories.filter(cat =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('settings.localization.title')}</CardTitle>
              <CardDescription>
                {t('settings.localization.description')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="target-language" className="text-sm font-medium whitespace-nowrap">
                  {t('settings.localization.targetLanguage')}
                </Label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger id="target-language" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(languageMetadata).map(([code, meta]) => (
                      <SelectItem key={code} value={code}>
                        {meta.flag} {meta.nativeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="">
                <Plus className="mr-2 h-4 w-4" />
                {t('settings.localization.addCategory')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("additionalPlaceholders.searchCategories")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('settings.localization.loadingConfiguration')}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('settings.localization.noCategoriesFound')}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCategories.map((category) => (
                <ConfigCategoryCard key={category.id} category={category} targetLanguage={targetLanguage} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

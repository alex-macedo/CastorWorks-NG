import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Edit, Trash2, Plus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfigValueEditor } from "./ConfigValueEditor";
import { useLocalization } from "@/contexts/LocalizationContext";

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

interface ConfigCategoryCardProps {
  category: ConfigCategory;
  targetLanguage: string;
}

export const ConfigCategoryCard = ({ category, targetLanguage }: ConfigCategoryCardProps) => {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<ConfigValue | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleAddValue = () => {
    setEditingValue(null);
    setIsEditorOpen(true);
  };

  const handleEditValue = (value: ConfigValue) => {
    setEditingValue(value);
    setIsEditorOpen(true);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{category.label}</h3>
                  <p className="text-sm text-muted-foreground">{category.key}</p>
                </div>
                <Badge variant="secondary">{t('settings.localization.valuesCount', { count: category.values.length })}</Badge>
              </CollapsibleTrigger>
              <div className="flex items-center gap-2 ml-4">
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={handleAddValue} size="sm" className="">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('settings.localization.addValue')}
                  </Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">{t('settings.localization.table.order')}</TableHead>
                        <TableHead>{t('settings.localization.table.key')}</TableHead>
                        <TableHead>{t('settings.localization.table.label')}</TableHead>
                        <TableHead className="w-[100px]">{t('settings.localization.table.icon')}</TableHead>
                        <TableHead className="w-[100px]">{t('settings.localization.table.color')}</TableHead>
                        <TableHead className="w-[100px] text-right">{t('settings.localization.table.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.values.map((value) => (
                        <TableRow key={value.id}>
                          <TableCell className="font-medium">{value.sortOrder}</TableCell>
                          <TableCell className="font-mono text-sm">{value.key}</TableCell>
                          <TableCell>{value.label}</TableCell>
                          <TableCell>{value.icon || "-"}</TableCell>
                          <TableCell>
                            {value.color ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: value.color }}
                                />
                                <span className="text-sm">{value.color}</span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditValue(value)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <ConfigValueEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        category={category}
        value={editingValue}
        targetLanguage={targetLanguage}
      />
    </>
  );
};

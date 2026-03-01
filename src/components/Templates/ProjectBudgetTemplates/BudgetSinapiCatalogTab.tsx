import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useSinapiCatalog } from "@/hooks/useSinapiCatalog";
import { useLocalization } from '@/contexts/LocalizationContext';

const BRAZILIAN_STATES = [
  "SP", "RJ", "MG", "RS", "PR", "SC", "BA", "GO", "PE", "CE"
];

interface BudgetSinapiCatalogTabProps {
  budgetId: string;
  projectId: string;
}

export const BudgetSinapiCatalogTab = ({
  budgetId,
  projectId,
}: BudgetSinapiCatalogTabProps) => {
  const { t } = useLocalization();
  const [state, setState] = useState("SP");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { items, totalCount, totalPages, isLoading } = useSinapiCatalog({
    state,
    searchTerm,
    page,
    pageSize,
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page on search
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("budgets:worksheets.comp")}</CardTitle>
        <CardDescription>
          {t("budgets:catalog.description", { count: totalCount })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2">
             <Label>{t("budgets:catalog.selectState")}</Label>
             <Select value={state} onValueChange={(value) => {
               setState(value);
               setPage(1);
             }}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {BRAZILIAN_STATES.map((stateCode) => (
                   <SelectItem key={stateCode} value={stateCode}>
                     {t(`budgets:catalog.states.${stateCode}`)}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>

            <div className="space-y-2">
              <Label>{t("budgets:catalog.search")}</Label>
              <Input
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t("budgets:catalog.searchPlaceholder")}
              />
            </div>
        </div>

        {/* Results Table */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            {t("common:loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {t("budgets:catalog.noResults")}
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-x-auto">
              <Table className="table-fixed w-full">
                 <TableHeader>
                   <TableRow className="h-8">
                     <TableHead className="h-8 py-1 text-xs font-semibold w-[80px]">{t("budgets:editor.sinapiCode")}</TableHead>
                     <TableHead className="h-8 py-1 text-xs font-semibold w-[60px]">{t("budgets:catalog.item")}</TableHead>
                     <TableHead className="h-8 py-1 text-xs font-semibold">{t("budgets:editor.description")}</TableHead>
                     <TableHead className="h-8 py-1 text-xs font-semibold w-[50px]">{t("budgets:editor.unit")}</TableHead>
                     <TableHead className="h-8 py-1 text-xs font-semibold text-right w-[90px]">{t("budgets:editor.material")}</TableHead>
                     <TableHead className="h-8 py-1 text-xs font-semibold text-right w-[80px]">{t("budgets:editor.labor")}</TableHead>
                     <TableHead className="h-8 py-1 text-xs font-semibold w-[80px]">{t("budgets:catalog.type")}</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {items.map((item, index) => (
                     <TableRow key={item.id} className={`h-auto ${index % 2 === 1 ? 'bg-muted/50' : ''}`}>
                       <TableCell className="font-mono text-xs py-1 w-[80px]">
                         {item.sinapi_code}
                       </TableCell>
                       <TableCell className="text-xs font-medium py-1 w-[60px]">
                         {item.sinapi_item || "-"}
                       </TableCell>
                       <TableCell className="text-xs py-1 whitespace-normal break-words">
                         {item.sinapi_description}
                       </TableCell>
                       <TableCell className="text-xs py-1 w-[50px]">{item.sinapi_unit || "-"}</TableCell>
                       <TableCell className="text-right text-xs py-1 w-[90px]">
                         {formatCurrency(item.sinapi_material_cost || 0, "BRL")}
                       </TableCell>
                       <TableCell className="text-right text-xs py-1 w-[80px]">
                         {formatCurrency(item.sinapi_labor_cost || 0, "BRL")}
                       </TableCell>
                       <TableCell className="text-xs py-1 w-[80px]">
                         {item.sinapi_type || "-"}
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t("budgets:catalog.showing", {
                  from: (page - 1) * pageSize + 1,
                  to: Math.min(page * pageSize, totalCount),
                  total: totalCount,
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("common:previous")}
                </Button>
                <div className="text-sm">
                  {t("budgets:catalog.page", { page, total: totalPages })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  {t("common:next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};


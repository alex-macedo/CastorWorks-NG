import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { useSinapiCatalog } from "@/hooks/useSinapiCatalog";
import { useLocalization } from '@/contexts/LocalizationContext';

const BRAZILIAN_STATES = [
  { code: "SP", name: "São Paulo" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "MG", name: "Minas Gerais" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "PR", name: "Paraná" },
  { code: "SC", name: "Santa Catarina" },
  { code: "BA", name: "Bahia" },
  { code: "GO", name: "Goiás" },
  { code: "PE", name: "Pernambuco" },
  { code: "CE", name: "Ceará" },
];

export function SinapiCatalogView() {
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
        <CardTitle>{t("settings:sinapi.catalogTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("settings:sinapi.selectState")}</Label>
            <Select value={state} onValueChange={(value) => {
              setState(value);
              setPage(1);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("settings:sinapi.searchItems")}</Label>
            <Input
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("settings:sinapi.searchPlaceholder")}
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
            {t("settings:sinapi.noResults")}
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings:sinapi.code")}</TableHead>
                    <TableHead>{t("budgets:catalog.item")}</TableHead>
                    <TableHead>{t("settings:sinapi.description")}</TableHead>
                    <TableHead>{t("settings:sinapi.unit")}</TableHead>
                    <TableHead className="text-right">{t("settings:sinapi.materialCost")}</TableHead>
                    <TableHead className="text-right">{t("settings:sinapi.laborCost")}</TableHead>
                    <TableHead>{t("settings:sinapi.type")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.sinapi_code}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {item.sinapi_item || "-"}
                      </TableCell>
                      <TableCell className="max-w-md text-sm">
                        {item.sinapi_description}
                      </TableCell>
                      <TableCell className="text-sm">{item.sinapi_unit || "-"}</TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(item.sinapi_material_cost || 0, "BRL")}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(item.sinapi_labor_cost || 0, "BRL")}
                      </TableCell>
                      <TableCell className="text-sm">
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
}
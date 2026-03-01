import { useState, useMemo, useRef } from "react";
import { ArrowLeft, Save, Plus, Trash2, Download, Upload, Edit2, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { usePurchaseRequestItems } from "@/hooks/usePurchaseRequestItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/DateInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocalization } from "@/contexts/LocalizationContext";
import ExcelJS from "@protobi/exceljs";
import { useToast } from "@/hooks/use-toast";
import { SummaryCard } from "@/components/PurchaseRequest/SummaryCard";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

interface PurchaseItem {
  id: string;
  description: string;
  quantity: number;
  estimatedPrice: string;
}

interface ValidationErrors {
  [itemId: string]: {
    description?: string;
    quantity?: string;
    estimatedPrice?: string;
  };
}

const PurchaseRequest = () => {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { toast } = useToast();
  const { createRequest } = usePurchaseRequests();
  const { createItem } = usePurchaseRequestItems();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    project: "",
    requestedBy: "",
    priority: "",
    deliveryDate: "",
    notes: "",
  });

  const [items, setItems] = useState<PurchaseItem[]>([
    { id: "1", description: "", quantity: 1, estimatedPrice: "" },
  ]);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    quantity: "",
    estimatedPrice: "",
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: "", quantity: 1, estimatedPrice: "" },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof PurchaseItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    // Clear validation error for this field when user starts typing
    if (validationErrors[id]?.[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          [field]: undefined,
        }
      }));
    }
  };

  const validateItem = (item: PurchaseItem): { [key: string]: string } => {
    const errors: { [key: string]: string } = {};

    if (!item.description.trim()) {
      errors.description = "Description is required";
    }

    if (!item.quantity || item.quantity <= 0) {
      errors.quantity = "Quantity must be greater than 0";
    }

    if (item.estimatedPrice && parseFloat(item.estimatedPrice) < 0) {
      errors.estimatedPrice = "Price cannot be negative";
    }

    return errors;
  };

  const validateAllItems = (): boolean => {
    const newErrors: ValidationErrors = {};
    let hasErrors = false;

    items.forEach(item => {
      const itemErrors = validateItem(item);
      if (Object.keys(itemErrors).length > 0) {
        newErrors[item.id] = itemErrors;
        hasErrors = true;
      }
    });

    setValidationErrors(newErrors);
    return !hasErrors;
  };

  const handleItemBlur = (itemId: string, field: keyof PurchaseItem) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const itemErrors = validateItem(item);
    if (itemErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: itemErrors[field],
        }
      }));
    }
  };

  const toggleItemSelection = (id: string) => {
    const newSelection = new Set(selectedItemIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItemIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map(item => item.id)));
    }
  };

  const handleBulkUpdate = () => {
    if (selectedItemIds.size === 0) return;

    setItems(items.map(item => {
      if (selectedItemIds.has(item.id)) {
        const updates: Partial<PurchaseItem> = {};
        if (bulkEditData.quantity) {
          updates.quantity = parseInt(bulkEditData.quantity);
        }
        if (bulkEditData.estimatedPrice) {
          updates.estimatedPrice = bulkEditData.estimatedPrice;
        }
        return { ...item, ...updates };
      }
      return item;
    }));

    toast({
      title: t('toast.bulkUpdateSuccessful'),
      description: `Updated ${selectedItemIds.size} item${selectedItemIds.size > 1 ? 's' : ''}.`,
    });

    setBulkEditMode(false);
    setSelectedItemIds(new Set());
    setBulkEditData({ quantity: "", estimatedPrice: "" });
  };

  const cancelBulkEdit = () => {
    setBulkEditMode(false);
    setSelectedItemIds(new Set());
    setBulkEditData({ quantity: "", estimatedPrice: "" });
  };

  // Calculate totals and validation status
  const totals = useMemo(() => {
    const itemsTotal = items.reduce((sum, item) => {
      const price = parseFloat(item.estimatedPrice) || 0;
      const quantity = item.quantity || 0;
      return sum + (price * quantity);
    }, 0);
    
    return {
      itemCount: items.length,
      grandTotal: itemsTotal,
    };
  }, [items]);

  const validationSummary = useMemo(() => {
    const errorCount = Object.keys(validationErrors).reduce((count, itemId) => {
      const itemErrors = validationErrors[itemId];
      return count + Object.values(itemErrors).filter(Boolean).length;
    }, 0);

    let status: "valid" | "invalid" | "pending" = "pending";
    
    // If there are validation errors, status is invalid
    if (errorCount > 0) {
      status = "invalid";
    } 
    // If all items have required fields filled and no errors, status is valid
    else if (items.length > 0 && items.every(item => item.description.trim() && item.quantity > 0)) {
      status = "valid";
    }

    return {
      status,
      errorCount,
    };
  }, [items, validationErrors]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const handleExportToCSV = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Purchase Items");
    
    const headers = ['#', 'Description', 'Quantity', 'Unit Price (R$)', 'Total'];
    worksheet.columns = headers.map(header => ({ header, key: header, width: 15 }));
    
    const rows = items.map((item, index) => ({
      '#': index + 1,
      'Description': item.description,
      'Quantity': item.quantity,
      'Unit Price (R$)': item.estimatedPrice,
      'Total': (parseFloat(item.estimatedPrice) || 0) * (item.quantity || 0),
    }));
    
    worksheet.addRows(rows);
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchase-request-items.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: t('toast.importSuccessful'),
      description: t('toast.itemsExportedToExcel'),
    });
  };

  const handleImportFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) return;
      
      const jsonData: any[] = [];
      const headerRow: any[] = [];
      
      // Get headers
      worksheet.getRow(1)?.eachCell((cell) => {
        headerRow.push(String(cell.value || ''));
      });
      
      // Get data rows
      worksheet.eachRow((row, rowIndex) => {
        if (rowIndex === 1) return; // Skip header
        const rowObj: any = {};
        row.eachCell((cell, colIndex) => {
          const header = headerRow[colIndex - 1];
          if (header) {
            rowObj[header] = cell.value;
          }
        });
        jsonData.push(rowObj);
      });

      const importedItems: PurchaseItem[] = jsonData.map((row, index) => ({
        id: Date.now().toString() + index,
        description: row['Description'] || row['description'] || '',
        quantity: parseInt(row['Quantity'] || row['quantity'] || '1'),
        estimatedPrice: (row['Unit Price (R$)'] || row['Unit Price'] || row['estimatedPrice'] || '').toString(),
      }));

      if (importedItems.length > 0) {
        setItems(importedItems);
        toast({
          title: t('toast.importSuccessful'),
          description: `${importedItems.length} items imported.`,
        });
      }
    } catch (error) {
      toast({
        title: t('toast.importFailed'),
        description: t('toast.failedToParseFile'),
        variant: "destructive",
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.trim().split('\n');
      
      // Skip header row if it exists
      const dataRows = rows[0].toLowerCase().includes('description') ? rows.slice(1) : rows;
      
      const importedItems: PurchaseItem[] = dataRows
        .map((row, index) => {
          const columns = row.split('\t'); // Excel copies as tab-separated
          if (columns.length < 2) return null;
          
          return {
            id: Date.now().toString() + index,
            description: columns[0]?.trim() || '',
            quantity: parseInt(columns[1]?.trim() || '1'),
            estimatedPrice: columns[2]?.trim() || '',
          };
        })
        .filter((item): item is PurchaseItem => item !== null && item.description !== '');

      if (importedItems.length > 0) {
        setItems(importedItems);
        toast({
          title: t('toast.pasteSuccessful'),
          description: `${importedItems.length} items imported from clipboard.`,
        });
      } else {
        toast({
          title: t('toast.noDataFound'),
          description: t('toast.noDataFoundDescription'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('toast.pasteFailed'),
        description: t('toast.pasteFailedDescription'),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project) return;

    // Validate all items before submission
    if (!validateAllItems()) {
      toast({
        title: t('toast.validationError'),
        description: t('toast.pleaseFixErrors'),
        variant: "destructive",
      });
      return;
    }
    
    // Create purchase request
    const request = await createRequest.mutateAsync({
      project_id: formData.project,
      requested_by: formData.requestedBy,
      priority: formData.priority as "low" | "medium" | "high" | "urgent",
      delivery_date: formData.deliveryDate || undefined,
      notes: formData.notes || undefined,
      status: "pending",
    });
    
    // Create all items
    if (request) {
      for (const item of items) {
        await createItem.mutateAsync({
          request_id: request.id,
          description: item.description,
          quantity: item.quantity,
          estimated_price: item.estimatedPrice ? parseFloat(item.estimatedPrice) : undefined,
        });
      }
    }
    
    // reset delivery date to undefined for safety
    setFormData({ ...formData, deliveryDate: "" });
    navigate("/procurement");
  };

  return (
    <Sheet defaultOpen onOpenChange={(open) => { if (!open) navigate('/procurement'); }}>
      <SheetContent side="right">
        <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/procurement">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Procurement
          </Button>
        </Link>
      </div>

      <SidebarHeaderShell>
<div>
        <h1 className="text-3xl font-bold">{t("purchaseRequest.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("messages.createNewPurchaseRequest")}</p>
      </div>
</SidebarHeaderShell>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('purchaseRequest.requestInformation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-[1fr,auto]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="project">{t('purchaseRequest.projectLabel')} *</Label>
                      <Select
                        value={formData.project}
                        onValueChange={(value) => setFormData({ ...formData, project: value })}
                      >
                        <SelectTrigger id="project">
                          <SelectValue placeholder={t("selectOptions.selectProject")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Residential Villa - Silva Family</SelectItem>
                          <SelectItem value="2">Commercial Building Downtown</SelectItem>
                          <SelectItem value="3">Apartment Renovation - Unit 302</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="requestedBy">{t('purchaseRequest.requestedByLabel')} *</Label>
                      <Input
                        id="requestedBy"
                        placeholder={t("inputPlaceholders.enterName")}
                        value={formData.requestedBy}
                        onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="priority">{t('purchaseRequest.priorityLabel')} *</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger id="priority">
                            <SelectValue placeholder={t('procurement.priorityLabels.medium')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">{t('procurement.priorityLabels.low')}</SelectItem>
                            <SelectItem value="medium">{t('procurement.priorityLabels.medium')}</SelectItem>
                            <SelectItem value="high">{t('procurement.priorityLabels.high')}</SelectItem>
                            <SelectItem value="urgent">{t('procurement.priorityLabels.urgent')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deliveryDate">{t('purchaseRequest.deliveryDateLabel')} *</Label>
                      <DateInput
                        value={formData.deliveryDate}
                        onChange={(value) => setFormData({ ...formData, deliveryDate: value })}
                        placeholder={t('common.selectDate')}
                        className="h-10"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Compact Summary Card on the right */}
                <div className="hidden md:block md:min-w-[200px] border-l pl-6">
                  <SummaryCard 
                    totalItems={totals.itemCount}
                    totalValue={totals.grandTotal}
                    validationStatus={validationSummary.status}
                    errorCount={validationSummary.errorCount}
                    compact
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('purchaseRequest.items')}</CardTitle>
                <div className="flex gap-2">
                  {selectedItemIds.size > 0 && !bulkEditMode && (
                    <Button 
                      type="button" 
                      onClick={() => setBulkEditMode(true)} 
                      size="sm" 
                      variant="default"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Bulk Edit ({selectedItemIds.size})
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    onClick={handlePasteFromClipboard} 
                    size="sm" 
                    variant="outline"
                    title={t("tooltips.pasteFromExcel")}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Paste
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportFromFile}
                    className="hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <Button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    size="sm" 
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleExportToCSV} 
                    size="sm" 
                    variant="outline"
                    disabled={items.length === 0 || items.every(item => !item.description)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button type="button" onClick={addItem} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {bulkEditMode && (
                <div className="mb-4 p-4 border rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Bulk Edit {selectedItemIds.size} Item{selectedItemIds.size > 1 ? 's' : ''}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={cancelBulkEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Update Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder={t("inputPlaceholders.leaveEmpty")}
                        value={bulkEditData.quantity}
                        onChange={(e) => setBulkEditData({ ...bulkEditData, quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Update Unit Price (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={t("inputPlaceholders.leaveEmpty")}
                        value={bulkEditData.estimatedPrice}
                        onChange={(e) => setBulkEditData({ ...bulkEditData, estimatedPrice: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={handleBulkUpdate}
                        className="w-full"
                        disabled={!bulkEditData.quantity && !bulkEditData.estimatedPrice}
                      >
                        Apply Changes
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedItemIds.size === items.length && items.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead className="w-[40%]">Description *</TableHead>
                    <TableHead className="w-[120px] text-right">Quantity *</TableHead>
                    <TableHead className="w-[150px] text-right">Unit Price (R$)</TableHead>
                    <TableHead className="w-[150px] text-right">Total</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const itemTotal = (parseFloat(item.estimatedPrice) || 0) * (item.quantity || 0);
                    const isSelected = selectedItemIds.has(item.id);
                    return (
                      <TableRow key={item.id} className={isSelected ? "bg-primary/5" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              placeholder={t("inputPlaceholders.enterDescription")}
                              value={item.description}
                              onChange={(e) => updateItem(item.id, "description", e.target.value)}
                              onBlur={() => handleItemBlur(item.id, "description")}
                              required
                              className={`border-0 bg-transparent px-2 focus-visible:ring-1 ${
                                validationErrors[item.id]?.description 
                                  ? "ring-2 ring-destructive focus-visible:ring-destructive" 
                                  : ""
                              }`}
                            />
                            {validationErrors[item.id]?.description && (
                              <p className="text-xs text-destructive px-2">
                                {validationErrors[item.id].description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="1"
                              placeholder={t("inputPlaceholders.quantity")}
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                              onBlur={() => handleItemBlur(item.id, "quantity")}
                              required
                              className={`border-0 bg-transparent px-2 text-right focus-visible:ring-1 ${
                                validationErrors[item.id]?.quantity 
                                  ? "ring-2 ring-destructive focus-visible:ring-destructive" 
                                  : ""
                              }`}
                            />
                            {validationErrors[item.id]?.quantity && (
                              <p className="text-xs text-destructive px-2 text-right">
                                {validationErrors[item.id].quantity}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder={t("inputPlaceholders.amount")}
                              value={item.estimatedPrice}
                              onChange={(e) => updateItem(item.id, "estimatedPrice", e.target.value)}
                              onBlur={() => handleItemBlur(item.id, "estimatedPrice")}
                              className={`border-0 bg-transparent px-2 text-right focus-visible:ring-1 ${
                                validationErrors[item.id]?.estimatedPrice 
                                  ? "ring-2 ring-destructive focus-visible:ring-destructive" 
                                  : ""
                              }`}
                            />
                            {validationErrors[item.id]?.estimatedPrice && (
                              <p className="text-xs text-destructive px-2 text-right">
                                {validationErrors[item.id].estimatedPrice}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(itemTotal)}
                        </TableCell>
                        <TableCell>
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell></TableCell>
                    <TableCell colSpan={4} className="text-right font-semibold">
                      Total ({totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'})
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(totals.grandTotal)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('purchaseRequest.additionalNotes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">{t('purchaseRequest.notesLabel')}</Label>
                <Textarea
                  id="notes"
                  placeholder={t("inputPlaceholders.enterNotes")}
                  className="min-h-32"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link to="/procurement">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="">
              <Save className="mr-2 h-4 w-4" />
              Submit Request
            </Button>
          </div>
        </div>
      </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PurchaseRequest;

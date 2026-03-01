import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useProjectMaterials } from '@/hooks/useProjectMaterials';
import ExcelJS from '@protobi/exceljs';

import { useLocalization } from "@/contexts/LocalizationContext";
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const REQUIRED_HEADERS = ['name', 'sku', 'unit', 'unit_cost', 'qty', 'fee_desc'];

export const MaterialsImportDialog = ({ open, onOpenChange, projectId }: Props) => {
  const { createMaterial } = useProjectMaterials(projectId);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const handleFile = async (f: File | null) => {
    setFile(f);
    setErrors([]);
    setPreviewRows([]);
    if (!f) return;

    try {
      const data = await f.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      
      const sheet = workbook.worksheets[0];
      if (!sheet || !sheet.rowCount || sheet.rowCount === 0) {
        setErrors([{ row: 0, message: 'Empty sheet' }]);
        return;
      }

      // Get headers from first row
      const headerRow: any[] = [];
      sheet.getRow(1)?.eachCell((cell) => {
        headerRow.push(String(cell.value || '').trim());
      });

      const missing = REQUIRED_HEADERS.filter(h => !headerRow.includes(h));
      if (missing.length > 0) {
        setErrors([{ row: 0, message: `Missing headers: ${missing.join(', ')}` }]);
        return;
      }

      // Parse data rows
      const rows: any[] = [];
      sheet.eachRow((row, rowIndex) => {
        if (rowIndex === 1) return; // Skip header row
        
        const rowObj: Record<string, any> = {};
        row.eachCell((cell, colIndex) => {
          const header = headerRow[colIndex - 1];
          if (header) {
            rowObj[header] = cell.value;
          }
        });
        rows.push({ __rowIndex: rowIndex, ...rowObj });
      });

    // Validate rows
    const rowErrors: any[] = [];
    const validRows: any[] = [];

    rows.forEach((r: any) => {
      const rowErrs: string[] = [];
      if (!r.name || String(r.name).trim() === '') rowErrs.push('name is required');
      if (!r.unit || String(r.unit).trim() === '') rowErrs.push('unit is required');
      const qty = Number(r.qty);
      if (Number.isNaN(qty) || qty <= 0) rowErrs.push('qty must be a positive number');
      const unitCost = Number(r.unit_cost);
      if (Number.isNaN(unitCost) || unitCost < 0) rowErrs.push('unit_cost must be a number >= 0');

      if (rowErrs.length) rowErrors.push({ row: r.__rowIndex, errors: rowErrs });
      else validRows.push({
        description: String(r.name),
        sinapi_code: r.sku || null,
        unit: String(r.unit),
        price_per_unit: unitCost,
        quantity: qty,
        fee_desc: r.fee_desc || null,
        project_id: projectId,
        group_name: 'Materials',
      });
    });

      setErrors(rowErrors);
      setPreviewRows(validRows.slice(0, 50));
    } catch (error) {
      setErrors([{ row: 0, message: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}` }]);
    }
  };

  const handleImport = async () => {
    setErrors([]);
    if (!file) return;
    // Re-parse to get valid rows
    const data = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);
    
    const sheet = workbook.worksheets[0];
    if (!sheet || !sheet.rowCount || sheet.rowCount === 0) {
      setErrors([{ row: 0, message: 'Empty sheet' }]);
      return;
    }

    // Get headers from first row
    const headerRow: any[] = [];
    sheet.getRow(1)?.eachCell((cell) => {
      headerRow.push(String(cell.value || '').trim());
    });

    const rows: any[] = [];
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header row
      
      const rowObj: Record<string, any> = {};
      row.eachCell((cell, colIndex) => {
        const header = headerRow[colIndex - 1];
        if (header) {
          rowObj[header] = cell.value;
        }
      });
      rows.push(rowObj);
    });

    const validRows: any[] = [];
    const rowErrors: any[] = [];
    rows.forEach((r, idx) => {
      const rowNum = idx + 2;
      const rowErrs: string[] = [];
      if (!r.name || String(r.name).trim() === '') rowErrs.push('name is required');
      if (!r.unit || String(r.unit).trim() === '') rowErrs.push('unit is required');
      const qty = Number(r.qty);
      if (Number.isNaN(qty) || qty <= 0) rowErrs.push('qty must be a positive number');
      const unitCost = Number(r.unit_cost);
      if (Number.isNaN(unitCost) || unitCost < 0) rowErrs.push('unit_cost must be a number >= 0');

      if (rowErrs.length) rowErrors.push({ row: rowNum, errors: rowErrs });
      else validRows.push({
        description: String(r.name),
        sinapi_code: r.sku || null,
        unit: String(r.unit),
        price_per_unit: unitCost,
        quantity: qty,
        fee_desc: r.fee_desc || null,
        project_id: projectId,
        group_name: 'Materials',
      });
    });

    setErrors(rowErrors);

    // Upsert valid rows sequentially to provide feedback via toast in hook
    for (const vr of validRows) {
      try {
        await createMaterial.mutateAsync(vr as any);
      } catch (err) {
        rowErrors.push({ row: 'upsert', errors: [String((err as Error).message || err)] });
      }
    }

    if (rowErrors.length === 0) {
      onOpenChange(false);
    } else {
      setErrors(rowErrors);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Materials from Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">The expected sheet format (first row = headers):</p>
          <div className="font-mono text-sm bg-muted/10 p-3 rounded">
            {REQUIRED_HEADERS.join(', ')}
          </div>

          <div>
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
          </div>

          {errors.length > 0 && (
            <div className="text-sm text-destructive">
              <h4 className="font-semibold">Errors</h4>
              <ul className="list-disc pl-6">
                {errors.map((err, i) => (
                  <li key={i}>{typeof err === 'string' ? err : `Row ${err.row}: ${Array.isArray(err.errors) ? err.errors.join('; ') : err.message}`}</li>
                ))}
              </ul>
            </div>
          )}

          {previewRows.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Preview (first {previewRows.length} valid rows)</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Fee Desc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>{r.sinapi_code}</TableCell>
                      <TableCell>{r.unit}</TableCell>
                      <TableCell>{r.price_per_unit}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>{r.fee_desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("buttons.cancelButton")}</Button>
            <Button onClick={handleImport} disabled={!file}>{t("buttons.import")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialsImportDialog;

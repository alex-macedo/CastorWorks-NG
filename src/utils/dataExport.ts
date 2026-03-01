import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import ExcelJS from '@protobi/exceljs';

export const exportAllData = async (): Promise<void> => {
  const tables = [
    'projects',
    'clients',
    'project_materials',
    'project_financial_entries',
    'project_activities',
    'project_budget_items',
    'project_phases',
    'suppliers',
    'daily_logs',
    'activity_logs',
    'project_team_members',
    'project_purchase_requests',
    'purchase_request_items',
    'quotes',
    'generated_reports',
    'company_settings',
    'app_settings',
    'user_preferences',
    'activity_templates',
    'document_templates',
  ];
  
  const exportData: Record<string, any[]> = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table as any)
        .select('*');
      
      if (!error && data) {
        exportData[table] = data;
      }
    } catch (error) {
      console.error(`Error exporting ${table}:`, error);
    }
  }
  
  // Add metadata
  const backup = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    tables: exportData,
  };
  
  // Download as JSON
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  // Update last backup date
  const { data: settings } = await supabase
    .from('app_settings')
    .select('id')
    .limit(1)
    .single();
  
  if (settings) {
    await supabase
      .from('app_settings')
      .update({ last_backup_date: new Date().toISOString() })
      .eq('id', settings.id);
  }
};

export const importData = async (file: File, mode: 'overwrite' | 'merge'): Promise<void> => {
  const text = await file.text();
  const backup = JSON.parse(text);
  
  // Validate structure
  if (!backup.version || !backup.tables) {
    throw new Error('Invalid backup file format');
  }
  
  // Import data
  for (const [tableName, rows] of Object.entries(backup.tables)) {
    if (Array.isArray(rows) && rows.length > 0) {
      try {
        if (mode === 'overwrite') {
          // Delete existing data first
          await supabase
            .from(tableName as any)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        }
        
        // Insert data
        const { error } = await supabase
          .from(tableName as any)
          .insert(rows);
        
        if (error) {
          console.error(`Error importing ${tableName}:`, error);
        }
      } catch (error) {
        console.error(`Error processing ${tableName}:`, error);
      }
    }
  }
};

export const calculateDatabaseSize = async (): Promise<{
  totalProjects: number;
  totalExpenses: number;
  totalMaterials: number;
  estimatedSize: string;
}> => {
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
  
  const { count: expenseCount } = await supabase
    .from('project_financial_entries')
    .select('*', { count: 'exact', head: true });
  
  const { count: materialCount } = await supabase
    .from('project_materials')
    .select('*', { count: 'exact', head: true });
  
  // Rough estimate: 1KB per row average
  const totalRows = (projectCount || 0) + (expenseCount || 0) + (materialCount || 0);
  const sizeKB = totalRows * 1;
  
  let estimatedSize: string;
  if (sizeKB < 1024) {
    estimatedSize = `${sizeKB} KB`;
  } else if (sizeKB < 1024 * 1024) {
    estimatedSize = `${(sizeKB / 1024).toFixed(2)} MB`;
  } else {
    estimatedSize = `${(sizeKB / (1024 * 1024)).toFixed(2)} GB`;
  }
  
  return {
    totalProjects: projectCount || 0,
    totalExpenses: expenseCount || 0,
    totalMaterials: materialCount || 0,
    estimatedSize,
  };
};

// Export specific tables with format options
export const exportTables = async (
  tableNames: string[],
  exportFormat: 'json' | 'csv' | 'excel' = 'json',
  onProgress?: (progress: number) => void
): Promise<void> => {
  const exportData: Record<string, any[]> = {};
  const total = tableNames.length;
  
  for (let i = 0; i < tableNames.length; i++) {
    const table = tableNames[i];
    try {
      const { data, error } = await supabase
        .from(table as any)
        .select('*');
      
      if (!error && data) {
        exportData[table] = data;
      }
      
      if (onProgress) {
        onProgress(((i + 1) / total) * 100);
      }
    } catch (error) {
      console.error(`Error exporting ${table}:`, error);
    }
  }
  
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
  
  if (exportFormat === 'json') {
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      tables: exportData,
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    downloadFile(blob, `export-${timestamp}.json`);
  } else if (exportFormat === 'csv') {
    // Export each table as a separate CSV file in a zip
    for (const [tableName, rows] of Object.entries(exportData)) {
      if (rows.length > 0) {
        const csv = convertToCSV(rows);
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadFile(blob, `${tableName}-${timestamp}.csv`);
      }
    }
  } else if (exportFormat === 'excel') {
    const workbook = new ExcelJS.Workbook();
    
    for (const [tableName, rows] of Object.entries(exportData)) {
      if (rows.length > 0) {
        const worksheet = workbook.addWorksheet(tableName.substring(0, 31));
        
        // Add headers
        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);
          worksheet.columns = headers.map(header => ({ 
            header, 
            key: header, 
            width: 15 
          }));
          
          // Add data rows
          worksheet.addRows(rows);
        }
      }
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadFile(blob, `export-${timestamp}.xlsx`);
  }
};

type CsvColumn = {
  key: string;
  label: string;
};

// Helper to convert JSON to CSV
const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => formatCsvValue(row[header])).join(',')
    )
  ];
  
  return csvRows.join('\n');
};

const formatCsvValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const exportRowsToCsv = (
  rows: Record<string, any>[],
  columns: CsvColumn[],
  filename: string
) => {
  if (rows.length === 0) return;

  const headerLabels = columns.map(column => column.label).join(',');
  const headerKeys = columns.map(column => column.key);
  const csvRows = rows.map(row =>
    headerKeys.map(key => formatCsvValue(row[key])).join(',')
  );

  const csv = [headerLabels, ...csvRows].join('\n');
  const csvWithBom = `\uFEFF${csv}`;
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, filename);
};

// Helper to download file
const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Get all available tables for export
export const getAvailableTables = () => [
  { name: 'projects', label: 'Projects', category: 'Core' },
  { name: 'clients', label: 'Clients', category: 'Core' },
  { name: 'project_phases', label: 'Project Phases', category: 'Core' },
  { name: 'project_team_members', label: 'Team Members', category: 'Core' },
  { name: 'contacts', label: 'Contacts', category: 'Core' },
  { name: 'project_financial_entries', label: 'Financial Entries', category: 'Financial' },
  { name: 'project_budget_items', label: 'Budget Items', category: 'Financial' },
  { name: 'payment_transactions', label: 'Payment Transactions', category: 'Financial' },
  { name: 'time_logs', label: 'Time Logs', category: 'Financial' },
  { name: 'project_purchase_requests', label: 'Purchase Requests', category: 'Procurement' },
  { name: 'purchase_request_items', label: 'Purchase Request Items', category: 'Procurement' },
  { name: 'quotes', label: 'Quotes', category: 'Procurement' },
  { name: 'suppliers', label: 'Suppliers', category: 'Procurement' },
  { name: 'purchase_orders', label: 'Purchase Orders', category: 'Procurement' },
  { name: 'quote_requests', label: 'Quote Requests', category: 'Procurement' },
  { name: 'daily_logs', label: 'Daily Logs', category: 'Logs' },
  { name: 'activity_logs', label: 'Activity Logs', category: 'Logs' },
  { name: 'site_activity_logs', label: 'Site Activity Logs', category: 'Logs' },
  { name: 'project_activities', label: 'Activities', category: 'Schedule' },
  { name: 'quality_inspections', label: 'Quality Inspections', category: 'Schedule' },
  { name: 'delivery_confirmations', label: 'Delivery Confirmations', category: 'Schedule' },
  { name: 'roadmap_items', label: 'Roadmap Items', category: 'Roadmap' },
  { name: 'roadmap_item_upvotes', label: 'Roadmap Upvotes', category: 'Roadmap' },
  { name: 'roadmap_item_comments', label: 'Roadmap Comments', category: 'Roadmap' },
  { name: 'roadmap_item_attachments', label: 'Roadmap Attachments', category: 'Roadmap' },
  { name: 'roadmap_suggestions', label: 'Roadmap Suggestions', category: 'Roadmap' },
  { name: 'generated_reports', label: 'Generated Reports', category: 'Reports' },
  { name: 'document_templates', label: 'Document Templates', category: 'Documents' },
  { name: 'activity_templates', label: 'Activity Templates', category: 'Documents' },
  { name: 'company_settings', label: 'Company Settings', category: 'Settings' },
  { name: 'app_settings', label: 'App Settings', category: 'Settings' },
  { name: 'user_preferences', label: 'User Preferences', category: 'Settings' },
  { name: 'outbound_campaigns', label: 'Outbound Campaigns', category: 'Marketing' },
  { name: 'campaign_recipients', label: 'Campaign Recipients', category: 'Marketing' },
  { name: 'ai_chat_messages', label: 'AI Chat Messages', category: 'AI' },
  { name: 'ai_configurations', label: 'AI Configurations', category: 'AI' },
];

// Create automatic backup before major operations
export const createAutoBackup = async (operationName: string): Promise<string | null> => {
  try {
    const tables = getAvailableTables().map(t => t.name);
    const exportData: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table as any)
          .select('*');

        if (!error && data) {
          exportData[table] = data;
        }
      } catch (error) {
        console.error(`Error backing up ${table}:`, error);
      }
    }

    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      operationName,
      tables: exportData,
    };

    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
    const filename = `auto-backup-${operationName}-${timestamp}.json`;

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    downloadFile(blob, filename);

    return filename;
  } catch (error) {
    console.error('Auto backup failed:', error);
    return null;
  }
};

// Parse CSV string to array of objects
export const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = parseCSVLine(lines[0]).map((header, index) => {
    if (index === 0) {
      return header.replace(/^\uFEFF/, '');
    }
    return header;
  });
  const records: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1} has ${values.length} columns but expected ${headers.length}`);
    }

    const record: Record<string, any> = {};
    headers.forEach((header, index) => {
      const value = values[index];
      // Try to parse JSON for complex types
      if (value && value.startsWith('{') || value.startsWith('[')) {
        try {
          record[header] = JSON.parse(value);
        } catch {
          record[header] = value || null;
        }
      } else if (value === '' || value === 'null') {
        record[header] = null;
      } else if (value === 'true') {
        record[header] = true;
      } else if (value === 'false') {
        record[header] = false;
      } else if (!isNaN(Number(value)) && value !== '') {
        record[header] = Number(value);
      } else {
        record[header] = value;
      }
    });

    records.push(record);
  }

  return records;
};

// Parse a single CSV line handling quoted values
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

// Import CSV data into a specific table
export const importCSVToTable = async (
  file: File,
  tableName: string,
  mode: 'append' | 'replace' = 'append'
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const text = await file.text();
  const records = parseCSV(text);

  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  // If replace mode, delete existing data
  if (mode === 'replace') {
    const { error: deleteError } = await supabase
      .from(tableName as any)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      throw new Error(`Failed to clear table: ${deleteError.message}`);
    }
  }

  // Insert records in batches of 100
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { error } = await supabase.from(tableName as any).insert(batch);

    if (error) {
      failedCount += batch.length;
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
    } else {
      successCount += batch.length;
    }
  }

  return { success: successCount, failed: failedCount, errors };
};

// Get table column information from schema
export const getTableSchema = async (tableName: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .limit(0);

    if (error) {
      throw error;
    }

    // Get columns from the query result
    if (data && data.length === 0) {
      // Try to get one row to infer columns
      const { data: sampleData } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(1);

      if (sampleData && sampleData.length > 0) {
        return Object.keys(sampleData[0]);
      }
    }

    return [];
  } catch (error) {
    console.error(`Failed to get schema for ${tableName}:`, error);
    return [];
  }
};

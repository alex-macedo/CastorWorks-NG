import React from 'react';
import { Card } from '@/components/ui/card';
import { useLocalization } from '@/contexts/LocalizationContext';
import { cn } from '@/lib/utils';

interface TableCell {
  value: string;
  type?: 'text' | 'currency' | 'percentage' | 'number';
  align?: 'left' | 'center' | 'right';
}

interface TableRow {
  cells: TableCell[];
  isHeader?: boolean;
  isTotal?: boolean;
}

interface AIInsightsTableProps {
  rows: TableRow[];
  className?: string;
}

/**
 * Beautiful table component for AI insights
 * Replaces plain markdown tables with modern, responsive design
 */
export const AIInsightsTable: React.FC<AIInsightsTableProps> = ({ rows, className }) => {
  const { currency } = useLocalization();

  if (!rows || rows.length === 0) return null;

  const formatValue = (cell: TableCell): string => {
    const { value, type } = cell;

    switch (type) {
      case 'currency':
        {
          // Remove currency symbols and format
          const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
          if (isNaN(numValue)) return value;
          return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(numValue);
        }

      case 'percentage':
        return value;

      case 'number':
        {
          const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
          if (isNaN(num)) return value;
          return new Intl.NumberFormat().format(num);
        }

      default:
        return value;
    }
  };

  const getCellColor = (cell: TableCell, isHeader: boolean): string => {
    if (isHeader) return 'text-foreground font-semibold';

    switch (cell.type) {
      case 'currency':
        return 'text-foreground font-medium';
      case 'percentage':
        return 'text-primary font-medium';
      case 'number':
        return 'text-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const headerRow = rows.find(row => row.isHeader);
  const dataRows = rows.filter(row => !row.isHeader);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <table className="w-full">
            {headerRow && (
              <thead className="bg-muted/50 border-b">
                <tr>
                  {headerRow.cells.map((cell, idx) => (
                    <th
                      key={idx}
                      className={cn(
                        'px-4 py-3 text-sm font-semibold',
                        cell.align === 'right' ? 'text-right' :
                        cell.align === 'center' ? 'text-center' :
                        'text-left'
                      )}
                    >
                      {cell.value}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {dataRows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={cn(
                    'border-b last:border-b-0 transition-colors hover:bg-muted/30',
                    row.isTotal && 'bg-muted/50 font-semibold'
                  )}
                >
                  {row.cells.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className={cn(
                        'px-4 py-3 text-sm',
                        getCellColor(cell, false),
                        cell.align === 'right' ? 'text-right' :
                        cell.align === 'center' ? 'text-center' :
                        'text-left'
                      )}
                    >
                      {formatValue(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-4">
          {dataRows.map((row, rowIdx) => (
            <Card
              key={rowIdx}
              className={cn(
                'p-4 space-y-2',
                row.isTotal && 'bg-primary/5 border-primary/20'
              )}
            >
              {row.cells.map((cell, cellIdx) => {
                const headerCell = headerRow?.cells[cellIdx];
                return (
                  <div key={cellIdx} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {headerCell?.value || `Column ${cellIdx + 1}`}
                    </span>
                    <span className={cn('text-sm', getCellColor(cell, false))}>
                      {formatValue(cell)}
                    </span>
                  </div>
                );
              })}
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
};

/**
 * Parse markdown table into TableRow structure
 */
export const parseMarkdownTable = (markdown: string): TableRow[] | null => {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return null;

  const rows: TableRow[] = [];

  // Parse header
  const headerCells = lines[0]
    .split('|')
    .map(cell => cell.trim())
    .filter(cell => cell.length > 0);

  if (headerCells.length === 0) return null;

  // Detect alignment from separator row
  const separatorLine = lines[1];
  const alignments = separatorLine
    .split('|')
    .map(cell => cell.trim())
    .filter(cell => cell.length > 0)
    .map(cell => {
      if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
      if (cell.endsWith(':')) return 'right';
      return 'left';
    });

  rows.push({
    cells: headerCells.map((value, idx) => ({
      value,
      align: alignments[idx] as 'left' | 'center' | 'right',
    })),
    isHeader: true,
  });

  // Parse data rows
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);

    if (cells.length === 0) continue;

    const isTotal = cells[0].toLowerCase().includes('total');

    rows.push({
      cells: cells.map((value, idx) => {
        // Detect cell type
        let type: TableCell['type'] = 'text';
        if (value.includes('%')) type = 'percentage';
        else if (value.match(/[$€£¥R$BRL]/i)) type = 'currency';
        else if (value.match(/^[\d,.-]+$/)) type = 'number';

        return {
          value,
          type,
          align: alignments[idx] as 'left' | 'center' | 'right',
        };
      }),
      isTotal,
    });
  }

  return rows;
};

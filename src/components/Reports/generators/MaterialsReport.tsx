import { ProfessionalPDF } from '@/utils/pdfGenerator';
import { formatCurrency, groupMaterialsByCategory } from '@/utils/reportFormatters';
import type { ReportConfig } from '../ReportConfigDialog';
import type { Database } from '@/integrations/supabase/types';
// import { getConstructionUnitSymbol } from '@/constants/constructionUnits';

type Project = Database['public']['Tables']['projects']['Row'];
type Material = Database['public']['Tables']['project_materials']['Row'];
type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export async function generateMaterialsReport(
  project: Project,
  materials: Material[],
  companySettings: CompanySettings | null,
  config: ReportConfig
) {
  const pdf = new ProfessionalPDF();
  // const unitSymbol = getConstructionUnitSymbol(project.construction_unit);
  const unitSymbol = 'm²'; // Default to square meters
  
  pdf.addHeader(companySettings, 'MATERIALS REPORT');
  
  // Project Information
  pdf.addSectionTitle('Project Information');
  pdf.addKeyValue('Project Name', project.name);
  pdf.addKeyValue('Total Area', `${project.total_area || 0} ${unitSymbol}`);
  pdf.addKeyValue('Location', project.location || 'N/A');
  pdf.addDivider();
  
  // Materials by Category
  const groupedMaterials = groupMaterialsByCategory(materials);
  
  Object.entries(groupedMaterials).forEach(([category, categoryMaterials]) => {
    pdf.addSubtitle(category);
    
    const rows = categoryMaterials.map(material => [
      material.sinapi_code || 'N/A',
      material.description,
      material.quantity.toString(),
      material.unit,
      formatCurrency(Number(material.price_per_unit)),
      formatCurrency(Number(material.total || 0))
    ]);
    
    pdf.addTable(
      ['Code', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total'],
      rows
    );
  });
  
  // Summary
  const totalMaterials = materials.reduce((sum, m) => sum + Number(m.total || 0), 0);
  const totalLabor = Number(project.labor_cost || 0);
  const totalTaxes = Number(project.taxes_and_fees || 0);
  const grandTotal = totalMaterials + totalLabor + totalTaxes;
  const costPerUnit = project.total_area ? grandTotal / Number(project.total_area) : 0;
  
  pdf.addSectionTitle('Cost Summary');
  pdf.addSummaryBox([
    { label: 'Total Materials', value: formatCurrency(totalMaterials) },
    { label: 'Total Labor', value: formatCurrency(totalLabor) },
    { label: 'Taxes & Fees', value: formatCurrency(totalTaxes) },
    { label: 'Grand Total', value: formatCurrency(grandTotal), highlight: true },
    { label: `Cost per ${unitSymbol}`, value: formatCurrency(costPerUnit), highlight: true }
  ]);
  
  pdf.save(`Materials_Report_${project.name}_${new Date().toISOString().split('T')[0]}.pdf`);
}

import { ProfessionalPDF } from '@/utils/pdfGenerator';
import { formatCurrency, formatDate, groupMaterialsByCategory } from '@/utils/reportFormatters';
import type { ReportConfig } from '../ReportConfigDialog';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type Material = Database['public']['Tables']['project_materials']['Row'];
type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export async function generateMaterialsUsageReport(
  project: Project,
  materials: Material[],
  companySettings: CompanySettings | null,
  config: ReportConfig
) {
  const pdf = new ProfessionalPDF();
  
  // Header
  pdf.addHeader(companySettings, 'MATERIALS USAGE REPORT');
  
  // Project Information
  pdf.addSectionTitle('Project Information');
  pdf.addKeyValue('Project Name', project.name);
  pdf.addKeyValue('Total Area', project.total_area ? `${project.total_area} m²` : 'N/A');
  pdf.addKeyValue('Location', project.location || 'N/A');
  pdf.addKeyValue('Report Date', formatDate(new Date()));
  pdf.addDivider();
  
  // Materials Summary
  pdf.addSectionTitle('Materials Summary');
  const totalMaterials = materials.length;
  const totalCost = materials.reduce((sum, material) => sum + Number(material.total || 0), 0);
  const avgCostPerMaterial = totalMaterials > 0 ? totalCost / totalMaterials : 0;
  const costPerSqm = project.total_area && project.total_area > 0 ? totalCost / project.total_area : 0;
  
  pdf.addKeyValue('Total Material Items', totalMaterials.toString());
  pdf.addKeyValue('Total Material Cost', formatCurrency(totalCost));
  pdf.addKeyValue('Average Cost per Item', formatCurrency(avgCostPerMaterial));
  if (project.total_area && project.total_area > 0) {
    pdf.addKeyValue('Cost per m²', formatCurrency(costPerSqm));
  }
  pdf.addDivider();
  
  // Materials by Category
  const groupedMaterials = groupMaterialsByCategory(materials);
  
  pdf.addSectionTitle('Materials by Category');
  const categoryRows = Object.entries(groupedMaterials).map(([category, categoryMaterials]) => {
    const categoryTotal = categoryMaterials.reduce((sum, material) => sum + Number(material.total || 0), 0);
    const categoryPercentage = totalCost > 0 ? ((categoryTotal / totalCost) * 100) : 0;
    
    return [
      category,
      categoryMaterials.length.toString(),
      formatCurrency(categoryTotal),
      `${categoryPercentage.toFixed(1)}%`
    ];
  });
  
  pdf.addTable(
    ['Category', 'Items Count', 'Total Cost', 'Percentage'],
    categoryRows
  );
  
  // Top 10 Most Expensive Materials
  const topMaterials = materials
    .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
    .slice(0, 10);
  
  if (topMaterials.length > 0) {
    pdf.addSectionTitle('Top 10 Most Expensive Materials');
    const topMaterialRows = topMaterials.map(material => [
      material.sinapi_code || 'N/A',
      material.description,
      material.quantity.toString(),
      material.unit,
      formatCurrency(Number(material.price_per_unit)),
      formatCurrency(Number(material.total || 0))
    ]);
    
    pdf.addTable(
      ['SINAPI Code', 'Description', 'Quantity', 'Unit', 'Unit Price', 'Total'],
      topMaterialRows
    );
  }
  
  // Material Efficiency Analysis
  pdf.addSectionTitle('Material Efficiency Analysis');
  const materialsWithHighUnitCost = materials
    .filter(m => Number(m.price_per_unit) > avgCostPerMaterial)
    .length;
  
  const efficiencyPercentage = totalMaterials > 0 ? ((totalMaterials - materialsWithHighUnitCost) / totalMaterials * 100) : 0;
  
  pdf.addKeyValue('Materials Above Average Cost', materialsWithHighUnitCost.toString());
  pdf.addKeyValue('Cost Efficiency Rate', `${efficiencyPercentage.toFixed(1)}%`);
  
  // Usage by Unit Type
  pdf.addSectionTitle('Usage by Unit Type');
  const unitUsage = materials.reduce((acc, material) => {
    acc[material.unit] = (acc[material.unit] || 0) + material.quantity;
    return acc;
  }, {} as Record<string, number>);
  
  const unitRows = Object.entries(unitUsage).map(([unit, quantity]) => [
    unit,
    quantity.toString(),
    materials.filter(m => m.unit === unit).length.toString()
  ]);
  
  if (unitRows.length > 0) {
    pdf.addTable(
      ['Unit Type', 'Total Quantity', 'Items Count'],
      unitRows
    );
  }
  
  // Detailed Materials List by Category
  Object.entries(groupedMaterials).forEach(([category, categoryMaterials]) => {
    if (categoryMaterials.length > 0) {
      pdf.addSectionTitle(`${category} - Detailed List`);
      
      const detailRows = categoryMaterials.map(material => [
        material.sinapi_code || 'N/A',
        material.description,
        material.quantity.toString(),
        material.unit,
        formatCurrency(Number(material.price_per_unit)),
        formatCurrency(Number(material.total || 0))
      ]);
      
      pdf.addTable(
        ['Code', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total'],
        detailRows
      );
    }
  });
  
  // Material Recommendations
  pdf.addSectionTitle('Recommendations');
  const recommendations = [];
  
  if (materialsWithHighUnitCost > totalMaterials * 0.3) {
    recommendations.push('• Consider bulk purchasing for materials with high unit costs.');
  }
  
  if (totalCost > project.budget_total * 0.4) {
    recommendations.push('• Material costs exceed 40% of budget. Review specifications.');
  }
  
  const uniqueSuppliers = new Set(materials.map(m => m.group_name).filter(Boolean)).size;
  if (uniqueSuppliers < 3) {
    recommendations.push('• Consider diversifying suppliers for better pricing.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('• Material usage appears optimized within project parameters.');
  }
  
  recommendations.forEach(rec => {
    pdf.addParagraph(rec);
  });
  
  // Save and open the PDF
  pdf.save(`materials-usage-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}
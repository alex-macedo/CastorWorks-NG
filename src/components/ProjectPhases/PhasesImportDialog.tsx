import { useState, useEffect } from "react";
import ExcelJS from "@protobi/exceljs";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { useLocalization } from "@/contexts/LocalizationContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortablePhaseItem } from "./SortablePhaseItem";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, AlertCircle, CheckCircle2, AlertTriangle, ChevronDown, Download, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface PhasesImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectBudget: number;
}

interface ParsedPhase {
  id: string; // Add unique ID for drag-and-drop
  phaseName: string;
  activities: ParsedActivity[];
  budgetPercentage: number;
  rawBudgetPercentage?: string; // Store raw value for debugging
}

interface ParsedActivity {
  name: string;
  budgetPercentage: number;
  rawBudgetPercentage?: string; // Store raw value for debugging
}

interface DuplicateWarning {
  phaseName: string;
  type: 'internal' | 'existing';
  count?: number;
}

interface ParsedRowDebug {
  rowIndex: number;
  col0: string;
  col1: string;
  col2: string;
  parsedPercentage: number;
  phaseNameResolved: string;
  included: boolean;
  reason?: string;
}

interface ImportConfiguration {
  id: string;
  name: string;
  skipTotalRows: boolean;
  autoAdjustPercentages: boolean;
  createdAt: string;
}

const phaseNameSchema = z.string()
  .trim()
  .min(1, "Phase name cannot be empty")
  .max(200, "Phase name must be less than 200 characters");

export function PhasesImportDialog({
  open,
  onOpenChange,
  projectId,
  projectBudget,
}: PhasesImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedPhase[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<DuplicateWarning[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoAdjustPercentages, setAutoAdjustPercentages] = useState(true);
  const [totalBudgetPercentage, setTotalBudgetPercentage] = useState(0);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [existingActivitiesCount, setExistingActivitiesCount] = useState(0);
  const [rowDebug, setRowDebug] = useState<ParsedRowDebug[]>([]);
  const [skipTotalRows, setSkipTotalRows] = useState(true);
  const [savedConfigurations, setSavedConfigurations] = useState<ImportConfiguration[]>([]);
  const [showSaveConfig, setShowSaveConfig] = useState(false);
  const [configName, setConfigName] = useState("");

  const { phases, createPhase } = useProjectPhases(projectId);
  const { activities, createActivity, deleteActivity } = useProjectActivities(projectId);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load saved configurations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('phaseImportConfigurations');
    if (stored) {
      try {
        setSavedConfigurations(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load configurations:', error);
      }
    }
  }, []);

  // Reset form state when dialog opens and count existing activities
  useEffect(() => {
    if (open) {
      setFile(null);
      setParsedData([]);
      setErrors([]);
      setWarnings([]);
      setTotalBudgetPercentage(0);
      setExistingActivitiesCount(activities?.length || 0);
      setImportMode(activities && activities.length > 0 ? 'replace' : 'append');
      setRowDebug([]);
    }
  }, [open, activities]);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    
    setFile(f);
    setErrors([]);
    setWarnings([]);
    setParsedData([]);

    try {
      const data = await f.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        setErrors(["No worksheets found in the Excel file."]);
        toast.error("Failed to parse spreadsheet");
        return;
      }

      // Convert worksheet to 2D array format
      const jsonData: any[][] = [];
      worksheet.eachRow((row, rowNumber) => {
        const values = row.values;
        if (Array.isArray(values)) {
          jsonData.push(values.slice(1)); // Skip first element (undefined)
        }
      });

      const parsedPhases: ParsedPhase[] = [];
      const validationErrors: string[] = [];
      const debugRows: ParsedRowDebug[] = [];

      // Dynamically detect header row by looking for keywords (multi-language)
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(20, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row) continue;
        const rowStr = row.join('|').toLowerCase();
        if (
          rowStr.includes('phase') || rowStr.includes('etapa') || rowStr.includes('fase') ||
          rowStr.includes('activity') || rowStr.includes('atividade') || rowStr.includes('actividad') || rowStr.includes('activité') ||
          rowStr.includes('percentage') || rowStr.includes('porcentagem') || rowStr.includes('percentagem') || rowStr.includes('porcentaje') || rowStr.includes('pourcentage')
        ) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        // No header found, assume data starts from row 0
        headerRowIndex = -1;
      }

      // Parse data starting after header row
      const phaseMap = new Map<string, ParsedPhase>();
      let lastPhaseName = "";

      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) {
          debugRows.push({ rowIndex: i + 1, col0: '', col1: '', col2: '', parsedPercentage: 0, phaseNameResolved: lastPhaseName, included: false, reason: 'empty' });
          continue;
        }

        const col0 = row[0]?.toString().trim() || "";
        const col1 = row[1]?.toString().trim() || "";
        const col2 = row[2]?.toString().trim() || "";

        // Skip completely empty rows
        if (!col0 && !col1 && !col2) {
          debugRows.push({ rowIndex: i + 1, col0, col1, col2, parsedPercentage: 0, phaseNameResolved: lastPhaseName, included: false, reason: 'empty' });
          continue;
        }
        // Conditionally skip obvious total rows in column A
        if (skipTotalRows && (col0.toLowerCase().startsWith('total') || col0.toLowerCase().includes('valor total'))) {
          debugRows.push({ rowIndex: i + 1, col0, col1, col2, parsedPercentage: 0, phaseNameResolved: lastPhaseName, included: false, reason: 'total-row' });
          continue;
        }

        // Determine phase name
        const phaseName = col0 || lastPhaseName;
        if (!phaseName) {
          debugRows.push({ rowIndex: i + 1, col0, col1, col2, parsedPercentage: 0, phaseNameResolved: lastPhaseName, included: false, reason: 'no-phase-name' });
          continue;
        }
        lastPhaseName = phaseName;

        // Parse percentage and store raw value
        const rawPercentage = col2?.toString() || "";
        const percentage = parsePercentage(col2);

        // Get or create phase
        if (!phaseMap.has(phaseName)) {
          phaseMap.set(phaseName, {
            id: `phase-${phaseMap.size}-${Date.now()}`,
            phaseName: phaseName,
            activities: [],
            budgetPercentage: 0,
            rawBudgetPercentage: "",
          });
        }

        const phase = phaseMap.get(phaseName)!;

        // If col1 exists, it's an activity
        if (col1) {
          phase.activities.push({
            name: col1,
            budgetPercentage: percentage,
            rawBudgetPercentage: rawPercentage,
          });
          phase.budgetPercentage += percentage;
          debugRows.push({ rowIndex: i + 1, col0, col1, col2, parsedPercentage: percentage, phaseNameResolved: phaseName, included: true });
        } else if (col0 && percentage > 0) {
          // Phase-only row with a percentage
          phase.budgetPercentage += percentage;
          if (!phase.rawBudgetPercentage) phase.rawBudgetPercentage = rawPercentage;
          debugRows.push({ rowIndex: i + 1, col0, col1, col2, parsedPercentage: percentage, phaseNameResolved: phaseName, included: true });
        } else {
          debugRows.push({ rowIndex: i + 1, col0, col1, col2, parsedPercentage: percentage, phaseNameResolved: phaseName, included: false, reason: 'no-activity-no-percentage' });
        }
      }

      // Convert map to array
      parsedPhases.push(...Array.from(phaseMap.values()));
      setRowDebug(debugRows);

      console.log('📊 Import Debug Info:', {
        totalRows: jsonData.length,
        headerRowIndex,
        rowsProcessed: debugRows.length,
        rowsIncluded: debugRows.filter(r => r.included).length,
        rowsSkipped: debugRows.filter(r => !r.included).length,
        phasesFound: parsedPhases.length,
        activitiesFound: parsedPhases.reduce((sum, p) => sum + p.activities.length, 0),
        skipTotalRowsSetting: skipTotalRows,
      });

      if (parsedPhases.length === 0) {
        validationErrors.push("No phases found in the spreadsheet");
        
        // Add detailed diagnostic message
        const diagnosticInfo = [
          `Total rows in file: ${jsonData.length}`,
          `Header detected at row: ${headerRowIndex >= 0 ? headerRowIndex + 1 : 'Not found'}`,
          `Rows processed: ${debugRows.length}`,
          `Rows included: ${debugRows.filter(r => r.included).length}`,
          `Rows skipped: ${debugRows.filter(r => !r.included).length}`,
        ];
        
        const skipReasons = debugRows
          .filter(r => !r.included)
          .reduce((acc, r) => {
            const reason = r.reason || 'unknown';
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        
        if (Object.keys(skipReasons).length > 0) {
          diagnosticInfo.push('Skip reasons: ' + Object.entries(skipReasons).map(([k, v]) => `${k}(${v})`).join(', '));
        }
        
        console.error('❌ No phases found. Diagnostic:', diagnosticInfo.join(' | '));
        validationErrors.push('Diagnostic: ' + diagnosticInfo.join(' • '));
      }

      // Validate phase names
      for (const phase of parsedPhases) {
        try {
          phaseNameSchema.parse(phase.phaseName);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const firstError = error.issues?.[0] || error.format?.()?.phaseName?._errors?.[0];
            validationErrors.push(`Invalid phase name "${phase.phaseName}": ${firstError?.message || 'Validation error'}`);
          }
        }
      }

      // Calculate total budget percentage
      const calculatedTotal = parsedPhases.reduce((sum, phase) => sum + phase.budgetPercentage, 0);
      setTotalBudgetPercentage(calculatedTotal);

      // Check for duplicates
      const duplicateWarnings = checkForDuplicates(parsedPhases);

      setErrors(validationErrors);
      setWarnings(duplicateWarnings);
      setParsedData(parsedPhases);

      if (validationErrors.length === 0) {
        const activityCount = parsedPhases.reduce((sum, p) => sum + p.activities.length, 0);
        if (duplicateWarnings.length > 0) {
          toast.warning(`Found ${parsedPhases.length} phases with ${activityCount} activities (${duplicateWarnings.length} warnings)`);
        } else {
          toast.success(`Found ${parsedPhases.length} phases with ${activityCount} activities`);
        }
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      setErrors(["Failed to parse spreadsheet. Please check the file format."]);
      toast.error("Failed to parse spreadsheet");
    }
  };

  const parsePercentage = (value: any): number => {
    if (!value) return 0;
    const str = value.toString().replace("%", "").replace(",", ".");
    const num = parseFloat(str);
    if (isNaN(num)) return 0;
    
    // If the value is less than 1, it's likely stored as a decimal (e.g., 0.10 for 10%)
    // Excel stores percentages as decimals, so we need to convert them
    if (num > 0 && num < 1) {
      return num * 100;
    }
    
    return num;
  };

  const checkForDuplicates = (importedPhases: ParsedPhase[]): DuplicateWarning[] => {
    const duplicateWarnings: DuplicateWarning[] = [];
    const phaseNameCounts = new Map<string, number>();

    // Check for duplicates within imported data
    for (const phase of importedPhases) {
      const normalizedName = phase.phaseName.trim().toLowerCase();
      phaseNameCounts.set(normalizedName, (phaseNameCounts.get(normalizedName) || 0) + 1);
    }

    for (const [name, count] of phaseNameCounts) {
      if (count > 1) {
        const originalName = importedPhases.find(
          p => p.phaseName.trim().toLowerCase() === name
        )?.phaseName || name;
        duplicateWarnings.push({
          phaseName: originalName,
          type: 'internal',
          count,
        });
      }
    }

    // Check for duplicates with existing phases
    if (phases && phases.length > 0) {
      const existingPhaseNames = new Set(
        phases.map(p => p.phase_name.trim().toLowerCase())
      );

      for (const phase of importedPhases) {
        const normalizedName = phase.phaseName.trim().toLowerCase();
        if (existingPhaseNames.has(normalizedName)) {
          duplicateWarnings.push({
            phaseName: phase.phaseName,
            type: 'existing',
          });
        }
      }
    }

    return duplicateWarnings;
  };

  const handlePhasePercentageChange = (phaseIndex: number, newPercentage: string) => {
    const percentage = parseFloat(newPercentage) || 0;
    
    const updatedData = [...parsedData];
    updatedData[phaseIndex] = {
      ...updatedData[phaseIndex],
      budgetPercentage: percentage,
    };
    
    setParsedData(updatedData);
    
    // Recalculate total
    const newTotal = updatedData.reduce((sum, phase) => sum + phase.budgetPercentage, 0);
    setTotalBudgetPercentage(newTotal);
  };

  const handlePhaseNameChange = (phaseIndex: number, newName: string) => {
    const updatedData = [...parsedData];
    updatedData[phaseIndex] = {
      ...updatedData[phaseIndex],
      phaseName: newName,
    };
    setParsedData(updatedData);
  };

  const handleActivityNameChange = (phaseIndex: number, activityIndex: number, newName: string) => {
    const updatedData = [...parsedData];
    updatedData[phaseIndex] = {
      ...updatedData[phaseIndex],
      activities: updatedData[phaseIndex].activities.map((activity, idx) =>
        idx === activityIndex ? { ...activity, name: newName } : activity
      ),
    };
    setParsedData(updatedData);
  };

  const handleDownloadTemplate = async () => {
    // Create sample data for the template
    const templateData = [
      // Instructions row
      ["INSTRUCTIONS:", "This is a template for importing project phases and activities"],
      ["", "Column A: Phase name (required)"],
      ["", "Column B: Activity name (optional - leave empty for phase-only rows)"],
      ["", "Column C: Budget percentage (as decimal: 0.15 for 15% or as percentage: 15%)"],
      ["", ""],
      // Header row
      ["Phase Name", "Activity Name", "Budget %"],
      // Sample data
      ["Foundation", "Site Survey", 0.05],
      ["Foundation", "Excavation", 0.08],
      ["Foundation", "Concrete Pouring", 0.07],
      ["", "", ""], // Empty row for visual separation
      ["Structure", "Steel Frame", 0.12],
      ["Structure", "Walls", 0.10],
      ["Structure", "Roof", 0.08],
      ["", "", ""],
      ["Finishes", "Interior Painting", 0.06],
      ["Finishes", "Flooring", 0.09],
      ["Finishes", "Fixtures", 0.05],
      ["", "", ""],
      ["Utilities", "Electrical", 0.10],
      ["Utilities", "Plumbing", 0.08],
      ["Utilities", "HVAC", 0.12],
      ["", "", ""],
      ["TOTAL", "", "=SUM(C8:C24)"], // Excel formula for total
    ];

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Phase Import Template");

    // Add all rows
    templateData.forEach((rowData, index) => {
      const row = worksheet.addRow(rowData);

      // Style header row (row index 5, actual row 6)
      if (index === 5) {
        row.font = { bold: true };
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCCCCCC" } };
      }

      // Format percentage column (column C)
      if (typeof rowData[2] === 'number') {
        row.getCell(3).numFmt = '0.00%';
      } else if (typeof rowData[2] === 'string' && rowData[2].startsWith('=')) {
        row.getCell(3).value = { formula: rowData[2].substring(1) };
      }
    });

    // Set column widths
    worksheet.columns = [
      { width: 20 }, // Phase Name
      { width: 30 }, // Activity Name
      { width: 12 }, // Budget %
    ];

    // Add worksheet to workbook
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "phase_import_template.xlsx";
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Template downloaded successfully");
  };

  const handleDeletePhase = (phaseIndex: number) => {
    const updatedData = parsedData.filter((_, idx) => idx !== phaseIndex);
    setParsedData(updatedData);
    
    // Recalculate total
    const newTotal = updatedData.reduce((sum, phase) => sum + phase.budgetPercentage, 0);
    setTotalBudgetPercentage(newTotal);
    
    toast.success("Phase deleted");
  };

  const handleDeleteActivity = (phaseIndex: number, activityIndex: number) => {
    const updatedData = [...parsedData];
    const phase = updatedData[phaseIndex];
    const deletedActivity = phase.activities[activityIndex];
    
    // Remove the activity
    phase.activities = phase.activities.filter((_, idx) => idx !== activityIndex);
    
    // Update phase budget percentage
    phase.budgetPercentage -= deletedActivity.budgetPercentage;
    
    updatedData[phaseIndex] = phase;
    setParsedData(updatedData);
    
    // Recalculate total
    const newTotal = updatedData.reduce((sum, phase) => sum + phase.budgetPercentage, 0);
    setTotalBudgetPercentage(newTotal);
    
    toast.success("Activity deleted");
  };

  const handleSaveConfiguration = () => {
    if (!configName.trim()) {
      toast.error("Please enter a configuration name");
      return;
    }

    const newConfig: ImportConfiguration = {
      id: `config-${Date.now()}`,
      name: configName.trim(),
      skipTotalRows,
      autoAdjustPercentages,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedConfigurations, newConfig];
    setSavedConfigurations(updated);
    localStorage.setItem('phaseImportConfigurations', JSON.stringify(updated));
    
    setConfigName("");
    setShowSaveConfig(false);
    toast.success(`Configuration "${newConfig.name}" saved`);
  };

  const handleLoadConfiguration = (configId: string) => {
    const config = savedConfigurations.find(c => c.id === configId);
    if (!config) return;

    setSkipTotalRows(config.skipTotalRows);
    setAutoAdjustPercentages(config.autoAdjustPercentages);
    
    // Re-parse file if loaded
    if (file) handleFile(file);
    
    toast.success(`Configuration "${config.name}" loaded`);
  };

  const handleDeleteConfiguration = (configId: string) => {
    const config = savedConfigurations.find(c => c.id === configId);
    if (!config) return;

    const updated = savedConfigurations.filter(c => c.id !== configId);
    setSavedConfigurations(updated);
    localStorage.setItem('phaseImportConfigurations', JSON.stringify(updated));
    
    toast.success(`Configuration "${config.name}" deleted`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setParsedData((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsProcessing(true);

    try {
      // Handle replace mode: delete all existing activities first
      if (importMode === 'replace' && activities && activities.length > 0) {
        toast.info(`Deleting ${activities.length} existing activities...`);
        for (const activity of activities) {
          await deleteActivity.mutateAsync(activity.id);
        }
      }

      // Calculate starting sequence number
      let sequence = 1;
      if (importMode === 'append' && activities && activities.length > 0) {
        const maxSequence = Math.max(...activities.map(a => a.sequence));
        sequence = maxSequence + 1;
      }

      const today = new Date();

      // Determine if we need to adjust percentages
      const tolerance = 0.5;
      const needsAdjustment = Math.abs(totalBudgetPercentage - 100) > tolerance;
      const adjustmentFactor = needsAdjustment && autoAdjustPercentages 
        ? 100 / totalBudgetPercentage 
        : 1;

      for (const phaseData of parsedData) {
        // Create phase with adjusted percentage if needed
        const adjustedPercentage = phaseData.budgetPercentage * adjustmentFactor;
        const phaseBudget = (projectBudget * adjustedPercentage) / 100;
        
        const phaseResult = await createPhase.mutateAsync({
          project_id: projectId,
          phase_name: phaseData.phaseName,
          budget_allocated: phaseBudget,
          progress_percentage: 0,
          status: "pending",
          start_date: null,
          end_date: null,
        });

        // Create activities for this phase and link them with phase_id
        for (const activity of phaseData.activities) {
          await createActivity.mutateAsync({
            project_id: projectId,
            phase_id: phaseResult.id, // Link activity to phase
            name: activity.name,
            sequence: sequence++,
            days_for_activity: 1,
            completion_percentage: 0,
            start_date: null,
            end_date: null,
          });
        }
      }

      const mode = importMode === 'replace' ? 'replaced with' : 'added';
      toast.success(`Successfully ${mode} ${parsedData.length} phases and ${parsedData.reduce((sum, p) => sum + p.activities.length, 0)} activities`);
      onOpenChange(false);
      setFile(null);
      setParsedData([]);
    } catch (error) {
      console.error("Import error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to import phases";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Phases & Activities</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet with project phases and activities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="file">Excel File</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-8"
              >
                <Download className="mr-2 h-3 w-3" />
                Download Template
              </Button>
            </div>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              Expected format: Phase name (column A), Activity name (column B), Percentage (column C).
              Download the template above for a properly formatted example.
            </p>
          </div>

          {/* Configuration Management */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Import Settings</Label>
              <div className="flex items-center gap-2">
                {savedConfigurations.length > 0 && (
                  <Select onValueChange={handleLoadConfiguration}>
                    <SelectTrigger className="h-8 w-[200px]">
                      <SelectValue placeholder={t("additionalPlaceholders.loadSavedSettings")} />
                    </SelectTrigger>
                    <SelectContent>
                      {savedConfigurations.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{config.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConfiguration(config.id);
                              }}
                              className="ml-2 text-destructive hover:text-destructive/80"
                              title={t("tooltips.deleteConfiguration")}
                            >
                              ×
                            </button>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveConfig(!showSaveConfig)}
                  className="h-8"
                >
                  <Save className="mr-2 h-3 w-3" />
                  Save Settings
                </Button>
              </div>
            </div>

            {showSaveConfig && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t("additionalPlaceholders.configurationName")}
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveConfiguration();
                    if (e.key === 'Escape') setShowSaveConfig(false);
                  }}
                  className="h-8"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveConfiguration}
                  className="h-8"
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowSaveConfig(false);
                    setConfigName("");
                  }}
                  className="h-8"
                >
                  Cancel
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="skip-total"
                  checked={skipTotalRows}
                  onChange={(e) => {
                    setSkipTotalRows(e.target.checked);
                    // Re-parse if file is already loaded
                    if (file) handleFile(file);
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="skip-total" className="text-xs cursor-pointer">
                  Skip rows containing "Total" in column A
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-adjust-setting"
                  checked={autoAdjustPercentages}
                  onChange={(e) => setAutoAdjustPercentages(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="auto-adjust-setting" className="text-xs cursor-pointer">
                  Auto-adjust percentages to 100% by default
                </Label>
              </div>
            </div>
          </div>

          {existingActivitiesCount > 0 && parsedData.length > 0 && (
            <Alert className="border-primary/50 bg-primary/5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Mode</AlertTitle>
              <AlertDescription>
                <p className="text-sm mb-3">
                  This project has <strong>{existingActivitiesCount} existing activities</strong>. 
                  Choose how to handle the import:
                </p>
                <RadioGroup value={importMode} onValueChange={(value: 'append' | 'replace') => setImportMode(value)}>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="append" id="append" />
                    <div className="space-y-1">
                      <Label htmlFor="append" className="cursor-pointer font-medium">
                        Append to existing activities
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        New activities will start from sequence {(activities && activities.length > 0 ? Math.max(...activities.map(a => a.sequence)) + 1 : 1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 mt-3">
                    <RadioGroupItem value="replace" id="replace" />
                    <div className="space-y-1">
                      <Label htmlFor="replace" className="cursor-pointer font-medium text-destructive">
                        Replace all existing activities
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        ⚠️ This will delete all {existingActivitiesCount} existing activities before importing
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </AlertDescription>
            </Alert>
          )}

          {parsedData.length > 0 && Math.abs(totalBudgetPercentage - 100) > 0.5 && (
            <div className="flex items-start space-x-2 p-3 rounded-lg bg-muted/50">
              <input
                type="checkbox"
                id="auto-adjust"
                checked={autoAdjustPercentages}
                onChange={(e) => setAutoAdjustPercentages(e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="auto-adjust" className="cursor-pointer font-medium">
                  Auto-adjust percentages to sum to 100%
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Current total: {totalBudgetPercentage.toFixed(2)}%. 
                  {autoAdjustPercentages && ` Will be adjusted to 100% (×${(100 / totalBudgetPercentage).toFixed(4)} factor)`}
                </p>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Errors</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  {errors.map((error, idx) => (
                    <div key={idx} className="text-sm">
                      {error.startsWith('Diagnostic:') ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium hover:underline">
                            Click to see diagnostic information
                          </summary>
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono whitespace-pre-wrap">
                            {error.replace('Diagnostic: ', '')}
                          </div>
                        </details>
                      ) : (
                        <div>• {error}</div>
                      )}
                    </div>
                  ))}
                  
                  {errors.some(e => e.includes('No phases found')) && rowDebug.length > 0 && (
                    <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                      <p className="font-medium text-sm">💡 Troubleshooting Steps:</p>
                      <ol className="text-xs space-y-1 list-decimal list-inside">
                        <li>Check if your spreadsheet has column headers (Phase Name, Activity Name, Percentage)</li>
                        <li>Verify that Column A contains phase names</li>
                        <li>Ensure Column C contains percentage values (as 0.15 or 15%)</li>
                        <li>Try unchecking "Skip rows containing Total" if your data uses that word</li>
                        <li>Download the template and compare it with your file structure</li>
                        <li>Scroll down to see the "Show skipped rows" section for details</li>
                      </ol>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {warnings.length > 0 && errors.length === 0 && (
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-300">Duplicate Phase Names Detected</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                <div className="space-y-2 mt-2">
                  {warnings.map((warning, idx) => (
                    <div key={idx} className="text-sm">
                      • <span className="font-medium">{warning.phaseName}</span>
                      {warning.type === 'internal' 
                        ? ` appears ${warning.count} times in the import file`
                        : ' already exists in this project'}
                    </div>
                  ))}
                  <div className="mt-3 text-sm font-medium">
                    Importing will create phases with duplicate names. Consider renaming them in the spreadsheet first.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {parsedData.length > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {parsedData.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total Phases
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {parsedData.reduce((sum, p) => sum + p.activities.length, 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total Activities
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">
                        {parsedData.filter(p => p.activities.length > 0).length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        With Activities
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">
                        {parsedData.filter(p => p.activities.length === 0).length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Without Activities
                      </div>
                    </div>
                  </div>

                  {/* Budget Summary */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="font-medium">Total Budget Percentage:</span>
                    <span className={`text-lg font-bold ${Math.abs(totalBudgetPercentage - 100) > 0.5 ? 'text-warning' : 'text-success'}`}>
                      {totalBudgetPercentage.toFixed(2)}%
                    </span>
                  </div>

                  {Math.abs(totalBudgetPercentage - 100) > 0.5 && autoAdjustPercentages && (
                    <p className="text-xs text-primary">
                      ✓ Percentages will be automatically adjusted to sum to 100% on import
                    </p>
                  )}
                  
                  {parsedData.filter(p => p.activities.length === 0).length > 0 && (
                    <p className="text-xs text-warning flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {parsedData.filter(p => p.activities.length === 0).length} phase(s) have no activities - they will be created but may need manual configuration
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    💡 Drag phases to reorder them before importing
                  </p>
                  
                  {/* Debug Preview Table */}
                  <Collapsible className="mt-4">
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown className="h-4 w-4" />
                      Show raw data preview (for debugging)
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-96 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-muted sticky top-0">
                              <tr>
                                <th className="px-2 py-2 text-left font-medium">Phase</th>
                                <th className="px-2 py-2 text-left font-medium">Activity</th>
                                <th className="px-2 py-2 text-right font-medium">Raw Value</th>
                                <th className="px-2 py-2 text-right font-medium">Parsed %</th>
                                <th className="px-2 py-2 text-center font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {parsedData.map((phase, phaseIdx) => 
                                phase.activities.map((activity, actIdx) => (
                                  <tr key={`${phaseIdx}-${actIdx}`} className="hover:bg-muted/50">
                                    <td className="px-2 py-2 text-left">
                                      {actIdx === 0 ? phase.phaseName : ""}
                                    </td>
                                    <td className="px-2 py-2 text-left">{activity.name}</td>
                                    <td className="px-2 py-2 text-right font-mono">
                                      {activity.rawBudgetPercentage || "N/A"}
                                    </td>
                                    <td className="px-2 py-2 text-right font-mono">
                                      {activity.budgetPercentage.toFixed(2)}%
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      {activity.budgetPercentage === 0 ? (
                                        <span className="text-warning">⚠️</span>
                                      ) : activity.budgetPercentage < 1 && !activity.rawBudgetPercentage?.includes('.') ? (
                                        <span className="text-warning">⚠️</span>
                                      ) : (
                                        <span className="text-success">✓</span>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                            <tfoot className="bg-muted/50 sticky bottom-0">
                              <tr className="font-medium">
                                <td colSpan={3} className="px-2 py-2 text-right">Total:</td>
                                <td className="px-2 py-2 text-right font-mono">
                                  {totalBudgetPercentage.toFixed(2)}%
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {Math.abs(totalBudgetPercentage - 100) <= 0.5 ? (
                                    <span className="text-success">✓</span>
                                  ) : (
                                    <span className="text-warning">⚠️</span>
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        ⚠️ = Potential parsing issue (0% or unexpected conversion)
                      </p>

                      {/* Skipped Rows Summary */}
                      <div className="mt-4 text-xs text-muted-foreground">
                        Parsed rows: <span className="font-medium text-foreground">{rowDebug.filter(r => r.included).length}</span>,
                        Skipped rows: <span className="font-medium text-warning">{rowDebug.filter(r => !r.included).length}</span>
                      </div>

                      {/* Skipped Rows Detail */}
                      <Collapsible className="mt-2">
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <ChevronDown className="h-4 w-4" />
                          Show skipped rows (with reasons)
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                          <div className="border rounded-lg overflow-hidden">
                            <div className="max-h-72 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-muted sticky top-0">
                                  <tr>
                                    <th className="px-2 py-2 text-left font-medium">Row #</th>
                                    <th className="px-2 py-2 text-left font-medium">Col A</th>
                                    <th className="px-2 py-2 text-left font-medium">Col B</th>
                                    <th className="px-2 py-2 text-left font-medium">Col C</th>
                                    <th className="px-2 py-2 text-left font-medium">Reason</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {rowDebug.filter(r => !r.included).map((r, idx) => (
                                    <tr key={idx} className="hover:bg-muted/50">
                                      <td className="px-2 py-2">{r.rowIndex}</td>
                                      <td className="px-2 py-2">{r.col0 || <span className="text-muted-foreground">(empty)</span>}</td>
                                      <td className="px-2 py-2">{r.col1 || <span className="text-muted-foreground">(empty)</span>}</td>
                                      <td className="px-2 py-2">{r.col2 || <span className="text-muted-foreground">(empty)</span>}</td>
                                      <td className="px-2 py-2">
                                        <span className="uppercase tracking-wide text-[10px] px-1.5 py-0.5 rounded bg-muted">
                                          {r.reason || 'unknown'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                  </CollapsibleContent>
                </Collapsible>

                  <div className="max-h-60 overflow-y-auto space-y-2 mt-3">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={parsedData.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {parsedData.map((phase, idx) => {
                          const adjustmentFactor = Math.abs(totalBudgetPercentage - 100) > 0.5 && autoAdjustPercentages
                            ? 100 / totalBudgetPercentage
                            : 1;
                          
                          return (
                            <SortablePhaseItem
                              key={phase.id}
                              phase={phase}
                              index={idx}
                              adjustmentFactor={adjustmentFactor}
                              onPercentageChange={handlePhasePercentageChange}
                              onPhaseNameChange={handlePhaseNameChange}
                              onActivityNameChange={handleActivityNameChange}
                              onDeletePhase={handleDeletePhase}
                              onDeleteActivity={handleDeleteActivity}
                            />
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedData.length === 0 || errors.length > 0 || isProcessing}
              variant={importMode === 'replace' && existingActivitiesCount > 0 ? "destructive" : warnings.length > 0 ? "default" : "default"}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isProcessing 
                ? "Importing..." 
                : importMode === 'replace' && existingActivitiesCount > 0
                  ? "Replace All & Import"
                  : warnings.length > 0 
                    ? "Import Anyway" 
                    : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

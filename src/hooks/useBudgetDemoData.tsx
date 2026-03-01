import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ProjectPhaseInsert = Database['public']['Tables']['project_phases']['Insert'];
type BudgetItemInsert = Database['public']['Tables']['project_budget_items']['Insert'];
type FinancialEntryInsert = Database['public']['Tables']['project_financial_entries']['Insert'];
type PurchaseRequestInsert = Database['public']['Tables']['project_purchase_requests']['Insert'];
type PurchaseRequestItemInsert = Database['public']['Tables']['purchase_request_items']['Insert'];
type PhaseStatus = Database['public']['Enums']['phase_status'];
type EntryType = Database['public']['Enums']['entry_type'];
type RequestPriority = Database['public']['Enums']['request_priority'];
type RequestStatus = Database['public']['Enums']['request_status'];
type AppRole = Database['public']['Enums']['app_role'];

interface DemoPhase {
  phase_name: string;
  start_date: string;
  end_date: string;
  status: PhaseStatus;
  budget_allocated: number;
  budget_spent: number;
  progress_percentage: number;
}

interface DemoBudgetItem {
  category: string;
  description: string;
  budgetedAmount: number;
  actualAmount: number;
  phaseName?: string;
}

interface DemoFinancialEntry {
  entry_type: EntryType;
  category: string;
  amount: number;
  date: string;
  description?: string;
  payment_method?: string;
  recipient_payer?: string;
  reference?: string;
  currency?: string;
  unit?: string;
  quantity?: number;
  price_per_unit?: number;
}

interface DemoPurchaseRequestItem {
  description: string;
  quantity: number;
  unit?: string;
  estimated_price: number;
  actual_price: number;
  supplier?: string;
}

interface DemoPurchaseRequest {
  request: {
    requested_by: string;
    priority: RequestPriority;
    status: RequestStatus;
    delivery_date: string;
    notes?: string | null;
    total_estimated: number;
    total_actual: number;
  };
  items: DemoPurchaseRequestItem[];
}

interface ProjectSeedDefinition {
  phases: DemoPhase[];
  budgetItems: DemoBudgetItem[];
  financialEntries: DemoFinancialEntry[];
  purchaseRequests: DemoPurchaseRequest[];
}

interface ExistingProjectRow {
  id: string;
  name: string;
  manager?: string | null;
  owner_id?: string | null;
}

interface ProjectTeamMembershipRow {
  id: string;
  access_role?: AppRole | null;
}

interface SeedSummary {
  projectsSeeded: number;
  projectsSkipped: string[];
  projectsMissing: string[];
  budgetItems: number;
  financialEntries: number;
  purchaseRequests: number;
  purchaseRequestItems: number;
  phases: number;
}

const TARGET_PROJECTS: Record<string, ProjectSeedDefinition> = {
  'Residential Villa - Silva Family': {
    phases: [
      {
        phase_name: 'Concept & Planning',
        start_date: '2024-01-05',
        end_date: '2024-02-10',
        status: 'completed',
        budget_allocated: 120000,
        budget_spent: 108000,
        progress_percentage: 100,
      },
      {
        phase_name: 'Construction',
        start_date: '2024-02-11',
        end_date: '2024-08-20',
        status: 'in_progress',
        budget_allocated: 980000,
        budget_spent: 525000,
        progress_percentage: 54,
      },
      {
        phase_name: 'Finishing & Landscaping',
        start_date: '2024-08-21',
        end_date: '2024-11-30',
        status: 'pending',
        budget_allocated: 340000,
        budget_spent: 72000,
        progress_percentage: 18,
      },
    ],
    budgetItems: [
      {
        category: 'Architectural Design',
        description: 'Architectural, structural and MEP designs with renderings',
        budgetedAmount: 80000,
        actualAmount: 72000,
        phaseName: 'Concept & Planning',
      },
      {
        category: 'Permits & Approvals',
        description: 'Municipal approvals, environmental studies and legal fees',
        budgetedAmount: 40000,
        actualAmount: 36000,
        phaseName: 'Concept & Planning',
      },
      {
        category: 'Structural Works',
        description: 'Foundations, retaining walls, structure and roofing',
        budgetedAmount: 620000,
        actualAmount: 340000,
        phaseName: 'Construction',
      },
      {
        category: 'Installations',
        description: 'Electrical, plumbing, HVAC and smart home infrastructure',
        budgetedAmount: 260000,
        actualAmount: 145000,
        phaseName: 'Construction',
      },
      {
        category: 'Interior Finishes',
        description: 'Flooring, carpentry, finishes and custom furniture',
        budgetedAmount: 220000,
        actualAmount: 52000,
        phaseName: 'Finishing & Landscaping',
      },
      {
        category: 'Landscaping & Outdoor',
        description: 'Landscaping, pool installation and outdoor lighting',
        budgetedAmount: 120000,
        actualAmount: 20000,
        phaseName: 'Finishing & Landscaping',
      },
    ],
    financialEntries: [
      {
        entry_type: 'income',
        category: 'Client Payment',
        amount: 350000,
        date: '2024-02-01',
        description: 'Initial construction milestone payment',
        payment_method: 'Bank transfer',
        recipient_payer: 'Silva Family',
        currency: 'BRL',
      },
      {
        entry_type: 'income',
        category: 'Client Payment',
        amount: 280000,
        date: '2024-04-28',
        description: 'Structural progress billing',
        payment_method: 'Bank transfer',
        recipient_payer: 'Silva Family',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Architectural Design',
        amount: 72000,
        date: '2024-02-08',
        description: 'Architectural and interior design contract',
        payment_method: 'Invoice',
        recipient_payer: 'Atelier Forma',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Structural Works',
        amount: 340000,
        date: '2024-04-12',
        description: 'Structural contractor progress payment',
        payment_method: 'Bank transfer',
        recipient_payer: 'Construtora Horizonte',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Installations',
        amount: 145000,
        date: '2024-05-24',
        description: 'Mechanical and electrical systems batch 1',
        payment_method: 'Invoice',
        recipient_payer: 'TecLine Sistemas',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Interior Finishes',
        amount: 52000,
        date: '2024-07-02',
        description: 'Custom carpentry deposit',
        payment_method: 'Invoice',
        recipient_payer: 'Studio Madeiras',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Landscaping & Outdoor',
        amount: 20000,
        date: '2024-07-18',
        description: 'Landscape design retainers',
        payment_method: 'Invoice',
        recipient_payer: 'Verde Vivo Paisagismo',
        currency: 'BRL',
      },
    ],
    purchaseRequests: [
      {
        request: {
          requested_by: 'Rafael Santos',
          priority: 'high',
          status: 'ordered',
          delivery_date: '2024-03-15',
          notes: 'Foundation concrete and reinforcement batch',
          total_estimated: 280000,
          total_actual: 272500,
        },
        items: [
          {
            description: 'Ready-mix concrete 35 MPa',
            quantity: 220,
            unit: 'm³',
            estimated_price: 176000,
            actual_price: 172000,
            supplier: 'Concreto Forte',
          },
          {
            description: 'Cut & bent rebar',
            quantity: 38,
            unit: 'tons',
            estimated_price: 96000,
            actual_price: 94500,
            supplier: 'Aços Brasil',
          },
        ],
      },
      {
        request: {
          requested_by: 'Ana Oliveira',
          priority: 'medium',
          status: 'pending',
          delivery_date: '2024-08-05',
          notes: 'Interior finishings first batch',
          total_estimated: 185000,
          total_actual: 0,
        },
        items: [
          {
            description: 'Engineered hardwood flooring',
            quantity: 980,
            unit: 'm²',
            estimated_price: 118000,
            actual_price: 0,
            supplier: 'Premium Floors',
          },
          {
            description: 'Custom cabinetry set',
            quantity: 1,
            unit: 'lot',
            estimated_price: 67000,
            actual_price: 0,
            supplier: 'Studio Madeiras',
          },
        ],
      },
    ],
  },
  'Commercial Building Downtown': {
    phases: [
      {
        phase_name: 'Pre-Construction',
        start_date: '2023-11-10',
        end_date: '2024-01-15',
        status: 'completed',
        budget_allocated: 210000,
        budget_spent: 194000,
        progress_percentage: 100,
      },
      {
        phase_name: 'Structure & Envelope',
        start_date: '2024-01-16',
        end_date: '2024-09-30',
        status: 'in_progress',
        budget_allocated: 1520000,
        budget_spent: 875000,
        progress_percentage: 58,
      },
      {
        phase_name: 'MEP & Interiors',
        start_date: '2024-06-20',
        end_date: '2024-12-20',
        status: 'in_progress',
        budget_allocated: 820000,
        budget_spent: 240000,
        progress_percentage: 29,
      },
    ],
    budgetItems: [
      {
        category: 'Feasibility & Permits',
        description: 'Feasibility studies, permitting and design coordination',
        budgetedAmount: 210000,
        actualAmount: 194000,
        phaseName: 'Pre-Construction',
      },
      {
        category: 'Concrete Structure',
        description: 'Foundations, slabs, columns and structural works',
        budgetedAmount: 890000,
        actualAmount: 565000,
        phaseName: 'Structure & Envelope',
      },
      {
        category: 'Façade & Glazing',
        description: 'Curtain wall, glazing systems and external finishes',
        budgetedAmount: 630000,
        actualAmount: 310000,
        phaseName: 'Structure & Envelope',
      },
      {
        category: 'Mechanical Systems',
        description: 'HVAC, chillers, ducts and air distribution',
        budgetedAmount: 420000,
        actualAmount: 120000,
        phaseName: 'MEP & Interiors',
      },
      {
        category: 'Electrical & BMS',
        description: 'Electrical distribution, lighting and automation',
        budgetedAmount: 270000,
        actualAmount: 82000,
        phaseName: 'MEP & Interiors',
      },
      {
        category: 'Interior Fit-out',
        description: 'Common areas finishes, elevators and joinery',
        budgetedAmount: 130000,
        actualAmount: 38000,
        phaseName: 'MEP & Interiors',
      },
    ],
    financialEntries: [
      {
        entry_type: 'income',
        category: 'Client Payment',
        amount: 520000,
        date: '2024-01-05',
        description: 'Mobilization and pre-construction milestone',
        payment_method: 'Bank transfer',
        recipient_payer: 'Downtown Holdings',
        currency: 'BRL',
      },
      {
        entry_type: 'income',
        category: 'Client Payment',
        amount: 680000,
        date: '2024-04-30',
        description: 'Structural progress billing (30%)',
        payment_method: 'Bank transfer',
        recipient_payer: 'Downtown Holdings',
        currency: 'BRL',
      },
      {
        entry_type: 'income',
        category: 'Construction Loan Draw',
        amount: 450000,
        date: '2024-07-12',
        description: 'Facade and MEP financing draw',
        payment_method: 'Bank transfer',
        recipient_payer: 'Banco Urbano',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Feasibility & Permits',
        amount: 194000,
        date: '2024-01-12',
        description: 'Permitting fees and design coordination',
        payment_method: 'Invoice',
        recipient_payer: 'ProCity Consultoria',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Concrete Structure',
        amount: 565000,
        date: '2024-04-18',
        description: 'Concrete and reinforcement supply',
        payment_method: 'Bank transfer',
        recipient_payer: 'Mega Concretos',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Façade & Glazing',
        amount: 310000,
        date: '2024-06-05',
        description: 'Curtain wall system procurement',
        payment_method: 'Invoice',
        recipient_payer: 'GlassLine Sistemas',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Mechanical Systems',
        amount: 120000,
        date: '2024-07-25',
        description: 'HVAC equipment deposit',
        payment_method: 'Bank transfer',
        recipient_payer: 'ClimaTech Industrial',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Electrical & BMS',
        amount: 82000,
        date: '2024-08-08',
        description: 'Electrical panels and automation controllers',
        payment_method: 'Invoice',
        recipient_payer: 'EnergiaTech',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Interior Fit-out',
        amount: 38000,
        date: '2024-09-02',
        description: 'Lobby finishes mock-up',
        payment_method: 'Invoice',
        recipient_payer: 'DesignPrime',
        currency: 'BRL',
      },
    ],
    purchaseRequests: [
      {
        request: {
          requested_by: 'Marcos Vieira',
          priority: 'high',
          status: 'ordered',
          delivery_date: '2024-02-25',
          notes: 'Concrete and steel package A',
          total_estimated: 610000,
          total_actual: 598000,
        },
        items: [
          {
            description: 'Concrete 40 MPa',
            quantity: 480,
            unit: 'm³',
            estimated_price: 336000,
            actual_price: 330000,
            supplier: 'Mega Concretos',
          },
          {
            description: 'Reinforcement steel',
            quantity: 72,
            unit: 'tons',
            estimated_price: 274000,
            actual_price: 268000,
            supplier: 'Aços Premium',
          },
        ],
      },
      {
        request: {
          requested_by: 'Patricia Lima',
          priority: 'medium',
          status: 'approved',
          delivery_date: '2024-06-18',
          notes: 'Curtain wall components',
          total_estimated: 320000,
          total_actual: 308000,
        },
        items: [
          {
            description: 'Curtain wall modules',
            quantity: 160,
            unit: 'units',
            estimated_price: 256000,
            actual_price: 248000,
            supplier: 'GlassLine Sistemas',
          },
          {
            description: 'Aluminum frames and anchors',
            quantity: 1,
            unit: 'lot',
            estimated_price: 64000,
            actual_price: 60000,
            supplier: 'GlassLine Sistemas',
          },
        ],
      },
      {
        request: {
          requested_by: 'João Ribeiro',
          priority: 'medium',
          status: 'pending',
          delivery_date: '2024-09-10',
          notes: 'HVAC equipment batch',
          total_estimated: 260000,
          total_actual: 0,
        },
        items: [
          {
            description: 'Chiller units 150 TR',
            quantity: 2,
            unit: 'units',
            estimated_price: 180000,
            actual_price: 0,
            supplier: 'ClimaTech Industrial',
          },
          {
            description: 'Air handling units',
            quantity: 8,
            unit: 'units',
            estimated_price: 80000,
            actual_price: 0,
            supplier: 'ClimaTech Industrial',
          },
        ],
      },
    ],
  },
  'Apartment Renovation - Unit 302': {
    phases: [
      {
        phase_name: 'Design & Approvals',
        start_date: '2024-02-01',
        end_date: '2024-02-28',
        status: 'completed',
        budget_allocated: 35000,
        budget_spent: 32000,
        progress_percentage: 100,
      },
      {
        phase_name: 'Demolition & Structural Adjustments',
        start_date: '2024-03-01',
        end_date: '2024-03-25',
        status: 'completed',
        budget_allocated: 65000,
        budget_spent: 60250,
        progress_percentage: 100,
      },
      {
        phase_name: 'Finishes & Installations',
        start_date: '2024-03-26',
        end_date: '2024-05-30',
        status: 'in_progress',
        budget_allocated: 185000,
        budget_spent: 78500,
        progress_percentage: 42,
      },
    ],
    budgetItems: [
      {
        category: 'Design & Permits',
        description: 'Interior design, condo approvals and permits',
        budgetedAmount: 35000,
        actualAmount: 32000,
        phaseName: 'Design & Approvals',
      },
      {
        category: 'Demolition & Disposal',
        description: 'Demolition services, debris removal and structural changes',
        budgetedAmount: 48000,
        actualAmount: 45250,
        phaseName: 'Demolition & Structural Adjustments',
      },
      {
        category: 'Structural Adjustments',
        description: 'Structural reinforcements and layout adjustments',
        budgetedAmount: 17000,
        actualAmount: 15000,
        phaseName: 'Demolition & Structural Adjustments',
      },
      {
        category: 'Electrical & Plumbing',
        description: 'New plumbing fixtures, electrical rewiring and automation',
        budgetedAmount: 62000,
        actualAmount: 29000,
        phaseName: 'Finishes & Installations',
      },
      {
        category: 'Finishes & Joinery',
        description: 'Custom cabinetry, flooring, painting and finishes',
        budgetedAmount: 73000,
        actualAmount: 31500,
        phaseName: 'Finishes & Installations',
      },
      {
        category: 'Furniture & Decor',
        description: 'Loose furniture, lighting fixtures and decor package',
        budgetedAmount: 36000,
        actualAmount: 18000,
        phaseName: 'Finishes & Installations',
      },
    ],
    financialEntries: [
      {
        entry_type: 'income',
        category: 'Client Payment',
        amount: 120000,
        date: '2024-03-05',
        description: 'Initial renovation installment',
        payment_method: 'Bank transfer',
        recipient_payer: 'Unit 302 Owner',
        currency: 'BRL',
      },
      {
        entry_type: 'income',
        category: 'Client Payment',
        amount: 90000,
        date: '2024-04-20',
        description: 'Mid-project progress payment',
        payment_method: 'Bank transfer',
        recipient_payer: 'Unit 302 Owner',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Design & Permits',
        amount: 32000,
        date: '2024-02-25',
        description: 'Interior design contract and approvals',
        payment_method: 'Invoice',
        recipient_payer: 'Studio Linea',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Demolition & Disposal',
        amount: 45250,
        date: '2024-03-15',
        description: 'Demolition services and debris haul-off',
        payment_method: 'Bank transfer',
        recipient_payer: 'Demolir Serviços',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Electrical & Plumbing',
        amount: 29000,
        date: '2024-04-05',
        description: 'Plumbing fixtures and electrical rewiring materials',
        payment_method: 'Invoice',
        recipient_payer: 'TecnoFix',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Finishes & Joinery',
        amount: 31500,
        date: '2024-04-28',
        description: 'Custom cabinetry down payment',
        payment_method: 'Invoice',
        recipient_payer: 'Moveis Sob Medida',
        currency: 'BRL',
      },
      {
        entry_type: 'expense',
        category: 'Furniture & Decor',
        amount: 18000,
        date: '2024-05-12',
        description: 'Furniture and decor package reservation',
        payment_method: 'Invoice',
        recipient_payer: 'DecorUp',
        currency: 'BRL',
      },
    ],
    purchaseRequests: [
      {
        request: {
          requested_by: 'Bianca Melo',
          priority: 'medium',
          status: 'ordered',
          delivery_date: '2024-03-08',
          notes: 'Demolition equipment and disposal',
          total_estimated: 38000,
          total_actual: 36500,
        },
        items: [
          {
            description: 'Demolition crew services',
            quantity: 1,
            unit: 'lot',
            estimated_price: 26000,
            actual_price: 25500,
            supplier: 'Demolir Serviços',
          },
          {
            description: 'Waste containers and haul-off',
            quantity: 4,
            unit: 'containers',
            estimated_price: 12000,
            actual_price: 11000,
            supplier: 'EcoLixo',
          },
        ],
      },
      {
        request: {
          requested_by: 'Lucas Andrade',
          priority: 'medium',
          status: 'approved',
          delivery_date: '2024-04-18',
          notes: 'Plumbing and electrical fixtures',
          total_estimated: 52000,
          total_actual: 49800,
        },
        items: [
          {
            description: 'Premium plumbing fixtures set',
            quantity: 1,
            unit: 'lot',
            estimated_price: 24000,
            actual_price: 23200,
            supplier: 'Hydra Premium',
          },
          {
            description: 'Electrical fittings and automation kit',
            quantity: 1,
            unit: 'lot',
            estimated_price: 28000,
            actual_price: 26600,
            supplier: 'TecnoFix',
          },
        ],
      },
      {
        request: {
          requested_by: 'Bianca Melo',
          priority: 'low',
          status: 'pending',
          delivery_date: '2024-05-22',
          notes: 'Furniture and decor package',
          total_estimated: 36000,
          total_actual: 0,
        },
        items: [
          {
            description: 'Living room furniture set',
            quantity: 1,
            unit: 'set',
            estimated_price: 21000,
            actual_price: 0,
            supplier: 'DecorUp',
          },
          {
            description: 'Custom lighting fixtures',
            quantity: 1,
            unit: 'lot',
            estimated_price: 15000,
            actual_price: 0,
            supplier: 'Ilumina Design',
          },
        ],
      },
    ],
  },
};

const TARGET_PROJECT_NAMES = Object.keys(TARGET_PROJECTS);
const ADMIN_ROLES: AppRole[] = ['admin', 'project_manager'];
const TEMPLATE_PHASE_NAMES = Array.from(
  new Set(
    Object.values(TARGET_PROJECTS)
      .flatMap((project) => project.phases.map((phase) => phase.phase_name))
  )
);

function sum(numbers: number[]): number {
  return numbers.reduce((total, value) => total + value, 0);
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useBudgetDemoData() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateDemoData = async () => {
    setIsGenerating(true);

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      const user = authData.user;
      if (!user) {
        throw new Error('You must be logged in to generate demo data.');
      }

      const userId = user.id;
      const userName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        'Seed User';

      let ownerColumnSupported = true;
      let accessRoleSupported = true;

      const { error: ownerColumnError } = await supabase
        .from('projects')
        .select('owner_id')
        .limit(1);

      if (ownerColumnError) {
        const code = (ownerColumnError as { code?: string }).code;
        if (code === 'PGRST204' || code === '42703') {
          ownerColumnSupported = false;
          console.warn('[demo-data] owner_id column unavailable; skipping ownership assignments');
        } else {
          throw ownerColumnError;
        }
      }

      const { error: accessRoleError } = await supabase
        .from('project_team_members')
        .select('access_role')
        .limit(1);

      if (accessRoleError) {
        const code = (accessRoleError as { code?: string }).code;
        if (code === 'PGRST204' || code === '42703') {
          accessRoleSupported = false;
          console.warn(
            '[demo-data] access_role column unavailable; team roles will not be updated'
          );
        } else {
          throw accessRoleError;
        }
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(ownerColumnSupported ? 'id, name, owner_id, manager' : 'id, name, manager')
        .in('name', TARGET_PROJECT_NAMES);

      if (projectsError) throw projectsError;

      const projectRows = (projectsData ?? []) as any as ExistingProjectRow[];
      const projectByName = new Map<string, ExistingProjectRow>();
      projectRows.forEach((project) => {
        projectByName.set(project.name, project);
      });

      const summary: SeedSummary = {
        projectsSeeded: 0,
        projectsSkipped: [],
        projectsMissing: [],
        budgetItems: 0,
        financialEntries: 0,
        purchaseRequests: 0,
        purchaseRequestItems: 0,
        phases: 0,
      };

      for (const projectName of TARGET_PROJECT_NAMES) {
        const seedData = TARGET_PROJECTS[projectName];
        const projectRow = projectByName.get(projectName);

        if (!projectRow) {
          summary.projectsMissing.push(projectName);
          continue;
        }

        try {
          const shouldSkip = await shouldSkipProject(projectRow.id);
          if (shouldSkip) {
            summary.projectsSkipped.push(projectName);
            continue;
          }

          await seedProject({
            project: projectRow,
            seedData,
            userId,
            userName,
            ownerColumnSupported,
            accessRoleSupported,
            summary,
          });

          summary.projectsSeeded += 1;
        } catch (projectError) {
          console.error('[demo-data] Failed to seed project', projectName, projectError);
          summary.projectsSkipped.push(projectName);
        }
      }

      await invalidateQueries(queryClient);

      toast({
        title: 'Demo budget data generated',
        description: buildSummaryMessage(summary),
      });
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err && err.message
          ? String(err.message)
          : 'Failed to generate demo data';
      console.error('[demo-data] Generation failed:', err);
      toast({
        title: 'Error generating demo data',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearDemoData = async () => {
    setIsClearing(true);

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData.user) throw new Error('You must be logged in to remove demo data.');

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .in('name', TARGET_PROJECT_NAMES);

      if (projectsError) throw projectsError;
      const projectRows = (projectsData ?? []) as ExistingProjectRow[];

      if (projectRows.length === 0) {
        toast({
          title: 'No target projects',
          description: 'The specified projects were not found.',
        });
        return;
      }

      let removedBudgetItems = 0;
      let removedFinancialEntries = 0;
      let removedPurchaseRequests = 0;
      let removedPurchaseRequestItems = 0;
      let removedPhases = 0;

      for (const projectRow of projectRows) {
        const seedData = TARGET_PROJECTS[projectRow.name];
        if (!seedData) continue;

        const projectId = projectRow.id;

        // Purchase request items and requests
        const { data: existingRequests, error: fetchRequestsError } = await supabase
          .from('project_purchase_requests')
          .select('id, requested_by, delivery_date, total_estimated, notes')
          .eq('project_id', projectId);

        if (fetchRequestsError) throw fetchRequestsError;

        const requestIdsToDelete =
          existingRequests
            ?.filter((request) =>
              seedData.purchaseRequests.some((seed) => {
                const deliveryMatch =
                  request.delivery_date &&
                  request.delivery_date.toString().startsWith(seed.request.delivery_date);
                return (
                  request.requested_by === seed.request.requested_by &&
                  deliveryMatch &&
                  toNumber(request.total_estimated) === seed.request.total_estimated
                );
              })
            )
            .map((request) => request.id) ?? [];

        if (requestIdsToDelete.length > 0) {
          const { error: deleteItemsError, count: deletedItemsCount } = await supabase
            .from('purchase_request_items')
            .delete()
            .in('request_id', requestIdsToDelete)
            .select('id');

          if (deleteItemsError) throw deleteItemsError;
          removedPurchaseRequestItems += deletedItemsCount ?? 0;

          const { error: deleteRequestsError, count: deletedRequestsCount } = await supabase
            .from('project_purchase_requests')
            .delete()
            .in('id', requestIdsToDelete)
            .select('id');

          if (deleteRequestsError) throw deleteRequestsError;
          removedPurchaseRequests += deletedRequestsCount ?? 0;
        }

        // Financial entries
        const { error: deleteFinancialsError, count: deletedFinancialsCount } = await supabase
          .from('project_financial_entries')
          .delete()
          .eq('project_id', projectId)
          .in(
            'category',
            seedData.financialEntries.map((entry) => entry.category)
          )
          .select('id');

        if (deleteFinancialsError) throw deleteFinancialsError;
        removedFinancialEntries += deletedFinancialsCount ?? 0;

        // Budget items
        const { error: deleteBudgetItemsError, count: deletedBudgetItemsCount } = await supabase
          .from('project_budget_items')
          .delete()
          .eq('project_id', projectId)
          .in(
            'category',
            seedData.budgetItems.map((item) => item.category)
          )
          .select('id');

        if (deleteBudgetItemsError) throw deleteBudgetItemsError;
        removedBudgetItems += deletedBudgetItemsCount ?? 0;

        // Phases (only those we may have inserted)
        const phaseNames = seedData.phases.map((phase) => phase.phase_name);
        const { error: deletePhasesError, count: deletedPhasesCount } = await supabase
          .from('project_phases')
          .delete()
          .eq('project_id', projectId)
          .in('phase_name', phaseNames)
          .select('id');

        if (deletePhasesError && deletePhasesError.code !== 'PGRST116') {
          throw deletePhasesError;
        }
        removedPhases += deletedPhasesCount ?? 0;

        // Reset totals
        const { error: resetTotalsError } = await supabase
          .from('projects')
          .update({
            budget_total: 0,
            total_spent: 0,
          })
          .eq('id', projectId);

        if (resetTotalsError) throw resetTotalsError;
      }

      await invalidateQueries(queryClient);

      toast({
        title: 'Demo data removed',
        description: `Deleted ${removedBudgetItems} budget items, ${removedFinancialEntries} financial entries and ${removedPurchaseRequests} purchase requests across target projects.`,
      });
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err && err.message
          ? String(err.message)
          : 'Failed to remove demo data';
      console.error('[demo-data] Removal failed:', err);
      toast({
        title: 'Error removing demo data',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return {
    generateDemoData,
    clearDemoData,
    isGenerating,
    isClearing,
  };
}

async function shouldSkipProject(projectId: string): Promise<boolean> {
  const { data: existingBudgetItems, error: budgetItemsError } = await supabase
    .from('project_budget_items')
    .select('id')
    .eq('project_id', projectId)
    .limit(1);

  if (budgetItemsError) throw budgetItemsError;
  return (existingBudgetItems?.length ?? 0) > 0;
}

async function seedProject(params: {
  project: ExistingProjectRow;
  seedData: ProjectSeedDefinition;
  userId: string;
  userName: string;
  ownerColumnSupported: boolean;
  accessRoleSupported: boolean;
  summary: SeedSummary;
}) {
  const {
    project,
    seedData,
    userId,
    userName,
    ownerColumnSupported,
    accessRoleSupported,
    summary,
  } = params;

  const projectId = project.id;

  if (ownerColumnSupported && !project.owner_id) {
    const { error: updateOwnerError } = await supabase
      .from('projects')
      .update({ owner_id: userId })
      .eq('id', projectId);

    if (updateOwnerError) {
      const code = (updateOwnerError as { code?: string }).code;
      if (code !== 'PGRST204' && code !== '42703') {
        throw updateOwnerError;
      }
    }
  }

  if (!project.manager) {
    const { error: updateManagerError } = await supabase
      .from('projects')
      .update({ manager: userName })
      .eq('id', projectId);

    if (updateManagerError) throw updateManagerError;
  }

  const { data: membershipRows, error: membershipError } = await supabase
    .from('project_team_members')
    .select(accessRoleSupported ? 'id, access_role' : 'id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .limit(1);

  if (membershipError) throw membershipError;

  const existingMembership = (membershipRows as any as ProjectTeamMembershipRow[] | null)?.[0] ?? null;

  if (!existingMembership) {
    const memberInsert: Database['public']['Tables']['project_team_members']['Insert'] = {
      project_id: projectId,
      user_name: userName,
      role: 'Project Manager',
      email: userId ? (await supabase.auth.getUser()).data.user?.email ?? null : null,
    };

    const { error: insertMembershipError } = await supabase
      .from('project_team_members')
      .insert(memberInsert);

    if (insertMembershipError) {
      const code = (insertMembershipError as { code?: string }).code;
      if (code !== 'PGRST204' && code !== '42703') {
        throw insertMembershipError;
      }
    }
  }

  if (accessRoleSupported) {
    const { error: updateAccessRoleError } = await supabase
      .from('project_team_members')
      .update({ access_role: 'project_manager' })
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (updateAccessRoleError) {
      const code = (updateAccessRoleError as { code?: string }).code;
      if (code !== 'PGRST204' && code !== '42703') {
        throw updateAccessRoleError;
      }
    }
  }

  const { data: existingPhases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id, phase_name')
    .eq('project_id', projectId)
    .eq('type', 'budget'); // Only check for budget phases in budget demo data

  if (phasesError) throw phasesError;

  const phaseMap = new Map<string, string>();
  existingPhases?.forEach((phase) => phaseMap.set(phase.phase_name, phase.id));

  const phasesToInsert: ProjectPhaseInsert[] = seedData.phases
    .filter((phase) => !phaseMap.has(phase.phase_name))
    .map((phase) => ({
      phase_name: phase.phase_name,
      start_date: phase.start_date,
      end_date: phase.end_date,
      status: phase.status,
      budget_allocated: phase.budget_allocated,
      budget_spent: phase.budget_spent,
      progress_percentage: phase.progress_percentage,
      project_id: projectId,
      type: (phase.start_date ? 'schedule' : 'budget') as 'schedule' | 'budget', // Set type based on dates
    }));

  if (phasesToInsert.length > 0) {
    const { data: insertedPhases, error: insertPhasesError } = await supabase
      .from('project_phases')
      .insert(phasesToInsert)
      .select();

    if (insertPhasesError) throw insertPhasesError;

    insertedPhases?.forEach((phase) => phaseMap.set(phase.phase_name, phase.id));
    summary.phases += insertedPhases?.length ?? 0;
  }

  const budgetItemsToInsert: BudgetItemInsert[] = seedData.budgetItems.map((item) => ({
    category: item.category,
    description: item.description,
    budgeted_amount: item.budgetedAmount,
    actual_amount: item.actualAmount,
    project_id: projectId,
    phase_id: item.phaseName ? phaseMap.get(item.phaseName) ?? null : null,
  }));

  const { data: insertedBudgetItems, error: insertBudgetItemsError } = await supabase
    .from('project_budget_items')
    .insert(budgetItemsToInsert)
    .select();

  if (insertBudgetItemsError) throw insertBudgetItemsError;
  summary.budgetItems += insertedBudgetItems?.length ?? 0;

  const financialEntriesToInsert: FinancialEntryInsert[] = seedData.financialEntries.map(
    (entry) => ({
      entry_type: entry.entry_type,
      category: entry.category,
      amount: entry.amount,
      date: entry.date,
      description: entry.description,
      payment_method: entry.payment_method,
      recipient_payer: entry.recipient_payer,
      reference: entry.reference,
      currency: entry.currency,
      unit: entry.unit,
      quantity: entry.quantity,
      price_per_unit: entry.price_per_unit,
      project_id: projectId,
    })
  );

  const { data: insertedFinancialEntries, error: insertFinancialError } = await supabase
    .from('project_financial_entries')
    .insert(financialEntriesToInsert)
    .select();

  if (insertFinancialError) throw insertFinancialError;
  summary.financialEntries += insertedFinancialEntries?.length ?? 0;

  for (const purchaseRequest of seedData.purchaseRequests) {
    const purchaseRequestPayload: PurchaseRequestInsert = {
      ...purchaseRequest.request,
      project_id: projectId,
    };

    const { data: insertedRequest, error: insertRequestError } = await supabase
      .from('project_purchase_requests')
      .insert(purchaseRequestPayload)
      .select()
      .single();

    if (insertRequestError) throw insertRequestError;
    if (!insertedRequest) throw new Error('Failed to create purchase request');

    summary.purchaseRequests += 1;

    if (purchaseRequest.items.length > 0) {
      const itemsToInsert: PurchaseRequestItemInsert[] = purchaseRequest.items.map((item) => ({
        ...item,
        request_id: insertedRequest.id,
      }));

      const { data: insertedItems, error: insertItemsError } = await supabase
        .from('purchase_request_items')
        .insert(itemsToInsert)
        .select();

      if (insertItemsError) throw insertItemsError;
      summary.purchaseRequestItems += insertedItems?.length ?? 0;
    }
  }

  const totalBudget = sum(seedData.budgetItems.map((item) => item.budgetedAmount));
  const totalExpenses = sum(
    seedData.financialEntries
      .filter((entry) => entry.entry_type === 'expense')
      .map((entry) => entry.amount)
  );

  const { error: updateProjectTotalsError } = await supabase
    .from('projects')
    .update({
      budget_total: totalBudget,
      total_spent: totalExpenses,
    })
    .eq('id', projectId);

  if (updateProjectTotalsError) throw updateProjectTotalsError;
}

async function invalidateQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['budget_items'] }),
    queryClient.invalidateQueries({ queryKey: ['financial_entries'] }),
    queryClient.invalidateQueries({ queryKey: ['projects'] }),
    queryClient.invalidateQueries({ queryKey: ['project_phases'] }),
    queryClient.invalidateQueries({ queryKey: ['purchase_requests'] }),
    queryClient.invalidateQueries({ queryKey: ['purchase_request_items'] }),
  ]);
}

function buildSummaryMessage(summary: SeedSummary): string {
  const parts: string[] = [];

  if (summary.projectsSeeded > 0) {
    parts.push(
      `Seeded ${summary.projectsSeeded} project${summary.projectsSeeded === 1 ? '' : 's'}`
    );
  }

  if (summary.projectsSkipped.length > 0) {
    parts.push(`Skipped ${summary.projectsSkipped.length} (already populated)`);
  }

  if (summary.projectsMissing.length > 0) {
    parts.push(`Missing: ${summary.projectsMissing.join(', ')}`);
  }

  if (summary.budgetItems > 0 || summary.financialEntries > 0) {
    parts.push(
      `Inserted ${summary.budgetItems} budget items, ${summary.financialEntries} financial entries`
    );
  }

  if (summary.purchaseRequests > 0) {
    parts.push(
      `Added ${summary.purchaseRequests} purchase requests with ${summary.purchaseRequestItems} items`
    );
  }

  return parts.join(' • ') || 'No changes were made.';
}

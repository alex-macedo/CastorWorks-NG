/**
 * Centralized Template Configuration for Demo Data
 *
 * This file contains all template arrays used by seedActions.ts for generating
 * consistent demo data across the application. Templates are organized by domain
 * and include proper TypeScript types for compile-time safety.
 *
 * All values are in English (primary language) and use i18n keys for UI translation.
 */

// ============================================================================
// Organization Templates (Clients, Suppliers, Contractors)
// ============================================================================

export interface ClientTemplate {
  name: string;
  email: string;
  phone: string;
  location: string;
  status: 'Active' | 'Inactive';
  avatar_initial: string;
}

export const CLIENT_TEMPLATES: ClientTemplate[] = [
  {
    name: 'Construtora Acme Ltda',
    email: 'contato@acme.com.br',
    phone: '+55 11 98765-4321',
    location: 'São Paulo, SP',
    status: 'Active',
    avatar_initial: 'AC',
  },
  {
    name: 'Construtora Metro S.A.',
    email: 'info@metrobuilders.com.br',
    phone: '+55 21 98765-4321',
    location: 'Rio de Janeiro, RJ',
    status: 'Active',
    avatar_initial: 'MB',
  },
];

export interface SupplierTemplate {
  name: string;
  category: string;
  rating: number;
  orders_completed: number;
  contact_email: string;
  contact_phone: string;
}

export const SUPPLIER_TEMPLATES: SupplierTemplate[] = [
  {
    name: 'Aço e Concreto Materiais',
    category: 'Materiais',
    rating: 4.5,
    orders_completed: 45,
    contact_email: 'vendas@aco-concreto.com.br',
    contact_phone: '+55 11 91234-5678',
  },
  {
    name: 'Soluções Premium em Ferragens',
    category: 'Ferragens',
    rating: 4.8,
    orders_completed: 120,
    contact_email: 'info@premiumferragens.com.br',
    contact_phone: '+55 21 91234-5678',
  },
  {
    name: 'Componentes Elétricos Ltda',
    category: 'Elétrica',
    rating: 4.3,
    orders_completed: 78,
    contact_email: 'contato@componenteseletricos.com.br',
    contact_phone: '+55 31 91234-5678',
  },
  {
    name: 'Especialistas em Hidráulica',
    category: 'Hidráulica',
    rating: 4.6,
    orders_completed: 92,
    contact_email: 'vendas@hidraulicaexperts.com.br',
    contact_phone: '+55 41 91234-5678',
  },
  {
    name: 'Tintas e Acabamentos Pro',
    category: 'Acabamento',
    rating: 4.4,
    orders_completed: 65,
    contact_email: 'info@tintaspro.com.br',
    contact_phone: '+55 48 91234-5678',
  },
  {
    name: 'Materiais para Telhados Plus',
    category: 'Cobertura',
    rating: 4.7,
    orders_completed: 55,
    contact_email: 'contato@telhadosplus.com.br',
    contact_phone: '+55 85 91234-5678',
  },
];

export interface ContractorTemplate {
  name: string;
  specialization: string;
  rating: number;
  company: string;
  phone: string;
}

export const CONTRACTOR_TEMPLATES: ContractorTemplate[] = [
  {
    name: 'Eletricista Especialista',
    specialization: 'Electrical',
    rating: 4.7,
    company: 'Soluções Elétricas Ltda',
    phone: '+55 11 99876-5432',
  },
  {
    name: 'Encanador Profissional',
    specialization: 'Plumbing',
    rating: 4.5,
    company: 'Hidráulica Avançada',
    phone: '+55 21 99876-5432',
  },
  {
    name: 'Pintor Experiente',
    specialization: 'Painting',
    rating: 4.6,
    company: 'Pintura Premium',
    phone: '+55 31 99876-5432',
  },
  {
    name: 'Carpinteiro Mestre',
    specialization: 'Carpentry',
    rating: 4.8,
    company: 'Carpintaria Artesanal',
    phone: '+55 41 99876-5432',
  },
];

// ============================================================================
// Project Templates
// ============================================================================

export interface ProjectTemplate {
  name: string;
  description: string;
  location: string;
  budget: number;
  start_date: string;
  estimated_duration_weeks: number;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    name: 'Corporate Office Building',
    description: 'Modern office complex with sustainable features',
    location: 'São Paulo, SP',
    budget: 5000000,
    start_date: '2024-01-15',
    estimated_duration_weeks: 52,
  },
  {
    name: 'Residential Complex',
    description: 'Mixed-use residential development with amenities',
    location: 'Rio de Janeiro, RJ',
    budget: 3500000,
    start_date: '2024-02-01',
    estimated_duration_weeks: 48,
  },
  {
    name: 'Shopping Center Renovation',
    description: 'Complete renovation and modernization',
    location: 'Belo Horizonte, MG',
    budget: 2800000,
    start_date: '2024-03-10',
    estimated_duration_weeks: 36,
  },
  {
    name: 'Hotel Development',
    description: '5-star hotel with conference facilities',
    location: 'Salvador, BA',
    budget: 8500000,
    start_date: '2024-01-20',
    estimated_duration_weeks: 60,
  },
];

export const PHASE_NAMES = [
  'Foundation',
  'Structure',
  'Sealing',
  'Installations',
  'Interiors',
  'Finishing',
  'Landscaping',
];

export interface ActivityTemplate {
  name: string;
  description: string;
}

export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    name: 'Site Preparation',
    description: 'Clear and prepare construction site',
  },
  {
    name: 'Excavation',
    description: 'Excavate foundation area',
  },
  {
    name: 'Foundation Pouring',
    description: 'Pour concrete foundation',
  },
  {
    name: 'Structural Framing',
    description: 'Install structural steel and columns',
  },
  {
    name: 'Exterior Walls',
    description: 'Install exterior wall systems',
  },
  {
    name: 'Roofing',
    description: 'Install roof structure and covering',
  },
  {
    name: 'Electrical Installation',
    description: 'Install electrical systems',
  },
  {
    name: 'Plumbing Installation',
    description: 'Install plumbing systems',
  },
  {
    name: 'HVAC Installation',
    description: 'Install heating and cooling systems',
  },
  {
    name: 'Interior Walls',
    description: 'Install interior partition walls',
  },
  {
    name: 'Flooring',
    description: 'Install flooring materials',
  },
  {
    name: 'Painting',
    description: 'Paint all interior and exterior surfaces',
  },
  {
    name: 'Finishing Work',
    description: 'Install fixtures and final details',
  },
];

export interface MilestoneTemplate {
  name: string;
  description: string;
  order: number;
}

export const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
  {
    name: 'Site Mobilization',
    description: 'Equipment and team mobilization complete',
    order: 1,
  },
  {
    name: 'Foundation Complete',
    description: 'All foundation work completed and inspected',
    order: 2,
  },
  {
    name: 'Structural Frame Complete',
    description: 'Main structural elements completed',
    order: 3,
  },
  {
    name: 'Envelope Closed',
    description: 'Building envelope sealed and weathertight',
    order: 4,
  },
  {
    name: 'MEP Rough-In Complete',
    description: 'Mechanical, electrical, plumbing rough-in done',
    order: 5,
  },
  {
    name: '50% Complete',
    description: 'Project at halfway point',
    order: 6,
  },
  {
    name: 'Finishes Installed',
    description: 'All interior finishes installed',
    order: 7,
  },
  {
    name: 'Substantial Completion',
    description: 'Project substantially complete, minor items remaining',
    order: 8,
  },
  {
    name: 'Project Completion',
    description: 'All work completed and final acceptance',
    order: 9,
  },
];

// ============================================================================
// Resource Templates
// ============================================================================

export interface ResourceTemplate {
  name: string;
  type: 'labor' | 'equipment' | 'material' | 'subcontractor';
  unit_cost: number;
}

export const LABOR_TEMPLATES: ResourceTemplate[] = [
  { name: 'Senior Architect', type: 'labor', unit_cost: 250 },
  { name: 'Junior Architect', type: 'labor', unit_cost: 120 },
  { name: 'Draftsperson', type: 'labor', unit_cost: 80 },
  { name: 'Project Manager', type: 'labor', unit_cost: 180 },
  { name: 'Site Supervisor', type: 'labor', unit_cost: 150 },
];

export const EQUIPMENT_TEMPLATES: ResourceTemplate[] = [
  { name: 'Excavator', type: 'equipment', unit_cost: 500 },
  { name: 'Crane', type: 'equipment', unit_cost: 800 },
  { name: 'Concrete Mixer', type: 'equipment', unit_cost: 300 },
  { name: 'Scaffolding', type: 'equipment', unit_cost: 150 },
  { name: 'Power Tools Set', type: 'equipment', unit_cost: 200 },
];

export const MATERIAL_TEMPLATES: ResourceTemplate[] = [
  { name: 'Steel Reinforcement', type: 'material', unit_cost: 2000 },
  { name: 'Concrete', type: 'material', unit_cost: 400 },
  { name: 'Bricks', type: 'material', unit_cost: 500 },
  { name: 'Cement', type: 'material', unit_cost: 50 },
  { name: 'Sand', type: 'material', unit_cost: 100 },
];

export const SUBCONTRACTOR_TEMPLATES: ResourceTemplate[] = [
  { name: 'Electrical Contractor', type: 'subcontractor', unit_cost: 5000 },
  { name: 'Plumbing Contractor', type: 'subcontractor', unit_cost: 4000 },
  { name: 'Air Conditioning Contractor', type: 'subcontractor', unit_cost: 6000 },
  { name: 'Roofing Contractor', type: 'subcontractor', unit_cost: 3500 },
];

export const MATERIAL_GROUP_TEMPLATES = [
  'Concrete & Aggregates',
  'Steel & Reinforcement',
  'Masonry',
  'Finishing Materials',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Safety Equipment',
];

// ============================================================================
// Financial Templates
// ============================================================================

export const BUDGET_CATEGORIES = [
  'Labor',
  'Materials',
  'Equipment',
  'Subcontracted',
  'General Expenses',
  'Taxes and Fees',
  'Contingency',
];

export interface CurrencyTemplate {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCY_TEMPLATES: CurrencyTemplate[] = [
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

export interface ExchangeRateTemplate {
  from_currency: string;
  to_currency: string;
  rate: number;
}

export const EXCHANGE_RATE_TEMPLATES: ExchangeRateTemplate[] = [
  { from_currency: 'USD', to_currency: 'BRL', rate: 5.15 },
  { from_currency: 'EUR', to_currency: 'BRL', rate: 5.65 },
  { from_currency: 'GBP', to_currency: 'BRL', rate: 6.45 },
  { from_currency: 'JPY', to_currency: 'BRL', rate: 0.037 },
  { from_currency: 'BRL', to_currency: 'USD', rate: 0.194 },
];

// ============================================================================
// Meeting & Communication Templates
// ============================================================================

export const MEETING_TYPES = [
  'Initial Consultation',
  'Design Review',
  'Progress Update',
  'Client Feedback',
  'Final Presentation',
];

export const AGENDA_ITEM_TEMPLATES = [
  'Review project progress and timeline',
  'Discuss budget and financial status',
  'Address any challenges or risks',
  'Plan next steps and deliverables',
  'Review design alternatives',
  'Stakeholder feedback and approvals',
];

export const DECISION_TEMPLATES = [
  'Approved material selection for Phase 2',
  'Confirmed timeline adjustment due to weather',
  'Approved budget increase for unforeseen conditions',
  'Decision to proceed with alternative design',
  'Approved final design specifications',
  'Confirmed project completion date',
];

export const ACTION_ITEM_TEMPLATES = [
  'Prepare detailed cost estimates for Phase 2',
  'Schedule site inspection with quality team',
  'Obtain client approval for design changes',
  'Coordinate with subcontractors for delivery',
  'Prepare progress report for stakeholders',
  'Update project timeline and critical path',
  'Review and update risk assessment',
  'Prepare material purchase orders',
];

export const DOCUMENT_TYPE_TEMPLATES = [
  'Contract',
  'Permit',
  'Drawing',
  'Specification',
  'Report',
  'Invoice',
  'Certificate',
];

// ============================================================================
// Portal & Team Templates
// ============================================================================

export const TEAM_TITLES = [
  'PM Lead',
  'Site Superintendent',
  'Design Coordinator',
  'Project Supervisor',
  'Quality Lead',
];

export const TEAM_ROLES = [
  'project_manager',
  'manager',
  'manager',
  'supervisor',
  'inspector',
];

export const CLIENT_PORTAL_TASK_TEMPLATES = [
  {
    title: 'Review design drawings',
    description: 'Please review the proposed design drawings and provide feedback',
    priority: 'high' as const,
  },
  {
    title: 'Approve material samples',
    description: 'Please approve the proposed materials and finishes',
    priority: 'high' as const,
  },
  {
    title: 'Sign approval documents',
    description: 'Please sign the required approval documents',
    priority: 'medium' as const,
  },
  {
    title: 'Schedule site visit',
    description: 'Please schedule a visit to see the current construction progress',
    priority: 'medium' as const,
  },
  {
    title: 'Provide access information',
    description: 'Please provide access codes and contact information',
    priority: 'low' as const,
  },
];

export const SCHEDULE_EVENT_TYPES = [
  'Meeting',
  'Site Inspection',
  'Delivery',
  'Inspection',
  'Milestone',
  'Holiday',
  'Maintenance',
];

// ============================================================================
// Architect Page Templates
// ============================================================================

export interface ArchitectTaskTemplate {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export const ARCHITECT_TASK_TEMPLATES: ArchitectTaskTemplate[] = [
  {
    title: 'Prepare site survey',
    description: 'Complete site survey and measurements',
    priority: 'high',
  },
  {
    title: 'Review client requirements',
    description: 'Document all client requirements and preferences',
    priority: 'high',
  },
  {
    title: 'Create initial sketches',
    description: 'Develop initial design concepts',
    priority: 'high',
  },
  {
    title: 'Prepare 3D models',
    description: 'Create detailed 3D models for presentation',
    priority: 'medium',
  },
  {
    title: 'Generate technical drawings',
    description: 'Produce construction documents',
    priority: 'medium',
  },
  {
    title: 'Coordinate with engineers',
    description: 'Work with structural and MEP engineers',
    priority: 'medium',
  },
  {
    title: 'Prepare presentation materials',
    description: 'Create visual presentations for client review',
    priority: 'medium',
  },
  {
    title: 'Site inspection',
    description: 'Conduct site visit for quality assurance',
    priority: 'low',
  },
];

export const ARCHITECT_COMMENT_TEMPLATES = [
  'Great work on the design! A few minor adjustments needed.',
  'Please ensure all dimensions are accurate according to site survey.',
  'Consider adding more natural light in this area.',
  'Excellent attention to detail in the finishes specification.',
  'We need to coordinate with structural engineers on this detail.',
  'This looks good, ready for client review.',
];

export const OPPORTUNITY_TYPES = [
  'Residential Building',
  'Commercial Complex',
  'Office Building',
  'Mixed-Use Development',
  'Renovation Project',
];

export const OPPORTUNITY_STAGES = [
  'lead',
  'prospect',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
];

// ============================================================================
// Status & System Templates
// ============================================================================

export const RESOURCE_TYPES = ['labor', 'equipment', 'material', 'subcontractor'];

export const CREW_NAMES = [
  'John Doe',
  'Jane Smith',
  'Bob Johnson',
  'Alice Williams',
  'Charlie Brown',
];

export const PROJECT_TYPES = [
  'Residential Building',
  'Commercial Complex',
  'Office Building',
  'Mixed-Use Development',
  'Renovation Project',
];

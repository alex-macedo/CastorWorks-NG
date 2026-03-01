export interface EpicMetadata {
  title: string;
  category: string;
  expandedGoal: string;
  totalStories: number;
  estimatedEffort: string;
}

export const EPIC_METADATA: Record<number, EpicMetadata> = {
  0: {
    title: "Epic 0: RLS Policy Hardening & Validation",
    category: "Security",
    expandedGoal: "Comprehensive Row Level Security validation across all procurement tables to ensure tenant data isolation and prevent cross-project data leaks. Security prerequisite before Epic 1.",
    totalStories: 1,
    estimatedEffort: "2-3 hours",
  },
  1: {
    title: "Epic 1: Database Schema & Quote Request Automation",
    category: "Foundation",
    expandedGoal: "Establish the database foundation for procurement automation by creating new tables and extending suppliers with contact preferences. Implement core quote request workflow for automated supplier communication via Email/WhatsApp.",
    totalStories: 10,
    estimatedEffort: "20-30 hours",
  },
  2: {
    title: "Epic 2: Customer Approval Portal & Workflow",
    category: "Customer Experience",
    expandedGoal: "Create a mobile-first customer approval portal with token-based secure access. Allow customers to review and approve quotes without account creation, reducing coordination overhead and accelerating quote-to-PO cycle.",
    totalStories: 10,
    estimatedEffort: "25-35 hours",
  },
  3: {
    title: "Epic 3: Purchase Order Generation & Supplier Communication",
    category: "Automation",
    expandedGoal: "Automate purchase order creation from approved quotes with PDF generation and multi-channel supplier delivery. Build comprehensive supplier portal for bid submission and order tracking.",
    totalStories: 10,
    estimatedEffort: "30-40 hours",
  },
  4: {
    title: "Epic 4: Delivery Confirmation & Payment Processing",
    category: "Operations",
    expandedGoal: "Create mobile-optimized supervisor portal for delivery verification with photo uploads and item-by-item confirmation. Implement payment workflow with automated invoice matching and payment scheduling.",
    totalStories: 10,
    estimatedEffort: "25-35 hours",
  },
};

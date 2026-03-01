/**
 * Type definitions for the Contacts module
 * Used for team member and contact management
 */

export interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  city: string | null;
  zip_code: string | null;
  role: string | null;
  company: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactFormData {
  full_name: string;
  email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  zip_code?: string;
  role?: string;
  company?: string;
  notes?: string;
}

export interface PotentialTeamMember {
  source: 'auth' | 'contact';
  id: string;
  name: string;
  email: string | null;
  role: string;
  avatar_url: string | null;
}

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string | null;
  user_name: string;
  role: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  sort_order: number;
  is_visible_to_client: boolean;
}

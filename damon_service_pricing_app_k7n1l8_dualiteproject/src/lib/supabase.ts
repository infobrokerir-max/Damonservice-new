import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Tables = {
  categories: {
    Row: {
      id: string;
      name: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      is_active?: boolean;
    };
    Update: {
      name?: string;
      is_active?: boolean;
    };
  };
  devices: {
    Row: {
      id: string;
      category_id: string;
      model_name: string;
      factory_price_eur: number;
      length: number;
      weight: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      category_id: string;
      model_name: string;
      factory_price_eur: number;
      length: number;
      weight: number;
      is_active?: boolean;
    };
    Update: {
      model_name?: string;
      factory_price_eur?: number;
      length?: number;
      weight?: number;
      is_active?: boolean;
    };
  };
  global_settings: {
    Row: {
      id: string;
      discount_multiplier: number;
      freight_rate_per_length_eur: number;
      customs_numerator: number;
      customs_denominator: number;
      warranty_rate: number;
      internal_commission_factor: number;
      company_cost_factor: number;
      profit_factor: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      discount_multiplier?: number;
      freight_rate_per_length_eur?: number;
      customs_numerator?: number;
      customs_denominator?: number;
      warranty_rate?: number;
      internal_commission_factor?: number;
      company_cost_factor?: number;
      profit_factor?: number;
      is_active?: boolean;
    };
    Update: {
      discount_multiplier?: number;
      freight_rate_per_length_eur?: number;
      customs_numerator?: number;
      customs_denominator?: number;
      warranty_rate?: number;
      internal_commission_factor?: number;
      company_cost_factor?: number;
      profit_factor?: number;
      is_active?: boolean;
    };
  };
  projects: {
    Row: {
      id: string;
      user_id: string;
      name: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      name: string;
    };
    Update: {
      name?: string;
    };
  };
  inquiry_logs: {
    Row: {
      id: string;
      user_id: string;
      device_id: string;
      project_id: string;
      category_name_snapshot: string;
      model_name_snapshot: string;
      sell_price_eur_snapshot: number;
      status: 'pending' | 'approved' | 'rejected';
      admin_response_time: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      device_id: string;
      project_id: string;
      category_name_snapshot: string;
      model_name_snapshot: string;
      sell_price_eur_snapshot: number;
      status?: 'pending' | 'approved' | 'rejected';
      admin_response_time?: string | null;
    };
    Update: {
      status?: 'pending' | 'approved' | 'rejected';
      admin_response_time?: string | null;
    };
  };
  comments: {
    Row: {
      id: string;
      project_id: string;
      user_id: string;
      user_full_name: string;
      role: 'admin' | 'employee';
      content: string;
      is_read: boolean;
      created_at: string;
    };
    Insert: {
      id?: string;
      project_id: string;
      user_id: string;
      user_full_name: string;
      role: 'admin' | 'employee';
      content: string;
      is_read?: boolean;
    };
    Update: {
      is_read?: boolean;
    };
  };
};

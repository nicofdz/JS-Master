import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug: Verificar configuración
console.log('=== SUPABASE CLIENT INITIALIZATION ===')
console.log('URL:', supabaseUrl)
console.log('Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...')

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not defined')
}
if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Cliente para Server Components
export const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: number
          name: string
          address: string | null
          total_floors: number | null
          units_per_floor: number | null
          start_date: string | null
          estimated_completion: string | null
          actual_completion: string | null
          status: string
          progress: number | null
          budget: number | null
          current_cost: number | null
          client_name: string | null
          client_phone: string | null
          client_email: string | null
          notes: string | null
          created_by: string | null
          plan_pdf: string | null
          plan_image_url: string | null
          plan_uploaded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          address?: string | null
          total_floors?: number | null
          units_per_floor?: number | null
          start_date?: string | null
          estimated_completion?: string | null
          actual_completion?: string | null
          status?: string
          progress?: number | null
          budget?: number | null
          current_cost?: number | null
          client_name?: string | null
          client_phone?: string | null
          client_email?: string | null
          notes?: string | null
          created_by?: string | null
          plan_pdf?: string | null
          plan_image_url?: string | null
          plan_uploaded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          address?: string | null
          total_floors?: number | null
          units_per_floor?: number | null
          start_date?: string | null
          estimated_completion?: string | null
          actual_completion?: string | null
          status?: string
          progress?: number | null
          budget?: number | null
          current_cost?: number | null
          client_name?: string | null
          client_phone?: string | null
          client_email?: string | null
          notes?: string | null
          created_by?: string | null
          plan_pdf?: string | null
          plan_image_url?: string | null
          plan_uploaded_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      floors: {
        Row: {
          id: number
          project_id: number
          floor_number: number
          status: string
          floor_height: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          project_id: number
          floor_number: number
          status?: string
          floor_height?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          project_id?: number
          floor_number?: number
          status?: string
          floor_height?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      apartments: {
        Row: {
          id: number
          floor_id: number
          apartment_number: string
          apartment_type: string | null
          area: number | null
          floor_area: number | null
          balcony_area: number | null
          parking_spaces: number | null
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          floor_id: number
          apartment_number: string
          apartment_type?: string | null
          area?: number | null
          floor_area?: number | null
          balcony_area?: number | null
          parking_spaces?: number | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          floor_id?: number
          apartment_number?: string
          apartment_type?: string | null
          area?: number | null
          floor_area?: number | null
          balcony_area?: number | null
          parking_spaces?: number | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      activity_templates: {
        Row: {
          id: number
          name: string
          category: string
          estimated_hours: number
          sort_order: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          category: string
          estimated_hours?: number
          sort_order?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          category?: string
          estimated_hours?: number
          sort_order?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      apartment_activities: {
        Row: {
          id: number
          apartment_id: number
          activity_template_id: number | null
          status: string
          progress: number | null
          start_date: string | null
          end_date: string | null
          estimated_hours: number | null
          actual_hours: number | null
          team_id: number | null
          supervisor_name: string | null
          assigned_to: string | null
          priority: string | null
          estimated_cost: number | null
          actual_cost: number | null
          quality_rating: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          apartment_id: number
          activity_template_id?: number | null
          status?: string
          progress?: number | null
          start_date?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          team_id?: number | null
          supervisor_name?: string | null
          assigned_to?: string | null
          priority?: string | null
          estimated_cost?: number | null
          actual_cost?: number | null
          quality_rating?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          apartment_id?: number
          activity_template_id?: number | null
          status?: string
          progress?: number | null
          start_date?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          team_id?: number | null
          supervisor_name?: string | null
          assigned_to?: string | null
          priority?: string | null
          estimated_cost?: number | null
          actual_cost?: number | null
          quality_rating?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: number
          name: string
          specialty: string
          supervisor_name: string
          supervisor_phone: string | null
          supervisor_id: string | null
          description: string | null
          max_capacity: number | null
          current_workload: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          specialty: string
          supervisor_name: string
          supervisor_phone?: string | null
          supervisor_id?: string | null
          description?: string | null
          max_capacity?: number | null
          current_workload?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          specialty?: string
          supervisor_name?: string
          supervisor_phone?: string | null
          supervisor_id?: string | null
          description?: string | null
          max_capacity?: number | null
          current_workload?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      materials: {
        Row: {
          id: number
          name: string
          category: string
          unit: string
          unit_cost: number
          supplier: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          category: string
          unit: string
          unit_cost: number
          supplier?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          category?: string
          unit?: string
          unit_cost?: number
          supplier?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: number
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          related_table: string | null
          related_id: number | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          title: string
          message: string
          type: string
          is_read?: boolean
          related_table?: string | null
          related_id?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          related_table?: string | null
          related_id?: number | null
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      project_progress: {
        Row: {
          id: number
          name: string
          address: string | null
          total_floors: number | null
          units_per_floor: number | null
          start_date: string | null
          estimated_completion: string | null
          actual_completion: string | null
          status: string
          progress_percentage: number | null
          floors_created: number
          apartments_created: number
          activities_completed: number
          total_activities: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
      }
      floor_progress: {
        Row: {
          id: number
          project_id: number
          floor_number: number
          status: string
          project_name: string
          apartments_created: number
          apartments_completed: number
          total_activities: number
          activities_completed: number
          progress_percentage: number | null
        }
      }
      apartment_progress: {
        Row: {
          id: number
          floor_id: number
          apartment_number: string
          apartment_type: string | null
          status: string
          floor_number: number
          project_name: string
          total_activities: number
          activities_completed: number
          progress_percentage: number | null
        }
      }
    }
  }
}
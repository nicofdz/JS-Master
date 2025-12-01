export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_materials: {
        Row: {
          apartment_activity_id: number | null
          created_at: string | null
          id: number
          material_id: number | null
          quantity: number
          total_cost: number
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          apartment_activity_id?: number | null
          created_at?: string | null
          id?: number
          material_id?: number | null
          quantity: number
          total_cost: number
          unit_cost: number
          updated_at?: string | null
        }
        Update: {
          apartment_activity_id?: number | null
          created_at?: string | null
          id?: number
          material_id?: number | null
          quantity?: number
          total_cost?: number
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_stock_view"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "activity_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      // ... otros types permanecen igual
    }
  }
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

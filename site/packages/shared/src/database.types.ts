// ŹRÓDŁO PRAWDY schematu bazy (Supabase project xiwiaiuiwpgxattrxknn).
// Wygenerowane z żywej bazy (supabase gen types). NIE edytować ręcznie —
// po zmianach DDL przegeneruj i podmień. Wspólne dla web / panel / admin.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_user_notes: {
        Row: { author_email: string | null; body: string; created_at: string | null; id: string; user_id: string }
        Insert: { author_email?: string | null; body: string; created_at?: string | null; id?: string; user_id: string }
        Update: { author_email?: string | null; body?: string; created_at?: string | null; id?: string; user_id?: string }
        Relationships: []
      }
      amenities: {
        Row: { icon: string | null; name: string }
        Insert: { icon?: string | null; name: string }
        Update: { icon?: string | null; name?: string }
        Relationships: []
      }
      app_admins: {
        Row: { email: string }
        Insert: { email: string }
        Update: { email?: string }
        Relationships: []
      }
      catch_board_members: {
        Row: { board_id: string; created_at: string; email: string; status: string }
        Insert: { board_id: string; created_at?: string; email: string; status?: string }
        Update: { board_id?: string; created_at?: string; email?: string; status?: string }
        Relationships: [{ foreignKeyName: "catch_board_members_board_id_fkey"; columns: ["board_id"]; isOneToOne: false; referencedRelation: "catch_boards"; referencedColumns: ["id"] }]
      }
      catch_boards: {
        Row: { created_at: string; id: string; name: string; owner_id: string }
        Insert: { created_at?: string; id?: string; name: string; owner_id: string }
        Update: { created_at?: string; id?: string; name?: string; owner_id?: string }
        Relationships: []
      }
      catch_reports: {
        Row: { caught_on: string; created_at: string; fishery_id: string; hidden: boolean; id: string; length_cm: number | null; note: string | null; photo_url: string | null; species: string; spot_number: number | null; user_id: string; weight: number | null }
        Insert: { caught_on?: string; created_at?: string; fishery_id: string; hidden?: boolean; id?: string; length_cm?: number | null; note?: string | null; photo_url?: string | null; species: string; spot_number?: number | null; user_id: string; weight?: number | null }
        Update: { caught_on?: string; created_at?: string; fishery_id?: string; hidden?: boolean; id?: string; length_cm?: number | null; note?: string | null; photo_url?: string | null; species?: string; spot_number?: number | null; user_id?: string; weight?: number | null }
        Relationships: [{ foreignKeyName: "catch_reports_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
      claim_requests: {
        Row: { business_name: string | null; created_at: string; fishery_id: string; id: string; message: string | null; nip: string | null; phone: string | null; reviewed_at: string | null; reviewed_by: string | null; status: string; user_id: string }
        Insert: { business_name?: string | null; created_at?: string; fishery_id: string; id?: string; message?: string | null; nip?: string | null; phone?: string | null; reviewed_at?: string | null; reviewed_by?: string | null; status?: string; user_id: string }
        Update: { business_name?: string | null; created_at?: string; fishery_id?: string; id?: string; message?: string | null; nip?: string | null; phone?: string | null; reviewed_at?: string | null; reviewed_by?: string | null; status?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "claim_requests_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
      favorites: {
        Row: { created_at: string; fishery_id: string; user_id: string }
        Insert: { created_at?: string; fishery_id: string; user_id: string }
        Update: { created_at?: string; fishery_id?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "favorites_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
      fish_species: {
        Row: { name: string }
        Insert: { name: string }
        Update: { name?: string }
        Relationships: []
      }
      fisheries: {
        Row: { area_ha: number | null; available_spots: number; bathy_map_url: string | null; check_in_hour: number | null; city: string; claim_code: string | null; created_at: string; data_status: string; description: string | null; distance: number | null; email: string | null; extra_costs: Json; fish: string[]; google_photo_name: string | null; id: string; image_url: string | null; last_enriched_at: string | null; latitude: number; lead_days: number | null; location: string; longitude: number; max_nights: number | null; min_nights: number | null; name: string; nokill: boolean; open_hours: string | null; owner_id: string | null; phone: string | null; plan: string; premium: boolean; price_24h: number | null; price_day: number | null; price_from: number; price_night: number | null; price_tiers: Json; province: string; rating: number | null; record_weight: number | null; review_count: number | null; rules: string | null; season_end: string | null; season_start: string | null; source: string; spot_map_url: string | null; total_spots: number; types: string[]; updated_at: string; website: string | null }
        Insert: { area_ha?: number | null; available_spots?: number; bathy_map_url?: string | null; check_in_hour?: number | null; city: string; claim_code?: string | null; created_at?: string; data_status?: string; description?: string | null; distance?: number | null; email?: string | null; extra_costs?: Json; fish?: string[]; google_photo_name?: string | null; id: string; image_url?: string | null; last_enriched_at?: string | null; latitude: number; lead_days?: number | null; location: string; longitude: number; max_nights?: number | null; min_nights?: number | null; name: string; nokill?: boolean; open_hours?: string | null; owner_id?: string | null; phone?: string | null; plan?: string; premium?: boolean; price_24h?: number | null; price_day?: number | null; price_from: number; price_night?: number | null; price_tiers?: Json; province: string; rating?: number | null; record_weight?: number | null; review_count?: number | null; rules?: string | null; season_end?: string | null; season_start?: string | null; source?: string; spot_map_url?: string | null; total_spots?: number; types?: string[]; updated_at?: string; website?: string | null }
        Update: { area_ha?: number | null; available_spots?: number; bathy_map_url?: string | null; check_in_hour?: number | null; city?: string; claim_code?: string | null; created_at?: string; data_status?: string; description?: string | null; distance?: number | null; email?: string | null; extra_costs?: Json; fish?: string[]; google_photo_name?: string | null; id?: string; image_url?: string | null; last_enriched_at?: string | null; latitude?: number; lead_days?: number | null; location?: string; longitude?: number; max_nights?: number | null; min_nights?: number | null; name?: string; nokill?: boolean; open_hours?: string | null; owner_id?: string | null; phone?: string | null; plan?: string; premium?: boolean; price_24h?: number | null; price_day?: number | null; price_from?: number; price_night?: number | null; price_tiers?: Json; province?: string; rating?: number | null; record_weight?: number | null; review_count?: number | null; rules?: string | null; season_end?: string | null; season_start?: string | null; source?: string; spot_map_url?: string | null; total_spots?: number; types?: string[]; updated_at?: string; website?: string | null }
        Relationships: []
      }
      fishery_amenities: {
        Row: { amenity: string; fishery_id: string }
        Insert: { amenity: string; fishery_id: string }
        Update: { amenity?: string; fishery_id?: string }
        Relationships: [
          { foreignKeyName: "fishery_amenities_amenity_fkey"; columns: ["amenity"]; isOneToOne: false; referencedRelation: "amenities"; referencedColumns: ["name"] },
          { foreignKeyName: "fishery_amenities_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }
        ]
      }
      fishery_blocks: {
        Row: { created_at: string | null; created_by: string | null; fishery_id: string; id: string; name: string | null; phone: string | null; reason: string | null; user_id: string | null }
        Insert: { created_at?: string | null; created_by?: string | null; fishery_id: string; id?: string; name?: string | null; phone?: string | null; reason?: string | null; user_id?: string | null }
        Update: { created_at?: string | null; created_by?: string | null; fishery_id?: string; id?: string; name?: string | null; phone?: string | null; reason?: string | null; user_id?: string | null }
        Relationships: [{ foreignKeyName: "fishery_blocks_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
      fishery_fish: {
        Row: { fishery_id: string; species: string }
        Insert: { fishery_id: string; species: string }
        Update: { fishery_id?: string; species?: string }
        Relationships: [
          { foreignKeyName: "fishery_fish_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] },
          { foreignKeyName: "fishery_fish_species_fkey"; columns: ["species"]; isOneToOne: false; referencedRelation: "fish_species"; referencedColumns: ["name"] }
        ]
      }
      fishery_photos: {
        Row: { fishery_id: string; id: number; sort_order: number; url: string }
        Insert: { fishery_id: string; id?: never; sort_order?: number; url: string }
        Update: { fishery_id?: string; id?: never; sort_order?: number; url?: string }
        Relationships: [{ foreignKeyName: "fishery_photos_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
      fishery_records: {
        Row: { caught_on: string | null; created_at: string; fishery_id: string; id: number; species: string; weight: number }
        Insert: { caught_on?: string | null; created_at?: string; fishery_id: string; id?: never; species: string; weight: number }
        Update: { caught_on?: string | null; created_at?: string; fishery_id?: string; id?: never; species?: string; weight?: number }
        Relationships: [{ foreignKeyName: "fishery_records_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
      fishery_spots: {
        Row: { capacity: number; fishery_id: string; has_power: boolean; id: number; is_vip: boolean; note: string | null; pos_x: number | null; pos_y: number | null; price: number | null; spot_number: number }
        Insert: { capacity?: number; fishery_id: string; has_power?: boolean; id?: never; is_vip?: boolean; note?: string | null; pos_x?: number | null; pos_y?: number | null; price?: number | null; spot_number: number }
        Update: { capacity?: number; fishery_id?: string; has_power?: boolean; id?: never; is_vip?: boolean; note?: string | null; pos_x?: number | null; pos_y?: number | null; price?: number | null; spot_number?: number }
        Relationships: [{ foreignKeyName: "fishery_spots_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
      ingest_queue: {
        Row: { attempts: number; created_at: string; fishery_id: string; last_error: string | null; raw_extract: Json | null; stage: string; status: string; updated_at: string }
        Insert: { attempts?: number; created_at?: string; fishery_id: string; last_error?: string | null; raw_extract?: Json | null; stage?: string; status?: string; updated_at?: string }
        Update: { attempts?: number; created_at?: string; fishery_id?: string; last_error?: string | null; raw_extract?: Json | null; stage?: string; status?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "ingest_queue_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: true; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
      ingest_runs: {
        Row: { enriched: number | null; errors: number | null; finished_at: string | null; fn: string; found: number | null; id: number; note: string | null; partial: number | null; rejected: number | null; started_at: string; upserted: number | null }
        Insert: { enriched?: number | null; errors?: number | null; finished_at?: string | null; fn: string; found?: number | null; id?: never; note?: string | null; partial?: number | null; rejected?: number | null; started_at?: string; upserted?: number | null }
        Update: { enriched?: number | null; errors?: number | null; finished_at?: string | null; fn?: string; found?: number | null; id?: never; note?: string | null; partial?: number | null; rejected?: number | null; started_at?: string; upserted?: number | null }
        Relationships: []
      }
      map_pois: {
        Row: { address: string | null; city: string | null; created_at: string; id: string; kind: string; lat: number; lon: number; name: string; source: string }
        Insert: { address?: string | null; city?: string | null; created_at?: string; id: string; kind: string; lat: number; lon: number; name: string; source?: string }
        Update: { address?: string | null; city?: string | null; created_at?: string; id?: string; kind?: string; lat?: number; lon?: number; name?: string; source?: string }
        Relationships: []
      }
      profiles: {
        Row: { admin_status: string | null; avatar_url: string | null; business_name: string | null; city: string | null; created_at: string | null; email: string | null; fish_preferences: string[] | null; id: string; methods: string[] | null; name: string | null; nip: string | null; phone: string | null; province: string | null; role: string | null }
        Insert: { admin_status?: string | null; avatar_url?: string | null; business_name?: string | null; city?: string | null; created_at?: string | null; email?: string | null; fish_preferences?: string[] | null; id: string; methods?: string[] | null; name?: string | null; nip?: string | null; phone?: string | null; province?: string | null; role?: string | null }
        Update: { admin_status?: string | null; avatar_url?: string | null; business_name?: string | null; city?: string | null; created_at?: string | null; email?: string | null; fish_preferences?: string[] | null; id?: string; methods?: string[] | null; name?: string | null; nip?: string | null; phone?: string | null; province?: string | null; role?: string | null }
        Relationships: []
      }
      reservations: {
        Row: { confirmed_at: string | null; created_at: string; date_from: string; date_label: string | null; date_to: string; days: number; fishery_id: string; fishery_name: string; id: string; name: string | null; payment: string | null; phone: string | null; price_per_day: number; rating: number | null; shared_with: string[]; spots: number[]; status: string; total: number; user_id: string | null }
        Insert: { confirmed_at?: string | null; created_at?: string; date_from: string; date_label?: string | null; date_to: string; days?: number; fishery_id: string; fishery_name: string; id?: string; name?: string | null; payment?: string | null; phone?: string | null; price_per_day?: number; rating?: number | null; shared_with?: string[]; spots?: number[]; status?: string; total?: number; user_id?: string | null }
        Update: { confirmed_at?: string | null; created_at?: string; date_from?: string; date_label?: string | null; date_to?: string; days?: number; fishery_id?: string; fishery_name?: string; id?: string; name?: string | null; payment?: string | null; phone?: string | null; price_per_day?: number; rating?: number | null; shared_with?: string[]; spots?: number[]; status?: string; total?: number; user_id?: string | null }
        Relationships: [{ foreignKeyName: "reservations_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
      reviews: {
        Row: { author_name: string; comment: string | null; comment_original: string | null; created_at: string; fishery_id: string; hidden: boolean | null; id: number; rating: number; user_id: string | null; visited_on: string | null }
        Insert: { author_name: string; comment?: string | null; comment_original?: string | null; created_at?: string; fishery_id: string; hidden?: boolean | null; id?: never; rating: number; user_id?: string | null; visited_on?: string | null }
        Update: { author_name?: string; comment?: string | null; comment_original?: string | null; created_at?: string; fishery_id?: string; hidden?: boolean | null; id?: never; rating?: number; user_id?: string | null; visited_on?: string | null }
        Relationships: [{ foreignKeyName: "reviews_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
      subscriptions: {
        Row: { amount: number; billing: string; cancelled_at: string | null; created_at: string; current_period_end: string | null; fishery_id: string | null; id: string; method: string | null; plan: string; status: string; user_id: string }
        Insert: { amount?: number; billing?: string; cancelled_at?: string | null; created_at?: string; current_period_end?: string | null; fishery_id?: string | null; id?: string; method?: string | null; plan?: string; status?: string; user_id: string }
        Update: { amount?: number; billing?: string; cancelled_at?: string | null; created_at?: string; current_period_end?: string | null; fishery_id?: string | null; id?: string; method?: string | null; plan?: string; status?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "subscriptions_fishery_id_fkey"; columns: ["fishery_id"]; isOneToOne: false; referencedRelation: "fisheries"; referencedColumns: ["id"] }]
      }
    }
    Views: {
      coverage_report: {
        Row: { enriched: number | null; owner_verified: number | null; partial: number | null; pct_with_price: number | null; skeleton: number | null; total: number | null; with_fish: number | null; with_price: number | null; with_rules: number | null }
        Relationships: []
      }
    }
    Functions: { [key: string]: unknown }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]

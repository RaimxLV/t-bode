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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_whitelist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon_key: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon_key?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon_key?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string | null
          file_url: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          file_url?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          file_url?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status?: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer_en: string
          answer_lv: string
          created_at: string
          id: string
          is_active: boolean
          question_en: string
          question_lv: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer_en?: string
          answer_lv: string
          created_at?: string
          id?: string
          is_active?: boolean
          question_en?: string
          question_lv: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer_en?: string
          answer_lv?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question_en?: string
          question_lv?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      invoice_sequences: {
        Row: {
          counter: number
          updated_at: string
          year: number
        }
        Insert: {
          counter?: number
          updated_at?: string
          year: number
        }
        Update: {
          counter?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          buyer_snapshot: Json
          created_at: string
          generated_at: string
          gross_amount: number
          id: string
          invoice_number: string
          is_current: boolean
          items_snapshot: Json
          net_amount: number
          notes: string | null
          order_id: string
          pdf_path: string
          seller_snapshot: Json
          sent_at: string | null
          updated_at: string
          vat_amount: number
          vat_rate: number
          version: number
          viewed_at: string | null
        }
        Insert: {
          buyer_snapshot?: Json
          created_at?: string
          generated_at?: string
          gross_amount?: number
          id?: string
          invoice_number: string
          is_current?: boolean
          items_snapshot?: Json
          net_amount?: number
          notes?: string | null
          order_id: string
          pdf_path: string
          seller_snapshot?: Json
          sent_at?: string | null
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          version?: number
          viewed_at?: string | null
        }
        Update: {
          buyer_snapshot?: Json
          created_at?: string
          generated_at?: string
          gross_amount?: number
          id?: string
          invoice_number?: string
          is_current?: boolean
          items_snapshot?: Json
          net_amount?: number
          notes?: string | null
          order_id?: string
          pdf_path?: string
          seller_snapshot?: Json
          sent_at?: string | null
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          version?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          size: string | null
          unit_price: number
          zakeke_design_id: string | null
          zakeke_thumbnail_url: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity?: number
          size?: string | null
          unit_price: number
          zakeke_design_id?: string | null
          zakeke_thumbnail_url?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          size?: string | null
          unit_price?: number
          zakeke_design_id?: string | null
          zakeke_thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_email_sent_at: string | null
          company_address: string | null
          company_name: string | null
          company_reg_number: string | null
          company_vat_number: string | null
          created_at: string
          discount_amount: number
          guest_email: string | null
          id: string
          is_business: boolean
          last_payment_reminder_at: string | null
          manually_paid_at: string | null
          manually_paid_by: string | null
          montonio_order_uuid: string | null
          montonio_payment_method: string | null
          montonio_payment_status: string | null
          montonio_pickup_point_id: string | null
          montonio_pickup_point_name: string | null
          montonio_shipment_id: string | null
          montonio_shipping_method_code: string | null
          montonio_tracking_number: string | null
          notes: string | null
          omniva_barcode: string | null
          omniva_label_url: string | null
          omniva_pickup_point: string | null
          omniva_shipment_created_at: string | null
          omniva_tracking_status: string | null
          order_number: number
          payment_method: string
          promo_code: string | null
          provider: string
          shipping_address: string | null
          shipping_city: string | null
          shipping_name: string | null
          shipping_phone: string | null
          shipping_zip: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_invoice_id: string | null
          stripe_invoice_pdf: string | null
          stripe_session_id: string | null
          total: number
          tracking_email_sent_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancellation_email_sent_at?: string | null
          company_address?: string | null
          company_name?: string | null
          company_reg_number?: string | null
          company_vat_number?: string | null
          created_at?: string
          discount_amount?: number
          guest_email?: string | null
          id?: string
          is_business?: boolean
          last_payment_reminder_at?: string | null
          manually_paid_at?: string | null
          manually_paid_by?: string | null
          montonio_order_uuid?: string | null
          montonio_payment_method?: string | null
          montonio_payment_status?: string | null
          montonio_pickup_point_id?: string | null
          montonio_pickup_point_name?: string | null
          montonio_shipment_id?: string | null
          montonio_shipping_method_code?: string | null
          montonio_tracking_number?: string | null
          notes?: string | null
          omniva_barcode?: string | null
          omniva_label_url?: string | null
          omniva_pickup_point?: string | null
          omniva_shipment_created_at?: string | null
          omniva_tracking_status?: string | null
          order_number?: number
          payment_method?: string
          promo_code?: string | null
          provider?: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_zip?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_invoice_id?: string | null
          stripe_invoice_pdf?: string | null
          stripe_session_id?: string | null
          total?: number
          tracking_email_sent_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancellation_email_sent_at?: string | null
          company_address?: string | null
          company_name?: string | null
          company_reg_number?: string | null
          company_vat_number?: string | null
          created_at?: string
          discount_amount?: number
          guest_email?: string | null
          id?: string
          is_business?: boolean
          last_payment_reminder_at?: string | null
          manually_paid_at?: string | null
          manually_paid_by?: string | null
          montonio_order_uuid?: string | null
          montonio_payment_method?: string | null
          montonio_payment_status?: string | null
          montonio_pickup_point_id?: string | null
          montonio_pickup_point_name?: string | null
          montonio_shipment_id?: string | null
          montonio_shipping_method_code?: string | null
          montonio_tracking_number?: string | null
          notes?: string | null
          omniva_barcode?: string | null
          omniva_label_url?: string | null
          omniva_pickup_point?: string | null
          omniva_shipment_created_at?: string | null
          omniva_tracking_status?: string | null
          order_number?: number
          payment_method?: string
          promo_code?: string | null
          provider?: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_zip?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_invoice_id?: string | null
          stripe_invoice_pdf?: string | null
          stripe_session_id?: string | null
          total?: number
          tracking_email_sent_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          color_variants: Json
          colors: string[] | null
          created_at: string
          customizable: boolean
          description: string | null
          description_en: string | null
          description_lv: string | null
          id: string
          image_url: string | null
          in_stock: boolean
          name: string
          name_en: string | null
          name_lv: string | null
          price: number
          sizes: string[] | null
          slug: string
          updated_at: string
          zakeke_model_code: string | null
        }
        Insert: {
          category: string
          color_variants?: Json
          colors?: string[] | null
          created_at?: string
          customizable?: boolean
          description?: string | null
          description_en?: string | null
          description_lv?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name: string
          name_en?: string | null
          name_lv?: string | null
          price: number
          sizes?: string[] | null
          slug: string
          updated_at?: string
          zakeke_model_code?: string | null
        }
        Update: {
          category?: string
          color_variants?: Json
          colors?: string[] | null
          created_at?: string
          customizable?: boolean
          description?: string | null
          description_en?: string | null
          description_lv?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name?: string
          name_en?: string | null
          name_lv?: string | null
          price?: number
          sizes?: string[] | null
          slug?: string
          updated_at?: string
          zakeke_model_code?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_code_redemptions: {
        Row: {
          code_snapshot: string
          created_at: string
          discount_amount: number
          id: string
          order_id: string
          promo_code_id: string
        }
        Insert: {
          code_snapshot: string
          created_at?: string
          discount_amount: number
          id?: string
          order_id: string
          promo_code_id: string
        }
        Update: {
          code_snapshot?: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string
          promo_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["promo_discount_type"]
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_total: number
          updated_at: string
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["promo_discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_total?: number
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["promo_discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_total?: number
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          bank_beneficiary: string
          bank_iban: string
          bank_name: string
          bank_swift: string
          company_address: string | null
          company_name: string
          company_reg_number: string | null
          company_vat_number: string | null
          id: string
          logo_url: string | null
          payment_instructions_en: string | null
          payment_instructions_lv: string | null
          stamp_url: string | null
          updated_at: string
        }
        Insert: {
          bank_beneficiary?: string
          bank_iban?: string
          bank_name?: string
          bank_swift?: string
          company_address?: string | null
          company_name?: string
          company_reg_number?: string | null
          company_vat_number?: string | null
          id?: string
          logo_url?: string | null
          payment_instructions_en?: string | null
          payment_instructions_lv?: string | null
          stamp_url?: string | null
          updated_at?: string
        }
        Update: {
          bank_beneficiary?: string
          bank_iban?: string
          bank_name?: string
          bank_swift?: string
          company_address?: string | null
          company_name?: string
          company_reg_number?: string | null
          company_vat_number?: string | null
          id?: string
          logo_url?: string | null
          payment_instructions_en?: string | null
          payment_instructions_lv?: string | null
          stamp_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _can_insert_order_item: { Args: { _order_id: string }; Returns: boolean }
      get_bank_transfer_details: {
        Args: { _order_id: string }
        Returns: {
          bank_beneficiary: string
          bank_iban: string
          bank_name: string
          bank_swift: string
          company_name: string
          payment_instructions_en: string
          payment_instructions_lv: string
        }[]
      }
      get_public_settings: {
        Args: never
        Returns: {
          company_address: string
          company_name: string
          company_reg_number: string
          company_vat_number: string
          payment_instructions_en: string
          payment_instructions_lv: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_whitelisted: { Args: never; Returns: boolean }
      is_admin_whitelisted: { Args: { _email: string }; Returns: boolean }
      next_invoice_number: { Args: { _year?: number }; Returns: string }
      redeem_promo_code: {
        Args: { _code: string; _order_id: string; _order_total: number }
        Returns: number
      }
      validate_promo_code: {
        Args: { _code: string; _order_total: number }
        Returns: {
          code: string
          discount_amount: number
          discount_type: Database["public"]["Enums"]["promo_discount_type"]
          discount_value: number
          min_order_total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      promo_discount_type: "percentage" | "fixed" | "free_shipping"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      promo_discount_type: ["percentage", "fixed", "free_shipping"],
    },
  },
} as const

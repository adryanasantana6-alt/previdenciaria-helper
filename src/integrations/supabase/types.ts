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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      casos: {
        Row: {
          cliente_id: string
          created_at: string
          der: string | null
          fase: string
          honorarios: number | null
          id: string
          materia: string | null
          numero_beneficio: string | null
          numero_processo: string | null
          observacoes: string | null
          prazo_data: string | null
          prazo_obs: string | null
          prazo_tipo: string | null
          status: string
          tipo_beneficio: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          der?: string | null
          fase?: string
          honorarios?: number | null
          id?: string
          materia?: string | null
          numero_beneficio?: string | null
          numero_processo?: string | null
          observacoes?: string | null
          prazo_data?: string | null
          prazo_obs?: string | null
          prazo_tipo?: string | null
          status?: string
          tipo_beneficio?: string | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          der?: string | null
          fase?: string
          honorarios?: number | null
          id?: string
          materia?: string | null
          numero_beneficio?: string | null
          numero_processo?: string | null
          observacoes?: string | null
          prazo_data?: string | null
          prazo_obs?: string | null
          prazo_tipo?: string | null
          status?: string
          tipo_beneficio?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "casos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_documentos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          caso_id: string | null
          categoria: string | null
          cliente_id: string
          conteudo: string
          created_at: string
          id: string
          mime: string | null
          nome: string
          pasta: string | null
          tamanho: number | null
          user_id: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          caso_id?: string | null
          categoria?: string | null
          cliente_id: string
          conteudo?: string
          created_at?: string
          id?: string
          mime?: string | null
          nome: string
          pasta?: string | null
          tamanho?: number | null
          user_id: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          caso_id?: string | null
          categoria?: string | null
          cliente_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          mime?: string | null
          nome?: string
          pasta?: string | null
          tamanho?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_documentos_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "casos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado_civil: string | null
          govbr_senha: string | null
          govbr_usuario: string | null
          id: string
          nit: string | null
          nome: string
          observacoes: string | null
          profissao: string | null
          rg: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado_civil?: string | null
          govbr_senha?: string | null
          govbr_usuario?: string | null
          id?: string
          nit?: string | null
          nome: string
          observacoes?: string | null
          profissao?: string | null
          rg?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado_civil?: string | null
          govbr_senha?: string | null
          govbr_usuario?: string | null
          id?: string
          nit?: string | null
          nome?: string
          observacoes?: string | null
          profissao?: string | null
          rg?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversas: {
        Row: {
          created_at: string
          id: string
          materia: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          materia?: string | null
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          materia?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documento_chunks: {
        Row: {
          conteudo: string
          created_at: string
          documento_id: string
          embedding: string
          id: string
          ordem: number
          user_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          documento_id: string
          embedding: string
          id?: string
          ordem?: number
          user_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          documento_id?: string
          embedding?: string
          id?: string
          ordem?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_chunks_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          arquivo_url: string | null
          conteudo: string
          created_at: string
          data_documento: string | null
          fonte: string | null
          id: string
          materia: string | null
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arquivo_url?: string | null
          conteudo?: string
          created_at?: string
          data_documento?: string | null
          fonte?: string | null
          id?: string
          materia?: string | null
          tipo: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          arquivo_url?: string | null
          conteudo?: string
          created_at?: string
          data_documento?: string | null
          fonte?: string | null
          id?: string
          materia?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guias_previdenciarias: {
        Row: {
          cliente_id: string
          codigo: string | null
          competencia: string
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          id: string
          observacoes: string | null
          situacao: string
          updated_at: string
          user_id: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          cliente_id: string
          codigo?: string | null
          competencia: string
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          id?: string
          observacoes?: string | null
          situacao?: string
          updated_at?: string
          user_id: string
          valor?: number
          vencimento?: string | null
        }
        Update: {
          cliente_id?: string
          codigo?: string | null
          competencia?: string
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          id?: string
          observacoes?: string | null
          situacao?: string
          updated_at?: string
          user_id?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guias_previdenciarias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          content: string
          conversa_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversa_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversa_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          caso_id: string | null
          cliente_id: string
          created_at: string
          data_pagamento: string | null
          descricao: string
          forma: string | null
          id: string
          observacoes: string | null
          situacao: string
          updated_at: string
          user_id: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          caso_id?: string | null
          cliente_id: string
          created_at?: string
          data_pagamento?: string | null
          descricao: string
          forma?: string | null
          id?: string
          observacoes?: string | null
          situacao?: string
          updated_at?: string
          user_id: string
          valor?: number
          vencimento?: string | null
        }
        Update: {
          caso_id?: string | null
          cliente_id?: string
          created_at?: string
          data_pagamento?: string | null
          descricao?: string
          forma?: string | null
          id?: string
          observacoes?: string | null
          situacao?: string
          updated_at?: string
          user_id?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "casos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas: {
        Row: {
          cliente: string | null
          conteudo: string
          created_at: string
          dados_entrada: Json
          id: string
          materia: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente?: string | null
          conteudo?: string
          created_at?: string
          dados_entrada?: Json
          id?: string
          materia: string
          tipo: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente?: string | null
          conteudo?: string
          created_at?: string
          dados_entrada?: Json
          id?: string
          materia?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          oab: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          oab?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          oab?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          chunk_id: string
          conteudo: string
          documento_id: string
          fonte: string
          materia: string
          similarity: number
          tipo: string
          titulo: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activities: {
        Row: {
          action: string;
          app: string;
          created_at: string;
          entity_id: string | null;
          id: string;
          meta: Json | null;
          user_id: string;
        };
        Insert: {
          action: string;
          app: string;
          created_at?: string;
          entity_id?: string | null;
          id?: string;
          meta?: Json | null;
          user_id: string;
        };
        Update: {
          action?: string;
          app?: string;
          created_at?: string;
          entity_id?: string | null;
          id?: string;
          meta?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          changes: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_label: string | null;
          entity_type: string;
          id: string;
          ip_address: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_label?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_label?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_reports: {
        Row: {
          content: Json | null;
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          source_card_id: string | null;
          source_dataset_id: string | null;
          source_prompt_id: string | null;
          system_name: string | null;
        };
        Insert: {
          content?: Json | null;
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          source_card_id?: string | null;
          source_dataset_id?: string | null;
          source_prompt_id?: string | null;
          system_name?: string | null;
        };
        Update: {
          content?: Json | null;
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          source_card_id?: string | null;
          source_dataset_id?: string | null;
          source_prompt_id?: string | null;
          system_name?: string | null;
        };
        Relationships: [];
      };
      benchmark_runs: {
        Row: {
          benchmark_id: string;
          created_at: string;
          duration_ms: number | null;
          id: string;
          leaderboard: Json | null;
          results: Json | null;
          status: string;
          summary: Json | null;
          user_id: string;
        };
        Insert: {
          benchmark_id: string;
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          leaderboard?: Json | null;
          results?: Json | null;
          status?: string;
          summary?: Json | null;
          user_id: string;
        };
        Update: {
          benchmark_id?: string;
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          leaderboard?: Json | null;
          results?: Json | null;
          status?: string;
          summary?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "benchmark_runs_benchmark_id_fkey";
            columns: ["benchmark_id"];
            isOneToOne: false;
            referencedRelation: "benchmarks";
            referencedColumns: ["id"];
          },
        ];
      };
      benchmarks: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          is_public: boolean;
          metrics: Json;
          models: Json;
          name: string;
          share_token: string | null;
          status: string;
          tasks: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          metrics?: Json;
          models?: Json;
          name: string;
          share_token?: string | null;
          status?: string;
          tasks?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          metrics?: Json;
          models?: Json;
          name?: string;
          share_token?: string | null;
          status?: string;
          tasks?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chunking_sims: {
        Row: {
          created_at: string;
          document: string;
          id: string;
          name: string;
          owner_id: string;
          query: string | null;
          recommendation: Json | null;
          results: Json | null;
          strategies: Json;
        };
        Insert: {
          created_at?: string;
          document: string;
          id?: string;
          name: string;
          owner_id: string;
          query?: string | null;
          recommendation?: Json | null;
          results?: Json | null;
          strategies?: Json;
        };
        Update: {
          created_at?: string;
          document?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          query?: string | null;
          recommendation?: Json | null;
          results?: Json | null;
          strategies?: Json;
        };
        Relationships: [];
      };
      cost_estimates: {
        Row: {
          created_at: string;
          id: string;
          input_tokens: number;
          latency_target: string | null;
          monthly_requests: number;
          name: string;
          output_tokens: number;
          owner_id: string;
          quality_priority: string | null;
          recommendation: Json | null;
          results: Json | null;
          use_case: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          input_tokens: number;
          latency_target?: string | null;
          monthly_requests: number;
          name: string;
          output_tokens: number;
          owner_id: string;
          quality_priority?: string | null;
          recommendation?: Json | null;
          results?: Json | null;
          use_case: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          input_tokens?: number;
          latency_target?: string | null;
          monthly_requests?: number;
          name?: string;
          output_tokens?: number;
          owner_id?: string;
          quality_priority?: string | null;
          recommendation?: Json | null;
          results?: Json | null;
          use_case?: string;
        };
        Relationships: [];
      };
      dataset_audits: {
        Row: {
          bias_score: number | null;
          column_count: number | null;
          created_at: string;
          dataset_name: string | null;
          fairness: Json | null;
          id: string;
          name: string;
          owner_id: string;
          project_id: string | null;
          protected_attributes: Json | null;
          recommendations: Json | null;
          risk_score: number | null;
          row_count: number | null;
          stats: Json | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          bias_score?: number | null;
          column_count?: number | null;
          created_at?: string;
          dataset_name?: string | null;
          fairness?: Json | null;
          id?: string;
          name: string;
          owner_id: string;
          project_id?: string | null;
          protected_attributes?: Json | null;
          recommendations?: Json | null;
          risk_score?: number | null;
          row_count?: number | null;
          stats?: Json | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          bias_score?: number | null;
          column_count?: number | null;
          created_at?: string;
          dataset_name?: string | null;
          fairness?: Json | null;
          id?: string;
          name?: string;
          owner_id?: string;
          project_id?: string | null;
          protected_attributes?: Json | null;
          recommendations?: Json | null;
          risk_score?: number | null;
          row_count?: number | null;
          stats?: Json | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dataset_audits_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      embedding_compares: {
        Row: {
          chunks: Json;
          created_at: string;
          id: string;
          models: Json;
          name: string;
          owner_id: string;
          queries: Json;
          results: Json | null;
          winner: string | null;
        };
        Insert: {
          chunks: Json;
          created_at?: string;
          id?: string;
          models: Json;
          name: string;
          owner_id: string;
          queries: Json;
          results?: Json | null;
          winner?: string | null;
        };
        Update: {
          chunks?: Json;
          created_at?: string;
          id?: string;
          models?: Json;
          name?: string;
          owner_id?: string;
          queries?: Json;
          results?: Json | null;
          winner?: string | null;
        };
        Relationships: [];
      };
      experiment_runs: {
        Row: {
          analysis: Json | null;
          confidence: number | null;
          created_at: string;
          framework: string | null;
          id: string;
          metrics: Json | null;
          name: string;
          owner_id: string;
          project_id: string | null;
          raw_log: string | null;
          severity: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          analysis?: Json | null;
          confidence?: number | null;
          created_at?: string;
          framework?: string | null;
          id?: string;
          metrics?: Json | null;
          name: string;
          owner_id: string;
          project_id?: string | null;
          raw_log?: string | null;
          severity?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          analysis?: Json | null;
          confidence?: number | null;
          created_at?: string;
          framework?: string | null;
          id?: string;
          metrics?: Json | null;
          name?: string;
          owner_id?: string;
          project_id?: string | null;
          raw_log?: string | null;
          severity?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "experiment_runs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      finetune_checks: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          name: string;
          owner_id: string;
          recommendation: string | null;
          samples: Json;
          task: string;
          verdict: Json | null;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          name: string;
          owner_id: string;
          recommendation?: string | null;
          samples?: Json;
          task: string;
          verdict?: Json | null;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          recommendation?: string | null;
          samples?: Json;
          task?: string;
          verdict?: Json | null;
        };
        Relationships: [];
      };
      model_cards: {
        Row: {
          architecture: string | null;
          content: Json | null;
          created_at: string;
          dataset: string | null;
          id: string;
          license: string | null;
          model_name: string;
          owner_id: string;
          project_id: string | null;
          status: string;
          task: string | null;
          updated_at: string;
          version: string | null;
        };
        Insert: {
          architecture?: string | null;
          content?: Json | null;
          created_at?: string;
          dataset?: string | null;
          id?: string;
          license?: string | null;
          model_name: string;
          owner_id: string;
          project_id?: string | null;
          status?: string;
          task?: string | null;
          updated_at?: string;
          version?: string | null;
        };
        Update: {
          architecture?: string | null;
          content?: Json | null;
          created_at?: string;
          dataset?: string | null;
          id?: string;
          license?: string | null;
          model_name?: string;
          owner_id?: string;
          project_id?: string | null;
          status?: string;
          task?: string | null;
          updated_at?: string;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "model_cards_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          kind: string | null;
          link: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string | null;
          link?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string | null;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          onboarded_at: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          onboarded_at?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          onboarded_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          color: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompt_results: {
        Row: {
          case_name: string | null;
          cost: number | null;
          created_at: string;
          expected: string | null;
          id: string;
          judge_score: number | null;
          latency_ms: number | null;
          metadata: Json | null;
          model: string | null;
          output: string | null;
          owner_id: string;
          run_id: string;
          similarity: number | null;
          tokens: number | null;
        };
        Insert: {
          case_name?: string | null;
          cost?: number | null;
          created_at?: string;
          expected?: string | null;
          id?: string;
          judge_score?: number | null;
          latency_ms?: number | null;
          metadata?: Json | null;
          model?: string | null;
          output?: string | null;
          owner_id: string;
          run_id: string;
          similarity?: number | null;
          tokens?: number | null;
        };
        Update: {
          case_name?: string | null;
          cost?: number | null;
          created_at?: string;
          expected?: string | null;
          id?: string;
          judge_score?: number | null;
          latency_ms?: number | null;
          metadata?: Json | null;
          model?: string | null;
          output?: string | null;
          owner_id?: string;
          run_id?: string;
          similarity?: number | null;
          tokens?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_results_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "prompt_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      prompt_runs: {
        Row: {
          created_at: string;
          id: string;
          owner_id: string;
          status: string;
          suite_id: string;
          summary: Json | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          owner_id: string;
          status?: string;
          suite_id: string;
          summary?: Json | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          owner_id?: string;
          status?: string;
          suite_id?: string;
          summary?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_runs_suite_id_fkey";
            columns: ["suite_id"];
            isOneToOne: false;
            referencedRelation: "prompt_suites";
            referencedColumns: ["id"];
          },
        ];
      };
      prompt_suites: {
        Row: {
          cases: Json | null;
          created_at: string;
          description: string | null;
          id: string;
          models: Json | null;
          name: string;
          owner_id: string;
          project_id: string | null;
          system_prompt: string | null;
          updated_at: string;
        };
        Insert: {
          cases?: Json | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          models?: Json | null;
          name: string;
          owner_id: string;
          project_id?: string | null;
          system_prompt?: string | null;
          updated_at?: string;
        };
        Update: {
          cases?: Json | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          models?: Json | null;
          name?: string;
          owner_id?: string;
          project_id?: string | null;
          system_prompt?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_suites_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      rag_sessions: {
        Row: {
          analysis: Json | null;
          chunk_overlap: number | null;
          chunk_size: number | null;
          chunks: Json | null;
          created_at: string;
          embedding_model: string | null;
          generated_answer: string | null;
          grounding_score: number | null;
          hallucination_score: number | null;
          id: string;
          name: string;
          owner_id: string;
          project_id: string | null;
          prompt: string | null;
          question: string | null;
          retriever: string | null;
          status: string;
          updated_at: string;
          vector_db: string | null;
        };
        Insert: {
          analysis?: Json | null;
          chunk_overlap?: number | null;
          chunk_size?: number | null;
          chunks?: Json | null;
          created_at?: string;
          embedding_model?: string | null;
          generated_answer?: string | null;
          grounding_score?: number | null;
          hallucination_score?: number | null;
          id?: string;
          name: string;
          owner_id: string;
          project_id?: string | null;
          prompt?: string | null;
          question?: string | null;
          retriever?: string | null;
          status?: string;
          updated_at?: string;
          vector_db?: string | null;
        };
        Update: {
          analysis?: Json | null;
          chunk_overlap?: number | null;
          chunk_size?: number | null;
          chunks?: Json | null;
          created_at?: string;
          embedding_model?: string | null;
          generated_answer?: string | null;
          grounding_score?: number | null;
          hallucination_score?: number | null;
          id?: string;
          name?: string;
          owner_id?: string;
          project_id?: string | null;
          prompt?: string | null;
          question?: string | null;
          retriever?: string | null;
          status?: string;
          updated_at?: string;
          vector_db?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rag_sessions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          app: string;
          content: string | null;
          created_at: string;
          format: string | null;
          id: string;
          meta: Json | null;
          owner_id: string;
          source_id: string | null;
          title: string;
        };
        Insert: {
          app: string;
          content?: string | null;
          created_at?: string;
          format?: string | null;
          id?: string;
          meta?: Json | null;
          owner_id: string;
          source_id?: string | null;
          title: string;
        };
        Update: {
          app?: string;
          content?: string | null;
          created_at?: string;
          format?: string | null;
          id?: string;
          meta?: Json | null;
          owner_id?: string;
          source_id?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "member";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
    },
  },
} as const;

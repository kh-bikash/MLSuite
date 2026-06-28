
-- Chunking Strategy Simulator
CREATE TABLE public.chunking_sims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT NOT NULL,
  query TEXT,
  strategies JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB,
  recommendation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chunking_sims TO authenticated;
GRANT ALL ON public.chunking_sims TO service_role;
ALTER TABLE public.chunking_sims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chunking_sims_owner_all" ON public.chunking_sims FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Embedding Model Comparator
CREATE TABLE public.embedding_compares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  queries JSONB NOT NULL,
  chunks JSONB NOT NULL,
  models JSONB NOT NULL,
  results JSONB,
  winner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.embedding_compares TO authenticated;
GRANT ALL ON public.embedding_compares TO service_role;
ALTER TABLE public.embedding_compares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "embedding_compares_owner_all" ON public.embedding_compares FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- LLM Cost Estimator
CREATE TABLE public.cost_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  use_case TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  monthly_requests INTEGER NOT NULL,
  latency_target TEXT,
  quality_priority TEXT,
  results JSONB,
  recommendation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_estimates TO authenticated;
GRANT ALL ON public.cost_estimates TO service_role;
ALTER TABLE public.cost_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_estimates_owner_all" ON public.cost_estimates FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Fine-tuning Readiness Checker
CREATE TABLE public.finetune_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  task TEXT NOT NULL,
  description TEXT NOT NULL,
  samples JSONB NOT NULL DEFAULT '[]'::jsonb,
  verdict JSONB,
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finetune_checks TO authenticated;
GRANT ALL ON public.finetune_checks TO service_role;
ALTER TABLE public.finetune_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finetune_checks_owner_all" ON public.finetune_checks FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- AI Product Audit Report
CREATE TABLE public.audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_name TEXT,
  source_dataset_id UUID,
  source_card_id UUID,
  source_prompt_id UUID,
  content JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_reports TO authenticated;
GRANT ALL ON public.audit_reports TO service_role;
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_reports_owner_all" ON public.audit_reports FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

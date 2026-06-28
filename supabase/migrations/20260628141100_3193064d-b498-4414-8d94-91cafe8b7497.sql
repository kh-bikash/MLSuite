
-- Benchmarks: reusable model/prompt benchmark suites
CREATE TABLE public.benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  models JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benchmarks TO authenticated;
GRANT ALL ON public.benchmarks TO service_role;
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own benchmarks" ON public.benchmarks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_benchmarks_updated BEFORE UPDATE ON public.benchmarks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.benchmark_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  benchmark_id UUID NOT NULL REFERENCES public.benchmarks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  summary JSONB,
  results JSONB,
  leaderboard JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benchmark_runs TO authenticated;
GRANT ALL ON public.benchmark_runs TO service_role;
ALTER TABLE public.benchmark_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own benchmark runs" ON public.benchmark_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Audit log: structured change tracking
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_label TEXT,
  changes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user_created ON public.audit_log (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit read" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own audit insert" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Onboarding state on profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

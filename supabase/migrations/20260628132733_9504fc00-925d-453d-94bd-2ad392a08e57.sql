
-- =========================================================
-- Shared utility: updated_at trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- =========================================================
-- Profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Roles
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin','member');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- =========================================================
-- Projects (shared org unit)
-- =========================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'graphite',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_owner_all" ON public.projects FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX projects_owner_idx ON public.projects(owner_id);

-- =========================================================
-- Experiment Failure Analyst
-- =========================================================
CREATE TABLE public.experiment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  framework TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_log TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  analysis JSONB DEFAULT '{}'::jsonb,
  severity TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiment_runs TO authenticated;
GRANT ALL ON public.experiment_runs TO service_role;
ALTER TABLE public.experiment_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exp_owner_all" ON public.experiment_runs FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER exp_set_updated_at BEFORE UPDATE ON public.experiment_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX exp_owner_idx ON public.experiment_runs(owner_id);

-- =========================================================
-- Dataset Bias Auditor
-- =========================================================
CREATE TABLE public.dataset_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  dataset_name TEXT,
  row_count INT,
  column_count INT,
  protected_attributes JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb,
  fairness JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  bias_score NUMERIC,
  risk_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dataset_audits TO authenticated;
GRANT ALL ON public.dataset_audits TO service_role;
ALTER TABLE public.dataset_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_owner_all" ON public.dataset_audits FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER audit_set_updated_at BEFORE UPDATE ON public.dataset_audits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX audit_owner_idx ON public.dataset_audits(owner_id);

-- =========================================================
-- RAG Pipeline Debugger
-- =========================================================
CREATE TABLE public.rag_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  question TEXT,
  generated_answer TEXT,
  embedding_model TEXT,
  retriever TEXT,
  chunk_size INT,
  chunk_overlap INT,
  vector_db TEXT,
  prompt TEXT,
  chunks JSONB DEFAULT '[]'::jsonb,
  analysis JSONB DEFAULT '{}'::jsonb,
  grounding_score NUMERIC,
  hallucination_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rag_sessions TO authenticated;
GRANT ALL ON public.rag_sessions TO service_role;
ALTER TABLE public.rag_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rag_owner_all" ON public.rag_sessions FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER rag_set_updated_at BEFORE UPDATE ON public.rag_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX rag_owner_idx ON public.rag_sessions(owner_id);

-- =========================================================
-- Model Card Generator
-- =========================================================
CREATE TABLE public.model_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  model_name TEXT NOT NULL,
  task TEXT,
  architecture TEXT,
  dataset TEXT,
  version TEXT DEFAULT '1.0.0',
  content JSONB DEFAULT '{}'::jsonb,
  license TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_cards TO authenticated;
GRANT ALL ON public.model_cards TO service_role;
ALTER TABLE public.model_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "card_owner_all" ON public.model_cards FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER card_set_updated_at BEFORE UPDATE ON public.model_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX card_owner_idx ON public.model_cards(owner_id);

-- =========================================================
-- Prompt Regression Tester
-- =========================================================
CREATE TABLE public.prompt_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  cases JSONB DEFAULT '[]'::jsonb,
  models JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_suites TO authenticated;
GRANT ALL ON public.prompt_suites TO service_role;
ALTER TABLE public.prompt_suites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suite_owner_all" ON public.prompt_suites FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER suite_set_updated_at BEFORE UPDATE ON public.prompt_suites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX suite_owner_idx ON public.prompt_suites(owner_id);

CREATE TABLE public.prompt_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suite_id UUID NOT NULL REFERENCES public.prompt_suites(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_runs TO authenticated;
GRANT ALL ON public.prompt_runs TO service_role;
ALTER TABLE public.prompt_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prun_owner_all" ON public.prompt_runs FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX prun_suite_idx ON public.prompt_runs(suite_id);

CREATE TABLE public.prompt_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.prompt_runs(id) ON DELETE CASCADE,
  case_name TEXT,
  model TEXT,
  output TEXT,
  expected TEXT,
  similarity NUMERIC,
  judge_score NUMERIC,
  latency_ms INT,
  tokens INT,
  cost NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_results TO authenticated;
GRANT ALL ON public.prompt_results TO service_role;
ALTER TABLE public.prompt_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pres_owner_all" ON public.prompt_results FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX pres_run_idx ON public.prompt_results(run_id);

-- =========================================================
-- Notifications, Reports, Activities
-- =========================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  kind TEXT DEFAULT 'info',
  read_at TIMESTAMPTZ,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_owner_all" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notif_user_idx ON public.notifications(user_id, created_at DESC);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app TEXT NOT NULL,
  source_id UUID,
  title TEXT NOT NULL,
  format TEXT DEFAULT 'markdown',
  content TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_owner_all" ON public.reports FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX report_owner_idx ON public.reports(owner_id, created_at DESC);

CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_id UUID,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_owner_all" ON public.activities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX act_user_idx ON public.activities(user_id, created_at DESC);

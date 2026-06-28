
ALTER TABLE public.benchmarks
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

CREATE INDEX IF NOT EXISTS benchmarks_share_token_idx ON public.benchmarks(share_token) WHERE share_token IS NOT NULL;

-- Allow anon to read shared benchmarks + their runs
DROP POLICY IF EXISTS "Public can read shared benchmarks" ON public.benchmarks;
CREATE POLICY "Public can read shared benchmarks"
  ON public.benchmarks
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND share_token IS NOT NULL);

DROP POLICY IF EXISTS "Public can read runs of shared benchmarks" ON public.benchmark_runs;
CREATE POLICY "Public can read runs of shared benchmarks"
  ON public.benchmark_runs
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.benchmarks b
    WHERE b.id = benchmark_runs.benchmark_id
      AND b.is_public = true
      AND b.share_token IS NOT NULL
  ));

GRANT SELECT ON public.benchmarks TO anon;
GRANT SELECT ON public.benchmark_runs TO anon;

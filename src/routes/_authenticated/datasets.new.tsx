import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, ArrowLeft, Loader2, Upload } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { auditDataset } from "@/lib/datasets.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/datasets/new")({
  head: () => ({ meta: [{ title: "New Dataset Audit — ML Inspector" }] }),
  component: NewAuditPage,
});

const SAMPLE = `age,gender,zip_code,income,loan_default
22,Female,10001,32000,0
45,Male,90210,120000,0
31,Male,10001,58000,1
27,Female,60616,41000,0
54,Male,90210,210000,0
38,Female,10001,49000,1
29,Male,60616,52000,0
41,Female,90210,98000,0
33,Male,10001,61000,1
60,Male,90210,180000,0
24,Female,60616,38000,1
49,Male,90210,140000,0
36,Female,10001,55000,1
28,Male,60616,46000,0
52,Female,90210,160000,0`;

function NewAuditPage() {
  const navigate = useNavigate();
  const audit = useServerFn(auditDataset);
  const [name, setName] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [target, setTarget] = useState("");
  const [csv, setCsv] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const mut = useMutation({
    mutationFn: () =>
      audit({
        data: {
          name,
          dataset_name: datasetName || name,
          target_column: target || undefined,
          csv,
        },
      }),
    onSuccess: (r) => {
      toast.success("Audit complete");
      navigate({ to: "/datasets/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    setCsv(text);
    if (!datasetName) setDatasetName(f.name);
  };

  const canSubmit = name.trim().length > 0 && csv.trim().length >= 20 && !mut.isPending;

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        title="New Dataset"
        description="Upload or paste CSV data. AI will profile columns and surface bias risks."
        actions={
          <Button
            variant="ghost"
            className="rounded-full"

            asChild
          >
            <Link to="/datasets">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <PageBody>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated mx-auto max-w-3xl p-6"
        >
          <div className="grid gap-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Audit name</Label>
                <Input
                  id="name"
                  placeholder="loan-applicants-Q3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dn">Dataset name</Label>
                <Input
                  id="dn"
                  placeholder="applicants.csv"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target">Target / label column (optional)</Label>
              <Input
                id="target"
                placeholder="loan_default"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="csv">CSV data</Label>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCsv(SAMPLE);
                      if (!name) setName("sample-loans");
                      if (!datasetName) setDatasetName("loans-sample.csv");
                      if (!target) setTarget("loan_default");
                    }}
                    className="text-primary hover:underline"
                  >
                    Load sample
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1 text-ink-soft hover:text-foreground"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload .csv
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                </div>
              </div>
              <Textarea
                id="csv"
                rows={14}
                placeholder="Paste CSV contents (with header row)…"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                className="font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-ink-soft">
                {csv.length.toLocaleString()} characters · up to ~1000 rows are profiled.
              </p>
            </div>
            <div className="flex justify-end">
              <Button className="rounded-full" disabled={!canSubmit} onClick={() => mut.mutate()}>
                {mut.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Auditing…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Run audit
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </PageBody>
    </>
  );
}

import { Link,  createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { GraduationCap, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runCheck } from "@/lib/finetune.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finetune/new")({
  head: () => ({ meta: [{ title: "New Fine-tuning Check" }] }),
  component: Page,
});

function Page() {
  const nav = useNavigate();
  const run = useServerFn(runCheck);
  const [name, setName] = useState("");
  const [task, setTask] = useState("");
  const [desc, setDesc] = useState("");
  const [samples, setSamples] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      run({
        data: {
          name,
          task,
          description: desc,
          samples: samples
            .split(/\n---+\n|\n\n+/)
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: (r) => {
      toast.success("Check complete");
      nav({ to: "/finetune/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const canSubmit =
    name.trim() && task.trim() && desc.trim().length >= 20 && samples.trim() && !mut.isPending;

  return (
    <>
      <PageHeader
        icon={GraduationCap}
        title="New fine-tuning check"
        actions={
          <Button variant="ghost" className="rounded-full" asChild>
            <Link to="/finetune">
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
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="legal-clause-classifier"
              />
            </div>
            <div className="grid gap-2">
              <Label>Task type</Label>
              <Input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="classification / summarization / structured extraction / style transfer …"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What does the task look like? What have you already tried? Where does GPT-4 / Claude fall short?"
              />
            </div>
            <div className="grid gap-2">
              <Label>Sample data (separate examples with blank line or ---)</Label>
              <Textarea
                rows={10}
                value={samples}
                onChange={(e) => setSamples(e.target.value)}
                className="font-mono text-xs"
                placeholder={"input: ...\noutput: ...\n---\ninput: ...\noutput: ..."}
              />
            </div>
            <div className="flex justify-end">
              <Button className="rounded-full" disabled={!canSubmit} onClick={() => mut.mutate()}>
                {mut.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Checking…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Run check
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

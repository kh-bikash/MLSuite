import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen gradient-hero">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">ML Inspector AI</span>
        </Link>
      </header>

      <div className="mx-auto flex max-w-md flex-col px-6 pb-20 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="card-elevated p-8"
        >
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Choose something memorable.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw">New password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  id="pw"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpw">Confirm</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  id="cpw"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

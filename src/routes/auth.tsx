import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ArrowRight, Mail, Lock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — ML Inspector AI" }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "reset";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Welcome aboard.");
        navigate({ to: "/dashboard" });
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  const heading =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your workspace"
        : "Reset your password";
  const subheading =
    mode === "signin"
      ? "Sign in to continue."
      : mode === "signup"
        ? "Start inspecting your AI systems."
        : "We'll email you a link to set a new password.";

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
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
            <p className="mt-1.5 text-sm text-ink-soft">{subheading}</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ada Lovelace"
                    className="pl-9"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="pl-9"
                />
              </div>
            </div>
            {mode !== "reset" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs text-ink-soft transition hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="pl-9"
                  />
                </div>
                {mode === "signup" && (
                  <p className="text-xs text-ink-soft">At least 6 characters.</p>
                )}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full rounded-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
              {!loading && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-ink-soft">
            {mode === "signin" && (
              <>
                New here?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Create an account
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === "reset" && (
              <button
                onClick={() => setMode("signin")}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-ink-soft">
          By continuing you agree to our terms and acknowledge our privacy practices.
        </p>
      </div>
    </div>
  );
}

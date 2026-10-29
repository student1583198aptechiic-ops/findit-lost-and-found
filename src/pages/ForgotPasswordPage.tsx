import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PackageSearch, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-700 text-white">
              <PackageSearch className="h-5.5 w-5.5" />
            </div>
            <span className="text-xl font-bold text-navy-900">FindIt</span>
          </Link>
        </div>
        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 mb-4">
                <CheckCircle className="h-6 w-6 text-accent-600" />
              </div>
              <h1 className="text-xl font-bold text-navy-900">Check your email</h1>
              <p className="mt-2 text-sm text-navy-500">
                If an account exists for {email}, a password reset link has been
                sent. Check your inbox and follow the link to reset your
                password.
              </p>
              <Link to="/login" className="btn-secondary w-full mt-6">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-navy-900 text-center">
                Reset your password
              </h1>
              <p className="mt-1.5 text-sm text-navy-500 text-center">
                Enter your email and we'll send you a reset link.
              </p>
              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3"
                >
                  {loading ? "Sending link..." : "Send reset link"}
                </button>
              </form>
              <p className="mt-5 text-sm text-center text-navy-500">
                Remember your password?{" "}
                <Link to="/login" className="text-navy-600 font-medium hover:text-navy-800">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

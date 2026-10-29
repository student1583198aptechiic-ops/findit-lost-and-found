import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FullPageSpinner } from "@/components/ui/State";

export function ProtectedRoute({
  requireAdmin = false,
}: {
  requireAdmin?: boolean;
}) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (profile?.account_status === "suspended") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card max-w-md p-8 text-center">
          <h2 className="text-lg font-semibold text-rose-700">
            Account Suspended
          </h2>
          <p className="mt-2 text-sm text-navy-500">
            Your account has been suspended. Please contact support for
            assistance.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

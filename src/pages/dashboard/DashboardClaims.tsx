import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { ClaimWithItem } from "@/types";
import { SkeletonGrid, EmptyState } from "@/components/ui/State";
import { prettyStatus, classNames } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

export function DashboardClaims() {
  const { session } = useAuth();
  const [claims, setClaims] = useState<ClaimWithItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    async function load() {
      const { data } = await supabase
        .from("claims")
        .select("*, item:items(*, reporter:public_profiles!items_reporter_id_fkey(*)), claimant:public_profiles!claims_claimant_id_fkey(*)")
        .eq("claimant_id", session!.user.id)
        .order("created_at", { ascending: false });
      setClaims((data as ClaimWithItem[]) ?? []);
      setLoading(false);
    }
    load();
  }, [session?.user]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonGrid key={i} count={1} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900 mb-1">My Claims</h1>
      <p className="text-sm text-navy-500 mb-6">
        Track the status of claims you've submitted.
      </p>

      {claims.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-8 w-8" />}
          title="No claims yet"
          description="When you submit a claim on a found item, it will appear here with its current status."
          action={
            <Link to="/items" className="btn-primary">
              Browse found items
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="card p-5 flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                {claim.item?.images?.[0] ? (
                  <img
                    src={claim.item.images[0]}
                    alt={claim.item?.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/items/${claim.item_id}`}
                      className="font-semibold text-navy-900 hover:text-navy-600"
                    >
                      {claim.item?.title ?? "Item"}
                    </Link>
                    <p className="text-xs text-navy-400 mt-0.5">
                      Submitted {formatDate(claim.created_at)}
                    </p>
                  </div>
                  <span
                    className={classNames(
                      "badge",
                      claim.status === "approved" || claim.status === "completed"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : claim.status === "rejected"
                        ? "bg-rose-50 text-rose-600 border-rose-200"
                        : claim.status === "under_review"
                        ? "bg-blue-50 text-blue-600 border-blue-200"
                        : "bg-amber-50 text-amber-600 border-amber-200"
                    )}
                  >
                    {prettyStatus(claim.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-navy-500 line-clamp-2">
                  {claim.private_description}
                </p>
                {claim.review_notes && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-xs font-medium text-navy-700 mb-1">
                      Reviewer notes:
                    </p>
                    <p className="text-xs text-navy-500">{claim.review_notes}</p>
                  </div>
                )}
                <Link
                  to={`/items/${claim.item_id}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-800"
                >
                  View item <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

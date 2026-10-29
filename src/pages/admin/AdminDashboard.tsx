import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Package,
  ShieldCheck,
  TrendingUp,
  Search,
  Ban,
  CheckCircle,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Profile, ItemWithReporter, ClaimWithItem } from "@/types";
import {
  FullPageSpinner,
  EmptyState,
  ErrorState,
} from "@/components/ui/State";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ItemCard, StatusBadge } from "@/components/ui/ItemCard";
import { formatDate, classNames, prettyStatus, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";

type Tab = "overview" | "users" | "items" | "claims";

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<{
    total_users: number;
    total_items: number;
    pending_claims: number;
    lost_count: number;
    found_count: number;
  } | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [items, setItems] = useState<ItemWithReporter[]>([]);
  const [claims, setClaims] = useState<ClaimWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirmUser, setConfirmUser] = useState<Profile | null>(null);
  const [confirmItem, setConfirmItem] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadStats() {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) {
        setError(true);
      } else {
        setStats(data as typeof stats);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === "users") loadUsers();
    if (tab === "items") loadItems();
    if (tab === "claims") loadClaims();
  }, [tab]);

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers((data as Profile[]) ?? []);
  }

  async function loadItems() {
    const { data } = await supabase
      .from("items")
      .select("*, reporter:public_profiles!items_reporter_id_fkey(*)")
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as ItemWithReporter[]) ?? []);
  }

  async function loadClaims() {
    const { data } = await supabase
      .from("claims")
      .select("*, item:items(*, reporter:public_profiles!items_reporter_id_fkey(*)), claimant:public_profiles!claims_claimant_id_fkey(*)")
      .order("created_at", { ascending: false })
      .limit(50);
    setClaims((data as ClaimWithItem[]) ?? []);
  }

  async function toggleUserStatus(user: Profile) {
    const newStatus = user.account_status === "active" ? "suspended" : "active";
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: newStatus })
      .eq("id", user.id);
    if (error) {
      toast.error("Could not update user status.");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, account_status: newStatus } : u))
    );
    toast.success(`User ${newStatus === "suspended" ? "suspended" : "reactivated"}.`);
    setConfirmUser(null);
  }

  async function deleteItem(itemId: string) {
    const { error } = await supabase.from("items").delete().eq("id", itemId);
    if (error) {
      toast.error("Could not delete item.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    toast.success("Item removed.");
    setConfirmItem(null);
  }

  async function updateClaimStatus(claimId: string, status: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const reviewerId = sessionData.session?.user.id;
    const { error } = await supabase
      .from("claims")
      .update({ status, reviewed_by: reviewerId ?? null })
      .eq("id", claimId);
    if (error) {
      toast.error("Could not update claim.");
      return;
    }
    // Notify claimant
    const claim = claims.find((c) => c.id === claimId);
    if (claim) {
      await supabase.rpc("create_notification", {
        p_recipient: claim.claimant_id,
        p_type: "claim",
        p_title: `Claim ${prettyStatus(status)}`,
        p_message: `Your claim status has been updated to: ${prettyStatus(status)}.`,
        p_related_id: claim.item_id,
        p_related_type: "item",
      });
    }
    setClaims((prev) =>
      prev.map((c) => (c.id === claimId ? { ...c, status: status as ClaimWithItem["status"] } : c))
    );
    toast.success(`Claim ${prettyStatus(status)}.`);
  }

  if (loading) return <FullPageSpinner />;
  if (error && !stats)
    return (
      <ErrorState
        title="Access denied"
        description="You need admin privileges to view this page."
      />
    );

  const statCards = [
    { label: "Total Users", value: stats?.total_users ?? 0, icon: Users, color: "bg-navy-50 text-navy-600" },
    { label: "Total Items", value: stats?.total_items ?? 0, icon: Package, color: "bg-accent-50 text-accent-600" },
    { label: "Pending Claims", value: stats?.pending_claims ?? 0, icon: ShieldCheck, color: "bg-amber-50 text-amber-600" },
    { label: "Lost Reports", value: stats?.lost_count ?? 0, icon: TrendingUp, color: "bg-rose-50 text-rose-600" },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "items", label: "Item Reports" },
    { key: "claims", label: "Claims" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin header */}
      <div className="bg-navy-800 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold">Admin Dashboard</span>
            </Link>
            <Link to="/" className="text-sm text-navy-200 hover:text-white">
              Back to site
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={classNames(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                tab === t.key
                  ? "border-navy-600 text-navy-700"
                  : "border-transparent text-navy-500 hover:text-navy-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map((c) => (
                <div key={c.label} className="card p-5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${c.color}`}>
                    <c.icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-navy-900">{c.value}</p>
                  <p className="text-sm text-navy-500">{c.label}</p>
                </div>
              ))}
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-navy-900 mb-3">Platform Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-navy-500">Found reports</span>
                  <span className="font-semibold text-navy-900">{stats?.found_count ?? 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-navy-500">Lost reports</span>
                  <span className="font-semibold text-navy-900">{stats?.lost_count ?? 0}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-navy-500">Pending claims awaiting review</span>
                  <span className="font-semibold text-amber-600">{stats?.pending_claims ?? 0}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setTab("users")} className="btn-secondary text-sm">
                  Manage users
                </button>
                <button onClick={() => setTab("claims")} className="btn-secondary text-sm">
                  Review claims
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div>
            <div className="mb-4 relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="input pl-10 py-2 text-sm"
              />
            </div>
            {users.length === 0 ? (
              <EmptyState icon={<Users className="h-8 w-8" />} title="No users found" />
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-navy-700">User</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-navy-700 hidden sm:table-cell">Role</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-navy-700">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-navy-700 hidden sm:table-cell">Joined</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-navy-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter(
                        (u) =>
                          !search ||
                          u.full_name.toLowerCase().includes(search.toLowerCase())
                      )
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-navy-600 text-sm font-semibold overflow-hidden">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  getInitials(user.full_name)
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-navy-900 text-sm">{user.full_name || "Unnamed"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className={classNames(
                              "badge",
                              user.role === "admin"
                                ? "bg-navy-50 text-navy-700 border-navy-100"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            )}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={classNames(
                              "badge",
                              user.account_status === "active"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : "bg-rose-50 text-rose-600 border-rose-200"
                            )}>
                              {prettyStatus(user.account_status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-sm text-navy-500">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {user.role !== "admin" && (
                              <button
                                onClick={() => setConfirmUser(user)}
                                className={classNames(
                                  "btn text-xs px-3 py-1.5",
                                  user.account_status === "active"
                                    ? "text-rose-600 hover:bg-rose-50"
                                    : "text-accent-600 hover:bg-accent-50"
                                )}
                              >
                                {user.account_status === "active" ? (
                                  <><Ban className="h-3.5 w-3.5" /> Suspend</>
                                ) : (
                                  <><CheckCircle className="h-3.5 w-3.5" /> Reactivate</>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        {tab === "items" && (
          <div>
            {items.length === 0 ? (
              <EmptyState icon={<Package className="h-8 w-8" />} title="No items reported" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item) => (
                  <div key={item.id} className="relative">
                    <ItemCard item={item} />
                    <div className="mt-2 flex gap-2">
                      <Link
                        to={`/items/${item.id}`}
                        className="flex-1 btn-secondary py-1.5 text-xs justify-center"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => setConfirmItem(item.id)}
                        className="btn text-rose-600 border border-slate-200 hover:bg-rose-50 py-1.5 px-3 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Claims */}
        {tab === "claims" && (
          <div>
            {claims.length === 0 ? (
              <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="No claims submitted" />
            ) : (
              <div className="space-y-3">
                {claims.map((claim) => (
                  <div key={claim.id} className="card p-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                      {claim.item?.images?.[0] ? (
                        <img src={claim.item.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <Package className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            to={`/items/${claim.item_id}`}
                            className="font-semibold text-navy-900 hover:text-navy-600 text-sm"
                          >
                            {claim.item?.title ?? "Item"}
                          </Link>
                          <p className="text-xs text-navy-400 mt-0.5">
                            by {claim.claimant?.full_name ?? "Unknown"} · {formatDate(claim.created_at)}
                          </p>
                        </div>
                        <span className={classNames(
                          "badge",
                          claim.status === "approved" || claim.status === "completed"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : claim.status === "rejected"
                            ? "bg-rose-50 text-rose-600 border-rose-200"
                            : "bg-amber-50 text-amber-600 border-amber-200"
                        )}>
                          {prettyStatus(claim.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-navy-500 line-clamp-2">
                        {claim.private_description}
                      </p>
                      {claim.status === "pending" && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => updateClaimStatus(claim.id, "under_review")}
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            Mark under review
                          </button>
                          <button
                            onClick={() => updateClaimStatus(claim.id, "approved")}
                            className="btn text-accent-600 border border-slate-200 hover:bg-accent-50 text-xs py-1.5 px-3"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => updateClaimStatus(claim.id, "rejected")}
                            className="btn text-rose-600 border border-slate-200 hover:bg-rose-50 text-xs py-1.5 px-3"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {claim.status === "under_review" && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => updateClaimStatus(claim.id, "approved")}
                            className="btn text-accent-600 border border-slate-200 hover:bg-accent-50 text-xs py-1.5 px-3"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => updateClaimStatus(claim.id, "rejected")}
                            className="btn text-rose-600 border border-slate-200 hover:bg-rose-50 text-xs py-1.5 px-3"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={!!confirmUser}
        title={confirmUser?.account_status === "active" ? "Suspend this user?" : "Reactivate this user?"}
        message={
          confirmUser?.account_status === "active"
            ? "The user will lose access to their account. They can be reactivated later."
            : "The user will regain access to their account."
        }
        confirmLabel={confirmUser?.account_status === "active" ? "Suspend" : "Reactivate"}
        danger={confirmUser?.account_status === "active"}
        onConfirm={() => confirmUser && toggleUserStatus(confirmUser)}
        onCancel={() => setConfirmUser(null)}
      />
      <ConfirmDialog
        open={!!confirmItem}
        title="Remove this item?"
        message="This will permanently delete the item report and any associated matches. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmItem && deleteItem(confirmItem)}
        onCancel={() => setConfirmItem(null)}
      />
    </div>
  );
}

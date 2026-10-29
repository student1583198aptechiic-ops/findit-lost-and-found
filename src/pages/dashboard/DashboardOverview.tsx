import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PackagePlus,
  Search,
  ShieldCheck,
  Eye,
  ArrowRight,
  MessageSquare,
  Bell,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { SkeletonCard } from "@/components/ui/State";
import { ItemCard } from "@/components/ui/ItemCard";
import type { ItemWithReporter } from "@/types";

export function DashboardOverview() {
  const { session } = useAuth();
  const [stats, setStats] = useState({
    lost: 0,
    found: 0,
    claims: 0,
    matches: 0,
  });
  const [recentItems, setRecentItems] = useState<ItemWithReporter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    async function load() {
      const uid = session!.user.id;
      const [
        { count: lost },
        { count: found },
        { count: claims },
        { count: matches },
        { data: items },
      ] = await Promise.all([
        supabase.from("items").select("*", { count: "exact", head: true }).eq("reporter_id", uid).eq("item_type", "LOST"),
        supabase.from("items").select("*", { count: "exact", head: true }).eq("reporter_id", uid).eq("item_type", "FOUND"),
        supabase.from("claims").select("*", { count: "exact", head: true }).eq("claimant_id", uid).in("status", ["pending", "under_review"]),
        supabase.from("matches").select("*", { count: "exact", head: true }).or(
          `lost_item_id.in.(select id from items where reporter_id=eq.${uid}),found_item_id.in.(select id from items where reporter_id=eq.${uid})`
        ),
        supabase
          .from("items")
          .select("*, reporter:public_profiles!items_reporter_id_fkey(*)")
          .eq("reporter_id", uid)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);
      setStats({
        lost: lost ?? 0,
        found: found ?? 0,
        claims: claims ?? 0,
        matches: matches ?? 0,
      });
      setRecentItems((items as ItemWithReporter[]) ?? []);
      setLoading(false);
    }
    load();
  }, [session?.user]);

  const cards = [
    { label: "My Lost Items", value: stats.lost, icon: Search, to: "/dashboard/lost-items", color: "bg-rose-50 text-rose-600" },
    { label: "My Found Items", value: stats.found, icon: PackagePlus, to: "/dashboard/found-items", color: "bg-accent-50 text-accent-600" },
    { label: "Pending Claims", value: stats.claims, icon: ShieldCheck, to: "/dashboard/claims", color: "bg-amber-50 text-amber-600" },
    { label: "Potential Matches", value: stats.matches, icon: Eye, to: "/dashboard", color: "bg-navy-50 text-navy-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900 mb-1">Dashboard</h1>
      <p className="text-sm text-navy-500 mb-6">
        Manage your reports, claims, and messages.
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="card p-5 hover:shadow-card-hover group"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-navy-900">{c.value}</p>
            <p className="text-sm text-navy-500 flex items-center gap-1 mt-0.5">
              {c.label}
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link to="/report-lost" className="card p-5 flex items-center gap-4 hover:shadow-card-hover group">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Search className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-navy-900">Report a lost item</p>
            <p className="text-sm text-navy-500">Let the community help you find it.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-navy-400 group-hover:text-navy-600 transition-colors" />
        </Link>
        <Link to="/report-found" className="card p-5 flex items-center gap-4 hover:shadow-card-hover group">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <PackagePlus className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-navy-900">Report a found item</p>
            <p className="text-sm text-navy-500">Help someone get their item back.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-navy-400 group-hover:text-navy-600 transition-colors" />
        </Link>
      </div>

      {/* Recent items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy-900">My recent reports</h2>
          <div className="flex gap-2">
            <Link to="/dashboard/lost-items" className="text-sm text-navy-500 hover:text-navy-700">
              Lost
            </Link>
            <span className="text-navy-300">·</span>
            <Link to="/dashboard/found-items" className="text-sm text-navy-500 hover:text-navy-700">
              Found
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-navy-500 text-sm">
              You haven't reported any items yet.
            </p>
            <Link to="/report-lost" className="btn-primary mt-4">
              Report your first item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

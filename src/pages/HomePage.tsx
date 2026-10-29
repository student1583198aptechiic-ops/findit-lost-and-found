import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  PackagePlus,
  Search as SearchIcon,
  Eye,
  HandHeart,
  BarChart3,
  Laptop,
  Wallet,
  Key,
  Backpack,
  FileText,
  Gem,
  Shirt,
  PawPrint,
  Package,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ItemWithReporter, PlatformStats } from "@/types";
import { ItemCard } from "@/components/ui/ItemCard";
import { SkeletonCard } from "@/components/ui/State";
import { CATEGORIES } from "@/types";
import { formatDate } from "@/lib/utils";

const CATEGORY_ICONS = {
  Electronics: Laptop,
  Wallets: Wallet,
  Keys: Key,
  Bags: Backpack,
  Documents: FileText,
  Jewelry: Gem,
  Clothing: Shirt,
  Pets: PawPrint,
  Other: Package,
} as const;

export function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentItems, setRecentItems] = useState<ItemWithReporter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: statsData }, { data: itemsData, error: itemsError }] =
        await Promise.all([
          supabase.rpc("platform_stats"),
          supabase
            .from("items")
            .select("*, reporter:public_profiles!items_reporter_id_fkey(*)")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);
      if (!itemsError) setRecentItems((itemsData as ItemWithReporter[]) ?? []);
      setStats(statsData as PlatformStats | null);
      setLoading(false);
    }
    load();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/items?search=${encodeURIComponent(search)}`);
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-700/50 border border-navy-600 text-sm text-navy-200 mb-6">
              <span className="h-2 w-2 rounded-full bg-accent-400 animate-pulse" />
              Smart matching engine powered by AI-ready scoring
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Lost Something?
              <br />
              <span className="text-accent-400">Let's Find It.</span>
            </h1>
            <p className="mt-5 text-lg text-navy-200 max-w-2xl mx-auto">
              FindIt reconnects people with their lost belongings. Report a lost
              item, share something you've found, and let our smart matching
              system do the rest.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="mt-8 max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for items, categories, locations..."
                  className="w-full rounded-xl border-0 bg-white pl-12 pr-32 py-4 text-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-accent-400/30 shadow-lg"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn-accent py-2.5 px-5"
                >
                  Search
                </button>
              </div>
            </form>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/report-lost" className="btn-primary bg-white text-navy-800 hover:bg-slate-100 py-3 px-6">
                <SearchIcon className="h-5 w-5" /> Report Lost Item
              </Link>
              <Link to="/report-found" className="btn-accent py-3 px-6">
                <PackagePlus className="h-5 w-5" /> Report Found Item
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Reported Items", value: stats?.total_items ?? 0, icon: BarChart3 },
            { label: "Lost Reports", value: stats?.lost_count ?? 0, icon: SearchIcon },
            { label: "Found Reports", value: stats?.found_count ?? 0, icon: PackagePlus },
            { label: "Returned Home", value: stats?.returned_count ?? 0, icon: HandHeart },
          ].map((stat) => (
            <div key={stat.label} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-5 w-5 text-navy-400" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-navy-900">
                {(stat.value ?? 0).toLocaleString()}
              </p>
              <p className="text-sm text-navy-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-navy-900">
            Browse by Category
          </h2>
          <p className="mt-2 text-navy-500">
            Find exactly what you're looking for across common item types.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            return (
              <Link
                key={cat}
                to={`/items?category=${encodeURIComponent(cat)}`}
                className="card p-4 flex flex-col items-center gap-2 hover:shadow-card-hover hover:-translate-y-0.5 group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-600 group-hover:bg-navy-100 transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-navy-700 text-center">
                  {cat}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16 border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-navy-900">
              How It Works
            </h2>
            <p className="mt-2 text-navy-500">
              Three simple steps to get your belongings back.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: 1,
                title: "Report Your Item",
                description:
                  "Create a detailed lost or found report with photos, category, location, and distinguishing characteristics.",
                icon: PackagePlus,
              },
              {
                step: 2,
                title: "Get Matched",
                description:
                  "Our smart matching engine compares your report against all others and surfaces potential matches with a relevance score.",
                icon: Eye,
              },
              {
                step: 3,
                title: "Reconnect Safely",
                description:
                  "Submit a claim, verify ownership privately, and coordinate the return through our secure messaging system.",
                icon: HandHeart,
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50 text-navy-600 mb-4">
                  <item.icon className="h-8 w-8" />
                </div>
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-white text-sm font-bold mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-navy-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-navy-500 max-w-xs mx-auto">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent items */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-navy-900">
              Recently Reported
            </h2>
            <p className="mt-2 text-navy-500">
              Latest lost and found items added to the platform.
            </p>
          </div>
          <Link
            to="/items"
            className="hidden sm:inline-flex btn-secondary"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-navy-500">
              No items have been reported yet. Be the first to report a lost or
              found item!
            </p>
            <Link to="/report-lost" className="btn-primary mt-4">
              <PackagePlus className="h-4 w-4" /> Report an item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-navy-800 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">
            Ready to find what's lost?
          </h2>
          <p className="mt-3 text-navy-200">
            Join our community and help reconnect people with their belongings.
            It's free and takes less than a minute.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="btn bg-white text-navy-800 hover:bg-slate-100 py-3 px-6">
              Create an account
            </Link>
            <Link to="/items" className="btn border border-navy-500 text-white hover:bg-navy-700 py-3 px-6">
              Browse items
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Grid,
  List,
  X,
  ChevronLeft,
  ChevronRight,
  PackageSearch,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ItemWithReporter } from "@/types";
import { CATEGORIES } from "@/types";
import { ItemCard, ItemTypeBadge, StatusBadge } from "@/components/ui/ItemCard";
import { SkeletonGrid, EmptyState, ErrorState } from "@/components/ui/State";
import { PAGE_SIZE } from "@/lib/constants";
import { classNames, formatDate } from "@/lib/utils";
import { Link } from "react-router-dom";

type SortOption = "newest" | "oldest";

export function BrowseItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ItemWithReporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">(() => {
    return (localStorage.getItem("browse-view") as "grid" | "list") || "grid";
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = searchParams.get("search") || "";
  const itemType = searchParams.get("type") || "";
  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";
  const sort = (searchParams.get("sort") as SortOption) || "newest";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      setSearchParams(next, { replace: true });
      setPage(1);
    },
    [searchParams, setSearchParams]
  );

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setPage(1);
  };

  useEffect(() => {
    localStorage.setItem("browse-view", view);
  }, [view]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);
      let query = supabase
        .from("items")
        .select(
          "*, reporter:public_profiles!items_reporter_id_fkey(*)",
          { count: "exact" }
        );

      if (search) {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%`
        );
      }
      if (itemType) query = query.eq("item_type", itemType);
      if (category) query = query.eq("category", category);
      if (status) query = query.eq("status", status);

      query = query.order("created_at", {
        ascending: sort === "oldest",
      });

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error: err, count } = await query;
      if (err) {
        setError(true);
        setItems([]);
      } else {
        setItems((data as ItemWithReporter[]) ?? []);
        setTotal(count ?? 0);
      }
      setLoading(false);
    }
    load();
  }, [search, itemType, category, status, sort, page]);

  const hasFilters = !!(search || itemType || category || status);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy-900">
            Browse Items
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            {total.toLocaleString()} item{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="input py-2 w-auto text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <div className="hidden sm:flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setView("grid")}
              className={classNames(
                "p-1.5 rounded-md transition-colors",
                view === "grid"
                  ? "bg-navy-50 text-navy-700"
                  : "text-navy-400 hover:text-navy-600"
              )}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={classNames(
                "p-1.5 rounded-md transition-colors",
                view === "list"
                  ? "bg-navy-50 text-navy-700"
                  : "text-navy-400 hover:text-navy-600"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden btn-secondary w-full mb-3"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <div
            className={classNames(
              "lg:block",
              filtersOpen
                ? "fixed inset-0 z-50 bg-navy-900/40 lg:bg-transparent"
                : "hidden"
            )}
            onClick={() => setFiltersOpen(false)}
          >
            <div
              className={classNames(
                "bg-white lg:bg-transparent p-4 lg:p-0 h-full lg:h-auto w-72 lg:w-full overflow-y-auto",
                filtersOpen ? "absolute left-0 top-0" : ""
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <span className="font-semibold text-navy-900">Filters</span>
                <button onClick={() => setFiltersOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search within filters */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => updateParam("search", e.target.value)}
                  placeholder="Search..."
                  className="input pl-10 py-2 text-sm"
                />
              </div>

              {/* Item type */}
              <div className="mb-5">
                <h3 className="label">Type</h3>
                <div className="space-y-1.5">
                  {[
                    { value: "", label: "All" },
                    { value: "LOST", label: "Lost" },
                    { value: "FOUND", label: "Found" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="itemType"
                        checked={itemType === opt.value}
                        onChange={() => updateParam("type", opt.value)}
                        className="text-navy-600 focus:ring-navy-500"
                      />
                      <span className="text-navy-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="mb-5">
                <h3 className="label">Status</h3>
                <div className="space-y-1.5">
                  {[
                    { value: "", label: "All" },
                    { value: "open", label: "Open" },
                    { value: "claimed", label: "Claimed" },
                    { value: "returned", label: "Returned" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="status"
                        checked={status === opt.value}
                        onChange={() => updateParam("status", opt.value)}
                        className="text-navy-600 focus:ring-navy-500"
                      />
                      <span className="text-navy-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="mb-5">
                <h3 className="label">Category</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="category"
                      checked={category === ""}
                      onChange={() => updateParam("category", "")}
                      className="text-navy-600 focus:ring-navy-500"
                    />
                    <span className="text-navy-700">All categories</span>
                  </label>
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="category"
                        checked={category === cat}
                        onChange={() => updateParam("category", cat)}
                        className="text-navy-600 focus:ring-navy-500"
                      />
                      <span className="text-navy-700">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-ghost w-full text-sm justify-center"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Items */}
        <div className="flex-1 min-w-0">
          {error ? (
            <ErrorState
              description="We couldn't load items right now."
              onRetry={() => window.location.reload()}
            />
          ) : loading ? (
            <SkeletonGrid count={8} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="h-8 w-8" />}
              title="No items found"
              description={
                hasFilters
                  ? "Try adjusting your filters or search terms."
                  : "Be the first to report a lost or found item."
              }
              action={
                hasFilters ? (
                  <button onClick={clearFilters} className="btn-secondary">
                    Clear filters
                  </button>
                ) : (
                  <Link to="/report-lost" className="btn-primary">
                    Report an item
                  </Link>
                )
              }
            />
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <Link
                  key={item.id}
                  to={`/items/${item.id}`}
                  className="card group flex gap-4 overflow-hidden hover:shadow-card-hover"
                >
                  <div className="w-32 h-32 flex-shrink-0 bg-slate-100">
                    {item.images?.[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <PackageSearch className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-navy-900 truncate group-hover:text-navy-600">
                        {item.title}
                      </h3>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <ItemTypeBadge type={item.item_type} />
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-navy-500 line-clamp-2">
                      {item.description || "No description provided"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-navy-500">
                      <span>{item.category}</span>
                      {item.approximate_location && <span>· {item.approximate_location}</span>}
                      <span>· {formatDate(item.date_lost_or_found)}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && items.length > 0 && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-2 px-3 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="text-sm text-navy-600 px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-2 px-3 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

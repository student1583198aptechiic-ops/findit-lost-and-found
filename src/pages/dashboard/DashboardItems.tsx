import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackagePlus, Search, Trash2, Pencil, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { ItemWithReporter, ItemType } from "@/types";
import { ItemCard } from "@/components/ui/ItemCard";
import { SkeletonGrid, EmptyState } from "@/components/ui/State";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";

export function DashboardItems({ type }: { type: ItemType }) {
  const { session } = useAuth();
  const [items, setItems] = useState<ItemWithReporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    async function load() {
      const { data } = await supabase
        .from("items")
        .select("*, reporter:public_profiles!items_reporter_id_fkey(*)")
        .eq("reporter_id", session!.user.id)
        .eq("item_type", type)
        .order("created_at", { ascending: false });
      setItems((data as ItemWithReporter[]) ?? []);
      setLoading(false);
    }
    load();
  }, [session?.user, type]);

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("items").delete().eq("id", deleteId);
    setDeleting(false);
    if (error) {
      toast.error("Could not delete this item.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    toast.success("Item deleted.");
    setDeleteId(null);
  }

  const isLost = type === "LOST";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            {isLost ? "My Lost Items" : "My Found Items"}
          </h1>
          <p className="text-sm text-navy-500 mt-1">
            {items.length} {isLost ? "lost" : "found"} report{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link to={isLost ? "/report-lost" : "/report-found"} className="btn-primary">
          {isLost ? <Search className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
          Report new
        </Link>
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={isLost ? <Search className="h-8 w-8" /> : <PackagePlus className="h-8 w-8" />}
          title={`No ${isLost ? "lost" : "found"} items yet`}
          description={`You haven't reported any ${isLost ? "lost" : "found"} items. Create your first report to get started.`}
          action={
            <Link to={isLost ? "/report-lost" : "/report-found"} className="btn-primary">
              {isLost ? "Report a lost item" : "Report a found item"}
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              <ItemCard item={item} />
              <div className="mt-2 flex gap-2">
                <Link
                  to={`/items/${item.id}`}
                  className="flex-1 btn-secondary py-1.5 text-xs justify-center"
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </Link>
                {item.status === "open" && (
                  <Link
                    to={`/items/${item.id}`}
                    className="flex-1 btn-secondary py-1.5 text-xs justify-center"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                )}
                <button
                  onClick={() => setDeleteId(item.id)}
                  className="btn-secondary py-1.5 px-3 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete this item?"
        message="This will permanently remove your report and any associated matches. This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

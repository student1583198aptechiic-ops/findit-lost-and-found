import { Link } from "react-router-dom";
import { MapPin, Calendar, Eye } from "lucide-react";
import type { ItemWithReporter } from "@/types";
import { formatDate, classNames } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/constants";

export function ItemTypeBadge({ type }: { type: "LOST" | "FOUND" }) {
  const isLost = type === "LOST";
  return (
    <span
      className={classNames(
        "badge",
        isLost
          ? "bg-rose-50 text-rose-600 border-rose-200"
          : "bg-accent-50 text-accent-700 border-accent-200"
      )}
    >
      {isLost ? "Lost" : "Found"}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    open: "bg-blue-50 text-blue-600 border-blue-200",
    claimed: "bg-amber-50 text-amber-600 border-amber-200",
    returned: "bg-emerald-50 text-emerald-600 border-emerald-200",
    closed: "bg-slate-50 text-slate-500 border-slate-200",
  };
  const labels: Record<string, string> = {
    open: "Open",
    claimed: "Claimed",
    returned: "Returned",
    closed: "Closed",
  };
  return (
    <span className={classNames("badge", classes[status] ?? classes.closed)}>
      {labels[status] ?? status}
    </span>
  );
}

export function ItemCard({ item }: { item: ItemWithReporter }) {
  const Icon = CATEGORY_ICONS[item.category] ?? CATEGORY_ICONS.Other;
  const hasImage = item.images && item.images.length > 0;

  return (
    <Link
      to={`/items/${item.id}`}
      className="card group block overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {hasImage ? (
          <img
            src={item.images[0]}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Icon className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <ItemTypeBadge type={item.item_type} />
        </div>
        <div className="absolute top-3 right-3">
          <StatusBadge status={item.status} />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-navy-900 truncate group-hover:text-navy-600 transition-colors">
          {item.title}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-navy-500">
          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{item.category}</span>
        </div>
        {item.approximate_location && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-navy-500">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{item.approximate_location}</span>
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-navy-500">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{formatDate(item.date_lost_or_found)}</span>
        </div>
        {item.reporter && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-navy-500">
            <span>by {item.reporter.full_name || "Anonymous"}</span>
            <span className="flex items-center gap-1 text-navy-400 group-hover:text-navy-600 transition-colors">
              <Eye className="h-3.5 w-3.5" /> View
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

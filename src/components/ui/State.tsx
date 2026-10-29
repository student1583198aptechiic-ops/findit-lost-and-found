import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function FullPageSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Spinner className="h-8 w-8 text-navy-500" />
      <p className="text-sm text-navy-500">{label}</p>
    </div>
  );
}

export function LoadingOverlay({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 gap-2">
      <Spinner className="h-6 w-6 text-navy-500" />
      {label && <span className="text-sm text-navy-500">{label}</span>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-navy-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-navy-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-400 mb-4">
        <span className="text-2xl">!</span>
      </div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-navy-500 max-w-sm">{description}</p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-5">
          Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Palette,
  Eye,
  MessageSquare,
  HandHeart,
  ShieldCheck,
  Tag,
  AlertTriangle,
  PackageSearch,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { ItemWithReporter, MatchWithItems } from "@/types";
import {
  FullPageSpinner,
  ErrorState,
  EmptyState,
} from "@/components/ui/State";
import {
  ItemCard,
  ItemTypeBadge,
  StatusBadge,
} from "@/components/ui/ItemCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CATEGORY_ICONS } from "@/lib/constants";
import { formatDate, classNames } from "@/lib/utils";
import toast from "react-hot-toast";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export function ItemDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [item, setItem] = useState<ItemWithReporter | null>(null);
  const [matches, setMatches] = useState<MatchWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimText, setClaimText] = useState("");
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setError(false);
      const { data, error: err } = await supabase
        .from("items")
        .select(
          "*, reporter:public_profiles!items_reporter_id_fkey(*)"
        )
        .eq("id", id)
        .maybeSingle();
      if (err || !data) {
        setError(true);
        setItem(null);
      } else {
        setItem(data as ItemWithReporter);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Load matches
  useEffect(() => {
    if (!item || item.status === "returned" || item.status === "closed") {
      setMatches([]);
      return;
    }
    async function loadMatches() {
      if (!id) return;
      let query;
      if (item!.item_type === "LOST") {
        query = supabase
          .from("matches")
          .select(
            "*, found_item:items!matches_found_item_id_fkey(*, reporter:public_profiles!items_reporter_id_fkey(*))"
          )
          .eq("lost_item_id", id)
          .order("score", { ascending: false });
      } else {
        query = supabase
          .from("matches")
          .select(
            "*, lost_item:items!matches_lost_item_id_fkey(*, reporter:public_profiles!items_reporter_id_fkey(*))"
          )
          .eq("found_item_id", id)
          .order("score", { ascending: false });
      }
      const { data } = await query;
      setMatches((data as MatchWithItems[]) ?? []);
    }
    loadMatches();
  }, [item, id]);

  const isOwner = session?.user?.id === item?.reporter_id;
  const Icon = item ? (CATEGORY_ICONS[item.category] ?? CATEGORY_ICONS.Other) : PackageSearch;

  async function handleContact() {
    if (!session) {
      navigate("/login", { state: { from: `/items/${id}` } });
      return;
    }
    if (!item) return;
    setContactLoading(true);
    try {
      const me = session.user.id;
      const other = item.reporter_id;
      const [a, b] = me < other ? [me, other] : [other, me];
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_a", a)
        .eq("participant_b", b)
        .eq("related_item_id", item.id)
        .maybeSingle();
      if (existing) {
        navigate(`/dashboard/messages/${existing.id}`);
        return;
      }
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          participant_a: a,
          participant_b: b,
          related_item_id: item.id,
        })
        .select()
        .single();
      if (error) throw error;
      navigate(`/dashboard/messages/${conv.id}`);
    } catch {
      toast.error("Could not start a conversation. Try again.");
    } finally {
      setContactLoading(false);
    }
  }

  async function handleSubmitClaim() {
    if (!session) {
      navigate("/login", { state: { from: `/items/${id}` } });
      return;
    }
    if (!claimText.trim() || !item) return;
    setClaimSubmitting(true);
    try {
      const { error } = await supabase.from("claims").insert({
        item_id: item.id,
        claimant_id: session.user.id,
        private_description: claimText.trim(),
        status: "pending",
      });
      if (error) throw error;
      // Notify the item reporter
      await supabase.rpc("create_notification", {
        p_recipient: item.reporter_id,
        p_type: "claim",
        p_title: "New claim on your item",
        p_message: "Someone submitted a claim on your found item.",
        p_related_id: item.id,
        p_related_type: "item",
      });
      toast.success("Your claim has been submitted for review.");
      setClaimOpen(false);
      setClaimText("");
      navigate("/dashboard/claims");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not submit claim.";
      toast.error(msg);
    } finally {
      setClaimSubmitting(false);
    }
  }

  if (loading) return <FullPageSpinner />;
  if (error || !item)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Item not found"
          description="This item may have been removed or the link is incorrect."
          onRetry={() => navigate("/items")}
        />
      </div>
    );

  const isFound = item.item_type === "FOUND";
  const hasCoords = item.lat != null && item.lng != null;
  const matchItems = matches.map((m) =>
    item.item_type === "LOST" ? m.found_item : m.lost_item
  ).filter(Boolean) as ItemWithReporter[];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <Link
        to="/items"
        className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left: gallery + details */}
        <div className="lg:col-span-3">
          {/* Gallery */}
          {item.images.length > 0 ? (
            <div className="space-y-3">
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 card">
                <img
                  src={item.images[activeImage]}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>
              {item.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {item.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={classNames(
                        "h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors",
                        activeImage === i
                          ? "border-navy-500"
                          : "border-transparent hover:border-slate-300"
                      )}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[4/3] rounded-xl bg-slate-100 card flex items-center justify-center">
              <Icon className="h-16 w-16 text-slate-300" />
            </div>
          )}

          {/* Description */}
          <div className="card p-6 mt-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex gap-2">
                <ItemTypeBadge type={item.item_type} />
                <StatusBadge status={item.status} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-navy-900">{item.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-navy-500">
              <span className="flex items-center gap-1.5">
                <Tag className="h-4 w-4" /> {item.category}
              </span>
              {item.color && (
                <span className="flex items-center gap-1.5">
                  <Palette className="h-4 w-4" /> {item.color}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(item.date_lost_or_found)}
              </span>
              {item.approximate_location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {item.approximate_location}
                </span>
              )}
            </div>

            {item.description && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-navy-800 mb-1.5">
                  Description
                </h3>
                <p className="text-sm text-navy-600 whitespace-pre-wrap">
                  {item.description}
                </p>
              </div>
            )}

            {item.identifying_characteristics && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-navy-800 mb-1.5">
                  Identifying Characteristics
                </h3>
                <p className="text-sm text-navy-600 whitespace-pre-wrap">
                  {item.identifying_characteristics}
                </p>
              </div>
            )}

            {item.reward && (
              <div className="mt-4 p-3 rounded-lg bg-accent-50 border border-accent-200">
                <span className="text-sm font-semibold text-accent-700">
                  Reward: {item.reward}
                </span>
              </div>
            )}
          </div>

          {/* Map */}
          {hasCoords && (
            <div className="card p-6 mt-6">
              <h3 className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Approximate Location
              </h3>
              <div className="h-64 rounded-lg overflow-hidden border border-slate-200">
                <MapContainer
                  center={[item.lat!, item.lng!]}
                  zoom={13}
                  className="h-full w-full"
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <Marker position={[item.lat!, item.lng!]}>
                    <Popup>
                      Approximate location where the item was {isFound ? "found" : "lost"}.
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
              <p className="mt-2 text-xs text-navy-400">
                Location is approximate to protect privacy. Exact addresses are
                never shown publicly.
              </p>
            </div>
          )}
        </div>

        {/* Right: actions + reporter */}
        <div className="lg:col-span-2 space-y-4">
          {/* Action card */}
          <div className="card p-5">
            {isOwner ? (
              <div>
                <p className="text-sm text-navy-500 mb-3">
                  This is your listing. You can manage it from your dashboard.
                </p>
                <Link to="/dashboard" className="btn-secondary w-full">
                  Manage listing
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900">
                  {isFound ? "Is this your item?" : "Found this item?"}
                </h3>
                <p className="text-sm text-navy-500">
                  {isFound
                    ? "Submit a claim with private identifying details for the reporter to review."
                    : "Contact the reporter or start a conversation to coordinate."}
                </p>
                {isFound && (
                  <button
                    onClick={() => {
                      if (!session) {
                        navigate("/login", { state: { from: `/items/${id}` } });
                      } else {
                        setClaimOpen(true);
                      }
                    }}
                    className="btn-primary w-full"
                  >
                    <ShieldCheck className="h-4 w-4" /> Submit a claim
                  </button>
                )}
                <button
                  onClick={handleContact}
                  disabled={contactLoading}
                  className={isFound ? "btn-secondary w-full" : "btn-primary w-full"}
                >
                  <MessageSquare className="h-4 w-4" /> Contact reporter
                </button>
                {!session && (
                  <p className="text-xs text-navy-400 text-center">
                    <Link to="/login" className="text-navy-600 underline">
                      Sign in
                    </Link>{" "}
                    to take action
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reporter info */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-navy-800 mb-3">
              Reported by
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-600 font-semibold overflow-hidden">
                {item.reporter?.avatar_url ? (
                  <img
                    src={item.reporter.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-base">
                    {item.reporter?.full_name?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-navy-900">
                  {item.reporter?.full_name || "Anonymous user"}
                </p>
                <p className="text-xs text-navy-400">
                  Reported {formatDate(item.created_at)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-navy-400 bg-slate-50 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                For your safety, keep sensitive identifying details private and
                only share them through the claim verification process.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Possible matches */}
      {matchItems.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-navy-900 mb-1 flex items-center gap-2">
            <Eye className="h-5 w-5 text-navy-500" /> Possible Matches
          </h2>
          <p className="text-sm text-navy-500 mb-5">
            Our matching engine found {matchItems.length} potential{" "}
            {matchItems.length === 1 ? "match" : "matches"} for this item.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {matches.map((m) => {
              const matched = item.item_type === "LOST" ? m.found_item : m.lost_item;
              if (!matched) return null;
              return (
                <div key={m.id} className="relative">
                  <ItemCard item={matched} />
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-navy-500 to-accent-500 rounded-full"
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-navy-700">
                      {m.score}%
                    </span>
                  </div>
                  {m.matching_attributes.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.matching_attributes.map((attr) => (
                        <span
                          key={attr}
                          className="badge bg-navy-50 text-navy-600 border-navy-100 capitalize text-[10px]"
                        >
                          {attr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Claim dialog */}
      <ConfirmDialog
        open={claimOpen}
        title="Submit a claim"
        message="Explain why you believe this item belongs to you. Include identifying details that only the owner would know. This information is only visible to the item reporter and platform admins."
        confirmLabel="Submit claim"
        onConfirm={handleSubmitClaim}
        onCancel={() => setClaimOpen(false)}
      >
        <div className="mt-4">
          <textarea
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            placeholder="e.g. The laptop has a scratch on the bottom-right corner and a sticker of a mountain on the lid..."
            className="input min-h-[120px] resize-y"
            maxLength={1000}
            disabled={claimSubmitting}
          />
          <p className="mt-1 text-xs text-navy-400">
            {claimText.length}/1000 characters
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import type { ItemType } from "@/types";
import { CATEGORIES } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { MapPicker } from "@/components/ui/MapPicker";
import toast from "react-hot-toast";

export function ReportItemForm({ itemType }: { itemType: ItemType }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isLost = itemType === "LOST";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [characteristics, setCharacteristics] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [reward, setReward] = useState("");
  const [contactPref, setContactPref] = useState<"message" | "email">("message");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addImage(url: string) {
    setImages((prev) => [...prev, url]);
  }
  function removeImage(url: string) {
    setImages((prev) => prev.filter((i) => i !== url));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!session) {
      navigate("/login", { state: { from: isLost ? "/report-lost" : "/report-found" } });
      return;
    }
    if (!title.trim()) return setError("Please enter an item name.");
    if (!category) return setError("Please select a category.");
    if (!description.trim()) return setError("Please provide a description.");
    if (!date) return setError(`Please enter the date ${isLost ? "lost" : "found"}.`);

    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("items")
        .insert({
          title: title.trim(),
          category,
          description: description.trim(),
          color: color.trim(),
          identifying_characteristics: characteristics.trim(),
          item_type: itemType,
          status: "open",
          images,
          approximate_location: location.trim(),
          lat,
          lng,
          date_lost_or_found: date,
          reward: reward.trim(),
          reporter_id: session.user.id,
          contact_preference: contactPref,
        })
        .select()
        .single();

      if (err) throw err;

      // Generate matches in background
      supabase.rpc("generate_matches", { p_item: data.id }).then(({ error }) => {
        if (error) console.error("Match generation error:", error.message);
      });

      toast.success(
        isLost
          ? "Lost item reported! We'll search for matches."
          : "Found item reported! We'll search for matches."
      );
      navigate(`/items/${data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save your report.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card p-6 md:p-8">
        <h1 className="text-2xl font-bold text-navy-900">
          {isLost ? "Report a Lost Item" : "Report a Found Item"}
        </h1>
        <p className="mt-1.5 text-sm text-navy-500">
          {isLost
            ? "Tell us what you lost. The more detail you provide, the better our matching system can help."
            : "Tell us what you found. Keep unique identifying details private — share them only during the claim verification process."}
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Title */}
          <div>
            <label className="label" htmlFor="title">
              Item name <span className="text-rose-500">*</span>
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isLost ? "e.g. Black iPhone 14" : "e.g. Brown leather wallet"}
              className="input"
              maxLength={100}
            />
          </div>

          {/* Category + Color */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="category">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="color">Color</label>
              <input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Black, Silver, Red"
                className="input"
                maxLength={50}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label" htmlFor="description">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isLost
                  ? "Describe the item — brand, model, size, any marks or stickers..."
                  : "Describe what you found — type, material, visible features (keep private details for verification)..."
              }
              className="input min-h-[100px] resize-y"
              maxLength={1000}
            />
          </div>

          {/* Identifying characteristics */}
          <div>
            <label className="label" htmlFor="characteristics">
              Distinguishing characteristics
            </label>
            <textarea
              id="characteristics"
              value={characteristics}
              onChange={(e) => setCharacteristics(e.target.value)}
              placeholder="e.g. Scratched corner, sticker on back, engraved initials..."
              className="input min-h-[70px] resize-y"
              maxLength={500}
            />
          </div>

          {/* Date + Location */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="date">
                Date {isLost ? "lost" : "found"} <span className="text-rose-500">*</span>
              </label>
              <input
                id="date"
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="location">Approximate location</label>
              <input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Downtown Park, Main St area"
                className="input"
                maxLength={100}
              />
            </div>
          </div>

          {/* Map picker */}
          <div>
            <label className="label">Map location (optional)</label>
            <MapPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
          </div>

          {/* Images */}
          <div>
            <label className="label">Photos</label>
            <ImageUpload images={images} onAdd={addImage} onRemove={removeImage} />
          </div>

          {/* Reward (lost only) */}
          {isLost && (
            <div>
              <label className="label" htmlFor="reward">Reward (optional)</label>
              <input
                id="reward"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="e.g. $50 or a coffee on me"
                className="input"
                maxLength={100}
              />
            </div>
          )}

          {/* Contact preference */}
          <div>
            <label className="label">Contact preference</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="contactPref"
                  checked={contactPref === "message"}
                  onChange={() => setContactPref("message")}
                  className="text-navy-600 focus:ring-navy-500"
                />
                <span className="text-navy-700">In-app messages</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="contactPref"
                  checked={contactPref === "email"}
                  onChange={() => setContactPref("email")}
                  className="text-navy-600 focus:ring-navy-500"
                />
                <span className="text-navy-700">Email (via account)</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 py-3"
            >
              {loading
                ? "Saving..."
                : isLost
                ? "Report lost item"
                : "Report found item"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

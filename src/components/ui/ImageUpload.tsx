import { useState, useRef, type ChangeEvent } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { classNames } from "@/lib/utils";

export function ImageUpload({
  images,
  onAdd,
  onRemove,
  max = 5,
}: {
  images: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setError("");
    if (images.length + files.length > max) {
      setError(`You can upload up to ${max} images total.`);
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 4 * 1024 * 1024) {
          setError("Each image must be under 4 MB.");
          continue;
        }
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed.");
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("item-images")
          .upload(path, file, {
            contentType: file.type,
            cacheControl: "3600",
          });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("item-images").getPublicUrl(path);
        onAdd(data.publicUrl);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setError(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {images.map((url) => (
          <div
            key={url}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(url)}
              className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-navy-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={classNames(
              "aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-navy-300 flex flex-col items-center justify-center gap-2 text-navy-400 hover:text-navy-600 hover:bg-navy-50/50 transition-colors",
              uploading && "opacity-50"
            )}
          >
            {uploading ? (
              <div className="h-6 w-6 border-2 border-navy-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="h-6 w-6" />
                <span className="text-xs font-medium">Upload</span>
              </>
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {images.length === 0 && !uploading && (
        <p className="mt-2 text-xs text-navy-400 flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5" />
          Up to {max} images. PNG, JPG, WEBP. Max 4 MB each.
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  );
}

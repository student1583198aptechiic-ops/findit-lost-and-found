import { useEffect, useState, useRef } from "react";
import { User, Save, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Profile } from "@/types";
import toast from "react-hot-toast";

export function DashboardProfile() {
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setBio(profile?.bio ?? "");
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), bio: bio.trim() })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save profile.");
      return;
    }
    await refreshProfile();
    toast.success("Profile updated.");
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.user.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          contentType: file.type,
          upsert: true,
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", session.user.id);
      if (profErr) throw profErr;
      await refreshProfile();
      toast.success("Profile photo updated.");
    } catch {
      toast.error("Could not upload image.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-navy-900 mb-1">Profile Settings</h1>
      <p className="text-sm text-navy-500 mb-6">
        Update your profile information and preferences.
      </p>

      {/* Avatar */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-navy-800 mb-4">Profile photo</h2>
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-navy-100 flex items-center justify-center text-navy-500 flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8" />
            )}
          </div>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-secondary"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Upload new photo
                </>
              )}
            </button>
            <p className="mt-2 text-xs text-navy-400">
              PNG, JPG, or WEBP. Max 4 MB.
            </p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleAvatar}
          className="hidden"
        />
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="card p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-navy-800 mb-4">
            Account information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                maxLength={80}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                value={session?.user?.email ?? ""}
                disabled
                className="input bg-slate-50 text-navy-400"
              />
              <p className="mt-1 text-xs text-navy-400">
                Email cannot be changed here.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="bio">Bio (optional)</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the community a little about yourself..."
                className="input min-h-[80px] resize-y"
                maxLength={300}
              />
              <p className="mt-1 text-xs text-navy-400">
                {bio.length}/300 characters
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

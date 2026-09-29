"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { Camera, Save, Trash2, UserRound } from "lucide-react";

export default function ProfileSettingsForm({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [hasAvatar, setHasAvatar] = useState(true);

  function resetFeedback() {
    setMessage("");
    setError("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          displayName: form.get("displayName"),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Profile could not be updated.");
      setMessage(data.message || "Profile updated.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Profile could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    resetFeedback();
    setUploading(true);
    const form = new FormData();
    form.set("avatar", file);
    try {
      const response = await fetch("/api/account/profile/avatar", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Profile picture could not be updated.");
      setHasAvatar(true);
      setAvatarVersion(Date.now());
      setMessage(data.message || "Profile picture updated.");
      if (fileRef.current) fileRef.current.value = "";
      window.dispatchEvent(new Event("shadownode:profile-updated"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Profile picture could not be updated.");
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    resetFeedback();
    setUploading(true);
    try {
      const response = await fetch("/api/account/profile/avatar", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Profile picture could not be removed.");
      setHasAvatar(false);
      setMessage(data.message || "Profile picture removed.");
      window.dispatchEvent(new Event("shadownode:profile-updated"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Profile picture could not be removed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5" aria-labelledby="profile-settings-heading">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex shrink-0 flex-col items-center gap-3">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border border-[#20dc73]/35 bg-black/30 text-[#20dc73]">
            {hasAvatar ? (
              <img
                src={`/api/account/profile/avatar?v=${avatarVersion}`}
                alt="Current profile picture"
                className="h-full w-full object-cover"
                onError={() => setHasAvatar(false)}
              />
            ) : (
              <UserRound className="h-12 w-12" aria-hidden="true" />
            )}
          </div>
          <input
            ref={fileRef}
            id="profile-avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={uploadAvatar}
          />
          <label htmlFor="profile-avatar" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-[#20dc73]/35 px-4 py-2 text-sm text-[#20dc73] hover:bg-[#20dc73]/10 focus-within:ring-2 focus-within:ring-[#20dc73]">
            <Camera className="h-4 w-4" aria-hidden="true" />
            {uploading ? "Processing..." : "Upload picture"}
          </label>
          <button type="button" onClick={removeAvatar} disabled={uploading || !hasAvatar} className="inline-flex min-h-11 items-center gap-2 px-3 text-sm text-white/55 hover:text-red-300 disabled:opacity-40">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
          </button>
          <p className="max-w-48 text-center text-xs leading-5 text-white/40">JPEG, PNG or WebP. Maximum 2 MB. Images are cropped to a square.</p>
        </div>

        <form onSubmit={saveProfile} className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 id="profile-settings-heading" className="font-semibold text-white">Edit Profile</h2>
            <p className="mt-1 text-sm text-white/50">Update the name shown across your account and your sign-in username.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-white/70">
              Username
              <input name="username" defaultValue={username} required minLength={4} maxLength={30} pattern="[A-Za-z0-9_-]+" autoComplete="username" className="mt-2 h-11 w-full rounded-md border border-[#143b28] bg-black/30 px-3 text-white outline-none focus:border-[#20dc73] focus:ring-1 focus:ring-[#20dc73]" />
              <span className="mt-1 block text-xs text-white/35">4–30 letters, numbers, underscores or hyphens.</span>
            </label>
            <label className="text-sm text-white/70">
              Display name
              <input name="displayName" defaultValue={displayName} required maxLength={100} autoComplete="name" className="mt-2 h-11 w-full rounded-md border border-[#143b28] bg-black/30 px-3 text-white outline-none focus:border-[#20dc73] focus:ring-1 focus:ring-[#20dc73]" />
            </label>
          </div>
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#20dc73] px-5 py-2 font-semibold text-[#03110a] hover:bg-[#53e991] disabled:opacity-60">
            <Save className="h-4 w-4" aria-hidden="true" /> {saving ? "Saving..." : "Save profile"}
          </button>
          <div aria-live="polite">
            {message ? <p className="text-sm text-[#7bf69f]">{message}</p> : null}
            {error ? <p className="text-sm text-red-300" role="alert">{error}</p> : null}
          </div>
        </form>
      </div>
    </section>
  );
}

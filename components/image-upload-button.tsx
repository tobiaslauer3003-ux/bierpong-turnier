"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image";
import { cn } from "@/lib/cn";

export function ImageUploadButton({
  bucket,
  path,
  onUploaded,
  label = "Bild ändern",
  className,
}: {
  bucket: "avatars" | "team-images";
  path: string;
  onUploaded: (url: string) => Promise<void> | void;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPending(true);
    setError(null);
    try {
      const blob = await resizeImage(file);
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      await onUploaded(`${data.publicUrl}?t=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className={cn(
          "flex h-11 items-center gap-2 rounded-xl border-2 border-border bg-surface-raised px-4 text-sm font-medium cursor-pointer hover:bg-primary/10 disabled:opacity-50",
          className,
        )}
      >
        <Camera size={18} />
        {pending ? "Wird hochgeladen…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

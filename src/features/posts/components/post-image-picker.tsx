"use client";
import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ImagePlus, X } from "lucide-react";
import {
  AVATAR_COVER_MAX_BYTES,
  AVATAR_COVER_MIME_TYPES,
} from "@/features/profiles/media";
import { MAX_POST_IMAGES } from "../schemas";

type Item = {
  id: string;
  previewUrl: string;
  status: "uploading" | "ready" | "error";
};

function readDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Immagine non valida."));
    img.src = URL.createObjectURL(file);
  });
}

export function PostImagePicker({
  disabled,
  onPendingChange,
}: {
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setError(null);
    const slotsLeft = MAX_POST_IMAGES - items.length;
    const accepted = files.slice(0, slotsLeft);
    if (files.length > slotsLeft)
      setError(`Puoi aggiungere al massimo ${MAX_POST_IMAGES} foto.`);
    for (const file of accepted) {
      if (!AVATAR_COVER_MIME_TYPES.includes(file.type)) {
        setError("Formato non supportato. Usa JPEG, PNG o WebP.");
        continue;
      }
      if (file.size > AVATAR_COVER_MAX_BYTES) {
        setError("L'immagine supera i 5 MB consentiti.");
        continue;
      }
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setItems((current) => [...current, { id, previewUrl, status: "uploading" }]);
      try {
        const { width, height } = await readDimensions(file);
        await upload(`post-${id}.${file.name.split(".").pop()}`, file, {
          access: "public",
          handleUploadUrl: "/api/media/upload",
          clientPayload: JSON.stringify({
            kind: "post",
            assetId: id,
            width,
            height,
            size: file.size,
          }),
        });
        setItems((current) =>
          current.map((item) => (item.id === id ? { ...item, status: "ready" } : item)),
        );
      } catch {
        setItems((current) =>
          current.map((item) => (item.id === id ? { ...item, status: "error" } : item)),
        );
      }
    }
  }

  function remove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  const readyIds = items.filter((item) => item.status === "ready").map((item) => item.id);
  const pending = items.some((item) => item.status === "uploading");
  useEffect(() => onPendingChange?.(pending), [pending, onPendingChange]);

  return (
    <div className="stack">
      <input type="hidden" name="imageIds" value={JSON.stringify(readyIds)} />
      {items.length > 0 && (
        <div className="post-image-picker-previews">
          {items.map((item) => (
            <span key={item.id} className="post-image-picker-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>: app doesn't use next/image elsewhere. */}
              <img src={item.previewUrl} alt="" />
              {item.status === "uploading" && <span className="post-image-picker-badge">…</span>}
              {item.status === "error" && <span className="post-image-picker-badge error">✕</span>}
              <button
                type="button"
                className="post-image-picker-remove"
                aria-label="Rimuovi foto"
                onClick={() => remove(item.id)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_COVER_MIME_TYPES.join(",")}
        multiple
        hidden
        onChange={handleChange}
      />
      <button
        type="button"
        className="button button-subtle"
        disabled={disabled || items.length >= MAX_POST_IMAGES}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus size={15} />
        Aggiungi foto
      </button>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

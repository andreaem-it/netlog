"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Camera } from "lucide-react";
import {
  AVATAR_COVER_MAX_BYTES,
  AVATAR_COVER_MIME_TYPES,
} from "@/features/profiles/media";

function readImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Il file selezionato non è un'immagine valida."));
    };
    image.src = url;
  });
}

export function MediaUploader({
  kind,
  label,
}: {
  kind: "avatar" | "cover";
  label: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (!AVATAR_COVER_MIME_TYPES.includes(file.type)) {
      setError("Formato non supportato. Usa JPEG, PNG o WebP.");
      return;
    }
    if (file.size > AVATAR_COVER_MAX_BYTES) {
      setError("L'immagine supera i 5 MB consentiti.");
      return;
    }
    setPending(true);
    try {
      const { width, height } = await readImageDimensions(file);
      const extension = file.type.split("/")[1];
      await upload(`${kind}-${crypto.randomUUID()}.${extension}`, file, {
        access: "public",
        handleUploadUrl: "/api/media/upload",
        clientPayload: JSON.stringify({
          kind,
          width,
          height,
          size: file.size,
        }),
      });
      // ponytail: the DB row is written by the onUploadCompleted webhook,
      // which only reaches this app on a publicly deployed URL (not plain
      // local dev). Refresh picks it up once that call has landed.
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Caricamento non riuscito.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <span>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_COVER_MIME_TYPES.join(",")}
        hidden
        onChange={handleChange}
      />
      <button
        type="button"
        className="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        <Camera size={15} />
        {pending ? "Caricamento…" : label}
      </button>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
    </span>
  );
}

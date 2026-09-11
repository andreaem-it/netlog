"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Camera } from "lucide-react";
import {
  AVATAR_COVER_MAX_BYTES,
  AVATAR_COVER_MIME_TYPES,
} from "@/features/profiles/media";
import { ImageCropper } from "./image-cropper";

// Fixed output size per kind: the crop viewport uses the same aspect ratio,
// so what you see while cropping is exactly what gets uploaded.
const OUTPUT_SIZE = {
  avatar: { width: 512, height: 512, aspect: 1 },
  cover: { width: 1200, height: 400, aspect: 3 },
} as const;

export function MediaUploader({
  kind,
  label,
  currentUrl,
}: {
  kind: "avatar" | "cover";
  label: string;
  currentUrl?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setSuccess(false);
    if (!AVATAR_COVER_MIME_TYPES.includes(file.type)) {
      setError("Formato non supportato. Usa JPEG, PNG o WebP.");
      return;
    }
    if (file.size > AVATAR_COVER_MAX_BYTES) {
      setError("L'immagine supera i 5 MB consentiti.");
      return;
    }
    setCropFile(file);
  }

  async function handleCropped(blob: Blob) {
    setCropFile(null);
    setPending(true);
    const { width, height } = OUTPUT_SIZE[kind];
    try {
      await upload(`${kind}-${crypto.randomUUID()}.jpg`, blob, {
        access: "public",
        handleUploadUrl: "/api/media/upload",
        clientPayload: JSON.stringify({ kind, width, height, size: blob.size }),
      });
      setPreview(URL.createObjectURL(blob));
      setSuccess(true);
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

  const displayUrl = preview ?? currentUrl;

  return (
    <span className="media-uploader">
      {cropFile ? (
        <ImageCropper
          file={cropFile}
          aspect={OUTPUT_SIZE[kind].aspect}
          outputWidth={OUTPUT_SIZE[kind].width}
          outputHeight={OUTPUT_SIZE[kind].height}
          onCancel={() => setCropFile(null)}
          onConfirm={handleCropped}
        />
      ) : (
        <>
          {displayUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- plain <img>: app doesn't use next/image elsewhere.
            <img
              src={displayUrl}
              alt={`Anteprima ${kind === "avatar" ? "avatar" : "copertina"}`}
              className={kind === "avatar" ? "avatar avatar-large" : "cover-preview"}
            />
          )}
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
          {success && !error && (
            <p className="form-message success" role="status">
              Immagine caricata.
            </p>
          )}
        </>
      )}
    </span>
  );
}

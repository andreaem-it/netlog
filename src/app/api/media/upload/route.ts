import "server-only";
import { del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/server/authorization/session";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { db } from "@/server/db/client";
import { applyProfileMedia } from "@/features/profiles/service";
import {
  AVATAR_COVER_MAX_BYTES,
  AVATAR_COVER_MIME_TYPES,
} from "@/features/profiles/media";

const clientMetaSchema = z.object({
  kind: z.enum(["avatar", "cover", "post", "album"]),
  // ponytail: sanity bound, not a real constraint — file size (5MB) already caps the payload.
  // Raised from 8000 after a real high-res phone photo (>8000px) was rejected.
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  size: z.number().int().positive().max(AVATAR_COVER_MAX_BYTES),
  // Only used for kind "post": the client picks the id up front so the post
  // (created separately, after all images finish uploading) can reference
  // it immediately instead of waiting on this webhook.
  assetId: z.uuid().optional(),
});
const tokenPayloadSchema = clientMetaSchema.extend({ userId: z.uuid() });

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const user = await currentUser();
        if (!user) throw new Error("Devi accedere per caricare un'immagine.");
        await consumeRateLimit("media-upload", user.id, 20, 3600);
        const meta = clientMetaSchema.parse(JSON.parse(clientPayload ?? "{}"));
        if ((meta.kind === "post" || meta.kind === "album") && !meta.assetId)
          throw new Error("Richiesta non valida.");
        return {
          allowedContentTypes: AVATAR_COVER_MIME_TYPES,
          maximumSizeInBytes: AVATAR_COVER_MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ ...meta, userId: user.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) return;
        const { userId, kind, width, height, size, assetId } =
          tokenPayloadSchema.parse(JSON.parse(tokenPayload));
        if (kind === "post" || kind === "album") {
          // Unattached until the post/album is created or the photo is
          // attached (both link it via its client-generated id); no
          // profile/post/album target exists yet.
          await db.mediaAsset.create({
            data: {
              id: assetId,
              ownerId: userId,
              storageKey: blob.url,
              mimeType: blob.contentType,
              size,
              width,
              height,
              status: "READY",
            },
          });
          return;
        }
        const { previousAssetId } = await applyProfileMedia({
          userId,
          kind,
          storageKey: blob.url,
          mimeType: blob.contentType,
          size,
          width,
          height,
        });
        // Replace, don't accumulate: drop the previous asset's row and blob.
        if (previousAssetId) {
          const old = await db.mediaAsset
            .delete({ where: { id: previousAssetId } })
            .catch(() => null);
          if (old) await del(old.storageKey).catch(() => {});
        }
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload fallito." },
      { status: 400 },
    );
  }
}

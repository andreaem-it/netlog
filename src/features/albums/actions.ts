"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireUser } from "@/server/authorization/session";
import { consumeRateLimit, RateLimitError } from "@/server/security/rate-limit";
import type { FormState } from "@/features/auth/schemas";
import {
  AlbumActionError,
  addPhotosToAlbum,
  createAlbum,
  deleteAlbum,
  deletePhoto,
  renameAlbum,
} from "./service";

function errorState(error: unknown): FormState {
  if (error instanceof ZodError)
    return { status: "error", message: error.issues[0]?.message };
  if (error instanceof AlbumActionError || error instanceof RateLimitError)
    return { status: "error", message: error.message };
  console.error("album_action_failed");
  return {
    status: "error",
    message: "Non è stato possibile completare l'operazione. Riprova tra poco.",
  };
}

export async function createAlbumAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  let album: { id: string };
  try {
    await consumeRateLimit("album-create", actor.id, 20, 3600);
    album = await createAlbum(actor.id, {
      title: form.get("title"),
      assetIds: form.get("assetIds"),
    });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath("/album");
  redirect(`/album/${album.id}`);
}

export async function addPhotosAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  const albumId = String(form.get("albumId") ?? "");
  try {
    await consumeRateLimit("album-add-photos", actor.id, 20, 3600);
    await addPhotosToAlbum(actor.id, albumId, { assetIds: form.get("assetIds") });
    revalidatePath(`/album/${albumId}`);
    return { status: "success", message: "Foto aggiunte." };
  } catch (error) {
    return errorState(error);
  }
}

export async function renameAlbumAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  const albumId = String(form.get("albumId") ?? "");
  try {
    await renameAlbum(actor.id, albumId, { title: form.get("title") });
    revalidatePath(`/album/${albumId}`);
    revalidatePath("/album");
    return { status: "success", message: "Album rinominato." };
  } catch (error) {
    return errorState(error);
  }
}

export async function deletePhotoAction(albumId: string, photoId: string) {
  const actor = await requireUser();
  await deletePhoto(actor.id, albumId, photoId).catch(() => {});
  revalidatePath(`/album/${albumId}`);
}

export async function deleteAlbumAction(albumId: string) {
  const actor = await requireUser();
  await deleteAlbum(actor.id, albumId).catch(() => {});
  revalidatePath("/album");
  redirect("/album");
}

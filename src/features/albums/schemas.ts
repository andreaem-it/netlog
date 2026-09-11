import { z } from "zod";

export const MAX_ALBUM_PHOTOS = 100;

const titleSchema = z
  .string()
  .trim()
  .min(1, "Dai un titolo all'album.")
  .max(80, "Il titolo può contenere al massimo 80 caratteri.");

// assetIds travels through a hidden form field as a JSON string (FormData
// has no array type), same pattern as the post image picker.
function assetIdsSchema(message: string) {
  return z
    .string()
    .optional()
    .transform((value) => (value ? (JSON.parse(value) as unknown) : []))
    .pipe(
      z
        .array(z.uuid())
        .min(1, message)
        .max(MAX_ALBUM_PHOTOS, `Puoi aggiungere al massimo ${MAX_ALBUM_PHOTOS} foto.`),
    );
}

export const createAlbumSchema = z.object({
  title: titleSchema,
  assetIds: assetIdsSchema("Aggiungi almeno una foto per creare l'album."),
});

export const addPhotosSchema = z.object({
  assetIds: assetIdsSchema("Aggiungi almeno una foto."),
});

export const renameAlbumSchema = z.object({
  title: titleSchema,
});

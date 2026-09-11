import { z } from "zod";

export const MAX_POST_IMAGES = 4;

// imageIds travels through a hidden form field as a JSON string (FormData
// has no array type), so it's parsed before the array itself is validated.
const imageIdsSchema = z
  .string()
  .optional()
  .transform((value) => (value ? (JSON.parse(value) as unknown) : []))
  .pipe(z.array(z.uuid()).max(MAX_POST_IMAGES));

export const postSchema = z.object({
  body: z
    .string()
    .trim()
    .max(5000, "Il post può contenere al massimo 5000 caratteri."),
  visibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]),
  imageIds: imageIdsSchema,
}).refine(
  (data) => data.body.length > 0 || data.imageIds.length > 0,
  { message: "Scrivi qualcosa o aggiungi una foto prima di pubblicare.", path: ["body"] },
);

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Scrivi un commento prima di pubblicare.")
    .max(2000, "Il commento può contenere al massimo 2000 caratteri."),
});

import { z } from "zod";

export const postSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Scrivi qualcosa prima di pubblicare.")
    .max(5000, "Il post può contenere al massimo 5000 caratteri."),
  visibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]),
});

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Scrivi un commento prima di pubblicare.")
    .max(2000, "Il commento può contenere al massimo 2000 caratteri."),
});

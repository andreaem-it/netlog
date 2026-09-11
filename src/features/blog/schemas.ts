import { z } from "zod";

export const blogPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Dai un titolo al tuo post.")
    .max(120, "Il titolo può contenere al massimo 120 caratteri."),
  body: z
    .string()
    .trim()
    .min(1, "Scrivi qualcosa prima di pubblicare.")
    .max(20000, "Il post può contenere al massimo 20000 caratteri."),
  visibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]),
});

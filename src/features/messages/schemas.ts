import { z } from "zod";

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Scrivi qualcosa prima di inviare.")
    .max(5000, "Il messaggio può contenere al massimo 5000 caratteri."),
  clientId: z.uuid(),
});

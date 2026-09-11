import { z } from "zod";

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Scrivi qualcosa prima di inviare.")
    .max(5000, "Il messaggio può contenere al massimo 5000 caratteri."),
  clientId: z.uuid(),
});

export const MAX_GROUP_MEMBERS = 20;

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dai un nome al gruppo.")
    .max(80, "Il nome del gruppo può contenere al massimo 80 caratteri."),
  memberUsernames: z
    .array(z.string())
    .min(2, "Scegli almeno 2 amici per creare un gruppo.")
    .max(MAX_GROUP_MEMBERS, `Puoi aggiungere al massimo ${MAX_GROUP_MEMBERS} persone.`),
});

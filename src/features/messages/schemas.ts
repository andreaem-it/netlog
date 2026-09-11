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

const groupNameSchema = z
  .string()
  .trim()
  .min(1, "Dai un nome al gruppo.")
  .max(80, "Il nome del gruppo può contenere al massimo 80 caratteri.");

export const groupSchema = z.object({
  name: groupNameSchema,
  memberUsernames: z
    .array(z.string())
    .min(2, "Scegli almeno 2 amici per creare un gruppo.")
    .max(MAX_GROUP_MEMBERS, `Puoi aggiungere al massimo ${MAX_GROUP_MEMBERS} persone.`),
});

export const renameGroupSchema = z.object({
  name: groupNameSchema,
});

export const addGroupMembersSchema = z.object({
  memberUsernames: z
    .array(z.string())
    .min(1, "Scegli almeno un amico da aggiungere.")
    .max(MAX_GROUP_MEMBERS, `Puoi aggiungere al massimo ${MAX_GROUP_MEMBERS} persone alla volta.`),
});

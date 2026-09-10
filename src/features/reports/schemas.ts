import { z } from "zod";

export const reportReasonSchema = z.enum([
  "SPAM",
  "HARASSMENT",
  "HATE_SPEECH",
  "NUDITY",
  "OTHER",
]);
export const reportDetailSchema = z.string().trim().max(500).default("");

export const reportPostSchema = z.object({
  postId: z.uuid(),
  reason: reportReasonSchema,
  detail: reportDetailSchema,
});
export const reportProfileSchema = z.object({
  username: z.string().trim().toLowerCase(),
  reason: reportReasonSchema,
  detail: reportDetailSchema,
});

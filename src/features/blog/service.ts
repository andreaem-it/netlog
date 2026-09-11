import "server-only";
import { db } from "@/server/db/client";
import { blogPostSchema } from "./schemas";

export class BlogActionError extends Error {}

export async function createBlogPost(actorId: string, input: unknown) {
  const data = blogPostSchema.parse(input);
  return db.blogPost.create({
    data: {
      authorId: actorId,
      title: data.title,
      body: data.body,
      visibility: data.visibility,
    },
    select: { id: true },
  });
}

export async function updateBlogPost(actorId: string, postId: string, input: unknown) {
  const data = blogPostSchema.parse(input);
  const result = await db.blogPost.updateMany({
    where: { id: postId, authorId: actorId },
    data: { title: data.title, body: data.body, visibility: data.visibility },
  });
  if (result.count === 0)
    throw new BlogActionError("Questo post non è più disponibile.");
}

export async function deleteBlogPost(actorId: string, postId: string) {
  const result = await db.blogPost.deleteMany({
    where: { id: postId, authorId: actorId },
  });
  if (result.count === 0)
    throw new BlogActionError("Questo post non è più disponibile.");
}

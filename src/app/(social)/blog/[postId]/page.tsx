import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/server/authorization/session";
import { getBlogPost } from "@/features/blog/queries";
import { deleteBlogPostAction, updateBlogPostAction } from "@/features/blog/actions";
import { BlogPostForm } from "@/features/blog/components/blog-post-form";

export const metadata = { title: "Post" };

const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: "Tutti",
  FRIENDS: "Solo amici",
  PRIVATE: "Solo io",
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const user = await currentUser();
  const post = await getBlogPost(user?.id, postId);
  if (!post) notFound();
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">
            DI {post.authorName.toUpperCase()} · {VISIBILITY_LABEL[post.visibility]}
          </p>
          <h1>{post.title}</h1>
          <p className="muted">
            {new Intl.DateTimeFormat("it-IT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(post.createdAt)}
          </p>
        </div>
        {post.owner && (
          <form action={deleteBlogPostAction.bind(null, postId)}>
            <button className="button button-subtle" type="submit">
              Elimina
            </button>
          </form>
        )}
      </div>
      {!post.owner && (
        <p className="muted">
          <Link href={`/u/${post.authorUsername}`}>Vai al profilo di {post.authorName}</Link>
        </p>
      )}
      <section className="card card-body">
        <p style={{ whiteSpace: "pre-wrap" }}>{post.body}</p>
      </section>
      {post.owner && (
        <details className="card card-body" style={{ marginTop: 24 }}>
          <summary>Modifica</summary>
          <div style={{ marginTop: 16 }}>
            <BlogPostForm
              action={updateBlogPostAction}
              postId={postId}
              initial={post}
              submitLabel="Salva modifiche"
            />
          </div>
        </details>
      )}
    </>
  );
}

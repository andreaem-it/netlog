import Link from "next/link";
import { requireUser } from "@/server/authorization/session";
import { listOwnBlogPosts } from "@/features/blog/queries";

export const metadata = { title: "Blog" };

const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: "Tutti",
  FRIENDS: "Solo amici",
  PRIVATE: "Solo io",
};

export default async function BlogPage() {
  const user = await requireUser();
  const posts = await listOwnBlogPosts(user.id);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">I TUOI PENSIERI PIÙ LUNGHI</p>
          <h1>Blog.</h1>
        </div>
        <Link href="/blog/nuovo" className="button button-primary">
          Scrivi un post
        </Link>
      </div>
      <section className="card">
        <div className="card-body stack">
          {posts.length === 0 && (
            <p className="muted">Non hai ancora scritto nulla. Inizia dal pulsante qui sopra.</p>
          )}
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.id}`}
              className="button-row"
              style={{ justifyContent: "space-between" }}
            >
              <span>
                <strong>{post.title}</strong>
                <br />
                <span className="muted">
                  {new Intl.DateTimeFormat("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(post.createdAt)}
                </span>
              </span>
              <span className="pill">{VISIBILITY_LABEL[post.visibility]}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
